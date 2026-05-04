/**
 * Public-facing DB queries for PDF pages.
 * These run in Server Components — no auth required.
 *
 * NOTE: The Prisma model for the legacy PDF is `PdfLegacyFile` (@@map "pdf_legacy_files").
 * We expose it through a normalised `LegacyPdfInfo` shape so every consumer
 * stays the same if the underlying model ever changes.
 */

import { prisma } from "@/lib/prisma";

// ─── Normalised shape consumed by PdfHeroButtons + public /pdf page ──────────

export interface LegacyPdfInfo {
  isActive: boolean;
  /** Resolved URL: fileUrl if FILE, externalUrl if EXTERNAL_URL */
  fileUrl: string | null;
  titleAr: string;
  descriptionAr: string | null;
  pageCount: number | null;
  businessCount: number | null;
  publishedAt: Date | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the active Legacy PDF record, normalised to LegacyPdfInfo. */
export async function getLegacyPdfConfig(): Promise<LegacyPdfInfo | null> {
  const row = await prisma.pdfLegacyFile.findFirst({
    where: { isPublished: true },
    orderBy: { updatedAt: "desc" },
  });

  if (!row) return null;

  return {
    isActive: row.isPublished,
    fileUrl:
      row.sourceType === "FILE"
        ? row.fileUrl
        : row.externalUrl ?? row.fileUrl,
    titleAr: row.buttonLabelAr ?? row.titleAr,
    descriptionAr: row.descriptionAr ?? null,
    // PdfLegacyFile doesn't store pageCount/businessCount — kept null
    // until we add those fields in a future migration.
    pageCount: null,
    businessCount: null,
    publishedAt: row.publishedAt ?? null,
  };
}

/** Returns the latest PUBLISHED edition with its generation job stats. */
export async function getLatestPublishedEdition() {
  return prisma.pdfEdition.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: { editionNumber: "desc" },
    include: {
      city: { select: { nameAr: true } },
      generationJobs: {
        where: { status: "SUCCEEDED", isPreview: false },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          pagesCount: true,
          businessesCount: true,
          outputFileSizeBytes: true,
          generatedAt: true,
        },
      },
    },
  });
}

/** Returns all PUBLISHED editions ordered by editionNumber desc. */
export async function getPublishedEditions() {
  return prisma.pdfEdition.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { editionNumber: "desc" },
    include: {
      city: { select: { nameAr: true } },
      generationJobs: {
        where: { status: "SUCCEEDED", isPreview: false },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          pagesCount: true,
          businessesCount: true,
          outputFileSizeBytes: true,
          generatedAt: true,
        },
      },
    },
  });
}

/** Returns a single PUBLISHED edition by ID (for preview page). */
export async function getPublishedEditionById(id: string) {
  return prisma.pdfEdition.findFirst({
    where: { id, status: "PUBLISHED" },
    include: {
      city: { select: { nameAr: true } },
      generationJobs: {
        where: { status: "SUCCEEDED", isPreview: false },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
}
