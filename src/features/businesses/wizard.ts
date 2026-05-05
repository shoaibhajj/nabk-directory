import { prisma } from "@/lib/prisma";
import type { WizardStepKey } from "@/components/business/WizardStepper";

export interface WizardListingData {
  id: string;
  ownerId: string;
  status: string;
  nameAr: string;
  nameEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  cityId: string;
  categoryId: string;
  subcategoryId: string | null;
  addressAr: string | null;
  latitude: number | null;
  longitude: number | null;
  phones: { id: string; label: string; number: string }[];
  socialLinks: { id: string; platform: string; url: string }[];
  workingHours: {
    id: string;
    dayOfWeek: number;
    isOpen: boolean;
    is24Hours: boolean;
    openTime: string | null;
    closeTime: string | null;
  }[];
  media_files: {
    id: string;
    url: string;
    storageKey: string;
    type: string;
  }[];
}

export async function loadWizardListing(id: string): Promise<WizardListingData | null> {
  const listing = await prisma.businessProfile.findFirst({
    where: { id, deletedAt: null },
    include: {
      phones: { orderBy: { displayOrder: "asc" } },
      socialLinks: true,
      workingHours: { orderBy: { dayOfWeek: "asc" } },
      media_files: { orderBy: { displayOrder: "asc" } },
    },
  });
  if (!listing) return null;
  return {
    id: listing.id,
    ownerId: listing.ownerId,
    status: listing.status,
    nameAr: listing.nameAr,
    nameEn: listing.nameEn,
    descriptionAr: listing.descriptionAr,
    descriptionEn: listing.descriptionEn,
    cityId: listing.cityId,
    categoryId: listing.categoryId,
    subcategoryId: listing.subcategoryId,
    addressAr: listing.addressAr,
    latitude: listing.latitude,
    longitude: listing.longitude,
    phones: listing.phones,
    socialLinks: listing.socialLinks,
    workingHours: listing.workingHours,
    media_files: listing.media_files,
  };
}

export function computeStepCompletion(
  data: WizardListingData,
): Record<WizardStepKey, boolean> {
  return {
    basics: Boolean(
      data.nameAr && data.nameAr !== "عمل جديد" && data.nameEn && data.nameEn.trim(),
    ),
    category: Boolean(data.categoryId && data.cityId),
    contact: data.phones.length > 0,
    hours: data.workingHours.length > 0,
    photos: data.media_files.length > 0,
  };
}
