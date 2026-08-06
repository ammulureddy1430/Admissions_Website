CREATE TABLE "FollowLightsAnalytics" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "gameResultId" TEXT NOT NULL,
    "totalSequences" INTEGER NOT NULL,
    "completedSequences" INTEGER NOT NULL,
    "longestSequence" INTEGER NOT NULL,
    "mistakes" INTEGER NOT NULL,
    "correctTaps" INTEGER NOT NULL,
    "wrongTaps" INTEGER NOT NULL,
    "averageReactionTime" DOUBLE PRECISION NOT NULL,
    "averageTapDelay" DOUBLE PRECISION NOT NULL,
    "completionPercentage" DOUBLE PRECISION NOT NULL,
    "memoryScore" DOUBLE PRECISION NOT NULL,
    "focusScore" DOUBLE PRECISION NOT NULL,
    "processingSpeed" DOUBLE PRECISION NOT NULL,
    "learningPotential" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "attention" DOUBLE PRECISION NOT NULL,
    "visualMemory" DOUBLE PRECISION NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FollowLightsAnalytics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FollowLightsAnalytics_gameResultId_key" ON "FollowLightsAnalytics"("gameResultId");
CREATE INDEX "FollowLightsAnalytics_gameId_assessmentId_idx" ON "FollowLightsAnalytics"("gameId", "assessmentId");
CREATE INDEX "FollowLightsAnalytics_studentId_assessmentId_idx" ON "FollowLightsAnalytics"("studentId", "assessmentId");
ALTER TABLE "FollowLightsAnalytics" ADD CONSTRAINT "FollowLightsAnalytics_gameResultId_fkey" FOREIGN KEY ("gameResultId") REFERENCES "GameResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FollowLightsAnalytics" ADD CONSTRAINT "FollowLightsAnalytics_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
