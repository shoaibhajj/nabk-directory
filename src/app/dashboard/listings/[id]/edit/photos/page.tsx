import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WizardStepper } from "@/components/business/WizardStepper";
import { loadWizardListing, computeStepCompletion } from "@/features/businesses/wizard";
import { PhotoUploadForm } from "./upload-form";
import { PhotoCard } from "./photo-card";
import { SubmitButton } from "./submit-button";

export default async function PhotosStepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadWizardListing(id);
  if (!data) notFound();

  const completion = computeStepCompletion(data);
  const allDone = Object.values(completion).every(Boolean);

  return (
    <div className="space-y-6">
      <WizardStepper listingId={id} current="photos" completed={completion} />

      <Card>
        <CardContent className="space-y-2 p-6">
          <h2 className="text-xl font-bold">الخطوة 5 — الصور</h2>
          <p className="text-sm text-muted-foreground">
            ارفع صور العمل (الواجهة، المنتجات، فريق العمل). أول صورة ستكون
            صورة الغلاف. يمكنك إضافة حتى 12 صورة.
          </p>
        </CardContent>
      </Card>

      <PhotoUploadForm id={id} />

      <Card>
        <CardContent className="space-y-3 p-6">
          <h3 className="text-base font-bold">الصور الحالية ({data.mediaFiles.length})</h3>
          {data.mediaFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">لم تُضف أي صورة بعد.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {data.mediaFiles.map((m, idx) => (
                <PhotoCard
                  key={m.id}
                  listingId={id}
                  mediaId={m.id}
                  url={m.url}
                  isCover={idx === 0}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold">جاهز للنشر؟</h3>
              <p className="text-sm text-muted-foreground">
                {allDone
                  ? "اكتملت جميع الخطوات. أرسل العمل للمراجعة من قبل المشرفين."
                  : "يجب إكمال الخطوات الأربع الأولى قبل الإرسال للمراجعة."}
              </p>
              {data.status === "PENDING" && (
                <Badge variant="warning" className="mt-2">قيد المراجعة حالياً</Badge>
              )}
              {data.status === "ACTIVE" && (
                <Badge variant="accent" className="mt-2">منشور — التعديلات تظهر فوراً</Badge>
              )}
            </div>
            <div className="flex gap-3">
              <Link href="/dashboard">
                <Button variant="outline" size="md">العودة</Button>
              </Link>
              <SubmitButton id={id} disabled={!allDone || data.status === "PENDING"} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

