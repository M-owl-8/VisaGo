-- AlterTable
ALTER TABLE "UserDocument" ADD COLUMN "aiConfidence" REAL;
ALTER TABLE "UserDocument" ADD COLUMN "aiNotesEn" TEXT;
ALTER TABLE "UserDocument" ADD COLUMN "aiNotesRu" TEXT;
ALTER TABLE "UserDocument" ADD COLUMN "aiNotesUz" TEXT;
ALTER TABLE "UserDocument" ADD COLUMN "verifiedByAI" BOOLEAN DEFAULT false;

-- CreateTable
CREATE TABLE "EmbassySource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "countryCode" TEXT NOT NULL,
    "visaType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastFetchedAt" DATETIME,
    "lastStatus" TEXT,
    "lastError" TEXT,
    "fetchInterval" INTEGER NOT NULL DEFAULT 86400,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VisaRuleSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "countryCode" TEXT NOT NULL,
    "visaType" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT NOT NULL DEFAULT 'system',
    "sourceSummary" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" DATETIME,
    "approvedBy" TEXT,
    "rejectionReason" TEXT,
    "sourceId" TEXT,
    "extractionMetadata" TEXT,
    CONSTRAINT "VisaRuleSet_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "EmbassySource" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VisaRuleVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleSetId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "changeLog" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VisaRuleVersion_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "VisaRuleSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DocumentChecklist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "checklistData" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" DATETIME,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DocumentChecklist_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DocumentChecklist" ("aiGenerated", "applicationId", "checklistData", "createdAt", "errorMessage", "generatedAt", "id", "status", "updatedAt") SELECT "aiGenerated", "applicationId", "checklistData", "createdAt", "errorMessage", "generatedAt", "id", "status", "updatedAt" FROM "DocumentChecklist";
DROP TABLE "DocumentChecklist";
ALTER TABLE "new_DocumentChecklist" RENAME TO "DocumentChecklist";
CREATE UNIQUE INDEX "DocumentChecklist_applicationId_key" ON "DocumentChecklist"("applicationId");
CREATE INDEX "DocumentChecklist_applicationId_idx" ON "DocumentChecklist"("applicationId");
CREATE INDEX "DocumentChecklist_status_idx" ON "DocumentChecklist"("status");
CREATE TABLE "new_UserPreferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "paymentConfirmations" BOOLEAN NOT NULL DEFAULT true,
    "documentUpdates" BOOLEAN NOT NULL DEFAULT true,
    "visaStatusUpdates" BOOLEAN NOT NULL DEFAULT true,
    "dailyReminders" BOOLEAN NOT NULL DEFAULT true,
    "newsUpdates" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserPreferences" ("createdAt", "emailNotifications", "id", "notificationsEnabled", "pushNotifications", "twoFactorEnabled", "updatedAt", "userId") SELECT "createdAt", "emailNotifications", "id", "notificationsEnabled", "pushNotifications", "twoFactorEnabled", "updatedAt", "userId" FROM "UserPreferences";
DROP TABLE "UserPreferences";
ALTER TABLE "new_UserPreferences" RENAME TO "UserPreferences";
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");
CREATE INDEX "UserPreferences_userId_idx" ON "UserPreferences"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "EmbassySource_countryCode_visaType_idx" ON "EmbassySource"("countryCode", "visaType");

-- CreateIndex
CREATE INDEX "EmbassySource_isActive_idx" ON "EmbassySource"("isActive");

-- CreateIndex
CREATE INDEX "EmbassySource_lastFetchedAt_idx" ON "EmbassySource"("lastFetchedAt");

-- CreateIndex
CREATE INDEX "EmbassySource_priority_idx" ON "EmbassySource"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "EmbassySource_countryCode_visaType_url_key" ON "EmbassySource"("countryCode", "visaType", "url");

-- CreateIndex
CREATE INDEX "VisaRuleSet_countryCode_visaType_idx" ON "VisaRuleSet"("countryCode", "visaType");

-- CreateIndex
CREATE INDEX "VisaRuleSet_isApproved_idx" ON "VisaRuleSet"("isApproved");

-- CreateIndex
CREATE INDEX "VisaRuleSet_createdAt_idx" ON "VisaRuleSet"("createdAt");

-- CreateIndex
CREATE INDEX "VisaRuleSet_version_idx" ON "VisaRuleSet"("version");

-- CreateIndex
CREATE UNIQUE INDEX "VisaRuleSet_countryCode_visaType_version_key" ON "VisaRuleSet"("countryCode", "visaType", "version");

-- CreateIndex
CREATE INDEX "VisaRuleVersion_ruleSetId_idx" ON "VisaRuleVersion"("ruleSetId");

-- CreateIndex
CREATE INDEX "VisaRuleVersion_version_idx" ON "VisaRuleVersion"("version");

-- CreateIndex
CREATE INDEX "VisaRuleVersion_createdAt_idx" ON "VisaRuleVersion"("createdAt");
