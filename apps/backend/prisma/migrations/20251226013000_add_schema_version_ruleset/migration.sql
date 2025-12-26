-- Add schemaVersion column to VisaRuleSet (PostgreSQL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'VisaRuleSet'
      AND column_name = 'schemaVersion'
  ) THEN
    ALTER TABLE "VisaRuleSet" ADD COLUMN "schemaVersion" INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- SQLite compatibility note: for local dev, prisma db push will add the column automatically.

