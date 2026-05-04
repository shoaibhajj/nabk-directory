/**
 * PDF Generation Engine for دليل النبك.
 *
 * Changes in this revision:
 * - TOC (فهرس المحتوى) removed entirely
 * - Old flat IndexPage removed
 * - New PageNumberIndexPage: hierarchical (Category → Subcategory → business + page#)
 * - Categories sorted alphabetically by Arabic name (localeCompare ar)
 * - Businesses within each category sorted alphabetically by Arabic name
 * - Ads bug fixed: all active PdfAd records are injected regardless of edition link
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
  Font,
} from "@react-pdf/renderer";
import QRCode from "qrcode";
import { registerFonts } from "./fonts";
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

// ── Category icon map ─────────────────────────────────────────────────────────

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

// ── QR helper ─────────────────────────────────────────────────────────────────

async function buildQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 120,
    color: { dark: "#1a1a1a", light: "#ffffff" },
  });
}

// ── Style factory ─────────────────────────────────────────────────────────────

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
    dividerIcon: {
      fontSize: 64,
      marginBottom: 24,
      textAlign: "center",
    },
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
    logoAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.sectionBgColor,
      borderWidth: 1,
      borderColor: theme.borderColor,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    logoAvatarText: {
      fontFamily: "Cairo",
      fontSize: 18,
      fontWeight: 700,
      color: theme.primaryColor,
    },
    logoImage: {
      width: 44,
      height: 44,
      objectFit: "contain",
      borderRadius: 4,
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
    qrImage: { width: 52, height: 52 },
    businessInfo: { flex: 1, paddingRight: 8 },
    adFullPage: { width: "100%", flex: 1 },
    adHalfPage: { width: "100%", height: "45%" },
    adImage: { width: "100%", height: "100%", objectFit: "contain" },
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
    // ── New Page-Number Index styles ─────────────────────────────────────────
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
      color: theme.mutedColor,
      direction: "ltr" as never,
      minWidth: 24,
      textAlign: "center",
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
    // ── shared
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

// ── Sub-components ────────────────────────────────────────────────────────────

function LogoElement({
  business,
  styles,
  includeLogo,
}: {
  business: PdfBusiness;
  styles: ReturnType<typeof makeStyles>;
  includeLogo: boolean;
}) {
  if (!includeLogo) return null;
  if (business.logoUrl) {
    return React.createElement(Image, { src: business.logoUrl, style: styles.logoImage });
  }
  return React.createElement(
    View,
    { style: styles.logoAvatar },
    React.createElement(Text, { style: styles.logoAvatarText }, business.nameAr.charAt(0))
  );
}

function BusinessCardStandard({
  business,
  qrDataUrl,
  styles,
  includeQr,
  includeLogo,
}: {
  business: PdfBusiness;
  qrDataUrl?: string;
  styles: ReturnType<typeof makeStyles>;
  includeQr: boolean;
  includeLogo: boolean;
}) {
  const hasQr = includeQr && !!qrDataUrl;
  const hasLogo = includeLogo;
  const showLeftSide = hasQr || hasLogo;

  return React.createElement(
    View,
    { style: styles.businessCard },
    React.createElement(
      View,
      { style: showLeftSide ? styles.qrContainer : undefined },
      showLeftSide
        ? React.createElement(
            View,
            { style: { display: "flex", flexDirection: "column", gap: 4, alignItems: "center" } },
            hasLogo ? React.createElement(LogoElement, { business, styles, includeLogo }) : null,
            hasQr ? React.createElement(Image, { src: qrDataUrl!, style: styles.qrImage }) : null
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
              ...business.phoneNumbers.slice(0, 3).map((p) =>
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
    business.phoneNumbers.slice(0, 2).map((p) =>
      React.createElement(Text, { key: p.number, style: styles.phoneText }, p.number)
    )
  );
}

// ── Cover page ────────────────────────────────────────────────────────────────

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
    input.isPreview ? React.createElement(Text, { style: styles.watermark }, "مسودة") : null,
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

// ── Divider page ──────────────────────────────────────────────────────────────

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
  const title = section.sectionTitleAr ?? section.nameAr;
  return React.createElement(
    Page,
    { size: pageSize, style: styles.dividerPage },
    React.createElement(Text, { style: styles.dividerIcon }, icon),
    React.createElement(Text, { style: styles.dividerTitle }, title),
    React.createElement(View, { style: styles.dividerAccentBar })
  );
}

// ── Page-number Index (new) ───────────────────────────────────────────────────
//
// Layout: cover=1, intro?=1, then per category: divider + content = 2 pages each.
// We pre-compute a page map so every category & business knows its page.
// The index is placed right after the cover (and intro if present).

interface PageMapEntry {
  categoryId: string;
  nameAr: string;
  icon: string;
  contentPage: number; // the content page (after divider)
  businesses: { id: string; nameAr: string; page: number }[];
}

function buildPageMap(
  sections: PdfCategorySection[],
  hasIntro: boolean
): PageMapEntry[] {
  // Pages before first category: cover(1) + intro(0|1) + index(1)
  let pageCounter = 1 + (hasIntro ? 1 : 0) + 1; // index page itself is page 2 or 3

  return sections.map((sec) => {
    const dividerPage = ++pageCounter; // divider page
    const contentPage = ++pageCounter; // content page
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
      // Category header row with page number
      React.createElement(
        View,
        { key: `idx-cat-${entry.categoryId}`, style: styles.indexCategoryRow },
        React.createElement(
          Text,
          { style: styles.indexCategoryName },
          `${entry.icon}  ${entry.nameAr}`
        ),
        React.createElement(Text, { style: styles.indexPageNum }, `${entry.contentPage}`)
      ),
      // Business rows under this category
      ...entry.businesses.map((b) =>
        React.createElement(
          View,
          { key: `idx-biz-${b.id}`, style: styles.indexBusinessRow },
          React.createElement(Text, { style: styles.indexBusinessName }, b.nameAr),
          React.createElement(Text, { style: styles.indexPageNum }, `${b.page}`)
        )
      ),
    ])
  );
}

// ── Ad block ──────────────────────────────────────────────────────────────────

function AdBlock({
  ad,
  styles,
  pageSize,
  isFullPage,
}: {
  ad: PdfAdData;
  styles: ReturnType<typeof makeStyles>;
  pageSize: "A4" | "LETTER";
  isFullPage: boolean;
}) {
  if (isFullPage) {
    if (ad.imageUrl) {
      return React.createElement(
        Page,
        { size: pageSize, style: styles.coverPage },
        React.createElement(Image, { src: ad.imageUrl, style: styles.adFullPage })
      );
    }
    return React.createElement(
      Page,
      { size: pageSize, style: styles.coverPage },
      React.createElement(
        View,
        { style: [styles.adTextCard, { width: "80%", padding: 40 }] },
        React.createElement(Text, { style: styles.adTextTitle }, ad.titleAr),
        React.createElement(Text, { style: styles.adTextBody }, ad.advertiserName),
        ad.phone ? React.createElement(Text, { style: styles.adTextPhone }, ad.phone) : null
      )
    );
  }
  if (ad.imageUrl) {
    return React.createElement(Image, { src: ad.imageUrl, style: styles.adHalfPage });
  }
  return React.createElement(
    View,
    { style: styles.adTextCard },
    React.createElement(Text, { style: styles.adTextTitle }, ad.titleAr),
    React.createElement(Text, { style: styles.adTextBody }, ad.advertiserName),
    ad.phone ? React.createElement(Text, { style: styles.adTextPhone }, ad.phone) : null
  );
}

// ── Profile blocks ────────────────────────────────────────────────────────────

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

// ── Category section page ─────────────────────────────────────────────────────

function CategorySectionPage({
  section,
  qrMap,
  styles,
  pageSize,
  includeQr,
  includeLogo,
  layout,
  isPreview,
}: {
  section: PdfCategorySection;
  qrMap: Map<string, string>;
  styles: ReturnType<typeof makeStyles>;
  pageSize: "A4" | "LETTER";
  includeQr: boolean;
  includeLogo: boolean;
  layout: PdfLayoutConfig;
  isPreview: boolean;
}) {
  const isDense = section.listingTemplate === "DENSE";

  const businessElements = isDense
    ? React.createElement(
        View,
        { style: styles.denseGrid },
        ...section.businesses.map((b) =>
          React.createElement(BusinessCardDense, { key: b.id, business: b, styles })
        )
      )
    : React.createElement(
        View,
        null,
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

  return React.createElement(
    Page,
    { size: pageSize, style: styles.page },
    isPreview ? React.createElement(Text, { style: styles.watermark }, "مسودة") : null,
    React.createElement(
      View,
      {
        style: section.colorTheme
          ? { ...styles.sectionHeader, backgroundColor: section.colorTheme }
          : styles.sectionHeader,
      },
      React.createElement(
        Text,
        { style: styles.sectionHeaderText },
        section.sectionTitleAr ?? section.nameAr
      )
    ),
    section.sectionIntroAr
      ? React.createElement(Text, { style: styles.sectionIntro }, section.sectionIntroAr)
      : null,
    businessElements,
    layout.showPageNumbers
      ? React.createElement(Text, {
          style: styles.pageNumber,
          render: ({ pageNumber }: { pageNumber: number }) => `${pageNumber}`,
        })
      : null
  );
}

// ── Main document builder ─────────────────────────────────────────────────────

async function buildDocument(input: PdfDocumentInput) {
  registerFonts();
  const styles = makeStyles(input.theme, input.margins);

  // ── Sort categories alphabetically by Arabic name ──────────────────────────
  const sortedSections = [...input.categorySections].sort((a, b) =>
    a.nameAr.localeCompare(b.nameAr, "ar")
  );

  // ── Sort businesses alphabetically within each category ───────────────────
  for (const sec of sortedSections) {
    sec.businesses = [...sec.businesses].sort((a, b) =>
      a.nameAr.localeCompare(b.nameAr, "ar")
    );
  }

  // ── Pre-generate QR codes ──────────────────────────────────────────────────
  const qrMap = new Map<string, string>();
  if (input.includeQrCodes) {
    await Promise.all(
      sortedSections.flatMap((s) =>
        s.businesses.map(async (b) => {
          const dataUrl = await buildQrDataUrl(b.publicUrl);
          qrMap.set(b.id, dataUrl);
        })
      )
    );
  }

  // ── Separate ads by placement ──────────────────────────────────────────────
  const fullPageAds = input.ads
    .filter((a) => a.effectivePlacement === "FULL_PAGE")
    .sort((a, b) => b.priority - a.priority);

  const inlineAds = input.ads
    .filter((a) => a.effectivePlacement !== "FULL_PAGE")
    .sort((a, b) => b.priority - a.priority);

  let fullPageAdIdx = 0;
  let inlineAdIdx = 0;

  const hasIntro = !!input.introTextAr;
  const pages: React.ReactElement[] = [];

  // 1. Cover
  pages.push(React.createElement(CoverPage, { key: "cover", input, styles }));

  // 2. Intro (optional)
  if (hasIntro) {
    pages.push(
      React.createElement(
        Page,
        { key: "intro", size: input.pageSize, style: styles.page },
        React.createElement(Text, { style: styles.introText }, input.introTextAr)
      )
    );
  }

  // 3. Page-number index (replaces both old TOC and old alphabetical index)
  pages.push(
    React.createElement(PageNumberIndexPage, {
      key: "index",
      sections: sortedSections,
      styles,
      pageSize: input.pageSize,
      hasIntro,
    })
  );

  // 4. Category sections
  sortedSections.forEach((section, idx) => {
    // 4a. Divider
    pages.push(
      React.createElement(DividerPage, {
        key: `divider-${section.categoryId}`,
        section,
        styles,
        pageSize: input.pageSize,
      })
    );

    // 4b. Content
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
      })
    );

    // 4c. Full-page ad every 2nd section
    if ((idx + 1) % 2 === 0 && fullPageAds.length > 0) {
      const ad = fullPageAds[fullPageAdIdx % fullPageAds.length];
      fullPageAdIdx++;
      pages.push(
        React.createElement(AdBlock, {
          key: `ad-full-${ad.id}-${idx}`,
          ad,
          styles,
          pageSize: input.pageSize,
          isFullPage: true,
        })
      );
    }

    // 4d. Inline ad on odd sections
    if (inlineAds.length > 0 && (idx + 1) % 2 !== 0) {
      const ad = inlineAds[inlineAdIdx % inlineAds.length];
      inlineAdIdx++;
      pages.push(
        React.createElement(
          Page,
          { key: `ad-inline-${ad.id}-${idx}`, size: input.pageSize, style: styles.page },
          React.createElement(AdBlock, {
            key: `ad-inline-block-${ad.id}`,
            ad,
            styles,
            pageSize: input.pageSize,
            isFullPage: false,
          })
        )
      );
    }
  });

  // 5. Closing text
  if (input.closingTextAr) {
    pages.push(
      React.createElement(
        Page,
        { key: "closing", size: input.pageSize, style: styles.page },
        React.createElement(Text, { style: styles.introText }, input.closingTextAr)
      )
    );
  }

  // 6. Website profile
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

  // 7. Developer profile
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

// ── Public entry point ────────────────────────────────────────────────────────

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
      2 + // cover + index
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
