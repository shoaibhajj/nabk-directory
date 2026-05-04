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

      <form action={createPdfEdition} className="space-y-5">
        {/* Title */}
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="titleAr">
            عنوان الإصدار *
          </label>
          <input
            id="titleAr"
            name="titleAr"
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="دليل النبك 2025"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="slug">
            المسار (Slug) *
          </label>
          <input
            id="slug"
            name="slug"
            required
            dir="ltr"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="nabk-directory-2025"
          />
        </div>

        {/* City */}
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="cityId">
            المدينة *
          </label>
          <select
            id="cityId"
            name="cityId"
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">— اختر مدينة —</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameAr}
              </option>
            ))}
          </select>
        </div>

        {/* Edition number */}
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="editionNumber">
            رقم الإصدار
          </label>
          <input
            id="editionNumber"
            name="editionNumber"
            type="number"
            min={1}
            defaultValue={1}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {/* Page size */}
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="pageSize">
            حجم الصفحة
          </label>
          <select
            id="pageSize"
            name="pageSize"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="A4">A4</option>
            <option value="LETTER">Letter</option>
          </select>
        </div>

        {/* Cover title */}
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="coverTitleAr">
            عنوان الغلاف (اختياري)
          </label>
          <input
            id="coverTitleAr"
            name="coverTitleAr"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        {/* Cover subtitle */}
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="coverSubtitleAr">
            عنوان فرعي للغلاف (اختياري)
          </label>
          <input
            id="coverSubtitleAr"
            name="coverSubtitleAr"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent/90"
          >
            إنشاء الإصدار
          </button>
          <a
            href="/admin/pdf/editions"
            className="rounded-lg border border-border px-5 py-2 text-sm font-semibold hover:bg-secondary/40"
          >
            إلغاء
          </a>
        </div>
      </form>
    </main>
  );
}
