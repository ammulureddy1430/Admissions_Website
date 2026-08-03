ALTER TABLE "Assessment"
  ADD COLUMN "attemptNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "assessmentVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "previousAssessmentId" TEXT,
  ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "AssessmentSubmission"
  ADD COLUMN "attemptNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "assessmentVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "previousSubmissionId" TEXT;

CREATE TABLE "AssessmentReassignmentRequest" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "previousAttemptId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "parentId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "generatedAssessmentId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requestReason" TEXT,
  "rejectionReason" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssessmentReassignmentRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssessmentReassignmentAuditLog" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "performedById" TEXT NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentReassignmentAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssessmentReassignmentRequest_generatedAssessmentId_key"
  ON "AssessmentReassignmentRequest"("generatedAssessmentId");
CREATE INDEX "AssessmentReassignmentRequest_schoolId_status_createdAt_idx"
  ON "AssessmentReassignmentRequest"("schoolId", "status", "createdAt");
CREATE INDEX "AssessmentReassignmentRequest_parentId_status_idx"
  ON "AssessmentReassignmentRequest"("parentId", "status");
CREATE INDEX "AssessmentReassignmentRequest_applicationId_createdAt_idx"
  ON "AssessmentReassignmentRequest"("applicationId", "createdAt");
CREATE INDEX "AssessmentReassignmentAuditLog_requestId_createdAt_idx"
  ON "AssessmentReassignmentAuditLog"("requestId", "createdAt");

ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_previousAssessmentId_fkey"
  FOREIGN KEY ("previousAssessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssessmentSubmission" ADD CONSTRAINT "AssessmentSubmission_previousSubmissionId_fkey"
  FOREIGN KEY ("previousSubmissionId") REFERENCES "AssessmentSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssessmentReassignmentRequest" ADD CONSTRAINT "AssessmentReassignmentRequest_assessmentId_fkey"
  FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentReassignmentRequest" ADD CONSTRAINT "AssessmentReassignmentRequest_previousAttemptId_fkey"
  FOREIGN KEY ("previousAttemptId") REFERENCES "AssessmentSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentReassignmentRequest" ADD CONSTRAINT "AssessmentReassignmentRequest_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentReassignmentRequest" ADD CONSTRAINT "AssessmentReassignmentRequest_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentReassignmentRequest" ADD CONSTRAINT "AssessmentReassignmentRequest_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentReassignmentRequest" ADD CONSTRAINT "AssessmentReassignmentRequest_generatedAssessmentId_fkey"
  FOREIGN KEY ("generatedAssessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssessmentReassignmentRequest" ADD CONSTRAINT "AssessmentReassignmentRequest_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssessmentReassignmentAuditLog" ADD CONSTRAINT "AssessmentReassignmentAuditLog_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "AssessmentReassignmentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentReassignmentAuditLog" ADD CONSTRAINT "AssessmentReassignmentAuditLog_performedById_fkey"
  FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
