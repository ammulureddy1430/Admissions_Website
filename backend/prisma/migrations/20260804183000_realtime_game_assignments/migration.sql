CREATE TABLE "RealTimeGameAssignments" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "studentIds" TEXT[],
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RealTimeGameAssignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RealTimeGameAssignments_schoolId_gameId_grade_status_idx" ON "RealTimeGameAssignments"("schoolId", "gameId", "grade", "status");
ALTER TABLE "RealTimeGameAssignments" ADD CONSTRAINT "RealTimeGameAssignments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RealTimeGameAssignments" ADD CONSTRAINT "RealTimeGameAssignments_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
