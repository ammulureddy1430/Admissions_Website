-- CreateTable
CREATE TABLE "GameQuestionApprovals" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reviewedById" TEXT NOT NULL,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameQuestionApprovals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameQuestionApprovalHistory" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "note" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameQuestionApprovalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameQuestionDrafts" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "draftNumber" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "savedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameQuestionDrafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameQuestionApprovals_questionId_reviewedAt_idx" ON "GameQuestionApprovals"("questionId", "reviewedAt");

-- CreateIndex
CREATE INDEX "GameQuestionApprovalHistory_questionId_createdAt_idx" ON "GameQuestionApprovalHistory"("questionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GameQuestionDrafts_questionId_draftNumber_key" ON "GameQuestionDrafts"("questionId", "draftNumber");

-- AddForeignKey
ALTER TABLE "GameQuestionApprovals" ADD CONSTRAINT "GameQuestionApprovals_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "GameAIQuestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameQuestionApprovalHistory" ADD CONSTRAINT "GameQuestionApprovalHistory_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "GameAIQuestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameQuestionDrafts" ADD CONSTRAINT "GameQuestionDrafts_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "GameAIQuestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
