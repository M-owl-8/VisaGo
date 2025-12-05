-- AlterTable: Add columns to UserDocument (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserDocument' AND column_name = 'aiConfidence') THEN
        ALTER TABLE "UserDocument" ADD COLUMN "aiConfidence" DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserDocument' AND column_name = 'aiNotesEn') THEN
        ALTER TABLE "UserDocument" ADD COLUMN "aiNotesEn" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserDocument' AND column_name = 'aiNotesRu') THEN
        ALTER TABLE "UserDocument" ADD COLUMN "aiNotesRu" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserDocument' AND column_name = 'aiNotesUz') THEN
        ALTER TABLE "UserDocument" ADD COLUMN "aiNotesUz" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserDocument' AND column_name = 'verifiedByAI') THEN
        ALTER TABLE "UserDocument" ADD COLUMN "verifiedByAI" BOOLEAN DEFAULT false;
    END IF;
END $$;

-- CreateTable: EmbassySource (idempotent)
CREATE TABLE IF NOT EXISTS "EmbassySource" (
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

-- CreateTable: VisaRuleSet (idempotent)
CREATE TABLE IF NOT EXISTS "VisaRuleSet" (
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

-- CreateTable: VisaRuleVersion (idempotent)
CREATE TABLE IF NOT EXISTS "VisaRuleVersion" (
    "id" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "changeLog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisaRuleVersion_pkey" PRIMARY KEY ("id")
);

-- Alter DocumentChecklist table (idempotent)
DO $$ 
BEGIN
    -- Set default for status if not already set
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'DocumentChecklist' AND column_name = 'status' AND column_default IS NULL) THEN
        ALTER TABLE "DocumentChecklist" ALTER COLUMN "status" SET DEFAULT 'processing';
    END IF;
END $$;

-- Alter UserPreferences table (idempotent - add new columns if they don't exist)
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

-- AddForeignKey: VisaRuleSet -> EmbassySource (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'VisaRuleSet_sourceId_fkey' 
        AND table_name = 'VisaRuleSet'
    ) THEN
        ALTER TABLE "VisaRuleSet" ADD CONSTRAINT "VisaRuleSet_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "EmbassySource" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: VisaRuleVersion -> VisaRuleSet (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'VisaRuleVersion_ruleSetId_fkey' 
        AND table_name = 'VisaRuleVersion'
    ) THEN
        ALTER TABLE "VisaRuleVersion" ADD CONSTRAINT "VisaRuleVersion_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "VisaRuleSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateIndex: EmbassySource indexes (idempotent)
CREATE INDEX IF NOT EXISTS "EmbassySource_countryCode_visaType_idx" ON "EmbassySource"("countryCode", "visaType");
CREATE INDEX IF NOT EXISTS "EmbassySource_isActive_idx" ON "EmbassySource"("isActive");
CREATE INDEX IF NOT EXISTS "EmbassySource_lastFetchedAt_idx" ON "EmbassySource"("lastFetchedAt");
CREATE INDEX IF NOT EXISTS "EmbassySource_priority_idx" ON "EmbassySource"("priority");
CREATE UNIQUE INDEX IF NOT EXISTS "EmbassySource_countryCode_visaType_url_key" ON "EmbassySource"("countryCode", "visaType", "url");

-- CreateIndex: VisaRuleSet indexes (idempotent)
CREATE INDEX IF NOT EXISTS "VisaRuleSet_countryCode_visaType_idx" ON "VisaRuleSet"("countryCode", "visaType");
CREATE INDEX IF NOT EXISTS "VisaRuleSet_isApproved_idx" ON "VisaRuleSet"("isApproved");
CREATE INDEX IF NOT EXISTS "VisaRuleSet_createdAt_idx" ON "VisaRuleSet"("createdAt");
CREATE INDEX IF NOT EXISTS "VisaRuleSet_version_idx" ON "VisaRuleSet"("version");
CREATE UNIQUE INDEX IF NOT EXISTS "VisaRuleSet_countryCode_visaType_version_key" ON "VisaRuleSet"("countryCode", "visaType", "version");

-- CreateIndex: VisaRuleVersion indexes (idempotent)
CREATE INDEX IF NOT EXISTS "VisaRuleVersion_ruleSetId_idx" ON "VisaRuleVersion"("ruleSetId");
CREATE INDEX IF NOT EXISTS "VisaRuleVersion_version_idx" ON "VisaRuleVersion"("version");
CREATE INDEX IF NOT EXISTS "VisaRuleVersion_createdAt_idx" ON "VisaRuleVersion"("createdAt");
