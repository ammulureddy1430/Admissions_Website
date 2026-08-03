-- CreateTable
CREATE TABLE "GameAIQuestions" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "gameAssessmentId" TEXT,
    "processedTextbookId" TEXT NOT NULL,
    "textbookVersionId" TEXT NOT NULL,
    "chapterId" TEXT,
    "topicId" TEXT,
    "subtopicId" TEXT,
    "pageNumber" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT,
    "difficulty" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "bloomLevel" TEXT NOT NULL,
    "learningOutcome" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "generationBatchId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameAIQuestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameAIQuestionOptions" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionKey" TEXT NOT NULL,
    "optionText" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameAIQuestionOptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameAIQuestionHistory" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameAIQuestionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameAIQuestionVersions" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameAIQuestionVersions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameAIQuestions_schoolId_status_questionType_difficulty_idx" ON "GameAIQuestions"("schoolId", "status", "questionType", "difficulty");

-- CreateIndex
CREATE INDEX "GameAIQuestions_processedTextbookId_chapterId_topicId_pageN_idx" ON "GameAIQuestions"("processedTextbookId", "chapterId", "topicId", "pageNumber");

-- CreateIndex
CREATE INDEX "GameAIQuestions_gameAssessmentId_generationBatchId_idx" ON "GameAIQuestions"("gameAssessmentId", "generationBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "GameAIQuestionOptions_questionId_sequence_key" ON "GameAIQuestionOptions"("questionId", "sequence");

-- CreateIndex
CREATE INDEX "GameAIQuestionHistory_questionId_createdAt_idx" ON "GameAIQuestionHistory"("questionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GameAIQuestionVersions_questionId_version_key" ON "GameAIQuestionVersions"("questionId", "version");

-- AddForeignKey
ALTER TABLE "GameAIQuestions" ADD CONSTRAINT "GameAIQuestions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAIQuestions" ADD CONSTRAINT "GameAIQuestions_gameAssessmentId_fkey" FOREIGN KEY ("gameAssessmentId") REFERENCES "GameAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAIQuestions" ADD CONSTRAINT "GameAIQuestions_processedTextbookId_fkey" FOREIGN KEY ("processedTextbookId") REFERENCES "ProcessedTextbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAIQuestionOptions" ADD CONSTRAINT "GameAIQuestionOptions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "GameAIQuestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAIQuestionHistory" ADD CONSTRAINT "GameAIQuestionHistory_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "GameAIQuestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAIQuestionVersions" ADD CONSTRAINT "GameAIQuestionVersions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "GameAIQuestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
