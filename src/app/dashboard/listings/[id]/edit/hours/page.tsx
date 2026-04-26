import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { WizardStepper } from "@/components/business/WizardStepper";
import { loadWizardListing, computeStepCompletion } from "@/features/businesses/wizard";
import { saveWorkingHoursAction } from "@/features/businesses/mutations";
import { HoursForm } from "./form";

export default async function HoursStepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadWizardListing(id);
  if (!data) notFound();
  const action = saveWorkingHoursAction.bind(null, id);

  const initial = Array.from({ length: 7 }, (_, day) => {
    const existing = data.workingHours.find((w) => w.dayOfWeek === day);
    return {
      dayOfWeek: day,
      isOpen: existing?.isOpen ?? true,
      is24Hours: existing?.is24Hours ?? false,
      openTime: existing?.openTime ?? "09:00",
      closeTime: existing?.closeTime ?? "21:00",
    };
  });

  return (
    <div className="space-y-6">
      <WizardStepper
        listingId={id}
        current="hours"
        completed={computeStepCompletion(data)}
      />
      <Card>
        <CardContent className="space-y-2 p-6">
          <h2 className="text-xl font-bold">الخطوة 4 — ساعات العمل</h2>
          <p className="text-sm text-muted-foreground">
            حدّد ساعات العمل لكل يوم من أيام الأسبوع. يمكنك تعليم اليوم كمغلق
            أو مفتوح 24 ساعة.
          </p>
        </CardContent>
      </Card>
      <HoursForm id={id} action={action} initial={initial} />
    </div>
  );
}
