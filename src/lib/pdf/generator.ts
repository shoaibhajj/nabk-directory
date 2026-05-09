/**
 * PDF Generation Engine for دليل النبك.
 *
 * ✔ Index: page numbers on RIGHT side (RTL)
 * ✔ Ad placement fully respected:
 *   FULL_PAGE            → standalone page (full bleed image)
 *   HALF_PAGE_TOP/BOTTOM → inline inside CategorySectionPage (top / bottom)
 *   SIDEBAR_LEFT/RIGHT   → 2-column layout: businesses | stacked ad strips
 *   HEADER_BANNER        → thin banner at top of section page
 *   FOOTER_BANNER        → thin banner at bottom of section page
 *   CATEGORY_SPONSOR     → sponsor badge in the section header
 * ✔ positionAfterCategoryId on PdfAdData – ad appears after
 *   the specified category section (falls back to round-robin if null)
 * ✔ Images: all imageUrls are fetched + resized via Sharp before being
 *   embedded — no cropping, lanczos3 quality, mozjpeg compression.
 * ✔ Phase 5:
 *   - isActive filter: ads with isActive=false are excluded (already filtered
 *     in data-loader, but double-checked here for safety)
 *   - pageNumbers: if non-empty, ad only appears in sections whose PDF content
 *     page number is in the pageNumbers array; empty = show in all sections
 *     (round-robin). pageNumbers are 1-based PDF page numbers as shown in the
 *     document, NOT 0-based section indices.
 * ✔ Fix: QR code is now a clickable Link → business.publicUrl
 * ✔ Fix: QR image positioned on the LEFT side of the business card (RTL)
 * ✔ Fix: Business logo (media_files image) removed from card entirely
 * ✔ Fix: adHalfBlock wrapped in fixed-height View to prevent overflow
 * ✔ Fix: adBannerBlock uses fixed height wrapper to constrain banner image
 * ✔ Fix: guard undefined ad picks in all floating round-robin loops
 * ✔ Fix: adAllowedInSection coerces pageNumbers to Number (guards Int[] → string via JSON)
 * ✔ Fix: round-robin counters advance unconditionally so ads rotate across ALL sections
 * ✔ Fix: pageNumbers now compared against actual PDF page number of the section
 *         content page, not the 0-based section index
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

// ── Page dimensions (pt) ──────────────────────────────────────────────────────────────────
const PAGE_INNER_W = 515;
const SIDEBAR_W    = 130;

// ── Category icon map ───────────────────────────────────────────────────────────────────
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

// ── QR ──────────────────────────────────────────────────────────────────────────────
async function buildQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 120,
    color: { dark: "#1a1a1a", light: "#ffffff" },
  });
}

function getAdHref(ad: PdfAdData): string | null {
  if (ad.linkUrl?.trim()) return ad.linkUrl.trim();
  const phone = (ad as PdfAdData & { phone?: string | null }).phone;
  if (phone?.trim()) return `tel:${phone.trim()}`;
  return null;
}

function wrapWithLink(
  href: string | null,
  child: React.ReactNode,
  style?: any // eslint-disable-line @typescript-eslint/no-explicit-any
) {
  if (!href) return child;
  return React.createElement(Link, { src: href, style }, child);
}

// ── Style factory ──────────────────────────────────────────────────────────────────
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
    // RTL layout: info on RIGHT, QR on LEFT
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
    // businessInfo takes remaining space on the right (RTL)
    businessInfo: { flex: 1, paddingLeft: 8 },
    adFullPage: {
      width: "100%",
      height: "100%",
      objectFit: "contain",
    },
    // Wrapper View constrains height — Image fills inside
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
    // Banner wrapper constrains height strictly
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

// ── Ad placement helpers ─────────────────────────────────────────────────────────────────
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

/**
 * Returns true if this ad is allowed to appear in the given section.
 *
 * pageNumbers stores 1-based PDF page numbers as entered by the admin.
 * Empty array → show in ALL sections.
 *
 * PDF page layout (with intro page):
 *   1 = Cover
 *   2 = Intro
 *   3 = Index
 *   4 = Divider for section 0
 *   5 = Content for section 0  ← idx=0
 *   6 = Divider for section 1
 *   7 = Content for section 1  ← idx=1
 *   ...
 *   contentPageForIdx = hasIntro ? (idx * 2 + 5) : (idx * 2 + 4)
 *
 * Without intro page:
 *   1 = Cover
 *   2 = Index
 *   3 = Divider for section 0
 *   4 = Content for section 0  ← idx=0
 *   ...
 *   contentPageForIdx = idx * 2 + 4
 *
 * We compare the admin-entered PDF page number against this computed value.
 * We also accept the section index directly (legacy / 0-based) as a fallback
 * so existing data keeps working.
 *
 * FIX: coerce each entry to Number() to guard against JSON serialisation
 * turning Int[] into string[] when data crosses a Server Action boundary.
 */
