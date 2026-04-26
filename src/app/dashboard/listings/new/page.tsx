import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { createDraftListingAction } from "@/features/businesses/mutations";

export default async function NewListingPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/dashboard/listings/new");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container mx-auto max-w-2xl px-4 py-12">
        <Card>
          <CardContent className="space-y-5 p-8 text-center">
            <h1 className="text-2xl font-bold">إضافة عمل جديد</h1>
            <p className="text-muted-foreground">
              سننشئ مسودة فارغة الآن، ثم تقودك المعالج عبر 5 خطوات: الأساسيات →
              التصنيف والموقع → التواصل → ساعات العمل → الصور. يمكنك حفظ تقدمك
              في أي وقت والعودة لاحقاً.
            </p>
            <form action={createDraftListingAction} className="flex justify-center gap-3">
              <Button type="submit" variant="primary" size="lg">
                ابدأ المسودة
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
      <Footer />
    </div>
  );
}
