/**
 * PDF Generation Engine for دليل النبك.
 *
 * ✔ Index: page numbers on RIGHT side (RTL)
 * ✔ Ad placement fully respected:
 *   FULL_PAGE            → standalone page (full bleed image)
 *   HALF_PAGE_TOP/BOTTOM → half-height block on its own page
 *   SIDEBAR_LEFT/RIGHT   → 2-column layout: businesses | ad strip
 *   HEADER_BANNER        → thin banner at top of section page
 *   FOOTER_BANNER        → thin banner at bottom of section page
 *   CATEGORY_SPONSOR     → sponsor badge in the section header
 * ✔ Task-4: positionAfterCategoryId on PdfAdData – ad appears after
 *   the specified category section (falls back to round-robin if null)
 * ✔ Images: all imageUrls are fetched + resized via Sharp before being
 *   embedded — no cropping, lanczos3 quality, mozjpeg compression.
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

// ── Page dimensions (pt) ──────────────────────────────────────────────────────
// A4 = 595 × 842 pt  |  LETTER = 612 × 792 pt
// Inner width after default margins (left 40 + right 40) ≈ 515 pt
const PAGE_INNER_W = 515; // used to derive ad image target widths
const SIDEBAR_W    = 130; // must match adSidebarCol.width below

// ── Category icon map ─────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  "ميكانيك وسيارات": "🚗",
  "مطاعم وكافيهات": "🍽️",
  صيدليات: "💊",
  "عيادات وأطباء": "🏥",
  "سوبر ماركت": "🛒",
  "صالونات وحلاقة": "✂️",
  "بناء وإكساء": "🏗️",
  إلكترونيات: "📱",
  ألبسة: "👔",
  مكاتب: "🏢",
  "مواصلات ونقليات": "🚌",
  "تعليم ومعاهد": "📚",
  مجوهرات: "💍",
  "أدوات منزلية": "🏠",
  "مخابز وحلويات": "🍞",
  خدمات: "🔧",
};

function getCategoryIcon(nameAr: string): string {
  if (CATEGORY_ICONS[nameAr]) return CATEGORY_ICONS[nameAr];
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (nameAr.includes(key) || key.includes(nameAr)) return icon;
  }
  return "📋";
}

// ── QR ─────────────────────────────────────────────────────────────────────

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
  style?: object
) {
  if (!href) return child;
  return React.createElement(Link, { src: href, style }, child);
}

// ── Style factory ────────────────────────────────────────────────────────────

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

    // ── Section page layouts ──────────────────────────────────────────────
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

    // ── Business cards ────────────────────────────────────────────────────
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
    businessInfo: { flex: 1, paddingRight: 8 },

    // ── Ad blocks ─────────────────────────────────────────────────────────
    //
    // NOTE: all images are now pre-processed by fetchAndResizeImage() and
    // passed as data-URIs. The styles below just control *layout* dimensions;
    // Sharp handles aspect-ratio preservation so we never crop anything.

    // FULL_PAGE — image fills the whole page (no margins page)
    adFullPage: {
      width: "100%",
      height: "100%",
      objectFit: "contain",   // safety net; image is already the right size
    },

    // HALF_PAGE — occupies roughly half the page height
    // The image has been resized to PAGE_INNER_W × (PAGE_INNER_W/1.78) by Sharp.
    adHalfBlock: {
      width: "100%",
      aspectRatio: 1.78,     // matches the 16:9 target we pass to fetchAndResizeImage
      objectFit: "contain",  // no cropping in the renderer either
    },

    // SIDEBAR column wrapper
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
    },

    // SIDEBAR image — fills column width; height driven by image content
    adSidebarImg: {
      width: "100%",
      flexGrow: 1,
      objectFit: "contain",  // never crop; Sharp already letterboxed
      minHeight: 120,
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

    // HEADER / FOOTER BANNER — fixed-height horizontal strip
    adBannerBlock: {
      width: "100%",
      height: 80,
      backgroundColor: theme.sectionBgColor,
      borderRadius: 4,
      overflow: "hidden",
      marginBottom: 6,
    },
    adBannerImg: {
      width: "100%",
      height: 80,
      objectFit: "contain",  // Sharp already stretched to banner ratio; contain is safe
    },
    adBannerText: {
      fontFamily: "Cairo",
      fontSize: 9,
      color: theme.primaryColor,
      fontWeight: 700,
      textAlign: "center",
    },

    // SPONSOR BADGE
    adSponsorBadge: {
      backgroundColor: theme.accentColor,
      borderRadius: 4,
      paddingVertical: 2,
      paddingHorizontal: 8,
      marginRight: 8,
      flexShrink: 0,
    },
    adSponsorText: {
      fontFamily: "Cairo",
      fontSize: 8,
      color: "#ffffff",
      direction: "rtl" as never,
    },

    // TEXT FALLBACK — when an ad has no image
    adTextCard: {
      borderWidth: 2,
      borderColor: theme.accentColor,
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

    // ── Profile blocks ────────────────────────────────────────────────────
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

    // ── Index ─────────────────────────────────────────────────────────────
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

    // ── Shared ────────────────────────────────────────────────────────────
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

// ── Ad placement helpers ─────────────────────────────────────────────────────

function isStandalonePage(placement: string): boolean {
  return ["FULL_PAGE", "HALF_PAGE_TOP", "HALF_PAGE_BOTTOM"].includes(placement);
}

function isInlinePlacement(placement: string): boolean {
  return [
    "SIDEBAR_LEFT",
    "SIDEBAR_RIGHT",
    "HEADER_BANNER",
    "FOOTER_BANNER",
    "CATEGORY_SPONSOR",
  ].includes(placement);
}

// ── Resolved image cache (populated once in buildDocument) ───────────────────
//
// Key   = original imageUrl string
// Value = base64 data-URI returned by fetchAndResizeImage, or null on failure

type ImageCache = Map<string, string | null>;

// Target pixel dimensions per placement type.
// We pass these to Sharp so the right amount of data is in each JPEG/PNG.
const AD_IMAGE_SIZES: Record<string, { w: number; h: number }> = {
  FULL_PAGE:       { w: 595,            h: 842 },   // A4 in pt → px approx
  HALF_PAGE_TOP:   { w: PAGE_INNER_W,   h: Math.round(PAGE_INNER_W / 1.78) },
  HALF_PAGE_BOTTOM:{ w: PAGE_INNER_W,   h: Math.round(PAGE_INNER_W / 1.78) },
  HEADER_BANNER:   { w: PAGE_INNER_W,   h: 160 },   // 80 pt × 2 for retina feel
  FOOTER_BANNER:   { w: PAGE_INNER_W,   h: 160 },
  SIDEBAR_LEFT:    { w: SIDEBAR_W * 2,  h: 400 },   // tall narrow
  SIDEBAR_RIGHT:   { w: SIDEBAR_W * 2,  h: 400 },
  CATEGORY_SPONSOR:{ w: 120,            h: 40 },
};

/** Pre-fetch and resize every ad image referenced in the document. */
async function buildImageCache(
  ads: PdfAdData[]
): Promise<ImageCache> {
  const cache: ImageCache = new Map();

  await Promise.all(
    ads
      .filter((ad) => !!ad.imageUrl)
      .map(async (ad) => {
        const key = ad.imageUrl;
        if (cache.has(key)) return; // deduplicate

        const dims =
          AD_IMAGE_SIZES[ad.effectivePlacement] ??
          { w: PAGE_INNER_W, h: 300 };

        const dataUri = await fetchAndResizeImage(
          ad.imageUrl,
          dims.w,
          dims.h,
          {
            // White background for all ad images (covers transparent PNGs)
            background: { r: 255, g: 255, b: 255, alpha: 1 },
            quality: 82,
          }
        );

        cache.set(key, dataUri);

        if (!dataUri) {
          console.warn(
            `[generator] Could not load image for ad "${ad.titleAr}" (${ad.imageUrl})`
          );
        }
      })
  );

  return cache;
}

