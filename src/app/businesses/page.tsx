import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BusinessCard } from "@/components/business/BusinessCard";
import { getActiveBusinesses, getCategoriesWithCounts } from "@/features/businesses/queries";
import { Search } from "lucide-react";

async function searchAction(formData: FormData) {
  "use server";
  const q = String(formData.get("q") ?? "").trim();
  redirect(q ? `/businesses?search=${encodeURIComponent(q)}` : "/businesses");
}

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const [businesses, categories] = await Promise.all([
    getActiveBusinesses({ search: sp.search, categorySlug: sp.category }),
    getCategoriesWithCounts(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold md:text-4xl">جميع الأعمال</h1>
        <p className="mt-2 text-muted-foreground">
          {sp.search ? `نتائج البحث عن "${sp.search}"` : "تصفح كافة الأعمال والخدمات في النبك"}
        </p>

        <form
          action={searchAction}
          className="mt-6 flex max-w-2xl items-center gap-2 rounded-full bg-card p-2 shadow-card"
        >
          <Input
            name="q"
            defaultValue={sp.search ?? ""}
            placeholder="ابحث..."
            className="h-12 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <Button type="submit" variant="accent" size="md">
            <Search className="h-4 w-4" />
            بحث
          </Button>
        </form>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/businesses">
            <span
              className={`inline-block rounded-full px-4 py-2 text-sm font-semibold ${!sp.category ? "bg-accent text-accent-foreground" : "bg-muted text-foreground hover:bg-secondary"}`}
            >
              الكل
            </span>
          </Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/businesses?category=${c.slug}`}>
              <span
                className={`inline-block rounded-full px-4 py-2 text-sm font-semibold ${sp.category === c.slug ? "bg-accent text-accent-foreground" : "bg-muted text-foreground hover:bg-secondary"}`}
              >
                {c.nameAr} ({c._count.listings})
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-8">
          {businesses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                لا توجد نتائج مطابقة. جرب بحثاً آخر أو تصفح كل التصنيفات.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {businesses.map((b) => (
                <BusinessCard key={b.id} business={b} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
