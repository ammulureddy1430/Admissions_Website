CREATE TABLE "GameTutorials" (
  "id" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "tutorialTitle" TEXT NOT NULL,
  "tutorialDescription" TEXT NOT NULL,
  "tutorialVideoUrl" TEXT,
  "instructions" JSONB NOT NULL,
  "controls" JSONB NOT NULL,
  "objectives" JSONB NOT NULL,
  "scoringRules" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GameTutorials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GameTutorialProgress" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "tutorialViewed" BOOLEAN NOT NULL DEFAULT false,
  "practiceCompleted" BOOLEAN NOT NULL DEFAULT false,
  "viewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GameTutorialProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GameTutorials_gameId_key" ON "GameTutorials"("gameId");
CREATE UNIQUE INDEX "GameTutorialProgress_studentId_assessmentId_key" ON "GameTutorialProgress"("studentId", "assessmentId");
CREATE INDEX "GameTutorialProgress_assessmentId_tutorialViewed_idx" ON "GameTutorialProgress"("assessmentId", "tutorialViewed");
ALTER TABLE "GameTutorials" ADD CONSTRAINT "GameTutorials_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "GeneratedGames"("id") ON DELETE CASCADE ON UPDATE CASCADE;
