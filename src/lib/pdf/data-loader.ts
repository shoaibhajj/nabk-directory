/**
 * Loads all data needed for PDF generation from the database.
 *
 * Ads fix: we load ALL active PdfAd records (not just edition-linked ones).
 * Edition-linked ads (editionAds) take priority and can override placement.
 * Standalone active ads are appended if not already included.
 */

import { prisma } from "@/lib/prisma";
import { DEFAULT_THEME, DEFAULT_MARGINS, DEFAULT_LAYOUT } from "./types";
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

/** Extract plain text from Tiptap JSON */
export function tiptapToPlainText(json: unknown): string {
  if (!json || typeof json !== "object") return String(json ?? "");
  const node = json as { type?: string; text?: string; content?: unknown[] };
  if (node.type === "text") return node.text ?? "";
  if (Array.isArray(node.content)) {
    return node.content
      .map(tiptapToPlainText)
      .join(node.type === "paragraph" ? "\n" : "");
  }
  return "";
}

function parseRichText(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const parsed = JSON.parse(value);
    return tiptapToPlainText(parsed);
  } catch {
    return value.replace(/<[^>]+>/g, "").trim();
  }
}

export async function loadPdfEditionData(
  editionId: string,
  isPreview = false
): Promise<PdfDocumentInput> {
  // ─ 1. Load edition
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

  // ─ 2. City IDs
  let cityIds: string[] = [edition.cityId];
  if (edition.cityIdsJson) {
    try {
      const parsed = JSON.parse(edition.cityIdsJson as string);
      if (Array.isArray(parsed) && parsed.length > 0) cityIds = parsed as string[];
    } catch { /* keep fallback */ }
  }

  // ─ 3. Category filter
  const targetCategoryIds =
    edition.generationMode === "SELECTED_CATEGORIES"
      ? edition.categories.map((c) => c.categoryId)
      : undefined;

  // ─ 4. Businesses
  const businesses = await prisma.businessProfile.findMany({
    where: {
      cityId: cityIds.length === 1 ? cityIds[0] : { in: cityIds },
      status: "ACTIVE",
      deletedAt: null,
      ...(targetCategoryIds ? { categoryId: { in: targetCategoryIds } } : {}),
    },
    include: {
      phones: { orderBy: { displayOrder: "asc" } },
      socialLinks: true,
      category: true,
      media: {
        where: { type: "IMAGE", status: "APPROVED" },
        orderBy: { displayOrder: "asc" },
        take: 1,
        select: { url: true },
      },
    },
    orderBy: { nameAr: "asc" },
  });

  // ─ 5. Group by category
  const businessesByCategory = new Map<string, typeof businesses>();
  for (const biz of businesses) {
    const list = businessesByCategory.get(biz.categoryId) ?? [];
    list.push(biz);
    businessesByCategory.set(biz.categoryId, list);
  }

  // ─ 6. Category configs
  const editionCatMap = new Map(edition.categories.map((ec) => [ec.categoryId, ec]));
  const allCategoryIds = [...businessesByCategory.keys()];
  const extraCategoryIds = allCategoryIds.filter((id) => !editionCatMap.has(id));
  const extraCategories =
    extraCategoryIds.length > 0
      ? await prisma.category.findMany({ where: { id: { in: extraCategoryIds } } })
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
        logoUrl: resolveAssetUrl(b.media?.[0]?.url ?? null),
        ratingAverage: b.ratingAverage,
        ratingCount: b.ratingCount,
        phoneNumbers: b.phones,
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

  // ─ 7. Ads
  const allActiveAds = await prisma.pdfAd.findMany({
    where: { isActive: true },
    orderBy: { priority: "desc" },
  });

  const editionAdMap = new Map(
    edition.editionAds.map((ea) => [
      ea.ad.id,
      {
        id: ea.ad.id,
        titleAr: ea.ad.titleAr,
        advertiserName: ea.ad.titleEn ?? ea.ad.titleAr ,
        imageUrl: resolveAssetUrl(ea.ad.imageUrl) ?? "",
        targetUrl: ea.ad.targetUrl,
        phone: ea.ad.phone,
        placementType: ea.ad.placementType,
        priority: ea.ad.priority,
        effectivePlacement: ea.overridePlacement ?? ea.ad.placementType,
      } as PdfAdData,
    ])
  );

  const ads: PdfAdData[] = [
    ...editionAdMap.values(),
    ...allActiveAds
      .filter((a) => !editionAdMap.has(a.id))
      .map((a) => ({
        id: a.id,
        titleAr: a.titleAr,
        advertiserName: a.advertiserName,
        imageUrl: resolveAssetUrl(a.imageUrl) ?? "",
        targetUrl: a.targetUrl,
        phone: a.phone,
        placementType: a.placementType,
        priority: a.priority,
        effectivePlacement: a.placementType,
      } as PdfAdData)),
  ];

  // ─ 8. Profile blocks
  const websiteProfile = edition.includeWebsiteProfile
    ? await prisma.websiteProfileBlock.findFirst({ where: { isActive: true } })
    : null;
  const developerProfile = edition.includeDeveloperProfile
    ? await prisma.developerProfileBlock.findFirst({ where: { isVisible: true } })
    : null;

  // ─ 9. Config blobs
  const theme: PdfTheme = edition.themeJson
    ? { ...DEFAULT_THEME, ...(edition.themeJson as object) }
    : DEFAULT_THEME;
  const margins: PdfMargins = edition.marginsJson
    ? { ...DEFAULT_MARGINS, ...(edition.marginsJson as object) }
    : DEFAULT_MARGINS;
  const layout: PdfLayoutConfig = edition.layoutJson
    ? { ...DEFAULT_LAYOUT, ...(edition.layoutJson as object) }
    : DEFAULT_LAYOUT;

  // ─ 10. Assemble
  return {
    editionId: edition.id,
    editionSlug: edition.slug,
    titleAr: edition.titleAr,
    coverTitleAr: edition.coverTitleAr,
    coverSubtitleAr: edition.coverSubtitleAr,
    introTextAr:      parseRichText(edition.introTextAr),
    editorialTextAr:  parseRichText(edition.editorialTextAr),
    closingTextAr:    parseRichText(edition.closingTextAr),
    editionNumber: edition.editionNumber,
    cityNameAr: edition.city.nameAr,
    pageSize: edition.pageSize as "A4" | "LETTER",
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
