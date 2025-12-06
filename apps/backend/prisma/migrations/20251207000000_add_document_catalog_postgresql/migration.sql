-- CreateTable
CREATE TABLE "DocumentCatalog" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
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
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaRuleReference" (
    "id" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "condition" TEXT,
    "categoryOverride" TEXT,
    "descriptionOverride" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisaRuleReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentCatalog_documentType_key" ON "DocumentCatalog"("documentType");

-- CreateIndex
CREATE INDEX "DocumentCatalog_documentType_idx" ON "DocumentCatalog"("documentType");

-- CreateIndex
CREATE INDEX "DocumentCatalog_group_idx" ON "DocumentCatalog"("group");

-- CreateIndex
CREATE INDEX "DocumentCatalog_isActive_idx" ON "DocumentCatalog"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "VisaRuleReference_ruleSetId_documentId_key" ON "VisaRuleReference"("ruleSetId", "documentId");

-- CreateIndex
CREATE INDEX "VisaRuleReference_ruleSetId_idx" ON "VisaRuleReference"("ruleSetId");

-- CreateIndex
CREATE INDEX "VisaRuleReference_documentId_idx" ON "VisaRuleReference"("documentId");

-- AddForeignKey
ALTER TABLE "VisaRuleReference" ADD CONSTRAINT "VisaRuleReference_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "VisaRuleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaRuleReference" ADD CONSTRAINT "VisaRuleReference_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentCatalog"("id") ON UPDATE CASCADE;

