import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, MapPin, Search, Users, Heart, CheckCircle } from "lucide-react";
export const metadata = {
  title: "عن الدليل — دليل النبك",
  description:
    "دليل النبك هو دليل محلي شامل لمدينة النبك في سوريا، يجمع كل الخدمات والأعمال في مكان واحد سهل الوصول.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="pb-20">
        {/* Hero */}
        <div className="bg-secondary-foreground/5 py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-multiply pointer-events-none"></div>
          <div className="container mx-auto px-4 relative z-10 text-center max-w-3xl">
            <div className="w-20 h-20 bg-secondary-foreground text-primary-foreground rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl transform rotate-3">
              <Store className="w-10 h-10" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-6">
              عن دليل النبك
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              المنصة الرقمية الأولى التي تجمع كافة الخدمات والأعمال في مدينة
              النبك، لنسهل على السكان والزوار الوصول لما يحتاجونه بسرعة وسهولة.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-16 max-w-4xl space-y-16">
          {/* Mission */}
          <section className="bg-card rounded-3xl p-8 md:p-12 border border-border shadow-sm text-center">
            <Heart className="w-12 h-12 text-destructive mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-6 text-foreground">رسالتنا</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              نسعى لبناء مجتمع محلي مترابط رقمياً. نؤمن أن دعم الأعمال المحلية
              هو أساس قوة اقتصاد المدينة. هدفنا أن نكون الجسر الذي يربط بين
              مقدمي الخدمات وأهالي المدينة، وتوفير مرجع موثوق ودائم لكل ما
              يحتاجه الفرد في النبك.
            </p>
          </section>

          {/* Features */}
          <section className="space-y-8">
            <h2 className="text-3xl font-bold text-center text-foreground">
              لماذا دليل النبك؟
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-muted/30 p-8 rounded-2xl text-center space-y-4 hover-elevate transition-all border border-transparent hover:border-border">
                <Search className="w-10 h-10 text-primary mx-auto" />
                <h3 className="font-bold text-xl">بحث سريع ومتقدم</h3>
                <p className="text-muted-foreground text-sm">
                  محرك بحث ذكي للوصول للخدمات والأطباء والمحلات بثوانٍ معدودة.
                </p>
              </div>
              <div className="bg-muted/30 p-8 rounded-2xl text-center space-y-4 hover-elevate transition-all border border-transparent hover:border-border">
                <CheckCircle className="w-10 h-10 text-blue-500 mx-auto" />
                <h3 className="font-bold text-xl">معلومات موثقة</h3>
                <p className="text-muted-foreground text-sm">
                  نحرص على مراجعة وتدقيق بيانات الأعمال لضمان دقتها وصحتها.
                </p>
              </div>
              <div className="bg-muted/30 p-8 rounded-2xl text-center space-y-4 hover-elevate transition-all border border-transparent hover:border-border">
                <Users className="w-10 h-10 text-secondary mx-auto" />
                <h3 className="font-bold text-xl">خدمة مجتمعية</h3>
                <p className="text-muted-foreground text-sm">
                  منصة مجانية بالكامل للمستخدمين وأصحاب الأعمال الصغيرة لدعم
                  المجتمع.
                </p>
              </div>
            </div>
          </section>

          {/* Join Us */}
          <section className="bg-secondary-foreground text-primary-foreground rounded-3xl p-8 md:p-12 relative overflow-hidden text-center">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-multiply"></div>
            <div className="relative z-10">
              <MapPin className="w-12 h-12 mx-auto mb-6 opacity-90" />
              <h2 className="text-3xl font-bold mb-4">
                هل تمتلك عملاً في النبك؟
              </h2>
              <p className="text-lg text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
                أضف تفاصيل عملك، ساعات الدوام، أرقام التواصل، وموقعك ليتمكن
                الزبائن من الوصول إليك بسهولة تامة. الإضافة مجانية وسريعة.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="font-bold rounded-xl h-14 px-8 shadow-lg hover:scale-105 transition-transform"
                  >
                    أضف عملك مجاناً
                  </Button>
                </Link>
                <Link href="/businesses">
                  <Button
                    size="lg"
                    variant="outline"
                    className="font-bold rounded-xl h-14 px-8 border-primary-foreground/20 hover:bg-primary-foreground/10 text-primary-foreground hover:text-primary-foreground"
                  >
                    تصفح الدليل
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
