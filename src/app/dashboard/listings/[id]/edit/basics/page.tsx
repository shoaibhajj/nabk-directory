import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { WizardStepper } from "@/components/business/WizardStepper";
import { loadWizardListing, computeStepCompletion } from "@/features/businesses/wizard";
import { saveBasicsAction } from "@/features/businesses/mutations";
import { BasicsForm } from "./form";

export default async function BasicsStepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadWizardListing(id);
  if (!data) notFound();
  const action = saveBasicsAction.bind(null, id);

  return (
    <div className="space-y-6">
      <WizardStepper
        listingId={id}
        current="basics"
        completed={computeStepCompletion(data)}
      />
      <Card>
        <CardContent className="space-y-2 p-6">
          <h2 className="text-xl font-bold">الخطوة 1 — الأساسيات</h2>
          <p className="text-sm text-muted-foreground">
            عرّف باسم العمل ووصف موجز يساعد الزوار على فهم ما تقدمه.
          </p>
        </CardContent>
      </Card>
      <BasicsForm
        id={id}
        action={action}
        initial={{
          nameAr: data.nameAr === "عمل جديد" ? "" : data.nameAr,
          nameEn: data.nameEn ?? "",
          descriptionAr: data.descriptionAr ?? "",
          descriptionEn: data.descriptionEn ?? "",
        }}
      />
    </div>
  );
}
