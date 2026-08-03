import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class GameInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async processResult(resultId: string, schoolId: string) {
    const alreadyProcessed = await this.prisma.gamePlatformAuditLog.findFirst({ where: { schoolId, entityType: 'GameResult', entityId: resultId, operation: 'RESULT_PROCESSED' } });
    if (alreadyProcessed) return { profile: null, xpEarned: 0, coinsEarned: 0, idempotent: true };
    const result = await this.prisma.gameResult.findFirst({
      where: { id: resultId, gameAssignment: { gameAssessment: { schoolId } } },
      include: { gameAssignment: { include: { generatedGame: true, gameAssessment: true } }, runtimeSessions: { orderBy: { completedAt: 'desc' }, take: 1 } },
    });
    if (!result || !result.completedAt) return null;
    const runtime = result.runtimeSessions[0]?.runtimeState as any;
    const correct = Number(runtime?.correct || 0), xpEarned = 20 + correct * 10 + (result.passed ? 25 : 0), coinsEarned = 5 + correct * 2;
    const profile = await this.prisma.gameGamificationProfile.upsert({
      where: { schoolId_studentId: { schoolId, studentId: result.studentId } },
      create: { schoolId, studentId: result.studentId },
      update: {},
    });
    const nextXp = profile.xp + xpEarned;
    const today = new Date(), last = profile.lastPlayedAt;
    const dayDiff = last ? Math.floor((Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate())) / 86_400_000) : null;
    const streak = dayDiff === 1 ? profile.currentStreak + 1 : dayDiff === 0 ? profile.currentStreak : 1;
    const updated = await this.prisma.gameGamificationProfile.update({ where: { id: profile.id }, data: {
      xp: nextXp, coins: { increment: coinsEarned }, level: Math.floor(nextXp / 100) + 1,
      gamesPlayed: { increment: 1 }, gamesPassed: result.passed ? { increment: 1 } : undefined,
      currentStreak: streak, longestStreak: Math.max(profile.longestStreak, streak), lastPlayedAt: today,
    } });
    await this.prisma.gameEconomyTransaction.create({ data: { profileId: profile.id, type: 'GAME_COMPLETION', xpDelta: xpEarned, coinDelta: coinsEarned, reason: result.passed ? 'Game completed and passed' : 'Game completed', referenceId: result.id } });
    await this.seedBadges(schoolId);
    await this.awardBadges(updated, result);
    await this.updateChallenges(updated, schoolId);
    if (result.passed) await this.prisma.gameCertificate.upsert({
      where: { gameResultId: result.id }, create: { gameResultId: result.id, certificateNo: `GAME-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}` }, update: {},
    });
    await this.prisma.gamePlatformAuditLog.create({ data: { schoolId, actorId: result.studentId, operation: 'RESULT_PROCESSED', entityType: 'GameResult', entityId: result.id, details: { xpEarned, coinsEarned, correct, percentage: result.percentage } } });
    return { profile: updated, xpEarned, coinsEarned };
  }

  async dashboard(schoolId: string, q: any) {
    const where: Prisma.GameResultWhereInput = { gameAssignment: { gameAssessment: { schoolId }, ...(q.gameAssessmentId && { gameAssessmentId: q.gameAssessmentId }) } };
    const results = await this.prisma.gameResult.findMany({ where, include: { gameAssignment: { include: { gameAssessment: true, generatedGame: true } }, attempts: { include: { scores: true } } } });
    const completed = results.filter((r) => r.status === 'COMPLETED');
    const average = completed.length ? completed.reduce((sum, r) => sum + r.percentage, 0) / completed.length : 0;
    const byGame = Object.values(completed.reduce((acc: Record<string, any>, row) => {
      const key = row.gameAssignment.generatedGame?.title || row.gameAssignment.gameAssessment.name;
      const item = acc[key] ||= { game: key, attempts: 0, totalPercentage: 0, totalTime: 0, passed: 0 };
      item.attempts++; item.totalPercentage += row.percentage; item.passed += row.passed ? 1 : 0;
      item.totalTime += row.attempts.flatMap((a) => a.scores).reduce((sum, score) => sum + (score.timeTaken || 0), 0);
      return acc;
    }, {})).map((item: any) => ({ ...item, averagePercentage: item.totalPercentage / item.attempts, passRate: (item.passed / item.attempts) * 100 }));
    return {
      summary: { assigned: results.length, completed: completed.length, completionRate: results.length ? completed.length / results.length * 100 : 0, averagePercentage: average, passed: completed.filter((r) => r.passed).length },
      byGame, weakAreas: byGame.filter((g: any) => g.averagePercentage < 60), strongAreas: byGame.filter((g: any) => g.averagePercentage >= 80),
    };
  }
  async questionAnalytics(schoolId: string) {
    const sessions = await this.prisma.gameRuntimeSession.findMany({ where: { schoolId, mode: 'ASSIGNMENT', status: 'COMPLETED' } });
    const metrics: Record<string, any> = {};
    for (const session of sessions) for (const answer of ((session.runtimeState as any)?.answers || [])) {
      const row = metrics[answer.questionId] ||= { questionId: answer.questionId, attempts: 0, correct: 0, totalTime: 0 };
      row.attempts++; row.correct += answer.correct ? 1 : 0; row.totalTime += answer.timeTaken || 0;
    }
    const ids = Object.keys(metrics), questions = await this.prisma.gameAIQuestion.findMany({ where: { id: { in: ids }, schoolId }, include: { processedTextbook: true } });
    return questions.map((q) => ({ ...metrics[q.id], questionText: q.questionText, topicId: q.topicId, chapterId: q.chapterId, learningOutcome: q.learningOutcome, accuracy: metrics[q.id].attempts ? metrics[q.id].correct / metrics[q.id].attempts * 100 : 0, averageTime: metrics[q.id].totalTime / metrics[q.id].attempts }));
  }
  async studentAnalytics(schoolId: string, studentId: string) {
    const results = await this.prisma.gameResult.findMany({ where: { studentId, gameAssignment: { gameAssessment: { schoolId } } }, include: { gameAssignment: { include: { generatedGame: true } }, attempts: { include: { scores: true } } }, orderBy: { updatedAt: 'desc' } });
    const profile = await this.profile(schoolId, studentId);
    return { results, profile, averagePercentage: results.length ? results.reduce((sum, r) => sum + r.percentage, 0) / results.length : 0 };
  }
  async profile(schoolId: string, studentId: string) {
    return this.prisma.gameGamificationProfile.upsert({
      where: { schoolId_studentId: { schoolId, studentId } }, create: { schoolId, studentId }, update: {},
      include: { badges: { include: { badge: true } }, transactions: { orderBy: { createdAt: 'desc' }, take: 50 }, challengeProgress: { include: { challenge: true } } },
    });
  }
  leaderboard(schoolId: string, limit: number) {
    return this.prisma.gameGamificationProfile.findMany({ where: { schoolId }, orderBy: [{ xp: 'desc' }, { gamesPassed: 'desc' }], take: Math.min(limit, 100), select: { studentId: true, xp: true, coins: true, level: true, gamesPlayed: true, gamesPassed: true, currentStreak: true } });
  }
  async challenges(schoolId: string, studentId?: string) {
    await this.seedChallenges(schoolId);
    return this.prisma.gameChallenge.findMany({ where: { schoolId, status: 'ACTIVE', endsAt: { gte: new Date() } }, include: studentId ? { progress: { where: { profile: { studentId } } } } : undefined, orderBy: { endsAt: 'asc' } });
  }

  private async seedBadges(schoolId: string) {
    await this.prisma.gameBadgeDefinition.createMany({ data: [
      { schoolId, badgeKey: 'FIRST_GAME', name: 'First Quest', description: 'Complete the first game.', criteria: { gamesPlayed: 1 } },
      { schoolId, badgeKey: 'PERFECT_SCORE', name: 'Perfect Scholar', description: 'Score 100% in a game.', criteria: { percentage: 100 } },
      { schoolId, badgeKey: 'FIVE_GAMES', name: 'Game Explorer', description: 'Complete five games.', criteria: { gamesPlayed: 5 } },
    ], skipDuplicates: true });
  }
  private async awardBadges(profile: any, result: any) {
    const definitions = await this.prisma.gameBadgeDefinition.findMany({ where: { schoolId: profile.schoolId, status: 'ACTIVE' } });
    for (const badge of definitions) {
      const eligible = badge.badgeKey === 'FIRST_GAME' ? profile.gamesPlayed >= 1 : badge.badgeKey === 'PERFECT_SCORE' ? result.percentage >= 100 : badge.badgeKey === 'FIVE_GAMES' ? profile.gamesPlayed >= 5 : false;
      if (eligible) await this.prisma.gameStudentBadge.upsert({ where: { profileId_badgeId: { profileId: profile.id, badgeId: badge.id } }, create: { profileId: profile.id, badgeId: badge.id, reason: badge.description }, update: {} });
    }
  }
  private async seedChallenges(schoolId: string) {
    const now = new Date(), dayEnd = new Date(now); dayEnd.setHours(23,59,59,999);
    const weekEnd = new Date(dayEnd); weekEnd.setDate(weekEnd.getDate() + 7);
    const dayKey = now.toISOString().slice(0,10);
    await this.prisma.gameChallenge.createMany({ data: [
      { schoolId, challengeKey: `DAILY-${dayKey}`, name: 'Daily Learning Quest', frequency: 'DAILY', targetType: 'GAMES_COMPLETED', targetValue: 1, xpReward: 20, coinReward: 5, startsAt: new Date(now.setHours(0,0,0,0)), endsAt: dayEnd },
      { schoolId, challengeKey: `WEEKLY-${dayKey}`, name: 'Weekly Game Explorer', frequency: 'WEEKLY', targetType: 'GAMES_COMPLETED', targetValue: 5, xpReward: 100, coinReward: 25, startsAt: new Date(), endsAt: weekEnd },
    ], skipDuplicates: true });
  }
  private async updateChallenges(profile: any, schoolId: string) {
    await this.seedChallenges(schoolId);
    const challenges = await this.prisma.gameChallenge.findMany({ where: { schoolId, status: 'ACTIVE', startsAt: { lte: new Date() }, endsAt: { gte: new Date() } } });
    for (const challenge of challenges) {
      const existing = await this.prisma.gameChallengeProgress.upsert({ where: { challengeId_profileId: { challengeId: challenge.id, profileId: profile.id } }, create: { challengeId: challenge.id, profileId: profile.id }, update: {} });
      const progress = existing.progress + 1, completed = progress >= challenge.targetValue;
      await this.prisma.gameChallengeProgress.update({ where: { id: existing.id }, data: { progress, completed, completedAt: completed ? existing.completedAt || new Date() : null } });
      if (completed && !existing.completed) {
        await this.prisma.gameGamificationProfile.update({ where: { id: profile.id }, data: { xp: { increment: challenge.xpReward }, coins: { increment: challenge.coinReward } } });
        await this.prisma.gameEconomyTransaction.create({ data: { profileId: profile.id, type: 'CHALLENGE_REWARD', xpDelta: challenge.xpReward, coinDelta: challenge.coinReward, reason: challenge.name, referenceId: challenge.id } });
      }
    }
  }
}
