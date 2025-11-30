-- CreateTable
CREATE TABLE "DocumentChecklist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "checklistData" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" DATETIME,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentChecklist_applicationId_key" ON "DocumentChecklist"("applicationId");

-- CreateIndex
CREATE INDEX "DocumentChecklist_applicationId_idx" ON "DocumentChecklist"("applicationId");

-- CreateIndex
CREATE INDEX "DocumentChecklist_status_idx" ON "DocumentChecklist"("status");


