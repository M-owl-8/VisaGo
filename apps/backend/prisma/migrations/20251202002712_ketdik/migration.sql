-- AlterTable
ALTER TABLE "UserDocument" ADD COLUMN "aiConfidence" DOUBLE PRECISION;
ALTER TABLE "UserDocument" ADD COLUMN "aiNotesEn" TEXT;
ALTER TABLE "UserDocument" ADD COLUMN "aiNotesRu" TEXT;
ALTER TABLE "UserDocument" ADD COLUMN "aiNotesUz" TEXT;
ALTER TABLE "UserDocument" ADD COLUMN "verifiedByAI" BOOLEAN DEFAULT false;

-- CreateTable
CREATE TABLE "EmbassySource" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "visaType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastFetchedAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "lastError" TEXT,
    "fetchInterval" INTEGER NOT NULL DEFAULT 86400,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmbassySource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaRuleSet" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "visaType" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL DEFAULT 'system',
    "sourceSummary" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectionReason" TEXT,
    "sourceId" TEXT,
    "extractionMetadata" TEXT,

    CONSTRAINT "VisaRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaRuleVersion" (
    "id" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "changeLog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisaRuleVersion_pkey" PRIMARY KEY ("id")
);

-- RedefineTables (PostgreSQL-compatible: no PRAGMA needed)
-- Drop foreign key constraints temporarily
ALTER TABLE "DocumentChecklist" DROP CONSTRAINT IF EXISTS "DocumentChecklist_applicationId_fkey";
ALTER TABLE "UserPreferences" DROP CONSTRAINT IF EXISTS "UserPreferences_userId_fkey";

-- Alter DocumentChecklist table
ALTER TABLE "DocumentChecklist" ALTER COLUMN "status" SET DEFAULT 'processing';

-- Alter UserPreferences table (add new columns if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserPreferences' AND column_name = 'paymentConfirmations') THEN
        ALTER TABLE "UserPreferences" ADD COLUMN "paymentConfirmations" BOOLEAN NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserPreferences' AND column_name = 'documentUpdates') THEN
        ALTER TABLE "UserPreferences" ADD COLUMN "documentUpdates" BOOLEAN NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserPreferences' AND column_name = 'visaStatusUpdates') THEN
        ALTER TABLE "UserPreferences" ADD COLUMN "visaStatusUpdates" BOOLEAN NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserPreferences' AND column_name = 'dailyReminders') THEN
        ALTER TABLE "UserPreferences" ADD COLUMN "dailyReminders" BOOLEAN NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserPreferences' AND column_name = 'newsUpdates') THEN
        ALTER TABLE "UserPreferences" ADD COLUMN "newsUpdates" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Recreate foreign key constraints
ALTER TABLE "DocumentChecklist" ADD CONSTRAINT "DocumentChecklist_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaRuleSet" ADD CONSTRAINT "VisaRuleSet_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "EmbassySource" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaRuleVersion" ADD CONSTRAINT "VisaRuleVersion_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "VisaRuleSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmbassySource_countryCode_visaType_idx" ON "EmbassySource"("countryCode", "visaType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmbassySource_isActive_idx" ON "EmbassySource"("isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmbassySource_lastFetchedAt_idx" ON "EmbassySource"("lastFetchedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmbassySource_priority_idx" ON "EmbassySource"("priority");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EmbassySource_countryCode_visaType_url_key" ON "EmbassySource"("countryCode", "visaType", "url");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VisaRuleSet_countryCode_visaType_idx" ON "VisaRuleSet"("countryCode", "visaType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VisaRuleSet_isApproved_idx" ON "VisaRuleSet"("isApproved");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VisaRuleSet_createdAt_idx" ON "VisaRuleSet"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VisaRuleSet_version_idx" ON "VisaRuleSet"("version");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "VisaRuleSet_countryCode_visaType_version_key" ON "VisaRuleSet"("countryCode", "visaType", "version");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VisaRuleVersion_ruleSetId_idx" ON "VisaRuleVersion"("ruleSetId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VisaRuleVersion_version_idx" ON "VisaRuleVersion"("version");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VisaRuleVersion_createdAt_idx" ON "VisaRuleVersion"("createdAt");
