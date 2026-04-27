import { redirect } from "next/navigation";
import Link from "next/link";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserRoleSelect } from "@/components/admin/UserRoleSelect";
import { UserVerifyActions } from "@/components/admin/UserVerifyActions";
import { getAdminUsers } from "@/features/admin/queries";

const ROLE_LABELS: Record<Role, string> = {
  GUEST: "زائر",
  BUSINESS_OWNER: "صاحب عمل",
  ADMIN: "مسؤول",
  SUPER_ADMIN: "مسؤول أعلى",
};

const ROLE_TABS: Array<{ value: Role | "ALL"; label: string }> = [
  { value: "ALL", label: "الكل" },
  { value: "BUSINESS_OWNER", label: "أصحاب الأعمال" },
  { value: "ADMIN", label: "المسؤولون" },
  { value: "SUPER_ADMIN", label: "المسؤولون الأعلى" },
];

function parseRole(value: unknown): Role | "ALL" {
  const v = typeof value === "string" ? value : "";
  if (
    v === "BUSINESS_OWNER" ||
    v === "ADMIN" ||
    v === "SUPER_ADMIN" ||
    v === "GUEST"
  ) {
    return v;
  }
  return "ALL";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
  }).format(date);
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string; page?: string }>;
}) {
  // Hard gate at the page boundary as well as in the action — admin layout
  // already checks ADMIN+, here we additionally require SUPER_ADMIN.
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    redirect("/admin");
  }

  const sp = await searchParams;
  const role = parseRole(sp.role);
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const { items, total, pageSize } = await getAdminUsers({
    role,
    q,
    page,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="container mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
      <p className="mt-1 text-muted-foreground">
        رقِّ المستخدمين أو نزِّل الصلاحيات. لا يمكنك تعديل صلاحياتك بنفسك.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {ROLE_TABS.map((t) => {
          const active = t.value === role;
          const params = new URLSearchParams();
          if (t.value !== "ALL") params.set("role", t.value);
          if (q) params.set("q", q);
          const href = `/admin/users${params.size ? `?${params.toString()}` : ""}`;
          return (
            <Link
              key={t.value}
              href={href}
              className={
                active
                  ? "rounded-full border-2 border-primary bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary"
                  : "rounded-full border border-border px-4 py-1.5 text-sm font-semibold hover:border-accent hover:text-accent"
              }
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <form
        method="get"
        action="/admin/users"
        className="mt-4 flex flex-wrap items-center gap-2"
      >
        {role !== "ALL" && <input type="hidden" name="role" value={role} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="بحث بالاسم أو البريد…"
          className="w-full max-w-sm rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <Button type="submit" variant="outline" size="sm">
          بحث
        </Button>
        {q ? (
          <Link
            href={role === "ALL" ? "/admin/users" : `/admin/users?role=${role}`}
          >
            <Button variant="ghost" size="sm">مسح</Button>
          </Link>
        ) : null}
      </form>

      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              لا يوجد مستخدمون مطابقون.
            </CardContent>
          </Card>
        ) : (
          items.map((u) => {
            const isSelf = u.id === session.user.id;
            return (
              <Card key={u.id}>
                <CardContent className="flex flex-wrap items-start justify-between gap-3 p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold">{u.name}</h3>
                      <Badge variant="default">{ROLE_LABELS[u.role]}</Badge>
                      {!u.emailVerified && (
                        <Badge variant="outline">بريد غير مفعَّل</Badge>
                      )}
                      {isSelf && <Badge variant="accent">أنت</Badge>}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground" dir="ltr">
                      {u.email}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      انضم في {formatDate(u.createdAt)} ·{" "}
                      {u._count.businessProfiles} عمل
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <UserRoleSelect
                      userId={u.id}
                      currentRole={u.role}
                      disabled={isSelf}
                      disabledReason={isSelf ? "لا يمكن تعديل دورك" : undefined}
                    />
                    {!u.emailVerified && !isSelf && (
                      <UserVerifyActions userId={u.id} />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {totalPages > 1 ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            const params = new URLSearchParams();
            if (role !== "ALL") params.set("role", role);
            if (q) params.set("q", q);
            if (p > 1) params.set("page", String(p));
            return (
              <Link
                key={p}
                href={`/admin/users${params.size ? `?${params.toString()}` : ""}`}
                className={
                  p === page
                    ? "rounded-lg bg-primary px-3 py-1 text-sm font-bold text-primary-foreground"
                    : "rounded-lg border border-border px-3 py-1 text-sm hover:border-accent"
                }
              >
                {p}
              </Link>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
