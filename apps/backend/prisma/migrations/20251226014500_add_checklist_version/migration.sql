-- Add checklistVersion column to DocumentChecklist (PostgreSQL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'DocumentChecklist'
      AND column_name = 'checklistVersion'
  ) THEN
    ALTER TABLE "DocumentChecklist" ADD COLUMN "checklistVersion" INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- SQLite: column will be added via prisma db push in dev environments.

