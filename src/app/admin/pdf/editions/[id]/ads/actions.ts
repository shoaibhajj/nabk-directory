"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import { PdfAdPlacementType } from "@prisma/client";

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getEditionAds(editionId: string) {
  await requireAdmin();
  return prisma.pdfEditionAd.findMany({
    where: { editionId },
    orderBy: { priority: "asc" },
    include: {
      ad: {
        select: {
          id: true,
          titleAr: true,
          imageUrl: true,
          placementType: true,
          isActive: true,
          targetUrl: true,
          phone: true,
        },
      },
    },
  });
}

/**
 * Returns ALL active ads — even ones already added to this edition.
 * A single ad can appear multiple times in an edition (different pages/placements).
 */
export async function getAvailableAds(_editionId: string) {
  await requireAdmin();
  return prisma.pdfAd.findMany({
    where: { isActive: true },
    orderBy: { titleAr: "asc" },
    select: {
      id: true,
      titleAr: true,
      imageUrl: true,
      placementType: true,
    },
  });
}

// ─── Write ───────────────────────────────────────────────────────────────────

export async function addAdToEdition(editionId: string, adId: string) {
  await requireAdmin();
  const max = await prisma.pdfEditionAd.aggregate({
    where: { editionId },
    _max: { priority: true },
  });
  const nextPriority = (max._max.priority ?? -1) + 1;
  await prisma.pdfEditionAd.create({
    data: { editionId, adId, priority: nextPriority },
  });
  revalidatePath(`/admin/pdf/editions/${editionId}/ads`);
}

export async function removeAdFromEdition(id: string, editionId: string) {
  await requireAdmin();
  await prisma.pdfEditionAd.delete({ where: { id } });
  revalidatePath(`/admin/pdf/editions/${editionId}/ads`);
}

export async function toggleEditionAd(
  id: string,
  editionId: string,
  isActive: boolean
) {
  await requireAdmin();
  await prisma.pdfEditionAd.update({ where: { id }, data: { isActive } });
  revalidatePath(`/admin/pdf/editions/${editionId}/ads`);
}

export async function updateEditionAd(
  id: string,
  editionId: string,
  data: {
    priority?: number;
    overridePlacement?: PdfAdPlacementType | null;
    pageNumbers?: number[];
    notes?: string;
  }
) {
  await requireAdmin();
  await prisma.pdfEditionAd.update({ where: { id }, data });
  revalidatePath(`/admin/pdf/editions/${editionId}/ads`);
}

export async function reorderEditionAds(
  editionId: string,
  orderedIds: string[]
) {
  await requireAdmin();
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.pdfEditionAd.update({
        where: { id },
        data: { priority: index },
      })
    )
  );
  revalidatePath(`/admin/pdf/editions/${editionId}/ads`);
}

/**
 * Move a single row up or down by swapping priorities with its neighbour.
 * allIds = ordered list of PdfEditionAd.id values (sorted by priority asc).
 */
export async function moveEditionAd(
  id: string,
  editionId: string,
  direction: "up" | "down",
  allIds: string[]
) {
  await requireAdmin();

  const currentIndex = allIds.indexOf(id);
  if (currentIndex === -1) return;

  const targetIndex =
    direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= allIds.length) return;

  const neighbourId = allIds[targetIndex];

  await prisma.$transaction([
    prisma.pdfEditionAd.update({
      where: { id },
      data: { priority: targetIndex },
    }),
    prisma.pdfEditionAd.update({
      where: { id: neighbourId },
      data: { priority: currentIndex },
    }),
  ]);

  revalidatePath(`/admin/pdf/editions/${editionId}/ads`);
}
