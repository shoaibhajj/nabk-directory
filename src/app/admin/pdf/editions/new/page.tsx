/**
 * /admin/pdf/editions/new
 * Round 2: multi-city checkboxes, full feature flags, HTML intro/closing textareas.
 */

import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { createPdfEdition } from "@/app/actions/pdf-editions";

export default async function NewPdfEditionPage() {
  await requireAdmin("/admin/pdf/editions/new");

  const cities = await prisma.city.findMany({
    where: { isActive: true },
    orderBy: { nameAr: "asc" },
    select: { id: true, nameAr: true },
  });

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">إصدار PDF جديد</h1>

      <form action={createPdfEdition} className="space-y-6">

        {/* ── Basic info */}
        <section className="rounded-xl border border-border bg-secondary/10 p-5 space-y-4">
          <h2 className="font-semibold text-base">معلومات أساسية</h2>

          <div>
            <label className="mb-1 block text-sm font-semibold" htmlFor="titleAr">عنوان الإصدار *</label>
            <input id="titleAr" name="titleAr" required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="دليل النبك 2025" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold" htmlFor="slug">المسار (Slug) *</label>
            <input id="slug" name="slug" required dir="ltr"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="nabk-directory-2025" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold" htmlFor="editionNumber">رقم الإصدار</label>
              <input id="editionNumber" name="editionNumber" type="number" min={1} defaultValue={1}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold" htmlFor="pageSize">حجم الصفحة</label>
              <select id="pageSize" name="pageSize"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option value="A4">A4</option>
                <option value="LETTER">Letter</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold" htmlFor="generationMode">وضع التوليد</label>
            <select id="generationMode" name="generationMode" defaultValue="ALL_ACTIVE"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="ALL_ACTIVE">جميع المنشآت النشطة</option>
              <option value="SELECTED_CATEGORIES">تصنيفات مختارة فقط</option>
            </select>
          </div>
        </section>

        {/* ── City selection (multi-city checkboxes) */}
        <section className="rounded-xl border border-border bg-secondary/10 p-5 space-y-3">
          <h2 className="font-semibold text-base">المدينة *</h2>
          <p className="text-xs text-muted-foreground">اختر مدينة واحدة على الأقل. اختيار أكثر من مدينة يدمج نتائجها في إصدار واحد.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {cities.map((city) => (
              <label key={city.id} className="flex items-center gap-2 cursor-pointer rounded-lg
                border border-border bg-background px-3 py-2 text-sm hover:bg-secondary/30">
                <input type="checkbox" name="cityIds" value={city.id}
                  className="accent-accent h-4 w-4 shrink-0" />
                <span>{city.nameAr}</span>
              </label>
            ))}
          </div>
          {/* Fallback: single cityId for backwards compat */}
          <input type="hidden" name="cityId" value="" />
        </section>

        {/* ── Cover */}
        <section className="rounded-xl border border-border bg-secondary/10 p-5 space-y-4">
          <h2 className="font-semibold text-base">بيانات الغلاف</h2>
          <div>
            <label className="mb-1 block text-sm font-semibold" htmlFor="coverTitleAr">عنوان الغلاف (اختياري)</label>
            <input id="coverTitleAr" name="coverTitleAr"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold" htmlFor="coverSubtitleAr">عنوان فرعي (اختياري)</label>
            <input id="coverSubtitleAr" name="coverSubtitleAr"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
        </section>

        {/* ── Editorial text (HTML-aware textareas) */}
        <section className="rounded-xl border border-border bg-secondary/10 p-5 space-y-4">
          <h2 className="font-semibold text-base">نصوص تحريرية</h2>
          <p className="text-xs text-muted-foreground">يمكن استخدام HTML بسيط (لا يتم تفسيره حالياً — يظهر كنص عادي)</p>
          <div>
            <label className="mb-1 block text-sm font-semibold" htmlFor="introTextAr">نص المقدمة</label>
            <textarea id="introTextAr" name="introTextAr" rows={5} dir="rtl"
              placeholder="مرحباً بكم في دليل النبك..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-accent resize-y" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold" htmlFor="editorialTextAr">النص التحريري (في داخل الدليل)</label>
            <textarea id="editorialTextAr" name="editorialTextAr" rows={5} dir="rtl"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-accent resize-y" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold" htmlFor="closingTextAr">نص الخاتمة</label>
            <textarea id="closingTextAr" name="closingTextAr" rows={4} dir="rtl"
              placeholder="شكراً لتصفح دليل النبك..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-accent resize-y" />
          </div>
        </section>

        {/* ── Feature flags (checkboxes) */}
        <section className="rounded-xl border border-border bg-secondary/10 p-5 space-y-3">
          <h2 className="font-semibold text-base">ميزات المحتوى</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { name: "includeQrCodes",          label: "رموز QR لكل منشأة",      defaultChecked: true },
              { name: "includeBusinessLogos",    label: "شعارات المنشآت",           defaultChecked: false },
              { name: "includeAlphabeticalIndex", label: "فهرس أبجدي في البداية",   defaultChecked: true },
              { name: "includeFeaturedBusinesses",label: "منشآت مميزة",              defaultChecked: false },
              { name: "includeWebsiteProfile",   label: "صفحة تعريف الموقع",        defaultChecked: true },
              { name: "includeDeveloperProfile", label: "صفحة المطوّر",              defaultChecked: false },
              { name: "showEditionMetadata",     label: "معلومات الإصدار على الغلاف",  defaultChecked: true },
            ].map(({ name, label, defaultChecked }) => (
              <label key={name}
                className="flex items-center gap-3 cursor-pointer rounded-lg border border-border
                  bg-background px-3 py-2.5 text-sm hover:bg-secondary/30">
                <input type="checkbox" name={name} value="on"
                  defaultChecked={defaultChecked}
                  className="accent-accent h-4 w-4 shrink-0" />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </section>

        <div className="flex gap-3 pt-2">
          <button type="submit"
            className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent/90">
            إنشاء الإصدار
          </button>
          <a href="/admin/pdf/editions"
            className="rounded-lg border border-border px-5 py-2 text-sm font-semibold hover:bg-secondary/40">
            إلغاء
          </a>
        </div>
      </form>
    </main>
  );
}
