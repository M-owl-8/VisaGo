-- AlterTable
-- Add image analysis fields to UserDocument table for Phase 2: Image Analysis

ALTER TABLE "UserDocument" ADD COLUMN IF NOT EXISTS "imageAnalysisResult" JSONB;
ALTER TABLE "UserDocument" ADD COLUMN IF NOT EXISTS "hasSignature" BOOLEAN;
ALTER TABLE "UserDocument" ADD COLUMN IF NOT EXISTS "hasStamp" BOOLEAN;
ALTER TABLE "UserDocument" ADD COLUMN IF NOT EXISTS "imageQualityScore" DOUBLE PRECISION;

-- Add index on imageQualityScore for quality-based queries
CREATE INDEX IF NOT EXISTS "UserDocument_imageQualityScore_idx" ON "UserDocument"("imageQualityScore");

