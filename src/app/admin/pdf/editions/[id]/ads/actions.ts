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

export async function getAvailableAds(editionId: string) {
  await requireAdmin();
  const already = await prisma.pdfEditionAd.findMany({
    where: { editionId },
    select: { adId: true },
  });
  const usedIds = already.map((r) => r.adId);
  return prisma.pdfAd.findMany({
    where: { id: { notIn: usedIds }, isActive: true },
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
  // assign next priority
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

export async function toggleEditionAd(id: string, editionId: string, isActive: boolean) {
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
