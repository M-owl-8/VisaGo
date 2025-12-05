-- CreateTable: VisaRiskExplanation
CREATE TABLE IF NOT EXISTS "VisaRiskExplanation" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "visaType" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "summaryEn" TEXT NOT NULL,
    "summaryUz" TEXT NOT NULL,
    "summaryRu" TEXT NOT NULL,
    "recommendations" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisaRiskExplanation_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ChecklistFeedback
CREATE TABLE IF NOT EXISTS "ChecklistFeedback" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "visaType" TEXT NOT NULL,
    "checklistSnapshot" JSONB NOT NULL,
    "feedbackType" TEXT NOT NULL,
    "feedbackText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: VisaRiskExplanation indexes
CREATE UNIQUE INDEX IF NOT EXISTS "VisaRiskExplanation_applicationId_key" ON "VisaRiskExplanation"("applicationId");
CREATE INDEX IF NOT EXISTS "VisaRiskExplanation_applicationId_idx" ON "VisaRiskExplanation"("applicationId");
CREATE INDEX IF NOT EXISTS "VisaRiskExplanation_userId_idx" ON "VisaRiskExplanation"("userId");
CREATE INDEX IF NOT EXISTS "VisaRiskExplanation_countryCode_visaType_idx" ON "VisaRiskExplanation"("countryCode", "visaType");
CREATE INDEX IF NOT EXISTS "VisaRiskExplanation_riskLevel_idx" ON "VisaRiskExplanation"("riskLevel");
CREATE INDEX IF NOT EXISTS "VisaRiskExplanation_createdAt_idx" ON "VisaRiskExplanation"("createdAt");

-- CreateIndex: ChecklistFeedback indexes
CREATE INDEX IF NOT EXISTS "ChecklistFeedback_applicationId_idx" ON "ChecklistFeedback"("applicationId");
CREATE INDEX IF NOT EXISTS "ChecklistFeedback_userId_idx" ON "ChecklistFeedback"("userId");
CREATE INDEX IF NOT EXISTS "ChecklistFeedback_countryCode_visaType_idx" ON "ChecklistFeedback"("countryCode", "visaType");
CREATE INDEX IF NOT EXISTS "ChecklistFeedback_feedbackType_idx" ON "ChecklistFeedback"("feedbackType");
CREATE INDEX IF NOT EXISTS "ChecklistFeedback_createdAt_idx" ON "ChecklistFeedback"("createdAt");

-- AddForeignKey: VisaRiskExplanation -> VisaApplication
ALTER TABLE "VisaRiskExplanation" ADD CONSTRAINT "VisaRiskExplanation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "VisaApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ChecklistFeedback -> VisaApplication
ALTER TABLE "ChecklistFeedback" ADD CONSTRAINT "ChecklistFeedback_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "VisaApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

