import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const businessCardInclude = {
  category: true,
  phoneNumbers: { orderBy: { displayOrder: "asc" } },
  workingHours: true,
} satisfies Prisma.BusinessProfileInclude;

export type BusinessCardData = Prisma.BusinessProfileGetPayload<{
  include: typeof businessCardInclude;
}>;

export async function getActiveBusinesses(opts?: {
  categorySlug?: string;
  search?: string;
  limit?: number;
  orderBy?: "recent" | "rating";
}): Promise<BusinessCardData[]> {
  return prisma.businessProfile.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      ...(opts?.categorySlug
        ? { category: { slug: opts.categorySlug } }
        : {}),
      ...(opts?.search
        ? {
            OR: [
              { nameAr: { contains: opts.search, mode: "insensitive" } },
              { descriptionAr: { contains: opts.search, mode: "insensitive" } },
              { searchableText: { contains: opts.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: businessCardInclude,
    orderBy:
      opts?.orderBy === "rating"
        ? [{ ratingAverage: "desc" }, { ratingCount: "desc" }]
        : { publishedAt: "desc" },
    take: opts?.limit ?? 50,
  });
}

export async function getBusinessById(id: string) {
  return prisma.businessProfile.findFirst({
    where: { id, status: "ACTIVE", deletedAt: null },
    include: {
      category: true,
      city: true,
      owner: { select: { id: true, name: true } },
      phoneNumbers: { orderBy: { displayOrder: "asc" } },
      workingHours: { orderBy: { dayOfWeek: "asc" } },
      socialLinks: true,
      mediaFiles: {
        where: { status: "APPROVED" },
        orderBy: { displayOrder: "asc" },
      },
    },
  });
}

export async function getStats() {
  const [businessCount, categoryCount, cityCount] = await Promise.all([
    prisma.businessProfile.count({ where: { status: "ACTIVE", deletedAt: null } }),
    prisma.category.count({ where: { isActive: true } }),
    prisma.city.count({ where: { isActive: true } }),
  ]);
  return { businessCount, categoryCount, cityCount };
}

export async function getCategoriesWithCounts() {
  const cats = await prisma.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: { displayOrder: "asc" },
    include: {
      _count: {
        select: {
          listings: { where: { status: "ACTIVE", deletedAt: null } },
        },
      },
    },
  });
  return cats;
}
