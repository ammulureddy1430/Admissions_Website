ALTER TABLE "GameResult" ADD COLUMN "submissionCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "GameResult"
SET "submissionCount" = 1
WHERE "finalSubmittedAt" IS NOT NULL;
