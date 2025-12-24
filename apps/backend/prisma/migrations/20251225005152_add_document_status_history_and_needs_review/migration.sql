-- AlterTable
-- Add needsReview field to UserDocument and create DocumentStatusHistory table

-- Add needsReview column to UserDocument
ALTER TABLE "UserDocument" ADD COLUMN IF NOT EXISTS "needsReview" BOOLEAN NOT NULL DEFAULT false;

-- CreateDocumentStatusHistory
CREATE TABLE IF NOT EXISTS "DocumentStatusHistory" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DocumentStatusHistory_documentId_idx" ON "DocumentStatusHistory"("documentId");

-- AddForeignKey
ALTER TABLE "DocumentStatusHistory" ADD CONSTRAINT "DocumentStatusHistory_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UserDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

