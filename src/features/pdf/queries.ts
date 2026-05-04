/**
 * Public-facing DB queries for PDF pages.
 * These run in Server Components — no auth required.
 */

import { prisma } from "@/lib/prisma";

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

/** Returns the Legacy PDF config (single row). */
export async function getLegacyPdfConfig() {
  return prisma.legacyPdfConfig.findFirst();
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
