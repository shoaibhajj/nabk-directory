-- CreateEnum
CREATE TYPE "ContactMessageStatus" AS ENUM ('NEW', 'READ', 'RESOLVED', 'SPAM');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'USER_EMAIL_VERIFIED_BY_ADMIN';
ALTER TYPE "AuditAction" ADD VALUE 'USER_VERIFICATION_RESENT';
ALTER TYPE "AuditAction" ADD VALUE 'CONTACT_MESSAGE_RECEIVED';
ALTER TYPE "AuditAction" ADD VALUE 'CONTACT_MESSAGE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'CONTACT_MESSAGE_REPLIED';
ALTER TYPE "AuditAction" ADD VALUE 'COUNTRY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'COUNTRY_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'COUNTRY_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'CITY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CITY_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'CITY_DELETED';

-- DropIndex
DROP INDEX "business_name_ar_trgm_idx";

-- DropIndex
DROP INDEX "business_name_en_trgm_idx";

-- DropIndex
DROP INDEX "business_slug_trgm_idx";

-- DropIndex
DROP INDEX "category_name_ar_trgm_idx";

-- AlterTable
ALTER TABLE "business_profiles" ADD COLUMN     "lastNotifiedViewMilestone" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "cities" ADD COLUMN     "countryId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" "ContactMessageStatus" NOT NULL DEFAULT 'NEW',
    "ipHash" TEXT,
    "userAgent" TEXT,
    "userId" TEXT,
    "reply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "repliedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_slug_key" ON "countries"("slug");

-- CreateIndex
CREATE INDEX "contact_messages_status_createdAt_idx" ON "contact_messages"("status", "createdAt");

-- CreateIndex
CREATE INDEX "contact_messages_userId_idx" ON "contact_messages"("userId");

-- CreateIndex
CREATE INDEX "cities_countryId_idx" ON "cities"("countryId");

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_repliedById_fkey" FOREIGN KEY ("repliedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

