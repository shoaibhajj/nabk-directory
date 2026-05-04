"use client";
/**
 * NewEditionForm — Client Component
 * Contains TiptapEditor instances so they can use useEditor().
 * Submits via Server Action createPdfEdition.
 */

import { TiptapEditor } from "@/components/admin/tiptap-editor";
import { createPdfEdition } from "@/app/actions/pdf-editions";

interface City {
  id: string;
  nameAr: string;
  nameEn: string;
}

export function NewEditionForm({ cities }: { cities: City[] }) {
  return (
    <form action={createPdfEdition} className="space-y-6">

      {/* ─ Basic info ─────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-secondary/20 p-5">
        <h2 className="mb-4 text-base font-semibold">معلومات أساسية</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold">عنوان الإصدار *</label>
            <input name="titleAr" required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">المسار (slug) *</label>
            <input name="slug" required dir="ltr" placeholder="nabk-2026-v1"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">رقم الإصدار</label>
            <input name="editionNumber" type="number" defaultValue={1} min={1}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">حجم الصفحة</label>
            <select name="pageSize" defaultValue="A4"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="A4">A4</option>
              <option value="LETTER">Letter</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">وضع التوليد</label>
            <select name="generationMode" defaultValue="ALL_ACTIVE"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="ALL_ACTIVE">جميع المنشآت الفعالة</option>
              <option value="SELECTED_CATEGORIES">تصنيفات محددة فقط</option>
            </select>
          </div>
        </div>
      </section>

      {/* ─ City selection (multi) ────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-secondary/20 p-5">
        <h2 className="mb-3 text-base font-semibold">
          المدينة
          <span className="mr-2 text-xs font-normal text-muted-foreground">
            (اختيار أكثر من مدينة يدمج نتائجها في إصدار واحد)
          </span>
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {cities.map((city) => (
            <label key={city.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border
                bg-background px-3 py-2 text-sm hover:bg-secondary/40">
              <input type="checkbox" name="cityIds" value={city.id}
                className="h-4 w-4 rounded accent-accent" />
              <span>{city.nameAr}</span>
              {city.nameEn && (
                <span className="text-xs text-muted-foreground">({city.nameEn})</span>
              )}
            </label>
          ))}
        </div>
        {/* Hidden field: primary cityId = first checked (handled in action) */}
        <p className="mt-2 text-xs text-muted-foreground">
          يجب اختيار مدينة واحدة على الأقل.
        </p>
      </section>

      {/* ─ Cover ─────────────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-secondary/20 p-5">
        <h2 className="mb-4 text-base font-semibold">نصوص الغلاف</h2>
        <div className="grid gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold">عنوان الغلاف</label>
            <input name="coverTitleAr"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">عنوان فرعي</label>
            <input name="coverSubtitleAr"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
        </div>
      </section>

      {/* ─ Rich text editorial sections ─────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-secondary/20 p-5">
        <h2 className="mb-4 text-base font-semibold">المحتوى التحريري</h2>
        <div className="grid gap-6">
          <div>
            <label className="mb-1 block text-xs font-semibold">نص المقدمة</label>
            <TiptapEditor name="introTextAr" placeholder="كتابة مقدمة الدليل..." minHeight={120} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">النص التحريري (الوسط)</label>
            <TiptapEditor name="editorialTextAr" placeholder="المقال التحريري الرئيسي..." minHeight={180} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">نص الخاتمة</label>
            <TiptapEditor name="closingTextAr" placeholder="خاتمة الدليل..." minHeight={120} />
          </div>
        </div>
      </section>

      {/* ─ Feature flags ─────────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-secondary/20 p-5">
        <h2 className="mb-4 text-base font-semibold">خصائص التوليد</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            ["includeQrCodes",            "تضمين رموز QR",                  true],
            ["includeBusinessLogos",      "إظهار شعارات المنشآت",            false],
            ["includeAlphabeticalIndex",  "فهرس أبجدي",                   true],
            ["includeFeaturedBusinesses", "إبراز المنشآت المميزة",         true],
            ["includeWebsiteProfile",     "صفحة الموقع الإلكتروني",        true],
            ["includeDeveloperProfile",   "صفحة المطوّر",                 false],
            ["showEditionMetadata",       "معلومات الإصدار (رقم, تاريخ…)",  true],
          ] as [string, string, boolean][]).map(([fieldName, label, defaultChecked]) => (
            <label key={fieldName}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-border
                bg-background px-3 py-2.5 text-sm hover:bg-secondary/40">
              <input
                type="checkbox"
                name={fieldName}
                value="on"
                defaultChecked={defaultChecked}
                className="h-4 w-4 rounded accent-accent"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold
            text-white hover:bg-accent/90 focus:outline-none focus:ring-2
            focus:ring-accent focus:ring-offset-2"
        >
          إنشاء الإصدار
        </button>
      </div>
    </form>
  );
}
