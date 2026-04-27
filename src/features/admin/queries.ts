import type { BusinessStatus, CommentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const ADMIN_PAGE_SIZE = 20;

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
        business: { select: { id: true, nameAr: true } },
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