function adAllowedInSection(
  ad: PdfAdData,
  sectionIdx: number,
  hasIntro: boolean
): boolean {
  if (!ad.pageNumbers || ad.pageNumbers.length === 0) return true;
  const nums = ad.pageNumbers.map(Number).filter((n) => !isNaN(n));
  if (nums.length === 0) return true;

  // Compute actual PDF content-page number for this section index
  const contentPdfPage = hasIntro ? sectionIdx * 2 + 5 : sectionIdx * 2 + 4;

  // Accept either the PDF page number OR the raw section index (0-based legacy)
  return nums.includes(contentPdfPage) || nums.includes(sectionIdx);
}

// ── Resolved image cache ──────────────────────────────────────────────────────────────────
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
        const key = ad.imageUrl;
        if (cache.has(key)) return;
        const dims = AD_IMAGE_SIZES[ad.effectivePlacement] ?? { w: PAGE_INNER_W, h: 300 };
        const dataUri = await fetchAndResizeImage(ad.imageUrl, dims.w, dims.h, {
          background: { r: 255, g: 255, b: 255, alpha: 1 },
          quality: 82,
        });
        cache.set(key, dataUri);
        if (!dataUri) {
          console.warn(`[generator] Could not load image for ad "${ad.titleAr}" (${ad.imageUrl})`);
        }
      })
  );
  return cache;
}

function resolveAdImage(ad: PdfAdData, cache: ImageCache): string | null {
  if (!ad.imageUrl) return null;
  return cache.get(ad.imageUrl) ?? null;
}

// ── Inline ad elements ──────────────────────────────────────────────────────────────────
function AdBannerElement({
  ad, dataUri, styles,
}: {
  ad: PdfAdData;
  dataUri: string | null;
  styles: ReturnType<typeof makeStyles>;
}) {
  const href = getAdHref(ad);
  // Wrap in a fixed-height View so the image cannot push content below
  const inner = React.createElement(
    View,
    { style: styles.adBannerWrapper },
    dataUri
      ? React.createElement(Image, { src: dataUri, style: styles.adBannerImg })
      : React.createElement(Text, { style: styles.adBannerText }, ad.titleAr)
  );
  return wrapWithLink(href, inner, { width: "100%" });
}

function AdSidebarElement({
  ads, styles, imageCache,
}: {
  ads: PdfAdData[];
  styles: ReturnType<typeof makeStyles>;
  imageCache: ImageCache;
}) {
  return React.createElement(
    View, { style: styles.adSidebarCol },
    ...ads.map((ad) => {
      const href = getAdHref(ad);
      const dataUri = resolveAdImage(ad, imageCache);
      const content = dataUri
        ? React.createElement(Image, { src: dataUri, style: styles.adSidebarImg })
        : React.createElement(Text, { style: styles.adSidebarText }, ad.titleAr);
      return wrapWithLink(href, content, { width: "100%" });
    })
  );
}

function AdSponsorBadge({
  ad, styles,
}: {
  ad: PdfAdData;
  styles: ReturnType<typeof makeStyles>;
}) {
  return React.createElement(
    View, { style: styles.adSponsorBadge },
    React.createElement(Text, { style: styles.adSponsorText }, `راعي: ${ad.titleEn ?? ad.titleAr}`)
  );
}

function AdHalfPageBlock({
  ad, dataUri, styles,
}: {
  ad: PdfAdData;
  dataUri: string | null;
  styles: ReturnType<typeof makeStyles>;
}) {
  const href = getAdHref(ad);
  // Fixed-height wrapper prevents image from expanding beyond 180pt
  const imageNode = dataUri
    ? React.createElement(
        View,
        { style: styles.adHalfWrapper },
        React.createElement(Image, { src: dataUri, style: styles.adHalfBlock })
      )
    : React.createElement(
        View,
        { style: [styles.adTextCard, { height: 180 }] },
        React.createElement(Text, { style: styles.adTextTitle }, ad.titleAr),
        React.createElement(Text, { style: styles.adTextBody }, ad.titleEn ?? ad.titleAr)
      );
  return React.createElement(
    View, { style: { width: "100%", marginVertical: 8 } },
    wrapWithLink(href, imageNode, { width: "100%" })
  );
}

