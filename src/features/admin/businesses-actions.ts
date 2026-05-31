"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import { recordAudit, type AuditActor } from "@/lib/audit";
import {
  sendEmail,
  listingApprovedHtml,
  listingRejectedHtml,
  listingSuspendedHtml,
} from "@/lib/email";
import type { VerificationStatus } from "@prisma/client";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type UploadResult =
  | { ok: true; url: string; publicId: string }
  | { ok: false; error: string };

async function requireAdmin(): Promise<AuditActor | null> {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    return null;
  }
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    role: role ?? null,
  };
}

async function notifyOwner(opts: {
  userId: string;
  type: string;
  titleAr: string;
  messageAr: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}) {
  await prisma.notification.create({
    data: {
      userId: opts.userId,
      type: opts.type,
      titleAr: opts.titleAr,
      messageAr: opts.messageAr,
      relatedEntityType: opts.relatedEntityType,
      relatedEntityId: opts.relatedEntityId,
    },
  });
}

const businessIdSchema = z.object({ businessId: z.string().min(1) });
const reasonSchema = z.object({
  businessId: z.string().min(1),
  reason: z.string().trim().min(3).max(500),
});

// ─── Verification moderation ────────────────────────────────────────────────

const verificationModerationSchema = z.object({
  businessId: z.string().min(1),
  newStatus: z.enum(["VERIFIED", "REJECTED", "UNVERIFIED"]),
  adminNote: z.string().trim().max(500).optional(),
});

export async function adminUpdateVerificationAction(
  input: z.infer<typeof verificationModerationSchema>,
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor || !actor.id) return { ok: false, error: "غير مسموح." };

  const rl = await withRateLimit(
    `admin-verification:${actor.id}`,
    60,
    60 * 60 * 1000,
  );
  if (!rl.ok) return { ok: false, error: "تجاوزت الحد المسموح." };

  const parsed = verificationModerationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات غير صالحة." };

  const { businessId, newStatus, adminNote } = parsed.data;

  const business = await prisma.businessProfile.findUnique({
    where: { id: businessId },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });
  if (!business || business.deletedAt) {
    return { ok: false, error: "العمل غير موجود." };
  }

  const previousStatus = business.verificationStatus;

  await prisma.$transaction(async (tx) => {
    // Update business verification status
    await tx.businessProfile.update({
      where: { id: businessId },
      data: {
        verificationStatus: newStatus as VerificationStatus,
        verifiedAt: newStatus === "VERIFIED" ? new Date() : null,
        verifiedById: newStatus === "VERIFIED" ? actor.id : null,
      },
    });

    // Update latest pending verification request if exists
    const latestRequest = await tx.verificationRequest.findFirst({
      where: { businessProfileId: businessId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
    if (latestRequest) {
      await tx.verificationRequest.update({
        where: { id: latestRequest.id },
        data: {
          status: newStatus as VerificationStatus,
          reviewedById: actor.id,
          reviewedAt: new Date(),
          adminNote: adminNote ?? null,
        },
      });
    }
  });

  const auditAction =
    newStatus === "VERIFIED"
      ? ("BUSINESS_VERIFICATION_APPROVED" as const)
      : ("BUSINESS_VERIFICATION_REJECTED" as const);

  await recordAudit({
    actor,
    action: auditAction,
    entityType: "BusinessProfile",
    entityId: businessId,
    before: { verificationStatus: previousStatus },
    after: { verificationStatus: newStatus, adminNote },
  });

  const notifTitle =
    newStatus === "VERIFIED"
      ? "تم توثيق عملك"
      : newStatus === "REJECTED"
        ? "تم رفض طلب التوثيق"
        : "تم إلغاء توثيق عملك";

  const notifMessage =
    newStatus === "VERIFIED"
      ? `تهانينا! تم توثيق «${business.nameAr}» رسمياً في الدليل.`
      : `«${business.nameAr}» — ${adminNote ?? "تم تغيير حالة التوثيق من قِبَل الإدارة."}` ;

  await notifyOwner({
    userId: business.owner.id,
    type: `VERIFICATION_${newStatus}`,
    titleAr: notifTitle,
    messageAr: notifMessage,
    relatedEntityType: "BusinessProfile",
    relatedEntityId: businessId,
  });

  revalidatePath("/admin/businesses");
  revalidatePath("/businesses/[slug]", "page");
  return { ok: true };
}

// ─── Cloudinary secure image upload (server-side validation) ────────────────
// Only images are accepted. Max 5 MB. Uploaded to a dedicated folder.
// The raw credentials never leave the server — the client only sends a FormData.

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function adminUploadVerificationImageAction(
  formData: FormData,
): Promise<UploadResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: "غير مسموح." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "لم يتم إرفاق ملف." };

  // ── Security checks ──────────────────────────────────────────────────
  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, error: "نوع الملف غير مسموح. يُقبل فقط: JPEG, PNG, WebP, GIF." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "حجم الصورة يتجاوز 5 ميغابايت." };
  }

  // ── Read first 8 bytes to validate magic numbers ─────────────────────
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer.slice(0, 8));
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
  const isWebp =
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[6] === 0x57 && bytes[7] === 0x45;
  const isGif = bytes[0] === 0x47 && bytes[1] === 0x49;
  if (!isJpeg && !isPng && !isWebp && !isGif) {
    return { ok: false, error: "الملف لا يبدو صورة حقيقية. قد يكون محتوى خبيثاً." };
  }

  // ── Upload to Cloudinary via REST API ────────────────────────────────
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return { ok: false, error: "إعدادات Cloudinary غير مكتملة." };
  }

  const timestamp = Math.round(Date.now() / 1000).toString();
  const folder = "nabk-verification";

  // Build signature: SHA-1("folder=nabk-verification&timestamp=..." + secret)
  const signaturePayload = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const msgBuffer = new TextEncoder().encode(signaturePayload);
  const hashBuffer = await crypto.subtle.digest("SHA-1", msgBuffer);
  const signature = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const uploadForm = new FormData();
  uploadForm.append("file", new Blob([buffer], { type: file.type }), file.name);
  uploadForm.append("api_key", apiKey);
  uploadForm.append("timestamp", timestamp);
  uploadForm.append("folder", folder);
  uploadForm.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: uploadForm },
  );

  if (!response.ok) {
    const err = await response.text();
    console.error("[Cloudinary upload error]", err);
    return { ok: false, error: "فشل رفع الصورة إلى Cloudinary." };
  }

  const data = (await response.json()) as { secure_url: string; public_id: string };
  return { ok: true, url: data.secure_url, publicId: data.public_id };
}

