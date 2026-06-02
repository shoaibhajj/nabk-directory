"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface Category {
  slug: string;
  nameAr: string;
}

interface Props {
  categories: Category[];
  currentSearch:   string;
  currentCategory: string;
  currentSort:     "recent" | "rating";
  currentVerified: boolean;
  currentHasPhone: boolean;
}

export function BusinessesFilters({
  categories,
  currentSearch,
  currentCategory,
  currentSort,
  currentVerified,
  currentHasPhone,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const buildUrl = useCallback(
    (overrides: Partial<{
      search:   string;
      category: string;
      sort:     string;
      verified: string;
      hasPhone: string;
    }>) => {
      const p = new URLSearchParams();
      const v = {
        search:   currentSearch,
        category: currentCategory,
        sort:     currentSort === "rating" ? "rating" : "",
        verified: currentVerified ? "1" : "",
        hasPhone: currentHasPhone ? "1" : "",
        ...overrides,
      };
      if (v.search)   p.set("search",   v.search);
      if (v.category) p.set("category", v.category);
      if (v.sort)     p.set("sort",     v.sort);
      if (v.verified) p.set("verified", v.verified);
      if (v.hasPhone) p.set("hasPhone", v.hasPhone);
      return `/businesses${p.size ? `?${p}` : ""}`;
    },
    [currentSearch, currentCategory, currentSort, currentVerified, currentHasPhone],
  );

  const navigate = (url: string) =>
    startTransition(() => router.push(url));

  const hasAnyFilter =
    currentSearch || currentCategory || currentSort === "rating" ||
    currentVerified || currentHasPhone;

  return (
    <aside className="w-full shrink-0 md:w-64">
      <div className="sticky top-24 rounded-xl border border-border bg-card p-5 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Filter className="h-5 w-5 text-accent" />
            تصفية النتائج
          </h2>
          {hasAnyFilter && (
            <button
              onClick={() => navigate("/businesses")}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              مسح الكل
            </button>
          )}
        </div>

        {/* Search */}
        <div className="space-y-2">
          <Label>بحث</Label>
          <div className="relative">
            <input
              type="search"
              defaultValue={currentSearch}
              placeholder="ابحث عن اسم، تخصص..."
              className="h-10 w-full rounded-lg border border-border bg-muted/30 py-2 pl-3 pr-9 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  navigate(buildUrl({ search: (e.target as HTMLInputElement).value }));
                }
              }}
              onBlur={(e) => {
                if (e.target.value !== currentSearch) {
                  navigate(buildUrl({ search: e.target.value }));
                }
              }}
            />
            <svg className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 6.5 6.5a7.5 7.5 0 0 0 10.65 10.65z" />
            </svg>
          </div>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label>التصنيف</Label>
          <div className="relative">
            <select
              value={currentCategory}
              onChange={(e) => navigate(buildUrl({ category: e.target.value }))}
              className="h-10 w-full appearance-none rounded-lg border border-border bg-muted/30 py-2 pl-8 pr-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            >
              <option value="">كل التصنيفات</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.nameAr}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Sort */}
        <div className="space-y-2">
          <Label>الترتيب حسب</Label>
          <div className="relative">
            <select
              value={currentSort}
              onChange={(e) => navigate(buildUrl({ sort: e.target.value === "recent" ? "" : e.target.value }))}
              className="h-10 w-full appearance-none rounded-lg border border-border bg-muted/30 py-2 pl-8 pr-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            >
              <option value="recent">الأحدث</option>
              <option value="rating">الأعلى تقييماً</option>
            </select>
            <svg className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="space-y-4 border-t border-border/50 pt-4">
          {/* Verified */}
          <label className="flex cursor-pointer items-center gap-3">
            <div
              onClick={() => navigate(buildUrl({ verified: currentVerified ? "" : "1" }))}
              className={cn(
                "flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border-2 transition-colors",
                currentVerified
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-background"
              )}
            >
              {currentVerified && (
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className="text-sm font-medium">حسابات موثقة فقط</span>
          </label>

          {/* Has phone */}
          <label className="flex cursor-pointer items-center gap-3">
            <div
              onClick={() => navigate(buildUrl({ hasPhone: currentHasPhone ? "" : "1" }))}
              className={cn(
                "flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border-2 transition-colors",
                currentHasPhone
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-background"
              )}
            >
              {currentHasPhone && (
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className="text-sm font-medium">لديهم رقم هاتف</span>
          </label>
        </div>

      </div>
    </aside>
  );
}
