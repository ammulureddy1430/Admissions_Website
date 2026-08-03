-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "admissionLetterUrl" TEXT,
ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "bloodGroup" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "fatherName" TEXT,
ADD COLUMN     "fatherOccupation" TEXT,
ADD COLUMN     "fatherPhone" TEXT,
ADD COLUMN     "medicalConditions" TEXT,
ADD COLUMN     "motherName" TEXT,
ADD COLUMN     "motherOccupation" TEXT,
ADD COLUMN     "motherPhone" TEXT,
ADD COLUMN     "motherTongue" TEXT,
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "previousSchoolGrade" TEXT,
ADD COLUMN     "previousSchoolMarks" TEXT,
ADD COLUMN     "previousSchoolName" TEXT,
ADD COLUMN     "primaryAddress" TEXT,
ADD COLUMN     "religion" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "zipCode" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "referredBy" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'WEBSITE';
