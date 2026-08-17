CREATE TABLE "RobotMissionAnalytics" (
  "id" TEXT NOT NULL, "studentId" TEXT NOT NULL, "assessmentId" TEXT NOT NULL, "gameId" TEXT NOT NULL, "gameResultId" TEXT NOT NULL,
  "ageGroup" TEXT NOT NULL, "missionsStarted" INTEGER NOT NULL, "missionsCompleted" INTEGER NOT NULL, "commandsSelected" INTEGER NOT NULL,
  "commandsExecuted" INTEGER NOT NULL, "successfulMissions" INTEGER NOT NULL, "unsuccessfulMissions" INTEGER NOT NULL,
  "sequenceLengthAverage" DOUBLE PRECISION NOT NULL, "longestSuccessfulSequence" INTEGER NOT NULL, "sequenceAccuracy" DOUBLE PRECISION NOT NULL,
  "commandEfficiency" DOUBLE PRECISION NOT NULL, "averageSequenceBuildTime" DOUBLE PRECISION NOT NULL, "averageMissionCompletionTime" DOUBLE PRECISION NOT NULL,
  "highestDifficulty" INTEGER NOT NULL, "computationalThinkingScore" DOUBLE PRECISION NOT NULL, "algorithmicReasoningScore" DOUBLE PRECISION NOT NULL,
  "completionPercentage" DOUBLE PRECISION NOT NULL, "overallScore" DOUBLE PRECISION NOT NULL, "completionStatus" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL, "completedAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RobotMissionAnalytics_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RobotMissionAnalytics_gameResultId_key" ON "RobotMissionAnalytics"("gameResultId");
CREATE INDEX "RobotMissionAnalytics_gameId_assessmentId_idx" ON "RobotMissionAnalytics"("gameId", "assessmentId");
CREATE INDEX "RobotMissionAnalytics_studentId_assessmentId_idx" ON "RobotMissionAnalytics"("studentId", "assessmentId");
ALTER TABLE "RobotMissionAnalytics" ADD CONSTRAINT "RobotMissionAnalytics_gameResultId_fkey" FOREIGN KEY ("gameResultId") REFERENCES "GameResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RobotMissionAnalytics" ADD CONSTRAINT "RobotMissionAnalytics_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
