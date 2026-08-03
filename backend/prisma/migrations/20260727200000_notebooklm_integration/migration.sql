-- CreateTable
CREATE TABLE "NotebookConnections" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "textbookVersionId" TEXT NOT NULL,
    "notebookId" TEXT,
    "notebookName" TEXT,
    "notebookTitle" TEXT NOT NULL,
    "sourceId" TEXT,
    "sourceName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processingStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "aiReady" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "lastSync" TIMESTAMP(3),
    "lastError" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotebookConnections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotebookStatus" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "processingStatus" TEXT NOT NULL,
    "message" TEXT,
    "rawStatus" JSONB,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotebookStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotebookProcessingHistory" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "NotebookProcessingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotebookSyncLogs" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "durationMs" INTEGER,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotebookSyncLogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotebookConnections_textbookVersionId_key" ON "NotebookConnections"("textbookVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "NotebookConnections_notebookId_key" ON "NotebookConnections"("notebookId");

-- CreateIndex
CREATE INDEX "NotebookConnections_schoolId_processingStatus_status_idx" ON "NotebookConnections"("schoolId", "processingStatus", "status");

-- CreateIndex
CREATE INDEX "NotebookStatus_connectionId_checkedAt_idx" ON "NotebookStatus"("connectionId", "checkedAt");

-- CreateIndex
CREATE INDEX "NotebookProcessingHistory_connectionId_startedAt_idx" ON "NotebookProcessingHistory"("connectionId", "startedAt");

-- CreateIndex
CREATE INDEX "NotebookSyncLogs_schoolId_connectionId_createdAt_idx" ON "NotebookSyncLogs"("schoolId", "connectionId", "createdAt");

-- AddForeignKey
ALTER TABLE "NotebookConnections" ADD CONSTRAINT "NotebookConnections_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotebookConnections" ADD CONSTRAINT "NotebookConnections_textbookVersionId_fkey" FOREIGN KEY ("textbookVersionId") REFERENCES "TextbookVersions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotebookStatus" ADD CONSTRAINT "NotebookStatus_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "NotebookConnections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotebookProcessingHistory" ADD CONSTRAINT "NotebookProcessingHistory_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "NotebookConnections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotebookSyncLogs" ADD CONSTRAINT "NotebookSyncLogs_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "NotebookConnections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
