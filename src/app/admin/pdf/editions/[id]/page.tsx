import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { setEditionStatus } from "@/app/actions/pdf-editions";
import { GeneratePdfButton } from "@/components/admin/pdf/GeneratePdfButton";
import * as Tabs from "@radix-ui/react-tabs";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "مسودة", className: "bg-yellow-100 text-yellow-800" },
  PUBLISHED: { label: "منشور", className: "bg-green-100 text-green-800" },
  ARCHIVED: { label: "مؤرشف", className: "bg-gray-100 text-gray-600" },
};

export default async function EditionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("/admin/pdf/editions");
  const { id } = await params;

  const edition = await prisma.pdfEdition.findUnique({
    where: { id },
    include: {
      city: { select: { nameAr: true } },
      generationJobs: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      _count: { select: { editionAds: true } },
    },
  });

  if (!edition) notFound();

  const s = STATUS_LABELS[edition.status] ?? STATUS_LABELS.DRAFT;

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{edition.titleAr}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {edition.city.nameAr} • إصدار {edition.editionNumber} •{" "}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                s.className
              }`}
            >
              {s.label}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/pdf/editions/${id}/edit`}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary/40"
          >
            تعديل
          </Link>
          {edition.status === "DRAFT" && (
            <form
              action={async () => {
                "use server";
                await setEditionStatus(id, "PUBLISHED");
              }}
            >
              <button
                type="submit"
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                نشر
              </button>
            </form>
          )}
          {edition.status === "PUBLISHED" && (
            <form
              action={async () => {
                "use server";
                await setEditionStatus(id, "ARCHIVED");
              }}
            >
              <button
                type="submit"
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary/40"
              >
                أرشفة
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root defaultValue="overview" className="w-full">
        <Tabs.List className="mb-6 flex gap-1 border-b border-border">
          <Tabs.Trigger
            value="overview"
            className="rounded-t-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground"
          >
            نظرة عامة
          </Tabs.Trigger>
          <Tabs.Trigger
            value="ads"
            className="flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground"
          >
            الإعلانات
            {edition._count.editionAds > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
                {edition._count.editionAds}
              </span>
            )}
          </Tabs.Trigger>
        </Tabs.List>

        {/* Overview tab */}
        <Tabs.Content value="overview">
          {/* Generate PDF buttons */}
          <div className="mb-8 rounded-xl border border-border bg-secondary/20 p-5">
            <h2 className="mb-4 text-lg font-semibold">توليد PDF</h2>
            <div className="flex flex-wrap gap-3">
              <GeneratePdfButton editionId={id} isPreview={false} />
              <GeneratePdfButton editionId={id} isPreview={true} />
            </div>
          </div>

          {/* Edition details */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            <DetailRow label="المسار (slug)" value={edition.slug} dir="ltr" />
            <DetailRow label="حجم الصفحة" value={edition.pageSize} />
            <DetailRow
              label="تضمين كود QR"
              value={edition.includeQrCodes ? "نعم" : "لا"}
            />
            <DetailRow
              label="الفهرس الأبجدي"
              value={edition.includeAlphabeticalIndex ? "نعم" : "لا"}
            />
            <DetailRow
              label="بلوك الموقع"
              value={edition.includeWebsiteProfile ? "نعم" : "لا"}
            />
            <DetailRow
              label="بلوك المطور"
              value={edition.includeDeveloperProfile ? "نعم" : "لا"}
            />
          </div>

          {/* Recent jobs */}
          {edition.generationJobs.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold">آخر عمليات التوليد</h2>
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 text-right">
                    <tr>
                      <th className="px-4 py-2 font-semibold">التاريخ</th>
                      <th className="px-4 py-2 font-semibold">الحالة</th>
                      <th className="px-4 py-2 font-semibold">الصفحات</th>
                      <th className="px-4 py-2 font-semibold">حجم الملف</th>
                      <th className="px-4 py-2 font-semibold">رابط</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {edition.generationJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-secondary/20">
                        <td className="px-4 py-2 text-muted-foreground">
                          {job.createdAt.toLocaleDateString("ar-SY")}
                        </td>
                        <td className="px-4 py-2">
                          <JobStatusBadge status={job.status} />
                        </td>
                        <td className="px-4 py-2 text-center">
                          {job.pagesCount ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {job.fileSizeBytes
                            ? `${(job.fileSizeBytes / 1024).toFixed(0)} KB`
                            : "—"}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {job.outputFileUrl ? (
                            <a
                              href={job.outputFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline"
                            >
                              تحميل
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Tabs.Content>

        {/* Ads tab */}
        <Tabs.Content value="ads">
          <div className="rounded-xl border border-border bg-secondary/10 p-4 text-sm text-muted-foreground">
            <p>
              لإدارة إعلانات هذا الإصدار بشكل كامل، اذهب إلى{" "}
              <Link
                href={`/admin/pdf/editions/${id}/ads`}
                className="font-semibold text-primary underline hover:text-primary/80"
              >
                صفحة إدارة الإعلانات
              </Link>
              {" "}حيث يمكنك إضافة الإعلانات وتحديد مواضعها وصفحاتها وأولوياتها.
            </p>
            {edition._count.editionAds === 0 ? (
              <p className="mt-3 font-medium text-foreground">لا توجد إعلانات مضافة بعد.</p>
            ) : (
              <p className="mt-3 font-medium text-foreground">
                يوجد {edition._count.editionAds} إعلان مضاف لهذا الإصدار.
              </p>
            )}
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </main>
  );
}

function DetailRow({
  label,
  value,
  dir,
}: {
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/20 px-4 py-3">
      <p className="mb-0.5 text-xs text-muted-foreground">{label}</p>
      <p className="font-medium" dir={dir}>
        {value}
      </p>
    </div>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    QUEUED: "bg-gray-100 text-gray-600",
    PROCESSING: "bg-blue-100 text-blue-700",
    SUCCEEDED: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    QUEUED: "في الانتظار",
    PROCESSING: "جاري",
    SUCCEEDED: "نجح",
    FAILED: "فشل",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        map[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}