// ─── Existing business status actions (unchanged) ──────────────────────────

export async function adminApproveBusinessAction(
  input: z.infer<typeof businessIdSchema>,
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor || !actor.id) return { ok: false, error: "غير مسموح." };

  const rl = await withRateLimit(
    `admin-business-approve:${actor.id}`,
    120,
    60 * 60 * 1000,
  );
  if (!rl.ok) return { ok: false, error: "تجاوزت الحد المسموح." };

  const parsed = businessIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات غير صالحة." };

  const business = await prisma.businessProfile.findUnique({
    where: { id: parsed.data.businessId },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });
  if (!business || business.deletedAt) {
    return { ok: false, error: "العمل غير موجود." };
  }
  if (business.status !== "DRAFT") {
    return business.status === "ACTIVE"
      ? { ok: false, error: "العمل منشور بالفعل." }
      : { ok: false, error: "العمل موقوف — استخدم خيار الاستعادة." };
  }

  const updated = await prisma.businessProfile.updateMany({
    where: { id: business.id, status: "DRAFT", deletedAt: null },
    data: {
      status: "ACTIVE",
      publishedAt: business.publishedAt ?? new Date(),
      suspendedAt: null,
      suspensionReason: null,
    },
  });
  if (updated.count !== 1) {
    return { ok: false, error: "تغيّرت حالة العمل، حدّث الصفحة وأعد المحاولة." };
  }

  await recordAudit({
    actor,
    action: "LISTING_APPROVED",
    entityType: "BusinessProfile",
    entityId: business.id,
    before: { status: "DRAFT" },
    after: { status: "ACTIVE" },
  });

  await notifyOwner({
    userId: business.owner.id,
    type: "LISTING_APPROVED",
    titleAr: "تم اعتماد عملك",
    messageAr: `تم نشر «${business.nameAr}» في الدليل.`,
    relatedEntityType: "BusinessProfile",
    relatedEntityId: business.id,
  });

  if (business.owner.email) {
    const base = process.env.NEXTAUTH_URL ?? "";
    await sendEmail({
      to: business.owner.email,
      subject: "تم اعتماد عملك في دليل النبك",
      html: listingApprovedHtml(
        business.owner.name,
        business.nameAr,
        `${base}/businesses/${business.slug}`,
      ),
    });
  }

  revalidatePath("/admin/businesses");
  revalidatePath("/businesses/[slug]", "page");
  return { ok: true };
}

