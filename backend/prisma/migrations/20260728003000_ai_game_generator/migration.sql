-- AlterTable
ALTER TABLE "GameRuntimeSessions" ADD COLUMN     "generatedGameId" TEXT;

-- CreateTable
CREATE TABLE "GeneratedGames" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "gameAssessmentId" TEXT,
    "templateId" TEXT NOT NULL,
    "engineKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mappingIds" TEXT[],
    "questionIds" TEXT[],
    "questionSnapshot" JSONB NOT NULL,
    "configuration" JSONB NOT NULL,
    "generationPrompt" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedGames_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedGameVersions" (
    "id" TEXT NOT NULL,
    "generatedGameId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changeNote" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedGameVersions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedGameAuditLogs" (
    "id" TEXT NOT NULL,
    "generatedGameId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedGameAuditLogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GeneratedGames_schoolId_status_updatedAt_idx" ON "GeneratedGames"("schoolId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "GeneratedGames_gameAssessmentId_idx" ON "GeneratedGames"("gameAssessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedGameVersions_generatedGameId_version_key" ON "GeneratedGameVersions"("generatedGameId", "version");

-- CreateIndex
CREATE INDEX "GeneratedGameAuditLogs_schoolId_generatedGameId_createdAt_idx" ON "GeneratedGameAuditLogs"("schoolId", "generatedGameId", "createdAt");

-- AddForeignKey
ALTER TABLE "GameRuntimeSessions" ADD CONSTRAINT "GameRuntimeSessions_generatedGameId_fkey" FOREIGN KEY ("generatedGameId") REFERENCES "GeneratedGames"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedGames" ADD CONSTRAINT "GeneratedGames_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedGames" ADD CONSTRAINT "GeneratedGames_gameAssessmentId_fkey" FOREIGN KEY ("gameAssessmentId") REFERENCES "GameAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedGames" ADD CONSTRAINT "GeneratedGames_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "GameTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedGameVersions" ADD CONSTRAINT "GeneratedGameVersions_generatedGameId_fkey" FOREIGN KEY ("generatedGameId") REFERENCES "GeneratedGames"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedGameAuditLogs" ADD CONSTRAINT "GeneratedGameAuditLogs_generatedGameId_fkey" FOREIGN KEY ("generatedGameId") REFERENCES "GeneratedGames"("id") ON DELETE CASCADE ON UPDATE CASCADE;
