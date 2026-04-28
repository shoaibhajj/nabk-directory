import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe2, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPlacesIndexPage() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/admin");

  const [countryCount, cityCount] = await Promise.all([
    prisma.country.count(),
    prisma.city.count(),
  ]);

  return (
    <section className="container mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold">البلدان والمدن</h1>
      <p className="mt-1 text-muted-foreground">
        إدارة قائمة البلدان والمدن المتاحة في الدليل. الحذف ممنوع إذا كانت
        هناك مدن أو أعمال مرتبطة.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link href="/admin/places/countries" className="group">
          <Card className="transition group-hover:border-primary/40 group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                <Globe2 className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>البلدان</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {countryCount.toLocaleString("ar-EG")} بلد
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                إضافة، تعديل، تفعيل أو حذف البلدان. كل مدينة يجب أن تنتمي إلى
                بلد.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/places/cities" className="group">
          <Card className="transition group-hover:border-primary/40 group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <div className="rounded-full bg-accent/10 p-3 text-accent">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>المدن</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {cityCount.toLocaleString("ar-EG")} مدينة
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                إضافة، تعديل، تفعيل أو حذف المدن. سيتعذّر الحذف إذا كانت
                المدينة مرتبطة بأعمال.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </section>
  );
}
