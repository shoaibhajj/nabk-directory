import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin");
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const [businessCount, ratingCount, commentCount, userCount] = await Promise.all([
    prisma.businessProfile.count({ where: { deletedAt: null } }),
    prisma.rating.count(),
    prisma.comment.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null } }),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container mx-auto px-4 py-10">
        <div>
          <h1 className="text-3xl font-bold">لوحة الإدارة</h1>
          <p className="mt-2 text-muted-foreground">
            مرحباً {session.user.name} — إدارة الدليل والمحتوى
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <div className="text-sm text-muted-foreground">الأعمال المنشورة</div>
              <div className="mt-1 text-3xl font-bold">{businessCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-sm text-muted-foreground">المستخدمون</div>
              <div className="mt-1 text-3xl font-bold">{userCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-sm text-muted-foreground">التقييمات</div>
              <div className="mt-1 text-3xl font-bold">{ratingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-sm text-muted-foreground">التعليقات</div>
              <div className="mt-1 text-3xl font-bold">{commentCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardContent className="space-y-2 p-6 text-center text-muted-foreground">
            <p>أدوات إدارة المحتوى (الموافقة على الأعمال، إخفاء التعليقات، اقتراحات الفئات، سجل التدقيق) قيد التطوير.</p>
          </CardContent>
        </Card>
      </section>
      <Footer />
    </div>
  );
}
