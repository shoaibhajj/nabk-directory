import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";

export default async function NewListingPage() {
  const session = await auth();
  // Auth + email-verification enforced by `dashboard/layout.tsx`.
  if (!session?.user) redirect("/sign-in?callbackUrl=/dashboard/listings/new");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container mx-auto max-w-2xl px-4 py-12">
        <Card>
          <CardContent className="space-y-4 p-8 text-center">
            <h1 className="text-2xl font-bold">إضافة عمل جديد</h1>
            <p className="text-muted-foreground">
              معالج إضافة العمل (5 خطوات: الأساسيات، التواصل، الصور، ساعات العمل،
              المعاينة) قيد التطوير. سيتم إكماله في تحديث قادم.
            </p>
            <Link href="/dashboard">
              <Button variant="outline" size="md">العودة إلى لوحة التحكم</Button>
            </Link>
          </CardContent>
        </Card>
      </section>
      <Footer />
    </div>
  );
}
