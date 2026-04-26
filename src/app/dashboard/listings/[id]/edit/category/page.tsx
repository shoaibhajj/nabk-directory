import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { WizardStepper } from "@/components/business/WizardStepper";
import { loadWizardListing, computeStepCompletion } from "@/features/businesses/wizard";
import { prisma } from "@/lib/prisma";
import { saveCategoryLocationAction } from "@/features/businesses/mutations";
import { CategoryForm } from "./form";

export default async function CategoryStepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadWizardListing(id);
  if (!data) notFound();
  const action = saveCategoryLocationAction.bind(null, id);

  const [topCategories, allSub, cities] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { displayOrder: "asc" },
      select: { id: true, nameAr: true },
    }),
    prisma.category.findMany({
      where: { isActive: true, parentId: { not: null } },
      orderBy: { displayOrder: "asc" },
      select: { id: true, nameAr: true, parentId: true },
    }),
    prisma.city.findMany({
      where: { isActive: true },
      orderBy: { nameAr: "asc" },
      select: { id: true, nameAr: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <WizardStepper
        listingId={id}
        current="category"
        completed={computeStepCompletion(data)}
      />
      <Card>
        <CardContent className="space-y-2 p-6">
          <h2 className="text-xl font-bold">الخطوة 2 — التصنيف والموقع</h2>
          <p className="text-sm text-muted-foreground">
            اختر القسم المناسب وحدّد المدينة والعنوان وموقع الخريطة (اختياري).
          </p>
        </CardContent>
      </Card>
      <CategoryForm
        id={id}
        action={action}
        initial={{
          categoryId: data.categoryId,
          subcategoryId: data.subcategoryId,
          cityId: data.cityId,
          addressAr: data.addressAr ?? "",
          latitude: data.latitude,
          longitude: data.longitude,
        }}
        topCategories={topCategories}
        subcategories={allSub}
        cities={cities}
      />
    </div>
  );
}
