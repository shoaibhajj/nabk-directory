-- CreateEnum
CREATE TYPE "PdfLegacyOpenMode" AS ENUM ('PREVIEW', 'DIRECT_DOWNLOAD', 'OPEN_IN_NEW_TAB');

-- CreateEnum
CREATE TYPE "PdfLegacySourceType" AS ENUM ('FILE', 'EXTERNAL_URL');

-- CreateEnum
CREATE TYPE "PdfEditionStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PdfAdPlacementType" AS ENUM ('FULL_PAGE', 'HALF_PAGE_TOP', 'HALF_PAGE_BOTTOM', 'SIDEBAR_LEFT', 'SIDEBAR_RIGHT', 'HEADER_BANNER', 'FOOTER_BANNER', 'CATEGORY_SPONSOR');

-- CreateEnum
CREATE TYPE "PdfListingTemplate" AS ENUM ('STANDARD', 'DENSE', 'AD_HEAVY', 'MIXED');

-- CreateEnum
CREATE TYPE "PdfSortMode" AS ENUM ('ALPHABETICAL', 'FEATURED_FIRST', 'NEWEST_FIRST', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PdfJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PDF_LEGACY_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PDF_LEGACY_PUBLISHED';
ALTER TYPE "AuditAction" ADD VALUE 'PDF_LEGACY_UNPUBLISHED';
ALTER TYPE "AuditAction" ADD VALUE 'PDF_EDITION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PDF_EDITION_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PDF_EDITION_PUBLISHED';
ALTER TYPE "AuditAction" ADD VALUE 'PDF_EDITION_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE 'PDF_EDITION_DUPLICATED';
ALTER TYPE "AuditAction" ADD VALUE 'PDF_GENERATION_STARTED';
ALTER TYPE "AuditAction" ADD VALUE 'PDF_GENERATION_SUCCEEDED';
ALTER TYPE "AuditAction" ADD VALUE 'PDF_GENERATION_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'PDF_AD_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PDF_AD_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PDF_AD_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'PDF_WEBSITE_PROFILE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PDF_DEVELOPER_PROFILE_UPDATED';

-- CreateTable
CREATE TABLE "pdf_legacy_files" (
    "id" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT,
    "descriptionAr" TEXT,
    "descriptionEn" TEXT,
    "sourceType" "PdfLegacySourceType" NOT NULL,
    "fileUrl" TEXT,
    "externalUrl" TEXT,
    "coverImageUrl" TEXT,
    "buttonLabelAr" TEXT NOT NULL DEFAULT 'الدليل القديم',
    "buttonLabelEn" TEXT DEFAULT 'Old Directory',
    "openMode" "PdfLegacyOpenMode" NOT NULL DEFAULT 'OPEN_IN_NEW_TAB',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pdf_legacy_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdf_editions" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT,
    "slug" TEXT NOT NULL,
    "editionNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "PdfEditionStatus" NOT NULL DEFAULT 'DRAFT',
    "coverTitleAr" TEXT,
    "coverSubtitleAr" TEXT,
    "introTextAr" TEXT,
    "editorialTextAr" TEXT,
    "closingTextAr" TEXT,
    "includeAlphabeticalIndex" BOOLEAN NOT NULL DEFAULT true,
    "includeBusinessLogos" BOOLEAN NOT NULL DEFAULT false,
    "includeQrCodes" BOOLEAN NOT NULL DEFAULT true,
    "includeFeaturedBusinesses" BOOLEAN NOT NULL DEFAULT true,
    "includeWebsiteProfile" BOOLEAN NOT NULL DEFAULT true,
    "includeDeveloperProfile" BOOLEAN NOT NULL DEFAULT false,
    "showEditionMetadata" BOOLEAN NOT NULL DEFAULT true,
    "generationMode" TEXT NOT NULL DEFAULT 'FULL_CITY',
    "pageSize" TEXT NOT NULL DEFAULT 'A4',
    "marginsJson" JSONB,
    "themeJson" JSONB,
    "layoutJson" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pdf_editions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdf_edition_categories" (
    "id" TEXT NOT NULL,
    "pdfEditionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "startOnNewPage" BOOLEAN NOT NULL DEFAULT true,
    "includeDivider" BOOLEAN NOT NULL DEFAULT true,
    "colorTheme" TEXT,
    "sectionTitleAr" TEXT,
    "sectionIntroAr" TEXT,
    "listingTemplate" "PdfListingTemplate" NOT NULL DEFAULT 'STANDARD',
    "sortMode" "PdfSortMode" NOT NULL DEFAULT 'ALPHABETICAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pdf_edition_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdf_ads" (
    "id" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "advertiserName" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "targetUrl" TEXT,
    "phone" TEXT,
    "categoryId" TEXT,
    "placementType" "PdfAdPlacementType" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pdf_ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdf_edition_ads" (
    "id" TEXT NOT NULL,
    "pdfEditionId" TEXT NOT NULL,
    "pdfAdId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "overridePlacement" "PdfAdPlacementType",

    CONSTRAINT "pdf_edition_ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdf_generation_jobs" (
    "id" TEXT NOT NULL,
    "pdfEditionId" TEXT NOT NULL,
    "status" "PdfJobStatus" NOT NULL DEFAULT 'QUEUED',
    "isPreview" BOOLEAN NOT NULL DEFAULT false,
    "outputFileUrl" TEXT,
    "previewFileUrl" TEXT,
    "outputFileSizeBytes" INTEGER,
    "previewFileSizeBytes" INTEGER,
    "pagesCount" INTEGER,
    "businessesCount" INTEGER,
    "categoriesCount" INTEGER,
    "adsCount" INTEGER,
    "errorMessage" TEXT,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pdf_generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_profile_blocks" (
    "id" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT,
    "shortTextAr" TEXT,
    "shortTextEn" TEXT,
    "bodyTextAr" TEXT,
    "bodyTextEn" TEXT,
    "websiteUrl" TEXT,
    "qrCodeUrl" TEXT,
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "socialLinksJson" JSONB,
    "logoUrl" TEXT,
    "bannerImageUrl" TEXT,
    "ctaTextAr" TEXT,
    "ctaTextEn" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_profile_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developer_profile_blocks" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "roleTitleAr" TEXT,
    "roleTitleEn" TEXT,
    "shortBioAr" TEXT,
    "shortBioEn" TEXT,
    "longBioAr" TEXT,
    "longBioEn" TEXT,
    "brandName" TEXT,
    "portfolioUrl" TEXT,
    "githubUrl" TEXT,
    "linkedinUrl" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "socialLinksJson" JSONB,
    "profileImageUrl" TEXT,
    "logoUrl" TEXT,
    "ctaTextAr" TEXT,
    "ctaTextEn" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "developer_profile_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pdf_editions_slug_key" ON "pdf_editions"("slug");

-- CreateIndex
CREATE INDEX "pdf_editions_cityId_status_idx" ON "pdf_editions"("cityId", "status");

-- CreateIndex
CREATE INDEX "pdf_editions_status_publishedAt_idx" ON "pdf_editions"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "pdf_edition_categories_pdfEditionId_displayOrder_idx" ON "pdf_edition_categories"("pdfEditionId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "pdf_edition_categories_pdfEditionId_categoryId_key" ON "pdf_edition_categories"("pdfEditionId", "categoryId");

-- CreateIndex
CREATE INDEX "pdf_ads_isActive_placementType_idx" ON "pdf_ads"("isActive", "placementType");

-- CreateIndex
CREATE INDEX "pdf_ads_categoryId_isActive_idx" ON "pdf_ads"("categoryId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "pdf_edition_ads_pdfEditionId_pdfAdId_key" ON "pdf_edition_ads"("pdfEditionId", "pdfAdId");

-- CreateIndex
CREATE INDEX "pdf_generation_jobs_pdfEditionId_status_idx" ON "pdf_generation_jobs"("pdfEditionId", "status");

-- CreateIndex
CREATE INDEX "pdf_generation_jobs_pdfEditionId_createdAt_idx" ON "pdf_generation_jobs"("pdfEditionId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "pdf_editions" ADD CONSTRAINT "pdf_editions_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_edition_categories" ADD CONSTRAINT "pdf_edition_categories_pdfEditionId_fkey" FOREIGN KEY ("pdfEditionId") REFERENCES "pdf_editions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_edition_categories" ADD CONSTRAINT "pdf_edition_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_ads" ADD CONSTRAINT "pdf_ads_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_edition_ads" ADD CONSTRAINT "pdf_edition_ads_pdfEditionId_fkey" FOREIGN KEY ("pdfEditionId") REFERENCES "pdf_editions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_edition_ads" ADD CONSTRAINT "pdf_edition_ads_pdfAdId_fkey" FOREIGN KEY ("pdfAdId") REFERENCES "pdf_ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_generation_jobs" ADD CONSTRAINT "pdf_generation_jobs_pdfEditionId_fkey" FOREIGN KEY ("pdfEditionId") REFERENCES "pdf_editions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
