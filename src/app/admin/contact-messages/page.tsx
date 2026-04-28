import { redirect } from "next/navigation";
import Link from "next/link";
import type { ContactMessageStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContactMessageActions } from "./message-actions";

const STATUS_LABELS: Record<ContactMessageStatus, string> = {
  NEW: "جديدة",
  READ: "مقروءة",
  RESOLVED: "تم الرد",
  SPAM: "إزعاج",
};

const STATUS_TABS: Array<{
  value: ContactMessageStatus | "ALL";
  label: string;
}> = [
  { value: "ALL", label: "الكل" },
  { value: "NEW", label: "الجديدة" },
  { value: "READ", label: "المقروءة" },
  { value: "RESOLVED", label: "تم الرد" },
  { value: "SPAM", label: "إزعاج" },
];

function parseStatus(value: unknown): ContactMessageStatus | "ALL" {
  const v = typeof value === "string" ? value : "";
  if (v === "NEW" || v === "READ" || v === "RESOLVED" || v === "SPAM") {
    return v;
  }
  return "ALL";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const PAGE_SIZE = 25;

export default async function AdminContactMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    redirect("/admin");
  }

  const sp = await searchParams;
  const status = parseStatus(sp.status);
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const where = status === "ALL" ? {} : { status };

  const [items, total] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        subject: true,
        message: true,
        status: true,
        createdAt: true,
        userId: true,
        reply: true,
        repliedAt: true,
      },
    }),
    prisma.contactMessage.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="container mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold">رسائل التواصل</h1>
      <p className="mt-1 text-muted-foreground">
        الرسائل القادمة من نموذج «تواصل معنا» على الموقع.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => {
          const active = t.value === status;
          const params = new URLSearchParams();
          if (t.value !== "ALL") params.set("status", t.value);
          const href = `/admin/contact-messages${
            params.size ? `?${params.toString()}` : ""
          }`;
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

      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              لا يوجد رسائل.
            </CardContent>
          </Card>
        ) : (
          items.map((m) => (
            <Card key={m.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold">{m.name}</h3>
                      <Badge
                        variant={m.status === "NEW" ? "accent" : "outline"}
                      >
                        {STATUS_LABELS[m.status]}
                      </Badge>
                      {m.userId && (
                        <Badge variant="outline">عضو مسجَّل</Badge>
                      )}
                    </div>
                    <div
                      className="mt-1 text-xs text-muted-foreground"
                      dir="ltr"
                    >
                      {m.email}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatDate(m.createdAt)}
                    </div>
                    {m.subject && (
                      <p className="mt-2 text-sm font-semibold">
                        {m.subject}
                      </p>
                    )}
                    {/* React escapes — message stored verbatim, displayed
                        as plain text with whitespace preserved. */}
                    <p className="mt-2 whitespace-pre-wrap text-sm">
                      {m.message}
                    </p>
                    {m.reply ? (
                      <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                        <h4 className="mb-1 text-xs font-semibold text-primary">
                          الردّ المُرسَل
                          {m.repliedAt
                            ? ` • ${formatDate(m.repliedAt)}`
                            : null}
                        </h4>
                        <p className="whitespace-pre-wrap text-sm text-foreground">
                          {m.reply}
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <ContactMessageActions
                    id={m.id}
                    currentStatus={m.status}
                    email={m.email}
                    subject={m.subject}
                    existingReply={m.reply}
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {totalPages > 1 ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            const params = new URLSearchParams();
            if (status !== "ALL") params.set("status", status);
            if (p > 1) params.set("page", String(p));
            return (
              <Link
                key={p}
                href={`/admin/contact-messages${
                  params.size ? `?${params.toString()}` : ""
                }`}
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