function StandaloneAdPage({
  ad, dataUri, styles, pageSize,
}: {
  ad: PdfAdData;
  dataUri: string | null;
  styles: ReturnType<typeof makeStyles>;
  pageSize: "A4" | "LETTER";
}) {
  const href = getAdHref(ad);
  if (dataUri) {
    const image = React.createElement(Image, { src: dataUri, style: styles.adFullPage });
    return React.createElement(
      Page, { size: pageSize, style: styles.adStandalonePage },
      wrapWithLink(href, image, { width: "100%", height: "100%" })
    );
  }
  return React.createElement(
    Page, { size: pageSize, style: styles.page },
    React.createElement(View, { style: styles.adTextCard },
      React.createElement(Text, { style: styles.adTextTitle }, ad.titleAr),
      ad.titleEn ? React.createElement(Text, { style: styles.adTextBody }, ad.titleEn) : null,
      React.createElement(Text, { style: styles.adTextPhone },
        (ad as PdfAdData & { phone?: string }).phone ?? "")
    )
  );
}

// ── Cover page ────────────────────────────────────────────────────────────────────
function CoverPage({
  input, styles,
}: {
  input: PdfDocumentInput;
  styles: ReturnType<typeof makeStyles>;
}) {
  return React.createElement(
    Page, { size: input.pageSize, style: styles.coverPage },
    input.isPreview ? React.createElement(Text, { style: styles.watermark }, "مسودة") : null,
    React.createElement(Text, { style: styles.coverTitle }, input.coverTitleAr ?? input.titleAr),
    React.createElement(View, { style: styles.coverDivider }),
    React.createElement(Text, { style: styles.coverSubtitle }, input.coverSubtitleAr ?? ""),
    React.createElement(Text, { style: styles.coverMeta },
      `${input.cityNameAr} • الإصدار ${input.editionNumber}`)
  );
}

// ── Divider page ───────────────────────────────────────────────────────────────────
function DividerPage({
  section, styles, pageSize,
}: {
  section: PdfCategorySection;
  styles: ReturnType<typeof makeStyles>;
  pageSize: "A4" | "LETTER";
}) {
  const icon = section.icon ?? getCategoryIcon(section.nameAr);
  return React.createElement(
    Page, { size: pageSize, style: styles.dividerPage },
    React.createElement(Text, { style: styles.dividerIcon }, icon),
    React.createElement(Text, { style: styles.dividerTitle }, section.sectionTitleAr ?? section.nameAr),
    React.createElement(View, { style: styles.dividerAccentBar })
  );
}

// ── Page-number index ──────────────────────────────────────────────────────────────────
function buildPageMap(sections: PdfCategorySection[], hasIntro: boolean) {
  let pageCounter = hasIntro ? 3 : 2;
  return sections.map((sec) => {
    pageCounter++;
    const contentPage = ++pageCounter;
    return {
      categoryId: sec.categoryId,
      nameAr: sec.nameAr,
      icon: sec.icon ?? getCategoryIcon(sec.nameAr),
      contentPage,
      businesses: sec.businesses.map((b) => ({ id: b.id, nameAr: b.nameAr, page: contentPage })),
    };
  });
}

function PageNumberIndexPage({
  sections, styles, pageSize, hasIntro,
}: {
  sections: PdfCategorySection[];
  styles: ReturnType<typeof makeStyles>;
  pageSize: "A4" | "LETTER";
  hasIntro: boolean;
}) {
  const pageMap = buildPageMap(sections, hasIntro);
  return React.createElement(
    Page, { size: pageSize, style: styles.page },
    React.createElement(Text, { style: styles.indexTitle }, "الفهرس"),
    ...pageMap.flatMap((entry) => [
      React.createElement(
        View, { key: `idx-cat-${entry.categoryId}`, style: styles.indexCategoryRow },
        React.createElement(Text, { style: styles.indexPageNum }, `${entry.contentPage}`),
        React.createElement(Text, { style: styles.indexCategoryName }, `${entry.icon}  ${entry.nameAr}`)
      ),
      ...entry.businesses.map((b) =>
        React.createElement(
          View, { key: `idx-biz-${b.id}`, style: styles.indexBusinessRow },
          React.createElement(Text, { style: styles.indexBusinessPageNum }, `${b.page}`),
          React.createElement(Text, { style: styles.indexBusinessName }, b.nameAr)
        )
      ),
    ])
  );
}