/** Returns the pre-processed data-URI for an ad image, or null. */
function resolveAdImage(
  ad: PdfAdData,
  cache: ImageCache
): string | null {
  if (!ad.imageUrl) return null;
  return cache.get(ad.imageUrl) ?? null;
}

// ── Inline ad elements (rendered inside a section page) ───────────────────

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

  const content = dataUri
    ? React.createElement(Image, { src: dataUri, style: styles.adBannerImg })
    : React.createElement(
        View,
        { style: styles.adBannerBlock },
        React.createElement(Text, { style: styles.adBannerText }, ad.titleAr)
      );

  return wrapWithLink(href, content, { width: "100%" });
}

function AdSidebarElement({
  ad,
  dataUri,
  styles,
}: {
  ad: PdfAdData;
  dataUri: string | null;
  styles: ReturnType<typeof makeStyles>;
}) {
  const href = getAdHref(ad);

  const content = dataUri
    ? React.createElement(Image, { src: dataUri, style: styles.adSidebarImg })
    : React.createElement(Text, { style: styles.adSidebarText }, ad.titleAr);

  return React.createElement(
    View,
    { style: styles.adSidebarCol },
    wrapWithLink(href, content, { width: "100%" })
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
      `راعي: ${ad.titleEn ?? ad.titleAr}`
    )
  );
}

