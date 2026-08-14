CREATE TABLE "PatternMatrixAnalytics" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "gameResultId" TEXT NOT NULL,
  "ageGroup" TEXT NOT NULL,
  "roundsPresented" INTEGER NOT NULL,
  "roundsCompleted" INTEGER NOT NULL,
  "correctCells" INTEGER NOT NULL,
  "missedCells" INTEGER NOT NULL,
  "incorrectCells" INTEGER NOT NULL,
  "totalActions" INTEGER NOT NULL,
  "averageResponseTime" DOUBLE PRECISION NOT NULL,
  "highestDifficulty" INTEGER NOT NULL,
  "accuracy" DOUBLE PRECISION NOT NULL,
  "visualMemoryScore" DOUBLE PRECISION NOT NULL,
  "attentionScore" DOUBLE PRECISION NOT NULL,
  "spatialRecallScore" DOUBLE PRECISION NOT NULL,
  "processingSpeedScore" DOUBLE PRECISION NOT NULL,
  "completionPercentage" DOUBLE PRECISION NOT NULL,
  "overallScore" DOUBLE PRECISION NOT NULL,
  "completionStatus" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PatternMatrixAnalytics_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PatternMatrixAnalytics_gameResultId_key" ON "PatternMatrixAnalytics"("gameResultId");
CREATE INDEX "PatternMatrixAnalytics_gameId_assessmentId_idx" ON "PatternMatrixAnalytics"("gameId", "assessmentId");
CREATE INDEX "PatternMatrixAnalytics_studentId_assessmentId_idx" ON "PatternMatrixAnalytics"("studentId", "assessmentId");
ALTER TABLE "PatternMatrixAnalytics" ADD CONSTRAINT "PatternMatrixAnalytics_gameResultId_fkey" FOREIGN KEY ("gameResultId") REFERENCES "GameResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatternMatrixAnalytics" ADD CONSTRAINT "PatternMatrixAnalytics_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
