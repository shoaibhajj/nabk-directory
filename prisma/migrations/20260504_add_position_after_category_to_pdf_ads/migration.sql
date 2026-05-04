-- Migration: add position_after_category_id to pdf_ads
-- Surgical migration — only adds the one new column needed for Task-4.
-- Safe to run on a database that already has data.

-- 1. Add the nullable FK column
ALTER TABLE "pdf_ads"
  ADD COLUMN IF NOT EXISTS "position_after_category_id" TEXT;

-- 2. Add the FK constraint (references categories.id, SET NULL on delete)
ALTER TABLE "pdf_ads"
  ADD CONSTRAINT "pdf_ads_position_after_category_id_fkey"
  FOREIGN KEY ("position_after_category_id")
  REFERENCES "categories"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- 3. Add index for fast lookups
CREATE INDEX IF NOT EXISTS "pdf_ads_position_after_category_id_idx"
  ON "pdf_ads"("position_after_category_id");
