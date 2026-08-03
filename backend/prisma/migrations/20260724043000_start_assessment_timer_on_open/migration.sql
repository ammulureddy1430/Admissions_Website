-- An assessment timer starts when the student opens the attempt, not when the
-- school assigns it. Prisma writes the explicit start timestamp consistently.
ALTER TABLE "AssessmentSubmission"
ALTER COLUMN "startedAt" DROP NOT NULL,
ALTER COLUMN "startedAt" DROP DEFAULT;

