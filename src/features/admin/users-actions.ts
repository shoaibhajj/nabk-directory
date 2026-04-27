"use server";

import { z } from "zod";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import { recordAudit, type AuditActor } from "@/lib/audit";
import {
  sendEmail,
  verifyEmailHtml,
  emailVerifiedByAdminHtml,
} from "@/lib/email";
import { getAppUrl } from "@/lib/utils";
import type { Role } from "@prisma/client";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Both ADMIN and SUPER_ADMIN can manually verify users and resend
 * verification links — these are recovery actions, not privilege changes,
 * so the broader admin role is appropriate. Role mutations stay
 * SUPER_ADMIN-only above.
 */
async function requireAdmin(): Promise<AuditActor | null> {
  const session = await auth();
  const role = session?.user?.role;
  if (
    !session?.user?.id ||
    (role !== "ADMIN" && role !== "SUPER_ADMIN")
  ) {
    return null;
  }
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    role: role ?? null,
  };
}

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Role changes are scoped to SUPER_ADMIN only. ADMIN can moderate listings
 * and comments but cannot promote peers — this keeps the privilege ladder
 * one-way and audit-traceable.
 */
async function requireSuperAdmin(): Promise<AuditActor | null> {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || role !== "SUPER_ADMIN") return null;
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    role: role ?? null,
  };
}

const ASSIGNABLE_ROLES = ["BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"] as const;

const changeRoleSchema = z.object({
  userId: z.string().min(1),
  newRole: z.enum(ASSIGNABLE_ROLES),
});

