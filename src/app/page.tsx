import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { BusinessCard } from "@/components/business/BusinessCard";
import {
  getActiveBusinesses,
  getCategoriesWithCounts,
  getStats,
} from "@/features/businesses/queries";
import {
  Search,
  Building2,
  LayoutGrid,
  MapPin,
  TrendingUp,
  Pill,
  Stethoscope,
  Coffee,
  ShoppingCart,
  Wrench,
  Scissors,
  GraduationCap,
  Home,
  Shirt,
  Hammer,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pharmacies: Pill,
  clinics: Stethoscope,
  restaurants: Coffee,
  grocery: ShoppingCart,
  auto: Wrench,
  salons: Scissors,
  education: GraduationCap,
  mosques: Home,
  clothing: Shirt,
  construction: Hammer,
};

async function searchAction(formData: FormData) {
  "use server";
  const q = String(formData.get("q") ?? "").trim();
  redirect(q ? `/businesses?search=${encodeURIComponent(q)}` : "/businesses");
}

export default async function HomePage() {
  const [stats, categories, recent] = await Promise.all([
    getStats(),
    getCategoriesWithCounts(),
    getActiveBusinesses({ limit: 6 }),
  ]);

  const popular = ["صيدلية", "طبيب أطفال", "مطعم", "سوبر ماركت"];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="gradient-hero">
        <div className="container mx-auto px-4 py-16 text-center md:py-24">
          <span className="inline-block rounded-full bg-secondary px-4 py-1.5 text-sm font-semibold text-accent">
            مدينتك بين يديك
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-foreground md:text-6xl">
            ابحث عن أي شيء في
            <span className="mt-2 block text-accent">مدينة النبك</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground md:text-xl">
            أطباء، صيدليات، مطاعم، مهنيين، وكل ما تحتاجه من خدمات وأعمال في
            مدينتك، مجمعة في مكان واحد.
          </p>

          <form
            action={searchAction}
            className="mx-auto mt-8 flex max-w-2xl items-center gap-2 rounded-full bg-card p-2 shadow-card"
          >
            <Input
              name="q"
              placeholder="ابحث عن عمل، خدمة، أو تصنيف..."
              className="h-12 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <Button type="submit" variant="accent" size="md" className="shrink-0">
              <Search className="h-4 w-4" />
              بحث
            </Button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="text-muted-foreground">شائع:</span>
            {popular.map((p) => (
              <Link
                key={p}
                href={`/businesses?search=${encodeURIComponent(p)}`}
                className="rounded-full bg-card px-3 py-1 text-foreground shadow-soft hover:bg-secondary hover:text-secondary-foreground"
              >
                {p}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={Building2} value={stats.businessCount} label="عمل وخدمة" />
          <StatCard icon={LayoutGrid} value={stats.categoryCount} label="تصنيف" />
          <StatCard icon={MapPin} value={stats.cityCount} label="مدينة وموقع" />
          <StatCard icon={TrendingUp} value={"0+"} label="زيارة شهرية" />
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold">تصفح الأقسام</h2>
          <p className="mt-2 text-muted-foreground">
            اكتشف الأعمال والخدمات حسب التصنيف
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => {
            const Icon = CATEGORY_ICONS[c.slug] ?? LayoutGrid;
            return (
              <Link key={c.id} href={`/category/${c.slug}`}>
                <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-lg">
                  <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                      <Icon className="h-7 w-7" />
                    </div>
                    <div className="font-bold leading-tight">{c.nameAr}</div>
                    <div className="text-xs text-muted-foreground">
                      {c._count.listings} عمل
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent */}
      <section className="container mx-auto px-4 py-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">أحدث الإضافات</h2>
            <p className="mt-2 text-muted-foreground">
              تعرف على الأعمال والخدمات المضافة حديثاً للدليل
            </p>
          </div>
          <Link href="/businesses" className="hidden sm:inline-block">
            <Button variant="outline" size="sm">
              عرض الكل
            </Button>
          </Link>
        </div>

        {recent.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              لا توجد أعمال مضافة حالياً.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {recent.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/businesses">
            <Button variant="outline" size="md">
              عرض كل الأعمال
            </Button>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-14">
        <div className="rounded-3xl bg-accent px-6 py-12 text-center text-accent-foreground shadow-card md:px-12 md:py-16">
          <h2 className="text-3xl font-bold md:text-4xl">صاحب عمل أو خدمة في النبك؟</h2>
          <p className="mx-auto mt-4 max-w-xl text-base opacity-90 md:text-lg">
            انضم إلى أكبر دليل محلي في المدينة. أضف عملك مجاناً واجعل وصول
            الزبائن إليك أسهل.
          </p>
          <Link href="/dashboard/listings/new" className="mt-6 inline-block">
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

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number | string;
  label: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
        <Icon className="h-7 w-7 text-accent" />
        <div className="text-3xl font-bold text-foreground">
          {typeof value === "number" ? value.toLocaleString("ar-EG") : value}
        </div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
