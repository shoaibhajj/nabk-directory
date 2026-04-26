import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, MapPin, Search, Users } from "lucide-react";

export const metadata = {
  title: "عن الدليل — دليل النبك",
  description:
    "دليل النبك هو دليل محلي شامل لمدينة النبك في سوريا، يجمع كل الخدمات والأعمال في مكان واحد سهل الوصول.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="gradient-hero">
        <div className="container mx-auto px-4 py-14 text-center md:py-20">
          <span className="inline-block rounded-full bg-secondary px-4 py-1.5 text-sm font-semibold text-accent">
            عن الدليل
          </span>
          <h1 className="mt-6 text-3xl font-bold leading-tight md:text-5xl">
            دليل النبك — مدينتك بين يديك
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            دليل محلي شامل لمدينة النبك في سوريا. نجمع الأطباء، الصيدليات،
            المطاعم، المهنيين، وكل ما تحتاجه من خدمات وأعمال في مكانٍ واحدٍ
            سهل الوصول.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="grid gap-5 md:grid-cols-3">
          <Card>
            <CardContent className="space-y-3 p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                <Search className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold">ابحث بسهولة</h3>
              <p className="text-sm text-muted-foreground">
                اعثر على أي عمل أو خدمة في النبك من خلال البحث المباشر أو
                التصفح حسب التصنيف.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                <MapPin className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold">معلومات دقيقة</h3>
              <p className="text-sm text-muted-foreground">
                أرقام تواصل، عناوين، ساعات عمل، وحالة "مفتوح الآن" لحظية —
                كل شيء في صفحة واحدة منظمة.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                <Users className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold">لخدمة المدينة</h3>
              <p className="text-sm text-muted-foreground">
                دليل مجاني لكل سكان النبك — لتسهيل التواصل بين أصحاب الأعمال
                والزبائن.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="rounded-3xl bg-accent px-6 py-12 text-center text-accent-foreground shadow-card md:px-12 md:py-16">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-cta">
            <Store className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-2xl font-bold md:text-3xl">
            صاحب عمل أو خدمة في النبك؟
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base opacity-90">
            انضم إلى أكبر دليل محلي في المدينة. أضف عملك مجاناً واجعل وصول
            الزبائن إليك أسهل.
          </p>
          <Link href="/sign-up" className="mt-6 inline-block">
            <Button variant="primary" size="lg">
              أضف عملك الآن
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
