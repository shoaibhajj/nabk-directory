import Link from "next/link";
import type { CommentStatus } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CommentModerationActions } from "@/components/admin/CommentModerationActions";
import {
  getAdminComments,
  getAdminCommentCounts,
} from "@/features/admin/queries";

const STATUS_TABS: Array<{ value: CommentStatus | "ALL"; label: string }> = [
  { value: "PENDING_REVIEW", label: "بانتظار المراجعة" },
  { value: "VISIBLE", label: "ظاهر" },
  { value: "HIDDEN_BY_ADMIN", label: "مخفي" },
  { value: "ALL", label: "الكل" },
];

function parseStatus(value: unknown): CommentStatus | "ALL" {
  if (
    value === "VISIBLE" ||
    value === "HIDDEN_BY_ADMIN" ||
    value === "DELETED_BY_USER" ||
    value === "ALL"
  ) {
    return value;
  }
  return "PENDING_REVIEW";
}

function formatDate(d: Date) {
  try {
    return new Intl.DateTimeFormat("ar-SY", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const status = parseStatus(sp.status);
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const [{ items, total, pageSize }, counts] = await Promise.all([
    getAdminComments(status, page),
    getAdminCommentCounts(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="container mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold">مراجعة التعليقات</h1>
      <p className="mt-1 text-muted-foreground">
        تعليقات الحسابات الجديدة تنتظر المراجعة قبل النشر، ويمكنك إخفاء أي
        تعليق منشور.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => {
          const active = t.value === status;
          return (
            <Link
              key={t.value}
              href={`/admin/comments?status=${t.value}`}
              className={
                active
                  ? "rounded-full border-2 border-primary bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary"
                  : "rounded-full border border-border px-4 py-1.5 text-sm font-semibold hover:border-accent hover:text-accent"
              }
            >
              {t.label} ({counts[t.value]})
            </Link>
          );
        })}
      </div>

      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              لا توجد تعليقات في هذه الحالة.
            </CardContent>
          </Card>
        ) : (
          items.map((c) => (
            <Card key={c.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 text-xs text-muted-foreground">
                  <div>
                    <span className="font-semibold text-foreground">
                      {c.user.name}
                    </span>{" "}
                    · <span className="font-mono">{c.user.email}</span>
                  </div>
                  <div>{formatDate(c.createdAt)}</div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/businesses/${c.business.slug}`}
                    className="text-sm font-semibold hover:text-accent"
                  >
                    على «{c.business.nameAr}»
                  </Link>
                  <Badge
                    variant={
                      c.status === "VISIBLE"
                        ? "accent"
                        : c.status === "HIDDEN_BY_ADMIN"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {c.status === "VISIBLE"
                      ? "ظاهر"
                      : c.status === "HIDDEN_BY_ADMIN"
                        ? "مخفي"
                        : c.status === "PENDING_REVIEW"
                          ? "بانتظار المراجعة"
                          : "محذوف من المستخدم"}
                  </Badge>
                </div>

                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {c.content}
                </p>

                {c.status === "HIDDEN_BY_ADMIN" && c.hiddenReason ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-foreground">
                    <span className="font-semibold text-destructive">
                      سبب الإخفاء:
                    </span>{" "}
                    {c.hiddenReason}
                  </div>
                ) : null}

                <CommentModerationActions
                  commentId={c.id}
                  status={c.status}
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {totalPages > 1 ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          baseHref={`/admin/comments?status=${status}`}
        />
      ) : null}
    </section>
  );
}

function Pagination({
  page,
  totalPages,
  baseHref,
}: {
  page: number;
  totalPages: number;
  baseHref: string;
}) {
  const sep = baseHref.includes("?") ? "&" : "?";
  return (
    <div className="mt-6 flex items-center justify-center gap-2 text-sm">
      {page > 1 ? (
        <Link
          href={`${baseHref}${sep}page=${page - 1}`}
          className="rounded border border-border px-3 py-1 hover:border-accent"
        >
          السابق
        </Link>
      ) : null}
      <span className="text-muted-foreground">
        صفحة {page} من {totalPages}
      </span>
      {page < totalPages ? (
        <Link
          href={`${baseHref}${sep}page=${page + 1}`}
          className="rounded border border-border px-3 py-1 hover:border-accent"
        >
          التالي
        </Link>
      ) : null}
    </div>
  );
}
