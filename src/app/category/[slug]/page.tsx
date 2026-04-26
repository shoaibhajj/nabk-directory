import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BusinessCard } from "@/components/business/BusinessCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getActiveBusinesses } from "@/features/businesses/queries";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: "recent" | "rating" }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) notFound();

  const businesses = await getActiveBusinesses({
    categorySlug: slug,
    orderBy: sp.sort === "rating" ? "rating" : "recent",
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold md:text-4xl">{category.nameAr}</h1>
        {category.description && (
          <p className="mt-2 text-muted-foreground">{category.description}</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          {businesses.length} عمل في هذا التصنيف
        </p>

        <div className="mt-6 flex gap-2">
          <Link href={`/category/${slug}`}>
            <Button variant={sp.sort !== "rating" ? "accent" : "outline"} size="sm">
              الأحدث
            </Button>
          </Link>
          <Link href={`/category/${slug}?sort=rating`}>
            <Button variant={sp.sort === "rating" ? "accent" : "outline"} size="sm">
              الأعلى تقييماً
            </Button>
          </Link>
        </div>

        <div className="mt-8">
          {businesses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                لا توجد أعمال في هذا التصنيف حالياً.
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) return {};
  return {
    title: `${category.nameAr} — دليل النبك`,
    description: category.description ?? `أعمال ${category.nameAr} في مدينة النبك`,
  };
}
