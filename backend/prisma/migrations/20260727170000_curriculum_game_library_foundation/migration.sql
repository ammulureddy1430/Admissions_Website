-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'PRINCIPAL';
ALTER TYPE "Role" ADD VALUE 'TEACHER';

-- DropIndex
DROP INDEX "GameTemplate_schoolId_category_idx";

-- AlterTable
ALTER TABLE "AcademicYear" ADD COLUMN     "boardId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "GameAssessment" ADD COLUMN     "academicYearId" TEXT,
ADD COLUMN     "boardId" TEXT,
ADD COLUMN     "chapterId" TEXT,
ADD COLUMN     "gradeId" TEXT,
ADD COLUMN     "learningOutcomeId" TEXT,
ADD COLUMN     "subjectId" TEXT,
ADD COLUMN     "topicId" TEXT;

-- AlterTable
ALTER TABLE "GameTemplate" DROP COLUMN "category",
ADD COLUMN     "categoryId" TEXT NOT NULL,
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "estimatedDuration" INTEGER NOT NULL,
ADD COLUMN     "maximumQuestions" INTEGER NOT NULL,
ADD COLUMN     "minimumQuestions" INTEGER NOT NULL,
ADD COLUMN     "previewImage" TEXT,
ADD COLUMN     "supportedDevices" TEXT[],
ADD COLUMN     "templateId" TEXT NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "Boards" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grades" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subjects" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chapters" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "description" TEXT,
    "estimatedTeachingHours" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "learningObjectives" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topics" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
    "estimatedDuration" INTEGER,
    "learningObjectives" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningOutcomes" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "outcomeCode" TEXT NOT NULL,
    "bloomLevel" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningOutcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameCategories" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameCategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameTemplateMappings" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "gradeId" TEXT,
    "subjectId" TEXT,
    "chapterId" TEXT,
    "topicId" TEXT,
    "learningOutcomeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameTemplateMappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameTemplateVersions" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changeNote" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameTemplateVersions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameAssessmentTemplate" (
    "id" TEXT NOT NULL,
    "gameAssessmentId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameAssessmentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumAuditLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CurriculumAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Boards_schoolId_status_idx" ON "Boards"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Boards_schoolId_code_key" ON "Boards"("schoolId", "code");

-- CreateIndex
CREATE INDEX "Grades_schoolId_boardId_academicYearId_status_idx" ON "Grades"("schoolId", "boardId", "academicYearId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Grades_schoolId_boardId_academicYearId_name_key" ON "Grades"("schoolId", "boardId", "academicYearId", "name");

-- CreateIndex
CREATE INDEX "Subjects_schoolId_gradeId_status_idx" ON "Subjects"("schoolId", "gradeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Subjects_schoolId_gradeId_name_key" ON "Subjects"("schoolId", "gradeId", "name");

-- CreateIndex
CREATE INDEX "Chapters_schoolId_subjectId_status_idx" ON "Chapters"("schoolId", "subjectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Chapters_schoolId_subjectId_chapterNumber_key" ON "Chapters"("schoolId", "subjectId", "chapterNumber");

-- CreateIndex
CREATE INDEX "Topics_schoolId_chapterId_status_idx" ON "Topics"("schoolId", "chapterId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Topics_schoolId_chapterId_name_key" ON "Topics"("schoolId", "chapterId", "name");

-- CreateIndex
CREATE INDEX "LearningOutcomes_schoolId_topicId_status_idx" ON "LearningOutcomes"("schoolId", "topicId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LearningOutcomes_schoolId_outcomeCode_key" ON "LearningOutcomes"("schoolId", "outcomeCode");

-- CreateIndex
CREATE INDEX "GameCategories_schoolId_status_idx" ON "GameCategories"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GameCategories_schoolId_name_key" ON "GameCategories"("schoolId", "name");

-- CreateIndex
CREATE INDEX "GameTemplateMappings_templateId_idx" ON "GameTemplateMappings"("templateId");

-- CreateIndex
CREATE INDEX "GameTemplateMappings_gradeId_subjectId_chapterId_topicId_le_idx" ON "GameTemplateMappings"("gradeId", "subjectId", "chapterId", "topicId", "learningOutcomeId");

-- CreateIndex
CREATE UNIQUE INDEX "GameTemplateVersions_templateId_version_key" ON "GameTemplateVersions"("templateId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "GameAssessmentTemplate_gameAssessmentId_templateId_key" ON "GameAssessmentTemplate"("gameAssessmentId", "templateId");

-- CreateIndex
CREATE INDEX "CurriculumAuditLog_schoolId_entityType_entityId_createdAt_idx" ON "CurriculumAuditLog"("schoolId", "entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AcademicYear_schoolId_boardId_status_idx" ON "AcademicYear"("schoolId", "boardId", "status");

-- CreateIndex
CREATE INDEX "GameTemplate_schoolId_categoryId_status_idx" ON "GameTemplate"("schoolId", "categoryId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GameTemplate_schoolId_templateId_key" ON "GameTemplate"("schoolId", "templateId");

-- AddForeignKey
ALTER TABLE "GameTemplate" ADD CONSTRAINT "GameTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "GameCategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicYear" ADD CONSTRAINT "AcademicYear_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boards" ADD CONSTRAINT "Boards_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grades" ADD CONSTRAINT "Grades_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grades" ADD CONSTRAINT "Grades_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grades" ADD CONSTRAINT "Grades_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subjects" ADD CONSTRAINT "Subjects_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subjects" ADD CONSTRAINT "Subjects_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapters" ADD CONSTRAINT "Chapters_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapters" ADD CONSTRAINT "Chapters_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topics" ADD CONSTRAINT "Topics_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topics" ADD CONSTRAINT "Topics_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningOutcomes" ADD CONSTRAINT "LearningOutcomes_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningOutcomes" ADD CONSTRAINT "LearningOutcomes_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameCategories" ADD CONSTRAINT "GameCategories_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameTemplateMappings" ADD CONSTRAINT "GameTemplateMappings_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "GameTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameTemplateVersions" ADD CONSTRAINT "GameTemplateVersions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "GameTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAssessmentTemplate" ADD CONSTRAINT "GameAssessmentTemplate_gameAssessmentId_fkey" FOREIGN KEY ("gameAssessmentId") REFERENCES "GameAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAssessmentTemplate" ADD CONSTRAINT "GameAssessmentTemplate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "GameTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumAuditLog" ADD CONSTRAINT "CurriculumAuditLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
