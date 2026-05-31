import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteListingButton } from "@/components/business/DeleteListingButton";

export default async function DashboardPage() {
  const session = await auth();
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
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/businesses/${b.slug}`}
                          className="block truncate text-lg font-bold hover:text-accent"
                        >
                          {b.nameAr}
                        </Link>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {b.category.nameAr} · {b.viewCount} مشاهدة
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <StatusBadge status={b.status} />
                        <VerificationBadge status={b.verificationStatus} />
                      </div>
                    </div>
                    {b.status === "REJECTED" && b.suspensionReason && (
                      <p className="rounded-xl bg-red-50 p-2 text-xs text-red-700">
                        سبب الرفض: {b.suspensionReason}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Link href={`/dashboard/listings/${b.id}/edit/basics`}>
                        <Button variant="outline" size="sm">تعديل</Button>
                      </Link>
                      {b.status === "ACTIVE" && (
                        <Link href={`/businesses/${b.slug}`}>
                          <Button variant="ghost" size="sm">عرض</Button>
                        </Link>
                      )}
                      <Link href={`/dashboard/listings/${b.id}/verification`}>
                        <Button variant="ghost" size="sm">توثيق</Button>
                      </Link>
                      <DeleteListingButton
                        listingId={b.id}
                        listingName={b.nameAr}
                      />
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

function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") return <Badge variant="accent">منشور</Badge>;
  if (status === "PENDING") return <Badge variant="warning">قيد المراجعة</Badge>;
  if (status === "SUSPENDED") return <Badge variant="destructive">معلّق</Badge>;
  if (status === "REJECTED") return <Badge variant="destructive">مرفوض</Badge>;
  return <Badge variant="outline">مسودة</Badge>;
}

function VerificationBadge({ status }: { status: string }) {
  if (status === "VERIFIED")
    return <Badge variant="accent" className="text-xs">موثّق ✓</Badge>;
  if (status === "PENDING")
    return <Badge variant="warning" className="text-xs">توثيق قيد المراجعة</Badge>;
  if (status === "REJECTED")
    return <Badge variant="destructive" className="text-xs">توثيق مرفوض</Badge>;
  return null; // UNVERIFIED — لا نعرض شيئاً
}
