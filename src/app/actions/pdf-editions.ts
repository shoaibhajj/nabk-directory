"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

  // Multi-city: collect all checked cityIds
  const cityIds = (formData.getAll("cityIds") as string[]).filter(Boolean);
  const cityId  = cityIds[0] ?? ""; // primary city (required by schema)

  if (!titleAr?.trim() || !slug?.trim() || !cityId) {
    throw new Error("حقول العنوان والمسار والمدينة مطلوبة");
  }

  const edition = await prisma.pdfEdition.create({
    data: {
      titleAr:         titleAr.trim(),
      slug:            slug.trim(),
      cityId,
      // Store full city list as JSON for multi-city data-loader
      cityIdsJson:     JSON.stringify(cityIds),
      pageSize,
      editionNumber,
      generationMode,
      status:          "DRAFT",
      coverTitleAr:    (formData.get("coverTitleAr") as string) || null,
      coverSubtitleAr: (formData.get("coverSubtitleAr") as string) || null,
      // Tiptap JSON strings (or plain text) — stored as-is, parsed at generation time
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
      newValues:  { titleAr, slug, cityId, cityIds },
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
      newValues:  data,
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
      newValues:  { status },
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

  const ad = await prisma.pdfAd.create({
    data: {
      titleAr:        formData.get("titleAr") as string,
      advertiserName: formData.get("advertiserName") as string,
      imageUrl:       formData.get("imageUrl") as string,
      targetUrl:      (formData.get("targetUrl") as string) || null,
      phone:          (formData.get("phone") as string) || null,
      placementType,
      priority: Number(formData.get("priority") ?? 0),
      isActive: true,
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
      newValues:  { titleAr: ad.titleAr, placementType },
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

  const ad = await prisma.pdfAd.update({
    where: { id: adId },
    data: {
      titleAr:        formData.get("titleAr") as string,
      advertiserName: formData.get("advertiserName") as string,
      imageUrl:       formData.get("imageUrl") as string,
      targetUrl:      (formData.get("targetUrl") as string) || null,
      phone:          (formData.get("phone") as string) || null,
      placementType,
      priority: Number(formData.get("priority") ?? 0),
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
      newValues:  { titleAr: ad.titleAr, placementType, priority: ad.priority },
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
      newValues:  { isActive: updated.isActive },
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
      newValues:  { titleAr: ad.titleAr },
    },
  });

  revalidatePath("/admin/pdf/ads");
}

// ── Upsert Website Profile ────────────────────────────────────────────────────────────

export async function upsertWebsiteProfile(formData: FormData) {
  const session = await requireAdmin("/admin/pdf/profiles");
  const existing = await prisma.websiteProfileBlock.findFirst({ orderBy: { createdAt: "asc" } });

  const data = {
    titleAr:      formData.get("titleAr") as string,
    shortTextAr:  (formData.get("shortTextAr") as string) || null,
    bodyTextAr:   (formData.get("bodyTextAr") as string) || null,
    websiteUrl:   (formData.get("websiteUrl") as string) || null,
    supportEmail: (formData.get("supportEmail") as string) || null,
    supportPhone: (formData.get("supportPhone") as string) || null,
    ctaTextAr:    (formData.get("ctaTextAr") as string) || null,
    isActive: true,
  };

  if (existing) {
    await prisma.websiteProfileBlock.update({ where: { id: existing.id }, data });
  } else {
    await prisma.websiteProfileBlock.create({ data });
  }

  await prisma.auditLog.create({
    data: {
      actorId:    session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole:  session.user.role,
      action:     AuditAction.PDF_WEBSITE_PROFILE_UPDATED,
      entityType: "WebsiteProfileBlock",
      entityId:   existing?.id ?? "new",
      newValues:  data,
    },
  });

  revalidatePath("/admin/pdf/profiles");
}

// ── Upsert Developer Profile ─────────────────────────────────────────────────────────

export async function upsertDeveloperProfile(formData: FormData) {
  const session = await requireAdmin("/admin/pdf/profiles");
  const existing = await prisma.developerProfileBlock.findFirst({ orderBy: { createdAt: "asc" } });

  const data = {
    fullName:     formData.get("fullName") as string,
    roleTitleAr:  (formData.get("roleTitleAr") as string) || null,
    shortBioAr:   (formData.get("shortBioAr") as string) || null,
    portfolioUrl: (formData.get("portfolioUrl") as string) || null,
    email:        (formData.get("email") as string) || null,
    phone:        (formData.get("phone") as string) || null,
    ctaTextAr:    (formData.get("ctaTextAr") as string) || null,
    isVisible: true,
  };

  if (existing) {
    await prisma.developerProfileBlock.update({ where: { id: existing.id }, data });
  } else {
    await prisma.developerProfileBlock.create({ data });
  }

  await prisma.auditLog.create({
    data: {
      actorId:    session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole:  session.user.role,
      action:     AuditAction.PDF_DEVELOPER_PROFILE_UPDATED,
      entityType: "DeveloperProfileBlock",
      entityId:   existing?.id ?? "new",
      newValues:  data,
    },
  });

  revalidatePath("/admin/pdf/profiles");
}