// ── Standalone ad page ──────────────────────────────────────────────────────

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
  const placement = ad.effectivePlacement;
  const href = getAdHref(ad);

  if (placement === "FULL_PAGE") {
    if (dataUri) {
      const image = React.createElement(Image, {
        src: dataUri,
        style: styles.adFullPage,
      });
      return React.createElement(
        Page,
        { size: pageSize, style: styles.adStandalonePage },
        wrapWithLink(href, image, { width: "100%", height: "100%" })
      );
    }

    // No image fallback
    const textCard = React.createElement(
      View,
      { style: [styles.adTextCard, { width: "80%", padding: 40 }] },
      React.createElement(Text, { style: styles.adTextTitle }, ad.titleAr),
      React.createElement(Text, { style: styles.adTextBody }, ad.titleEn ?? ad.titleAr)
    );
    return React.createElement(
      Page,
      { size: pageSize, style: styles.coverPage },
      wrapWithLink(href, textCard)
    );
  }

  // HALF_PAGE_TOP / HALF_PAGE_BOTTOM
  const isTop = placement === "HALF_PAGE_TOP";

  const imageNode = dataUri
    ? React.createElement(Image, { src: dataUri, style: styles.adHalfBlock })
    : React.createElement(
        View,
        { style: [styles.adTextCard, { height: 250 }] },
        React.createElement(Text, { style: styles.adTextTitle }, ad.titleAr),
        React.createElement(Text, { style: styles.adTextBody }, ad.titleEn ?? ad.titleAr)
      );

  const halfBlock = dataUri
    ? wrapWithLink(href, imageNode, { width: "100%" })
    : wrapWithLink(href, imageNode);

  return React.createElement(
    Page,
    { size: pageSize, style: styles.page },
    isTop ? halfBlock : React.createElement(View, { style: { flex: 1 } }),
    isTop ? React.createElement(View, { style: { flex: 1 } }) : halfBlock
  );
}

// ── Business card components ────────────────────────────────────────────────

function BusinessCardStandard({
  business,
  qrDataUrl,
  styles,
  includeQr,
  includeLogo: _includeLogo,
}: {
  business: PdfBusiness;
  qrDataUrl?: string;
  styles: ReturnType<typeof makeStyles>;
  includeQr: boolean;
  includeLogo: boolean;
}) {
  void _includeLogo;

  const hasQr = includeQr && !!qrDataUrl;
  const showLeftSide = hasQr;

  return React.createElement(
    View,
    { style: styles.businessCard },
    React.createElement(
      View,
      { style: showLeftSide ? styles.qrContainer : undefined },
      showLeftSide
        ? React.createElement(
            View,
            {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 4,
                alignItems: "center",
                width: 68,
              },
            },
            hasQr
              ? React.createElement(
                  Link,
                  { src: business.publicUrl, style: { display: "flex", alignItems: "center" } },
                  React.createElement(Image, { src: qrDataUrl!, style: styles.qrImage })
                )
              : null,
            hasQr
              ? React.createElement(
                  Link,
                  { src: business.publicUrl, style: { textDecoration: "none" } },
                  React.createElement(
                    Text,
                    { style: styles.qrHint },
                    "اضغط هنا لترى المزيد من المعلومات"
                  )
                )
              : null
          )
        : null,
      React.createElement(
        View,
        { style: showLeftSide ? styles.businessInfo : undefined },
        React.createElement(Text, { style: styles.businessName }, business.nameAr),
        business.addressAr
          ? React.createElement(Text, { style: styles.businessAddress }, business.addressAr)
          : null,
        business.descriptionAr
          ? React.createElement(
              Text,
              { style: styles.businessDescription },
              business.descriptionAr.slice(0, 120) +
                (business.descriptionAr.length > 120 ? "..." : "")
            )
          : null,
        business.phoneNumbers.length > 0
          ? React.createElement(
              View,
              { style: styles.phoneRow },
              ...business.phoneNumbers
                .slice(0, 3)
                .map((p) =>
                  React.createElement(
                    View,
                    { key: p.number, style: styles.phoneChip },
                    React.createElement(Text, { style: styles.phoneText }, p.number)
                  )
                )
            )
          : null
      )
    )
  );
}

