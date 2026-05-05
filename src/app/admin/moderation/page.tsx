import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ModerationActions } from "./actions-client";

export default async function ModerationPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin/moderation");
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const pending = await prisma.businessProfile.findMany({
    where: { status: "PENDING", deletedAt: null },
    include: {
      category: true,
      city: true,
      owner: { select: { id: true, name: true, email: true } },
      phones: { orderBy: { displayOrder: "asc" } },
      workingHours: { orderBy: { dayOfWeek: "asc" } },
      media: { take: 4, orderBy: { displayOrder: "asc" } },
    },
    orderBy: { updatedAt: "asc" },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/admin"
              className="text-sm text-muted-foreground hover:text-accent"
            >
              ← لوحة الإدارة
            </Link>
            <h1 className="mt-2 text-3xl font-bold">طابور المراجعة</h1>
            <p className="mt-1 text-muted-foreground">
              {pending.length} عمل ينتظر الموافقة قبل النشر العام
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {pending.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                لا توجد طلبات قيد المراجعة حالياً.
              </CardContent>
            </Card>
          ) : (
            pending.map((b) => (
              <Card key={b.id}>
                <CardContent className="space-y-3 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold">{b.nameAr}</h2>
                        <Badge variant="warning">قيد المراجعة</Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {b.category.nameAr} · {b.city.nameAr} · بواسطة{" "}
                        <span className="font-semibold">{b.owner.name}</span>{" "}
                        ({b.owner.email})
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/listings/${b.id}/edit/basics`}
                      className="text-sm font-semibold text-accent hover:underline"
                    >
                      عرض / تعديل
                    </Link>
                  </div>

                  {b.descriptionAr && (
                    <p className="rounded-2xl bg-muted p-3 text-sm">
                      {b.descriptionAr}
                    </p>
                  )}

                  <div className="grid gap-3 text-sm md:grid-cols-2">
                    <div>
                      <div className="font-semibold">العنوان</div>
                      <div className="text-muted-foreground">
                        {b.addressAr ?? "—"}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold">أرقام التواصل</div>
                      <ul className="text-muted-foreground">
                        {b.phones.map((p) => (
                          <li key={p.id} dir="ltr">
                            {p.label}: {p.number}
                          </li>
                        ))}
                        {b.phones.length === 0 && <li>—</li>}
                      </ul>
                    </div>
                  </div>

                  {b.media.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {b.media.map((m) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={m.id}
                          src={m.url}
                          alt=""
                          className="h-20 w-32 flex-none rounded-xl object-cover"
                        />
                      ))}
                    </div>
                  )}

                  <ModerationActions id={b.id} />
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
