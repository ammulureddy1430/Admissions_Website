ALTER TABLE "SchoolSettings"
ADD COLUMN "assessmentAiEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "assessmentAiMode" TEXT NOT NULL DEFAULT 'BOTH',
ADD COLUMN "assessmentAiLogChats" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "AssessmentAssistantChatLog" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "submissionId" TEXT,
  "subject" TEXT NOT NULL,
  "grade" TEXT NOT NULL,
  "questionNumber" INTEGER NOT NULL,
  "studentMessage" TEXT NOT NULL,
  "assistantReply" TEXT NOT NULL,
  "blocked" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentAssistantChatLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AssessmentAssistantChatLog_schoolId_assessmentId_createdAt_idx"
ON "AssessmentAssistantChatLog"("schoolId", "assessmentId", "createdAt");