// ── Category section page ─────────────────────────────────────────────────────────────────
function CategorySectionPage({
  section, qrMap, styles, pageSize, includeQr,
  layout, isPreview, sidebarAds, halfPageTopAd, halfPageBottomAd,
  inlineAd, imageCache,
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
      ? React.createElement(AdBannerElement, { ad: inlineAd, dataUri: adDataUri, styles })
      : null;

  const footerBanner =
    inlineAd && placement === "FOOTER_BANNER"
      ? React.createElement(AdBannerElement, { ad: inlineAd, dataUri: adDataUri, styles })
      : null;

  const hasSidebar = sidebarAds.length > 0;

  const businessList = isDense
    ? React.createElement(View, { style: styles.denseGrid },
        ...section.businesses.map((b) =>
          React.createElement(BusinessCardDense, { key: b.id, business: b, styles })))
    : React.createElement(View, { style: { flex: 1 } },
        ...section.businesses.map((b) =>
          React.createElement(BusinessCardStandard, {
            key: b.id, business: b,
            qrDataUrl: qrMap.get(b.id),
            styles, includeQr,
          })));

  const sidebarPlacement = sidebarAds[0]?.effectivePlacement ?? "SIDEBAR_RIGHT";

  const contentArea = hasSidebar
    ? React.createElement(
        View, {
          style: {
            display: "flex",
            flexDirection: sidebarPlacement === "SIDEBAR_LEFT" ? "row" : "row-reverse",
            alignItems: "stretch",
            gap: 8,
            flex: 1,
          },
        },
        businessList,
        React.createElement(AdSidebarElement, { ads: sidebarAds, styles, imageCache })
      )
    : businessList;

  const halfTopBlock = halfPageTopAd
    ? React.createElement(AdHalfPageBlock, {
        ad: halfPageTopAd,
        dataUri: resolveAdImage(halfPageTopAd, imageCache),
        styles,
      })
    : null;

  const halfBottomBlock = halfPageBottomAd
    ? React.createElement(AdHalfPageBlock, {
        ad: halfPageBottomAd,
        dataUri: resolveAdImage(halfPageBottomAd, imageCache),
        styles,
      })
    : null;

  return React.createElement(
    Page, { size: pageSize, style: styles.page },
    isPreview ? React.createElement(Text, { style: styles.watermark }, "مسودة") : null,
    headerBanner,
    React.createElement(
      View, {
        style: [
          section.colorTheme
            ? { ...styles.sectionHeader, backgroundColor: section.colorTheme }
            : styles.sectionHeader,
          { display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
        ] as never,
      },
      sponsorBadge,
      React.createElement(Text, { style: styles.sectionHeaderText }, section.sectionTitleAr ?? section.nameAr)
    ),
    section.sectionIntroAr
      ? React.createElement(Text, { style: styles.sectionIntro }, section.sectionIntroAr)
      : null,
    halfTopBlock,
    contentArea,
    halfBottomBlock,
    footerBanner,
    layout.showPageNumbers
      ? React.createElement(Text, {
          style: styles.pageNumber,
          render: ({ pageNumber }: { pageNumber: number }) => `${pageNumber}`,
        })
      : null
  );
}

// ── Business card components ─────────────────────────────────────────────────────────────────
function BusinessCardStandard({
  business, qrDataUrl, styles, includeQr,
}: {
  business: PdfBusiness;
  qrDataUrl: string | undefined;
  styles: ReturnType<typeof makeStyles>;
  includeQr: boolean;
}) {
  const phones = business.phoneNumbers ?? [];
  const phoneSection = phones.length > 0
    ? React.createElement(View, { style: styles.phoneRow },
        ...phones.map((p, i) =>
          React.createElement(View, { key: `${p.number}-${i}`, style: styles.phoneChip },
            React.createElement(Text, { style: styles.phoneText }, p.number))))
    : null;

  // QR on the LEFT side (RTL: info flows right→left, QR anchors on left)
  const qrSection = includeQr && qrDataUrl
    ? wrapWithLink(
        business.publicUrl,
        React.createElement(
          View, { style: { alignItems: "center", marginTop: 4 } },
          React.createElement(Image, { src: qrDataUrl, style: styles.qrImage }),
          React.createElement(Text, { style: styles.qrHint }, "اضغط هنا\nلترى المزيد من\nالمعلومات")
        ),
        { alignItems: "center" }
      )
    : null;

  return React.createElement(
    View, { style: styles.businessCard },
    // row: QR on left, business info on right (RTL natural reading order)
    React.createElement(View, { style: styles.qrContainer },
      qrSection,
      React.createElement(View, { style: styles.businessInfo },
        React.createElement(Text, { style: styles.businessName }, business.nameAr),
        business.addressAr
          ? React.createElement(Text, { style: styles.businessAddress }, business.addressAr)
          : null,
        business.descriptionAr
          ? React.createElement(Text, { style: styles.businessDescription }, business.descriptionAr)
          : null,
        phoneSection
      )
    )
  );
}

function BusinessCardDense({
  business, styles,
}: {
  business: PdfBusiness;
  styles: ReturnType<typeof makeStyles>;
}) {
  const phones = business.phoneNumbers ?? [];
  return React.createElement(
    View, { style: styles.denseCard },
    React.createElement(Text, { style: styles.businessName }, business.nameAr),
    business.addressAr
      ? React.createElement(Text, { style: styles.businessAddress }, business.addressAr)
      : null,
    ...phones.map((p, i) =>
      React.createElement(Text, { key: `${business.id}-${p.number}-${i}`, style: styles.phoneText }, p.number))
  );
}

// ── Profile pages ────────────────────────────────────────────────────────────────────
function WebsiteProfilePage({
  profile, styles, pageSize,
}: {
  profile: PdfWebsiteProfile;
  styles: ReturnType<typeof makeStyles>;
  pageSize: "A4" | "LETTER";
}) {
  return React.createElement(
    Page, { size: pageSize, style: styles.page },
    React.createElement(View, { style: styles.profileBlock },
      profile.logoUrl
        ? React.createElement(Image, {
            src: profile.logoUrl,
            style: { width: 80, height: 40, objectFit: "contain", alignSelf: "flex-end", marginBottom: 8 },
          })
        : null,
      React.createElement(Text, { style: styles.profileTitle }, profile.titleAr),
      profile.shortTextAr ? React.createElement(Text, { style: styles.profileBody }, profile.shortTextAr) : null,
      profile.bodyTextAr  ? React.createElement(Text, { style: styles.profileBody }, profile.bodyTextAr)  : null,
      profile.websiteUrl  ? React.createElement(Text, { style: styles.profileMeta }, `الموقع: ${profile.websiteUrl}`) : null,
      profile.supportPhone? React.createElement(Text, { style: styles.profileMeta }, `الدعم: ${profile.supportPhone}`) : null,
      profile.qrCodeUrl
        ? React.createElement(Image, {
            src: profile.qrCodeUrl,
            style: { width: 64, height: 64, alignSelf: "flex-end", marginTop: 8 },
          })
        : null
    )
  );
}

function DeveloperProfilePage({
  profile, styles, pageSize,
}: {
  profile: PdfDeveloperProfile;
  styles: ReturnType<typeof makeStyles>;
  pageSize: "A4" | "LETTER";
}) {
  return React.createElement(
    Page, { size: pageSize, style: styles.page },
    React.createElement(View, { style: styles.profileBlock },
      profile.profileImageUrl
        ? React.createElement(Image, {
            src: profile.profileImageUrl,
            style: { width: 60, height: 60, borderRadius: 30, alignSelf: "flex-end", marginBottom: 8 },
          })
        : null,
      React.createElement(Text, { style: styles.profileTitle }, profile.fullName),
      profile.roleTitleAr ? React.createElement(Text, { style: styles.profileMeta }, profile.roleTitleAr) : null,
      profile.shortBioAr  ? React.createElement(Text, { style: styles.profileBody }, profile.shortBioAr)  : null,
      profile.ctaTextAr   ? React.createElement(Text, { style: styles.profileMeta }, profile.ctaTextAr)   : null
    )
  );
}

// ── Main document builder ─────────────────────────────────────────────────────────────────
async function buildDocument(input: PdfDocumentInput) {
  registerFonts();
  const styles = makeStyles(input.theme, input.margins);

  const sortedSections = [...input.categorySections]
    .sort((a, b) => a.nameAr.localeCompare(b.nameAr, "ar"))
    .map((sec) => ({
      ...sec,
      businesses: [...sec.businesses].sort((a, b) => a.nameAr.localeCompare(b.nameAr, "ar")),
    }));

  // ── QR codes
  const qrMap = new Map<string, string>();
  if (input.includeQrCodes) {
    await Promise.all(
      sortedSections.flatMap((s) =>
        s.businesses.map(async (b) => {
          qrMap.set(b.id, await buildQrDataUrl(b.publicUrl));
        })
      )
    );
  }

  // ── Phase 5: filter inactive ads
  const activeAds = input.ads.filter((a) => a.isActive !== false);
  const imageCache = await buildImageCache(activeAds);

  // ── Partition ads
  const standaloneAds = activeAds
    .filter((a) => isStandalonePage(a.effectivePlacement))
    .sort((a, b) => b.priority - a.priority);

  const inlineAds = activeAds
    .filter((a) => isInlinePlacement(a.effectivePlacement))
    .sort((a, b) => b.priority - a.priority);

  // ── Pinned standalone ads (positionAfterCategoryId set)
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

  // ── Pinned inline ads
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

  // ── Floating counters — true round-robin, advance unconditionally
  let floatSIdx    = 0;  // FULL_PAGE standalone
  let floatIIdx    = 0;  // HEADER/FOOTER/SPONSOR inline
  let floatHTIdx   = 0;  // HALF_PAGE_TOP
  let floatHBIdx   = 0;  // HALF_PAGE_BOTTOM
  let floatSBStart = 0;  // SIDEBAR start pointer

  const hasIntro = !!input.introTextAr;
  const pages: React.ReactElement[] = [];

  pages.push(React.createElement(CoverPage, { key: "cover", input, styles }));

  if (hasIntro) {
    pages.push(
      React.createElement(
        Page, { key: "intro", size: input.pageSize, style: styles.page },
        React.createElement(Text, { style: styles.introText }, input.introTextAr)
      )
    );
  }

  pages.push(
    React.createElement(PageNumberIndexPage, {
      key: "index",
      sections: sortedSections,
      styles,
      pageSize: input.pageSize,
      hasIntro,
    })
  );

  sortedSections.forEach((section, idx) => {
    pages.push(
      React.createElement(DividerPage, {
        key: `divider-${section.categoryId}`,
        section, styles, pageSize: input.pageSize,
      })
    );

    // ─ Inline ad (HEADER_BANNER / FOOTER_BANNER / CATEGORY_SPONSOR)
    let sectionInlineAd: PdfAdData | null = null;
    if (pinnedInline.has(section.categoryId)) {
      const ad = pinnedInline.get(section.categoryId)!;
      if (adAllowedInSection(ad, idx, hasIntro)) sectionInlineAd = ad;
    } else if (floatingInline.length > 0) {
      const startIdx = floatIIdx;
      floatIIdx = (floatIIdx + 1) % floatingInline.length;
      const candidate = floatingInline[startIdx];
      if (candidate && adAllowedInSection(candidate, idx, hasIntro)) {
        sectionInlineAd = candidate;
      }
    }

    // ─ Sidebar ads — true round-robin, advance pointer every section
    let activeSidebarAds: PdfAdData[] = [];
    if (pinnedSidebar.has(section.categoryId)) {
      activeSidebarAds = pinnedSidebar
        .get(section.categoryId)!
        .filter((ad) => adAllowedInSection(ad, idx, hasIntro));
    } else if (floatingSidebar.length > 0) {
      const maxSidebarAds = 3;
      const total = floatingSidebar.length;
      const collected: PdfAdData[] = [];
      for (let i = 0; i < total && collected.length < maxSidebarAds; i++) {
        const candidate = floatingSidebar[(floatSBStart + i) % total];
        if (candidate && adAllowedInSection(candidate, idx, hasIntro)) {
          collected.push(candidate);
        }
      }
      activeSidebarAds = collected;
      floatSBStart = (floatSBStart + 1) % total;
    }

    // ─ Half-page top
    let halfTopAd: PdfAdData | null = null;
    if (pinnedHalfTop.has(section.categoryId)) {
      const ad = pinnedHalfTop.get(section.categoryId)!;
      if (adAllowedInSection(ad, idx, hasIntro)) halfTopAd = ad;
    } else if (floatingHalfTop.length > 0 && idx % 2 === 0) {
      const candidate = floatingHalfTop[floatHTIdx % floatingHalfTop.length];
      floatHTIdx++;
      if (candidate && adAllowedInSection(candidate, idx, hasIntro)) {
        halfTopAd = candidate;
      }
    }

    // ─ Half-page bottom
    let halfBottomAd: PdfAdData | null = null;
    if (pinnedHalfBottom.has(section.categoryId)) {
      const ad = pinnedHalfBottom.get(section.categoryId)!;
      if (adAllowedInSection(ad, idx, hasIntro)) halfBottomAd = ad;
    } else if (floatingHalfBottom.length > 0 && idx % 2 === 1) {
      const candidate = floatingHalfBottom[floatHBIdx % floatingHalfBottom.length];
      floatHBIdx++;
      if (candidate && adAllowedInSection(candidate, idx, hasIntro)) {
        halfBottomAd = candidate;
      }
    }

    pages.push(
      React.createElement(CategorySectionPage, {
        key: `section-${section.categoryId}`,
        section, qrMap, styles,
        pageSize: input.pageSize,
        includeQr: input.includeQrCodes,
        layout: input.layout,
        isPreview: input.isPreview,
        inlineAd: sectionInlineAd,
        sidebarAds: activeSidebarAds,
        halfPageTopAd: halfTopAd,
        halfPageBottomAd: halfBottomAd,
        imageCache,
      })
    );

    // ─ Pinned FULL_PAGE ads after this section
    const pinnedHere = pinnedStandalone.get(section.categoryId) ?? [];
    for (const ad of pinnedHere) {
      if (ad && adAllowedInSection(ad, idx, hasIntro)) {
        pages.push(
          React.createElement(StandaloneAdPage, {
            key: `ad-pinned-${ad.id}`,
            ad, dataUri: resolveAdImage(ad, imageCache),
            styles, pageSize: input.pageSize,
          })
        );
      }
    }

    // ─ Floating FULL_PAGE ads — every 2 sections
    if (
      floatingStandalone.length > 0 &&
      (idx + 1) % 2 === 0 &&
      pinnedHere.length === 0
    ) {
      const ad = floatingStandalone[floatSIdx % floatingStandalone.length];
      floatSIdx++;
      if (ad && adAllowedInSection(ad, idx, hasIntro)) {
        pages.push(
          React.createElement(StandaloneAdPage, {
            key: `ad-float-${idx}`,
            ad, dataUri: resolveAdImage(ad, imageCache),
            styles, pageSize: input.pageSize,
          })
        );
      }
    }
  });

  if (input.includeWebsiteProfile && input.websiteProfile) {
    pages.push(
      React.createElement(WebsiteProfilePage, {
        key: "website-profile",
        profile: input.websiteProfile,
        styles, pageSize: input.pageSize,
      })
    );
  }
  if (input.includeDeveloperProfile && input.developerProfile) {
    pages.push(
      React.createElement(DeveloperProfilePage, {
        key: "dev-profile",
        profile: input.developerProfile,
        styles, pageSize: input.pageSize,
      })
    );
  }

  return React.createElement(Document, null, ...pages);
}

// ── Public entry point ─────────────────────────────────────────────────────────────────
export async function generatePdf(
  input: PdfDocumentInput
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
    const pagesCount = pages_count(doc);
    return {
      ok: true,
      buffer,
      pagesCount,
      businessesCount: input.categorySections.reduce(
        (sum, s) => sum + s.businesses.length,
        0
      ),
    };
  } catch (err) {
    console.error("[generator] PDF generation failed:", err);
    return { ok: false, error: String(err) };
  }
}

/** Count top-level Page elements in the document tree. */
function pages_count(doc: React.ReactElement): number {
  const children = (doc as any)?.props?.children; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!children) return 0;
  const arr = Array.isArray(children) ? children : [children];
  return arr.filter(
    (c: React.ReactElement) => c?.type === Page
  ).length;
}
