import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import {
  getEditionAds,
  getAvailableAds,
  addAdToEdition,
  removeAdFromEdition,
  toggleEditionAd,
  updateEditionAd,
} from "./actions";
import { PdfAdPlacementType } from "@prisma/client";

const PLACEMENT_LABELS: Record<PdfAdPlacementType, string> = {
  FULL_PAGE: "صفحة كاملة",
  HALF_PAGE_TOP: "نصف صفحة علوي",
  HALF_PAGE_BOTTOM: "نصف صفحة سفلي",
  SIDEBAR_LEFT: "شريط جانبي أيسر",
  SIDEBAR_RIGHT: "شريط جانبي أيمن",
  HEADER_BANNER: "بانر علوي",
  FOOTER_BANNER: "بانر سفلي",
  CATEGORY_SPONSOR: "راعي تصنيف",
};

export default async function EditionAdsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("/admin/pdf/editions");
  const { id: editionId } = await params;

  const edition = await prisma.pdfEdition.findUnique({
    where: { id: editionId },
    select: { id: true, titleAr: true },
  });
  if (!edition) notFound();

  const [editionAds, availableAds] = await Promise.all([
    getEditionAds(editionId),
    getAvailableAds(editionId),
  ]);

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">إعلانات الإصدار</h1>
        <p className="mt-1 text-sm text-muted-foreground">{edition.titleAr}</p>
      </div>

      {/* Add ad section */}
      {availableAds.length > 0 && (
        <div className="mb-8 rounded-xl border border-border bg-secondary/20 p-5">
          <h2 className="mb-3 text-base font-semibold">إضافة إعلان للإصدار</h2>
          <form
            action={async (formData: FormData) => {
              "use server";
              const adId = formData.get("adId") as string;
              if (adId) await addAdToEdition(editionId, adId);
            }}
            className="flex flex-wrap gap-3"
          >
            <select
              name="adId"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                اختر إعلاناً من المكتبة...
              </option>
              {availableAds.map((ad) => (
                <option key={ad.id} value={ad.id}>
                  {ad.titleAr} — {PLACEMENT_LABELS[ad.placementType]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              إضافة
            </button>
          </form>
        </div>
      )}

      {/* Ads list */}
      {editionAds.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <p className="text-lg font-medium">لا توجد إعلانات مضافة لهذا الإصدار</p>
          <p className="mt-1 text-sm">أضف إعلانات من المكتبة أعلاه للتحكم في مواضعها</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-right">
              <tr>
                <th className="px-4 py-3 font-semibold">الأولوية</th>
                <th className="px-4 py-3 font-semibold">الإعلان</th>
                <th className="px-4 py-3 font-semibold">الموضع الأصلي</th>
                <th className="px-4 py-3 font-semibold">تجاوز الموضع</th>
                <th className="px-4 py-3 font-semibold">الصفحات</th>
                <th className="px-4 py-3 font-semibold">فعّال</th>
                <th className="px-4 py-3 font-semibold">ملاحظات</th>
                <th className="px-4 py-3 font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {editionAds.map((ea) => (
                <tr key={ea.id} className="hover:bg-secondary/20">
                  {/* Priority */}
                  <td className="px-4 py-3">
                    <form
                      action={async (fd: FormData) => {
                        "use server";
                        const v = Number(fd.get("priority"));
                        await updateEditionAd(ea.id, editionId, { priority: v });
                      }}
                    >
                      <input
                        name="priority"
                        type="number"
                        defaultValue={ea.priority}
                        className="w-16 rounded border border-border bg-background px-2 py-1 text-center text-sm"
                        min={0}
                      />
                      <button
                        type="submit"
                        className="mr-1 rounded bg-secondary px-2 py-1 text-xs hover:bg-secondary/70"
                      >
                        حفظ
                      </button>
                    </form>
                  </td>

                  {/* Ad info */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ea.ad.imageUrl}
                        alt={ea.ad.titleAr}
                        className="h-10 w-16 rounded object-cover"
                      />
                      <span className="font-medium">{ea.ad.titleAr}</span>
                    </div>
                  </td>

                  {/* Original placement */}
                  <td className="px-4 py-3 text-muted-foreground">
                    {PLACEMENT_LABELS[ea.ad.placementType]}
                  </td>

                  {/* Override placement */}
                  <td className="px-4 py-3">
                    <form
                      action={async (fd: FormData) => {
                        "use server";
                        const v = fd.get("overridePlacement") as string;
                        await updateEditionAd(ea.id, editionId, {
                          overridePlacement: v === "" ? null : (v as PdfAdPlacementType),
                        });
                      }}
                    >
                      <select
                        name="overridePlacement"
                        defaultValue={ea.overridePlacement ?? ""}
                        className="rounded border border-border bg-background px-2 py-1 text-sm"
                      >
                        <option value="">— بدون تجاوز —</option>
                        {Object.entries(PLACEMENT_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="mr-1 rounded bg-secondary px-2 py-1 text-xs hover:bg-secondary/70"
                      >
                        حفظ
                      </button>
                    </form>
                  </td>

                  {/* Page numbers */}
                  <td className="px-4 py-3">
                    <form
                      action={async (fd: FormData) => {
                        "use server";
                        const raw = (fd.get("pageNumbers") as string).trim();
                        const pages = raw
                          ? raw.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
                          : [];
                        await updateEditionAd(ea.id, editionId, { pageNumbers: pages });
                      }}
                    >
                      <input
                        name="pageNumbers"
                        type="text"
                        defaultValue={ea.pageNumbers.join(", ")}
                        placeholder="كل الصفحات"
                        className="w-28 rounded border border-border bg-background px-2 py-1 text-sm"
                      />
                      <button
                        type="submit"
                        className="mr-1 rounded bg-secondary px-2 py-1 text-xs hover:bg-secondary/70"
                      >
                        حفظ
                      </button>
                    </form>
                  </td>

                  {/* Toggle active */}
                  <td className="px-4 py-3 text-center">
                    <form
                      action={async () => {
                        "use server";
                        await toggleEditionAd(ea.id, editionId, !ea.isActive);
                      }}
                    >
                      <button
                        type="submit"
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          ea.isActive
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {ea.isActive ? "فعّال" : "معطّل"}
                      </button>
                    </form>
                  </td>

                  {/* Notes */}
                  <td className="px-4 py-3">
                    <form
                      action={async (fd: FormData) => {
                        "use server";
                        const notes = (fd.get("notes") as string) ?? "";
                        await updateEditionAd(ea.id, editionId, { notes });
                      }}
                    >
                      <input
                        name="notes"
                        type="text"
                        defaultValue={ea.notes ?? ""}
                        placeholder="ملاحظة..."
                        className="w-32 rounded border border-border bg-background px-2 py-1 text-sm"
                      />
                      <button
                        type="submit"
                        className="mr-1 rounded bg-secondary px-2 py-1 text-xs hover:bg-secondary/70"
                      >
                        حفظ
                      </button>
                    </form>
                  </td>

                  {/* Remove */}
                  <td className="px-4 py-3 text-center">
                    <form
                      action={async () => {
                        "use server";
                        await removeAdFromEdition(ea.id, editionId);
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        حذف
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <p className="mt-4 text-xs text-muted-foreground">
        💡 الصفحات: اتركها فارغة لإظهار الإعلان في كل الصفحات، أو أدخل أرقاماً مفصولة بفاصلة مثل:{" "}
        <span dir="ltr">2, 5, 8</span>
      </p>
    </main>
  );
}
