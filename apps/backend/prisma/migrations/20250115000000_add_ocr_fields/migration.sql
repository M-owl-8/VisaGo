-- AlterTable
-- Add OCR fields to UserDocument table for Phase 1: OCR Integration

ALTER TABLE "UserDocument" ADD COLUMN IF NOT EXISTS "extractedText" TEXT;
ALTER TABLE "UserDocument" ADD COLUMN IF NOT EXISTS "ocrStatus" TEXT;
ALTER TABLE "UserDocument" ADD COLUMN IF NOT EXISTS "ocrConfidence" DOUBLE PRECISION;
ALTER TABLE "UserDocument" ADD COLUMN IF NOT EXISTS "ocrLanguage" TEXT;

-- Add index on ocrStatus for faster queries
CREATE INDEX IF NOT EXISTS "UserDocument_ocrStatus_idx" ON "UserDocument"("ocrStatus");
