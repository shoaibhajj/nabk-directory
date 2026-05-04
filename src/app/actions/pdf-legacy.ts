"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import {
  PdfLegacyOpenMode,
  PdfLegacySourceType,
  AuditAction,
} from "@prisma/client";
import { z } from "zod";

// ─── Validation schema ───────────────────────────────────────────────────────

const upsertSchema = z.object({
  id: z.string().optional(),
  titleAr: z.string().min(2, "العنوان مطلوب"),
  titleEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  sourceType: z.nativeEnum(PdfLegacySourceType),
  fileUrl: z.string().url("رابط الملف غير صحيح").optional().or(z.literal("")),
  externalUrl: z
    .string()
    .url("الرابط الخارجي غير صحيح")
    .optional()
    .or(z.literal("")),
  coverImageUrl: z
    .string()
    .url("رابط صورة الغلاف غير صحيح")
    .optional()
    .or(z.literal("")),
  buttonLabelAr: z.string().default("الدليل القديم"),
  buttonLabelEn: z.string().optional(),
  openMode: z.nativeEnum(PdfLegacyOpenMode),
});

export type UpsertLegacyPdfInput = z.infer<typeof upsertSchema>;

// ─── Public read (used by hero button) ───────────────────────────────────────

/**
 * Returns the single published legacy PDF record, or null.
 * Called by the public hero section — no auth required.
 */
export async function getPublishedLegacyPdf() {
  return prisma.pdfLegacyFile.findFirst({
    where: { isPublished: true },
    select: {
      id: true,
      titleAr: true,
      titleEn: true,
      descriptionAr: true,
      buttonLabelAr: true,
      buttonLabelEn: true,
      openMode: true,
      fileUrl: true,
      externalUrl: true,
      coverImageUrl: true,
      sourceType: true,
    },
  });
}

// ─── Admin reads ─────────────────────────────────────────────────────────────

/** Returns ALL legacy PDF records ordered newest first (admin only). */
export async function getLegacyPdfList() {
  await requireAdmin();
  return prisma.pdfLegacyFile.findMany({
    orderBy: { createdAt: "desc" },
  });
}

/** Returns a single record by id (admin only). */
export async function getLegacyPdfById(id: string) {
  await requireAdmin();
  return prisma.pdfLegacyFile.findUnique({ where: { id } });
}

// ─── Upsert ──────────────────────────────────────────────────────────────────

/**
 * Creates or updates a legacy PDF record.
 * Does NOT change the isPublished flag — use toggleLegacyPdfPublish for that.
 */
export async function upsertLegacyPdf(raw: UpsertLegacyPdfInput) {
  const session = await requireAdmin();
  const data = upsertSchema.parse(raw);

  const payload = {
    titleAr: data.titleAr,
    titleEn: data.titleEn ?? null,
    descriptionAr: data.descriptionAr ?? null,
    descriptionEn: data.descriptionEn ?? null,
    sourceType: data.sourceType,
    fileUrl: data.sourceType === "FILE" ? (data.fileUrl ?? null) : null,
    externalUrl:
      data.sourceType === "EXTERNAL_URL" ? (data.externalUrl ?? null) : null,
    coverImageUrl: data.coverImageUrl ?? null,
    buttonLabelAr: data.buttonLabelAr,
    buttonLabelEn: data.buttonLabelEn ?? null,
    openMode: data.openMode,
  };

  const record = data.id
    ? await prisma.pdfLegacyFile.update({ where: { id: data.id }, data: payload })
    : await prisma.pdfLegacyFile.create({ data: payload });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole: session.user.role,
      action: AuditAction.PDF_LEGACY_UPDATED,
      entityType: "PdfLegacyFile",
      entityId: record.id,
    },
  });

  revalidatePath("/admin/pdf/legacy");
  revalidatePath("/");
  return { success: true, id: record.id };
}

// ─── Publish / Unpublish ─────────────────────────────────────────────────────

/**
 * Toggles publication of a legacy PDF.
 * Enforces the single-published constraint:
 * when publishing record X, all other records are unpublished first.
 */
export async function toggleLegacyPdfPublish(
  id: string,
  publish: boolean
) {
  const session = await requireAdmin();

  await prisma.$transaction(async (tx) => {
    if (publish) {
      await tx.pdfLegacyFile.updateMany({
        where: { id: { not: id } },
        data: { isPublished: false, publishedAt: null },
      });
    }
    await tx.pdfLegacyFile.update({
      where: { id },
      data: {
        isPublished: publish,
        publishedAt: publish ? new Date() : null,
      },
    });
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole: session.user.role,
      action: publish
        ? AuditAction.PDF_LEGACY_PUBLISHED
        : AuditAction.PDF_LEGACY_UNPUBLISHED,
      entityType: "PdfLegacyFile",
      entityId: id,
    },
  });

  revalidatePath("/admin/pdf/legacy");
  revalidatePath("/");
  return { success: true };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/** Hard-deletes a legacy PDF record (cannot delete a published one). */
export async function deleteLegacyPdf(id: string) {
  const session = await requireAdmin();

  const record = await prisma.pdfLegacyFile.findUnique({ where: { id } });
  if (!record) throw new Error("السجل غير موجود");
  if (record.isPublished)
    throw new Error("لا يمكن حذف سجل منشور — أوقف نشره أولاً");

  await prisma.pdfLegacyFile.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole: session.user.role,
      action: AuditAction.PDF_LEGACY_UPDATED,
      entityType: "PdfLegacyFile",
      entityId: id,
      newValues: { deleted: true },
    },
  });

  revalidatePath("/admin/pdf/legacy");
  return { success: true };
}
