"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { VerificationStatus } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";

// ─── إعداد Cloudinary ───────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ─── نوع النتيجة الموحّد ────────────────────────────────────────────────────
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// ─── magic bytes للتحقق من نوع الملف الحقيقي ────────────────────────────────
const IMAGE_SIGNATURES: { mime: string; bytes: number[] }[] = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png",  bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF....WEBP
];

function detectMimeFromBytes(buffer: Buffer): string | null {
  for (const sig of IMAGE_SIGNATURES) {
    if (sig.bytes.every((b, i) => buffer[i] === b)) return sig.mime;
  }
  return null;
}

// ─── 0. رفع صورة التوثيق (صاحب النشاط) ─────────────────────────────────────
export async function uploadVerificationImageAction(
  businessProfileId: string,
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "غير مصرح" };

  // تحقق أن النشاط ملك للمستخدم الحالي
  const profile = await prisma.businessProfile.findUnique({
    where: { id: businessProfileId },
    select: { ownerId: true },
  });
  if (!profile) return { success: false, error: "النشاط غير موجود" };
  if (profile.ownerId !== session.user.id)
    return { success: false, error: "غير مصرح" };

  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, error: "لم يتم تحديد ملف" };

  // حجم أقصى 5MB
  if (file.size > 5 * 1024 * 1024)
    return { success: false, error: "حجم الملف يتجاوز 5MB" };

  // MIME type مسموح
  const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedMimes.includes(file.type))
    return { success: false, error: "نوع الملف غير مسموح — يُقبل jpg/png/webp فقط" };

  // التحقق من magic bytes
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const detectedMime = detectMimeFromBytes(buffer);
  if (!detectedMime)
    return { success: false, error: "الملف لا يبدو صورة حقيقية" };
  // webp: تحقق إضافي من bytes 8-11 = 'WEBP'
  if (detectedMime === "image/webp") {
    const riffMark = buffer.slice(8, 12).toString("ascii");
    if (riffMark !== "WEBP")
      return { success: false, error: "الملف لا يبدو صورة حقيقية" };
  }

  // رفع لـ Cloudinary داخل مجلد nabk/verification/
  const uploadResult = await new Promise<{ secure_url: string }>(
    (resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "nabk/verification",
          resource_type: "image",
          allowed_formats: ["jpg", "jpeg", "png", "webp"],
          transformation: [{ quality: "auto", fetch_format: "auto" }],
        },
        (error, result) => {
          if (error || !result) reject(error ?? new Error("Upload failed"));
          else resolve(result as { secure_url: string });
        }
      );
      stream.end(buffer);
    }
  );

  return { success: true, data: { url: uploadResult.secure_url } };
}

