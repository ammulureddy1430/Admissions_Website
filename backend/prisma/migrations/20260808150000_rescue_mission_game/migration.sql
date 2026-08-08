CREATE TABLE "RescueMissionAnalytics" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "gameResultId" TEXT NOT NULL,
  "missionsStarted" INTEGER NOT NULL,
  "missionsCompleted" INTEGER NOT NULL,
  "successfulRescues" INTEGER NOT NULL,
  "unsuccessfulActions" INTEGER NOT NULL,
  "strategyChanges" INTEGER NOT NULL,
  "successfulStrategyChanges" INTEGER NOT NULL,
  "averageDecisionTime" DOUBLE PRECISION NOT NULL,
  "averageSolutionTime" DOUBLE PRECISION NOT NULL,
  "highestDifficulty" INTEGER NOT NULL,
  "problemSolvingScore" DOUBLE PRECISION NOT NULL,
  "cognitiveFlexibilityScore" DOUBLE PRECISION NOT NULL,
  "completionPercentage" DOUBLE PRECISION NOT NULL,
  "overallScore" DOUBLE PRECISION NOT NULL,
  "completionStatus" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RescueMissionAnalytics_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RescueMissionAnalytics_gameResultId_key" ON "RescueMissionAnalytics"("gameResultId");
CREATE INDEX "RescueMissionAnalytics_gameId_assessmentId_idx" ON "RescueMissionAnalytics"("gameId", "assessmentId");
CREATE INDEX "RescueMissionAnalytics_studentId_assessmentId_idx" ON "RescueMissionAnalytics"("studentId", "assessmentId");
ALTER TABLE "RescueMissionAnalytics" ADD CONSTRAINT "RescueMissionAnalytics_gameResultId_fkey" FOREIGN KEY ("gameResultId") REFERENCES "GameResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RescueMissionAnalytics" ADD CONSTRAINT "RescueMissionAnalytics_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
