import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { BusinessCard } from "@/components/business/BusinessCard";
import {
  getActiveBusinesses,
  getCategoriesWithCounts,
} from "@/features/businesses/queries";
import { Filter, Search, BadgeCheck, Phone } from "lucide-react";
import { BusinessesFilters } from "@/components/business/BusinessesFilters";

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?:   string;
    category?: string;
    sort?:     string;
    verified?: string;
    hasPhone?: string;
  }>;
}) {
  const sp = await searchParams;

  const sortValue    = sp.sort     === "rating" ? "rating" : "recent";
  const verifiedOnly = sp.verified === "1";
  const hasPhoneOnly = sp.hasPhone === "1";

  const [businesses, categories] = await Promise.all([
    getActiveBusinesses({
      search:       sp.search,
      categorySlug: sp.category,
      orderBy:      sortValue,
      verifiedOnly,
      hasPhone:     hasPhoneOnly,
    }),
    getCategoriesWithCounts(),
  ]);

  const title = sp.category
    ? (categories.find((c) => c.slug === sp.category)?.nameAr ?? "دليل الأعمال والخدمات")
    : "دليل الأعمال والخدمات";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-8 md:flex-row">

          {/* ─────── Sidebar ─────── */}
          <BusinessesFilters
            categories={categories.map((c) => ({ slug: c.slug, nameAr: c.nameAr }))}
            currentSearch={sp.search ?? ""}
            currentCategory={sp.category ?? ""}
            currentSort={sortValue}
            currentVerified={verifiedOnly}
            currentHasPhone={hasPhoneOnly}
          />

          {/* ─────── Main content ─────── */}
          <main className="min-w-0 flex-1">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-2xl font-bold">{title}</h1>
              <span className="inline-block w-fit rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                {businesses.length} نتيجة
              </span>
            </div>

            {businesses.length === 0 ? (
              <Card>
                <CardContent className="py-20 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="mb-2 text-xl font-bold">لا توجد نتائج</h3>
                  <p className="text-muted-foreground">
                    لم نتمكن من العثور على ما تبحث عنه. جرب تغيير الفلاتر.
                  </p>
                  <Link href="/businesses" className="mt-6 inline-block text-sm text-accent underline">
                    مسح كل الفلاتر
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                {businesses.map((b) => (
                  <BusinessCard key={b.id} business={b} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
