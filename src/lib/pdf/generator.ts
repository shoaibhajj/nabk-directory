/**
 * PDF Generation Engine for دليل النبك.
 *
 * ## Ad placement overview
 *
 * | Placement           | Behaviour                                              |
 * |---------------------|--------------------------------------------------------|
 * | FULL_PAGE           | Standalone page (full-bleed image)                     |
 * | HALF_PAGE_TOP/BOTTOM| Inline inside CategorySectionPage (top / bottom)       |
 * | SIDEBAR_LEFT/RIGHT  | 2-column layout: businesses | stacked ad strips          |
 * | HEADER_BANNER       | Thin banner at top of section page                     |
 * | FOOTER_BANNER       | Thin banner at bottom of section page                  |
 * | CATEGORY_SPONSOR    | Sponsor badge in the section header                    |
 *
 * ## pageNumbers field — how it works (IMPORTANT)
 *
 * `pageNumbers` on a PdfEditionAd stores the **real 1-based PDF page numbers**
 * where the ad should appear — exactly the numbers printed at the bottom of
 * each page in the generated PDF.
 *
 * Examples:
 *   []        → show in ALL applicable pages (round-robin / every-2-sections)
 *   [5]       → show only when the section content page == 5
 *   [5, 11]   → show only when the section content page is 5 OR 11
 *
 * PDF page structure (for reference):
 *   Page 1            = Cover
 *   Page 2            = Intro  (only when hasIntro = true, else skip)
 *   Page 2 or 3       = Fihris
 *   Then per section (alphabetically sorted):
 *     page N   = Divider page
 *     page N+1 = Content page  ← this is the page number to target
 *
 * The generator builds a pageMap (sectionIdx → contentPageNumber) and uses it
 * inside adAllowedInSection so the admin enters real PDF page numbers, not
 * abstract section indices.
 *
 * ## Other notes
 * - Images: fetched + resized via Sharp (no cropping, mozjpeg compression).
 * - QR code: clickable Link → business.publicUrl, positioned on LEFT (RTL).
 * - Business logo (media_files image) removed from card entirely.
 * - adHalfBlock / adBannerBlock wrapped in fixed-height Views.
 * - Round-robin counters advance unconditionally so ads rotate across ALL sections.
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  Link,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import QRCode from "qrcode";
import { registerFonts } from "./fonts";
import { fetchAndResizeImage } from "./image-utils";
import type {
  PdfDocumentInput,
  PdfCategorySection,
  PdfBusiness,
  PdfAdData,
  PdfTheme,
  PdfMargins,
  PdfLayoutConfig,
  PdfWebsiteProfile,
  PdfDeveloperProfile,
  GenerationResult,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_INNER_W = 515;
const SIDEBAR_W = 130;

// ─────────────────────────────────────────────────────────────────────────────
// Category icon map
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  "ميكانيك وسيارات": "🚗",
  "مطاعم وكافيهات": "🍽️",
  "صيدليات": "💊",
  "عيادات وأطباء": "🏥",
  "سوبر ماركت": "🛒",
  "صالونات وحلاقة": "✂️",
  "بناء وإكساء": "🏗️",
  "إلكترونيات": "📱",
  "ألبسة": "👔",
  "مكاتب": "🏢",
  "مواصلات ونقليات": "🚌",
  "تعليم ومعاهد": "📚",
  "مجوهرات": "💍",
  "أدوات منزلية": "🏠",
  "مخابز وحلويات": "🍞",
  "خدمات": "🔧",
};

function getCategoryIcon(nameAr: string): string {
  if (CATEGORY_ICONS[nameAr]) return CATEGORY_ICONS[nameAr];
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (nameAr.includes(key) || key.includes(nameAr)) return icon;
  }
  return "📋";
}

// ─────────────────────────────────────────────────────────────────────────────
// QR helper
// ─────────────────────────────────────────────────────────────────────────────

async function buildQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 120,
    color: { dark: "#1a1a1a", light: "#ffffff" },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Ad link helpers
// ─────────────────────────────────────────────────────────────────────────────

function getAdHref(ad: PdfAdData): string | null {
  if (ad.linkUrl?.trim()) return ad.linkUrl.trim();
  const phone = (ad as PdfAdData & { phone?: string | null }).phone;
  if (phone?.trim()) return `tel:${phone.trim()}`;
  return null;
}

function wrapWithLink(
  href: string | null,
  child: React.ReactNode,
  style?: unknown,
) {
  if (!href) return child;
  return React.createElement(Link, { src: href, style }, child);
}

// ─────────────────────────────────────────────────────────────────────────────
// Ad placement classification
// ─────────────────────────────────────────────────────────────────────────────

function isStandalonePage(placement: string): boolean {
  return placement === "FULL_PAGE";
}

function isInlinePlacement(placement: string): boolean {
  return [
    "SIDEBAR_LEFT",
    "SIDEBAR_RIGHT",
    "HEADER_BANNER",
    "FOOTER_BANNER",
    "CATEGORY_SPONSOR",
    "HALF_PAGE_TOP",
    "HALF_PAGE_BOTTOM",
  ].includes(placement);
}

// ─────────────────────────────────────────────────────────────────────────────
// buildPageMap — maps sectionIdx (0-based) → content page number (1-based PDF)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the physical PDF page number for each section's CONTENT page.
 *
 * Structure:
 *   Page 1        = Cover
 *   Page 2        = Intro (only when hasIntro = true)
 *   Page 2 or 3   = Fihris
 *   Per section:
 *     pageN   = Divider
 *     pageN+1 = Content  ← this is what we store
 */
