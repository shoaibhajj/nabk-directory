/**
 * TypeScript types used by the PDF generation engine.
 * These mirror Prisma models but are plain objects (no Prisma deps)
 * so the generator can be tested independently.
 */

import type {
  PdfEditionStatus,
  PdfAdPlacementType,
  PdfListingTemplate,
  PdfSortMode,
  PhoneLabel,
  SocialPlatform,
} from "@prisma/client";

// Silence unused-import warning for PdfEditionStatus (kept for consumers)
void (0 as unknown as PdfEditionStatus);

// ── Edition ───────────────────────────────────────────────────────────────────

export interface PdfTheme {
  primaryColor: string;   // e.g. "#01696f"
  accentColor: string;    // e.g. "#bb651b"
  textColor: string;      // e.g. "#1a1a1a"
  mutedColor: string;     // e.g. "#6b6b6b"
  borderColor: string;    // e.g. "#d4d1ca"
  bgColor: string;        // e.g. "#ffffff"
  sectionBgColor: string; // e.g. "#f7f6f2"
}

export const DEFAULT_THEME: PdfTheme = {
  primaryColor: "#01696f",
  accentColor:  "#bb651b",
  textColor:    "#1a1a1a",
  mutedColor:   "#6b6b6b",
  borderColor:  "#d4d1ca",
  bgColor:      "#ffffff",
  sectionBgColor: "#f7f6f2",
};

export interface PdfMargins {
  top: number;    // mm
  bottom: number;
  left: number;
  right: number;
}

export const DEFAULT_MARGINS: PdfMargins = {
  top: 20,
  bottom: 20,
  left: 20,
  right: 20,
};

export interface PdfLayoutConfig {
  showPageNumbers: boolean;
  pageNumberStyle: "arabic" | "roman";
  watermarkText?: string;
  showHeaderLogo: boolean;
  showFooterLine: boolean;
}

export const DEFAULT_LAYOUT: PdfLayoutConfig = {
  showPageNumbers: true,
  pageNumberStyle: "arabic",
  showHeaderLogo: true,
  showFooterLine: true,
};

// ── Business data ──────────────────────────────────────────────────────

export interface PdfPhoneNumber {
  label: PhoneLabel;
  number: string;
}

export interface PdfSocialLink {
  platform: SocialPlatform;
  url: string;
}

export interface PdfBusiness {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  slug: string;
  addressAr?: string | null;
  descriptionAr?: string | null;
  logoUrl?: string | null;
  ratingAverage: number;
  ratingCount: number;
  phoneNumbers: PdfPhoneNumber[];
  socialLinks: PdfSocialLink[];
  categoryNameAr: string;
  cityNameAr: string;
  /** Full public URL for QR code generation */
  publicUrl: string;
}

// ── Category section ──────────────────────────────────────────────────────

export interface PdfCategorySection {
  categoryId: string;
  nameAr: string;
  nameEn?: string | null;
  icon?: string | null;
  sectionTitleAr?: string | null;
  sectionIntroAr?: string | null;
  colorTheme?: string | null;
  listingTemplate: PdfListingTemplate;
  sortMode: PdfSortMode;
  displayOrder: number;
  startOnNewPage: boolean;
  businesses: PdfBusiness[];
}

// ── Ads ───────────────────────────────────────────────────────────────────────

export interface PdfAdData {
  id: string;
  titleAr: string;
  /** Optional English title — maps to PdfAd.titleEn */
  titleEn?: string | null;
  imageUrl: string;
  /** Maps to PdfAd.linkUrl */
  linkUrl?: string | null;
  phone?: string | null;
  placementType: PdfAdPlacementType;
  priority: number;
  /** Set when overridePlacement is used in PdfEditionAd */
  effectivePlacement: PdfAdPlacementType;
  /**
   * Optional category ID — when provided, the generator pins this ad
   * immediately after that category’s section pages instead of
   * distributing it round-robin. Maps to PdfAd.position_after_category_id.
   */
  positionAfterCategoryId?: string | null;
  /**
   * Specific section indices (0-based) where this ad should appear.
   * Empty array = show in every section (round-robin).
   * Populated from PdfEditionAd.pageNumbers.
   */
  pageNumbers: number[];
  /**
   * Whether this ad is active for this edition.
   * Inactive ads are excluded from the generated PDF entirely.
   * Maps to PdfEditionAd.isActive.
   */
  isActive: boolean;
}

// ── Profile blocks ────────────────────────────────────────────────────────

export interface PdfWebsiteProfile {
  titleAr: string;
  shortTextAr?: string | null;
  bodyTextAr?: string | null;
  websiteUrl?: string | null;
  qrCodeUrl?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  logoUrl?: string | null;
  ctaTextAr?: string | null;
}

export interface PdfDeveloperProfile {
  fullName: string;
  roleTitleAr?: string | null;
  shortBioAr?: string | null;
  portfolioUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  profileImageUrl?: string | null;
  ctaTextAr?: string | null;
}

// ── Main document input ──────────────────────────────────────────────────────────

export interface PdfDocumentInput {
  // Edition metadata
  editionId: string;
  editionSlug: string;
  titleAr: string;
  coverTitleAr?: string | null;
  coverSubtitleAr?: string | null;
  introTextAr?: string | null;
  editorialTextAr?: string | null;
  closingTextAr?: string | null;
  editionNumber: number;
  cityNameAr: string;
  pageSize: "A4" | "LETTER";

  // Feature flags
  includeAlphabeticalIndex: boolean;
  includeBusinessLogos: boolean;
  includeQrCodes: boolean;
  includeFeaturedBusinesses: boolean;
  includeWebsiteProfile: boolean;
  includeDeveloperProfile: boolean;
  showEditionMetadata: boolean;
  isPreview: boolean;

  // Content
  categorySections: PdfCategorySection[];
  ads: PdfAdData[];
  websiteProfile?: PdfWebsiteProfile | null;
  developerProfile?: PdfDeveloperProfile | null;

  // Style
  theme: PdfTheme;
  margins: PdfMargins;
  layout: PdfLayoutConfig;
}

// ── Generation result ──────────────────────────────────────────────────────────

export type GenerationResult =
  | { ok: true; buffer: Buffer; pagesCount: number; businessesCount: number }
  | { ok: false; error: string };
