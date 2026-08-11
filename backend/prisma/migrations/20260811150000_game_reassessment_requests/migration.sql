ALTER TABLE "GameResult"
ADD COLUMN "reassessmentRequestStatus" TEXT,
ADD COLUMN "reassessmentRequestedAt" TIMESTAMP(3),
ADD COLUMN "reassessmentDecidedAt" TIMESTAMP(3),
ADD COLUMN "reassessmentDecidedById" TEXT,
ADD COLUMN "reassessmentReason" TEXT;

CREATE INDEX "GameResult_reassessmentRequestStatus_idx"
ON "GameResult"("reassessmentRequestStatus");
