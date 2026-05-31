-- Migration: add business verification
-- Run with: pnpm exec prisma migrate deploy
-- Or apply manually via: pnpm exec prisma db push (dev only)

-- 1. Create VerificationStatus enum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- 2. Add verification columns to business_profiles
ALTER TABLE "business_profiles"
  ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN "verifiedAt"         TIMESTAMP(3),
  ADD COLUMN "verifiedById"       TEXT;

-- 3. Index on verificationStatus for admin queries
CREATE INDEX "business_profiles_verificationStatus_idx"
  ON "business_profiles"("verificationStatus");

-- 4. Create verification_requests table
CREATE TABLE "verification_requests" (
  "id"                TEXT        NOT NULL,
  "businessProfileId" TEXT        NOT NULL,
  "requestedById"     TEXT        NOT NULL,
  "idImageUrl"        TEXT,
  "contactPhone"      TEXT,
  "status"            "VerificationStatus" NOT NULL DEFAULT 'PENDING',
  "adminNote"         TEXT,
  "reviewedById"      TEXT,
  "reviewedAt"        TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,

  CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id")
);

-- 5. Foreign keys
ALTER TABLE "verification_requests"
  ADD CONSTRAINT "verification_requests_businessProfileId_fkey"
    FOREIGN KEY ("businessProfileId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "verification_requests_requestedById_fkey"
    FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "verification_requests_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Indexes on verification_requests
CREATE INDEX "verification_requests_businessProfileId_status_idx"
  ON "verification_requests"("businessProfileId", "status");

CREATE INDEX "verification_requests_status_createdAt_idx"
  ON "verification_requests"("status", "createdAt");

-- 7. Add new AuditAction enum values
ALTER TYPE "AuditAction"
  ADD VALUE IF NOT EXISTS 'BUSINESS_VERIFICATION_REQUESTED',
  ADD VALUE IF NOT EXISTS 'BUSINESS_VERIFICATION_APPROVED',
  ADD VALUE IF NOT EXISTS 'BUSINESS_VERIFICATION_REJECTED';
