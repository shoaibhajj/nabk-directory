-- Migration: extend legacy_pdf_configs with display fields
-- Surgical migration — only ADDs new nullable/defaulted columns.
-- Safe to run on a database that already has data.

ALTER TABLE "legacy_pdf_configs"
  ADD COLUMN IF NOT EXISTS "title_ar"       TEXT NOT NULL DEFAULT 'الدليل القديم',
  ADD COLUMN IF NOT EXISTS "title_en"       TEXT,
  ADD COLUMN IF NOT EXISTS "description_ar" TEXT,
  ADD COLUMN IF NOT EXISTS "description_en" TEXT,
  ADD COLUMN IF NOT EXISTS "button_label_ar" TEXT NOT NULL DEFAULT 'الدليل القديم',
  ADD COLUMN IF NOT EXISTS "button_label_en" TEXT,
  ADD COLUMN IF NOT EXISTS "cover_image_url" TEXT;
