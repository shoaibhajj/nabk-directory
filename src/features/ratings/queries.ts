import { prisma } from "@/lib/prisma";

export async function getMyRating(businessId: string, userId: string | null) {
  if (!userId) return null;
  return prisma.rating.findUnique({
    where: {
      businessProfileId_userId: {
        businessProfileId: businessId,
        userId,
      },
    },
    select: { score: true, updatedAt: true },
  });
}

export async function getRatingDistribution(businessId: string) {
  const grouped = await prisma.rating.groupBy({
    by: ["score"],
    where: { businessProfileId: businessId },
    _count: { score: true },
  });
  const buckets: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  for (const row of grouped) {
    const k = row.score as 1 | 2 | 3 | 4 | 5;
    if (k >= 1 && k <= 5) buckets[k] = row._count.score;
  }
  const total = Object.values(buckets).reduce((a, b) => a + b, 0);
  return { buckets, total };
}
