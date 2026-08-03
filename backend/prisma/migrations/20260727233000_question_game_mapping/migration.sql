-- CreateTable
CREATE TABLE "QuestionGameMappings" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "recommendedTemplateId" TEXT,
    "selectedTemplateId" TEXT NOT NULL,
    "recommendationReason" TEXT,
    "recommendationKey" TEXT NOT NULL,
    "acceptedRecommendation" BOOLEAN NOT NULL DEFAULT true,
    "overriddenById" TEXT,
    "mappedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionGameMappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameConfigurations" (
    "id" TEXT NOT NULL,
    "mappingId" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "timerSeconds" INTEGER NOT NULL,
    "lives" INTEGER NOT NULL,
    "scoringRules" JSONB NOT NULL,
    "hintRules" JSONB NOT NULL,
    "animationConfiguration" JSONB NOT NULL,
    "soundConfiguration" JSONB NOT NULL,
    "accessibilitySettings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameConfigurations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionGameMappings_questionId_key" ON "QuestionGameMappings"("questionId");

-- CreateIndex
CREATE INDEX "QuestionGameMappings_schoolId_selectedTemplateId_createdAt_idx" ON "QuestionGameMappings"("schoolId", "selectedTemplateId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GameConfigurations_mappingId_key" ON "GameConfigurations"("mappingId");

-- AddForeignKey
ALTER TABLE "QuestionGameMappings" ADD CONSTRAINT "QuestionGameMappings_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionGameMappings" ADD CONSTRAINT "QuestionGameMappings_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "GameAIQuestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionGameMappings" ADD CONSTRAINT "QuestionGameMappings_recommendedTemplateId_fkey" FOREIGN KEY ("recommendedTemplateId") REFERENCES "GameTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionGameMappings" ADD CONSTRAINT "QuestionGameMappings_selectedTemplateId_fkey" FOREIGN KEY ("selectedTemplateId") REFERENCES "GameTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameConfigurations" ADD CONSTRAINT "GameConfigurations_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "QuestionGameMappings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
