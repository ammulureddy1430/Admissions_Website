CREATE TABLE "SchoolAiSourceLibrary" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "ragCorpusName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolAiSourceLibrary_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchoolAiSourceDocument" (
    "id" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "grade" TEXT,
    "subject" TEXT,
    "chapter" TEXT,
    "uploadedById" TEXT NOT NULL,
    "ragFileName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolAiSourceDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SchoolAiSourceLibrary_schoolId_key" ON "SchoolAiSourceLibrary"("schoolId");
CREATE UNIQUE INDEX "SchoolAiSourceLibrary_ragCorpusName_key" ON "SchoolAiSourceLibrary"("ragCorpusName");
CREATE UNIQUE INDEX "SchoolAiSourceDocument_ragFileName_key" ON "SchoolAiSourceDocument"("ragFileName");
CREATE INDEX "SchoolAiSourceDocument_libraryId_status_idx" ON "SchoolAiSourceDocument"("libraryId", "status");
CREATE INDEX "SchoolAiSourceDocument_libraryId_grade_subject_idx" ON "SchoolAiSourceDocument"("libraryId", "grade", "subject");

ALTER TABLE "SchoolAiSourceLibrary"
ADD CONSTRAINT "SchoolAiSourceLibrary_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolAiSourceDocument"
ADD CONSTRAINT "SchoolAiSourceDocument_libraryId_fkey"
FOREIGN KEY ("libraryId") REFERENCES "SchoolAiSourceLibrary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
