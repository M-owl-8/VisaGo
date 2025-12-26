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

-- Alter columns to enums (drop default first, then convert type, then set new default)
-- VisaApplication
ALTER TABLE "VisaApplication" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "VisaApplication" ALTER COLUMN "status" TYPE "VisaApplicationStatus" USING "status"::text::"VisaApplicationStatus";
ALTER TABLE "VisaApplication" ALTER COLUMN "status" SET DEFAULT 'draft'::"VisaApplicationStatus";

-- Application
ALTER TABLE "Application" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Application" ALTER COLUMN "status" TYPE "ApplicationStatus" USING "status"::text::"ApplicationStatus";
ALTER TABLE "Application" ALTER COLUMN "status" SET DEFAULT 'draft'::"ApplicationStatus";

-- DocumentChecklist
ALTER TABLE "DocumentChecklist" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "DocumentChecklist" ALTER COLUMN "status" TYPE "DocumentChecklistStatus" USING "status"::text::"DocumentChecklistStatus";
ALTER TABLE "DocumentChecklist" ALTER COLUMN "status" SET DEFAULT 'processing'::"DocumentChecklistStatus";

-- UserDocument
ALTER TABLE "UserDocument" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "UserDocument" ALTER COLUMN "status" TYPE "UserDocumentStatus" USING "status"::text::"UserDocumentStatus";
ALTER TABLE "UserDocument" ALTER COLUMN "status" SET DEFAULT 'pending'::"UserDocumentStatus";

-- Payment
ALTER TABLE "Payment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Payment" ALTER COLUMN "status" TYPE "PaymentStatus" USING "status"::text::"PaymentStatus";
ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'pending'::"PaymentStatus";

-- Refund
ALTER TABLE "Refund" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Refund" ALTER COLUMN "status" TYPE "RefundStatus" USING "status"::text::"RefundStatus";
ALTER TABLE "Refund" ALTER COLUMN "status" SET DEFAULT 'pending'::"RefundStatus";

-- WebhookIdempotency
ALTER TABLE "WebhookIdempotency" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "WebhookIdempotency" ALTER COLUMN "status" TYPE "WebhookStatus" USING "status"::text::"WebhookStatus";
ALTER TABLE "WebhookIdempotency" ALTER COLUMN "status" SET DEFAULT 'pending'::"WebhookStatus";

-- NotificationLog
ALTER TABLE "NotificationLog" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "NotificationLog" ALTER COLUMN "status" TYPE "NotificationStatus" USING "status"::text::"NotificationStatus";
ALTER TABLE "NotificationLog" ALTER COLUMN "status" SET DEFAULT 'pending'::"NotificationStatus";

-- EmailLog
ALTER TABLE "EmailLog" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "EmailLog" ALTER COLUMN "status" TYPE "EmailStatus" USING "status"::text::"EmailStatus";
ALTER TABLE "EmailLog" ALTER COLUMN "status" SET DEFAULT 'pending'::"EmailStatus";

-- DocumentCheckResult (no default in schema, so just convert type)
ALTER TABLE "DocumentCheckResult" ALTER COLUMN "status" TYPE "DocumentCheckStatus" USING "status"::text::"DocumentCheckStatus";

