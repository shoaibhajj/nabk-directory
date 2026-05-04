/**
 * /admin/pdf/ads — Round 2 CRUD
 * Pure Server Component — no client handlers anywhere.
 * Delete confirmation lives in DeleteAdButton (Client Component).
 */

import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import {
  createPdfAd,
  updatePdfAd,
  togglePdfAdActive,
} from "@/app/actions/pdf-editions";
import { DeleteAdButton } from "./_components/delete-ad-button";

const PLACEMENT_LABELS: Record<string, string> = {
  FULL_PAGE:        "صفحة كاملة",
  HALF_PAGE_TOP:    "نصف صفحة — أعلى",
  HALF_PAGE_BOTTOM: "نصف صفحة — أسفل",
  SIDEBAR_LEFT:     "شريط جانبي — يسار",
  SIDEBAR_RIGHT:    "شريط جانبي — يمين",
  HEADER_BANNER:    "بانر رأس الصفحة",
  FOOTER_BANNER:    "بانر أسفل الصفحة",
  CATEGORY_SPONSOR: "راعي تصنيف",
};

export default async function PdfAdsPage() {
  await requireAdmin("/admin/pdf/ads");

  const ads = await prisma.pdfAd.findMany({
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">إعلانات PDF</h1>

      {/* Create form */}
      <div className="mb-8 rounded-xl border border-border bg-secondary/20 p-5">
        <h2 className="mb-4 text-lg font-semibold">إضافة إعلان جديد</h2>
        <form action={createPdfAd} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold" htmlFor="titleAr">عنوان *</label>
            <input id="titleAr" name="titleAr" required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold" htmlFor="advertiserName">اسم المعلن *</label>
            <input id="advertiserName" name="advertiserName" required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold" htmlFor="imageUrl">رابط الصورة *</label>
            <input id="imageUrl" name="imageUrl" required dir="ltr" placeholder="https://..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold" htmlFor="placementType">نوع الموضع</label>
            <select id="placementType" name="placementType" defaultValue="FULL_PAGE"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              {Object.entries(PLACEMENT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold" htmlFor="priority">الأولوية (0–100)</label>
            <input id="priority" name="priority" type="number" defaultValue={0} min={0} max={100}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold" htmlFor="targetUrl">رابط المعلن (اختياري)</label>
            <input id="targetUrl" name="targetUrl" dir="ltr" placeholder="https://..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold" htmlFor="phone">هاتف (اختياري)</label>
            <input id="phone" name="phone" dir="ltr" placeholder="+963..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit"
              className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent/90">
              إضافة الإعلان
            </button>
          </div>
        </form>
      </div>

      {/* Ads list */}
      {ads.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p className="text-lg font-semibold">لا توجد إعلانات بعد.</p>
          <p className="mt-1 text-sm">أضف إعلانك الأول من الفورم أعلاه.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ads.map((ad) => (
            <div key={ad.id} className="rounded-xl border border-border bg-secondary/20">

              {/* Card header: image + badges */}
              <div className="flex items-start gap-4 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ad.imageUrl} alt={ad.titleAr}
                  className="h-24 w-24 shrink-0 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{ad.titleAr}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      ad.isActive
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                      {ad.isActive ? "✅ فعال" : "⛔ موقوف"}
                    </span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                      {PLACEMENT_LABELS[ad.placementType] ?? ad.placementType}
                    </span>
                    <span className="rounded-full bg-accent/10 text-accent px-2 py-0.5 text-xs font-semibold">
                      أولوية: {ad.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{ad.advertiserName}</p>
                  {ad.phone && <p className="text-xs text-muted-foreground" dir="ltr">{ad.phone}</p>}
                </div>
              </div>

              {/* Edit form (collapsible via <details>) */}
              <details className="group border-t border-border">
                <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-accent
                  hover:bg-secondary/40 list-none flex items-center gap-2">
                  <span className="group-open:rotate-90 inline-block transition-transform">▶</span>
                  تعديل بيانات الإعلان
                </summary>
                <form
                  action={updatePdfAd.bind(null, ad.id)}
                  className="grid gap-3 p-4 pt-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">عنوان</label>
                    <input name="titleAr" defaultValue={ad.titleAr} required
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">اسم المعلن</label>
                    <input name="advertiserName" defaultValue={ad.advertiserName} required
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold">رابط الصورة</label>
                    <input name="imageUrl" defaultValue={ad.imageUrl} required dir="ltr"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">نوع الموضع</label>
                    <select name="placementType" defaultValue={ad.placementType}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                      {Object.entries(PLACEMENT_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">الأولوية (0–100)</label>
                    <input name="priority" type="number" defaultValue={ad.priority} min={0} max={100}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">رابط المعلن</label>
                    <input name="targetUrl" defaultValue={ad.targetUrl ?? ""} dir="ltr"
                      placeholder="https://..."
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">هاتف</label>
                    <input name="phone" defaultValue={ad.phone ?? ""} dir="ltr"
                      placeholder="+963..."
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <button type="submit"
                      className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90">
                      حفظ التعديلات
                    </button>
                  </div>
                </form>
              </details>

              {/* Actions row */}
              <div className="flex items-center gap-3 border-t border-border px-4 py-3">
                {/* Toggle active — pure Server Action */}
                <form action={togglePdfAdActive.bind(null, ad.id)}>
                  <button type="submit"
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      ad.isActive
                        ? "border border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                        : "border border-green-300 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                    }`}>
                    {ad.isActive ? "⛔ إيقاف" : "✅ تفعيل"}
                  </button>
                </form>

                {/* Delete — Client Component handles confirm() */}
                <div className="mr-auto">
                  <DeleteAdButton adId={ad.id} adTitle={ad.titleAr} />
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </main>
  );
}
