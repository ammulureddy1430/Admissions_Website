-- CreateTable
CREATE TABLE "GameEngineDefinitions" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "engineKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "capabilities" JSONB NOT NULL,
    "supportedDevices" TEXT[],
    "defaultConfig" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameEngineDefinitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRuntimeSessions" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "engineId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'PREVIEW',
    "status" TEXT NOT NULL DEFAULT 'READY',
    "questionIds" TEXT[],
    "currentIndex" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "livesRemaining" INTEGER NOT NULL DEFAULT 3,
    "hintsRemaining" INTEGER NOT NULL DEFAULT 3,
    "elapsedSeconds" INTEGER NOT NULL DEFAULT 0,
    "runtimeState" JSONB NOT NULL,
    "configuration" JSONB NOT NULL,
    "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameRuntimeSessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRuntimeEvents" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "sequence" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameRuntimeEvents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameEngineDefinitions_schoolId_status_idx" ON "GameEngineDefinitions"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GameEngineDefinitions_schoolId_engineKey_key" ON "GameEngineDefinitions"("schoolId", "engineKey");

-- CreateIndex
CREATE INDEX "GameRuntimeSessions_schoolId_userId_status_idx" ON "GameRuntimeSessions"("schoolId", "userId", "status");

-- CreateIndex
CREATE INDEX "GameRuntimeEvents_sessionId_occurredAt_idx" ON "GameRuntimeEvents"("sessionId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "GameRuntimeEvents_sessionId_sequence_key" ON "GameRuntimeEvents"("sessionId", "sequence");

-- AddForeignKey
ALTER TABLE "GameEngineDefinitions" ADD CONSTRAINT "GameEngineDefinitions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRuntimeSessions" ADD CONSTRAINT "GameRuntimeSessions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRuntimeSessions" ADD CONSTRAINT "GameRuntimeSessions_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES "GameEngineDefinitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRuntimeEvents" ADD CONSTRAINT "GameRuntimeEvents_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameRuntimeSessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
