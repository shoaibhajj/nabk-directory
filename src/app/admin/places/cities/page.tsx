import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CitiesAdminClient } from "./client";

export const dynamic = "force-dynamic";

export default async function CitiesAdminPage() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/admin");

  const [cities, countries] = await Promise.all([
    prisma.city.findMany({
      orderBy: [{ isActive: "desc" }, { nameAr: "asc" }],
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        slug: true,
        isActive: true,
        countryId: true,
        country: { select: { nameAr: true } },
        _count: {
          select: { listings: { where: { deletedAt: null } } },
        },
      },
    }),
    prisma.country.findMany({
      where: { isActive: true },
      orderBy: { nameAr: "asc" },
      select: { id: true, nameAr: true },
    }),
  ]);

  return (
    <section className="container mx-auto px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">المدن</h1>
          <p className="text-sm text-muted-foreground">
            {cities.length.toLocaleString("ar-EG")} مدينة في الدليل
          </p>
        </div>
      </div>

      {countries.length === 0 ? (
        <Card className="mb-8 border-destructive/40 bg-destructive/5">
          <CardContent className="py-6 text-center text-sm text-destructive">
            يجب إضافة بلد واحد على الأقل قبل إنشاء مدن.
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-bold">إضافة مدينة جديدة</h2>
            <CitiesAdminClient mode="create" countries={countries} />
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {cities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              لا يوجد مدن بعد.
            </CardContent>
          </Card>
        ) : (
          cities.map((c) => (
            <Card key={c.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold">{c.nameAr}</h3>
                      <span className="text-sm text-muted-foreground" dir="ltr">
                        {c.nameEn}
                      </span>
                      <Badge variant={c.isActive ? "default" : "outline"}>
                        {c.isActive ? "مفعّل" : "معطّل"}
                      </Badge>
                      <Badge variant="accent">
                        {c.country?.nameAr ?? "بدون بلد"}
                      </Badge>
                      <Badge variant="outline">
                        {c._count.listings.toLocaleString("ar-EG")} عمل
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground" dir="ltr">
                      /{c.slug}
                    </div>
                  </div>
                  <CitiesAdminClient
                    mode="edit"
                    countries={countries}
                    initial={{
                      id: c.id,
                      nameAr: c.nameAr,
                      nameEn: c.nameEn,
                      slug: c.slug,
                      isActive: c.isActive,
                      countryId: c.countryId ?? "",
                      listingCount: c._count.listings,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </section>
  );
}
