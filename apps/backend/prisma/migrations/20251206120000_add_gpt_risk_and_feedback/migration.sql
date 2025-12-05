-- CreateTable: VisaRiskExplanation
CREATE TABLE "VisaRiskExplanation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "visaType" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "summaryEn" TEXT NOT NULL,
    "summaryUz" TEXT NOT NULL,
    "summaryRu" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VisaRiskExplanation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "VisaApplication" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: ChecklistFeedback
CREATE TABLE "ChecklistFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "visaType" TEXT NOT NULL,
    "checklistSnapshot" TEXT NOT NULL,
    "feedbackType" TEXT NOT NULL,
    "feedbackText" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChecklistFeedback_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "VisaApplication" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "VisaRiskExplanation_applicationId_key" ON "VisaRiskExplanation"("applicationId");

-- CreateIndex
CREATE INDEX "VisaRiskExplanation_applicationId_idx" ON "VisaRiskExplanation"("applicationId");

-- CreateIndex
CREATE INDEX "VisaRiskExplanation_userId_idx" ON "VisaRiskExplanation"("userId");

-- CreateIndex
CREATE INDEX "VisaRiskExplanation_countryCode_visaType_idx" ON "VisaRiskExplanation"("countryCode", "visaType");

-- CreateIndex
CREATE INDEX "VisaRiskExplanation_riskLevel_idx" ON "VisaRiskExplanation"("riskLevel");

-- CreateIndex
CREATE INDEX "VisaRiskExplanation_createdAt_idx" ON "VisaRiskExplanation"("createdAt");

-- CreateIndex
CREATE INDEX "ChecklistFeedback_applicationId_idx" ON "ChecklistFeedback"("applicationId");

-- CreateIndex
CREATE INDEX "ChecklistFeedback_userId_idx" ON "ChecklistFeedback"("userId");

-- CreateIndex
CREATE INDEX "ChecklistFeedback_countryCode_visaType_idx" ON "ChecklistFeedback"("countryCode", "visaType");

-- CreateIndex
CREATE INDEX "ChecklistFeedback_feedbackType_idx" ON "ChecklistFeedback"("feedbackType");

-- CreateIndex
CREATE INDEX "ChecklistFeedback_createdAt_idx" ON "ChecklistFeedback"("createdAt");

