-- Add FK from DocumentCheckResult.documentId to UserDocument.id (PostgreSQL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'DocumentCheckResult_documentId_fkey'
      AND table_name = 'DocumentCheckResult'
  ) THEN
    ALTER TABLE "DocumentCheckResult"
      ADD CONSTRAINT "DocumentCheckResult_documentId_fkey"
      FOREIGN KEY ("documentId") REFERENCES "UserDocument"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- Optional backfill placeholder: no action required because documentId is already present.

