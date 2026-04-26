import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { WizardStepper } from "@/components/business/WizardStepper";
import { loadWizardListing, computeStepCompletion } from "@/features/businesses/wizard";
import { saveContactAction } from "@/features/businesses/mutations";
import { ContactForm } from "./form";

export default async function ContactStepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadWizardListing(id);
  if (!data) notFound();
  const action = saveContactAction.bind(null, id);

  return (
    <div className="space-y-6">
      <WizardStepper
        listingId={id}
        current="contact"
        completed={computeStepCompletion(data)}
      />
      <Card>
        <CardContent className="space-y-2 p-6">
          <h2 className="text-xl font-bold">الخطوة 3 — التواصل</h2>
          <p className="text-sm text-muted-foreground">
            أضف أرقام الهواتف وحسابات التواصل الاجتماعي. أضف رقماً واحداً على
            الأقل ليتمكن الزوار من التواصل معك.
          </p>
        </CardContent>
      </Card>
      <ContactForm
        id={id}
        action={action}
        initialPhones={data.phoneNumbers.map((p) => ({
          label: p.label,
          number: p.number,
        }))}
        initialSocials={data.socialLinks.map((s) => ({
          platform: s.platform,
          url: s.url,
        }))}
      />
    </div>
  );
}
