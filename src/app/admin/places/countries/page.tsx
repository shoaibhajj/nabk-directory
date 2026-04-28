import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CountriesAdminClient } from "./client";

export const dynamic = "force-dynamic";

export default async function CountriesAdminPage() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/admin");

  const countries = await prisma.country.findMany({
    orderBy: [{ isActive: "desc" }, { nameAr: "asc" }],
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
      slug: true,
      isActive: true,
      _count: { select: { cities: true } },
    },
  });

  return (
    <section className="container mx-auto px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">البلدان</h1>
          <p className="text-sm text-muted-foreground">
            {countries.length.toLocaleString("ar-EG")} بلد في الدليل
          </p>
        </div>
      </div>

      <Card className="mb-8">
        <CardContent className="p-6">
          <h2 className="mb-4 text-lg font-bold">إضافة بلد جديد</h2>
          <CountriesAdminClient mode="create" />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {countries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              لا يوجد بلدان بعد.
            </CardContent>
          </Card>
        ) : (
          countries.map((c) => (
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
                        {c._count.cities.toLocaleString("ar-EG")} مدينة
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground" dir="ltr">
                      /{c.slug}
                    </div>
                  </div>
                  <CountriesAdminClient
                    mode="edit"
                    initial={{
                      id: c.id,
                      nameAr: c.nameAr,
                      nameEn: c.nameEn,
                      slug: c.slug,
                      isActive: c.isActive,
                      cityCount: c._count.cities,
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
