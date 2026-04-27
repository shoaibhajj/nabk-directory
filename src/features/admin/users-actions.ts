"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import { recordAudit, type AuditActor } from "@/lib/audit";
import type { Role } from "@prisma/client";

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
