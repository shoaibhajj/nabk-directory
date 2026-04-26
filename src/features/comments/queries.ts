import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;

const commentInclude = {
  user: { select: { id: true, name: true, role: true, image: true } },
} satisfies Prisma.CommentInclude;

const commentWithRepliesInclude = {
  ...commentInclude,
  replies: {
    orderBy: { createdAt: "asc" },
    include: commentInclude,
  },
} satisfies Prisma.CommentInclude;

export type CommentWithUser = Prisma.CommentGetPayload<{
  include: typeof commentInclude;
}>;

export type CommentWithReplies = Prisma.CommentGetPayload<{
  include: typeof commentWithRepliesInclude;
}>;

export async function getCommentsForBusiness(
  businessId: string,
  viewerId: string | null,
  isAdmin: boolean,
  page = 1,
) {
  const skip = (Math.max(1, page) - 1) * PAGE_SIZE;

  // Visible comments are universal; pending comments are surfaced to admins
  // (everywhere) and to their author (their own only). The same rule applies
  // to top-level comments and to nested replies.
  const visibilityFilter: Array<Record<string, unknown>> = [{ status: "VISIBLE" }];
  if (isAdmin) {
    visibilityFilter.push({ status: "PENDING_REVIEW" });
  } else if (viewerId) {
    visibilityFilter.push({
      AND: [{ status: "PENDING_REVIEW" }, { userId: viewerId }],
    });
  }

  const where = {
    businessProfileId: businessId,
    parentId: null,
    OR: visibilityFilter,
  } as const;

  const [items, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        ...commentInclude,
        replies: {
          where: { OR: visibilityFilter },
          orderBy: { createdAt: "asc" },
          include: commentInclude,
        },
      },
    }),
    prisma.comment.count({ where }),
  ]);

  return {
    items,
    total,
    page: Math.max(1, page),
    pageSize: PAGE_SIZE,
    hasMore: skip + items.length < total,
  };
}

export type CommentsPage = Awaited<ReturnType<typeof getCommentsForBusiness>>;
