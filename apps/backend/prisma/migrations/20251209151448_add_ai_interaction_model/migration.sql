-- CreateTable
CREATE TABLE IF NOT EXISTS "AIInteraction" (
    "id" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT,
    "source" TEXT,
    "requestPayload" TEXT NOT NULL,
    "responsePayload" TEXT,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "countryCode" TEXT,
    "visaType" TEXT,
    "ruleSetId" TEXT,
    "applicationId" TEXT,
    "userId" TEXT,
    "modelVersionId" TEXT,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIInteraction_userId_idx" ON "AIInteraction"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIInteraction_applicationId_idx" ON "AIInteraction"("applicationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIInteraction_createdAt_idx" ON "AIInteraction"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIInteraction_taskType_idx" ON "AIInteraction"("taskType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIInteraction_model_idx" ON "AIInteraction"("model");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIInteraction_success_idx" ON "AIInteraction"("success");

