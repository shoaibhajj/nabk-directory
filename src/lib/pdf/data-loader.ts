/**
 * Loads all data needed for PDF generation from the database.
 *
 * Phase 5 changes:
 * - ads array now contains ONLY PdfEditionAd entries (no allActiveAds fallback).
 *   Zero edition ads = zero ads in the PDF. This gives admins full control.
 * - Reads overridePlacement, isActive, pageNumbers, priority from PdfEditionAd.
 * - effectivePlacement = overridePlacement ?? ad.placementType
 * - positionAfterCategoryId forwarded from PdfAd (existing field)
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

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://nabk-directory.com";

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
      editionCategories: {
        orderBy: { displayOrder: "asc" },
        include: { category: true },
      },
      editionAds: {
        // Only active edition-ad entries; the underlying PdfAd.isActive is
        // also checked so we never embed a globally-disabled ad.
        where: { isActive: true, ad: { isActive: true } },
        orderBy: { priority: "asc" },
        include: {
          ad: {
            select: {
              id: true,
              titleAr: true,
              titleEn: true,
              imageUrl: true,
              placementType: true,
              targetUrl: true,
              linkUrl: true,
              phone: true,
              positionAfterCategoryId: true,
            },
          },
        },
      },
    },
  });

  // ─ 2. City IDs
  let cityIds: string[] = [edition.cityId];
  if (edition.cityIdsJson) {
    try {
      const parsed = JSON.parse(edition.cityIdsJson as string);
      if (Array.isArray(parsed) && parsed.length > 0)
        cityIds = parsed as string[];
    } catch {
      /* keep fallback */
    }
  }

  // ─ 3. Category filter
  const targetCategoryIds =
    edition.generationMode === "SELECTED_CATEGORIES"
      ? edition.editionCategories.map((c) => c.categoryId)
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
      media_files: {
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
  const editionCatMap = new Map(
    edition.editionCategories.map((ec) => [ec.categoryId, ec])
  );
  const allCategoryIds = [...businessesByCategory.keys()];
  const extraCategoryIds = allCategoryIds.filter(
    (id) => !editionCatMap.has(id)
  );
  const extraCategories =
    extraCategoryIds.length > 0
      ? await prisma.category.findMany({
          where: { id: { in: extraCategoryIds } },
        })
      : [];

  const categoryMetaMap = new Map([
    ...edition.editionCategories.map(
      (ec) => [ec.categoryId, ec.category] as const
    ),
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
        logoUrl: resolveAssetUrl(b.media_files?.[0]?.url ?? null),
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
        sectionTitleAr:
          ((config as Record<string, unknown> | undefined)
            ?.sectionTitleAr as string) ?? null,
        sectionIntroAr:
          ((config as Record<string, unknown> | undefined)
            ?.sectionIntroAr as string) ?? null,
        colorTheme:
          ((config as Record<string, unknown> | undefined)
            ?.colorTheme as string) ?? null,
        listingTemplate: config?.listingTemplate ?? "STANDARD",
        sortMode: config?.sortMode ?? "ALPHABETICAL",
        displayOrder: config?.displayOrder ?? idx,
        startOnNewPage:
          ((config as Record<string, unknown> | undefined)
            ?.startOnNewPage as boolean) ?? true,
        businesses: mappedBusinesses,
      };
    })
    .sort((a, b) => a.displayOrder - b.displayOrder);

  // ─ 7. Ads — ONLY from PdfEditionAd (no global fallback)
  //
  // Priority source: PdfEditionAd.priority (set by admin via ↑↓ or manual input)
  // effectivePlacement: overridePlacement if set, otherwise ad.placementType
  // pageNumbers: which section indices (0-based) this ad appears in; [] = all
  // isActive: already filtered in the Prisma query above
  const ads: PdfAdData[] = edition.editionAds.map((ea) => ({
    id: ea.ad.id,
    titleAr: ea.ad.titleAr,
    titleEn: ea.ad.titleEn ?? null,
    imageUrl: resolveAssetUrl(ea.ad.imageUrl) ?? "",
    linkUrl: ea.ad.targetUrl ?? ea.ad.linkUrl ?? null,
    phone: ea.ad.phone ?? null,
    placementType: ea.ad.placementType,
    priority: ea.priority,                          // from PdfEditionAd
    effectivePlacement: ea.overridePlacement ?? ea.ad.placementType,
    positionAfterCategoryId:
      (ea.ad as { positionAfterCategoryId?: string | null })
        .positionAfterCategoryId ?? null,
    pageNumbers: ea.pageNumbers as number[],        // [] = all sections
    isActive: ea.isActive,                          // already true (filtered above)
  }));

  // ─ 8. Config blobs
  const theme: PdfTheme = edition.themeJson
    ? { ...DEFAULT_THEME, ...(edition.themeJson as object) }
    : DEFAULT_THEME;
  const margins: PdfMargins = edition.marginsJson
    ? { ...DEFAULT_MARGINS, ...(edition.marginsJson as object) }
    : DEFAULT_MARGINS;
  const layout: PdfLayoutConfig = edition.layoutJson
    ? { ...DEFAULT_LAYOUT, ...(edition.layoutJson as object) }
    : DEFAULT_LAYOUT;

  // ─ 9. Assemble
  return {
    editionId: edition.id,
    editionSlug: edition.slug,
    titleAr: edition.titleAr,
    coverTitleAr: edition.coverTitleAr,
    coverSubtitleAr: edition.coverSubtitleAr,
    introTextAr: parseRichText(edition.introTextAr),
    editorialTextAr: parseRichText(edition.editorialTextAr),
    closingTextAr: parseRichText(edition.closingTextAr),
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
    websiteProfile: null,
    developerProfile: null,
    theme,
    margins,
    layout,
  };
}
