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
  phoneNumbers: { id: string; label: string; number: string }[];
  socialLinks: { id: string; platform: string; url: string }[];
  workingHours: {
    id: string;
    dayOfWeek: number;
    isOpen: boolean;
    is24Hours: boolean;
    openTime: string | null;
    closeTime: string | null;
  }[];
  mediaFiles: {
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
      phoneNumbers: { orderBy: { displayOrder: "asc" } },
      socialLinks: true,
      workingHours: { orderBy: { dayOfWeek: "asc" } },
      mediaFiles: { orderBy: { displayOrder: "asc" } },
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
    phoneNumbers: listing.phoneNumbers,
    socialLinks: listing.socialLinks,
    workingHours: listing.workingHours,
    mediaFiles: listing.mediaFiles,
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
    contact: data.phoneNumbers.length > 0,
    hours: data.workingHours.length > 0,
    photos: data.mediaFiles.length > 0,
  };
}
