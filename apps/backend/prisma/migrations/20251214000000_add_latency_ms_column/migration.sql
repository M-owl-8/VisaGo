-- Add latencyMs column to AIInteraction if it doesn't exist
-- This migration is idempotent and safe to run multiple times

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'AIInteraction' 
        AND column_name = 'latencyMs'
    ) THEN
        ALTER TABLE "AIInteraction" ADD COLUMN "latencyMs" INTEGER;
        RAISE NOTICE 'Column latencyMs added to AIInteraction table';
    ELSE
        RAISE NOTICE 'Column latencyMs already exists in AIInteraction table';
    END IF;
END $$;

