import Link from "next/link";
import type { BusinessStatus } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BusinessActions } from "@/components/admin/BusinessActions";
import {
  getAdminBusinesses,
  getAdminBusinessCounts,
} from "@/features/admin/queries";

const STATUS_TABS: Array<{ value: BusinessStatus | "ALL"; label: string }> = [
  { value: "DRAFT", label: "بانتظار الاعتماد" },
  { value: "ACTIVE", label: "منشور" },
  { value: "SUSPENDED", label: "موقوف" },
  { value: "ALL", label: "الكل" },
];

function parseStatus(value: unknown): BusinessStatus | "ALL" {
  if (value === "ACTIVE" || value === "SUSPENDED" || value === "ALL") {
    return value;
  }
  return "DRAFT";
}

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const status = parseStatus(sp.status);
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const [{ items, total, pageSize }, counts] = await Promise.all([
    getAdminBusinesses(status, page),
    getAdminBusinessCounts(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="container mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold">إدارة الأعمال</h1>
      <p className="mt-1 text-muted-foreground">
        راجع طلبات النشر، أوقف أو استعد الأعمال المخالفة.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => {
          const active = t.value === status;
          return (
            <Link
              key={t.value}
              href={`/admin/businesses?status=${t.value}`}
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
              لا يوجد أعمال في هذه الحالة.
            </CardContent>
          </Card>
        ) : (
          items.map((b) => (
            <Card key={b.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/businesses/${b.slug}`}
                      className="text-lg font-bold hover:text-accent"
                    >
                      {b.nameAr}
                    </Link>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {b.category.nameAr} · صاحب العمل:{" "}
                      <span className="font-mono">{b.owner.email}</span>
                    </div>
                  </div>
                  <Badge
                    variant={
                      b.status === "ACTIVE"
                        ? "accent"
                        : b.status === "SUSPENDED"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {b.status === "ACTIVE"
                      ? "منشور"
                      : b.status === "SUSPENDED"
                        ? "موقوف"
                        : "مسودة / بانتظار الاعتماد"}
                  </Badge>
                </div>

                {b.descriptionAr ? (
                  <p className="text-sm text-foreground line-clamp-3">
                    {b.descriptionAr}
                  </p>
                ) : null}

                {b.status === "SUSPENDED" && b.suspensionReason ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                    <span className="font-semibold text-destructive">
                      سبب الإيقاف:
                    </span>{" "}
                    <span className="text-foreground">{b.suspensionReason}</span>
                  </div>
                ) : null}

                <BusinessActions businessId={b.id} status={b.status} />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {totalPages > 1 ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          baseHref={`/admin/businesses?status=${status}`}
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
