-- Fix DocumentChecklist foreign key to point to VisaApplication instead of Application
-- 
-- ISSUE: DocumentChecklist FK was pointing to Application table, but the API actually uses VisaApplication.
-- This caused FK violations when trying to create DocumentChecklist entries for VisaApplication IDs.
-- 
-- SOLUTION: Drop the old FK and create a new one pointing to VisaApplication.
-- This migration is non-destructive - it only changes the FK constraint, no data is lost.

-- Drop the old foreign key constraint pointing to Application
ALTER TABLE "DocumentChecklist" DROP CONSTRAINT IF EXISTS "DocumentChecklist_applicationId_fkey";

-- Add new foreign key constraint pointing to VisaApplication (the table actually used by the API)
ALTER TABLE "DocumentChecklist" 
  ADD CONSTRAINT "DocumentChecklist_applicationId_fkey" 
  FOREIGN KEY ("applicationId") 
  REFERENCES "VisaApplication"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

