ALTER TABLE "SchoolAiSourceDocument"
ADD COLUMN "extractedText" TEXT,
ADD COLUMN "processingMode" TEXT NOT NULL DEFAULT 'GOOGLE';
