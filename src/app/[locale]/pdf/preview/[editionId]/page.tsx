import { notFound } from "next/navigation";
import Link from "next/link";
import { FileDown, ArrowRight } from "lucide-react";
import { getPublishedEditionById } from "@/features/pdf/queries";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DownloadPdfButton } from "@/components/pdf/DownloadPdfButton";

export default async function EditionPreviewPage({
  params,
}: {
  params: Promise<{ editionId: string }>;
}) {
  const { editionId } = await params;
  const edition = await getPublishedEditionById(editionId);
  if (!edition) notFound();

  const lastJob = edition.generationJobs[0];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto max-w-3xl px-4 py-10">
        {/* Back */}
        <Link
          href="/pdf"
          className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          العودة للدليل
        </Link>

        {/* Header */}
        <div className="mb-8 rounded-2xl border border-border bg-secondary/20 p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{edition.titleAr}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {edition.city.nameAr} • إصدار {edition.editionNumber}
              </p>
            </div>
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
              منشور
            </span>
          </div>

          {/* Stats */}
          {lastJob && (
            <div className="mb-5 grid grid-cols-3 gap-3 rounded-xl bg-background p-4">
              <Stat label="عدد الصفحات" value={lastJob.pagesCount ?? "—"} />
              <Stat label="عدد المنشآت" value={lastJob.businessesCount ?? "—"} />
              <Stat
                label="تاريخ التوليد"
                value={
                  lastJob.generatedAt
                    ? new Date(lastJob.generatedAt).toLocaleDateString("ar-SY")
                    : "—"
                }
              />
            </div>
          )}

          <DownloadPdfButton editionId={edition.id} fullWidth />
        </div>

        {/* Cover text blocks */}
        {edition.coverTitleAr && (
          <div className="mb-5">
            <h2 className="text-lg font-semibold">{edition.coverTitleAr}</h2>
            {edition.coverSubtitleAr && (
              <p className="mt-1 text-muted-foreground">{edition.coverSubtitleAr}</p>
            )}
          </div>
        )}

        {edition.introTextAr && (
          <div className="mb-6 rounded-xl border border-border bg-secondary/20 p-5">
            <h3 className="mb-2 font-semibold">كلمة التقديم</h3>
            <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
              {edition.introTextAr}
            </p>
          </div>
        )}

        {/* What's inside */}
        <div className="rounded-xl border border-border p-5">
          <h3 className="mb-3 font-semibold">ماذا يتضمن الدليل؟</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="text-accent">✔</span>
              جميع الأعمال والخدمات مرتبة حسب التصنيف
            </li>
            <li className="flex items-center gap-2">
              <span className="text-accent">✔</span>
              أرقام الهاتف ومعلومات التواصل
            </li>
            {edition.includeQrCodes && (
              <li className="flex items-center gap-2">
                <span className="text-accent">✔</span>
                كود QR لكل عمل
              </li>
            )}
            {edition.includeAlphabeticalIndex && (
              <li className="flex items-center gap-2">
                <span className="text-accent">✔</span>
                فهرس أبجدي
              </li>
            )}
          </ul>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-accent">
        {typeof value === "number" ? value.toLocaleString("ar-EG") : value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
