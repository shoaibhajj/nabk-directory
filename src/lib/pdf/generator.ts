/**
 * PDF Generation Engine for دليل النبك.
 *
 * Uses @react-pdf/renderer to build an Arabic RTL PDF document.
 * Entry point: generatePdf(input: PdfDocumentInput) => Promise<GenerationResult>
 *
 * Round 1 fixes:
 * - TOC: clean category list (no 'منشأة X' placeholder)
 * - Alphabetical index moved BEFORE content, hierarchical format
 * - Divider page before each category (dynamic icon + name)
 * - Ads: shown after every section, not just every 3rd
 * - Logos: rendered when includeBusinessLogos = true
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

// ── Category icon map (dynamic divider pages) ─────────────────────────────────

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
  // exact match first
  if (CATEGORY_ICONS[nameAr]) return CATEGORY_ICONS[nameAr];
  // partial match
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

// ── Style factory (depends on theme) ───────────────────────────────────────

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
    // ─ Cover
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
    // ─ Divider page (before each category)
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
    // ─ Section header (inline, within content page)
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
    // ─ Business card (STANDARD template)
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
    // ─ Logo avatar fallback
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
    // ─ Dense template (2-column grid)
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
    // ─ QR
    qrContainer: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    qrImage: { width: 52, height: 52 },
    businessInfo: { flex: 1, paddingRight: 8 },
    // ─ Ad blocks
    adFullPage: {
      width: "100%",
      flex: 1,
    },
    adHalfPage: {
      width: "100%",
      height: "45%",
    },
    adImage: { width: "100%", height: "100%", objectFit: "contain" },
    // ─ Ad text fallback (when no image)
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
    // ─ Profile blocks
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
    // ─ TOC (clean, category-level)
    tocTitle: {
      fontFamily: "Cairo",
      fontSize: 20,
      fontWeight: 700,
      color: theme.primaryColor,
      textAlign: "right",
      direction: "rtl" as never,
      marginBottom: 16,
    },
    tocRow: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderColor,
    },
    tocCategoryName: {
      fontFamily: "Cairo",
      fontSize: 12,
      fontWeight: 700,
      color: theme.textColor,
      direction: "rtl" as never,
    },
    tocCount: {
      fontFamily: "Cairo",
      fontSize: 10,
      color: theme.mutedColor,
    },
    tocIcon: {
      fontFamily: "Cairo",
      fontSize: 14,
      marginLeft: 6,
    },
    // ─ Alphabetical index (hierarchical)
    indexTitle: {
      fontFamily: "Cairo",
      fontSize: 20,
      fontWeight: 700,
      color: theme.primaryColor,
      textAlign: "right",
      direction: "rtl" as never,
      marginBottom: 12,
    },
    indexCategoryHeader: {
      backgroundColor: theme.sectionBgColor,
      paddingVertical: 6,
      paddingHorizontal: 10,
      marginTop: 10,
      marginBottom: 4,
      borderRadius: 4,
      borderRightWidth: 3,
      borderRightColor: theme.primaryColor,
    },
    indexCategoryHeaderText: {
      fontFamily: "Cairo",
      fontSize: 11,
      fontWeight: 700,
      color: theme.primaryColor,
      textAlign: "right",
      direction: "rtl" as never,
    },
    indexRow: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderColor,
    },
    indexName: {
      fontFamily: "Cairo",
      fontSize: 10,
      color: theme.textColor,
      direction: "rtl" as never,
      flex: 1,
    },
    indexSubcategory: {
      fontFamily: "Cairo",
      fontSize: 9,
      color: theme.mutedColor,
      direction: "rtl" as never,
      marginLeft: 8,
    },
    // ─ Page number
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
    // ─ Watermark
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
    // ─ Intro text
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

// ── Sub-components ──────────────────────────────────────────────────────────────

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
    return React.createElement(Image, {
      src: business.logoUrl,
      style: styles.logoImage,
    });
  }
  // Fallback: first letter avatar
  return React.createElement(
    View,
    { style: styles.logoAvatar },
    React.createElement(
      Text,
      { style: styles.logoAvatarText },
      business.nameAr.charAt(0)
    )
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
      // Left side: logo or QR
      showLeftSide
        ? React.createElement(
            View,
            { style: { display: "flex", flexDirection: "column", gap: 4, alignItems: "center" } },
            hasLogo
              ? React.createElement(LogoElement, { business, styles, includeLogo })
              : null,
            hasQr
              ? React.createElement(Image, { src: qrDataUrl!, style: styles.qrImage })
              : null
          )
        : null,
      // Right side: info
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
    input.isPreview
      ? React.createElement(Text, { style: styles.watermark }, "مسودة")
      : null,
    React.createElement(Text, { style: styles.coverTitle },
      input.coverTitleAr ?? input.titleAr
    ),
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

// ── Divider page (before each category section) ───────────────────────────────

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

// ── Table of contents (clean — category names + business count) ───────────────

function TocPage({
  sections,
  styles,
  pageSize,
}: {
  sections: PdfCategorySection[];
  styles: ReturnType<typeof makeStyles>;
  pageSize: "A4" | "LETTER";
}) {
  return React.createElement(
    Page,
    { size: pageSize, style: styles.page },
    React.createElement(Text, { style: styles.tocTitle }, "فهرس المحتوى"),
    ...sections.map((sec) =>
      React.createElement(
        View,
        { key: sec.categoryId, style: styles.tocRow },
        React.createElement(Text, { style: styles.tocCount },
          `${sec.businesses.length} منشأة`
        ),
        React.createElement(
          View,
          { style: { display: "flex", flexDirection: "row", alignItems: "center" } },
          React.createElement(
            Text,
            { style: styles.tocIcon },
            sec.icon ?? getCategoryIcon(sec.nameAr)
          ),
          React.createElement(
            Text,
            { style: styles.tocCategoryName },
            sec.sectionTitleAr ?? sec.nameAr
          )
        )
      )
    )
  );
}

// ── Alphabetical index (hierarchical, BEFORE content) ────────────────────────
// Note: @react-pdf/renderer does not support cross-page link targets,
// so page numbers here are positional references from section order.

function IndexPage({
  sections,
  styles,
  pageSize,
}: {
  sections: PdfCategorySection[];
  styles: ReturnType<typeof makeStyles>;
  pageSize: "A4" | "LETTER";
}) {
  // Sort sections alphabetically for the index
  const sortedSections = [...sections].sort((a, b) =>
    a.nameAr.localeCompare(b.nameAr, "ar")
  );

  return React.createElement(
    Page,
    { size: pageSize, style: styles.page },
    React.createElement(Text, { style: styles.indexTitle }, "الفهرس الأبجدي"),
    ...sortedSections.flatMap((sec) => [
      // Category header row
      React.createElement(
        View,
        { key: `cat-${sec.categoryId}`, style: styles.indexCategoryHeader },
        React.createElement(
          Text,
          { style: styles.indexCategoryHeaderText },
          `${sec.icon ?? getCategoryIcon(sec.nameAr)}  ${sec.nameAr}`
        )
      ),
      // Business rows under this category, sorted alphabetically
      ...sec.businesses
        .slice()
        .sort((a, b) => a.nameAr.localeCompare(b.nameAr, "ar"))
        .map((b) =>
          React.createElement(
            View,
            { key: `biz-${b.id}`, style: styles.indexRow },
            React.createElement(Text, { style: styles.indexName }, b.nameAr),
            b.addressAr
              ? React.createElement(
                  Text,
                  { style: styles.indexSubcategory },
                  b.addressAr.split(",")[0] // show first part of address as context
                )
              : null
          )
        ),
    ])
  );
}

// ── Ad block (full page with image, or text fallback) ─────────────────────────

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
    // Full page ad
    if (ad.imageUrl) {
      return React.createElement(
        Page,
        { size: pageSize, style: styles.coverPage },
        React.createElement(Image, { src: ad.imageUrl, style: styles.adFullPage })
      );
    }
    // Full page text fallback
    return React.createElement(
      Page,
      { size: pageSize, style: styles.coverPage },
      React.createElement(
        View,
        { style: [styles.adTextCard, { width: "80%", padding: 40 }] },
        React.createElement(Text, { style: styles.adTextTitle }, ad.titleAr),
        React.createElement(Text, { style: styles.adTextBody }, ad.advertiserName),
        ad.phone
          ? React.createElement(Text, { style: styles.adTextPhone }, ad.phone)
          : null
      )
    );
  }

  // Inline ad (half-page style, embedded in content page)
  if (ad.imageUrl) {
    return React.createElement(Image, { src: ad.imageUrl, style: styles.adHalfPage });
  }
  return React.createElement(
    View,
    { style: styles.adTextCard },
    React.createElement(Text, { style: styles.adTextTitle }, ad.titleAr),
    React.createElement(Text, { style: styles.adTextBody }, ad.advertiserName),
    ad.phone
      ? React.createElement(Text, { style: styles.adTextPhone }, ad.phone)
      : null
  );
}

// ── Profile blocks ──────────────────────────────────────────────────────────────

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
        ? React.createElement(
            Text,
            { style: styles.profileMeta },
            `الموقع: ${profile.websiteUrl}`
          )
        : null,
      profile.supportPhone
        ? React.createElement(
            Text,
            { style: styles.profileMeta },
            `الدعم: ${profile.supportPhone}`
          )
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

// ── Category section page(s) ───────────────────────────────────────────────────────

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
    // Section header (compact, since there's already a divider page)
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

// ── Main document builder ───────────────────────────────────────────────────────────

async function buildDocument(input: PdfDocumentInput) {
  registerFonts();
  const styles = makeStyles(input.theme, input.margins);

  // Pre-generate all QR codes in parallel
  const qrMap = new Map<string, string>();
  if (input.includeQrCodes) {
    await Promise.all(
      input.categorySections.flatMap((s) =>
        s.businesses.map(async (b) => {
          const dataUrl = await buildQrDataUrl(b.publicUrl);
          qrMap.set(b.id, dataUrl);
        })
      )
    );
  }

  // Separate ads by placement type
  const fullPageAds = input.ads
    .filter((a) => a.effectivePlacement === "FULL_PAGE")
    .sort((a, b) => b.priority - a.priority);

  const inlineAds = input.ads
    .filter((a) => a.effectivePlacement !== "FULL_PAGE")
    .sort((a, b) => b.priority - a.priority);

  // Ad round-robin counters
  let fullPageAdIdx = 0;
  let inlineAdIdx = 0;

  // Build pages array
  const pages: React.ReactElement[] = [];

  // 1. Cover
  pages.push(React.createElement(CoverPage, { key: "cover", input, styles }));

  // 2. Intro text page (if present)
  if (input.introTextAr) {
    pages.push(
      React.createElement(
        Page,
        { key: "intro", size: input.pageSize, style: styles.page },
        React.createElement(Text, { style: styles.introText }, input.introTextAr)
      )
    );
  }

  // 3. TOC (clean category list)
  pages.push(
    React.createElement(TocPage, {
      key: "toc",
      sections: input.categorySections,
      styles,
      pageSize: input.pageSize,
    })
  );

  // 4. Alphabetical Index (BEFORE content)
  if (input.includeAlphabeticalIndex) {
    pages.push(
      React.createElement(IndexPage, {
        key: "index",
        sections: input.categorySections,
        styles,
        pageSize: input.pageSize,
      })
    );
  }

  // 5. Category sections with divider pages + interleaved ads
  input.categorySections.forEach((section, idx) => {
    // 5a. Divider page before each category
    pages.push(
      React.createElement(DividerPage, {
        key: `divider-${section.categoryId}`,
        section,
        styles,
        pageSize: input.pageSize,
      })
    );

    // 5b. Category content page
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

    // 5c. Insert full-page ad after every 2nd section (if available)
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

    // 5d. Insert inline ad after every section (if available, round-robin)
    if (inlineAds.length > 0 && (idx + 1) % 2 !== 0) {
      const ad = inlineAds[inlineAdIdx % inlineAds.length];
      inlineAdIdx++;
      // Inline ads are appended as a small block on a separate page
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

  // 6. Closing text
  if (input.closingTextAr) {
    pages.push(
      React.createElement(
        Page,
        { key: "closing", size: input.pageSize, style: styles.page },
        React.createElement(Text, { style: styles.introText }, input.closingTextAr)
      )
    );
  }

  // 7. Website profile
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

  // 8. Developer profile
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

// ── Public entry point ─────────────────────────────────────────────────────────────

/**
 * Generates a PDF from a PdfDocumentInput and returns a Buffer.
 * Call this from a Server Action or API Route — never from a Client Component.
 */
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
      input.categorySections.length * 2 + // each section now has divider + content page
      3 + // cover + toc + index
      (input.introTextAr ? 1 : 0) +
      (input.closingTextAr ? 1 : 0) +
      (input.includeWebsiteProfile && input.websiteProfile ? 1 : 0) +
      (input.includeDeveloperProfile && input.developerProfile ? 1 : 0) +
      Math.floor(input.categorySections.length / 2) * (input.ads.filter(a => a.effectivePlacement === "FULL_PAGE").length > 0 ? 1 : 0);
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
