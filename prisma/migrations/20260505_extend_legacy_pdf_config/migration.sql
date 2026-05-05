-- ============================================================
-- Reconcile migration: align DB (created by 20260504055350)
-- with the new schema.prisma (model names & field additions)
-- ============================================================
-- The first migration created tables with these names:
--   pdf_legacy_files          (schema now calls it legacy_pdf_configs)
--   pdf_editions              (same)
--   pdf_edition_categories    (column pdfEditionId -> editionId)
--   pdf_ads                   (schema simplified fields)
--   pdf_edition_ads           (columns pdfEditionId->editionId, pdfAdId->adId)
--   pdf_generation_jobs       (columns pdfEditionId->editionId, removed isPreview etc)
--
-- Strategy: RENAME tables + columns to match new schema, ADD missing
-- columns, DROP columns removed from schema. All DDL is idempotent.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. RENAME pdf_legacy_files → legacy_pdf_configs
--    and ADD the cityId column that the new schema requires
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'pdf_legacy_files')
  AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'legacy_pdf_configs') THEN
    ALTER TABLE "pdf_legacy_files" RENAME TO "legacy_pdf_configs";
  END IF;
END $$;

-- Add cityId (nullable unique) if missing
ALTER TABLE "legacy_pdf_configs"
  ADD COLUMN IF NOT EXISTS "cityId" TEXT;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'legacy_pdf_configs' AND indexname = 'legacy_pdf_configs_cityId_key'
  ) THEN
    CREATE UNIQUE INDEX "legacy_pdf_configs_cityId_key" ON "legacy_pdf_configs"("cityId");
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 2. pdf_edition_categories: rename FK column pdfEditionId → editionId
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  -- Only rename if old column exists and new one doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pdf_edition_categories' AND column_name='pdfEditionId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pdf_edition_categories' AND column_name='editionId'
  ) THEN
    -- Drop old FK first
    ALTER TABLE "pdf_edition_categories"
      DROP CONSTRAINT IF EXISTS "pdf_edition_categories_pdfEditionId_fkey";
    -- Drop old unique index
    DROP INDEX IF EXISTS "pdf_edition_categories_pdfEditionId_categoryId_key";
    DROP INDEX IF EXISTS "pdf_edition_categories_pdfEditionId_displayOrder_idx";
    -- Rename column
    ALTER TABLE "pdf_edition_categories" RENAME COLUMN "pdfEditionId" TO "editionId";
    -- Recreate constraints
    ALTER TABLE "pdf_edition_categories"
      ADD CONSTRAINT "pdf_edition_categories_editionId_fkey"
      FOREIGN KEY ("editionId") REFERENCES "pdf_editions"("id") ON DELETE CASCADE;
    CREATE UNIQUE INDEX "pdf_edition_categories_editionId_categoryId_key"
      ON "pdf_edition_categories"("editionId", "categoryId");
    CREATE INDEX "pdf_edition_categories_editionId_displayOrder_idx"
      ON "pdf_edition_categories"("editionId", "displayOrder");
  END IF;
END $$;

-- Remove extra columns that no longer exist in schema
ALTER TABLE "pdf_edition_categories"
  DROP COLUMN IF EXISTS "startOnNewPage",
  DROP COLUMN IF EXISTS "includeDivider",
  DROP COLUMN IF EXISTS "colorTheme",
  DROP COLUMN IF EXISTS "sectionTitleAr",
  DROP COLUMN IF EXISTS "sectionIntroAr";

-- Add maxListings if missing
ALTER TABLE "pdf_edition_categories"
  ADD COLUMN IF NOT EXISTS "maxListings" INTEGER;

-- ────────────────────────────────────────────────────────────
-- 3. pdf_generation_jobs: rename FK column pdfEditionId → editionId
--    and remove columns dropped from schema
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pdf_generation_jobs' AND column_name='pdfEditionId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pdf_generation_jobs' AND column_name='editionId'
  ) THEN
    ALTER TABLE "pdf_generation_jobs"
      DROP CONSTRAINT IF EXISTS "pdf_generation_jobs_pdfEditionId_fkey";
    DROP INDEX IF EXISTS "pdf_generation_jobs_pdfEditionId_status_idx";
    DROP INDEX IF EXISTS "pdf_generation_jobs_pdfEditionId_createdAt_idx";
    ALTER TABLE "pdf_generation_jobs" RENAME COLUMN "pdfEditionId" TO "editionId";
    ALTER TABLE "pdf_generation_jobs"
      ADD CONSTRAINT "pdf_generation_jobs_editionId_fkey"
      FOREIGN KEY ("editionId") REFERENCES "pdf_editions"("id") ON DELETE CASCADE;
    CREATE INDEX "pdf_generation_jobs_editionId_idx"
      ON "pdf_generation_jobs"("editionId");
  END IF;
END $$;

-- Add triggeredById if missing
ALTER TABLE "pdf_generation_jobs"
  ADD COLUMN IF NOT EXISTS "triggeredById" TEXT;

-- Add updatedAt if missing
ALTER TABLE "pdf_generation_jobs"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

