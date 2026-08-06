CREATE TABLE "ColorPathAnalytics" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "gameResultId" TEXT NOT NULL,
  "roundsPlayed" INTEGER NOT NULL,
  "correctSelections" INTEGER NOT NULL,
  "incorrectSelections" INTEGER NOT NULL,
  "averageResponseTime" DOUBLE PRECISION NOT NULL,
  "observationAccuracy" DOUBLE PRECISION NOT NULL,
  "observationScore" DOUBLE PRECISION NOT NULL,
  "visualRecognitionScore" DOUBLE PRECISION NOT NULL,
  "highestDifficulty" INTEGER NOT NULL,
  "completionPercentage" DOUBLE PRECISION NOT NULL,
  "overallScore" DOUBLE PRECISION NOT NULL,
  "completionStatus" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ColorPathAnalytics_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ColorPathAnalytics_gameResultId_key" ON "ColorPathAnalytics"("gameResultId");
CREATE INDEX "ColorPathAnalytics_gameId_assessmentId_idx" ON "ColorPathAnalytics"("gameId", "assessmentId");
CREATE INDEX "ColorPathAnalytics_studentId_assessmentId_idx" ON "ColorPathAnalytics"("studentId", "assessmentId");
ALTER TABLE "ColorPathAnalytics" ADD CONSTRAINT "ColorPathAnalytics_gameResultId_fkey" FOREIGN KEY ("gameResultId") REFERENCES "GameResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ColorPathAnalytics" ADD CONSTRAINT "ColorPathAnalytics_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
