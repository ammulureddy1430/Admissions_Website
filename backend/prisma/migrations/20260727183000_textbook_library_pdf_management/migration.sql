-- AlterTable
ALTER TABLE "AcademicYear" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "textbookId" TEXT,
ADD COLUMN     "textbookVersionId" TEXT;

-- AlterTable
ALTER TABLE "GameAssessment" ADD COLUMN     "textbookId" TEXT,
ADD COLUMN     "textbookVersionId" TEXT;

-- CreateTable
CREATE TABLE "Publishers" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publishers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Authors" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Languages" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Textbooks" (
    "id" TEXT NOT NULL,
    "textbookId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "languageId" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "edition" TEXT NOT NULL,
    "isbn" TEXT,
    "coverImage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "activeVersionId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Textbooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TextbookVersions" (
    "id" TEXT NOT NULL,
    "textbookId" TEXT NOT NULL,
    "versionNumber" TEXT NOT NULL,
    "numberOfPages" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "changeNote" TEXT,
    "restoredFromId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TextbookVersions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TextbookFiles" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "pageCount" INTEGER,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TextbookFiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TextbookAuditLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "textbookId" TEXT,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TextbookAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Publishers_schoolId_status_idx" ON "Publishers"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Publishers_schoolId_name_key" ON "Publishers"("schoolId", "name");

-- CreateIndex
CREATE INDEX "Authors_schoolId_status_idx" ON "Authors"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Authors_schoolId_name_key" ON "Authors"("schoolId", "name");

-- CreateIndex
CREATE INDEX "Languages_schoolId_status_idx" ON "Languages"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Languages_schoolId_code_key" ON "Languages"("schoolId", "code");

-- CreateIndex
CREATE INDEX "Textbooks_schoolId_boardId_academicYearId_gradeId_subjectId_idx" ON "Textbooks"("schoolId", "boardId", "academicYearId", "gradeId", "subjectId");

-- CreateIndex
CREATE INDEX "Textbooks_schoolId_languageId_publisherId_authorId_status_idx" ON "Textbooks"("schoolId", "languageId", "publisherId", "authorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Textbooks_schoolId_textbookId_key" ON "Textbooks"("schoolId", "textbookId");

-- CreateIndex
CREATE INDEX "TextbookVersions_textbookId_isActive_createdAt_idx" ON "TextbookVersions"("textbookId", "isActive", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TextbookVersions_textbookId_versionNumber_key" ON "TextbookVersions"("textbookId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TextbookFiles_versionId_key" ON "TextbookFiles"("versionId");

-- CreateIndex
CREATE UNIQUE INDEX "TextbookFiles_objectKey_key" ON "TextbookFiles"("objectKey");

-- CreateIndex
CREATE INDEX "TextbookFiles_checksum_idx" ON "TextbookFiles"("checksum");

-- CreateIndex
CREATE INDEX "TextbookAuditLog_schoolId_textbookId_createdAt_idx" ON "TextbookAuditLog"("schoolId", "textbookId", "createdAt");

-- AddForeignKey
ALTER TABLE "Publishers" ADD CONSTRAINT "Publishers_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Authors" ADD CONSTRAINT "Authors_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Languages" ADD CONSTRAINT "Languages_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Textbooks" ADD CONSTRAINT "Textbooks_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Textbooks" ADD CONSTRAINT "Textbooks_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Textbooks" ADD CONSTRAINT "Textbooks_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publishers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Textbooks" ADD CONSTRAINT "Textbooks_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Authors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TextbookVersions" ADD CONSTRAINT "TextbookVersions_textbookId_fkey" FOREIGN KEY ("textbookId") REFERENCES "Textbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TextbookFiles" ADD CONSTRAINT "TextbookFiles_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "TextbookVersions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TextbookAuditLog" ADD CONSTRAINT "TextbookAuditLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
