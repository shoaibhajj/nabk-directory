import { prisma } from "@/lib/prisma";

export type NotificationType =
  | "COMMENT_NEW"
  | "RATING_NEW"
  | "VIEW_MILESTONE"
  | "CONTACT_REPLY"
  | "LISTING_APPROVED"
  | "LISTING_REJECTED"
  | "LISTING_SUSPENDED"
  | "LISTING_RESTORED";

/**
 * Best-effort notification creator. Failures are swallowed — a failure to
 * notify must never abort the originating user action (e.g. losing a comment
 * because we couldn't insert a notification row would be unacceptable). The
 * caller is the source of truth; notifications are a courtesy.
 */
export async function createNotification(opts: {
  userId: string;
  type: NotificationType;
  titleAr: string;
  messageAr: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
}) {
  try {
    await prisma.notification.create({
      data: {
        userId: opts.userId,
        type: opts.type,
        titleAr: opts.titleAr,
        messageAr: opts.messageAr,
        relatedEntityType: opts.relatedEntityType ?? null,
        relatedEntityId: opts.relatedEntityId ?? null,
      },
    });
  } catch (e) {
    console.error("[notifications] create failed", e);
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

export async function listNotifications(
  userId: string,
  opts: { limit?: number; cursor?: string | null } = {},
) {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });
}

/**
 * Engagement milestones for the business view counter. Spaced so an owner
 * gets meaningful pings ("you crossed 100 views!") without being spammed by
 * every single new viewer. The order matters — `nextMilestone()` walks the
 * array left→right and picks the first one greater than the previous high.
 */
export const VIEW_MILESTONES = [
  10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000,
] as const;

/**
 * Returns the highest milestone reached by `currentCount` that is strictly
 * greater than `lastNotified`, or `null` if no new milestone was crossed.
 * Crossing several milestones in one jump (e.g. 0 → 600) collapses to the
 * single highest crossed milestone (500) — we don't spam multiple at once.
 */
export function nextCrossedMilestone(
  currentCount: number,
  lastNotified: number,
): number | null {
  let crossed: number | null = null;
  for (const m of VIEW_MILESTONES) {
    if (m <= lastNotified) continue;
    if (currentCount >= m) crossed = m;
    else break;
  }
  return crossed;
}
