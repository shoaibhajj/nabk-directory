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
  Users,
  ArrowLeft,
} from "lucide-react";
import { getCategoryIcon } from "@/components/business/category-icons";
import { PdfHeroButtons } from "@/components/pdf/PdfHeroButtons";

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

      {/* ───────── Hero ───────── */}
      <section className="gradient-hero relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-multiply"
          style={{
            backgroundImage:
              "url('https://www.transparenttextures.com/patterns/cubes.png')",
          }}
        />

        <div className="container relative z-10 mx-auto px-4 py-20 text-center md:py-32">

          {/* badge — orange (primary) */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-soft">
            <MapPin className="h-4 w-4" />
            مدينتك بين يديك
          </span>

          {/* heading */}
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-foreground md:text-6xl">
            ابحث عن أي شيء في
            {/* city name — green (accent) */}
            <span className="mt-2 block text-accent">مدينة النبك</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            أطباء، صيدليات، مطاعم، مهنيين، وكل ما تحتاجه من خدمات وأعمال في
            مدينتك، مجمعة في مكان واحد.
          </p>

          {/* Search box */}
          <form
            action={searchAction}
            className="mx-auto mt-8 flex max-w-2xl flex-col items-stretch gap-2 rounded-2xl border border-border/50 bg-card p-2 shadow-card sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                placeholder="ابحث هنا..."
                className="h-14 rounded-xl border-none bg-muted/30 pl-4 pr-12 text-lg shadow-none focus-visible:ring-0"
              />
            </div>
            {/* search button — green (accent) */}
            <Button
              type="submit"
              variant="accent"
              className="h-14 rounded-xl px-8 text-lg font-bold"
            >
              بحث
            </Button>
          </form>

          {/* Popular searches */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm font-medium">
            <span className="text-muted-foreground">شائع:</span>
            {popular.map((p) => (
              <Link
                key={p}
                href={`/businesses?search=${encodeURIComponent(p)}`}
                className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground hover:bg-[#D9F0DC] transition-colors"
              >
                {p}
              </Link>
            ))}
          </div>

          <PdfHeroButtons />
        </div>
      </section>

      {/* ───────── Stats ───────── */}
      <section className="border-b border-border bg-card py-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 text-center md:grid-cols-4">
            <StatCard icon={Building2} value={stats.businessCount} label="عمل وخدمة" color="text-secondary-foreground" />
            <StatCard icon={LayoutGrid} value={stats.categoryCount} label="تصنيف" color="text-primary" />
            <StatCard icon={MapPin} value={stats.cityCount} label="مدينة وموقع" color="text-destructive" />
            <StatCard icon={Users} value={"0+"} label="زيارة شهرية" color="text-blue-500" />
          </div>
        </div>
      </section>

      {/* ───────── Categories ───────── */}
      <section className="bg-background py-20">
        <div className="container mx-auto px-4">
          <div className="mb-10">
            <h2 className="text-3xl font-bold">تصفح الأقسام</h2>
            <p className="mt-2 font-medium text-muted-foreground">
              اكتشف الأعمال والخدمات حسب التصنيف
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => {
              const Icon = getCategoryIcon(c.slug);
              return (
                <Link key={c.id} href={`/category/${c.slug}`}>
                  <div className="group flex h-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-6 text-center transition-all duration-300 hover:border-accent/50 hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-secondary-foreground transition-colors duration-300 group-hover:bg-accent group-hover:text-accent-foreground">
                      <Icon className="h-7 w-7" />
                    </div>
                    <div>
                      <div className="font-bold leading-tight text-foreground transition-colors group-hover:text-accent">
                        {c.nameAr}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {c._count.listings} عمل
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────── Recent ───────── */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold">أحدث الإضافات</h2>
              <p className="mt-2 font-medium text-muted-foreground">
                تعرف على الأعمال والخدمات المضافة حديثاً للدليل
              </p>
            </div>
            <Link href="/businesses" className="hidden sm:inline-block">
              <Button variant="outline" className="font-bold">
                عرض الكل
                <ArrowLeft className="mr-2 h-4 w-4" />
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recent.map((b) => (
                <BusinessCard key={b.id} business={b} />
              ))}
            </div>
          )}

          <div className="mt-8 text-center sm:hidden">
            <Link href="/businesses">
              <Button variant="outline" className="w-full font-bold">
                عرض كل الأعمال
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── CTA — green (accent) background ───────── */}
      <section className="relative overflow-hidden bg-accent py-20 text-accent-foreground">
        <div
          className="absolute inset-0 opacity-10 mix-blend-multiply"
          style={{
            backgroundImage:
              "url('https://www.transparenttextures.com/patterns/cubes.png')",
          }}
        />
        <div className="container relative z-10 mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">
            صاحب عمل أو خدمة في النبك؟
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed opacity-90">
            انضم إلى أكبر دليل محلي في المدينة. أضف عملك مجاناً واجعل وصول
            الزبائن إليك أسهل.
          </p>
          {/* CTA button — orange (primary) on green background */}
          <Link href="/dashboard/listings/new" className="mt-8 inline-block">
            <Button
              variant="primary"
              size="lg"
              className="mt-8 rounded-full px-8 text-lg font-bold shadow-lg transition-transform hover:scale-105"
            >
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
  color = "text-accent",
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number | string;
  label: string;
  color?: string;
}) {
  return (
    <div className="space-y-2 rounded-2xl bg-muted/30 p-4 text-center">
      <Icon className={`mx-auto mb-3 h-8 w-8 ${color}`} />
      <div className="text-3xl font-black text-foreground">
        {typeof value === "number" ? value.toLocaleString("ar-EG") : value}
      </div>
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
    </div>
  );
}
