-- AlterEnum: add LISTING_APPROVED and LISTING_REJECTED for admin moderation
-- of pending business submissions. ADD VALUE statements cannot run inside
-- a transaction with the values they create, so each is its own statement.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LISTING_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LISTING_REJECTED';
