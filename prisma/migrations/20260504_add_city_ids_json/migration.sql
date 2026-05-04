-- Add cityIdsJson to PdfEdition for multi-city support
ALTER TABLE "pdf_editions" ADD COLUMN IF NOT EXISTS "cityIdsJson" TEXT;
