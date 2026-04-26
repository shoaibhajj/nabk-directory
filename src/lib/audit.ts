import { prisma } from "@/lib/prisma";
import type { AuditAction, Role } from "@prisma/client";

export interface AuditActor {
  id: string | null;
  email: string | null;
  role: Role | null;
}

export async function recordAudit(opts: {
  actor: AuditActor;
  action: AuditAction;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: opts.actor.id,
        actorEmail: opts.actor.email,
        actorRole: opts.actor.role,
        action: opts.action,
        entityType: opts.entityType,
        entityId: opts.entityId,
        previousValues: opts.before ? (opts.before as object) : undefined,
        newValues: opts.after ? (opts.after as object) : undefined,
        ipAddress: opts.ipAddress,
      },
    });
  } catch (e) {
    console.error("[audit] failed to record", e);
  }
}