function BusinessCardDense({
  business,
  styles,
}: {
  business: PdfBusiness;
  styles: ReturnType<typeof makeStyles>;
}) {
  return React.createElement(
    View,
    { style: styles.denseCard },
    React.createElement(Text, { style: styles.businessName }, business.nameAr),
    business.addressAr
      ? React.createElement(Text, { style: styles.businessAddress }, business.addressAr)
      : null,
    ...business.phoneNumbers
      .slice(0, 2)
      .map((p) =>
        React.createElement(Text, { key: p.number, style: styles.phoneText }, p.number)
      )
  );
}

// ── Cover page ──────────────────────────────────────────────────────────────

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
    React.createElement(Text, { style: styles.coverTitle }, input.coverTitleAr ?? input.titleAr),
    React.createElement(View, { style: styles.coverDivider }),
    input.coverSubtitleAr
      ? React.createElement(Text, { style: styles.coverSubtitle }, input.coverSubtitleAr)
      : null,
    input.showEditionMetadata
      ? React.createElement(
          Text,
          { style: styles.coverMeta },
          `${input.cityNameAr} • الإصدار ${input.editionNumber} • ${new Date().getFullYear()}`
        )
      : null
  );
}

// ── Divider page ────────────────────────────────────────────────────────────

function DividerPage({
  section,
  styles,
  pageSize,
}: {
  section: PdfCategorySection;
  styles: ReturnType<typeof makeStyles>;
  pageSize: "A4" | "LETTER";
}) {
  return React.createElement(
    Page,
    { size: pageSize, style: styles.dividerPage },
    React.createElement(
      Text,
      { style: styles.dividerIcon },
      section.icon ?? getCategoryIcon(section.nameAr)
    ),
    React.createElement(
      Text,
      { style: styles.dividerTitle },
      section.sectionTitleAr ?? section.nameAr
    ),
    React.createElement(View, { style: styles.dividerAccentBar })
  );
}

// ── Page-number Index ───────────────────────────────────────────────────────

interface PageMapEntry {
  categoryId: string;
  nameAr: string;
  icon: string;
  contentPage: number;
  businesses: { id: string; nameAr: string; page: number }[];
}

function buildPageMap(
  sections: PdfCategorySection[],
  hasIntro: boolean
): PageMapEntry[] {
  let pageCounter = 1 + (hasIntro ? 1 : 0) + 1;

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
  const pageMap = buildPageMap(sections, hasIntro);

  return React.createElement(
    Page,
    { size: pageSize, style: styles.page },
    React.createElement(Text, { style: styles.indexTitle }, "الفهرس"),
    ...pageMap.flatMap((entry) => [
      React.createElement(
        View,
        { key: `idx-cat-${entry.categoryId}`, style: styles.indexCategoryRow },
        React.createElement(Text, { style: styles.indexPageNum }, `${entry.contentPage}`),
        React.createElement(
          Text,
          { style: styles.indexCategoryName },
          `${entry.icon}  ${entry.nameAr}`
        )
      ),
      ...entry.businesses.map((b) =>
        React.createElement(
          View,
          { key: `idx-biz-${b.id}`, style: styles.indexBusinessRow },
          React.createElement(Text, { style: styles.indexBusinessPageNum }, `${b.page}`),
          React.createElement(Text, { style: styles.indexBusinessName }, b.nameAr)
        )
      ),
    ])
  );
}

// ── Category section page (with inline ad support) ─────────────────────────

