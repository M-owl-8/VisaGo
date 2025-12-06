-- CreateEnum (only if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AIModelStatus') THEN
        CREATE TYPE "AIModelStatus" AS ENUM ('ACTIVE', 'CANDIDATE', 'DEPRECATED', 'ARCHIVED');
    END IF;
END $$;

-- CreateEnum (only if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AIFineTuneStatus') THEN
        CREATE TYPE "AIFineTuneStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
    END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "AIModelVersion" (
    "id" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "baseModel" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "externalModelId" TEXT,
    "status" "AIModelStatus" NOT NULL DEFAULT 'CANDIDATE',
    "trafficPercent" INTEGER NOT NULL DEFAULT 0,
    "promptVersion" TEXT,
    "dataSnapshot" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),

    CONSTRAINT "AIModelVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AIFineTuneJob" (
    "id" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "baseModel" TEXT NOT NULL,
    "status" "AIFineTuneStatus" NOT NULL DEFAULT 'QUEUED',
    "externalJobId" TEXT,
    "resultModelName" TEXT,
    "trainFilePath" TEXT NOT NULL,
    "valFilePath" TEXT,
    "metrics" JSONB,
    "errorMessage" TEXT,
    "modelVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AIFineTuneJob_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'AIFineTuneJob_modelVersionId_fkey'
    ) THEN
        ALTER TABLE "AIFineTuneJob" ADD CONSTRAINT "AIFineTuneJob_modelVersionId_fkey" 
        FOREIGN KEY ("modelVersionId") REFERENCES "AIModelVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AlterTable
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'AIInteraction' AND column_name = 'modelVersionId'
    ) THEN
        ALTER TABLE "AIInteraction" ADD COLUMN "modelVersionId" TEXT;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'AIInteraction_modelVersionId_fkey'
    ) THEN
        ALTER TABLE "AIInteraction" ADD CONSTRAINT "AIInteraction_modelVersionId_fkey" 
        FOREIGN KEY ("modelVersionId") REFERENCES "AIModelVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIModelVersion_taskType_idx" ON "AIModelVersion"("taskType");
CREATE INDEX IF NOT EXISTS "AIModelVersion_status_idx" ON "AIModelVersion"("status");
CREATE INDEX IF NOT EXISTS "AIModelVersion_taskType_status_idx" ON "AIModelVersion"("taskType", "status");
CREATE INDEX IF NOT EXISTS "AIModelVersion_createdAt_idx" ON "AIModelVersion"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIFineTuneJob_taskType_idx" ON "AIFineTuneJob"("taskType");
CREATE INDEX IF NOT EXISTS "AIFineTuneJob_status_idx" ON "AIFineTuneJob"("status");
CREATE INDEX IF NOT EXISTS "AIFineTuneJob_modelVersionId_idx" ON "AIFineTuneJob"("modelVersionId");
CREATE INDEX IF NOT EXISTS "AIFineTuneJob_createdAt_idx" ON "AIFineTuneJob"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIInteraction_modelVersionId_idx" ON "AIInteraction"("modelVersionId");
