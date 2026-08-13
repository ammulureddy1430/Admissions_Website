ALTER TABLE "GameResult"
ADD COLUMN "finalSubmittedAt" TIMESTAMP(3);

CREATE INDEX "GameResult_finalSubmittedAt_idx"
ON "GameResult"("finalSubmittedAt");
