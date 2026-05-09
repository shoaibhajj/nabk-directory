import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import {
  getEditionAds,
  getAvailableAds,
  addAdToEdition,
  removeAdFromEdition,
  toggleEditionAd,
  updateEditionAd,
  moveEditionAd,
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

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://nabk-directory.com";

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

export default async function EditionAdsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("/admin/pdf/editions");
  const { id: editionId } = await params;

  const edition = await prisma.pdfEdition.findUnique({
    where: { id: editionId },
    select: { id: true, titleAr: true, slug: true },
  });
  if (!edition) notFound();

  const [editionAds, availableAds] = await Promise.all([
    getEditionAds(editionId),
    getAvailableAds(editionId),
  ]);

  // Ordered IDs for move actions
  const orderedIds = editionAds.map((ea) => ea.id);

  return (
    <main className="container mx-auto px-4 py-8" dir="rtl">
      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إعلانات الإصدار</h1>
          <p className="mt-1 text-sm text-muted-foreground">{edition.titleAr}</p>
        </div>
        <Link
          href={`/admin/pdf/editions/${editionId}`}
          className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary/40"
        >
          ← العودة للإصدار
        </Link>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* القسم B — إضافة إعلان                                            */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="mb-8 rounded-xl border border-border bg-secondary/20 p-5">
        <h2 className="mb-3 text-base font-semibold">➕ إضافة إعلان للإصدار</h2>
        {availableAds.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            جميع الإعلانات النشطة مضافة بالفعل لهذا الإصدار.
          </p>
        ) : (
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
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* القسم A — قائمة إعلانات الإصدار                                  */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="mb-8">
        <h2 className="mb-3 text-base font-semibold">📋 إعلانات هذا الإصدار</h2>

        {editionAds.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
            <p className="text-lg font-medium">لا توجد إعلانات مضافة لهذا الإصدار</p>
            <p className="mt-1 text-sm">أضف إعلانات من القسم أعلاه للتحكم في مواضعها</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-right">
                <tr>
                  <th className="px-3 py-3 font-semibold">الترتيب</th>
                  <th className="px-3 py-3 font-semibold">الإعلان</th>
                  <th className="px-3 py-3 font-semibold">الموضع الأصلي</th>
                  <th className="px-3 py-3 font-semibold">تجاوز الموضع</th>
                  <th className="px-3 py-3 font-semibold">الصفحات</th>
                  <th className="px-3 py-3 font-semibold">الأولوية</th>
                  <th className="px-3 py-3 font-semibold">فعّال</th>
                  <th className="px-3 py-3 font-semibold">ملاحظات</th>
                  <th className="px-3 py-3 font-semibold">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {editionAds.map((ea, rowIdx) => {
                  const imgSrc = resolveImageUrl(ea.ad.imageUrl);
                  const isFirst = rowIdx === 0;
                  const isLast = rowIdx === editionAds.length - 1;

                  return (
                    <tr key={ea.id} className="hover:bg-secondary/20">

                      {/* ── Reorder ↑↓ ── */}
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <form
                            action={async () => {
                              "use server";
                              await moveEditionAd(ea.id, editionId, "up", orderedIds);
                            }}
                          >
                            <button
                              type="submit"
                              disabled={isFirst}
                              className="w-8 rounded border border-border px-1 py-0.5 text-xs disabled:opacity-30 hover:bg-secondary/60"
                              title="رفع"
                            >
                              ↑
                            </button>
                          </form>
                          <form
                            action={async () => {
                              "use server";
                              await moveEditionAd(ea.id, editionId, "down", orderedIds);
                            }}
                          >
                            <button
                              type="submit"
                              disabled={isLast}
                              className="w-8 rounded border border-border px-1 py-0.5 text-xs disabled:opacity-30 hover:bg-secondary/60"
                              title="خفض"
                            >
                              ↓
                            </button>
                          </form>
                        </div>
                      </td>

                      {/* ── Ad info ── */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {imgSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imgSrc}
                              alt={ea.ad.titleAr}
                              className="h-10 w-16 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-16 items-center justify-center rounded bg-secondary text-xs text-muted-foreground">
                              لا صورة
                            </div>
                          )}
                          <span className="font-medium">{ea.ad.titleAr}</span>
                        </div>
                      </td>

                      {/* ── Original placement ── */}
                      <td className="px-3 py-3 text-muted-foreground">
                        {PLACEMENT_LABELS[ea.ad.placementType]}
                      </td>

                      {/* ── Override placement ── */}
                      <td className="px-3 py-3">
                        <form
                          action={async (fd: FormData) => {
                            "use server";
                            const v = fd.get("overridePlacement") as string;
                            await updateEditionAd(ea.id, editionId, {
                              overridePlacement:
                                v === "" ? null : (v as PdfAdPlacementType),
                            });
                          }}
                          className="flex gap-1"
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
                            className="rounded bg-secondary px-2 py-1 text-xs hover:bg-secondary/70"
                          >
                            حفظ
                          </button>
                        </form>
                      </td>

                      {/* ── Page numbers ── */}
                      <td className="px-3 py-3">
                        <form
                          action={async (fd: FormData) => {
                            "use server";
                            const raw = (
                              fd.get("pageNumbers") as string
                            ).trim();
                            const pages = raw
                              ? raw
                                  .split(",")
                                  .map((s) => parseInt(s.trim(), 10))
                                  .filter((n) => !isNaN(n))
                              : [];
                            await updateEditionAd(ea.id, editionId, {
                              pageNumbers: pages,
                            });
                          }}
                          className="flex gap-1"
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
                            className="rounded bg-secondary px-2 py-1 text-xs hover:bg-secondary/70"
                          >
                            حفظ
                          </button>
                        </form>
                      </td>

                      {/* ── Priority (manual number) ── */}
                      <td className="px-3 py-3">
                        <form
                          action={async (fd: FormData) => {
                            "use server";
                            const v = Number(fd.get("priority"));
                            await updateEditionAd(ea.id, editionId, {
                              priority: v,
                            });
                          }}
                          className="flex gap-1"
                        >
                          <input
                            name="priority"
                            type="number"
                            defaultValue={ea.priority}
                            className="w-14 rounded border border-border bg-background px-2 py-1 text-center text-sm"
                            min={0}
                          />
                          <button
                            type="submit"
                            className="rounded bg-secondary px-2 py-1 text-xs hover:bg-secondary/70"
                          >
                            حفظ
                          </button>
                        </form>
                      </td>

                      {/* ── Toggle active ── */}
                      <td className="px-3 py-3 text-center">
                        <form
                          action={async () => {
                            "use server";
                            await toggleEditionAd(
                              ea.id,
                              editionId,
                              !ea.isActive
                            );
                          }}
                        >
                          <button
                            type="submit"
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                              ea.isActive
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            {ea.isActive ? "فعّال" : "معطّل"}
                          </button>
                        </form>
                      </td>

                      {/* ── Notes ── */}
                      <td className="px-3 py-3">
                        <form
                          action={async (fd: FormData) => {
                            "use server";
                            const notes = (fd.get("notes") as string) ?? "";
                            await updateEditionAd(ea.id, editionId, { notes });
                          }}
                          className="flex gap-1"
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
                            className="rounded bg-secondary px-2 py-1 text-xs hover:bg-secondary/70"
                          >
                            حفظ
                          </button>
                        </form>
                      </td>

                      {/* ── Remove ── */}
                      <td className="px-3 py-3 text-center">
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          💡 <strong>الصفحات:</strong> اتركها فارغة لإظهار الإعلان في كل
          الصفحات، أو أدخل أرقاماً مفصولة بفاصلة مثل{" "}
          <span dir="ltr">2, 5, 8</span>.
          <br />
          💡 <strong>الترتيب:</strong> استخدم ↑↓ لتغيير ترتيب ظهور الإعلانات
          في الـ PDF، أو أدخل رقماً يدوياً في حقل الأولوية.
        </p>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* القسم C — معاينة PDF                                              */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="rounded-xl border border-border bg-secondary/10 p-5">
        <h2 className="mb-2 text-base font-semibold">👁️ معاينة PDF</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          توليد نسخة مسودة من PDF لمراجعة توزيع الإعلانات قبل النشر.
        </p>
        <Link
          href={`/admin/pdf/editions/${editionId}/preview`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <span>⬇️</span>
          <span>فتح معاينة PDF</span>
        </Link>
        <p className="mt-2 text-xs text-muted-foreground">
          سيُفتح في تبويب جديد — قد تستغرق العملية بضع ثوانٍ.
        </p>
      </section>
    </main>
  );
}
