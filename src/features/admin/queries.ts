import type {
  BusinessStatus,
  CommentStatus,
  Prisma,
  Role,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

const ADMIN_PAGE_SIZE = 20;
const ADMIN_USERS_PAGE_SIZE = 30;

export async function getAdminUsers(
  filter: { role?: Role | "ALL"; q?: string; page?: number },
) {
  const page = Math.max(1, filter.page ?? 1);
  const skip = (page - 1) * ADMIN_USERS_PAGE_SIZE;
  const where: Prisma.UserWhereInput = { deletedAt: null };
  if (filter.role && filter.role !== "ALL") where.role = filter.role;
  if (filter.q && filter.q.trim()) {
    const q = filter.q.trim();
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ];
  }
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: ADMIN_USERS_PAGE_SIZE,
      skip,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        _count: { select: { businessProfiles: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total, page, pageSize: ADMIN_USERS_PAGE_SIZE };
}

export async function getAdminCategories() {
  const items = await prisma.category.findMany({
    orderBy: [{ parentId: "asc" }, { displayOrder: "asc" }, { nameAr: "asc" }],
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
      slug: true,
      icon: true,
      parentId: true,
      displayOrder: true,
      isActive: true,
      _count: { select: { listings: true, children: true } },
    },
  });
  return items;
}

export async function getAdminBusinesses(
  status: BusinessStatus | "ALL",
  page = 1,
) {
  const skip = (Math.max(1, page) - 1) * ADMIN_PAGE_SIZE;
  const where: Prisma.BusinessProfileWhereInput = { deletedAt: null };
  if (status !== "ALL") where.status = status;

  const [items, total] = await Promise.all([
    prisma.businessProfile.findMany({
      where,
      include: {
        category: { select: { id: true, nameAr: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: ADMIN_PAGE_SIZE,
      skip,
    }),
    prisma.businessProfile.count({ where }),
  ]);
  return { items, total, page, pageSize: ADMIN_PAGE_SIZE };
}

export async function getAdminBusinessCounts() {
  const rows = await prisma.businessProfile.groupBy({
    by: ["status"],
    where: { deletedAt: null },
    _count: { _all: true },
  });
  const counts: Record<BusinessStatus | "ALL", number> = {
    DRAFT: 0,
    PENDING: 0,
    ACTIVE: 0,
    SUSPENDED: 0,
    REJECTED: 0,
    ALL: 0,
  };
  for (const r of rows) {
    counts[r.status] = r._count._all;
    counts.ALL += r._count._all;
  }
  return counts;
}

export async function getAdminComments(
  status: CommentStatus | "ALL",
  page = 1,
) {
  const skip = (Math.max(1, page) - 1) * ADMIN_PAGE_SIZE;
  const where: Prisma.CommentWhereInput = { deletedAt: null };
  if (status !== "ALL") where.status = status;

  const [items, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        business_profiles: { select: { id: true, nameAr: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: ADMIN_PAGE_SIZE,
      skip,
    }),
    prisma.comment.count({ where }),
  ]);
  return { items, total, page, pageSize: ADMIN_PAGE_SIZE };
}

export async function getAdminCommentCounts() {
  const rows = await prisma.comment.groupBy({
    by: ["status"],
    where: { deletedAt: null },
    _count: { _all: true },
  });
  const counts: Record<CommentStatus | "ALL", number> = {
    VISIBLE: 0,
    PENDING_REVIEW: 0,
    HIDDEN_BY_ADMIN: 0,
    DELETED_BY_USER: 0,
    ALL: 0,
  };
  for (const r of rows) {
    counts[r.status] = r._count._all;
    counts.ALL += r._count._all;
  }
  return counts;
}

export async function getAuditLog(page = 1, pageSize = 50) {
  const safePage = Math.max(1, page);
  const skip = (safePage - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip,
    }),
    prisma.auditLog.count(),
  ]);
  return { items, total, page: safePage, pageSize };
}
