ALTER TABLE "Application"
ADD COLUMN "assessmentRequired" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "assessmentWaivedAt" TIMESTAMP(3),
ADD COLUMN "assessmentWaivedReason" TEXT;