export async function adminRejectBusinessAction(
  input: z.infer<typeof reasonSchema>,
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor || !actor.id) return { ok: false, error: "غير مسموح." };

  const rl = await withRateLimit(
    `admin-business-reject:${actor.id}`,
    120,
    60 * 60 * 1000,
  );
  if (!rl.ok) return { ok: false, error: "تجاوزت الحد المسموح." };

  const parsed = reasonSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "السبب مطلوب (3-500 حرفاً)." };

  const business = await prisma.businessProfile.findUnique({
    where: { id: parsed.data.businessId },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });
  if (!business || business.deletedAt) {
    return { ok: false, error: "العمل غير موجود." };
  }
  if (business.status === "SUSPENDED") {
    return { ok: false, error: "العمل موقوف بالفعل." };
  }

  const previousStatus = business.status;
  const updated = await prisma.businessProfile.updateMany({
    where: {
      id: business.id,
      status: previousStatus,
      deletedAt: null,
    },
    data: {
      status: "SUSPENDED",
      suspendedAt: new Date(),
      suspensionReason: parsed.data.reason,
    },
  });
  if (updated.count !== 1) {
    return { ok: false, error: "تغيّرت حالة العمل، حدّث الصفحة وأعد المحاولة." };
  }

  await recordAudit({
    actor,
    action:
      previousStatus === "DRAFT" ? "LISTING_REJECTED" : "LISTING_SUSPENDED",
    entityType: "BusinessProfile",
    entityId: business.id,
    before: { status: previousStatus },
    after: { status: "SUSPENDED", reason: parsed.data.reason },
  });

  await notifyOwner({
    userId: business.owner.id,
    type: previousStatus === "DRAFT" ? "LISTING_REJECTED" : "LISTING_SUSPENDED",
    titleAr:
      previousStatus === "DRAFT" ? "لم يتم اعتماد عملك" : "تم إيقاف عرض عملك",
    messageAr: `«${business.nameAr}» — ${parsed.data.reason}`,
    relatedEntityType: "BusinessProfile",
    relatedEntityId: business.id,
  });

  if (business.owner.email) {
    const base = process.env.NEXTAUTH_URL ?? "";
    if (previousStatus === "DRAFT") {
      await sendEmail({
        to: business.owner.email,
        subject: "لم يتم اعتماد عملك في دليل النبك",
        html: listingRejectedHtml(
          business.owner.name,
          business.nameAr,
          parsed.data.reason,
          `${base}/dashboard`,
        ),
      });
    } else {
      await sendEmail({
        to: business.owner.email,
        subject: "تم إيقاف عرض عملك في دليل النبك",
        html: listingSuspendedHtml(
          business.owner.name,
          business.nameAr,
          parsed.data.reason,
        ),
      });
    }
  }

  revalidatePath("/admin/businesses");
  revalidatePath("/businesses/[slug]", "page");
  return { ok: true };
}

export async function adminRestoreBusinessAction(
  input: z.infer<typeof businessIdSchema>,
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor || !actor.id) return { ok: false, error: "غير مسموح." };

  const rl = await withRateLimit(
    `admin-business-restore:${actor.id}`,
    120,
    60 * 60 * 1000,
  );
  if (!rl.ok) return { ok: false, error: "تجاوزت الحد المسموح." };

  const parsed = businessIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات غير صالحة." };

  const business = await prisma.businessProfile.findUnique({
    where: { id: parsed.data.businessId },
    include: { owner: { select: { id: true } } },
  });
  if (!business || business.deletedAt) {
    return { ok: false, error: "العمل غير موجود." };
  }
  if (business.status !== "SUSPENDED") {
    return { ok: false, error: "العمل ليس موقوفاً." };
  }

  const previousReason = business.suspensionReason;
  const updated = await prisma.businessProfile.updateMany({
    where: { id: business.id, status: "SUSPENDED", deletedAt: null },
    data: {
      status: "ACTIVE",
      suspendedAt: null,
      suspensionReason: null,
      publishedAt: business.publishedAt ?? new Date(),
    },
  });
  if (updated.count !== 1) {
    return { ok: false, error: "تغيّرت حالة العمل، حدّث الصفحة وأعد المحاولة." };
  }

  await recordAudit({
    actor,
    action: "LISTING_RESTORED",
    entityType: "BusinessProfile",
    entityId: business.id,
    before: { status: "SUSPENDED", reason: previousReason },
    after: { status: "ACTIVE" },
  });

  await notifyOwner({
    userId: business.owner.id,
    type: "LISTING_RESTORED",
    titleAr: "تم استعادة عرض عملك",
    messageAr: `تم استعادة «${business.nameAr}» إلى الدليل.`,
    relatedEntityType: "BusinessProfile",
    relatedEntityId: business.id,
  });

  revalidatePath("/admin/businesses");
  revalidatePath("/businesses/[slug]", "page");
  return { ok: true };
}
