/**
 * PdfHeroButtons — Server Component
 *
 * Reads from DB:
 * 1. Legacy PDF config (single row) — shows direct download if active
 * 2. Latest published dynamic edition — shows Generate/Preview CTAs
 *
 * Renders nothing if neither exists.
 * Designed to sit inside the homepage Hero section.
 */

import Link from "next/link";
import { FileDown, BookOpen, ExternalLink } from "lucide-react";
import { getLatestPublishedEdition, getLegacyPdfConfig } from "@/features/pdf/queries";

export async function PdfHeroButtons() {
  const [legacy, latest] = await Promise.all([
    getLegacyPdfConfig(),
    getLatestPublishedEdition(),
  ]);

  // LegacyPdfInfo exposes `isActive` (mapped from isPublished) and `fileUrl`
  const hasLegacy = legacy?.isActive && legacy.fileUrl;
  const hasLatest = !!latest;

  if (!hasLegacy && !hasLatest) return null;

  return (
    <div className="mx-auto mt-8 max-w-2xl">
      <div className="rounded-2xl border border-accent/20 bg-card/80 p-4 shadow-soft backdrop-blur-sm">
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          دليل النبك — PDF
        </p>
        <div className="flex flex-wrap justify-center gap-3">

          {/* Legacy: direct link download */}
          {hasLegacy && (
            <a
              href={legacy!.fileUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent/90"
            >
              <FileDown className="h-4 w-4" />
              {legacy!.titleAr ?? "تحميل الدليل"}
            </a>
          )}

          {/* Latest dynamic edition */}
          {hasLatest && (
            <>
              <Link
                href={`/pdf/preview/${latest!.id}`}
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold hover:bg-secondary/40"
              >
                <BookOpen className="h-4 w-4 text-accent" />
                {latest!.titleAr}
              </Link>

              <Link
                href="/pdf"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                كل الإصدارات
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* Stats row — uses createdAt (available in select) instead of finishedAt */}
        {latest?.generationJobs[0] && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {[
              latest.generationJobs[0].pagesCount
                ? `${latest.generationJobs[0].pagesCount} صفحة`
                : null,
              latest.city.nameAr,
              latest.generationJobs[0].createdAt
                ? new Date(latest.generationJobs[0].createdAt).toLocaleDateString(
                    "ar-SY",
                    { month: "long", year: "numeric" }
                  )
                : null,
            ]
              .filter(Boolean)
              .join(" • ")}
          </p>
        )}
      </div>
    </div>
  );
}
