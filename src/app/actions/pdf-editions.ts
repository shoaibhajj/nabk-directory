"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";
import { AuditAction } from "@prisma/client";

// ── Create Edition ────────────────────────────────────────────────────────────────

export async function createPdfEdition(formData: FormData) {
  const session = await requireAdmin("/admin/pdf/editions");

  const titleAr = formData.get("titleAr") as string;
  const slug = formData.get("slug") as string;
  const cityId = formData.get("cityId") as string;
  const pageSize = (formData.get("pageSize") as string) ?? "A4";
  const editionNumber = Number(formData.get("editionNumber") ?? 1);

  if (!titleAr?.trim() || !slug?.trim() || !cityId?.trim()) {
    throw new Error("حقول العنوان والمسار والمدينة مطلوبة");
  }

  const edition = await prisma.pdfEdition.create({
    data: {
      titleAr: titleAr.trim(),
      slug: slug.trim(),
      cityId,
      pageSize,
      editionNumber,
      status: "DRAFT",
      generationMode: "ALL_ACTIVE",
      coverTitleAr: formData.get("coverTitleAr") as string | null,
      coverSubtitleAr: formData.get("coverSubtitleAr") as string | null,
      introTextAr: formData.get("introTextAr") as string | null,
      closingTextAr: formData.get("closingTextAr") as string | null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole: session.user.role,
      action: AuditAction.PDF_EDITION_CREATED,
      entityType: "PdfEdition",
      entityId: edition.id,
      newValues: { titleAr, slug, cityId },
    },
  });

  revalidatePath("/admin/pdf/editions");
  redirect(`/admin/pdf/editions/${edition.id}`);
}

// ── Update Edition ────────────────────────────────────────────────────────────────

export async function updatePdfEdition(editionId: string, formData: FormData) {
  const session = await requireAdmin(`/admin/pdf/editions/${editionId}/edit`);

  const data: Record<string, unknown> = {
    titleAr: formData.get("titleAr"),
    coverTitleAr: formData.get("coverTitleAr") || null,
    coverSubtitleAr: formData.get("coverSubtitleAr") || null,
    introTextAr: formData.get("introTextAr") || null,
    editorialTextAr: formData.get("editorialTextAr") || null,
    closingTextAr: formData.get("closingTextAr") || null,
    pageSize: formData.get("pageSize"),
    editionNumber: Number(formData.get("editionNumber")),
    includeQrCodes: formData.get("includeQrCodes") === "on",
    includeBusinessLogos: formData.get("includeBusinessLogos") === "on",
    includeAlphabeticalIndex: formData.get("includeAlphabeticalIndex") === "on",
    includeWebsiteProfile: formData.get("includeWebsiteProfile") === "on",
    includeDeveloperProfile: formData.get("includeDeveloperProfile") === "on",
    showEditionMetadata: formData.get("showEditionMetadata") === "on",
  };

  await prisma.pdfEdition.update({ where: { id: editionId }, data });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole: session.user.role,
      action: AuditAction.PDF_EDITION_UPDATED,
      entityType: "PdfEdition",
      entityId: editionId,
      newValues: data,
    },
  });

  revalidatePath(`/admin/pdf/editions/${editionId}`);
  revalidatePath("/admin/pdf/editions");
  redirect(`/admin/pdf/editions/${editionId}`);
}

// ── Publish / Archive ─────────────────────────────────────────────────────────────

export async function setEditionStatus(
  editionId: string,
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
) {
  const session = await requireAdmin("/admin/pdf/editions");

  await prisma.pdfEdition.update({ where: { id: editionId }, data: { status } });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole: session.user.role,
      action: AuditAction.PDF_EDITION_STATUS_CHANGED,
      entityType: "PdfEdition",
      entityId: editionId,
      newValues: { status },
    },
  });

  revalidatePath(`/admin/pdf/editions/${editionId}`);
  revalidatePath("/admin/pdf/editions");
}

// ── Create Ad ─────────────────────────────────────────────────────────────────────

export async function createPdfAd(formData: FormData) {
  const session = await requireAdmin("/admin/pdf/ads");

  const ad = await prisma.pdfAd.create({
    data: {
      titleAr: formData.get("titleAr") as string,
      advertiserName: formData.get("advertiserName") as string,
      imageUrl: formData.get("imageUrl") as string,
      targetUrl: (formData.get("targetUrl") as string) || null,
      phone: (formData.get("phone") as string) || null,
      placementType:
        (formData.get("placementType") as "FULL_PAGE" | "HALF_PAGE" | "SIDEBAR") ??
        "FULL_PAGE",
      priority: Number(formData.get("priority") ?? 0),
      isActive: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole: session.user.role,
      action: AuditAction.PDF_AD_CREATED,
      entityType: "PdfAd",
      entityId: ad.id,
      newValues: { titleAr: ad.titleAr },
    },
  });

  revalidatePath("/admin/pdf/ads");
}

// ── Upsert Website Profile ────────────────────────────────────────────────────────

export async function upsertWebsiteProfile(formData: FormData) {
  const session = await requireAdmin("/admin/pdf/profiles");

  const existing = await prisma.websiteProfileBlock.findFirst({
    orderBy: { createdAt: "asc" },
  });

  const data = {
    titleAr: formData.get("titleAr") as string,
    shortTextAr: (formData.get("shortTextAr") as string) || null,
    bodyTextAr: (formData.get("bodyTextAr") as string) || null,
    websiteUrl: (formData.get("websiteUrl") as string) || null,
    supportEmail: (formData.get("supportEmail") as string) || null,
    supportPhone: (formData.get("supportPhone") as string) || null,
    ctaTextAr: (formData.get("ctaTextAr") as string) || null,
    isActive: true,
  };

  if (existing) {
    await prisma.websiteProfileBlock.update({ where: { id: existing.id }, data });
  } else {
    await prisma.websiteProfileBlock.create({ data });
  }

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole: session.user.role,
      action: AuditAction.WEBSITE_PROFILE_UPDATED,
      entityType: "WebsiteProfileBlock",
      entityId: existing?.id ?? "new",
      newValues: data,
    },
  });

  revalidatePath("/admin/pdf/profiles");
}

// ── Upsert Developer Profile ────────────────────────────────────────────────────────

export async function upsertDeveloperProfile(formData: FormData) {
  const session = await requireAdmin("/admin/pdf/profiles");

  const existing = await prisma.developerProfileBlock.findFirst({
    orderBy: { createdAt: "asc" },
  });

  const data = {
    fullName: formData.get("fullName") as string,
    roleTitleAr: (formData.get("roleTitleAr") as string) || null,
    shortBioAr: (formData.get("shortBioAr") as string) || null,
    portfolioUrl: (formData.get("portfolioUrl") as string) || null,
    email: (formData.get("email") as string) || null,
    phone: (formData.get("phone") as string) || null,
    ctaTextAr: (formData.get("ctaTextAr") as string) || null,
    isVisible: true,
  };

  if (existing) {
    await prisma.developerProfileBlock.update({ where: { id: existing.id }, data });
  } else {
    await prisma.developerProfileBlock.create({ data });
  }

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole: session.user.role,
      action: AuditAction.DEVELOPER_PROFILE_UPDATED,
      entityType: "DeveloperProfileBlock",
      entityId: existing?.id ?? "new",
      newValues: data,
    },
  });

  revalidatePath("/admin/pdf/profiles");
}
