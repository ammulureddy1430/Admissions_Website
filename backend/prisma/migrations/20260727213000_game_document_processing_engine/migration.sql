-- CreateTable
CREATE TABLE "ProcessedTextbooks" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "textbookVersionId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentStage" TEXT,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "characterCount" INTEGER NOT NULL DEFAULT 0,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "chapterCount" INTEGER NOT NULL DEFAULT 0,
    "topicCount" INTEGER NOT NULL DEFAULT 0,
    "subtopicCount" INTEGER NOT NULL DEFAULT 0,
    "documentMetadata" JSONB,
    "processingDate" TIMESTAMP(3),
    "lastProcessedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessedTextbooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedChapters" (
    "id" TEXT NOT NULL,
    "processedTextbookId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "chapterNumber" TEXT,
    "sequence" INTEGER NOT NULL,
    "startPage" INTEGER NOT NULL,
    "endPage" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessedChapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedTopics" (
    "id" TEXT NOT NULL,
    "processedTextbookId" TEXT NOT NULL,
    "chapterId" TEXT,
    "parentTopicId" TEXT,
    "title" TEXT NOT NULL,
    "topicNumber" TEXT,
    "type" TEXT NOT NULL DEFAULT 'TOPIC',
    "sequence" INTEGER NOT NULL,
    "startPage" INTEGER NOT NULL,
    "endPage" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessedTopics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedContent" (
    "id" TEXT NOT NULL,
    "processedTextbookId" TEXT NOT NULL,
    "chapterId" TEXT,
    "topicId" TEXT,
    "pageNumber" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'PAGE',
    "extractedText" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessingHistory" (
    "id" TEXT NOT NULL,
    "processedTextbookId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "errorMessage" TEXT,

    CONSTRAINT "ProcessingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessingLogs" (
    "id" TEXT NOT NULL,
    "processedTextbookId" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "stage" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessingLogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedTextbooks_textbookVersionId_key" ON "ProcessedTextbooks"("textbookVersionId");

-- CreateIndex
CREATE INDEX "ProcessedTextbooks_schoolId_status_updatedAt_idx" ON "ProcessedTextbooks"("schoolId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "ProcessedTextbooks_schoolId_boardId_academicYearId_gradeId__idx" ON "ProcessedTextbooks"("schoolId", "boardId", "academicYearId", "gradeId", "subjectId");

-- CreateIndex
CREATE INDEX "ProcessedChapters_processedTextbookId_startPage_idx" ON "ProcessedChapters"("processedTextbookId", "startPage");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedChapters_processedTextbookId_sequence_key" ON "ProcessedChapters"("processedTextbookId", "sequence");

-- CreateIndex
CREATE INDEX "ProcessedTopics_processedTextbookId_chapterId_type_sequence_idx" ON "ProcessedTopics"("processedTextbookId", "chapterId", "type", "sequence");

-- CreateIndex
CREATE INDEX "ProcessedTopics_parentTopicId_idx" ON "ProcessedTopics"("parentTopicId");

-- CreateIndex
CREATE INDEX "ProcessedContent_processedTextbookId_chapterId_topicId_page_idx" ON "ProcessedContent"("processedTextbookId", "chapterId", "topicId", "pageNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedContent_processedTextbookId_pageNumber_sequence_key" ON "ProcessedContent"("processedTextbookId", "pageNumber", "sequence");

-- CreateIndex
CREATE INDEX "ProcessingHistory_processedTextbookId_startedAt_idx" ON "ProcessingHistory"("processedTextbookId", "startedAt");

-- CreateIndex
CREATE INDEX "ProcessingLogs_processedTextbookId_createdAt_idx" ON "ProcessingLogs"("processedTextbookId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProcessedTextbooks" ADD CONSTRAINT "ProcessedTextbooks_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessedTextbooks" ADD CONSTRAINT "ProcessedTextbooks_textbookVersionId_fkey" FOREIGN KEY ("textbookVersionId") REFERENCES "TextbookVersions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessedChapters" ADD CONSTRAINT "ProcessedChapters_processedTextbookId_fkey" FOREIGN KEY ("processedTextbookId") REFERENCES "ProcessedTextbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessedTopics" ADD CONSTRAINT "ProcessedTopics_processedTextbookId_fkey" FOREIGN KEY ("processedTextbookId") REFERENCES "ProcessedTextbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessedTopics" ADD CONSTRAINT "ProcessedTopics_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "ProcessedChapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessedTopics" ADD CONSTRAINT "ProcessedTopics_parentTopicId_fkey" FOREIGN KEY ("parentTopicId") REFERENCES "ProcessedTopics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessedContent" ADD CONSTRAINT "ProcessedContent_processedTextbookId_fkey" FOREIGN KEY ("processedTextbookId") REFERENCES "ProcessedTextbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessedContent" ADD CONSTRAINT "ProcessedContent_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "ProcessedChapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessedContent" ADD CONSTRAINT "ProcessedContent_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ProcessedTopics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessingHistory" ADD CONSTRAINT "ProcessingHistory_processedTextbookId_fkey" FOREIGN KEY ("processedTextbookId") REFERENCES "ProcessedTextbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessingLogs" ADD CONSTRAINT "ProcessingLogs_processedTextbookId_fkey" FOREIGN KEY ("processedTextbookId") REFERENCES "ProcessedTextbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
