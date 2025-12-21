-- Add legacyVisaApplicationId to Application
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "legacyVisaApplicationId" TEXT UNIQUE;

-- Ensure DocumentCheckResult references Application (not VisaApplication)
ALTER TABLE "DocumentCheckResult" DROP CONSTRAINT IF EXISTS "DocumentCheckResult_applicationId_fkey";
ALTER TABLE "DocumentCheckResult"
  ADD CONSTRAINT "DocumentCheckResult_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE;

-- Add OCR / image analysis columns to UserDocument (nullable, safe defaults)
ALTER TABLE "UserDocument" ADD COLUMN IF NOT EXISTS "extractedText" TEXT;
ALTER TABLE "UserDocument" ADD COLUMN IF NOT EXISTS "ocrStatus" TEXT;
ALTER TABLE "UserDocument" ADD COLUMN IF NOT EXISTS "ocrConfidence" DOUBLE PRECISION;
ALTER TABLE "UserDocument" ADD COLUMN IF NOT EXISTS "ocrLanguage" TEXT;
ALTER TABLE "UserDocument" ADD COLUMN IF NOT EXISTS "imageAnalysisResult" JSONB;
ALTER TABLE "UserDocument" ADD COLUMN IF NOT EXISTS "hasSignature" BOOLEAN;
ALTER TABLE "UserDocument" ADD COLUMN IF NOT EXISTS "hasStamp" BOOLEAN;
ALTER TABLE "UserDocument" ADD COLUMN IF NOT EXISTS "imageQualityScore" DOUBLE PRECISION;

-- Backfill legacy mapping for existing rows where possible (non-destructive)
-- (Optional) Uncomment to copy legacy ids if Application and VisaApplication share ids
-- UPDATE "Application" a
--   SET "legacyVisaApplicationId" = a.id
--   WHERE "legacyVisaApplicationId" IS NULL
--     AND EXISTS (SELECT 1 FROM "VisaApplication" va WHERE va.id = a.id);

