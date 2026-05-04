import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { updatePdfEdition } from "@/app/actions/pdf-editions";

export default async function EditEditionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("/admin/pdf/editions");
  const { id } = await params;

  const edition = await prisma.pdfEdition.findUnique({ where: { id } });
  if (!edition) notFound();

  const action = updatePdfEdition.bind(null, id);

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">تعديل الإصدار</h1>

      <form action={action} className="space-y-5">
        <Field label="عنوان الإصدار *" name="titleAr" defaultValue={edition.titleAr} required />

        <Field
          label="عنوان الغلاف"
          name="coverTitleAr"
          defaultValue={edition.coverTitleAr ?? ""}
        />
        <Field
          label="عنوان فرعي للغلاف"
          name="coverSubtitleAr"
          defaultValue={edition.coverSubtitleAr ?? ""}
        />

        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="introTextAr">
            نص المقدمة
          </label>
          <textarea
            id="introTextAr"
            name="introTextAr"
            rows={4}
            defaultValue={edition.introTextAr ?? ""}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="closingTextAr">
            نص الختام
          </label>
          <textarea
            id="closingTextAr"
            name="closingTextAr"
            rows={4}
            defaultValue={edition.closingTextAr ?? ""}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="pageSize">
            حجم الصفحة
          </label>
          <select
            id="pageSize"
            name="pageSize"
            defaultValue={edition.pageSize}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="A4">A4</option>
            <option value="LETTER">Letter</option>
          </select>
        </div>

        <Field
          label="رقم الإصدار"
          name="editionNumber"
          type="number"
          defaultValue={String(edition.editionNumber)}
        />

        {/* Feature toggles */}
        <fieldset className="rounded-xl border border-border p-4">
          <legend className="px-1 text-sm font-semibold">خيارات التضمين</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Toggle name="includeQrCodes" label="كود QR" defaultChecked={edition.includeQrCodes} />
            <Toggle name="includeBusinessLogos" label="شعارات المنشآت" defaultChecked={edition.includeBusinessLogos} />
            <Toggle name="includeAlphabeticalIndex" label="فهرس أبجدي" defaultChecked={edition.includeAlphabeticalIndex} />
            <Toggle name="includeWebsiteProfile" label="بلوك الموقع" defaultChecked={edition.includeWebsiteProfile} />
            <Toggle name="includeDeveloperProfile" label="بلوك المطور" defaultChecked={edition.includeDeveloperProfile} />
            <Toggle name="showEditionMetadata" label="بيانات الإصدار على الغلاف" defaultChecked={edition.showEditionMetadata} />
          </div>
        </fieldset>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent/90"
          >
            حفظ التعديلات
          </button>
          <a
            href={`/admin/pdf/editions/${id}`}
            className="rounded-lg border border-border px-5 py-2 text-sm font-semibold hover:bg-secondary/40"
          >
            إلغاء
          </a>
        </div>
      </form>
    </main>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
      />
    </div>
  );
}

function Toggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-border accent-accent"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}