function CategorySectionPage({
  section,
  qrMap,
  styles,
  pageSize,
  includeQr,
  includeLogo,
  layout,
  isPreview,
  inlineAd,
  imageCache,
}: {
  section: PdfCategorySection;
  qrMap: Map<string, string>;
  styles: ReturnType<typeof makeStyles>;
  pageSize: "A4" | "LETTER";
  includeQr: boolean;
  includeLogo: boolean;
  layout: PdfLayoutConfig;
  isPreview: boolean;
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
      ? React.createElement(
          View,
          { style: styles.adBannerBlock },
          React.createElement(AdBannerElement, { ad: inlineAd, dataUri: adDataUri, styles })
        )
      : null;

  const footerBanner =
    inlineAd && placement === "FOOTER_BANNER"
      ? React.createElement(
          View,
          { style: [styles.adBannerBlock, { marginTop: 8 }] },
          React.createElement(AdBannerElement, { ad: inlineAd, dataUri: adDataUri, styles })
        )
      : null;

  const hasSidebar =
    inlineAd && (placement === "SIDEBAR_LEFT" || placement === "SIDEBAR_RIGHT");

  const businessList = isDense
    ? React.createElement(
        View,
        { style: styles.denseGrid },
        ...section.businesses.map((b) =>
          React.createElement(BusinessCardDense, { key: b.id, business: b, styles })
        )
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
            includeLogo,
          })
        )
      );

  const contentArea = hasSidebar
    ? React.createElement(
        View,
        {
          style: {
            display: "flex",
            flexDirection:
              placement === "SIDEBAR_LEFT" ? "row" : "row-reverse",
            alignItems: "stretch",
            gap: 8,
            flex: 1,
          },
        },
        businessList,
        React.createElement(AdSidebarElement, {
          ad: inlineAd!,
          dataUri: adDataUri,
          styles,
        })
      )
    : businessList;

  return React.createElement(
    Page,
    { size: pageSize, style: styles.page },
    isPreview ? React.createElement(Text, { style: styles.watermark }, "مسودة") : null,
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
        section.sectionTitleAr ?? section.nameAr
      )
    ),
    section.sectionIntroAr
      ? React.createElement(Text, { style: styles.sectionIntro }, section.sectionIntroAr)
      : null,
    contentArea,
    footerBanner,
    layout.showPageNumbers
      ? React.createElement(Text, {
          style: styles.pageNumber,
          render: ({ pageNumber }: { pageNumber: number }) => `${pageNumber}`,
        })
      : null
  );
}

// ── Profile pages ───────────────────────────────────────────────────────────

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
            style: { width: 80, height: 40, objectFit: "contain", alignSelf: "flex-end", marginBottom: 8 },
          })
        : null,
      React.createElement(Text, { style: styles.profileTitle }, profile.titleAr),
      profile.shortTextAr
        ? React.createElement(Text, { style: styles.profileBody }, profile.shortTextAr)
        : null,
      profile.bodyTextAr
        ? React.createElement(Text, { style: styles.profileBody }, profile.bodyTextAr)
        : null,
      profile.websiteUrl
        ? React.createElement(Text, { style: styles.profileMeta }, `الموقع: ${profile.websiteUrl}`)
        : null,
      profile.supportPhone
        ? React.createElement(Text, { style: styles.profileMeta }, `الدعم: ${profile.supportPhone}`)
        : null,
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
            style: { width: 60, height: 60, borderRadius: 30, alignSelf: "flex-end", marginBottom: 8 },
          })
        : null,
      React.createElement(Text, { style: styles.profileTitle }, profile.fullName),
      profile.roleTitleAr
        ? React.createElement(Text, { style: styles.profileMeta }, profile.roleTitleAr)
        : null,
      profile.shortBioAr
        ? React.createElement(Text, { style: styles.profileBody }, profile.shortBioAr)
        : null,
      profile.ctaTextAr
        ? React.createElement(Text, { style: styles.profileMeta }, profile.ctaTextAr)
        : null
    )
  );
}

// ── Main document builder ───────────────────────────────────────────────────

