import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, Clock, Star } from "lucide-react";
import { isOpenNow } from "@/lib/working-hours";
import { getCategoryIcon } from "@/components/business/category-icons";
import type { BusinessProfile, Category, PhoneNumber, WorkingHours } from "@prisma/client";

type CardData = BusinessProfile & {
  category: Category;
  phoneNumbers: PhoneNumber[];
  workingHours: WorkingHours[];
};

export function BusinessCard({ business }: { business: CardData }) {
  const status = isOpenNow(business.workingHours);
  const phone = business.phoneNumbers[0]?.number;
  const CategoryIcon = getCategoryIcon(business.category.slug);

  return (
    <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lg">
      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link
              href={`/businesses/${business.slug}`}
              className="text-lg font-bold text-foreground hover:text-accent line-clamp-1"
            >
              {business.nameAr}
            </Link>
            <Link
              href={`/category/${business.category.slug}`}
              className="mt-1 inline-flex"
            >
              <Badge variant="default">{business.category.nameAr}</Badge>
            </Link>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-accent">
              <CategoryIcon className="h-5 w-5" />
            </div>
            {business.ratingCount > 0 && (
              <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5">
                <Star className="h-3.5 w-3.5 fill-[var(--color-star)] text-[var(--color-star)]" />
                <span className="text-xs font-bold">{business.ratingAverage.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        {business.descriptionAr && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {business.descriptionAr}
          </p>
        )}

        <div className="space-y-1.5 text-xs text-muted-foreground">
          {business.addressAr && (
            <div className="flex items-start gap-1.5">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-1">{business.addressAr}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <a href={`tel:${phone}`} dir="ltr" className="hover:text-accent">
                {phone}
              </a>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {status.open ? (
              <span className="text-[var(--color-accent)] font-semibold">
                مفتوح الآن{status.closeTime ? ` حتى ${status.closeTime}` : ""}
              </span>
            ) : (
              <span>مغلق الآن</span>
            )}
          </div>
        </div>

        <div className="mt-auto pt-3">
          <Link href={`/businesses/${business.slug}`} className="block">
            <Button variant="accent" size="sm" className="w-full">
              التفاصيل
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
