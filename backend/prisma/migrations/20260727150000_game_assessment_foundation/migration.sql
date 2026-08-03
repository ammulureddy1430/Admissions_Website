-- CreateTable
CREATE TABLE "GameAssessment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "assessmentType" TEXT NOT NULL,
    "assessmentMode" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "section" TEXT,
    "chapter" TEXT,
    "topics" TEXT[],
    "teacherName" TEXT,
    "academicYear" TEXT,
    "difficulty" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "learningOutcome" TEXT,
    "numberOfQuestions" INTEGER NOT NULL,
    "numberOfGames" INTEGER NOT NULL,
    "timeLimit" INTEGER NOT NULL,
    "passingMarks" INTEGER NOT NULL,
    "attemptLimit" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "settings" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameTemplate" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "config" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PLACEHOLDER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameQuestion" (
    "id" TEXT NOT NULL,
    "gameAssessmentId" TEXT NOT NULL,
    "sourceDocumentId" TEXT,
    "type" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" JSONB,
    "correctAnswer" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "learningOutcome" TEXT,
    "hint" TEXT,
    "explanation" TEXT,
    "scoringRules" JSONB,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameAssignment" (
    "id" TEXT NOT NULL,
    "gameAssessmentId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetIds" TEXT[],
    "scheduledAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameResult" (
    "id" TEXT NOT NULL,
    "gameAssignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "passed" BOOLEAN,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameAttempt" (
    "id" TEXT NOT NULL,
    "gameResultId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "state" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "GameAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameScore" (
    "id" TEXT NOT NULL,
    "gameAttemptId" TEXT NOT NULL,
    "gameKey" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "timeTaken" INTEGER,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameReward" (
    "id" TEXT NOT NULL,
    "gameResultId" TEXT NOT NULL,
    "rewardType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metadata" JSONB,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameLeaderboard" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "gameAssessmentId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "rankings" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameLeaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameAnalytics" (
    "id" TEXT NOT NULL,
    "gameAssessmentId" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "dimensions" JSONB,
    "metrics" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameAchievement" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameCertificate" (
    "id" TEXT NOT NULL,
    "gameResultId" TEXT NOT NULL,
    "certificateNo" TEXT NOT NULL,
    "fileUrl" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameNotification" (
    "id" TEXT NOT NULL,
    "gameAssignmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameAssessment_schoolId_status_idx" ON "GameAssessment"("schoolId", "status");

-- CreateIndex
CREATE INDEX "GameAssessment_schoolId_grade_subject_idx" ON "GameAssessment"("schoolId", "grade", "subject");

-- CreateIndex
CREATE INDEX "GameTemplate_schoolId_category_idx" ON "GameTemplate"("schoolId", "category");

-- CreateIndex
CREATE INDEX "GameQuestion_gameAssessmentId_approvalStatus_idx" ON "GameQuestion"("gameAssessmentId", "approvalStatus");

-- CreateIndex
CREATE INDEX "GameAssignment_gameAssessmentId_status_idx" ON "GameAssignment"("gameAssessmentId", "status");

-- CreateIndex
CREATE INDEX "GameResult_studentId_status_idx" ON "GameResult"("studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GameResult_gameAssignmentId_studentId_key" ON "GameResult"("gameAssignmentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "GameAttempt_gameResultId_attemptNumber_key" ON "GameAttempt"("gameResultId", "attemptNumber");

-- CreateIndex
CREATE INDEX "GameLeaderboard_schoolId_gameAssessmentId_idx" ON "GameLeaderboard"("schoolId", "gameAssessmentId");

-- CreateIndex
CREATE INDEX "GameAnalytics_gameAssessmentId_metricType_idx" ON "GameAnalytics"("gameAssessmentId", "metricType");

-- CreateIndex
CREATE UNIQUE INDEX "GameAchievement_schoolId_studentId_key_key" ON "GameAchievement"("schoolId", "studentId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "GameCertificate_gameResultId_key" ON "GameCertificate"("gameResultId");

-- CreateIndex
CREATE UNIQUE INDEX "GameCertificate_certificateNo_key" ON "GameCertificate"("certificateNo");

-- CreateIndex
CREATE INDEX "GameNotification_userId_readAt_idx" ON "GameNotification"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "GameAssessment" ADD CONSTRAINT "GameAssessment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameTemplate" ADD CONSTRAINT "GameTemplate_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameQuestion" ADD CONSTRAINT "GameQuestion_gameAssessmentId_fkey" FOREIGN KEY ("gameAssessmentId") REFERENCES "GameAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAssignment" ADD CONSTRAINT "GameAssignment_gameAssessmentId_fkey" FOREIGN KEY ("gameAssessmentId") REFERENCES "GameAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameResult" ADD CONSTRAINT "GameResult_gameAssignmentId_fkey" FOREIGN KEY ("gameAssignmentId") REFERENCES "GameAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAttempt" ADD CONSTRAINT "GameAttempt_gameResultId_fkey" FOREIGN KEY ("gameResultId") REFERENCES "GameResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameScore" ADD CONSTRAINT "GameScore_gameAttemptId_fkey" FOREIGN KEY ("gameAttemptId") REFERENCES "GameAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameReward" ADD CONSTRAINT "GameReward_gameResultId_fkey" FOREIGN KEY ("gameResultId") REFERENCES "GameResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameLeaderboard" ADD CONSTRAINT "GameLeaderboard_gameAssessmentId_fkey" FOREIGN KEY ("gameAssessmentId") REFERENCES "GameAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAnalytics" ADD CONSTRAINT "GameAnalytics_gameAssessmentId_fkey" FOREIGN KEY ("gameAssessmentId") REFERENCES "GameAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameCertificate" ADD CONSTRAINT "GameCertificate_gameResultId_fkey" FOREIGN KEY ("gameResultId") REFERENCES "GameResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameNotification" ADD CONSTRAINT "GameNotification_gameAssignmentId_fkey" FOREIGN KEY ("gameAssignmentId") REFERENCES "GameAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
