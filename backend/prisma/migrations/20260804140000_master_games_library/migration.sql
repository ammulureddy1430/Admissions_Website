CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "thumbnail" TEXT,
    "component_name" TEXT NOT NULL,
    "game_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GameAssessmentGame" (
    "id" TEXT NOT NULL,
    "gameAssessmentId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameAssessmentGame_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GameResult" ADD COLUMN "gameId" TEXT;
ALTER TABLE "GameResult" ADD COLUMN "assessmentId" TEXT;

CREATE UNIQUE INDEX "games_slug_key" ON "games"("slug");
CREATE UNIQUE INDEX "games_component_name_key" ON "games"("component_name");
CREATE INDEX "games_status_is_active_idx" ON "games"("status", "is_active");
CREATE INDEX "games_category_grade_idx" ON "games"("category", "grade");
CREATE UNIQUE INDEX "GameAssessmentGame_gameAssessmentId_gameId_key" ON "GameAssessmentGame"("gameAssessmentId", "gameId");
CREATE INDEX "GameAssessmentGame_gameId_idx" ON "GameAssessmentGame"("gameId");
CREATE INDEX "GameResult_gameId_studentId_idx" ON "GameResult"("gameId", "studentId");
CREATE INDEX "GameResult_assessmentId_studentId_idx" ON "GameResult"("assessmentId", "studentId");

ALTER TABLE "GameAssessmentGame" ADD CONSTRAINT "GameAssessmentGame_gameAssessmentId_fkey" FOREIGN KEY ("gameAssessmentId") REFERENCES "GameAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameAssessmentGame" ADD CONSTRAINT "GameAssessmentGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GameResult" ADD CONSTRAINT "GameResult_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GameResult" ADD CONSTRAINT "GameResult_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "GameAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
