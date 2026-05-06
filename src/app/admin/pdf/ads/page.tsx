/**
 * /admin/pdf/ads — Ads CRUD with Task-4 category pin support
 * Pure Server Component.
 */

import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import {
  createPdfAd,
  updatePdfAd,
  togglePdfAdActive,
} from "@/app/actions/pdf-editions";
import { DeleteAdButton } from "./_components/delete-ad-button";
import { PlacementSelect } from "./_components/PlacementSelect";

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

// const AD_IMAGE_HINTS: Record<
//   string,
//   { label: string; dimensions: string; ratio: string; icon: string }
// > = {
//   FULL_PAGE: {
//     label: "صفحة كاملة",
//     dimensions: "794 × 1123 بكسل",
//     ratio: "A4 عمودي",
//     icon: "📄",
//   },
//   HALF_PAGE_TOP: {
//     label: "نصف صفحة علوي",
//     dimensions: "794 × 400 بكسل",
//     ratio: "أفقي 2:1",
//     icon: "⬆️",
//   },
//   HALF_PAGE_BOTTOM: {
//     label: "نصف صفحة سفلي",
//     dimensions: "794 × 400 بكسل",
//     ratio: "أفقي 2:1",
//     icon: "⬇️",
//   },
//   SIDEBAR_LEFT: {
//     label: "عمود جانبي أيسر",
//     dimensions: "200 × 600 بكسل",
//     ratio: "عمودي 1:3",
//     icon: "◀️",
//   },
//   SIDEBAR_RIGHT: {
//     label: "عمود جانبي أيمن",
//     dimensions: "200 × 600 بكسل",
//     ratio: "عمودي 1:3",
//     icon: "▶️",
//   },
//   HEADER_BANNER: {
//     label: "شريط علوي",
//     dimensions: "794 × 80 بكسل",
//     ratio: "رفيع 10:1",
//     icon: "🔝",
//   },
//   FOOTER_BANNER: {
//     label: "شريط سفلي",
//     dimensions: "794 × 80 بكسل",
//     ratio: "رفيع 10:1",
//     icon: "🔚",
//   },
//   CATEGORY_SPONSOR: {
//     label: "راعي قسم",
//     dimensions: "200 × 60 بكسل",
//     ratio: "أفقي صغير",
//     icon: "🏷️",
//   },
// };

// function ImageSizeHint({ placement }: { placement: string }) {
//   const hint = AD_IMAGE_HINTS[placement];
//   if (!hint) return null;

//   return (
//     <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-900 dark:bg-blue-950">
//       <span className="text-base">{hint.icon}</span>
//       <div className="flex flex-col gap-0.5">
//         <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
//           الحجم الموصى به لـ &quot;{hint.label}&quot;
//         </p>
//         <div className="flex items-center gap-2">
//           <code className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200">
//             {hint.dimensions}
//           </code>
//           <span className="text-xs text-blue-500 dark:text-blue-400">
//             — {hint.ratio}
//           </span>
//         </div>
//       </div>
//     </div>
//   );
// }

