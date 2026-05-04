import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { upsertWebsiteProfile, upsertDeveloperProfile } from "@/app/actions/pdf-editions";

export default async function PdfProfilesPage() {
  await requireAdmin("/admin/pdf/profiles");

  const [website, developer] = await Promise.all([
    prisma.websiteProfileBlock.findFirst({ orderBy: { createdAt: "asc" } }),
    prisma.developerProfileBlock.findFirst({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">بلوكات التعريف</h1>

      {/* Website profile */}
      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold">بلوك الموقع</h2>
        <form action={upsertWebsiteProfile} className="space-y-4">
          <Field label="عنوان البلوك *" name="titleAr" defaultValue={website?.titleAr} required />
          <Field label="نص قصير" name="shortTextAr" defaultValue={website?.shortTextAr ?? ""} />
          <TextArea label="نص تفصيلي" name="bodyTextAr" defaultValue={website?.bodyTextAr ?? ""} />
          <Field label="رابط الموقع" name="websiteUrl" defaultValue={website?.websiteUrl ?? ""} dir="ltr" />
          <Field label="بريد الدعم" name="supportEmail" defaultValue={website?.supportEmail ?? ""} dir="ltr" />
          <Field label="هاتف الدعم" name="supportPhone" defaultValue={website?.supportPhone ?? ""} dir="ltr" />
          <Field label="نص زر الدعوة (CTA)" name="ctaTextAr" defaultValue={website?.ctaTextAr ?? ""} />
          <button
            type="submit"
            className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent/90"
          >
            حفظ
          </button>
        </form>
      </section>

      <hr className="my-8 border-border" />

      {/* Developer profile */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">بلوك المطور</h2>
        <form action={upsertDeveloperProfile} className="space-y-4">
          <Field label="الاسم الكامل *" name="fullName" defaultValue={developer?.fullName} required />
          <Field label="المسمى الوظيفي" name="roleTitleAr" defaultValue={developer?.roleTitleAr ?? ""} />
          <TextArea label="نبذة مختصرة" name="shortBioAr" defaultValue={developer?.shortBioAr ?? ""} />
          <Field label="رابط الملف الشخصي" name="portfolioUrl" defaultValue={developer?.portfolioUrl ?? ""} dir="ltr" />
          <Field label="البريد الإلكتروني" name="email" defaultValue={developer?.email ?? ""} dir="ltr" />
          <Field label="الهاتف" name="phone" defaultValue={developer?.phone ?? ""} dir="ltr" />
          <Field label="نص زر الدعوة (CTA)" name="ctaTextAr" defaultValue={developer?.ctaTextAr ?? ""} />
          <button
            type="submit"
            className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent/90"
          >
            حفظ
          </button>
        </form>
      </section>
    </main>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  dir,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        required={required}
        dir={dir}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
      />
    </div>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold" htmlFor={name}>
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={4}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
      />
    </div>
  );
}