-- Add fileSizeBytes (replaces outputFileSizeBytes)
ALTER TABLE "pdf_generation_jobs"
  ADD COLUMN IF NOT EXISTS "fileSizeBytes" INTEGER;

-- Copy data from old column if it existed
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pdf_generation_jobs' AND column_name='outputFileSizeBytes'
  ) THEN
    UPDATE "pdf_generation_jobs"
    SET "fileSizeBytes" = "outputFileSizeBytes"
    WHERE "fileSizeBytes" IS NULL;
  END IF;
END $$;

-- Drop columns removed from schema
ALTER TABLE "pdf_generation_jobs"
  DROP COLUMN IF EXISTS "isPreview",
  DROP COLUMN IF EXISTS "previewFileUrl",
  DROP COLUMN IF EXISTS "outputFileSizeBytes",
  DROP COLUMN IF EXISTS "previewFileSizeBytes",
  DROP COLUMN IF EXISTS "businessesCount",
  DROP COLUMN IF EXISTS "categoriesCount",
  DROP COLUMN IF EXISTS "adsCount",
  DROP COLUMN IF EXISTS "generatedAt";

-- Fix startedAt / finishedAt (add if missing)
ALTER TABLE "pdf_generation_jobs"
  ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "finishedAt" TIMESTAMP(3);

-- ────────────────────────────────────────────────────────────
-- 4. pdf_edition_ads: rename FK columns
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pdf_edition_ads' AND column_name='pdfEditionId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pdf_edition_ads' AND column_name='editionId'
  ) THEN
    ALTER TABLE "pdf_edition_ads"
      DROP CONSTRAINT IF EXISTS "pdf_edition_ads_pdfEditionId_fkey",
      DROP CONSTRAINT IF EXISTS "pdf_edition_ads_pdfAdId_fkey";
    DROP INDEX IF EXISTS "pdf_edition_ads_pdfEditionId_pdfAdId_key";
    ALTER TABLE "pdf_edition_ads" RENAME COLUMN "pdfEditionId" TO "editionId";
    ALTER TABLE "pdf_edition_ads" RENAME COLUMN "pdfAdId" TO "adId";
    ALTER TABLE "pdf_edition_ads"
      ADD CONSTRAINT "pdf_edition_ads_editionId_fkey"
      FOREIGN KEY ("editionId") REFERENCES "pdf_editions"("id") ON DELETE CASCADE,
      ADD CONSTRAINT "pdf_edition_ads_adId_fkey"
      FOREIGN KEY ("adId") REFERENCES "pdf_ads"("id") ON DELETE CASCADE;
    CREATE UNIQUE INDEX "pdf_edition_ads_editionId_adId_key"
      ON "pdf_edition_ads"("editionId", "adId");
  END IF;
END $$;

-- Add createdAt to pdf_edition_ads if missing
ALTER TABLE "pdf_edition_ads"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Remove displayOrder / overridePlacement (not in new schema)
ALTER TABLE "pdf_edition_ads"
  DROP COLUMN IF EXISTS "displayOrder",
  DROP COLUMN IF EXISTS "overridePlacement";

-- ────────────────────────────────────────────────────────────
-- 5. pdf_ads: remove old columns not in new schema,
--    add new ones, rename targetUrl → linkUrl
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pdf_ads' AND column_name='targetUrl'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pdf_ads' AND column_name='linkUrl'
  ) THEN
    ALTER TABLE "pdf_ads" RENAME COLUMN "targetUrl" TO "linkUrl";
  END IF;
END $$;

ALTER TABLE "pdf_ads"
  ADD COLUMN IF NOT EXISTS "titleEn"                  TEXT,
  ADD COLUMN IF NOT EXISTS "positionAfterCategoryId"   TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt"                 TIMESTAMP(3);

ALTER TABLE "pdf_ads"
  DROP COLUMN IF EXISTS "advertiserName",
  DROP COLUMN IF EXISTS "phone",
  DROP COLUMN IF EXISTS "notes";

-- ────────────────────────────────────────────────────────────
-- 6. pdf_editions: add cityIdsJson if missing
-- ────────────────────────────────────────────────────────────
ALTER TABLE "pdf_editions"
  ADD COLUMN IF NOT EXISTS "cityIdsJson" TEXT NOT NULL DEFAULT '[]';

-- ────────────────────────────────────────────────────────────
-- 7. Drop unused tables not in new schema
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "website_profile_blocks";
DROP TABLE IF EXISTS "developer_profile_blocks";

-- ────────────────────────────────────────────────────────────
-- 8. Add missing AuditAction enum values
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'PDF_AD_ACTIVATED'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')
  ) THEN
    ALTER TYPE "AuditAction" ADD VALUE 'PDF_AD_ACTIVATED';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'PDF_AD_DEACTIVATED'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')
  ) THEN
    ALTER TYPE "AuditAction" ADD VALUE 'PDF_AD_DEACTIVATED';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'PDF_EDITION_DUPLICATED'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')
  ) THEN
    ALTER TYPE "AuditAction" ADD VALUE 'PDF_EDITION_DUPLICATED';
  END IF;
END $$;