export default async function PdfAdsPage() {
  await requireAdmin("/admin/pdf/ads");

  const [ads, categories] = await Promise.all([
    prisma.pdfAd.findMany({
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    }),
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { nameAr: "asc" },
      select: { id: true, nameAr: true },
    }),
  ]);

  const categoryMap = new Map(categories.map((c) => [c.id, c.nameAr]));

  function CategorySelect({
    name,
    defaultValue,
  }: {
    name: string;
    defaultValue?: string | null;
  }) {
    return (
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      >
        <option value="">— توزيع تلقائي —</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nameAr}
          </option>
        ))}
      </select>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">إعلانات PDF</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        يمكنك تثبيت الإعلان بعد تصنيف معين، أو تركه فارغاً للتوزيع التلقائي.
      </p>

      {/* ── Create form ──────────────────────────────────────────────────────────────────────────────── */}
      <div className="mb-8 rounded-xl border border-border bg-secondary/20 p-5">
        <h2 className="mb-4 text-lg font-semibold">إضافة إعلان جديد</h2>
        <form action={createPdfAd} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              className="mb-1 block text-xs font-semibold"
              htmlFor="cr-titleAr"
            >
              عنوان *
            </label>
            <input
              id="cr-titleAr"
              name="titleAr"
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label
              className="mb-1 block text-xs font-semibold"
              htmlFor="cr-advertiserName"
            >
              اسم المعلن *
            </label>
            <input
              id="cr-advertiserName"
              name="advertiserName"
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label
              className="mb-1 block text-xs font-semibold"
              htmlFor="cr-imageUrl"
            >
              رابط الصورة *
            </label>
            <input
              id="cr-imageUrl"
              name="imageUrl"
              required
              dir="ltr"
              placeholder="https://..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          {/* <div>
            <label
              className="mb-1 block text-xs font-semibold"
              htmlFor="cr-placementType"
            >
              نوع الموضع
            </label>
            <select
              id="cr-placementType"
              name="placementType"
              defaultValue="FULL_PAGE"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {Object.entries(PLACEMENT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div> */}

          <PlacementSelect defaultValue="FULL_PAGE" imageFieldId="cr" />
          <div>
            <label
              className="mb-1 block text-xs font-semibold"
              htmlFor="cr-priority"
            >
              الأولوية (0–100)
            </label>
            <input
              id="cr-priority"
              name="priority"
              type="number"
              defaultValue={0}
              min={0}
              max={100}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold">
              📌 تثبيت بعد تصنيف
              <span className="mr-1 font-normal text-muted-foreground">
                (اختياري)
              </span>
            </label>
            <CategorySelect name="positionAfterCategoryId" />
          </div>
          <div>
            <label
              className="mb-1 block text-xs font-semibold"
              htmlFor="cr-targetUrl"
            >
              رابط المعلن (اختياري)
            </label>
            <input
              id="cr-targetUrl"
              name="targetUrl"
              dir="ltr"
              placeholder="https://..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label
              className="mb-1 block text-xs font-semibold"
              htmlFor="cr-phone"
            >
              هاتف (اختياري)
            </label>
            <input
              id="cr-phone"
              name="phone"
              dir="ltr"
              placeholder="+963..."
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

      {/* ── Ads list ──────────────────────────────────────────────────────────────────────────────────── */}
      {ads.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p className="text-lg font-semibold">لا توجد إعلانات بعد.</p>
          <p className="mt-1 text-sm">أضف إعلانك الأول من الفورم أعلاه.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ads.map((ad) => {
            const pinnedCategoryName = ad.positionAfterCategoryId
              ? (categoryMap.get(ad.positionAfterCategoryId) ?? "تصنيف محذوف")
              : null;

            return (
              <div
                key={ad.id}
                className="rounded-xl border border-border bg-secondary/20"
              >
                {/* Card header */}
                <div className="flex items-start gap-4 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ad.imageUrl}
                    alt={ad.titleAr}
                    className="h-24 w-24 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{ad.titleAr}</span>
                      {ad.titleEn && (
                        <span className="text-sm text-muted-foreground">
                          ({ad.titleEn})
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          ad.isActive
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {ad.isActive ? "✅ فعال" : "⛔ موقوف"}
                      </span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                        {PLACEMENT_LABELS[ad.placementType] ?? ad.placementType}
                      </span>
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                        أولوية: {ad.priority}
                      </span>
                      {pinnedCategoryName ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          📌 بعد: {pinnedCategoryName}
                        </span>
                      ) : (
                        <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-xs text-muted-foreground">
                          توزيع تلقائي
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {ad.targetUrl && (
                        <a
                          href={ad.targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-foreground underline"
                          dir="ltr"
                        >
                          {ad.targetUrl}
                        </a>
                      )}
                      {ad.phone && <span dir="ltr">{ad.phone}</span>}
                    </div>
                  </div>
                </div>

                {/* Edit form */}
                <details className="group border-t border-border">
                  <summary
                    className="flex cursor-pointer list-none items-center gap-2 px-4 py-2 text-sm
                    font-semibold text-accent hover:bg-secondary/40"
                  >
                    <span className="inline-block transition-transform group-open:rotate-90">
                      ▶
                    </span>
                    تعديل بيانات الإعلان
                  </summary>
                  <form
                    action={updatePdfAd.bind(null, ad.id)}
                    className="grid gap-3 p-4 pt-3 sm:grid-cols-2"
                  >
                    <div>
                      <label className="mb-1 block text-xs font-semibold">
                        عنوان
                      </label>
                      <input
                        name="titleAr"
                        defaultValue={ad.titleAr}
                        required
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">
                        اسم المعلن
                      </label>
                      <input
                        name="advertiserName"
                        defaultValue={ad.titleEn ?? ""}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold">
                        رابط الصورة
                      </label>
                      <input
                        name="imageUrl"
                        defaultValue={ad.imageUrl}
                        required
                        dir="ltr"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    {/*
                      placementType: hidden input يضمن إرسال القيمة الحالية دائماً
                      + select ظاهر للمستخدم. كلاهما بنفس الـ name.
                      المتصفح يُرسل آخر قيمة — لكن لضمان Server Actions نستخدم
                      select فقط بدون hidden input.
                    */}
                    {/* <div>
                      <label className="mb-1 block text-xs font-semibold">
                        نوع الموضع
                      </label>
                      <select
                        name="placementType"
                        defaultValue={ad.placementType}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      >
                        {Object.entries(PLACEMENT_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div> */}
                    <PlacementSelect
                      defaultValue="FULL_PAGE"
                      imageFieldId="cr"
                    />
                    <div>
                      <label className="mb-1 block text-xs font-semibold">
                        الأولوية (0–100)
                      </label>
                      <input
                        name="priority"
                        type="number"
                        defaultValue={ad.priority}
                        min={0}
                        max={100}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold">
                        📌 تثبيت بعد تصنيف
                      </label>
                      <CategorySelect
                        name="positionAfterCategoryId"
                        defaultValue={ad.positionAfterCategoryId}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">
                        رابط المعلن
                      </label>
                      <input
                        name="targetUrl"
                        defaultValue={ad.targetUrl ?? ""}
                        dir="ltr"
                        placeholder="https://..."
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">
                        هاتف
                      </label>
                      <input
                        name="phone"
                        defaultValue={ad.phone ?? ""}
                        dir="ltr"
                        placeholder="+963..."
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="submit"
                        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90"
                      >
                        حفظ التعديلات
                      </button>
                    </div>
                  </form>
                </details>

                {/* Actions row */}
                <div className="flex items-center gap-3 border-t border-border px-4 py-3">
                  <form action={togglePdfAdActive.bind(null, ad.id)}>
                    <button
                      type="submit"
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        ad.isActive
                          ? "border border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                          : "border border-green-300 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                      }`}
                    >
                      {ad.isActive ? "⛔ إيقاف" : "✅ تفعيل"}
                    </button>
                  </form>
                  <div className="mr-auto">
                    <DeleteAdButton adId={ad.id} adTitle={ad.titleAr} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
