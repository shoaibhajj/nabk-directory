"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

export type ActionResult = { ok: true } | { ok: false; error: string };

const NEW_ACCOUNT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const postCommentSchema = z.object({
  businessId: z.string().min(1),
  content: z.string().trim().min(1).max(500),
  parentId: z.string().min(1).optional(),
});

export async function postCommentAction(
  input: z.infer<typeof postCommentSchema>,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "يجب تسجيل الدخول لإضافة تعليق." };
  }

  const parsed = postCommentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "تعليق غير صالح. الحد الأقصى 500 حرف.",
    };
  }

  const rl = await withRateLimit(`comment:${session.user.id}`, 10, 60 * 60 * 1000);
  if (!rl.ok) {
    return { ok: false, error: "تجاوزت الحد المسموح. حاول لاحقاً." };
  }

  const [user, business] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, createdAt: true, role: true },
    }),
    prisma.businessProfile.findUnique({
      where: { id: parsed.data.businessId },
      select: {
        id: true,
        status: true,
        deletedAt: true,
        ownerId: true,
        nameAr: true,
      },
    }),
  ]);
  if (!user) return { ok: false, error: "غير مسموح." };
  if (!business || business.deletedAt || business.status !== "ACTIVE") {
    return { ok: false, error: "العمل غير متاح." };
  }

  if (parsed.data.parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parsed.data.parentId },
      select: {
        id: true,
        parentId: true,
        businessProfileId: true,
        status: true,
      },
    });
    if (
      !parent ||
      parent.businessProfileId !== business.id ||
      parent.parentId ||
      parent.status !== "VISIBLE"
    ) {
      return { ok: false, error: "لا يمكن الرد على هذا التعليق." };
    }
  }

  const isNewAccount =
    Date.now() - user.createdAt.getTime() < NEW_ACCOUNT_WINDOW_MS;
  const isPrivileged = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  const status = isPrivileged || !isNewAccount ? "VISIBLE" : "PENDING_REVIEW";

  const created = await prisma.comment.create({
    data: {
      businessProfileId: business.id,
      userId: user.id,
      content: parsed.data.content,
      parentId: parsed.data.parentId,
      status,
    },
    select: { id: true },
  });

  await recordAudit({
    actor: {
      id: session.user.id,
      email: session.user.email ?? null,
      role: session.user.role ?? null,
    },
    action: "COMMENT_POSTED",
    entityType: "Comment",
    entityId: created.id,
    after: {
      businessProfileId: business.id,
      parentId: parsed.data.parentId ?? null,
      status,
      contentLength: parsed.data.content.length,
    },
  });

  // Only ping the owner when the comment is actually visible to the public
  // (PENDING_REVIEW comments may never be approved, so a notification then
  // would be premature) and when they are not the commenter themselves.
  if (status === "VISIBLE" && business.ownerId !== user.id) {
    const preview =
      parsed.data.content.length > 90
        ? `${parsed.data.content.slice(0, 90)}…`
        : parsed.data.content;
    await createNotification({
      userId: business.ownerId,
      type: "COMMENT_NEW",
      titleAr: `تعليق جديد على «${business.nameAr}»`,
      messageAr: preview,
      relatedEntityType: "BusinessProfile",
      relatedEntityId: business.id,
    });
  }

  revalidatePath("/businesses/[slug]", "page");
  return { ok: true };
}

export async function deleteOwnCommentAction(
  commentId: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "يجب تسجيل الدخول." };
  }

  const rl = await withRateLimit(
    `comment-delete:${session.user.id}`,
    20,
    60 * 60 * 1000,
  );
  if (!rl.ok) {
    return { ok: false, error: "تجاوزت الحد المسموح. حاول لاحقاً." };
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, userId: true, businessProfileId: true },
  });
  if (!comment || comment.userId !== session.user.id) {
    return { ok: false, error: "غير مسموح." };
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: {
      status: "DELETED_BY_USER",
      deletedAt: new Date(),
      content: "",
    },
  });

  await recordAudit({
    actor: {
      id: session.user.id,
      email: session.user.email ?? null,
      role: session.user.role ?? null,
    },
    action: "COMMENT_REMOVED_BY_USER",
    entityType: "Comment",
    entityId: comment.id,
    before: { businessProfileId: comment.businessProfileId },
  });

  revalidatePath("/businesses/[slug]", "page");
  return { ok: true };
}

async function requireAdmin() {
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

export async function adminApproveCommentAction(
  commentId: string,
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: "غير مسموح." };

  const rl = await withRateLimit(
    `admin-comment-approve:${actor.id}`,
    120,
    60 * 60 * 1000,
  );
  if (!rl.ok) {
    return { ok: false, error: "تجاوزت الحد المسموح. حاول لاحقاً." };
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, status: true, businessProfileId: true },
  });
  if (!comment) return { ok: false, error: "التعليق غير موجود." };
  if (comment.status !== "PENDING_REVIEW") {
    return {
      ok: false,
      error: "لا يمكن اعتماد هذا التعليق (ليس قيد المراجعة).",
    };
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: { status: "VISIBLE", hiddenReason: null },
  });
  await recordAudit({
    actor,
    action: "COMMENT_APPROVED",
    entityType: "Comment",
    entityId: comment.id,
    before: { status: comment.status },
    after: { status: "VISIBLE" },
  });

  await notifyOwnerOnApprove(commentId);

  revalidatePath("/businesses/[slug]", "page");
  return { ok: true };
}

const hideSchema = z.object({
  commentId: z.string().min(1),
  reason: z.string().trim().min(1).max(200),
});

export async function adminHideCommentAction(
  input: z.infer<typeof hideSchema>,
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: "غير مسموح." };

  const rl = await withRateLimit(
    `admin-comment-hide:${actor.id}`,
    120,
    60 * 60 * 1000,
  );
  if (!rl.ok) {
    return { ok: false, error: "تجاوزت الحد المسموح. حاول لاحقاً." };
  }

  const parsed = hideSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات غير صالحة." };

  const comment = await prisma.comment.findUnique({
    where: { id: parsed.data.commentId },
    select: { id: true, status: true, businessProfileId: true },
  });
  if (!comment) return { ok: false, error: "التعليق غير موجود." };

  await prisma.comment.update({
    where: { id: parsed.data.commentId },
    data: {
      status: "HIDDEN_BY_ADMIN",
      hiddenReason: parsed.data.reason,
    },
  });
  await recordAudit({
    actor,
    action: "COMMENT_HIDDEN",
    entityType: "Comment",
    entityId: comment.id,
    before: { status: comment.status },
    after: { status: "HIDDEN_BY_ADMIN", hiddenReason: parsed.data.reason },
  });

  revalidatePath("/businesses/[slug]", "page");
  return { ok: true };
}

// Notify the business owner when an admin approves a previously-pending
// comment, since the original `postCommentAction` ping was suppressed at
// PENDING_REVIEW. We extend `adminApproveCommentAction` here rather than
// adding a second action so the audit log stays consistent.
async function notifyOwnerOnApprove(commentId: string) {
  const c = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      content: true,
      userId: true,
      business: {
        select: { id: true, ownerId: true, nameAr: true },
      },
    },
  });
  if (!c || !c.business) return;
  if (c.business.ownerId === c.userId) return;
  const preview =
    c.content.length > 90 ? `${c.content.slice(0, 90)}…` : c.content;
  await createNotification({
    userId: c.business.ownerId,
    type: "COMMENT_NEW",
    titleAr: `تعليق جديد على «${c.business.nameAr}»`,
    messageAr: preview,
    relatedEntityType: "BusinessProfile",
    relatedEntityId: c.business.id,
  });
}
