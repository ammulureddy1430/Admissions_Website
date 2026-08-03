-- CreateTable
CREATE TABLE "GameGamificationProfiles" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "gamesPassed" INTEGER NOT NULL DEFAULT 0,
    "lastPlayedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameGamificationProfiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameEconomyTransactions" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "xpDelta" INTEGER NOT NULL DEFAULT 0,
    "coinDelta" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "referenceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameEconomyTransactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameBadgeDefinitions" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "badgeKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "criteria" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameBadgeDefinitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameStudentBadges" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "reason" TEXT,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameStudentBadges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameChallenges" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "challengeKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "frequency" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetValue" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "coinReward" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameChallenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameChallengeProgress" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameChallengeProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamePlatformAuditLogs" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GamePlatformAuditLogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameGamificationProfiles_schoolId_xp_idx" ON "GameGamificationProfiles"("schoolId", "xp");

-- CreateIndex
CREATE UNIQUE INDEX "GameGamificationProfiles_schoolId_studentId_key" ON "GameGamificationProfiles"("schoolId", "studentId");

-- CreateIndex
CREATE INDEX "GameEconomyTransactions_profileId_createdAt_idx" ON "GameEconomyTransactions"("profileId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GameBadgeDefinitions_schoolId_badgeKey_key" ON "GameBadgeDefinitions"("schoolId", "badgeKey");

-- CreateIndex
CREATE UNIQUE INDEX "GameStudentBadges_profileId_badgeId_key" ON "GameStudentBadges"("profileId", "badgeId");

-- CreateIndex
CREATE INDEX "GameChallenges_schoolId_status_startsAt_endsAt_idx" ON "GameChallenges"("schoolId", "status", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "GameChallenges_schoolId_challengeKey_key" ON "GameChallenges"("schoolId", "challengeKey");

-- CreateIndex
CREATE UNIQUE INDEX "GameChallengeProgress_challengeId_profileId_key" ON "GameChallengeProgress"("challengeId", "profileId");

-- CreateIndex
CREATE INDEX "GamePlatformAuditLogs_schoolId_entityType_entityId_createdA_idx" ON "GamePlatformAuditLogs"("schoolId", "entityType", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "GameGamificationProfiles" ADD CONSTRAINT "GameGamificationProfiles_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameEconomyTransactions" ADD CONSTRAINT "GameEconomyTransactions_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "GameGamificationProfiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameBadgeDefinitions" ADD CONSTRAINT "GameBadgeDefinitions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameStudentBadges" ADD CONSTRAINT "GameStudentBadges_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "GameGamificationProfiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameStudentBadges" ADD CONSTRAINT "GameStudentBadges_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "GameBadgeDefinitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameChallenges" ADD CONSTRAINT "GameChallenges_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameChallengeProgress" ADD CONSTRAINT "GameChallengeProgress_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "GameChallenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameChallengeProgress" ADD CONSTRAINT "GameChallengeProgress_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "GameGamificationProfiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlatformAuditLogs" ADD CONSTRAINT "GamePlatformAuditLogs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
