import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAuditLog } from "@/features/admin/queries";

const ACTION_LABELS: Record<string, string> = {
  USER_CREATED: "إنشاء مستخدم",
  USER_ROLE_CHANGED: "تغيير دور",
  USER_DELETED: "حذف مستخدم",
  LISTING_CREATED: "إنشاء عمل",
  LISTING_UPDATED: "تعديل عمل",
  LISTING_SUBMITTED: "تقديم للمراجعة",
  LISTING_APPROVED: "اعتماد عمل",
  LISTING_REJECTED: "رفض عمل",
  LISTING_SUSPENDED: "إيقاف عمل",
  LISTING_RESTORED: "استعادة عمل",
  LISTING_DELETED: "حذف عمل",
  MEDIA_UPLOADED: "رفع وسائط",
  MEDIA_APPROVED: "اعتماد وسائط",
  MEDIA_REJECTED: "رفض وسائط",
  CATEGORY_CREATED: "إنشاء فئة",
  CATEGORY_UPDATED: "تعديل فئة",
  CATEGORY_DELETED: "حذف فئة",
  SUGGESTION_APPROVED: "اعتماد اقتراح",
  SUGGESTION_REJECTED: "رفض اقتراح",
  COMMENT_HIDDEN: "إخفاء تعليق",
  COMMENT_RESTORED: "استعادة تعليق",
  COMMENT_APPROVED: "اعتماد تعليق",
  COMMENT_POSTED: "نشر تعليق",
  COMMENT_REMOVED_BY_USER: "حذف تعليق من المستخدم",
  RATING_SUBMITTED: "إرسال تقييم",
  RATING_REMOVED_BY_USER: "إلغاء تقييم",
  RATING_DELETED: "حذف تقييم من الإدارة",
};

function isMutation(action: string) {
  return (
    action.includes("DELETED") ||
    action.includes("REJECTED") ||
    action.includes("HIDDEN") ||
    action.includes("SUSPENDED")
  );
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

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const { items, total, pageSize } = await getAuditLog(page);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="container mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold">سجل التدقيق</h1>
      <p className="mt-1 text-muted-foreground">
        كل عملية كتابة على البيانات الحساسة مسجلة هنا. الإجمالي: {total}
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border bg-secondary/40 text-right text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">الوقت</th>
              <th className="px-3 py-2">الإجراء</th>
              <th className="px-3 py-2">الكيان</th>
              <th className="px-3 py-2">المعرّف</th>
              <th className="px-3 py-2">المستخدم</th>
              <th className="px-3 py-2">قبل / بعد</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  لا توجد سجلات بعد.
                </td>
              </tr>
            ) : (
              items.map((a) => (
                <tr key={a.id} className="border-b border-border align-top">
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                    {formatDate(a.createdAt)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={isMutation(a.action) ? "destructive" : "outline"}
                    >
                      {ACTION_LABELS[a.action] ?? a.action}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs">{a.entityType}</td>
                  <td className="px-3 py-2 font-mono text-xs">{a.entityId}</td>
                  <td className="px-3 py-2 text-xs">
                    <div>{a.actorEmail ?? "—"}</div>
                    <div className="text-muted-foreground">
                      {a.actorRole ?? ""}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {a.previousValues || a.newValues ? (
                      <details>
                        <summary className="cursor-pointer text-accent">
                          عرض
                        </summary>
                        <div className="mt-2 space-y-1">
                          {a.previousValues ? (
                            <pre className="rounded bg-muted p-2 text-[11px]">
                              قبل:{" "}
                              {JSON.stringify(a.previousValues, null, 2)}
                            </pre>
                          ) : null}
                          {a.newValues ? (
                            <pre className="rounded bg-muted p-2 text-[11px]">
                              بعد: {JSON.stringify(a.newValues, null, 2)}
                            </pre>
                          ) : null}
                        </div>
                      </details>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm">
          {page > 1 ? (
            <Link
              href={`/admin/audit?page=${page - 1}`}
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
              href={`/admin/audit?page=${page + 1}`}
              className="rounded border border-border px-3 py-1 hover:border-accent"
            >
              التالي
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
