-- Create enums (idempotent guards)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VisaApplicationStatus') THEN
    CREATE TYPE "VisaApplicationStatus" AS ENUM ('draft','submitted','approved','rejected','expired');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ApplicationStatus') THEN
    CREATE TYPE "ApplicationStatus" AS ENUM ('draft','submitted','under_review','approved','rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentChecklistStatus') THEN
    CREATE TYPE "DocumentChecklistStatus" AS ENUM ('processing','ready','failed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserDocumentStatus') THEN
    CREATE TYPE "UserDocumentStatus" AS ENUM ('pending','verified','rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
    CREATE TYPE "PaymentStatus" AS ENUM ('pending','completed','failed','refunded','partially_refunded');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RefundStatus') THEN
    CREATE TYPE "RefundStatus" AS ENUM ('pending','processing','completed','failed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WebhookStatus') THEN
    CREATE TYPE "WebhookStatus" AS ENUM ('pending','processed','failed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationStatus') THEN
    CREATE TYPE "NotificationStatus" AS ENUM ('pending','sent','failed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmailStatus') THEN
    CREATE TYPE "EmailStatus" AS ENUM ('pending','sent','failed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentCheckStatus') THEN
    CREATE TYPE "DocumentCheckStatus" AS ENUM ('OK','MISSING','PROBLEM','UNCERTAIN');
  END IF;
END $$;

-- Alter columns to enums (if not already)
ALTER TABLE "VisaApplication" ALTER COLUMN "status" TYPE "VisaApplicationStatus" USING "status"::text::"VisaApplicationStatus";
ALTER TABLE "Application" ALTER COLUMN "status" TYPE "ApplicationStatus" USING "status"::text::"ApplicationStatus";
ALTER TABLE "DocumentChecklist" ALTER COLUMN "status" TYPE "DocumentChecklistStatus" USING "status"::text::"DocumentChecklistStatus";
ALTER TABLE "UserDocument" ALTER COLUMN "status" TYPE "UserDocumentStatus" USING "status"::text::"UserDocumentStatus";
ALTER TABLE "Payment" ALTER COLUMN "status" TYPE "PaymentStatus" USING "status"::text::"PaymentStatus";
ALTER TABLE "Refund" ALTER COLUMN "status" TYPE "RefundStatus" USING "status"::text::"RefundStatus";
ALTER TABLE "WebhookIdempotency" ALTER COLUMN "status" TYPE "WebhookStatus" USING "status"::text::"WebhookStatus";
ALTER TABLE "NotificationLog" ALTER COLUMN "status" TYPE "NotificationStatus" USING "status"::text::"NotificationStatus";
ALTER TABLE "EmailLog" ALTER COLUMN "status" TYPE "EmailStatus" USING "status"::text::"EmailStatus";
ALTER TABLE "DocumentCheckResult" ALTER COLUMN "status" TYPE "DocumentCheckStatus" USING "status"::text::"DocumentCheckStatus";

