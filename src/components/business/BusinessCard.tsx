import Link from "next/link";
import Image from "next/image";
import { Phone, Star, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { BusinessCardData } from "@/features/businesses/queries";
import { VerifiedBadge } from "./VerifiedBadge";
import { getCategoryIcon } from "@/components/business/category-icons";

interface Props {
  business: BusinessCardData;
}

function formatWorkingStatus(workingHours: BusinessCardData["workingHours"]) {
  const now = new Date();
  const dayIndex = now.getDay();
  const schemaDayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  const today = workingHours.find((h) => h.dayOfWeek === schemaDayIndex);
  if (!today) return null;
  if (!today.isOpen) return { open: false, label: "مغلق اليوم" };
  if (today.is24Hours) return { open: true, label: "مفتوح 24 ساعة" };
  if (today.openTime && today.closeTime)
    return { open: true, label: `${today.openTime} – ${today.closeTime}` };
  return { open: true, label: "مفتوح" };
}

export function BusinessCard({ business }: Props) {
  const status = formatWorkingStatus(business.workingHours);
  const firstPhone = business.phones[0]?.number;
  const isVerified = business.verificationStatus === "VERIFIED";
  const coverImage = business.media_files[0]?.url ?? null;
  const CategoryIcon = getCategoryIcon(business.category.slug);

  return (
    <Link href={`/businesses/${business.slug}`} className="group block">
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
        {/* Cover */}
        <div className="relative h-36 bg-muted overflow-hidden">
          {coverImage ? (
            <Image
              src={coverImage}
              alt={business.nameAr}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <CategoryIcon className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}

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
          {/* Name */}
          <h3 className="font-bold leading-snug group-hover:text-accent line-clamp-2">
            {business.nameAr}
          </h3>

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
                <span className={status.open ? "text-emerald-600" : "text-rose-500"}>
                  {status.label}
                </span>
              </div>
            )}

            {business.ratingCount > 0 && (
              <div className="flex items-center gap-2">
                <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                <span>
                  {business.ratingAverage.toFixed(1)}{" "}
                  <span className="text-xs">({business.ratingCount})</span>
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