function buildPageMap(
  sectionsCount: number,
  hasIntro: boolean,
): Map<number, number> {
  // First page after cover + optional intro + fihris
  let pageCounter = hasIntro ? 3 : 2;
  const map = new Map<number, number>();
  for (let i = 0; i < sectionsCount; i++) {
    pageCounter++;                     // divider page
    const contentPage = ++pageCounter; // content page
    map.set(i, contentPage);
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// adAllowedInSection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Decides whether an ad should appear in a given section.
 *
 * `pageNumbers` stores real 1-based PDF page numbers entered by the admin.
 * We look up the content page for the current section from `pageMap` and
 * check if it matches any of the requested page numbers.
 *
 * - Empty array ([]): show in ALL sections — no restriction.
 * - [5]            : show only in the section whose content page == 5.
 * - [5, 11]        : show in sections whose content page is 5 or 11.
 *
 * @param ad          The ad to check.
 * @param sectionIdx  Zero-based index of the current section in the sorted array.
 * @param pageMap     Map from sectionIdx → content page number.
 */
function adAllowedInSection(
  ad: PdfAdData,
  sectionIdx: number,
  pageMap: Map<number, number>,
): boolean {
  // No restriction — show everywhere.
  if (!ad.pageNumbers || ad.pageNumbers.length === 0) return true;

  const contentPage = pageMap.get(sectionIdx);
  if (contentPage === undefined) return false;

  // Coerce every entry to a finite positive integer.
  const targetPages = ad.pageNumbers
    .map(Number)
    .filter((n) => Number.isFinite(n) && n >= 1);

  // If all entries were invalid, treat as unrestricted.
  if (targetPages.length === 0) return true;

  return targetPages.includes(contentPage);
}

// ─────────────────────────────────────────────────────────────────────────────
// Image cache
// ─────────────────────────────────────────────────────────────────────────────

type ImageCache = Map<string, string | null>;

const AD_IMAGE_SIZES: Record<string, { w: number; h: number }> = {
  FULL_PAGE:        { w: 595,           h: 842 },
  HALF_PAGE_TOP:    { w: PAGE_INNER_W,  h: 180 },
  HALF_PAGE_BOTTOM: { w: PAGE_INNER_W,  h: 180 },
  HEADER_BANNER:    { w: PAGE_INNER_W,  h: 80  },
  FOOTER_BANNER:    { w: PAGE_INNER_W,  h: 80  },
  SIDEBAR_LEFT:     { w: SIDEBAR_W * 2, h: 400 },
  SIDEBAR_RIGHT:    { w: SIDEBAR_W * 2, h: 400 },
  CATEGORY_SPONSOR: { w: 120,           h: 40  },
};

async function buildImageCache(ads: PdfAdData[]): Promise<ImageCache> {
  const cache: ImageCache = new Map();
  await Promise.all(
    ads
      .filter((ad) => !!ad.imageUrl)
      .map(async (ad) => {
        if (cache.has(ad.imageUrl)) return;
        const dims =
          AD_IMAGE_SIZES[ad.effectivePlacement] ?? { w: PAGE_INNER_W, h: 300 };
        const dataUri = await fetchAndResizeImage(
          ad.imageUrl,
          dims.w,
          dims.h,
          { background: { r: 255, g: 255, b: 255, alpha: 1 }, quality: 82 },
        );
        cache.set(ad.imageUrl, dataUri);
        if (!dataUri) {
          console.warn(
            `[generator] Could not load image for ad "${ad.titleAr}" (${ad.imageUrl})`,
          );
        }
      }),
  );
  return cache;
}

function resolveAdImage(ad: PdfAdData, cache: ImageCache): string | null {
  if (!ad.imageUrl) return null;
  return cache.get(ad.imageUrl) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Index entries (page numbers shown in the Fihris page)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the physical PDF page number for each section so that the
 * Fihris (index) page shows accurate page numbers.
 *
 * This is kept separate from buildPageMap so the Fihris component can use
 * extra metadata (icon, businesses list) without coupling to the ad logic.
 */
function buildIndexEntries(
  sections: PdfCategorySection[],
  hasIntro: boolean,
) {
  let pageCounter = hasIntro ? 3 : 2;

  return sections.map((sec, idx) => {
    pageCounter++;                    // divider page
    const contentPage = ++pageCounter; // content page
    return {
      categoryId: sec.categoryId,
      nameAr: sec.nameAr,
      icon: sec.icon ?? getCategoryIcon(sec.nameAr),
      contentPage,
      businesses: sec.businesses.map((b) => ({
        id: b.id,
        nameAr: b.nameAr,
        page: contentPage,
      })),
      sectionIdx: idx,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Style factory
// ─────────────────────────────────────────────────────────────────────────────

function makeStyles(theme: PdfTheme, margins: PdfMargins) {
  return StyleSheet.create({
    page: {
      fontFamily: "Cairo",
      backgroundColor: theme.bgColor,
      paddingTop: margins.top,
      paddingBottom: margins.bottom + 20,
      paddingLeft: margins.left,
      paddingRight: margins.right,
      direction: "rtl" as never,
    },
    coverPage: {
      fontFamily: "Cairo",
      backgroundColor: theme.primaryColor,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
    },
    adStandalonePage: {
      fontFamily: "Cairo",
      backgroundColor: "#ffffff",
      padding: 0,
    },
    coverTitle: {
      fontFamily: "Cairo",
      fontSize: 36,
      fontWeight: 700,
      color: "#ffffff",
      textAlign: "center",
      marginBottom: 12,
      direction: "rtl" as never,
    },
    coverSubtitle: {
      fontFamily: "Cairo",
      fontSize: 18,
      fontWeight: 300,
      color: "rgba(255,255,255,0.85)",
      textAlign: "center",
      marginBottom: 32,
      direction: "rtl" as never,
    },
    coverMeta: {
      fontFamily: "Cairo",
      fontSize: 12,
      color: "rgba(255,255,255,0.65)",
      textAlign: "center",
      direction: "rtl" as never,
    },
    coverDivider: {
      width: 60,
      height: 3,
      backgroundColor: theme.accentColor,
      marginVertical: 20,
    },
    dividerPage: {
      fontFamily: "Cairo",
      backgroundColor: theme.primaryColor,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
    },
    dividerIcon:  { fontSize: 64, marginBottom: 24, textAlign: "center" },
    dividerTitle: {
      fontFamily: "Cairo",
      fontSize: 42,
      fontWeight: 700,
      color: "#ffffff",
      textAlign: "center",
      direction: "rtl" as never,
      marginBottom: 16,
    },
    dividerAccentBar: {
      width: 80,
      height: 4,
      backgroundColor: theme.accentColor,
      borderRadius: 2,
    },
    sectionHeader: {
      backgroundColor: theme.primaryColor,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginBottom: 12,
      borderRadius: 4,
    },
    sectionHeaderText: {
      fontFamily: "Cairo",
      fontSize: 16,
      fontWeight: 700,
      color: "#ffffff",
      textAlign: "right",
      direction: "rtl" as never,
    },
    sectionIntro: {
      fontFamily: "Cairo",
      fontSize: 10,
      color: theme.mutedColor,
      textAlign: "right",
      direction: "rtl" as never,
      marginBottom: 10,
      lineHeight: 1.6,
    },
    businessCard: {
      borderWidth: 1,
      borderColor: theme.borderColor,
      borderRadius: 6,
      padding: 10,
      marginBottom: 8,
      backgroundColor: theme.bgColor,
    },
    businessName: {
      fontFamily: "Cairo",
      fontSize: 13,
      fontWeight: 700,
      color: theme.textColor,
      textAlign: "right",
      direction: "rtl" as never,
      marginBottom: 3,
    },
    businessAddress: {
      fontFamily: "Cairo",
      fontSize: 9,
      color: theme.mutedColor,
      textAlign: "right",
      direction: "rtl" as never,
      marginBottom: 4,
    },
    businessDescription: {
      fontFamily: "Cairo",
      fontSize: 9,
      color: theme.textColor,
      textAlign: "right",
      direction: "rtl" as never,
      lineHeight: 1.5,
      marginBottom: 6,
    },
    phoneRow: {
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      gap: 6,
      marginBottom: 4,
    },
    phoneChip: {
      backgroundColor: theme.sectionBgColor,
      borderRadius: 4,
      paddingVertical: 2,
      paddingHorizontal: 6,
    },
    phoneText: {
      fontFamily: "Cairo",
      fontSize: 9,
      color: theme.textColor,
      direction: "ltr" as never,
    },
    denseGrid: {
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    denseCard: {
      width: "48%",
      borderWidth: 1,
      borderColor: theme.borderColor,
      borderRadius: 4,
      padding: 7,
      marginBottom: 6,
      backgroundColor: theme.bgColor,
    },
    qrContainer: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    qrImage:   { width: 60, height: 60 },
    qrHint: {
      fontFamily: "Cairo",
      fontSize: 8,
      color: theme.primaryColor,
      textAlign: "center",
      direction: "rtl" as never,
      marginTop: 4,
      lineHeight: 1.4,
    },
    businessInfo: { flex: 1, paddingLeft: 8 },
    adFullPage: {
      width: "100%",
      height: "100%",
      objectFit: "contain",
    },
    adHalfWrapper: {
      width: "100%",
      height: 180,
      marginVertical: 8,
    },
    adHalfBlock: {
      width: "100%",
      height: 180,
      objectFit: "contain",
    },
    adSidebarCol: {
      width: SIDEBAR_W,
      flexShrink: 0,
      borderLeftWidth: 1,
      borderLeftColor: theme.borderColor,
      paddingLeft: 4,
      display: "flex",
      flexDirection: "column",
      alignItems: "stretch",
      alignSelf: "stretch",
      gap: 6,
    },
    adSidebarImg: {
      width: "100%",
      height: 160,
      maxHeight: 160,
      objectFit: "contain",
    },
    adSidebarText: {
      fontFamily: "Cairo",
      fontSize: 8,
      color: theme.textColor,
      textAlign: "center",
      direction: "rtl" as never,
      marginTop: 4,
      flexShrink: 0,
    },
    adBannerWrapper: {
      width: "100%",
      height: 80,
      marginBottom: 6,
      borderRadius: 4,
      backgroundColor: theme.sectionBgColor,
      overflow: "hidden" as never,
    },
    adBannerBlock: {
      width: "100%",
      height: 80,
      maxHeight: 80,
      overflow: "hidden" as never,
      backgroundColor: theme.sectionBgColor,
      borderRadius: 4,
      marginBottom: 6,
    },
    adBannerImg: {
      width: "100%",
      height: 80,
      objectFit: "cover",
    },
    adBannerText: {
      fontFamily: "Cairo",
      fontSize: 11,
      color: theme.primaryColor,
      textAlign: "center",
      direction: "rtl" as never,
      marginTop: 28,
    },
    adSponsorBadge: {
      backgroundColor: theme.accentColor,
      borderRadius: 4,
      paddingVertical: 3,
      paddingHorizontal: 8,
      alignSelf: "flex-start",
    },
    adSponsorText: {
      fontFamily: "Cairo",
      fontSize: 8,
      color: "#ffffff",
      direction: "rtl" as never,
    },
    adTextCard: {
      borderWidth: 1,
      borderColor: theme.primaryColor,
      borderRadius: 8,
      padding: 20,
      marginVertical: 10,
      backgroundColor: theme.sectionBgColor,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      flexGrow: 1,
    },
    adTextTitle: {
      fontFamily: "Cairo",
      fontSize: 16,
      fontWeight: 700,
      color: theme.primaryColor,
      textAlign: "center",
      direction: "rtl" as never,
      marginBottom: 6,
    },
    adTextBody: {
      fontFamily: "Cairo",
      fontSize: 11,
      color: theme.textColor,
      textAlign: "center",
      direction: "rtl" as never,
    },
    adTextPhone: {
      fontFamily: "Cairo",
      fontSize: 12,
      color: theme.accentColor,
      textAlign: "center",
      direction: "ltr" as never,
      marginTop: 8,
    },
    profileBlock: {
      borderWidth: 1,
      borderColor: theme.borderColor,
      borderRadius: 8,
      padding: 16,
      marginTop: 12,
      backgroundColor: theme.sectionBgColor,
    },
    profileTitle: {
      fontFamily: "Cairo",
      fontSize: 14,
      fontWeight: 700,
      color: theme.primaryColor,
      textAlign: "right",
      direction: "rtl" as never,
      marginBottom: 8,
    },
    profileBody: {
      fontFamily: "Cairo",
      fontSize: 10,
      color: theme.textColor,
      textAlign: "right",
      direction: "rtl" as never,
      lineHeight: 1.6,
    },
    profileMeta: {
      fontFamily: "Cairo",
      fontSize: 9,
      color: theme.mutedColor,
      textAlign: "right",
      direction: "rtl" as never,
      marginTop: 4,
    },
    indexTitle: {
      fontFamily: "Cairo",
      fontSize: 22,
      fontWeight: 700,
      color: theme.primaryColor,
      textAlign: "right",
      direction: "rtl" as never,
      marginBottom: 16,
    },
    indexCategoryRow: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: theme.sectionBgColor,
      paddingVertical: 7,
      paddingHorizontal: 10,
      marginTop: 8,
      marginBottom: 2,
      borderRadius: 4,
      borderRightWidth: 4,
      borderRightColor: theme.primaryColor,
    },
    indexRowInner: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
    },
    indexCategoryName: {
      fontFamily: "Cairo",
      fontSize: 12,
      fontWeight: 700,
      color: theme.primaryColor,
      direction: "rtl" as never,
      flex: 1,
      textAlign: "right",
    },
    indexPageNum: {
      fontFamily: "Cairo",
      fontSize: 10,
      color: theme.primaryColor,
      fontWeight: 700,
      direction: "ltr" as never,
      minWidth: 22,
      textAlign: "right",
      marginLeft: 8,
    },
    indexBusinessRow: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 3,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderColor,
    },
    indexBusinessName: {
      fontFamily: "Cairo",
      fontSize: 10,
      color: theme.textColor,
      direction: "rtl" as never,
      flex: 1,
      textAlign: "right",
    },
    indexBusinessPageNum: {
      fontFamily: "Cairo",
      fontSize: 9,
      color: theme.mutedColor,
      direction: "ltr" as never,
      minWidth: 22,
      textAlign: "right",
      marginLeft: 8,
    },
    pageNumber: {
      position: "absolute",
      bottom: 10,
      left: 0,
      right: 0,
      textAlign: "center",
      fontFamily: "Cairo",
      fontSize: 9,
      color: theme.mutedColor,
    },
    watermark: {
      position: "absolute",
      top: "40%",
      left: 0,
      right: 0,
      textAlign: "center",
      fontFamily: "Cairo",
      fontSize: 48,
      color: "rgba(0,0,0,0.06)",
      fontWeight: 700,
      transform: "rotate(-35deg)",
    },
    introText: {
      fontFamily: "Cairo",
      fontSize: 11,
      color: theme.textColor,
      textAlign: "right",
      direction: "rtl" as never,
      lineHeight: 1.8,
      marginBottom: 20,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline ad elements
// ─────────────────────────────────────────────────────────────────────────────

function AdBannerElement({
  ad,
  dataUri,
  styles,
}: {
  ad: PdfAdData;
  dataUri: string | null;
  styles: ReturnType<typeof makeStyles>;
}) {
  const href = getAdHref(ad);
  const inner = React.createElement(
    View,
    { style: styles.adBannerWrapper },
    dataUri
      ? React.createElement(Image, { src: dataUri, style: styles.adBannerImg })
      : React.createElement(Text, { style: styles.adBannerText }, ad.titleAr),
  );
  return wrapWithLink(href, inner, { width: "100%" });
}

function AdSidebarElement({
  ads,
  styles,
  imageCache,
}: {
  ads: PdfAdData[];
  styles: ReturnType<typeof makeStyles>;
  imageCache: ImageCache;
}) {
  return React.createElement(
    View,
    { style: styles.adSidebarCol },
    ...ads.map((ad) => {
      const href = getAdHref(ad);
      const dataUri = resolveAdImage(ad, imageCache);
      const content = dataUri
        ? React.createElement(Image, { src: dataUri, style: styles.adSidebarImg })
        : React.createElement(Text, { style: styles.adSidebarText }, ad.titleAr);
      return wrapWithLink(href, content, { width: "100%" });
    }),
  );
}

function AdSponsorBadge({
  ad,
  styles,
}: {
  ad: PdfAdData;
  styles: ReturnType<typeof makeStyles>;
}) {
  return React.createElement(
    View,
    { style: styles.adSponsorBadge },
    React.createElement(
      Text,
      { style: styles.adSponsorText },
      `راعي: ${ad.titleEn ?? ad.titleAr}`,
    ),
  );
}

function AdHalfPageBlock({
  ad,
  dataUri,
  styles,
}: {
  ad: PdfAdData;
  dataUri: string | null;
  styles: ReturnType<typeof makeStyles>;
}) {
  const href = getAdHref(ad);
  const imageNode = dataUri
    ? React.createElement(
        View,
        { style: styles.adHalfWrapper },
        React.createElement(Image, { src: dataUri, style: styles.adHalfBlock }),
      )
    : React.createElement(
        View,
        { style: [styles.adTextCard, { height: 180 }] },
        React.createElement(Text, { style: styles.adTextTitle }, ad.titleAr),
        React.createElement(
          Text,
          { style: styles.adTextBody },
          ad.titleEn ?? ad.titleAr,
        ),
      );
  return React.createElement(
    View,
    { style: { width: "100%", marginVertical: 8 } },
    wrapWithLink(href, imageNode, { width: "100%" }),
  );
}

function StandaloneAdPage({
  ad,
  dataUri,
  styles,
  pageSize,
}: {
  ad: PdfAdData;
  dataUri: string | null;
  styles: ReturnType<typeof makeStyles>;
  pageSize: "A4" | "LETTER";
}) {
  const href = getAdHref(ad);
  if (dataUri) {
    const image = React.createElement(Image, {
      src: dataUri,
      style: styles.adFullPage,
    });
    return React.createElement(
      Page,
      { size: pageSize, style: styles.adStandalonePage },
      wrapWithLink(href, image, { width: "100%", height: "100%" }),
    );
  }
  return React.createElement(
    Page,
    { size: pageSize, style: styles.page },
    React.createElement(
      View,
      { style: styles.adTextCard },
      React.createElement(Text, { style: styles.adTextTitle }, ad.titleAr),
      ad.titleEn
        ? React.createElement(Text, { style: styles.adTextBody }, ad.titleEn)
        : null,
      React.createElement(
        Text,
        { style: styles.adTextPhone },
        (ad as PdfAdData & { phone?: string }).phone ?? "",
      ),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cover page
// ─────────────────────────────────────────────────────────────────────────────

function CoverPage({
  input,
  styles,
}: {
  input: PdfDocumentInput;
  styles: ReturnType<typeof makeStyles>;
}) {
  return React.createElement(
    Page,
    { size: input.pageSize, style: styles.coverPage },
    input.isPreview
      ? React.createElement(Text, { style: styles.watermark }, "مسودة")
      : null,
    React.createElement(
      Text,
      { style: styles.coverTitle },
      input.coverTitleAr ?? input.titleAr,
    ),
    React.createElement(View, { style: styles.coverDivider }),
    React.createElement(
      Text,
      { style: styles.coverSubtitle },
      input.coverSubtitleAr ?? "",
    ),
    React.createElement(
      Text,
      { style: styles.coverMeta },
      `${input.cityNameAr} • الإصدار ${input.editionNumber}`,
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Divider page
// ─────────────────────────────────────────────────────────────────────────────

function DividerPage({
  section,
  styles,
  pageSize,
}: {
  section: PdfCategorySection;
  styles: ReturnType<typeof makeStyles>;
  pageSize: "A4" | "LETTER";
}) {
  const icon = section.icon ?? getCategoryIcon(section.nameAr);
  return React.createElement(
    Page,
    { size: pageSize, style: styles.dividerPage },
    React.createElement(Text, { style: styles.dividerIcon }, icon),
    React.createElement(
      Text,
      { style: styles.dividerTitle },
      section.sectionTitleAr ?? section.nameAr,
    ),
    React.createElement(View, { style: styles.dividerAccentBar }),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fihris (page-number index)
// ─────────────────────────────────────────────────────────────────────────────

function PageNumberIndexPage({
  sections,
  styles,
  pageSize,
  hasIntro,
}: {
  sections: PdfCategorySection[];
  styles: ReturnType<typeof makeStyles>;
  pageSize: "A4" | "LETTER";
  hasIntro: boolean;
}) {
  const entries = buildIndexEntries(sections, hasIntro);
  return React.createElement(
    Page,
    { size: pageSize, style: styles.page },
    React.createElement(Text, { style: styles.indexTitle }, "الفهرس"),
    ...entries.flatMap((entry) => [
      React.createElement(
        View,
        {
          key: `idx-cat-${entry.categoryId}`,
          style: styles.indexCategoryRow,
        },
        React.createElement(
          Text,
          { style: styles.indexPageNum },
          `${entry.contentPage}`,
        ),
        React.createElement(
          Text,
          { style: styles.indexCategoryName },
          `${entry.icon}  ${entry.nameAr}`,
        ),
      ),
      ...entry.businesses.map((b) =>
        React.createElement(
          View,
          { key: `idx-biz-${b.id}`, style: styles.indexBusinessRow },
          React.createElement(
            Text,
            { style: styles.indexBusinessPageNum },
            `${b.page}`,
          ),
          React.createElement(
            Text,
            { style: styles.indexBusinessName },
            b.nameAr,
          ),
        ),
      ),
    ]),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category section page
// ─────────────────────────────────────────────────────────────────────────────

function CategorySectionPage({
  section,
  qrMap,
  styles,
  pageSize,
  includeQr,
  layout,
  isPreview,
  sidebarAds,
  halfPageTopAd,
  halfPageBottomAd,
  inlineAd,
  imageCache,
}: {
  section: PdfCategorySection;
  qrMap: Map<string, string>;
  styles: ReturnType<typeof makeStyles>;
  pageSize: "A4" | "LETTER";
  includeQr: boolean;
  layout: PdfLayoutConfig;
  isPreview: boolean;
  sidebarAds: PdfAdData[];
  halfPageTopAd: PdfAdData | null;
  halfPageBottomAd: PdfAdData | null;
  inlineAd?: PdfAdData | null;
  imageCache: ImageCache;
}) {
  const isDense = section.listingTemplate === "DENSE";
  const placement = inlineAd?.effectivePlacement ?? null;
  const adDataUri = inlineAd ? resolveAdImage(inlineAd, imageCache) : null;

  const sponsorBadge =
    inlineAd && placement === "CATEGORY_SPONSOR"
      ? React.createElement(AdSponsorBadge, { ad: inlineAd, styles })
      : null;

  const headerBanner =
    inlineAd && placement === "HEADER_BANNER"
      ? React.createElement(AdBannerElement, {
          ad: inlineAd,
          dataUri: adDataUri,
          styles,
        })
      : null;

  const footerBanner =
    inlineAd && placement === "FOOTER_BANNER"
      ? React.createElement(AdBannerElement, {
          ad: inlineAd,
          dataUri: adDataUri,
          styles,
        })
      : null;

  const hasSidebar = sidebarAds.length > 0;
  const sidebarPlacement =
    sidebarAds[0]?.effectivePlacement ?? "SIDEBAR_RIGHT";

  const businessList = isDense
    ? React.createElement(
        View,
        { style: styles.denseGrid },
        ...section.businesses.map((b) =>
          React.createElement(BusinessCardDense, { key: b.id, business: b, styles }),
        ),
      )
    : React.createElement(
        View,
        { style: { flex: 1 } },
        ...section.businesses.map((b) =>
          React.createElement(BusinessCardStandard, {
            key: b.id,
            business: b,
            qrDataUrl: qrMap.get(b.id),
            styles,
            includeQr,
          }),
        ),
      );

  const contentArea = hasSidebar
    ? React.createElement(
        View,
        {
          style: {
            display: "flex",
            flexDirection:
              sidebarPlacement === "SIDEBAR_LEFT" ? "row" : "row-reverse",
            alignItems: "stretch",
            gap: 8,
            flex: 1,
          },
        },
        businessList,
        React.createElement(AdSidebarElement, { ads: sidebarAds, styles, imageCache }),
      )
    : businessList;

  return React.createElement(
    Page,
    { size: pageSize, style: styles.page },
    isPreview
      ? React.createElement(Text, { style: styles.watermark }, "مسودة")
      : null,
    headerBanner,
    React.createElement(
      View,
      {
        style: [
          section.colorTheme
            ? { ...styles.sectionHeader, backgroundColor: section.colorTheme }
            : styles.sectionHeader,
          {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          },
        ] as never,
      },
      sponsorBadge,
      React.createElement(
        Text,
        { style: styles.sectionHeaderText },
        section.sectionTitleAr ?? section.nameAr,
      ),
    ),
    section.sectionIntroAr
      ? React.createElement(
          Text,
          { style: styles.sectionIntro },
          section.sectionIntroAr,
        )
      : null,
    halfPageTopAd
      ? React.createElement(AdHalfPageBlock, {
          ad: halfPageTopAd,
          dataUri: resolveAdImage(halfPageTopAd, imageCache),
          styles,
        })
      : null,
    contentArea,
    halfPageBottomAd
      ? React.createElement(AdHalfPageBlock, {
          ad: halfPageBottomAd,
          dataUri: resolveAdImage(halfPageBottomAd, imageCache),
          styles,
        })
      : null,
    footerBanner,
    layout.showPageNumbers
      ? React.createElement(Text, {
          style: styles.pageNumber,
          render: ({ pageNumber }: { pageNumber: number }) => `${pageNumber}`,
        })
      : null,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Business card components
// ─────────────────────────────────────────────────────────────────────────────

function BusinessCardStandard({
  business,
  qrDataUrl,
  styles,
  includeQr,
}: {
  business: PdfBusiness;
  qrDataUrl: string | undefined;
  styles: ReturnType<typeof makeStyles>;
  includeQr: boolean;
}) {
  const phones = business.phoneNumbers ?? [];
  const phoneSection =
    phones.length > 0
      ? React.createElement(
          View,
          { style: styles.phoneRow },
          ...phones.map((p, i) =>
            React.createElement(
              View,
              { key: `${p.number}-${i}`, style: styles.phoneChip },
              React.createElement(Text, { style: styles.phoneText }, p.number),
            ),
          ),
        )
      : null;

  const qrSection =
    includeQr && qrDataUrl
      ? wrapWithLink(
          business.publicUrl,
          React.createElement(
            View,
            { style: { alignItems: "center", marginTop: 4 } },
            React.createElement(Image, { src: qrDataUrl, style: styles.qrImage }),
            React.createElement(
              Text,
              { style: styles.qrHint },
              "اضغط هنا\nلترى المزيد من\nالمعلومات",
            ),
          ),
          { alignItems: "center" },
        )
      : null;

  return React.createElement(
    View,
    { style: styles.businessCard },
    React.createElement(
      View,
      { style: styles.qrContainer },
      qrSection,
      React.createElement(
        View,
        { style: styles.businessInfo },
        React.createElement(
          Text,
          { style: styles.businessName },
          business.nameAr,
        ),
        business.addressAr
          ? React.createElement(
              Text,
              { style: styles.businessAddress },
              business.addressAr,
            )
          : null,
        business.descriptionAr
          ? React.createElement(
              Text,
              { style: styles.businessDescription },
              business.descriptionAr,
            )
          : null,
        phoneSection,
      ),
    ),
  );
}

function BusinessCardDense({
  business,
  styles,
}: {
  business: PdfBusiness;
  styles: ReturnType<typeof makeStyles>;
}) {
  const phones = business.phoneNumbers ?? [];
  return React.createElement(
    View,
    { style: styles.denseCard },
    React.createElement(Text, { style: styles.businessName }, business.nameAr),
    business.addressAr
      ? React.createElement(
          Text,
          { style: styles.businessAddress },
          business.addressAr,
        )
      : null,
    ...phones.map((p, i) =>
      React.createElement(
        Text,
        { key: `${business.id}-${p.number}-${i}`, style: styles.phoneText },
        p.number,
      ),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile pages
// ─────────────────────────────────────────────────────────────────────────────

function WebsiteProfilePage({
  profile,
  styles,
  pageSize,
}: {
  profile: PdfWebsiteProfile;
  styles: ReturnType<typeof makeStyles>;
  pageSize: "A4" | "LETTER";
}) {
  return React.createElement(
    Page,
    { size: pageSize, style: styles.page },
    React.createElement(
      View,
      { style: styles.profileBlock },
      profile.logoUrl
        ? React.createElement(Image, {
            src: profile.logoUrl,
            style: {
              width: 80,
              height: 40,
              objectFit: "contain",
              alignSelf: "flex-end",
              marginBottom: 8,
            },
          })
        : null,
      React.createElement(
        Text,
        { style: styles.profileTitle },
        profile.titleAr,
      ),
      profile.shortTextAr
        ? React.createElement(
            Text,
            { style: styles.profileBody },
            profile.shortTextAr,
          )
        : null,
      profile.bodyTextAr
        ? React.createElement(
            Text,
            { style: styles.profileBody },
            profile.bodyTextAr,
          )
        : null,
      profile.websiteUrl
        ? React.createElement(
            Text,
            { style: styles.profileMeta },
            `الموقع: ${profile.websiteUrl}`,
          )
        : null,
      profile.supportPhone
        ? React.createElement(
            Text,
            { style: styles.profileMeta },
            `الدعم: ${profile.supportPhone}`,
          )
        : null,
      profile.qrCodeUrl
        ? React.createElement(Image, {
            src: profile.qrCodeUrl,
            style: {
              width: 64,
              height: 64,
              alignSelf: "flex-end",
              marginTop: 8,
            },
          })
        : null,
    ),
  );
}

function DeveloperProfilePage({
  profile,
  styles,
  pageSize,
}: {
  profile: PdfDeveloperProfile;
  styles: ReturnType<typeof makeStyles>;
  pageSize: "A4" | "LETTER";
}) {
  return React.createElement(
    Page,
    { size: pageSize, style: styles.page },
    React.createElement(
      View,
      { style: styles.profileBlock },
      profile.profileImageUrl
        ? React.createElement(Image, {
            src: profile.profileImageUrl,
            style: {
              width: 60,
              height: 60,
              borderRadius: 30,
              alignSelf: "flex-end",
              marginBottom: 8,
            },
          })
        : null,
      React.createElement(
        Text,
        { style: styles.profileTitle },
        profile.fullName,
      ),
      profile.roleTitleAr
        ? React.createElement(
            Text,
            { style: styles.profileMeta },
            profile.roleTitleAr,
          )
        : null,
      profile.shortBioAr
        ? React.createElement(
            Text,
            { style: styles.profileBody },
            profile.shortBioAr,
          )
        : null,
      profile.ctaTextAr
        ? React.createElement(
            Text,
            { style: styles.profileMeta },
            profile.ctaTextAr,
          )
        : null,
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main document builder
// ─────────────────────────────────────────────────────────────────────────────

async function buildDocument(input: PdfDocumentInput) {
  registerFonts();
  const styles = makeStyles(input.theme, input.margins);

  // Sort sections and businesses alphabetically (Arabic)
  const sortedSections = [...input.categorySections]
    .sort((a, b) => a.nameAr.localeCompare(b.nameAr, "ar"))
    .map((sec) => ({
      ...sec,
      businesses: [...sec.businesses].sort((a, b) =>
        a.nameAr.localeCompare(b.nameAr, "ar"),
      ),
    }));

  const hasIntro = !!input.introTextAr;

  // Build pageMap: sectionIdx → content page number (real PDF 1-based)
  // This is the single source of truth used by adAllowedInSection.
  const pageMap = buildPageMap(sortedSections.length, hasIntro);

  // Build QR codes
  const qrMap = new Map<string, string>();
  if (input.includeQrCodes) {
    await Promise.all(
      sortedSections.flatMap((s) =>
        s.businesses.map(async (b) => {
          qrMap.set(b.id, await buildQrDataUrl(b.publicUrl));
        }),
      ),
    );
  }

  // Filter inactive ads and pre-load images
  const activeAds = input.ads.filter((a) => a.isActive !== false);
  const imageCache = await buildImageCache(activeAds);

  // ── Partition ads by placement type ────────────────────────────────────────

  const standaloneAds = activeAds
    .filter((a) => isStandalonePage(a.effectivePlacement))
    .sort((a, b) => b.priority - a.priority);

  const inlineAds = activeAds
    .filter((a) => isInlinePlacement(a.effectivePlacement))
    .sort((a, b) => b.priority - a.priority);

  // Pinned standalone ads (positionAfterCategoryId set)
  const pinnedStandalone = new Map<string, PdfAdData[]>();
  const floatingStandalone: PdfAdData[] = [];
  for (const ad of standaloneAds) {
    const pin = ad.positionAfterCategoryId;
    if (pin) {
      const arr = pinnedStandalone.get(pin) ?? [];
      arr.push(ad);
      pinnedStandalone.set(pin, arr);
    } else {
      floatingStandalone.push(ad);
    }
  }

  // Pinned inline ads
  const pinnedInline     = new Map<string, PdfAdData>();
  const pinnedSidebar    = new Map<string, PdfAdData[]>();
  const pinnedHalfTop    = new Map<string, PdfAdData>();
  const pinnedHalfBottom = new Map<string, PdfAdData>();

  const floatingInline:     PdfAdData[] = [];
  const floatingSidebar:    PdfAdData[] = [];
  const floatingHalfTop:    PdfAdData[] = [];
  const floatingHalfBottom: PdfAdData[] = [];

  for (const ad of inlineAds) {
    const pin = ad.positionAfterCategoryId;
    const p   = ad.effectivePlacement;

    if (p === "SIDEBAR_LEFT" || p === "SIDEBAR_RIGHT") {
      if (pin) {
        const arr = pinnedSidebar.get(pin) ?? [];
        arr.push(ad);
        pinnedSidebar.set(pin, arr);
      } else {
        floatingSidebar.push(ad);
      }
    } else if (p === "HALF_PAGE_TOP") {
      if (pin && !pinnedHalfTop.has(pin)) pinnedHalfTop.set(pin, ad);
      else floatingHalfTop.push(ad);
    } else if (p === "HALF_PAGE_BOTTOM") {
      if (pin && !pinnedHalfBottom.has(pin)) pinnedHalfBottom.set(pin, ad);
      else floatingHalfBottom.push(ad);
    } else {
      // HEADER_BANNER, FOOTER_BANNER, CATEGORY_SPONSOR
      if (pin && !pinnedInline.has(pin)) pinnedInline.set(pin, ad);
      else floatingInline.push(ad);
    }
  }

  // Round-robin counters — advance unconditionally so ads rotate
  let floatSIdx    = 0; // FULL_PAGE
  let floatIIdx    = 0; // HEADER/FOOTER/SPONSOR
  let floatHTIdx   = 0; // HALF_PAGE_TOP
  let floatHBIdx   = 0; // HALF_PAGE_BOTTOM
  let floatSBStart = 0; // SIDEBAR

  const pages: React.ReactElement[] = [];

  // ── Pages ──────────────────────────────────────────────────────────────────

  pages.push(React.createElement(CoverPage, { key: "cover", input, styles }));

  if (hasIntro) {
    pages.push(
      React.createElement(
        Page,
        { key: "intro", size: input.pageSize, style: styles.page },
        React.createElement(
          Text,
          { style: styles.introText },
          input.introTextAr,
        ),
      ),
    );
  }

  pages.push(
    React.createElement(PageNumberIndexPage, {
      key: "index",
      sections: sortedSections,
      styles,
      pageSize: input.pageSize,
      hasIntro,
    }),
  );

  sortedSections.forEach((section, idx) => {
    // ── Divider page
    pages.push(
      React.createElement(DividerPage, {
        key: `divider-${section.categoryId}`,
        section,
        styles,
        pageSize: input.pageSize,
      }),
    );

    // ── Resolve inline ad (HEADER_BANNER / FOOTER_BANNER / CATEGORY_SPONSOR)
    let sectionInlineAd: PdfAdData | null = null;
    if (pinnedInline.has(section.categoryId)) {
      const ad = pinnedInline.get(section.categoryId)!;
      if (adAllowedInSection(ad, idx, pageMap)) sectionInlineAd = ad;
    } else if (floatingInline.length > 0) {
      const candidate = floatingInline[floatIIdx];
      floatIIdx = (floatIIdx + 1) % floatingInline.length;
      if (candidate && adAllowedInSection(candidate, idx, pageMap)) {
        sectionInlineAd = candidate;
      }
    }

    // ── Resolve sidebar ads — round-robin, up to 3 per section
    let activeSidebarAds: PdfAdData[] = [];
    if (pinnedSidebar.has(section.categoryId)) {
      activeSidebarAds = pinnedSidebar
        .get(section.categoryId)!
        .filter((ad) => adAllowedInSection(ad, idx, pageMap));
    } else if (floatingSidebar.length > 0) {
      const MAX = 3;
      const total = floatingSidebar.length;
      const collected: PdfAdData[] = [];
      for (let i = 0; i < total && collected.length < MAX; i++) {
        const candidate = floatingSidebar[(floatSBStart + i) % total];
        if (candidate && adAllowedInSection(candidate, idx, pageMap)) {
          collected.push(candidate);
        }
      }
      activeSidebarAds = collected;
      floatSBStart = (floatSBStart + 1) % total;
    }

    // ── Resolve half-page top
    let halfTopAd: PdfAdData | null = null;
    if (pinnedHalfTop.has(section.categoryId)) {
      const ad = pinnedHalfTop.get(section.categoryId)!;
      if (adAllowedInSection(ad, idx, pageMap)) halfTopAd = ad;
    } else if (floatingHalfTop.length > 0 && idx % 2 === 0) {
      const candidate = floatingHalfTop[floatHTIdx % floatingHalfTop.length];
      floatHTIdx++;
      if (candidate && adAllowedInSection(candidate, idx, pageMap)) {
        halfTopAd = candidate;
      }
    }

    // ── Resolve half-page bottom
    let halfBottomAd: PdfAdData | null = null;
    if (pinnedHalfBottom.has(section.categoryId)) {
      const ad = pinnedHalfBottom.get(section.categoryId)!;
      if (adAllowedInSection(ad, idx, pageMap)) halfBottomAd = ad;
    } else if (floatingHalfBottom.length > 0 && idx % 2 === 1) {
      const candidate =
        floatingHalfBottom[floatHBIdx % floatingHalfBottom.length];
      floatHBIdx++;
      if (candidate && adAllowedInSection(candidate, idx, pageMap)) {
        halfBottomAd = candidate;
      }
    }

    // ── Content page
    pages.push(
      React.createElement(CategorySectionPage, {
        key: `section-${section.categoryId}`,
        section,
        qrMap,
        styles,
        pageSize: input.pageSize,
        includeQr: input.includeQrCodes,
        layout: input.layout,
        isPreview: input.isPreview,
        inlineAd: sectionInlineAd,
        sidebarAds: activeSidebarAds,
        halfPageTopAd: halfTopAd,
        halfPageBottomAd: halfBottomAd,
        imageCache,
      }),
    );

    // ── Pinned FULL_PAGE ads after this section
    const pinnedHere = pinnedStandalone.get(section.categoryId) ?? [];
    for (const ad of pinnedHere) {
      if (ad && adAllowedInSection(ad, idx, pageMap)) {
        pages.push(
          React.createElement(StandaloneAdPage, {
            key: `ad-pinned-${ad.id}`,
            ad,
            dataUri: resolveAdImage(ad, imageCache),
            styles,
            pageSize: input.pageSize,
          }),
        );
      }
    }

    // ── Floating FULL_PAGE ads
    // If the ad has specific pageNumbers, show it whenever the current section
    // content page matches — regardless of the every-2-sections rhythm.
    // If no pageNumbers restriction, apply the default every-2-sections logic.
    if (floatingStandalone.length > 0 && pinnedHere.length === 0) {
      const ad = floatingStandalone[floatSIdx % floatingStandalone.length];
      if (ad) {
        const hasPageRestriction =
          ad.pageNumbers && ad.pageNumbers.length > 0;
        const matchesPage = adAllowedInSection(ad, idx, pageMap);

        // Show if:
        //   - has page restriction AND matches current section's page, OR
        //   - no restriction AND we're at an every-2-sections slot
        const shouldShow = hasPageRestriction
          ? matchesPage
          : matchesPage && (idx + 1) % 2 === 0;

        if (shouldShow) {
          floatSIdx++;
          pages.push(
            React.createElement(StandaloneAdPage, {
              key: `ad-float-${idx}`,
              ad,
              dataUri: resolveAdImage(ad, imageCache),
              styles,
              pageSize: input.pageSize,
            }),
          );
        } else if (!hasPageRestriction && (idx + 1) % 2 === 0) {
          // Advance counter even if not shown (keeps round-robin moving)
          floatSIdx++;
        }
      }
    }
  });

  if (input.includeWebsiteProfile && input.websiteProfile) {
    pages.push(
      React.createElement(WebsiteProfilePage, {
        key: "website-profile",
        profile: input.websiteProfile,
        styles,
        pageSize: input.pageSize,
      }),
    );
  }

  if (input.includeDeveloperProfile && input.developerProfile) {
    pages.push(
      React.createElement(DeveloperProfilePage, {
        key: "dev-profile",
        profile: input.developerProfile,
        styles,
        pageSize: input.pageSize,
      }),
    );
  }

  return React.createElement(Document, null, ...pages);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────

export async function generatePdf(
  input: PdfDocumentInput,
): Promise<GenerationResult> {
  try {
    const doc = await buildDocument(input);
    const instance = pdf(doc);
    let blob: Blob;
    try {
      blob = await instance.toBlob();
    } catch (renderErr) {
      console.error("[generator] @react-pdf render failed:", renderErr);
      return { ok: false, error: `PDF render error: ${String(renderErr)}` };
    }
    const buffer = Buffer.from(await blob.arrayBuffer());
    const pagesCount = countPages(doc);
    return {
      ok: true,
      buffer,
      pagesCount,
      businessesCount: input.categorySections.reduce(
        (sum, s) => sum + s.businesses.length,
        0,
      ),
    };
  } catch (err) {
    console.error("[generator] PDF generation failed:", err);
    return { ok: false, error: String(err) };
  }
}

/** Count top-level Page elements in the document tree. */
function countPages(doc: React.ReactElement): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children = (doc as any)?.props?.children;
  if (!children) return 0;
  const arr = Array.isArray(children) ? children : [children];
  return arr.filter((c: React.ReactElement) => c?.type === Page).length;
}
