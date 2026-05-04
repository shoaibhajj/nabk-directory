import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { createPdfAd } from "@/app/actions/pdf-editions";

const PLACEMENT_LABELS: Record<string, string> = {
  FULL_PAGE: "صفحة كاملة",
  HALF_PAGE: "نصف صفحة",
  SIDEBAR: "شريط جانبي",
};

export default async function PdfAdsPage() {
  await requireAdmin("/admin/pdf/ads");

  const ads = await prisma.pdfAd.findMany({
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">إعلانات PDF</h1>

      {/* Create ad form */}
      <div className="mb-8 rounded-xl border border-border bg-secondary/20 p-5">
        <h2 className="mb-4 text-lg font-semibold">إضافة إعلان جديد</h2>
        <form action={createPdfAd} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold" htmlFor="titleAr">
              عنوان الإعلان *
            </label>
            <input
              id="titleAr"
              name="titleAr"
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold" htmlFor="advertiserName">
              اسم المعلن *
            </label>
            <input
              id="advertiserName"
              name="advertiserName"
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold" htmlFor="imageUrl">
              رابط صورة الإعلان *
            </label>
            <input
              id="imageUrl"
              name="imageUrl"
              required
              dir="ltr"
              placeholder="https://..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold" htmlFor="placementType">
              نوع الموضع
            </label>
            <select
              id="placementType"
              name="placementType"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {Object.entries(PLACEMENT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold" htmlFor="priority">
              الأولوية
            </label>
            <input
              id="priority"
              name="priority"
              type="number"
              defaultValue={0}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold" htmlFor="targetUrl">
              رابط المعلن (اختياري)
            </label>
            <input
              id="targetUrl"
              name="targetUrl"
              dir="ltr"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold" htmlFor="phone">
              هاتف المعلن (اختياري)
            </label>
            <input
              id="phone"
              name="phone"
              dir="ltr"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent/90"
            >
              إضافة الإعلان
            </button>
          </div>
        </form>
      </div>

      {/* Ads list */}
      {ads.length === 0 ? (
        <p className="text-muted-foreground">لا توجد إعلانات بعد.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ads.map((ad) => (
            <div
              key={ad.id}
              className="rounded-xl border border-border bg-secondary/20 p-4"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ad.imageUrl}
                alt={ad.titleAr}
                className="mb-3 h-32 w-full rounded-lg object-cover"
              />
              <p className="font-semibold">{ad.titleAr}</p>
              <p className="text-xs text-muted-foreground">{ad.advertiserName}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                  {PLACEMENT_LABELS[ad.placementType] ?? ad.placementType}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    ad.isActive ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {ad.isActive ? "فعال" : "موقوف"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
