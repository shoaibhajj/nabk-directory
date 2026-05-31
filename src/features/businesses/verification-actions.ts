"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { VerificationStatus } from "@prisma/client";

// ─── نوع النتيجة الموحّد ────────────────────────────────────────────────────
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

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
