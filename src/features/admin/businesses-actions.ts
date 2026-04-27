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

export type ActionResult = { ok: true } | { ok: false; error: string };

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

  // Atomic transition: DRAFT -> ACTIVE only. The conditional `where` clause
  // guarantees that two concurrent admin actions cannot both succeed —
  // exactly one updateMany will report count===1 and the other will be 0.
  // Approving an already-published or suspended listing is rejected so the
  // state machine stays explicit (suspended needs adminRestoreBusinessAction).
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

  // Reject (DRAFT->SUSPENDED) and suspend (ACTIVE->SUSPENDED) share this
  // action; we map to LISTING_REJECTED vs LISTING_SUSPENDED by current state.
  // Both transitions are guarded by a conditional updateMany so two admins
  // hitting the button at once cannot both win, and an already-suspended
  // listing cannot be "double-suspended" with a new reason.
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

  // Restore: SUSPENDED -> ACTIVE, atomic on current status.
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
