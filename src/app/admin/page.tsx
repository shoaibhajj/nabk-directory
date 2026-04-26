import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getAdminBusinessCounts,
  getAdminCommentCounts,
} from "@/features/admin/queries";

export default async function AdminPage() {
  const session = await auth();
  // Layout already protects this route, this guards types.
  if (!session?.user) return null;

  const [
    businessCounts,
    commentCounts,
    ratingCount,
    userCount,
    pendingSuggestions,
  ] = await Promise.all([
    getAdminBusinessCounts(),
    getAdminCommentCounts(),
    prisma.rating.count(),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.categorySuggestion.count({ where: { status: "PENDING" } }),
  ]);

  const tiles: Array<{
    href: string;
    label: string;
    value: number;
    hint?: string;
    accent?: boolean;
  }> = [
    {
      href: "/admin/businesses?status=DRAFT",
      label: "أعمال بانتظار الاعتماد",
      value: businessCounts.DRAFT,
      hint: "اضغط للمراجعة",
      accent: businessCounts.DRAFT > 0,
    },
    {
      href: "/admin/comments?status=PENDING_REVIEW",
      label: "تعليقات بانتظار المراجعة",
      value: commentCounts.PENDING_REVIEW,
      hint: "تعليقات جديدة من حسابات حديثة",
      accent: commentCounts.PENDING_REVIEW > 0,
    },
    {
      href: "/admin/businesses?status=SUSPENDED",
      label: "أعمال موقوفة",
      value: businessCounts.SUSPENDED,
    },
    {
      href: "/admin/comments?status=HIDDEN_BY_ADMIN",
      label: "تعليقات مخفية",
      value: commentCounts.HIDDEN_BY_ADMIN,
    },
  ];

  return (
    <section className="container mx-auto px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold">لوحة الإدارة</h1>
        <p className="mt-2 text-muted-foreground">
          مرحباً {session.user.name} — إدارة الدليل والمحتوى
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <StatCard label="الأعمال المنشورة" value={businessCounts.ACTIVE} />
        <StatCard label="المستخدمون" value={userCount} />
        <StatCard label="التقييمات" value={ratingCount} />
        <StatCard label="اقتراحات الفئات" value={pendingSuggestions} />
      </div>

      <h2 className="mt-10 text-xl font-bold">مهام المراجعة</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href}>
            <Card
              className={
                t.accent
                  ? "border-primary/40 transition hover:border-primary"
                  : "transition hover:border-accent/40"
              }
            >
              <CardContent className="space-y-1 p-5">
                <div className="text-sm text-muted-foreground">{t.label}</div>
                <div
                  className={
                    t.accent
                      ? "text-3xl font-bold text-primary"
                      : "text-3xl font-bold"
                  }
                >
                  {t.value}
                </div>
                {t.hint ? (
                  <div className="text-xs text-muted-foreground">{t.hint}</div>
                ) : null}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
