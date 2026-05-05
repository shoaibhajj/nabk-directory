"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";
import { AuditAction, PdfAdPlacementType } from "@prisma/client";

// ── Create Edition ────────────────────────────────────────────────────────────────────

export async function createPdfEdition(formData: FormData) {
  const session = await requireAdmin("/admin/pdf/editions");

  const titleAr        = formData.get("titleAr") as string;
  const slug           = formData.get("slug") as string;
  const pageSize       = (formData.get("pageSize") as string) ?? "A4";
  const editionNumber  = Number(formData.get("editionNumber") ?? 1);
  const generationMode = (formData.get("generationMode") as string) ?? "ALL_ACTIVE";

  const cityIds = (formData.getAll("cityIds") as string[]).filter(Boolean);
  const cityId  = cityIds[0] ?? "";

  if (!titleAr?.trim() || !slug?.trim() || !cityId) {
    throw new Error("حقول العنوان والمسار والمدينة مطلوبة");
  }

  const edition = await prisma.pdfEdition.create({
    data: {
      titleAr:         titleAr.trim(),
      slug:            slug.trim(),
      cityId,
      cityIdsJson:     JSON.stringify(cityIds),
      pageSize,
      editionNumber,
      generationMode,
      status:          "DRAFT",
      coverTitleAr:    (formData.get("coverTitleAr") as string) || null,
      coverSubtitleAr: (formData.get("coverSubtitleAr") as string) || null,
      introTextAr:     (formData.get("introTextAr") as string) || null,
      editorialTextAr: (formData.get("editorialTextAr") as string) || null,
      closingTextAr:   (formData.get("closingTextAr") as string) || null,
      includeQrCodes:            formData.get("includeQrCodes") === "on",
      includeBusinessLogos:      formData.get("includeBusinessLogos") === "on",
      includeAlphabeticalIndex:  formData.get("includeAlphabeticalIndex") === "on",
      includeFeaturedBusinesses: formData.get("includeFeaturedBusinesses") === "on",
      includeWebsiteProfile:     formData.get("includeWebsiteProfile") === "on",
      includeDeveloperProfile:   formData.get("includeDeveloperProfile") === "on",
      showEditionMetadata:       formData.get("showEditionMetadata") === "on",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId:    session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole:  session.user.role,
      action:     AuditAction.PDF_EDITION_CREATED,
      entityType: "PdfEdition",
      entityId:   edition.id,
      newValues:  { titleAr, slug, cityId, cityIds } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/admin/pdf/editions");
  redirect(`/admin/pdf/editions/${edition.id}`);
}

// ── Update Edition ──────────────────────────────────────────────────────────────────

export async function updatePdfEdition(editionId: string, formData: FormData) {
  const session = await requireAdmin(`/admin/pdf/editions/${editionId}/edit`);

  const cityIds = (formData.getAll("cityIds") as string[]).filter(Boolean);
  const cityId  = cityIds[0];

  const data: Record<string, unknown> = {
    titleAr:         formData.get("titleAr"),
    coverTitleAr:    formData.get("coverTitleAr") || null,
    coverSubtitleAr: formData.get("coverSubtitleAr") || null,
    introTextAr:     formData.get("introTextAr") || null,
    editorialTextAr: formData.get("editorialTextAr") || null,
    closingTextAr:   formData.get("closingTextAr") || null,
    pageSize:        formData.get("pageSize"),
    editionNumber:   Number(formData.get("editionNumber")),
    generationMode:  formData.get("generationMode") ?? "ALL_ACTIVE",
    includeQrCodes:            formData.get("includeQrCodes") === "on",
    includeBusinessLogos:      formData.get("includeBusinessLogos") === "on",
    includeAlphabeticalIndex:  formData.get("includeAlphabeticalIndex") === "on",
    includeFeaturedBusinesses: formData.get("includeFeaturedBusinesses") === "on",
    includeWebsiteProfile:     formData.get("includeWebsiteProfile") === "on",
    includeDeveloperProfile:   formData.get("includeDeveloperProfile") === "on",
    showEditionMetadata:       formData.get("showEditionMetadata") === "on",
  };

  if (cityId) {
    data.cityId      = cityId;
    data.cityIdsJson = JSON.stringify(cityIds);
  }

  await prisma.pdfEdition.update({ where: { id: editionId }, data });

  await prisma.auditLog.create({
    data: {
      actorId:    session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole:  session.user.role,
      action:     AuditAction.PDF_EDITION_UPDATED,
      entityType: "PdfEdition",
      entityId:   editionId,
      newValues:  data as Prisma.InputJsonValue,
    },
  });

  revalidatePath(`/admin/pdf/editions/${editionId}`);
  revalidatePath("/admin/pdf/editions");
  redirect(`/admin/pdf/editions/${editionId}`);
}

// ── Set Edition Status ─────────────────────────────────────────────────────────────────

const STATUS_AUDIT_MAP: Record<string, AuditAction> = {
  DRAFT:     AuditAction.PDF_EDITION_UPDATED,
  PUBLISHED: AuditAction.PDF_EDITION_PUBLISHED,
  ARCHIVED:  AuditAction.PDF_EDITION_ARCHIVED,
};

export async function setEditionStatus(
  editionId: string,
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
) {
  const session = await requireAdmin("/admin/pdf/editions");

  await prisma.pdfEdition.update({
    where: { id: editionId },
    data: {
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId:    session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole:  session.user.role,
      action:     STATUS_AUDIT_MAP[status] ?? AuditAction.PDF_EDITION_UPDATED,
      entityType: "PdfEdition",
      entityId:   editionId,
      newValues:  { status } as Prisma.InputJsonValue,
    },
  });

  revalidatePath(`/admin/pdf/editions/${editionId}`);
  revalidatePath("/admin/pdf/editions");
}

// ── Create Ad ─────────────────────────────────────────────────────────────────────────

export async function createPdfAd(formData: FormData) {
  const session = await requireAdmin("/admin/pdf/ads");

  const rawPlacement = formData.get("placementType") as string;
  const validPlacements = Object.values(PdfAdPlacementType);
  const placementType = validPlacements.includes(rawPlacement as PdfAdPlacementType)
    ? (rawPlacement as PdfAdPlacementType)
    : PdfAdPlacementType.FULL_PAGE;

  const positionAfterCategoryId =
    (formData.get("positionAfterCategoryId") as string) || null;

  const ad = await prisma.pdfAd.create({
    data: {
      titleAr:        formData.get("titleAr") as string,
      imageUrl:       formData.get("imageUrl") as string,
      linkUrl:        (formData.get("linkUrl") as string) || null,
      placementType,
      priority:       Number(formData.get("priority") ?? 0),
      isActive:       true,
      positionAfterCategoryId,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId:    session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole:  session.user.role,
      action:     AuditAction.PDF_AD_CREATED,
      entityType: "PdfAd",
      entityId:   ad.id,
      newValues:  { titleAr: ad.titleAr, placementType, positionAfterCategoryId } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/admin/pdf/ads");
}

// ── Update Ad ─────────────────────────────────────────────────────────────────────────

export async function updatePdfAd(adId: string, formData: FormData) {
  const session = await requireAdmin("/admin/pdf/ads");

  const rawPlacement = formData.get("placementType") as string;
  const validPlacements = Object.values(PdfAdPlacementType);
  const placementType = validPlacements.includes(rawPlacement as PdfAdPlacementType)
    ? (rawPlacement as PdfAdPlacementType)
    : PdfAdPlacementType.FULL_PAGE;

  const positionAfterCategoryId =
    (formData.get("positionAfterCategoryId") as string) || null;

  const ad = await prisma.pdfAd.update({
    where: { id: adId },
    data: {
      titleAr:        formData.get("titleAr") as string,
      imageUrl:       formData.get("imageUrl") as string,
      linkUrl:        (formData.get("linkUrl") as string) || null,
      placementType,
      priority:       Number(formData.get("priority") ?? 0),
      positionAfterCategoryId,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId:    session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole:  session.user.role,
      action:     AuditAction.PDF_AD_UPDATED,
      entityType: "PdfAd",
      entityId:   adId,
      newValues:  { titleAr: ad.titleAr, placementType, priority: ad.priority, positionAfterCategoryId } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/admin/pdf/ads");
}

// ── Toggle Ad Active ─────────────────────────────────────────────────────────────────

export async function togglePdfAdActive(adId: string) {
  const session = await requireAdmin("/admin/pdf/ads");

  const ad = await prisma.pdfAd.findUniqueOrThrow({ where: { id: adId } });
  const updated = await prisma.pdfAd.update({
    where: { id: adId },
    data: { isActive: !ad.isActive },
  });

  await prisma.auditLog.create({
    data: {
      actorId:    session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole:  session.user.role,
      action:     updated.isActive ? AuditAction.PDF_AD_ACTIVATED : AuditAction.PDF_AD_DEACTIVATED,
      entityType: "PdfAd",
      entityId:   adId,
      newValues:  { isActive: updated.isActive } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/admin/pdf/ads");
}

// ── Delete Ad ─────────────────────────────────────────────────────────────────────────

export async function deletePdfAd(adId: string) {
  const session = await requireAdmin("/admin/pdf/ads");

  const ad = await prisma.pdfAd.findUniqueOrThrow({ where: { id: adId } });
  await prisma.pdfEditionAd.deleteMany({ where: { adId } });
  await prisma.pdfAd.delete({ where: { id: adId } });

  await prisma.auditLog.create({
    data: {
      actorId:    session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole:  session.user.role,
      action:     AuditAction.PDF_AD_DELETED,
      entityType: "PdfAd",
      entityId:   adId,
      newValues:  { titleAr: ad.titleAr } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/admin/pdf/ads");
}
