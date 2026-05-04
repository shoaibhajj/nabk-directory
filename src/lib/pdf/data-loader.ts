/**
 * Loads all data needed for PDF generation from the database.
 * Returns a fully-populated PdfDocumentInput ready for generatePdf().
 *
 * Schema alignment:
 * - BusinessProfile has `mediaFiles` (not `mediaAssets`)
 * - MediaFile has `type` (IMAGE|VIDEO) and `status` — no assetType or isPrimary
 * - Logo is first APPROVED IMAGE in mediaFiles, ordered by displayOrder
 */

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_THEME,
  DEFAULT_MARGINS,
  DEFAULT_LAYOUT,
} from "./types";
import type {
  PdfDocumentInput,
  PdfCategorySection,
  PdfBusiness,
  PdfAdData,
  PdfTheme,
  PdfMargins,
  PdfLayoutConfig,
} from "./types";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://nabk-directory.com";

function resolveAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

export async function loadPdfEditionData(
  editionId: string,
  isPreview = false
): Promise<PdfDocumentInput> {
  // ─ 1. Load edition with all relations ──────────────────────────────────────────────
  const edition = await prisma.pdfEdition.findUniqueOrThrow({
    where: { id: editionId },
    include: {
      city: true,
      categories: {
        orderBy: { displayOrder: "asc" },
        include: { category: true },
      },
      editionAds: {
        where: { ad: { isActive: true } },
        orderBy: { displayOrder: "asc" },
        include: { ad: true },
      },
    },
  });

  // ─ 2. Build category list ───────────────────────────────────────────────────
  const targetCategoryIds =
    edition.generationMode === "SELECTED_CATEGORIES"
      ? edition.categories.map((c) => c.categoryId)
      : undefined;

  // ─ 3. Load businesses ─────────────────────────────────────────────────────────
  // mediaFiles = correct relation name on BusinessProfile
  // Logo = first APPROVED IMAGE ordered by displayOrder
  const businesses = await prisma.businessProfile.findMany({
    where: {
      cityId: edition.cityId,
      status: "ACTIVE",
      deletedAt: null,
      ...(targetCategoryIds ? { categoryId: { in: targetCategoryIds } } : {}),
    },
    include: {
      phoneNumbers: { orderBy: { displayOrder: "asc" } },
      socialLinks: true,
      category: true,
      // First approved image = logo candidate
      mediaFiles: {
        where: { type: "IMAGE", status: "APPROVED" },
        orderBy: { displayOrder: "asc" },
        take: 1,
        select: { url: true },
      },
    },
    orderBy: { nameAr: "asc" },
  });

  // ─ 4. Group by category ─────────────────────────────────────────────────────
  const businessesByCategory = new Map<string, typeof businesses>();
  for (const biz of businesses) {
    const list = businessesByCategory.get(biz.categoryId) ?? [];
    list.push(biz);
    businessesByCategory.set(biz.categoryId, list);
  }

  // ─ 5. Build category configs ──────────────────────────────────────────────────
  const editionCatMap = new Map(
    edition.categories.map((ec) => [ec.categoryId, ec])
  );

  const allCategoryIds = [...businessesByCategory.keys()];

  const extraCategoryIds = allCategoryIds.filter((id) => !editionCatMap.has(id));
  const extraCategories =
    extraCategoryIds.length > 0
      ? await prisma.category.findMany({
          where: { id: { in: extraCategoryIds } },
        })
      : [];

  const categoryMetaMap = new Map([
    ...edition.categories.map((ec) => [ec.categoryId, ec.category] as const),
    ...extraCategories.map((c) => [c.id, c] as const),
  ]);

  const categorySections: PdfCategorySection[] = allCategoryIds
    .filter((id) => (businessesByCategory.get(id)?.length ?? 0) > 0)
    .map((categoryId, idx) => {
      const config = editionCatMap.get(categoryId);
      const meta = categoryMetaMap.get(categoryId)!;
      const bizList = businessesByCategory.get(categoryId) ?? [];

      const mappedBusinesses: PdfBusiness[] = bizList.map((b) => ({
        id: b.id,
        nameAr: b.nameAr,
        nameEn: b.nameEn,
        slug: b.slug,
        addressAr: b.addressAr,
        descriptionAr: b.descriptionAr,
        // Use first approved image as logo candidate
        logoUrl: resolveAssetUrl(b.mediaFiles?.[0]?.url ?? null),
        ratingAverage: b.ratingAverage,
        ratingCount: b.ratingCount,
        phoneNumbers: b.phoneNumbers,
        socialLinks: b.socialLinks,
        categoryNameAr: meta.nameAr,
        cityNameAr: edition.city.nameAr,
        publicUrl: `${SITE_URL}/ar/listing/${b.slug}`,
      }));

      return {
        categoryId,
        nameAr: meta.nameAr,
        nameEn: meta.nameEn,
        icon: meta.icon,
        sectionTitleAr: config?.sectionTitleAr ?? null,
        sectionIntroAr: config?.sectionIntroAr ?? null,
        colorTheme: config?.colorTheme ?? null,
        listingTemplate: config?.listingTemplate ?? "STANDARD",
        sortMode: config?.sortMode ?? "ALPHABETICAL",
        displayOrder: config?.displayOrder ?? idx,
        startOnNewPage: config?.startOnNewPage ?? true,
        businesses: mappedBusinesses,
      };
    })
    .sort((a, b) => a.displayOrder - b.displayOrder);

  // ─ 6. Build ads ────────────────────────────────────────────────────────────
  const ads: PdfAdData[] = edition.editionAds.map((ea) => ({
    id: ea.ad.id,
    titleAr: ea.ad.titleAr,
    advertiserName: ea.ad.advertiserName,
    imageUrl: resolveAssetUrl(ea.ad.imageUrl) ?? "",
    targetUrl: ea.ad.targetUrl,
    phone: ea.ad.phone,
    placementType: ea.ad.placementType,
    priority: ea.ad.priority,
    effectivePlacement: ea.overridePlacement ?? ea.ad.placementType,
  }));

  // ─ 7. Profile blocks ───────────────────────────────────────────────────────
  const websiteProfile = edition.includeWebsiteProfile
    ? await prisma.websiteProfileBlock.findFirst({ where: { isActive: true } })
    : null;

  const developerProfile = edition.includeDeveloperProfile
    ? await prisma.developerProfileBlock.findFirst({ where: { isVisible: true } })
    : null;

  // ─ 8. Parse JSON config blobs ───────────────────────────────────────────────
  const theme: PdfTheme = edition.themeJson
    ? { ...DEFAULT_THEME, ...(edition.themeJson as object) }
    : DEFAULT_THEME;

  const margins: PdfMargins = edition.marginsJson
    ? { ...DEFAULT_MARGINS, ...(edition.marginsJson as object) }
    : DEFAULT_MARGINS;

  const layout: PdfLayoutConfig = edition.layoutJson
    ? { ...DEFAULT_LAYOUT, ...(edition.layoutJson as object) }
    : DEFAULT_LAYOUT;

  // ─ 9. Assemble final input ────────────────────────────────────────────────────
  return {
    editionId: edition.id,
    editionSlug: edition.slug,
    titleAr: edition.titleAr,
    coverTitleAr: edition.coverTitleAr,
    coverSubtitleAr: edition.coverSubtitleAr,
    introTextAr: edition.introTextAr,
    editorialTextAr: edition.editorialTextAr,
    closingTextAr: edition.closingTextAr,
    editionNumber: edition.editionNumber,
    cityNameAr: edition.city.nameAr,
    pageSize: (edition.pageSize as "A4" | "LETTER"),

    includeAlphabeticalIndex: edition.includeAlphabeticalIndex,
    includeBusinessLogos: edition.includeBusinessLogos,
    includeQrCodes: edition.includeQrCodes,
    includeFeaturedBusinesses: edition.includeFeaturedBusinesses,
    includeWebsiteProfile: edition.includeWebsiteProfile,
    includeDeveloperProfile: edition.includeDeveloperProfile,
    showEditionMetadata: edition.showEditionMetadata,
    isPreview,

    categorySections,
    ads,
    websiteProfile,
    developerProfile,

    theme,
    margins,
    layout,
  };
}
