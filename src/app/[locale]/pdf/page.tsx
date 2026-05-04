import type { Metadata } from "next";
import Link from "next/link";
import { FileDown, BookOpen, Calendar, Building2 } from "lucide-react";
import { getPublishedEditions, getLegacyPdfConfig } from "@/features/pdf/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DownloadPdfButton } from "@/components/pdf/DownloadPdfButton";

export const metadata: Metadata = {
  title: "دليل النبك — تحميل PDF",
  description: "حمل دليل النبك بصيغة PDF واحتفظ به للوصول السريع لكل الأعمال والخدمات.",
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function PdfDirectoryPage() {
  const [editions, legacy] = await Promise.all([
    getPublishedEditions(),
    getLegacyPdfConfig(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="gradient-hero">
        <div className="container mx-auto px-4 py-14 text-center">
          <span className="inline-block rounded-full bg-secondary px-4 py-1.5 text-sm font-semibold text-accent">
            دليل PDF
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-foreground md:text-5xl">
            دليل النبك
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            كل الأعمال والخدمات في مدينتك — في ملف واحد تحمله وتفتحه بدون إنترنت.
          </p>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12">

        {/* Legacy PDF block */}
        {legacy?.isActive && legacy.fileUrl && (
          <div className="mb-10 rounded-2xl border border-accent/30 bg-accent/5 p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-accent" />
                  <h2 className="text-xl font-bold">
                    {legacy.titleAr ?? "الإصدار الأساسي"}
                  </h2>
                </div>
                {legacy.descriptionAr && (
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                    {legacy.descriptionAr}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {legacy.pageCount && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      {legacy.pageCount} صفحة
                    </span>
                  )}
                  {legacy.publishedAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(legacy.publishedAt).toLocaleDateString("ar-SY", {
                        year: "numeric",
                        month: "long",
                      })}
                    </span>
                  )}
                  {legacy.businessCount && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {legacy.businessCount} منشأة
                    </span>
                  )}
                </div>
              </div>
              <a
                href={legacy.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent/90"
              >
                <FileDown className="h-4 w-4" />
                تحميل PDF
              </a>
            </div>
          </div>
        )}

        {/* Dynamic editions */}
        {editions.length > 0 && (
          <>
            <h2 className="mb-6 text-2xl font-bold">إصدارات الدليل</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {editions.map((ed) => {
                const lastJob = ed.generationJobs[0];
                return (
                  <Card key={ed.id} className="overflow-hidden">
                    <CardContent className="p-5">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold leading-tight">{ed.titleAr}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {ed.city.nameAr} • إصدار {ed.editionNumber}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                          منشور
                        </span>
                      </div>

                      {lastJob && (
                        <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {lastJob.pagesCount && (
                            <span>{lastJob.pagesCount} صفحة</span>
                          )}
                          {lastJob.businessesCount && (
                            <span>{lastJob.businessesCount} منشأة</span>
                          )}
                          {lastJob.outputFileSizeBytes && (
                            <span>{formatBytes(lastJob.outputFileSizeBytes)}</span>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <DownloadPdfButton editionId={ed.id} />
                        <Link
                          href={`/pdf/preview/${ed.id}`}
                          className="flex-1 rounded-lg border border-border px-3 py-2 text-center text-xs font-semibold hover:bg-secondary/40"
                        >
                          معاينة
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* Empty state */}
        {editions.length === 0 && !legacy?.isActive && (
          <div className="py-20 text-center text-muted-foreground">
            <FileDown className="mx-auto mb-4 h-12 w-12 opacity-30" />
            <p className="text-lg font-semibold">لا يوجد إصدار متاح حالياً.</p>
            <p className="mt-1 text-sm">سيتم نشر الدليل قريباً.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