export async function adminChangeUserRoleAction(
  input: z.infer<typeof changeRoleSchema>,
): Promise<ActionResult> {
  const actor = await requireSuperAdmin();
  if (!actor || !actor.id) return { ok: false, error: "غير مسموح." };

  const rl = await withRateLimit(
    `admin-user-role:${actor.id}`,
    60,
    60 * 60 * 1000,
  );
  if (!rl.ok) return { ok: false, error: "تجاوزت الحد المسموح." };

  const parsed = changeRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات غير صالحة." };

  // A SUPER_ADMIN cannot demote themselves: a single admin demoting their own
  // account could lock the platform out of further administration if they
  // were the only super admin remaining.
  if (parsed.data.userId === actor.id) {
    return { ok: false, error: "لا يمكنك تغيير صلاحياتك بنفسك." };
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, role: true, email: true, deletedAt: true },
  });
  if (!target || target.deletedAt) {
    return { ok: false, error: "المستخدم غير موجود." };
  }
  if (target.role === parsed.data.newRole) {
    return { ok: false, error: "هذا الدور مُعَيَّن مسبقاً." };
  }

  // Refuse to demote the *last* SUPER_ADMIN. The count + update must run
  // inside a serializable transaction so two concurrent demotions cannot
  // both observe `remaining === 1` and then both succeed, which would leave
  // the platform with zero super-admins. SERIALIZABLE makes the conflicting
  // transaction roll back on commit.
  const previousRole = target.role;
  try {
    await prisma.$transaction(
      async (tx) => {
        if (target.role === "SUPER_ADMIN" && parsed.data.newRole !== "SUPER_ADMIN") {
          const remaining = await tx.user.count({
            where: {
              role: "SUPER_ADMIN",
              deletedAt: null,
              id: { not: target.id },
            },
          });
          if (remaining === 0) {
            throw new Error("LAST_SUPER_ADMIN");
          }
        }
        await tx.user.update({
          where: { id: target.id },
          data: { role: parsed.data.newRole as Role },
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (e) {
    if (e instanceof Error && e.message === "LAST_SUPER_ADMIN") {
      return {
        ok: false,
        error: "لا يمكن تنزيل آخر مسؤول أعلى — رقّ مستخدماً آخر أولاً.",
      };
    }
    return { ok: false, error: "تعذّر حفظ التغيير، حاول مجدداً." };
  }

  await recordAudit({
    actor,
    action: "USER_ROLE_CHANGED",
    entityType: "User",
    entityId: target.id,
    before: { role: previousRole, email: target.email },
    after: { role: parsed.data.newRole, email: target.email },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

const userIdSchema = z.object({ userId: z.string().min(1) });

/**
 * Admin escape hatch when a user's verification email never arrives
 * (bounced, blocked, in spam, etc). Marks the email as verified without
 * touching the password, invalidates any pending verification tokens, and
 * sends a courtesy email so the user knows.
 */
export async function adminVerifyUserEmailAction(
  input: z.infer<typeof userIdSchema>,
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor || !actor.id) return { ok: false, error: "غير مسموح." };

  const rl = await withRateLimit(
    `admin-verify-user:${actor.id}`,
    60,
    60 * 60 * 1000,
  );
  if (!rl.ok) return { ok: false, error: "تجاوزت الحد المسموح." };

  const parsed = userIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات غير صالحة." };

  // Self-verify is forbidden: an admin tricking themselves into bypassing the
  // email verification flow on their own account would defeat the audit
  // intent (the action is meant to be a *recovery* tool for *other* users).
  if (parsed.data.userId === actor.id) {
    return { ok: false, error: "لا يمكنك تفعيل بريدك بنفسك." };
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, email: true, name: true, emailVerified: true, deletedAt: true },
  });
  if (!target || target.deletedAt) {
    return { ok: false, error: "المستخدم غير موجود." };
  }
  if (target.emailVerified) {
    return { ok: false, error: "البريد مفعَّل مسبقاً." };
  }

  // Burn any outstanding verification tokens — the user shouldn't be able to
  // "re-verify" via an old email link after we did it for them.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: target.id },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerificationToken.updateMany({
      where: { userId: target.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  await recordAudit({
    actor,
    action: "USER_EMAIL_VERIFIED_BY_ADMIN",
    entityType: "User",
    entityId: target.id,
    before: { emailVerified: null, email: target.email },
    after: { emailVerified: new Date(), email: target.email },
  });

  // Best-effort notification — failure here doesn't undo the verification.
  await sendEmail({
    to: target.email,
    subject: "تم تفعيل حسابك — دليل النبك",
    html: emailVerifiedByAdminHtml(target.name, getAppUrl()),
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

/**
 * Re-issues a verification email for users who lost or never received the
 * original. Generates a fresh token (so the link in the new email is the
 * one that works) and leaves the user record untouched.
 */
export async function adminResendVerificationEmailAction(
  input: z.infer<typeof userIdSchema>,
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor || !actor.id) return { ok: false, error: "غير مسموح." };

  const rl = await withRateLimit(
    `admin-resend-verify:${actor.id}`,
    60,
    60 * 60 * 1000,
  );
  if (!rl.ok) return { ok: false, error: "تجاوزت الحد المسموح." };

  const parsed = userIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات غير صالحة." };

  // Same rationale as adminVerifyUserEmailAction — admins use the regular
  // sign-in / verification flow on their own account.
  if (parsed.data.userId === actor.id) {
    return { ok: false, error: "لا يمكنك إعادة الإرسال لبريدك بنفسك." };
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, email: true, name: true, emailVerified: true, deletedAt: true },
  });
  if (!target || target.deletedAt) {
    return { ok: false, error: "المستخدم غير موجود." };
  }
  if (target.emailVerified) {
    return { ok: false, error: "البريد مفعَّل مسبقاً." };
  }

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.emailVerificationToken.create({
    data: {
      userId: target.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  const link = `${getAppUrl()}/verify-email?token=${token}`;
  const sent = await sendEmail({
    to: target.email,
    subject: "تأكيد البريد الإلكتروني — دليل النبك",
    html: verifyEmailHtml(target.name, link),
  });
  if (!sent.ok) {
    return { ok: false, error: "تعذّر إرسال البريد، حاول مجدداً." };
  }

  await recordAudit({
    actor,
    action: "USER_VERIFICATION_RESENT",
    entityType: "User",
    entityId: target.id,
  });

  revalidatePath("/admin/users");
  return { ok: true };
}
