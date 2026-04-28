import { prisma } from "@/lib/prisma";
import {
  createNotification,
  nextCrossedMilestone,
} from "@/lib/notifications";

/**
 * Atomically increment a business's view count and, if that increment crossed
 * an engagement milestone (10/25/100/...), notify the owner exactly once per
 * milestone. The check uses a conditional update on `lastNotifiedViewMilestone`
 * so two concurrent requests racing past the same milestone can't both win
 * and create duplicate notifications.
 *
 * Failures here are silent — the page still renders even if the counter
 * write or notification fails.
 */
export async function trackBusinessView(businessId: string): Promise<void> {
  try {
    const updated = await prisma.businessProfile.update({
      where: { id: businessId },
      data: { viewCount: { increment: 1 } },
      select: {
        id: true,
        ownerId: true,
        nameAr: true,
        slug: true,
        viewCount: true,
        lastNotifiedViewMilestone: true,
      },
    });

    const milestone = nextCrossedMilestone(
      updated.viewCount,
      updated.lastNotifiedViewMilestone,
    );
    if (milestone === null) return;

    // Conditional update — only one racer can flip the milestone forward.
    const claim = await prisma.businessProfile.updateMany({
      where: {
        id: updated.id,
        lastNotifiedViewMilestone: updated.lastNotifiedViewMilestone,
      },
      data: { lastNotifiedViewMilestone: milestone },
    });
    if (claim.count === 0) return; // someone else already notified.

    await createNotification({
      userId: updated.ownerId,
      type: "VIEW_MILESTONE",
      titleAr: `وصل عملك إلى ${milestone.toLocaleString("ar-EG")} مشاهدة 🎉`,
      messageAr: `«${updated.nameAr}» تجاوز ${milestone.toLocaleString("ar-EG")} مشاهدة. استمر في تطوير صفحتك لجذب المزيد.`,
      relatedEntityType: "BusinessProfile",
      relatedEntityId: updated.id,
    });
  } catch (e) {
    console.error("[view-tracker] failed", e);
  }
}
