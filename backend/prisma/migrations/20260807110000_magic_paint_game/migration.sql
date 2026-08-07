CREATE TABLE "MagicPaintAnalytics" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "gameResultId" TEXT NOT NULL,
  "objectsCompleted" INTEGER NOT NULL,
  "colorsUsed" TEXT[],
  "interactionsPerObject" INTEGER[],
  "averageCompletionTime" DOUBLE PRECISION NOT NULL,
  "interactionConsistency" DOUBLE PRECISION NOT NULL,
  "completionPercentage" DOUBLE PRECISION NOT NULL,
  "creativityScore" DOUBLE PRECISION NOT NULL,
  "causeEffectScore" DOUBLE PRECISION NOT NULL,
  "overallScore" DOUBLE PRECISION NOT NULL,
  "completionStatus" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MagicPaintAnalytics_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MagicPaintAnalytics_gameResultId_key" ON "MagicPaintAnalytics"("gameResultId");
CREATE INDEX "MagicPaintAnalytics_gameId_assessmentId_idx" ON "MagicPaintAnalytics"("gameId","assessmentId");
CREATE INDEX "MagicPaintAnalytics_studentId_assessmentId_idx" ON "MagicPaintAnalytics"("studentId","assessmentId");
ALTER TABLE "MagicPaintAnalytics" ADD CONSTRAINT "MagicPaintAnalytics_gameResultId_fkey" FOREIGN KEY ("gameResultId") REFERENCES "GameResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MagicPaintAnalytics" ADD CONSTRAINT "MagicPaintAnalytics_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
