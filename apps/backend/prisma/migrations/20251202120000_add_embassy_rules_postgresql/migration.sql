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
    "data" JSONB NOT NULL,
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
    "extractionMetadata" JSONB,

    CONSTRAINT "VisaRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaRuleVersion" (
    "id" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "changeLog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisaRuleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmbassySource_countryCode_visaType_url_key" ON "EmbassySource"("countryCode", "visaType", "url");

-- CreateIndex
CREATE INDEX "EmbassySource_countryCode_visaType_idx" ON "EmbassySource"("countryCode", "visaType");

-- CreateIndex
CREATE INDEX "EmbassySource_isActive_idx" ON "EmbassySource"("isActive");

-- CreateIndex
CREATE INDEX "EmbassySource_lastFetchedAt_idx" ON "EmbassySource"("lastFetchedAt");

-- CreateIndex
CREATE INDEX "EmbassySource_priority_idx" ON "EmbassySource"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "VisaRuleSet_countryCode_visaType_version_key" ON "VisaRuleSet"("countryCode", "visaType", "version");

-- CreateIndex
CREATE INDEX "VisaRuleSet_countryCode_visaType_idx" ON "VisaRuleSet"("countryCode", "visaType");

-- CreateIndex
CREATE INDEX "VisaRuleSet_isApproved_idx" ON "VisaRuleSet"("isApproved");

-- CreateIndex
CREATE INDEX "VisaRuleSet_createdAt_idx" ON "VisaRuleSet"("createdAt");

-- CreateIndex
CREATE INDEX "VisaRuleSet_version_idx" ON "VisaRuleSet"("version");

-- CreateIndex
CREATE INDEX "VisaRuleVersion_ruleSetId_idx" ON "VisaRuleVersion"("ruleSetId");

-- CreateIndex
CREATE INDEX "VisaRuleVersion_version_idx" ON "VisaRuleVersion"("version");

-- CreateIndex
CREATE INDEX "VisaRuleVersion_createdAt_idx" ON "VisaRuleVersion"("createdAt");

-- AddForeignKey
ALTER TABLE "VisaRuleSet" ADD CONSTRAINT "VisaRuleSet_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "EmbassySource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaRuleVersion" ADD CONSTRAINT "VisaRuleVersion_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "VisaRuleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

