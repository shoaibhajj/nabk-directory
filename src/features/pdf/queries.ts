/**
 * Public-facing DB queries for PDF pages.
 * These run in Server Components — no auth required.
 */

import { prisma } from "@/lib/prisma";

// ─── Normalised shape consumed by PdfHeroButtons + public /pdf page ──────────

export interface LegacyPdfInfo {
  isActive: boolean;
  /** Resolved URL: fileUrl if FILE, externalUrl if EXTERNAL_URL */
  fileUrl: string | null;
  titleAr: string;
  buttonLabelAr: string;
  buttonLabelEn: string | null;
  descriptionAr: string | null;
  openMode: string;
  publishedAt: Date | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the active Legacy PDF record, normalised to LegacyPdfInfo. */
export async function getLegacyPdfConfig(): Promise<LegacyPdfInfo | null> {
  const row = await prisma.legacyPdfConfig.findFirst({
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
    titleAr: row.titleAr,
    buttonLabelAr: row.buttonLabelAr,
    buttonLabelEn: row.buttonLabelEn ?? null,
    descriptionAr: row.descriptionAr ?? null,
    openMode: row.openMode,
    publishedAt: row.publishedAt ?? null,
  };
}

/** Returns the latest PUBLISHED edition with its last succeeded generation job. */
export async function getLatestPublishedEdition() {
  return prisma.pdfEdition.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: { editionNumber: "desc" },
    include: {
      city: { select: { nameAr: true } },
      generationJobs: {
        where: { status: "SUCCEEDED" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          pagesCount: true,
          fileSizeBytes: true,
          outputFileUrl: true,
          createdAt: true,
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
        where: { status: "SUCCEEDED" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          pagesCount: true,
          fileSizeBytes: true,
          outputFileUrl: true,
          createdAt: true,
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
        where: { status: "SUCCEEDED" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
}
