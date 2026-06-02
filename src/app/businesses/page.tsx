import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BusinessCard } from "@/components/business/BusinessCard";
import {
  getActiveBusinesses,
  getCategoriesWithCounts,
} from "@/features/businesses/queries";
import {
  Search,
  SlidersHorizontal,
  BadgeCheck,
  Phone,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

async function searchAction(formData: FormData) {
  "use server";
  const q = String(formData.get("q") ?? "").trim();
  // preserve other params from hidden inputs
  const category = String(formData.get("category") ?? "").trim();
  const sort     = String(formData.get("sort")     ?? "").trim();
  const verified = String(formData.get("verified") ?? "").trim();
  const hasPhone = String(formData.get("hasPhone") ?? "").trim();

  const params = new URLSearchParams();
  if (q)        params.set("search",   q);
  if (category) params.set("category", category);
  if (sort)     params.set("sort",     sort);
  if (verified) params.set("verified", verified);
  if (hasPhone) params.set("hasPhone", hasPhone);

  redirect(`/businesses${params.size ? `?${params}` : ""}`);
}

function buildHref(
  base: Record<string, string | undefined>,
  override: Record<string, string | undefined>,
) {
  const merged = { ...base, ...override };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v) params.set(k, v);
  }
  return `/businesses${params.size ? `?${params}` : ""}`;
}

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

  const sortValue     = sp.sort     === "rating" ? "rating" : "recent";
  const verifiedOnly  = sp.verified === "1";
  const hasPhoneOnly  = sp.hasPhone === "1";

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

  // base params for building links (preserves search/category/sort/filters)
  const base: Record<string, string | undefined> = {
    search:   sp.search,
    category: sp.category,
    sort:     sp.sort,
    verified: sp.verified,
    hasPhone: sp.hasPhone,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="container mx-auto px-4 py-10">

        {/* ── Page title ── */}
        <h1 className="text-3xl font-bold md:text-4xl">جميع الأعمال</h1>
        <p className="mt-2 text-muted-foreground">
          {sp.search
            ? `نتائج البحث عن "${sp.search}"`
            : "تصفح كافة الأعمال والخدمات في النبك"}
        </p>

        {/* ── Search bar ── */}
        <form action={searchAction} className="mt-6 flex max-w-2xl items-center gap-2 rounded-full bg-card p-2 shadow-card">
          {/* hidden inputs to preserve current filters */}
          <input type="hidden" name="category" value={sp.category ?? ""} />
          <input type="hidden" name="sort"     value={sp.sort     ?? ""} />
          <input type="hidden" name="verified" value={sp.verified ?? ""} />
          <input type="hidden" name="hasPhone" value={sp.hasPhone ?? ""} />

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

        {/* ── Category pills ── */}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href={buildHref(base, { category: undefined })}>
            <span className={cn(
              "inline-block rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              !sp.category
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-foreground hover:bg-secondary"
            )}>
              الكل
            </span>
          </Link>
          {categories.map((c) => (
            <Link key={c.id} href={buildHref(base, { category: c.slug })}>
              <span className={cn(
                "inline-block rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                sp.category === c.slug
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-foreground hover:bg-secondary"
              )}>
                {c.nameAr} ({c._count.listings})
              </span>
            </Link>
          ))}
        </div>

        {/* ── Filter / Sort bar ── */}
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-semibold text-muted-foreground">تصفية:</span>

          {/* Sort toggle */}
          <Link href={buildHref(base, { sort: sortValue === "recent" ? "rating" : "recent" })}>
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
              "border-border bg-muted hover:bg-secondary text-foreground"
            )}>
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortValue === "recent" ? "الأحدث" : "الأعلى تقييماً"}
            </span>
          </Link>

          {/* Verified toggle */}
          <Link href={buildHref(base, { verified: verifiedOnly ? undefined : "1" })}>
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
              verifiedOnly
                ? "border-accent bg-secondary text-accent"
                : "border-border bg-muted hover:bg-secondary text-foreground"
            )}>
              <BadgeCheck className={cn("h-3.5 w-3.5", verifiedOnly && "text-accent")} />
              حسابات موثقة فقط
            </span>
          </Link>

          {/* Has phone toggle */}
          <Link href={buildHref(base, { hasPhone: hasPhoneOnly ? undefined : "1" })}>
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
              hasPhoneOnly
                ? "border-accent bg-secondary text-accent"
                : "border-border bg-muted hover:bg-secondary text-foreground"
            )}>
              <Phone className={cn("h-3.5 w-3.5", hasPhoneOnly && "text-accent")} />
              لديهم رقم هاتف
            </span>
          </Link>

          {/* Active filters count / clear */}
          {(verifiedOnly || hasPhoneOnly || sp.sort) && (
            <Link
              href={buildHref(base, { sort: undefined, verified: undefined, hasPhone: undefined })}
              className="mr-auto text-xs text-muted-foreground underline hover:text-foreground"
            >
              مسح التصفية
            </Link>
          )}

          <span className="mr-auto text-xs text-muted-foreground">
            {businesses.length} نتيجة
          </span>
        </div>

        {/* ── Results grid ── */}
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