// ─── 1. طلب التوثيق (صاحب النشاط) ──────────────────────────────────────────
export async function requestVerification(
  businessProfileId: string,
  opts?: { idImageUrl?: string; contactPhone?: string }
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "غير مصرح" };

  // تحقق أن النشاط ملك للمستخدم الحالي
  const profile = await prisma.businessProfile.findUnique({
    where: { id: businessProfileId },
    select: { ownerId: true, verificationStatus: true },
  });

  if (!profile) return { success: false, error: "النشاط غير موجود" };
  if (profile.ownerId !== session.user.id)
    return { success: false, error: "غير مصرح" };

  // لا يُسمح بطلب جديد إذا كان موثّقاً أو لديه طلب معلّق
  if (profile.verificationStatus === VerificationStatus.VERIFIED)
    return { success: false, error: "النشاط موثّق بالفعل" };

  const existingPending = await prisma.verificationRequest.findFirst({
    where: { businessProfileId, status: VerificationStatus.PENDING },
  });
  if (existingPending)
    return { success: false, error: "لديك طلب توثيق قيد المراجعة بالفعل" };

  await prisma.$transaction(async (tx) => {
    // أنشئ طلب التوثيق
    await tx.verificationRequest.create({
      data: {
        businessProfileId,
        requestedById: session.user!.id!,
        idImageUrl: opts?.idImageUrl ?? null,
        contactPhone: opts?.contactPhone ?? null,
        status: VerificationStatus.PENDING,
        updatedAt: new Date(),
      },
    });

    // حدّث حالة التوثيق على النشاط
    await tx.businessProfile.update({
      where: { id: businessProfileId },
      data: { verificationStatus: VerificationStatus.PENDING },
    });

    // سجّل في audit
    await tx.auditLog.create({
      data: {
        actorId: session.user!.id,
        actorEmail: session.user!.email ?? undefined,
        action: "BUSINESS_VERIFICATION_REQUESTED",
        entityType: "BusinessProfile",
        entityId: businessProfileId,
      },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/businesses/${businessProfileId}`);
  return { success: true };
}

// ─── 2. قبول الطلب (الإدارة) ───────────────────────────────────────────────
export async function approveVerification(
  requestId: string,
  adminNote?: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "غير مصرح" };
  if (!(["ADMIN", "SUPER_ADMIN"] as string[]).includes(session.user.role ?? ""))
    return { success: false, error: "صلاحيات الإدارة مطلوبة" };

  const request = await prisma.verificationRequest.findUnique({
    where: { id: requestId },
    include: {
      business: { select: { ownerId: true, nameAr: true } },
    },
  });

  if (!request) return { success: false, error: "الطلب غير موجود" };
  if (request.status !== VerificationStatus.PENDING)
    return { success: false, error: "الطلب ليس في حالة انتظار" };

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // حدّث الطلب
    await tx.verificationRequest.update({
      where: { id: requestId },
      data: {
        status: VerificationStatus.VERIFIED,
        adminNote: adminNote ?? null,
        reviewedById: session.user!.id,
        reviewedAt: now,
        updatedAt: now,
      },
    });

    // حدّث النشاط
    await tx.businessProfile.update({
      where: { id: request.businessProfileId },
      data: {
        verificationStatus: VerificationStatus.VERIFIED,
        verifiedAt: now,
        verifiedById: session.user!.id,
      },
    });

    // إشعار لصاحب النشاط
    await tx.notification.create({
      data: {
        userId: request.business.ownerId,
        type: "VERIFICATION_APPROVED",
        titleAr: "تمت الموافقة على طلب التوثيق ✅",
        messageAr: `تهانينا! نشاطك "${request.business.nameAr}" تم توثيقه بنجاح.`,
        relatedEntityType: "BusinessProfile",
        relatedEntityId: request.businessProfileId,
      },
    });

    // audit
    await tx.auditLog.create({
      data: {
        actorId: session.user!.id,
        actorEmail: session.user!.email ?? undefined,
        action: "BUSINESS_VERIFICATION_APPROVED",
        entityType: "BusinessProfile",
        entityId: request.businessProfileId,
        newValues: { adminNote },
      },
    });
  });

  revalidatePath("/admin/verifications");
  revalidatePath(`/dashboard/businesses/${request.businessProfileId}`);
  return { success: true };
}

// ─── 3. رفض الطلب (الإدارة) ────────────────────────────────────────────────
export async function rejectVerification(
  requestId: string,
  reason: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "غير مصرح" };
  if (!(["ADMIN", "SUPER_ADMIN"] as string[]).includes(session.user.role ?? ""))
    return { success: false, error: "صلاحيات الإدارة مطلوبة" };
  if (!reason.trim())
    return { success: false, error: "يجب كتابة سبب الرفض" };

  const request = await prisma.verificationRequest.findUnique({
    where: { id: requestId },
    include: {
      business: { select: { ownerId: true, nameAr: true } },
    },
  });

  if (!request) return { success: false, error: "الطلب غير موجود" };
  if (request.status !== VerificationStatus.PENDING)
    return { success: false, error: "الطلب ليس في حالة انتظار" };

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.verificationRequest.update({
      where: { id: requestId },
      data: {
        status: VerificationStatus.REJECTED,
        adminNote: reason,
        reviewedById: session.user!.id,
        reviewedAt: now,
        updatedAt: now,
      },
    });

    await tx.businessProfile.update({
      where: { id: request.businessProfileId },
      data: { verificationStatus: VerificationStatus.REJECTED },
    });

    // إشعار الرفض مع السبب
    await tx.notification.create({
      data: {
        userId: request.business.ownerId,
        type: "VERIFICATION_REJECTED",
        titleAr: "تم رفض طلب التوثيق ❌",
        messageAr: `نشاطك "${request.business.nameAr}" — سبب الرفض: ${reason}`,
        relatedEntityType: "BusinessProfile",
        relatedEntityId: request.businessProfileId,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: session.user!.id,
        actorEmail: session.user!.email ?? undefined,
        action: "BUSINESS_VERIFICATION_REJECTED",
        entityType: "BusinessProfile",
        entityId: request.businessProfileId,
        newValues: { reason },
      },
    });
  });

  revalidatePath("/admin/verifications");
  revalidatePath(`/dashboard/businesses/${request.businessProfileId}`);
  return { success: true };
}

// ─── 4. جلب الطلبات المعلّقة (الإدارة) ─────────────────────────────────────
export async function getPendingVerifications() {
  return prisma.verificationRequest.findMany({
    where: { status: VerificationStatus.PENDING },
    include: {
      business: {
        select: {
          id: true,
          nameAr: true,
          slug: true,
          city: { select: { nameAr: true } },
          category: { select: { nameAr: true } },
        },
      },
      requestedBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

// ─── 5. جلب طلب التوثيق الأخير لنشاط معيّن (dashboard) ────────────────────
export async function getLatestVerificationRequest(businessProfileId: string) {
  return prisma.verificationRequest.findFirst({
    where: { businessProfileId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      adminNote: true,
      idImageUrl: true,
      contactPhone: true,
      createdAt: true,
      reviewedAt: true,
    },
  });
}
