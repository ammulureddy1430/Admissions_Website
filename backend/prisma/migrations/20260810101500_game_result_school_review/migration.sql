ALTER TABLE "GameResult"
ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "schoolReview" TEXT,
ADD COLUMN "recommendation" TEXT,
ADD COLUMN "reviewedById" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3);

CREATE INDEX "GameResult_reviewStatus_idx" ON "GameResult"("reviewStatus");
