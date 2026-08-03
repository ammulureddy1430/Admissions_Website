CREATE TABLE "HigherEducationApplication" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "programme" TEXT NOT NULL,
    "studyLevel" TEXT NOT NULL,
    "intake" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "decision" TEXT,
    "reviewedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HigherEducationApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HigherEducationApplication_applicantId_idx" ON "HigherEducationApplication"("applicantId");
CREATE INDEX "HigherEducationApplication_collegeId_status_idx" ON "HigherEducationApplication"("collegeId", "status");
ALTER TABLE "HigherEducationApplication" ADD CONSTRAINT "HigherEducationApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HigherEducationApplication" ADD CONSTRAINT "HigherEducationApplication_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HigherEducationApplication" ADD CONSTRAINT "HigherEducationApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
