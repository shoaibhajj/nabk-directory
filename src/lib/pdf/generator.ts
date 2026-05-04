/**
 * PDF Generation Engine for دليل النبك.
 *
 * Uses @react-pdf/renderer to build an Arabic RTL PDF document.
 * Entry point: generatePdf(input: PdfDocumentInput) => Promise<GenerationResult>
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
      paddingBottom: margins.bottom + 20, // extra for page number
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
    // ─ Section header
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
    // ─ Index
    indexRow: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 4,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderColor,
    },
    indexName: {
      fontFamily: "Cairo",
      fontSize: 10,
      color: theme.textColor,
      direction: "rtl" as never,
    },
    indexCategory: {
      fontFamily: "Cairo",
      fontSize: 9,
      color: theme.mutedColor,
      direction: "rtl" as never,
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
    // ─ TOC
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
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderColor,
    },
    tocName: {
      fontFamily: "Cairo",
      fontSize: 11,
      color: theme.textColor,
      direction: "rtl" as never,
    },
    tocCount: {
      fontFamily: "Cairo",
      fontSize: 9,
      color: theme.mutedColor,
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
  const content = React.createElement(
    View,
    { style: styles.businessCard },
    React.createElement(
      View,
      { style: includeQr && qrDataUrl ? styles.qrContainer : undefined },
      // Left side: QR
      includeQr && qrDataUrl
        ? React.createElement(Image, { src: qrDataUrl, style: styles.qrImage })
        : null,
      // Right side: info
      React.createElement(
        View,
        { style: includeQr && qrDataUrl ? styles.businessInfo : undefined },
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
  return content;
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
    // Watermark for preview
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

// ── Table of contents ────────────────────────────────────────────────────────────

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
        React.createElement(Text, { style: styles.tocName }, sec.nameAr)
      )
    )
  );
}

// ── Ads helpers ────────────────────────────────────────────────────────────────

function AdFullPage({
  ad,
  styles,
  pageSize,
}: {
  ad: PdfAdData;
  styles: ReturnType<typeof makeStyles>;
  pageSize: "A4" | "LETTER";
}) {
  return React.createElement(
    Page,
    { size: pageSize, style: styles.coverPage },
    React.createElement(Image, { src: ad.imageUrl, style: styles.adFullPage })
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

// ── Alphabetical index ────────────────────────────────────────────────────────────

function IndexPage({
  sections,
  styles,
  pageSize,
}: {
  sections: PdfCategorySection[];
  styles: ReturnType<typeof makeStyles>;
  pageSize: "A4" | "LETTER";
}) {
  const allBusinesses = sections
    .flatMap((s) => s.businesses.map((b) => ({ ...b, categoryNameAr: s.nameAr })))
    .sort((a, b) => a.nameAr.localeCompare(b.nameAr, "ar"));

  return React.createElement(
    Page,
    { size: pageSize, style: styles.page },
    React.createElement(Text, { style: styles.tocTitle }, "الفهرس الأبجدي"),
    ...allBusinesses.map((b) =>
      React.createElement(
        View,
        { key: b.id, style: styles.indexRow },
        React.createElement(Text, { style: styles.indexCategory }, b.categoryNameAr),
        React.createElement(Text, { style: styles.indexName }, b.nameAr)
      )
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
    React.createElement(
      View,
      { style: section.colorTheme
          ? { ...styles.sectionHeader, backgroundColor: section.colorTheme }
          : styles.sectionHeader
      },
      React.createElement(Text, { style: styles.sectionHeaderText },
        section.sectionTitleAr ?? section.nameAr
      )
    ),
    section.sectionIntroAr
      ? React.createElement(Text, { style: styles.sectionIntro }, section.sectionIntroAr)
      : null,
    businessElements,
    layout.showPageNumbers
      ? React.createElement(
          Text,
          { style: styles.pageNumber, render: ({ pageNumber }) => `${pageNumber}` }
        )
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

  // Ads by placement
  const fullPageAds = input.ads
    .filter((a) => a.effectivePlacement === "FULL_PAGE")
    .sort((a, b) => b.priority - a.priority);

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

  // 3. TOC
  pages.push(
    React.createElement(TocPage, {
      key: "toc",
      sections: input.categorySections,
      styles,
      pageSize: input.pageSize,
    })
  );

  // 4. Category sections (interleave full-page ads)
  input.categorySections.forEach((section, idx) => {
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
    // Insert a full-page ad after every 3rd section
    if ((idx + 1) % 3 === 0 && fullPageAds.length > 0) {
      const ad = fullPageAds[(idx / 3) % fullPageAds.length];
      pages.push(
        React.createElement(AdFullPage, {
          key: `ad-${ad.id}-${idx}`,
          ad,
          styles,
          pageSize: input.pageSize,
        })
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

  // 6. Alphabetical index
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
      input.categorySections.length +
      3 + // cover + toc + index
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
