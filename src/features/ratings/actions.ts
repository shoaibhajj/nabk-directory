"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

const ratingSchema = z.object({
  businessId: z.string().min(1),
  score: z.number().int().min(1).max(5),
});

/**
 * Recalculates aggregate rating values for a business inside an interactive
 * transaction, locking the BusinessProfile row first so concurrent rating
 * writes serialize on the same row and the aggregates can never end up stale.
 */
async function recalcInTx(
  tx: Prisma.TransactionClient,
  businessProfileId: string,
) {
  await tx.$queryRaw`SELECT id FROM business_profiles WHERE id = ${businessProfileId} FOR UPDATE`;
  const agg = await tx.rating.aggregate({
    where: { businessProfileId },
    _avg: { score: true },
    _count: { score: true },
  });
  await tx.businessProfile.update({
    where: { id: businessProfileId },
    data: {
      ratingAverage: agg._avg.score ?? 0,
      ratingCount: agg._count.score ?? 0,
    },
  });
}

export async function submitRatingAction(
  input: z.infer<typeof ratingSchema>,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "يجب تسجيل الدخول لإضافة تقييم." };
  }

  const parsed = ratingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "تقييم غير صالح." };
  }

  const rl = await withRateLimit(`rating:${session.user.id}`, 20, 60 * 60 * 1000);
  if (!rl.ok) {
    return { ok: false, error: "تجاوزت الحد المسموح. حاول لاحقاً." };
  }

  const business = await prisma.businessProfile.findUnique({
    where: { id: parsed.data.businessId },
    select: { id: true, ownerId: true, status: true, deletedAt: true },
  });
  if (!business || business.deletedAt || business.status !== "ACTIVE") {
    return { ok: false, error: "العمل غير متاح." };
  }
  if (business.ownerId === session.user.id) {
    return { ok: false, error: "لا يمكنك تقييم عملك الخاص." };
  }

  let previousScore: number | null = null;
  try {
    previousScore = await prisma.$transaction(async (tx) => {
      const prior = await tx.rating.findUnique({
        where: {
          businessProfileId_userId: {
            businessProfileId: business.id,
            userId: session.user.id,
          },
        },
        select: { score: true },
      });
      await tx.rating.upsert({
        where: {
          businessProfileId_userId: {
            businessProfileId: business.id,
            userId: session.user.id,
          },
        },
        create: {
          businessProfileId: business.id,
          userId: session.user.id,
          score: parsed.data.score,
        },
        update: { score: parsed.data.score },
      });
      await recalcInTx(tx, business.id);
      return prior?.score ?? null;
    });
  } catch (e) {
    console.error("[submitRatingAction] tx failed", e);
    return { ok: false, error: "فشل حفظ التقييم. حاول مرة أخرى." };
  }

  await recordAudit({
    actor: {
      id: session.user.id,
      email: session.user.email ?? null,
      role: session.user.role ?? null,
    },
    action: "RATING_SUBMITTED",
    entityType: "Rating",
    entityId: business.id,
    before: previousScore !== null ? { score: previousScore } : undefined,
    after: { score: parsed.data.score },
  });

  revalidatePath(`/businesses/${business.id}`);
  return { ok: true };
}

export async function deleteOwnRatingAction(
  businessId: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "يجب تسجيل الدخول." };
  }

  const rl = await withRateLimit(
    `rating-delete:${session.user.id}`,
    20,
    60 * 60 * 1000,
  );
  if (!rl.ok) {
    return { ok: false, error: "تجاوزت الحد المسموح. حاول لاحقاً." };
  }

  const result = await prisma.$transaction(async (tx) => {
    const prior = await tx.rating.findUnique({
      where: {
        businessProfileId_userId: {
          businessProfileId: businessId,
          userId: session.user.id,
        },
      },
      select: { score: true },
    });
    const deleted = await tx.rating.deleteMany({
      where: { businessProfileId: businessId, userId: session.user.id },
    });
    if (deleted.count === 0) return { count: 0, score: null } as const;
    await recalcInTx(tx, businessId);
    return { count: deleted.count, score: prior?.score ?? null } as const;
  });

  if (result.count === 0) {
    return { ok: false, error: "لم يتم العثور على تقييم لحذفه." };
  }

  await recordAudit({
    actor: {
      id: session.user.id,
      email: session.user.email ?? null,
      role: session.user.role ?? null,
    },
    action: "RATING_REMOVED_BY_USER",
    entityType: "Rating",
    entityId: businessId,
    before: result.score !== null ? { score: result.score } : undefined,
  });

  revalidatePath(`/businesses/${businessId}`);
  return { ok: true };
}

export async function adminDeleteRatingAction(
  ratingId: string,
): Promise<ActionResult> {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    return { ok: false, error: "غير مسموح." };
  }

  const rl = await withRateLimit(
    `admin-rating-delete:${session.user.id}`,
    60,
    60 * 60 * 1000,
  );
  if (!rl.ok) {
    return { ok: false, error: "تجاوزت الحد المسموح. حاول لاحقاً." };
  }

  const rating = await prisma.rating.findUnique({
    where: { id: ratingId },
    select: { id: true, businessProfileId: true, userId: true, score: true },
  });
  if (!rating) {
    return { ok: false, error: "التقييم غير موجود." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.rating.delete({ where: { id: ratingId } });
    await recalcInTx(tx, rating.businessProfileId);
  });
  await recordAudit({
    actor: {
      id: session.user.id,
      email: session.user.email ?? null,
      role: role ?? null,
    },
    action: "RATING_DELETED",
    entityType: "Rating",
    entityId: rating.id,
    before: { score: rating.score, userId: rating.userId },
  });

  revalidatePath(`/businesses/${rating.businessProfileId}`);
  return { ok: true };
}
