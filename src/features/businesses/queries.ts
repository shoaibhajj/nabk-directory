import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const businessCardInclude = {
  category: true,
  subcategory: true,
  phones: { orderBy: { displayOrder: "asc" } },
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

const businessDetailInclude = {
  category: true,
  subcategory: true,
  city: true,
  owner: { select: { id: true, name: true } },
  phones: { orderBy: { displayOrder: "asc" } },
  workingHours: { orderBy: { dayOfWeek: "asc" } },
  socialLinks: true,
  media_files: {
    where: { status: "APPROVED" },
    orderBy: { displayOrder: "asc" },
  },
} satisfies Prisma.BusinessProfileInclude;

export type BusinessDetail = Prisma.BusinessProfileGetPayload<{
  include: typeof businessDetailInclude;
}>;

export async function getBusinessById(id: string): Promise<BusinessDetail | null> {
  return prisma.businessProfile.findFirst({
    where: { id, status: "ACTIVE" },
    include: businessDetailInclude,
  });
}

export async function getBusinessBySlugOrId(
  slugOrId: string,
): Promise<{ business: BusinessDetail; matchedBy: "slug" | "id" } | null> {
  const bySlug = await prisma.businessProfile.findFirst({
    where: { slug: slugOrId, status: "ACTIVE" },
    include: businessDetailInclude,
  });
  if (bySlug) return { business: bySlug, matchedBy: "slug" };

  const byId = await prisma.businessProfile.findFirst({
    where: { id: slugOrId, status: "ACTIVE" },
    include: businessDetailInclude,
  });
  if (byId) return { business: byId, matchedBy: "id" };

  return null;
}

export async function getStats() {
  const [businessCount, categoryCount, cityCount] = await Promise.all([
    prisma.businessProfile.count({ where: { status: "ACTIVE" } }),
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
          listings: { where: { status: "ACTIVE" } },
        },
      },
    },
  });
  return cats;
}
