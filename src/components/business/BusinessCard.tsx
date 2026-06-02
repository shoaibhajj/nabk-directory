import Link from "next/link";
import { MapPin, Phone, Star, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { BusinessCardData } from "@/features/businesses/queries";
import { VerifiedBadge } from "./VerifiedBadge";

interface Props {
  business: BusinessCardData;
}

function formatWorkingStatus(workingHours: BusinessCardData["workingHours"]) {
  const now = new Date();
  // 0 = Sunday in JS, but dayOfWeek 0 = Monday in our schema — shift accordingly
  const dayIndex = now.getDay(); // 0-6 (Sun-Sat)
  const schemaDayIndex = dayIndex === 0 ? 6 : dayIndex - 1; // 0 = Mon
  const today = workingHours.find((h) => h.dayOfWeek === schemaDayIndex);
  if (!today) return null;
  if (!today.isOpen) return { open: false, label: "\u0645\u063a\u0644\u0642 \u0627\u0644\u064a\u0648\u0645" };
  if (today.is24Hours) return { open: true, label: "\u0645\u0641\u062a\u0648\u062d 24 \u0633\u0627\u0639\u0629" };
  if (today.openTime && today.closeTime)
    return { open: true, label: `${today.openTime} \u2013 ${today.closeTime}` };
  return { open: true, label: "\u0645\u0641\u062a\u0648\u062d" };
}

export function BusinessCard({ business }: Props) {
  const status = formatWorkingStatus(business.workingHours);
  const firstPhone = business.phones[0]?.number;
  const isVerified = business.verificationStatus === "VERIFIED";

  return (
    <Link href={`/businesses/${business.slug}`} className="group block">
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
        {/* Cover */}
        <div className="relative h-36 bg-muted">
          {/* Category chip */}
          <span className="absolute right-3 top-3 rounded-full bg-background/80 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
            {business.category.nameAr}
          </span>

          {/* Verified badge — top-left */}
          {isVerified && (
            <span className="absolute left-3 top-3">
              <VerifiedBadge size="sm" />
            </span>
          )}
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Name row */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold leading-snug group-hover:text-accent line-clamp-2">
              {business.nameAr}
            </h3>
          </div>

          {/* Meta rows */}
          <div className="space-y-1.5 text-sm text-muted-foreground">
            {firstPhone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span dir="ltr">{firstPhone}</span>
              </div>
            )}

            {status && (
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span
                  className={status.open ? "text-emerald-600" : "text-rose-500"}
                >
                  {status.label}
                </span>
              </div>
            )}

            {business.ratingCount > 0 && (
              <div className="flex items-center gap-2">
                <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                <span>
                  {business.ratingAverage.toFixed(1)}{" "}
                  <span className="text-xs">
                    ({business.ratingCount})
                  </span>
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
