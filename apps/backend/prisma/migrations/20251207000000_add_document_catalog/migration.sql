-- CreateTable: DocumentCatalog
CREATE TABLE IF NOT EXISTS "DocumentCatalog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentType" TEXT NOT NULL UNIQUE,
    "nameEn" TEXT NOT NULL,
    "nameUz" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "descriptionUz" TEXT NOT NULL,
    "descriptionRu" TEXT NOT NULL,
    "defaultCategory" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "validityRequirements" TEXT,
    "formatRequirements" TEXT,
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable: VisaRuleReference
CREATE TABLE IF NOT EXISTS "VisaRuleReference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleSetId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "condition" TEXT,
    "categoryOverride" TEXT,
    "descriptionOverride" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VisaRuleReference_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "VisaRuleSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VisaRuleReference_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentCatalog" ("id") ON UPDATE CASCADE
);

-- CreateIndex: DocumentCatalog indexes
CREATE INDEX IF NOT EXISTS "DocumentCatalog_documentType_idx" ON "DocumentCatalog"("documentType");
CREATE INDEX IF NOT EXISTS "DocumentCatalog_group_idx" ON "DocumentCatalog"("group");
CREATE INDEX IF NOT EXISTS "DocumentCatalog_isActive_idx" ON "DocumentCatalog"("isActive");

-- CreateIndex: VisaRuleReference indexes
CREATE UNIQUE INDEX IF NOT EXISTS "VisaRuleReference_ruleSetId_documentId_key" ON "VisaRuleReference"("ruleSetId", "documentId");
CREATE INDEX IF NOT EXISTS "VisaRuleReference_ruleSetId_idx" ON "VisaRuleReference"("ruleSetId");
CREATE INDEX IF NOT EXISTS "VisaRuleReference_documentId_idx" ON "VisaRuleReference"("documentId");

