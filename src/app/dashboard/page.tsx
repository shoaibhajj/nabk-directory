import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  // Auth + email-verification is enforced by `dashboard/layout.tsx`.
  // The non-null assertion below is safe because the layout would have
  // already redirected unauthenticated callers.
  if (!session?.user) redirect("/sign-in?callbackUrl=/dashboard");

  const listings = await prisma.businessProfile.findMany({
    where: { ownerId: session.user.id, deletedAt: null },
    include: { category: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container mx-auto px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">لوحة التحكم</h1>
            <p className="mt-2 text-muted-foreground">
              مرحباً {session.user.name} — إدارة أعمالك المضافة في الدليل
            </p>
          </div>
          <Link href="/dashboard/listings/new">
            <Button variant="primary" size="md">+ إضافة عمل جديد</Button>
          </Link>
        </div>

        <div className="mt-8">
          {listings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                لم تقم بإضافة أي عمل بعد. اضغط على «إضافة عمل جديد» للبدء.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {listings.map((b) => (
                <Card key={b.id}>
                  <CardContent className="space-y-2 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        href={`/businesses/${b.id}`}
                        className="text-lg font-bold hover:text-accent"
                      >
                        {b.nameAr}
                      </Link>
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
                            ? "معلّق"
                            : "مسودة"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {b.category.nameAr} · {b.viewCount} مشاهدة
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
