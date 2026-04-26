import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { getCategoriesWithCounts } from "@/features/businesses/queries";
import { LayoutGrid } from "lucide-react";

export default async function CategoriesPage() {
  const categories = await getCategoriesWithCounts();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold md:text-4xl">جميع الأقسام</h1>
        <p className="mt-2 text-muted-foreground">
          استكشف جميع تصنيفات الأعمال والخدمات في دليل النبك
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => (
            <Link key={c.id} href={`/category/${c.slug}`}>
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                    <LayoutGrid className="h-7 w-7" />
                  </div>
                  <div className="font-bold leading-tight">{c.nameAr}</div>
                  <div className="text-xs text-muted-foreground">
                    {c._count.listings} عمل
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
