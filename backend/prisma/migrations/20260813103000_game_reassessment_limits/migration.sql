ALTER TABLE "GameAssignment"
ADD COLUMN "allowedReassessments" INTEGER NOT NULL DEFAULT 0;

-- Preserve the intent of existing multi-attempt assignments when upgrading.
UPDATE "GameAssignment"
SET "allowedReassessments" = GREATEST("maxAttempts" - 1, 0);
