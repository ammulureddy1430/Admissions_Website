-- AlterTable
ALTER TABLE "GameAssignment" ADD COLUMN     "allowRestart" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "assignmentSettings" JSONB,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "generatedGameId" TEXT,
ADD COLUMN     "maxAttempts" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "passingScore" DOUBLE PRECISION NOT NULL DEFAULT 60,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "timeLimitMinutes" INTEGER;

-- AlterTable
ALTER TABLE "GameRuntimeSessions" ADD COLUMN     "gameResultId" TEXT;

-- CreateIndex
CREATE INDEX "GameAssignment_generatedGameId_status_idx" ON "GameAssignment"("generatedGameId", "status");

-- AddForeignKey
ALTER TABLE "GameAssignment" ADD CONSTRAINT "GameAssignment_generatedGameId_fkey" FOREIGN KEY ("generatedGameId") REFERENCES "GeneratedGames"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRuntimeSessions" ADD CONSTRAINT "GameRuntimeSessions_gameResultId_fkey" FOREIGN KEY ("gameResultId") REFERENCES "GameResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
