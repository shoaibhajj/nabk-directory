-- AlterEnum: add PENDING_REVIEW status for new-account comments awaiting moderation
ALTER TYPE "CommentStatus" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW';

-- AlterEnum: add new audit actions for user-side rating + comment writes and admin
-- comment approval. ADD VALUE statements cannot run in the same transaction as
-- the values they create, so each is its own statement.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COMMENT_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COMMENT_POSTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COMMENT_REMOVED_BY_USER';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'RATING_SUBMITTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'RATING_REMOVED_BY_USER';
