CREATE TABLE "BallStackAnalytics" (
  "id" TEXT NOT NULL, "studentId" TEXT NOT NULL, "assessmentId" TEXT NOT NULL,
  "gameId" TEXT NOT NULL, "gameResultId" TEXT NOT NULL,
  "totalBallsDropped" INTEGER NOT NULL, "successfulPlacements" INTEGER NOT NULL,
  "failedPlacements" INTEGER NOT NULL, "highestTowerHeight" INTEGER NOT NULL,
  "averageAlignment" DOUBLE PRECISION NOT NULL, "perfectPlacements" INTEGER NOT NULL,
  "averageReactionTime" DOUBLE PRECISION NOT NULL, "towerStabilityScore" DOUBLE PRECISION NOT NULL,
  "handEyeCoordinationScore" DOUBLE PRECISION NOT NULL, "fineMotorScore" DOUBLE PRECISION NOT NULL,
  "precisionScore" DOUBLE PRECISION NOT NULL, "concentrationScore" DOUBLE PRECISION NOT NULL,
  "patienceScore" DOUBLE PRECISION NOT NULL, "reactionSpeedScore" DOUBLE PRECISION NOT NULL,
  "consistencyScore" DOUBLE PRECISION NOT NULL, "timingAccuracyScore" DOUBLE PRECISION NOT NULL,
  "overallCognitiveScore" DOUBLE PRECISION NOT NULL, "completionStatus" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BallStackAnalytics_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BallStackAnalytics_gameResultId_key" ON "BallStackAnalytics"("gameResultId");
CREATE INDEX "BallStackAnalytics_gameId_assessmentId_idx" ON "BallStackAnalytics"("gameId", "assessmentId");
CREATE INDEX "BallStackAnalytics_studentId_assessmentId_idx" ON "BallStackAnalytics"("studentId", "assessmentId");
ALTER TABLE "BallStackAnalytics" ADD CONSTRAINT "BallStackAnalytics_gameResultId_fkey" FOREIGN KEY ("gameResultId") REFERENCES "GameResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BallStackAnalytics" ADD CONSTRAINT "BallStackAnalytics_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