async function buildDocument(input: PdfDocumentInput) {
  registerFonts();
  const styles = makeStyles(input.theme, input.margins);

  const sortedSections = [...input.categorySections]
    .sort((a, b) => a.nameAr.localeCompare(b.nameAr, "ar"))
    .map((sec) => ({
      ...sec,
      businesses: [...sec.businesses].sort((a, b) =>
        a.nameAr.localeCompare(b.nameAr, "ar")
      ),
    }));

  // ── QR codes ──────────────────────────────────────────────────────────────
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

  // ── Pre-process all ad images via Sharp ───────────────────────────────────
  const imageCache = await buildImageCache(input.ads);

  // ── Partition ads ─────────────────────────────────────────────────────────
  const standaloneAds = input.ads
    .filter((a) => isStandalonePage(a.effectivePlacement))
    .sort((a, b) => b.priority - a.priority);

  const inlineAds = input.ads
    .filter((a) => isInlinePlacement(a.effectivePlacement))
    .sort((a, b) => b.priority - a.priority);

  const pinnedStandalone = new Map<string, PdfAdData[]>();
  const pinnedInline     = new Map<string, PdfAdData>();
  const floatingStandalone: PdfAdData[] = [];
  const floatingInline:     PdfAdData[] = [];

  for (const ad of standaloneAds) {
    const pin = (ad as PdfAdData & { positionAfterCategoryId?: string })
      .positionAfterCategoryId;
    if (pin) {
      const arr = pinnedStandalone.get(pin) ?? [];
      arr.push(ad);
      pinnedStandalone.set(pin, arr);
    } else {
      floatingStandalone.push(ad);
    }
  }

  for (const ad of inlineAds) {
    const pin = (ad as PdfAdData & { positionAfterCategoryId?: string })
      .positionAfterCategoryId;
    if (pin && !pinnedInline.has(pin)) {
      pinnedInline.set(pin, ad);
    } else {
      floatingInline.push(ad);
    }
  }

  let floatSIdx = 0;
  let floatIIdx = 0;

  const hasIntro = !!input.introTextAr;
  const pages: React.ReactElement[] = [];

  // ── Assemble pages ────────────────────────────────────────────────────────
  pages.push(React.createElement(CoverPage, { key: "cover", input, styles }));

  if (hasIntro) {
    pages.push(
      React.createElement(
        Page,
        { key: "intro", size: input.pageSize, style: styles.page },
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
        section,
        styles,
        pageSize: input.pageSize,
      })
    );

    let sectionInlineAd: PdfAdData | null = null;
    if (pinnedInline.has(section.categoryId)) {
      sectionInlineAd = pinnedInline.get(section.categoryId)!;
    } else if (floatingInline.length > 0 && idx % 2 === 0) {
      sectionInlineAd = floatingInline[floatIIdx % floatingInline.length];
      floatIIdx++;
    }

    pages.push(
      React.createElement(CategorySectionPage, {
        key: `section-${section.categoryId}`,
        section,
        qrMap,
        styles,
        pageSize: input.pageSize,
        includeQr: input.includeQrCodes,
        includeLogo: input.includeBusinessLogos,
        layout: input.layout,
        isPreview: input.isPreview,
        inlineAd: sectionInlineAd,
        imageCache,
      })
    );

    const pinnedHere = pinnedStandalone.get(section.categoryId) ?? [];
    for (const ad of pinnedHere) {
      pages.push(
        React.createElement(StandaloneAdPage, {
          key: `ad-pinned-${ad.id}`,
          ad,
          dataUri: resolveAdImage(ad, imageCache),
          styles,
          pageSize: input.pageSize,
        })
      );
    }

    if (
      floatingStandalone.length > 0 &&
      (idx + 1) % 2 === 0 &&
      pinnedHere.length === 0
    ) {
      const ad = floatingStandalone[floatSIdx % floatingStandalone.length];
      floatSIdx++;
      pages.push(
        React.createElement(StandaloneAdPage, {
          key: `ad-float-${ad.id}-${idx}`,
          ad,
          dataUri: resolveAdImage(ad, imageCache),
          styles,
          pageSize: input.pageSize,
        })
      );
    }
  });

  if (input.closingTextAr) {
    pages.push(
      React.createElement(
        Page,
        { key: "closing", size: input.pageSize, style: styles.page },
        React.createElement(Text, { style: styles.introText }, input.closingTextAr)
      )
    );
  }

  if (input.includeWebsiteProfile && input.websiteProfile) {
    pages.push(
      React.createElement(WebsiteProfilePage, {
        key: "website-profile",
        profile: input.websiteProfile,
        styles,
        pageSize: input.pageSize,
      })
    );
  }

  if (input.includeDeveloperProfile && input.developerProfile) {
    pages.push(
      React.createElement(DeveloperProfilePage, {
        key: "developer-profile",
        profile: input.developerProfile,
        styles,
        pageSize: input.pageSize,
      })
    );
  }

  return React.createElement(Document, { title: input.titleAr }, ...pages);
}

// ── Public entry point ──────────────────────────────────────────────────────

export async function generatePdf(
  input: PdfDocumentInput
): Promise<GenerationResult> {
  try {
    const doc = await buildDocument(input);
    const instance = pdf(doc);
    const blob = await instance.toBlob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const pagesCount =
      input.categorySections.length * 2 +
      2 +
      (input.introTextAr ? 1 : 0) +
      (input.closingTextAr ? 1 : 0) +
      (input.includeWebsiteProfile && input.websiteProfile ? 1 : 0) +
      (input.includeDeveloperProfile && input.developerProfile ? 1 : 0);

    const businessesCount = input.categorySections.reduce(
      (acc, s) => acc + s.businesses.length,
      0
    );

    return { ok: true, buffer, pagesCount, businessesCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[PDF Generator]", message);
    return { ok: false, error: message };
  }
}
