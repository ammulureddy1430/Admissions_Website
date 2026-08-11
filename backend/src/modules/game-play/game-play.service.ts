import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { legacyGradesForAgeGroup } from '../games/age-groups';
import { GameRuntimeService } from '../game-runtime/game-runtime.service';
import { GameInsightsService } from '../game-insights/game-insights.service';
import { CreateGameAssignmentDto } from './dto/game-play.dto';
import { tutorialFor } from './game-tutorial.catalog';
import { randomUUID } from 'crypto';

const TARGETS = ['STUDENT','SECTION','CLASS','MULTIPLE_CLASSES','ENTIRE_GRADE'];

@Injectable()
export class GamePlayService {
  constructor(private readonly prisma: PrismaService, private readonly runtime: GameRuntimeService, private readonly insights: GameInsightsService) {}

  async studentApplicationId(schoolId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true, lastName: true } });
    if (!user) throw new ForbiddenException('Student account was not found.');
    const application = await this.prisma.application.findFirst({
      where: {
        schoolId, status: { not: 'DRAFT' },
        OR: [{ studentEmail: user.email }, { studentFirstName: user.firstName, studentLastName: user.lastName }],
      },
      select: { id: true },
    });
    if (!application) throw new ForbiddenException('Student application was not found.');
    return application.id;
  }

  async assign(dto: CreateGameAssignmentDto, schoolId: string, userId: string) {
    if (!TARGETS.includes(dto.targetType)) throw new BadRequestException('Unsupported assignment target.');
    const deliveryMode = String((dto.settings as any)?.deliveryMode || 'HOME').toUpperCase();
    if (!['HOME', 'SCHOOL'].includes(deliveryMode)) throw new BadRequestException('Delivery mode must be HOME or SCHOOL.');
    const game = await this.prisma.generatedGame.findFirst({ where: { id: dto.generatedGameId, schoolId, status: 'PUBLISHED' } });
    if (!game) throw new BadRequestException('Only a published game can be assigned.');
    const assessment = await this.prisma.gameAssessment.findFirst({ where: { id: dto.gameAssessmentId, schoolId } });
    if (!assessment) throw new BadRequestException('Game assessment not found.');
    if (dto.targetType === 'STUDENT') {
      const optedOut = await this.prisma.application.findFirst({
        where: { schoolId, id: { in: dto.targetIds }, assessmentRequired: false },
        select: { studentFirstName: true, studentLastName: true },
      });
      if (optedOut) {
        throw new BadRequestException(
          `${optedOut.studentFirstName} ${optedOut.studentLastName} is marked Assessment Not Required and cannot be assigned a game-based assessment.`,
        );
      }
    }
    const existing = await this.prisma.gameAssignment.findFirst({
      where: {
        gameAssessmentId: dto.gameAssessmentId,
        generatedGameId: game.id,
        targetType: dto.targetType,
        targetIds: { equals: dto.targetIds },
        status: 'ASSIGNED',
      },
      include: { generatedGame: true, gameAssessment: true },
    });
    if (existing) {
      const updated = await this.prisma.gameAssignment.update({
        where: { id: existing.id },
        data: { assignmentSettings: { ...((existing.assignmentSettings as Record<string, unknown>) || {}), ...(dto.settings || {}), deliveryMode } as Prisma.InputJsonValue },
        include: { generatedGame: true, gameAssessment: true },
      });
      return { ...updated, alreadyAssigned: true, deliveryModeUpdated: true };
    }
    const assignment = await this.prisma.gameAssignment.create({ data: {
      gameAssessmentId: dto.gameAssessmentId, generatedGameId: game.id, assignedById: userId,
      targetType: dto.targetType, targetIds: dto.targetIds, startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null, scheduledAt: dto.startDate ? new Date(dto.startDate) : null,
      dueDate: dto.endDate ? new Date(dto.endDate) : null, maxAttempts: dto.maxAttempts,
      timeLimitMinutes: dto.timeLimitMinutes, passingScore: dto.passingScore, allowRestart: dto.allowRestart || false,
      assignmentSettings: { ...(dto.settings || {}), deliveryMode } as Prisma.InputJsonValue, status: 'ASSIGNED',
    }, include: { generatedGame: true, gameAssessment: true } });
    if (dto.targetType === 'STUDENT') {
      const masterGame = await this.prisma.game.findUnique({ where: { componentName: game.engineKey }, select: { id: true } });
      await this.prisma.gameResult.createMany({ data: dto.targetIds.map((studentId) => ({
        gameAssignmentId: assignment.id,
        studentId,
        assessmentId: assessment.id,
        gameId: masterGame?.id,
      })), skipDuplicates: true });
      if (deliveryMode === 'SCHOOL') {
        await Promise.all(dto.targetIds.map(async studentId => {
          const application = await this.prisma.application.findFirst({ where: { id: studentId, schoolId }, select: { accessCode: true } });
          if (!application) return;
          await this.prisma.application.update({
            where: { id: studentId },
            data: {
              assessmentAccessEnabled: true,
              accessCode: application.accessCode || `STU-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`,
            },
          });
        }));
      }
    }
    return { ...assignment, alreadyAssigned: false };
  }
  assignments(schoolId: string, q: any) {
    return this.prisma.gameAssignment.findMany({ where: { gameAssessment: { schoolId }, ...(q.status && { status: q.status }) }, include: { generatedGame: true, gameAssessment: true, _count: { select: { results: true } } }, orderBy: { createdAt: 'desc' } });
  }
  async assignmentVenue(schoolId: string, ageGroup: string) {
    if (!ageGroup) throw new BadRequestException('Age group is required to find the school venue.');
    const schedule = await this.prisma.assessmentSchedule.findFirst({
      where: {
        assessment: {
          schoolId,
          applicationId: null,
          grade: { in: legacyGradesForAgeGroup(ageGroup), mode: 'insensitive' },
          assessmentMode: { in: ['SCHOOL', 'BOTH'] },
          status: { not: 'ARCHIVED' },
        },
      },
      include: {
        assessment: { select: { title: true } },
        slots: { where: { status: 'AVAILABLE' }, orderBy: { startTime: 'asc' } },
      },
      orderBy: { assessmentDate: 'asc' },
    });
    if (!schedule) return null;
    const slot = schedule.slots[0] || null;
    return {
      sourceAssessment: schedule.assessment.title,
      assessmentDate: schedule.assessmentDate.toISOString().slice(0, 10),
      campus: schedule.campus,
      building: schedule.building,
      floor: schedule.floor,
      roomNumber: schedule.roomNumber,
      venue: schedule.venue || '',
      slotId: slot?.id || '',
      slotName: slot?.slotName || '',
      startTime: slot?.startTime || '',
      endTime: slot?.endTime || '',
    };
  }
  async parentGames(schoolId: string, parentId: string) {
    const children = await this.prisma.application.findMany({
      where: { schoolId, parentId },
      select: { id: true, studentFirstName: true, studentLastName: true, grade: true },
    });
    const childIds = children.map((child) => child.id);
    if (!childIds.length) return [];
    const assignments = await this.prisma.gameAssignment.findMany({
      where: {
        gameAssessment: { schoolId },
        targetType: 'STUDENT',
        targetIds: { hasSome: childIds },
        status: 'ASSIGNED',
      },
      include: { generatedGame: { include: { template: { include: { category: true } } } }, gameAssessment: true, results: { include: { attempts: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const seen = new Set<string>();
    const rows = assignments.flatMap((assignment) => assignment.targetIds
      .filter((studentId) => childIds.includes(studentId))
      .map((studentId) => {
        const gameIdentity = assignment.generatedGame?.templateId || assignment.generatedGame?.engineKey || assignment.generatedGame?.title || assignment.generatedGameId;
        const key = `${gameIdentity}:${studentId}`;
        if (seen.has(key)) return null;
        seen.add(key);
        const child = children.find((row) => row.id === studentId)!;
        const result = assignment.results.find((row) => row.studentId === studentId) || null;
        const { results: _results, ...safeAssignment } = assignment;
        const reviewIsFinal = result?.reviewStatus === 'REVIEWED' || result?.reviewStatus === 'NEEDS_FOLLOW_UP';
        const parentResult = result ? {
          ...result,
          totalScore: reviewIsFinal ? result.totalScore : null,
          percentage: reviewIsFinal ? result.percentage : null,
          passed: reviewIsFinal ? result.passed : null,
          reviewStatus: reviewIsFinal ? result.reviewStatus : 'PENDING',
          schoolReview: reviewIsFinal ? result.schoolReview : null,
          recommendation: reviewIsFinal ? result.recommendation : null,
        } : null;
        return { ...safeAssignment, child, result: parentResult, availability: this.availability(assignment, result) };
      })
      .filter(Boolean));
    return this.withSequentialAvailability(rows).sort((a: any, b: any) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }
  async parentStart(assignmentId: string, childId: string, schoolId: string, parentId: string, restart = false) {
    await this.parentChild(childId, schoolId, parentId);
    const assignment = await this.prisma.gameAssignment.findFirst({
      where: { id: assignmentId, gameAssessment: { schoolId }, targetType: 'STUDENT', targetIds: { has: childId } },
    });
    if (!assignment) throw new ForbiddenException('This game is not assigned to your child.');
    return this.start(assignmentId, schoolId, childId, restart);
  }
  async requestGameReassessment(assignmentId: string, childId: string, schoolId: string, parentId: string, reason?: string) {
    await this.parentChild(childId, schoolId, parentId);
    const result = await this.prisma.gameResult.findFirst({
      where: { gameAssignmentId: assignmentId, studentId: childId, gameAssignment: { gameAssessment: { schoolId } } },
      include: { gameAssignment: true },
    });
    if (!result || result.status !== 'COMPLETED') throw new BadRequestException('The game must be completed before requesting re-assessment.');
    if (!['REVIEWED', 'NEEDS_FOLLOW_UP'].includes(result.reviewStatus)) throw new BadRequestException('Please wait until the school publishes its review.');
    if (result.reassessmentRequestStatus) throw new BadRequestException('The one-time re-assessment request has already been used for this game.');
    return this.prisma.gameResult.update({
      where: { id: result.id },
      data: { reassessmentRequestStatus: 'PENDING', reassessmentRequestedAt: new Date(), reassessmentReason: reason?.trim() || null },
    });
  }

  async gameReassessmentRequests(schoolId: string, status?: string) {
    const results = await this.prisma.gameResult.findMany({
      where: {
        gameAssignment: { gameAssessment: { schoolId } },
        reassessmentRequestStatus: status && status !== 'ALL' ? status : { not: null },
      },
      include: { gameAssignment: { include: { generatedGame: { include: { template: { include: { category: true } } } }, gameAssessment: true } } },
      orderBy: { reassessmentRequestedAt: 'desc' },
    });
    const students = await this.prisma.application.findMany({
      where: { schoolId, id: { in: results.map(result => result.studentId) } },
      include: { parent: { select: { firstName: true, lastName: true } } },
    });
    return results.map(result => ({ ...result, student: students.find(student => student.id === result.studentId) || null }));
  }

  async decideGameReassessment(resultId: string, decision: 'APPROVED' | 'REJECTED', schoolId: string, userId: string) {
    if (!['APPROVED', 'REJECTED'].includes(decision)) throw new BadRequestException('Decision must be APPROVED or REJECTED.');
    const result = await this.prisma.gameResult.findFirst({
      where: { id: resultId, gameAssignment: { gameAssessment: { schoolId } } },
      include: { gameAssignment: true },
    });
    if (!result) throw new NotFoundException('Game re-assessment request not found.');
    if (result.reassessmentRequestStatus !== 'PENDING') throw new BadRequestException('This request has already been decided.');
    return this.prisma.$transaction(async tx => {
      const updated = await tx.gameResult.update({
        where: { id: result.id },
        data: { reassessmentRequestStatus: decision, reassessmentDecidedAt: new Date(), reassessmentDecidedById: userId },
      });
      return updated;
    });
  }
  async parentSubmit(assignmentId: string, sessionId: string, childId: string, schoolId: string, parentId: string) {
    await this.parentChild(childId, schoolId, parentId);
    const assignment = await this.prisma.gameAssignment.findFirst({
      where: { id: assignmentId, gameAssessment: { schoolId }, targetType: 'STUDENT', targetIds: { has: childId } },
    });
    if (!assignment) throw new ForbiddenException('This game is not assigned to your child.');
    return this.submit(assignmentId, sessionId, schoolId, childId);
  }
  async parentTutorial(assignmentId: string, childId: string, schoolId: string, parentId: string) {
    await this.parentChild(childId, schoolId, parentId);
    return this.tutorial(assignmentId, schoolId, childId);
  }
  async parentTutorialProgress(assignmentId: string, childId: string, schoolId: string, parentId: string, data: { tutorialViewed?: boolean; practiceCompleted?: boolean }) {
    await this.parentChild(childId, schoolId, parentId);
    return this.saveTutorialProgress(assignmentId, schoolId, childId, data);
  }
  async parentPractice(assignmentId: string, childId: string, schoolId: string, parentId: string) {
    await this.parentChild(childId, schoolId, parentId);
    return this.startPractice(assignmentId, schoolId, childId);
  }
  async parentFinishPractice(assignmentId: string, sessionId: string, childId: string, schoolId: string, parentId: string) {
    await this.parentChild(childId, schoolId, parentId);
    return this.finishPractice(assignmentId, sessionId, schoolId, childId);
  }
  async studentGames(schoolId: string, studentId: string) {
    const direct = await this.prisma.gameAssignment.findMany({
      where: { gameAssessment: { schoolId }, OR: [{ targetType: 'STUDENT', targetIds: { has: studentId } }, { results: { some: { studentId } } }] },
      include: { generatedGame: { include: { template: true } }, gameAssessment: true, results: { where: { studentId }, include: { attempts: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const rows = direct.map((assignment) => {
      const result = assignment.results[0] || null;
      return { ...assignment, availability: this.availability(assignment, result), result };
    });
    return this.withSequentialAvailability(rows, studentId).sort((a: any, b: any) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }
  async tutorial(assignmentId: string, schoolId: string, studentId: string) {
    const assignment = await this.assignmentForStudent(assignmentId, schoolId, studentId);
    if (!assignment.generatedGame) throw new BadRequestException('The assigned game is unavailable.');
    const game = await this.prisma.generatedGame.findUnique({
      where: { id: assignment.generatedGame.id },
      include: { template: { include: { category: true } } },
    });
    if (!game) throw new NotFoundException('Generated game not found.');
    const copy = tutorialFor(game.engineKey);
    const configuration = game.configuration as Record<string, any>;
    const correctPoints = Number(configuration?.scoringRules?.correct ?? 10);
    const incorrectPoints = Number(configuration?.scoringRules?.incorrect ?? 0);
    const maxScore = game.questionIds.length ? game.questionIds.length * correctPoints : 100;
    const content = {
      category: game.template?.category?.name || copy.category,
      icon: copy.icon,
      skills: copy.skills,
      steps: copy.steps,
      controls: copy.controls,
      avoid: copy.avoid,
      strategy: copy.strategy,
      timer: {
        minutes: assignment.timeLimitMinutes || assignment.gameAssessment?.timeLimit || null,
        pauses: !['COLOR_PATH','MAGIC_PAINT','TRAIN_TRACK_BUILDER'].includes(game.engineKey),
        expiry: 'The practice or assessment ends when the timer reaches zero.',
      },
      scoring: {
        correctAction: correctPoints,
        wrongAction: incorrectPoints,
        hintPenalty: ['COLOR_PATH','MAGIC_PAINT','TRAIN_TRACK_BUILDER'].includes(game.engineKey) ? 0 : 2,
        timeBonus: Number(configuration?.scoringRules?.timeBonus ?? 0),
        completionBonus: Number(configuration?.scoringRules?.completionBonus ?? 0),
        maximumScore: maxScore,
        passingScore: assignment.passingScore,
      },
    };
    const tutorial = await this.prisma.gameTutorial.upsert({
      where: { gameId: game.id },
      create: {
        gameId: game.id,
        tutorialTitle: `How to Play ${game.title}`,
        tutorialDescription: copy.objective,
        instructions: content.steps,
        controls: content.controls,
        objectives: { goal: copy.objective, skills: copy.skills, strategy: copy.strategy, avoid: copy.avoid },
        scoringRules: content.scoring,
      },
      update: {
        tutorialTitle: `How to Play ${game.title}`,
        tutorialDescription: copy.objective,
        instructions: content.steps,
        controls: content.controls,
        objectives: { goal: copy.objective, skills: copy.skills, strategy: copy.strategy, avoid: copy.avoid },
        scoringRules: content.scoring,
      },
    });
    const progress = await this.prisma.gameTutorialProgress.findUnique({
      where: { studentId_assessmentId: { studentId, assessmentId: assignmentId } },
    });
    return {
      ...tutorial,
      ...content,
      game: { id: game.id, name: game.title, thumbnail: game.template?.thumbnail, engineKey: game.engineKey },
      assessment: {
        id: assignment.id,
        name: assignment.gameAssessment?.name,
        subject: assignment.gameAssessment?.subject,
        ageGroup: assignment.gameAssessment?.ageGroup,
        difficulty: assignment.gameAssessment?.difficulty || game.template?.difficulty,
        duration: assignment.timeLimitMinutes || assignment.gameAssessment?.timeLimit,
        maximumMarks: maxScore,
        passingMarks: assignment.passingScore,
        allowRestart: assignment.allowRestart,
      },
      progress: progress || { tutorialViewed: false, practiceCompleted: false },
      skipAllowed: Boolean((assignment.assignmentSettings as any)?.allowTutorialSkip),
    };
  }
  async saveTutorialProgress(assignmentId: string, schoolId: string, studentId: string, data: { tutorialViewed?: boolean; practiceCompleted?: boolean }) {
    await this.assignmentForStudent(assignmentId, schoolId, studentId);
    return this.prisma.gameTutorialProgress.upsert({
      where: { studentId_assessmentId: { studentId, assessmentId: assignmentId } },
      create: {
        studentId,
        assessmentId: assignmentId,
        tutorialViewed: Boolean(data.tutorialViewed),
        practiceCompleted: Boolean(data.practiceCompleted),
        viewedAt: data.tutorialViewed ? new Date() : null,
      },
      update: {
        ...(data.tutorialViewed && { tutorialViewed: true, viewedAt: new Date() }),
        ...(data.practiceCompleted && { practiceCompleted: true }),
      },
    });
  }
  async startPractice(assignmentId: string, schoolId: string, studentId: string) {
    const assignment = await this.assignmentForStudent(assignmentId, schoolId, studentId);
    await this.assertSequentialAccess(assignment, schoolId, studentId);
    if (!assignment.generatedGame) throw new BadRequestException('The assigned game is unavailable.');
    return this.runtime.start({
      engineKey: assignment.generatedGame.engineKey,
      questionIds: assignment.generatedGame.questionIds,
      configuration: {
        ...(assignment.generatedGame.configuration as Record<string, unknown>),
        timeLimitMinutes: assignment.timeLimitMinutes,
        practiceMode: true,
      },
      mode: 'PRACTICE',
    }, schoolId, studentId);
  }
  async finishPractice(assignmentId: string, sessionId: string, schoolId: string, studentId: string) {
    await this.assignmentForStudent(assignmentId, schoolId, studentId);
    const session = await this.prisma.gameRuntimeSession.findFirst({
      where: { id: sessionId, schoolId, userId: studentId, mode: 'PRACTICE' },
      select: { id: true },
    });
    if (!session) throw new ForbiddenException('Invalid practice session.');
    await this.prisma.gameRuntimeSession.update({
      where: { id: session.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    return this.saveTutorialProgress(assignmentId, schoolId, studentId, {
      tutorialViewed: true,
      practiceCompleted: true,
    });
  }
  async start(assignmentId: string, schoolId: string, studentId: string, restart = false, bypassTutorial = false) {
    const assignment = await this.assignmentForStudent(assignmentId, schoolId, studentId);
    await this.assertSequentialAccess(assignment, schoolId, studentId);
    const savedResult = assignment.results[0] || null;
    const tutorialProgress = await this.prisma.gameTutorialProgress.findUnique({
      where: { studentId_assessmentId: { studentId, assessmentId: assignmentId } },
    });
    const skipAllowed = Boolean((assignment.assignmentSettings as any)?.allowTutorialSkip);
    if (!bypassTutorial && !tutorialProgress?.tutorialViewed && !skipAllowed) {
      throw new BadRequestException('Complete the game tutorial before starting the assessment.');
    }
    const availability = this.availability(assignment, savedResult);
    if (!availability.available) throw new BadRequestException(availability.reason);
    if (!assignment.generatedGame) throw new BadRequestException('The assigned game is unavailable.');
    const masterGame = await this.prisma.game.findUnique({ where: { componentName: assignment.generatedGame?.engineKey || '' }, select: { id: true } });
    let result = await this.prisma.gameResult.upsert({
      where: { gameAssignmentId_studentId: { gameAssignmentId: assignmentId, studentId } },
      create: { gameAssignmentId: assignmentId, studentId, gameId: masterGame?.id, assessmentId: assignment.gameAssessmentId },
      update: { gameId: masterGame?.id, assessmentId: assignment.gameAssessmentId },
    });
    const attempts = await this.prisma.gameAttempt.count({ where: { gameResultId: result.id } });
    const active = await this.prisma.gameRuntimeSession.findFirst({
      where: {
        gameResultId: result.id,
        userId: studentId,
        status: { in: ['READY', 'RUNNING', 'PAUSED'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (active && !restart) return this.runtime.state(active.id, schoolId, { id: studentId, role: 'STUDENT' as any });
    if (restart && !assignment.allowRestart) throw new ForbiddenException('Restart is not permitted for this assignment.');
    const permittedAttempts = assignment.maxAttempts + (result.reassessmentRequestStatus === 'APPROVED' ? 1 : 0);
    if (attempts >= permittedAttempts) throw new BadRequestException('Maximum attempts reached.');
    const session = await this.runtime.start({
      engineKey: assignment.generatedGame.engineKey,
      questionIds: assignment.generatedGame.questionIds,
      configuration: { ...(assignment.generatedGame.configuration as Record<string, unknown>), timeLimitMinutes: assignment.timeLimitMinutes },
      mode: 'ASSIGNMENT',
    }, schoolId, studentId);
    const attempt = await this.prisma.gameAttempt.create({ data: { gameResultId: result.id, attemptNumber: attempts + 1, state: { status: 'STARTED' } } });
    await this.prisma.$transaction([
      this.prisma.gameRuntimeSession.update({ where: { id: session.id }, data: { generatedGameId: assignment.generatedGame.id, gameResultId: result.id } }),
      this.prisma.gameResult.update({ where: { id: result.id }, data: { status: 'IN_PROGRESS', startedAt: result.startedAt || new Date() } }),
    ]);
    return { ...(await this.runtime.state(session.id, schoolId, { id: studentId, role: 'STUDENT' as any })), attemptId: attempt.id, attemptNumber: attempt.attemptNumber };
  }
  async resume(assignmentId: string, schoolId: string, studentId: string) {
    const assignment = await this.assignmentForStudent(assignmentId, schoolId, studentId);
    const result = assignment.results[0];
    if (!result) throw new NotFoundException('No saved gameplay exists.');
    const session = await this.prisma.gameRuntimeSession.findFirst({
      where: {
        gameResultId: result.id,
        userId: studentId,
        status: { in: ['READY', 'RUNNING', 'PAUSED'] },
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (!session) throw new NotFoundException('No resumable gameplay session exists.');
    return this.runtime.state(session.id, schoolId, { id: studentId, role: 'STUDENT' as any });
  }
  async submit(assignmentId: string, sessionId: string, schoolId: string, studentId: string) {
    const assignment = await this.assignmentForStudent(assignmentId, schoolId, studentId);
    const result = assignment.results[0];
    if (!result) throw new NotFoundException('Gameplay result not found.');
    const session = await this.prisma.gameRuntimeSession.findFirst({ where: { id: sessionId, schoolId, userId: studentId, gameResultId: result.id } });
    if (!session) throw new ForbiddenException('Invalid gameplay session.');
    const runtime = session.runtimeState as any;
    const followLights = session.engineId && runtime?.cognitiveAnalytics && assignment.generatedGame?.engineKey === 'FOLLOW_THE_LIGHTS' ? runtime.cognitiveAnalytics : null;
    const ballStack = session.engineId && runtime?.cognitiveAnalytics && assignment.generatedGame?.engineKey === 'BALL_STACK' ? runtime.cognitiveAnalytics : null;
    const soundDetective = session.engineId && runtime?.cognitiveAnalytics && assignment.generatedGame?.engineKey === 'SOUND_DETECTIVE' ? runtime.cognitiveAnalytics : null;
    const colorPath = session.engineId && runtime?.cognitiveAnalytics && assignment.generatedGame?.engineKey === 'COLOR_PATH' ? runtime.cognitiveAnalytics : null;
    const magicPaint = session.engineId && runtime?.cognitiveAnalytics && assignment.generatedGame?.engineKey === 'MAGIC_PAINT' ? runtime.cognitiveAnalytics : null;
    const trainTrack = session.engineId && runtime?.cognitiveAnalytics && assignment.generatedGame?.engineKey === 'TRAIN_TRACK_BUILDER' ? runtime.cognitiveAnalytics : null;
    const packageSorter = session.engineId && runtime?.cognitiveAnalytics && assignment.generatedGame?.engineKey === 'PACKAGE_SORTER' ? runtime.cognitiveAnalytics : null;
    const rescueMission = session.engineId && runtime?.cognitiveAnalytics && assignment.generatedGame?.engineKey === 'RESCUE_MISSION' ? runtime.cognitiveAnalytics : null;
    const parkingEscape = session.engineId && runtime?.cognitiveAnalytics && assignment.generatedGame?.engineKey === 'PARKING_ESCAPE' ? runtime.cognitiveAnalytics : null;
    const waterPipeline = session.engineId && runtime?.cognitiveAnalytics && assignment.generatedGame?.engineKey === 'WATER_PIPELINE' ? runtime.cognitiveAnalytics : null;
    const cognitive = followLights || ballStack || soundDetective || colorPath || magicPaint || trainTrack || packageSorter || rescueMission || parkingEscape || waterPipeline;
    const answered = followLights ? Number(followLights.correctTaps || 0) + Number(followLights.wrongTaps || 0) : ballStack ? Number(ballStack.totalBallsDropped || 0) : soundDetective ? Number(soundDetective.roundsPlayed || 0) : colorPath ? Number(colorPath.roundsPlayed || 0) : magicPaint ? Number(magicPaint.objectsCompleted || 0) : trainTrack ? Number(trainTrack.roundsPlayed || 0) : packageSorter ? Number(packageSorter.packagesSorted || 0) : rescueMission ? Number(rescueMission.missionsCompleted || 0) : parkingEscape ? Number(parkingEscape.levelsCompleted || 0) : waterPipeline ? Number(waterPipeline.levelsCompleted || 0) : runtime?.answers?.length || 0;
    const total = cognitive ? Math.max(1, answered) : session.questionIds.length;
    const percentage = followLights ? Number(followLights.overallScore || 0) : ballStack ? Number(ballStack.overallCognitiveScore || 0) : soundDetective ? Number(soundDetective.overallScore || 0) : colorPath ? Number(colorPath.overallScore || 0) : magicPaint ? Number(magicPaint.overallScore || 0) : trainTrack ? Number(trainTrack.overallScore || 0) : packageSorter ? Number(packageSorter.overallScore || 0) : rescueMission ? Number(rescueMission.overallScore || 0) : parkingEscape ? Number(parkingEscape.overallScore || 0) : waterPipeline ? Number(waterPipeline.overallScore || 0) : total ? (Number(runtime?.correct || 0) / total) * 100 : 0;
    const passed = percentage >= assignment.passingScore;
    const attempt = await this.prisma.gameAttempt.findFirst({ where: { gameResultId: result.id, submittedAt: null }, orderBy: { attemptNumber: 'desc' } });
    await this.prisma.$transaction(async (tx) => {
      await tx.gameRuntimeSession.update({ where: { id: session.id }, data: { status: 'COMPLETED', completedAt: new Date() } });
      await tx.gameResult.update({ where: { id: result.id }, data: { status: 'COMPLETED', totalScore: session.score, percentage, passed, completedAt: new Date() } });
      if (followLights && result.gameId) {
        await tx.followLightsAnalytics.upsert({
          where: { gameResultId: result.id },
          create: {
            gameResultId: result.id, gameId: result.gameId, studentId, assessmentId: assignment.gameAssessmentId,
            totalSequences: Number(followLights.totalSequences || 0), completedSequences: Number(followLights.completedSequences || 0), longestSequence: Number(followLights.longestSequence || 0),
            mistakes: Number(followLights.mistakes || 0), correctTaps: Number(followLights.correctTaps || 0), wrongTaps: Number(followLights.wrongTaps || 0),
            averageReactionTime: Number(followLights.averageReactionTime || 0), averageTapDelay: Number(followLights.averageTapDelay || 0), completionPercentage: Number(followLights.completionPercentage || 0),
            memoryScore: Number(followLights.memoryScore || 0), focusScore: Number(followLights.focusScore || 0), processingSpeed: Number(followLights.processingSpeed || 0),
            learningPotential: Number(followLights.learningPotential || 0), accuracy: Number(followLights.accuracy || 0), attention: Number(followLights.attention || 0),
            visualMemory: Number(followLights.visualMemory || 0), overallScore: Number(followLights.overallScore || 0),
          },
          update: {
            totalSequences: Number(followLights.totalSequences || 0), completedSequences: Number(followLights.completedSequences || 0), longestSequence: Number(followLights.longestSequence || 0),
            mistakes: Number(followLights.mistakes || 0), correctTaps: Number(followLights.correctTaps || 0), wrongTaps: Number(followLights.wrongTaps || 0),
            averageReactionTime: Number(followLights.averageReactionTime || 0), averageTapDelay: Number(followLights.averageTapDelay || 0), completionPercentage: Number(followLights.completionPercentage || 0),
            memoryScore: Number(followLights.memoryScore || 0), focusScore: Number(followLights.focusScore || 0), processingSpeed: Number(followLights.processingSpeed || 0),
            learningPotential: Number(followLights.learningPotential || 0), accuracy: Number(followLights.accuracy || 0), attention: Number(followLights.attention || 0),
            visualMemory: Number(followLights.visualMemory || 0), overallScore: Number(followLights.overallScore || 0),
          },
        });
      }
      if (ballStack && result.gameId) {
        const data = {
          totalBallsDropped: Number(ballStack.totalBallsDropped || 0), successfulPlacements: Number(ballStack.successfulPlacements || 0), failedPlacements: Number(ballStack.failedPlacements || 0),
          highestTowerHeight: Number(ballStack.highestTowerHeight || 0), averageAlignment: Number(ballStack.averageAlignment || 0), perfectPlacements: Number(ballStack.perfectPlacements || 0),
          averageReactionTime: Number(ballStack.averageReactionTime || 0), towerStabilityScore: Number(ballStack.towerStabilityScore || 0), handEyeCoordinationScore: Number(ballStack.handEyeCoordinationScore || 0),
          fineMotorScore: Number(ballStack.fineMotorScore || 0), precisionScore: Number(ballStack.precisionScore || 0), concentrationScore: Number(ballStack.concentrationScore || 0),
          patienceScore: Number(ballStack.patienceScore || 0), reactionSpeedScore: Number(ballStack.reactionSpeedScore || 0), consistencyScore: Number(ballStack.consistencyScore || 0),
          timingAccuracyScore: Number(ballStack.timingAccuracyScore || 0), overallCognitiveScore: Number(ballStack.overallCognitiveScore || 0), completionStatus: String(ballStack.completionStatus || 'COMPLETED'),
        };
        await tx.ballStackAnalytics.upsert({ where: { gameResultId: result.id }, create: { ...data, gameResultId: result.id, gameId: result.gameId, studentId, assessmentId: assignment.gameAssessmentId }, update: data });
      }
      if (soundDetective && result.gameId) {
        const data = {
          roundsPlayed: Number(soundDetective.roundsPlayed || 0),
          correctResponses: Number(soundDetective.correctResponses || 0),
          incorrectResponses: Number(soundDetective.incorrectResponses || 0),
          averageResponseTime: Number(soundDetective.averageResponseTime || 0),
          listeningScore: Number(soundDetective.listeningScore || 0),
          auditoryRecognitionScore: Number(soundDetective.auditoryRecognitionScore || 0),
          completionPercentage: Number(soundDetective.completionPercentage || 0),
          overallScore: Number(soundDetective.overallScore || 0),
          highestDifficulty: Number(soundDetective.highestDifficulty || 1),
          completionStatus: String(soundDetective.completionStatus || 'COMPLETED'),
        };
        await tx.soundDetectiveAnalytics.upsert({ where: { gameResultId: result.id }, create: { ...data, gameResultId: result.id, gameId: result.gameId, studentId, assessmentId: assignment.gameAssessmentId }, update: data });
      }
      if (colorPath && result.gameId) {
        const data = {
          roundsPlayed: Number(colorPath.roundsPlayed || 0), correctSelections: Number(colorPath.correctSelections || 0), incorrectSelections: Number(colorPath.incorrectSelections || 0),
          averageResponseTime: Number(colorPath.averageResponseTime || 0), observationAccuracy: Number(colorPath.observationAccuracy || 0), observationScore: Number(colorPath.observationScore || 0),
          visualRecognitionScore: Number(colorPath.visualRecognitionScore || 0), highestDifficulty: Number(colorPath.highestDifficulty || 1), completionPercentage: Number(colorPath.completionPercentage || 0),
          overallScore: Number(colorPath.overallScore || 0), completionStatus: String(colorPath.completionStatus || 'COMPLETED'),
        };
        await tx.colorPathAnalytics.upsert({ where: { gameResultId: result.id }, create: { ...data, gameResultId: result.id, gameId: result.gameId, studentId, assessmentId: assignment.gameAssessmentId }, update: data });
      }
      if (magicPaint && result.gameId) {
        const data={objectsCompleted:Number(magicPaint.objectsCompleted||0),colorsUsed:Array.isArray(magicPaint.colorsUsed)?magicPaint.colorsUsed:[],interactionsPerObject:Array.isArray(magicPaint.interactionsPerObject)?magicPaint.interactionsPerObject:[],averageCompletionTime:Number(magicPaint.averageCompletionTime||0),interactionConsistency:Number(magicPaint.interactionConsistency||0),completionPercentage:Number(magicPaint.completionPercentage||0),creativityScore:Number(magicPaint.creativityScore||0),causeEffectScore:Number(magicPaint.causeEffectScore||0),overallScore:Number(magicPaint.overallScore||0),completionStatus:String(magicPaint.completionStatus||'COMPLETED')};
        await tx.magicPaintAnalytics.upsert({where:{gameResultId:result.id},create:{...data,gameResultId:result.id,gameId:result.gameId,studentId,assessmentId:assignment.gameAssessmentId},update:data});
      }
      if (trainTrack && result.gameId) {
        const data={roundsPlayed:Number(trainTrack.roundsPlayed||0),tracksCompleted:Number(trainTrack.tracksCompleted||0),successfulRoutes:Number(trainTrack.successfulRoutes||0),correctRotations:Number(trainTrack.correctRotations||0),incorrectRotations:Number(trainTrack.incorrectRotations||0),averageCompletionTime:Number(trainTrack.averageCompletionTime||0),highestDifficulty:Number(trainTrack.highestDifficulty||1),logicalAccuracy:Number(trainTrack.logicalAccuracy||0),logicalThinkingScore:Number(trainTrack.logicalThinkingScore||0),causeEffectScore:Number(trainTrack.causeEffectScore||0),completionPercentage:Number(trainTrack.completionPercentage||0),overallScore:Number(trainTrack.overallScore||0),completionStatus:String(trainTrack.completionStatus||'COMPLETED')};
        await tx.trainTrackAnalytics.upsert({where:{gameResultId:result.id},create:{...data,gameResultId:result.id,gameId:result.gameId,studentId,assessmentId:assignment.gameAssessmentId},update:data});
      }
      if (packageSorter && result.gameId) {
        const data = {
          roundsPlayed: Number(packageSorter.roundsPlayed || 0),
          packagesSorted: Number(packageSorter.packagesSorted || 0),
          correctDeliveries: Number(packageSorter.correctDeliveries || 0),
          incorrectDeliveries: Number(packageSorter.incorrectDeliveries || 0),
          averageDecisionTime: Number(packageSorter.averageDecisionTime || 0),
          organizationScore: Number(packageSorter.organizationScore || 0),
          decisionMakingScore: Number(packageSorter.decisionMakingScore || 0),
          highestDifficulty: Number(packageSorter.highestDifficulty || 1),
          completionPercentage: Number(packageSorter.completionPercentage || 0),
          overallScore: Number(packageSorter.overallScore || 0),
          completionStatus: String(packageSorter.completionStatus || 'COMPLETED'),
        };
        await tx.packageSorterAnalytics.upsert({
          where: { gameResultId: result.id },
          create: { ...data, gameResultId: result.id, gameId: result.gameId, studentId, assessmentId: assignment.gameAssessmentId },
          update: data,
        });
      }
      if (rescueMission && result.gameId) {
        const data = {
          missionsStarted: Number(rescueMission.missionsStarted || 0), missionsCompleted: Number(rescueMission.missionsCompleted || 0), successfulRescues: Number(rescueMission.successfulRescues || 0), unsuccessfulActions: Number(rescueMission.unsuccessfulActions || 0), strategyChanges: Number(rescueMission.strategyChanges || 0), successfulStrategyChanges: Number(rescueMission.successfulStrategyChanges || 0), averageDecisionTime: Number(rescueMission.averageDecisionTime || 0), averageSolutionTime: Number(rescueMission.averageSolutionTime || 0), highestDifficulty: Number(rescueMission.highestDifficulty || 1), problemSolvingScore: Number(rescueMission.problemSolvingScore || 0), cognitiveFlexibilityScore: Number(rescueMission.cognitiveFlexibilityScore || 0), completionPercentage: Number(rescueMission.completionPercentage || 0), overallScore: Number(rescueMission.overallScore || 0), completionStatus: String(rescueMission.completionStatus || 'COMPLETED'),
        };
        await tx.rescueMissionAnalytics.upsert({ where: { gameResultId: result.id }, create: { ...data, gameResultId: result.id, gameId: result.gameId, studentId, assessmentId: assignment.gameAssessmentId }, update: data });
      }
      if (parkingEscape && result.gameId) {
        const data = { levelsStarted: Number(parkingEscape.levelsStarted || 0), levelsCompleted: Number(parkingEscape.levelsCompleted || 0), targetCarsEscaped: Number(parkingEscape.targetCarsEscaped || 0), totalVehicleMoves: Number(parkingEscape.totalVehicleMoves || 0), efficientMoves: Number(parkingEscape.efficientMoves || 0), unnecessaryMoves: Number(parkingEscape.unnecessaryMoves || 0), averageLevelCompletionTime: Number(parkingEscape.averageLevelCompletionTime || 0), highestLevel: Number(parkingEscape.highestLevel || 1), strategicPlanningScore: Number(parkingEscape.strategicPlanningScore || 0), spatialReasoningScore: Number(parkingEscape.spatialReasoningScore || 0), completionPercentage: Number(parkingEscape.completionPercentage || 0), overallScore: Number(parkingEscape.overallScore || 0), completionStatus: String(parkingEscape.completionStatus || 'COMPLETED') };
        await tx.parkingEscapeAnalytics.upsert({ where: { gameResultId: result.id }, create: { ...data, gameResultId: result.id, gameId: result.gameId, studentId, assessmentId: assignment.gameAssessmentId }, update: data });
      }
      if (waterPipeline && result.gameId) {
        const data={levelsStarted:Number(waterPipeline.levelsStarted||0),levelsCompleted:Number(waterPipeline.levelsCompleted||0),pipesRotated:Number(waterPipeline.pipesRotated||0),successfulConnections:Number(waterPipeline.successfulConnections||0),failedConnections:Number(waterPipeline.failedConnections||0),completedPipelines:Number(waterPipeline.completedPipelines||0),averageSolutionTime:Number(waterPipeline.averageSolutionTime||0),averageRotationsPerLevel:Number(waterPipeline.averageRotationsPerLevel||0),highestLevel:Number(waterPipeline.highestLevel||1),logicalReasoningScore:Number(waterPipeline.logicalReasoningScore||0),problemSolvingScore:Number(waterPipeline.problemSolvingScore||0),completionPercentage:Number(waterPipeline.completionPercentage||0),overallScore:Number(waterPipeline.overallScore||0),completionStatus:String(waterPipeline.completionStatus||'COMPLETED')};
        await tx.waterPipelineAnalytics.upsert({where:{gameResultId:result.id},create:{...data,gameResultId:result.id,gameId:result.gameId,studentId,assessmentId:assignment.gameAssessmentId},update:data});
      }
      if (attempt) {
        await tx.gameAttempt.update({ where: { id: attempt.id }, data: { submittedAt: new Date(), state: session.runtimeState as Prisma.InputJsonValue } });
        await tx.gameScore.create({ data: { gameAttemptId: attempt.id, gameKey: assignment.generatedGame?.engineKey || 'GAME', score: session.score, maxScore: cognitive ? 100 : total * 10, timeTaken: session.elapsedSeconds, details: cognitive || { answered, correct: runtime?.correct || 0, incorrect: runtime?.incorrect || 0 } } });
      }
    });
    const rewards = await this.insights.processResult(result.id, schoolId);
    return { score: session.score, percentage, passed, answered, total, timeTaken: session.elapsedSeconds, status: 'COMPLETED', rewards };
  }

  private async assignmentForStudent(id: string, schoolId: string, studentId: string) {
    const assignment = await this.prisma.gameAssignment.findFirst({ where: { id, gameAssessment: { schoolId } }, include: { generatedGame: true, gameAssessment: true, results: { where: { studentId }, include: { attempts: true } } } });
    if (!assignment) throw new NotFoundException('Game assignment not found.');
    if (assignment.targetType === 'STUDENT' && !assignment.targetIds.includes(studentId)) throw new ForbiddenException('This game is not assigned to you.');
    return assignment;
  }
  private async parentChild(childId: string, schoolId: string, parentId: string) {
    const child = await this.prisma.application.findFirst({ where: { id: childId, schoolId, parentId }, select: { id: true } });
    if (!child) throw new ForbiddenException('This student is not linked to your parent account.');
    return child;
  }
  private sequenceGroup(assignment: any) {
    return String(assignment.gameAssessment?.settings?.source || '').startsWith('REAL_TIME_GAMES') ? 'GAMES' : 'ASSESSMENTS';
  }
  private withSequentialAvailability(assignments: any[], studentId?: string) {
    const groups = new Map<string, any[]>();
    for (const assignment of assignments) {
      const childId = studentId || assignment.child?.id || assignment.result?.studentId;
      const key = `${childId}:${this.sequenceGroup(assignment)}`;
      const group = groups.get(key) || [];
      group.push(assignment);
      groups.set(key, group);
    }
    for (const group of groups.values()) {
      group.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      let waitingForPrevious = false;
      group.forEach((assignment, index) => {
        assignment.sequence = { position: index + 1, total: group.length };
        if (waitingForPrevious && assignment.result?.status !== 'COMPLETED') {
          assignment.availability = { ...assignment.availability, available: false, reason: 'Complete the previous game first.', sequenceLocked: true };
        }
        if (assignment.result?.status !== 'COMPLETED') waitingForPrevious = true;
      });
    }
    return assignments;
  }
  private async assertSequentialAccess(assignment: any, schoolId: string, studentId: string) {
    if (assignment.results?.[0]?.status === 'IN_PROGRESS') return;
    const source = String(assignment.gameAssessment?.settings?.source || '');
    const regularGame = source.startsWith('REAL_TIME_GAMES');
    const earlier = await this.prisma.gameAssignment.findMany({
      where: {
        id: { not: assignment.id },
        createdAt: { lt: assignment.createdAt },
        status: 'ASSIGNED',
        gameAssessment: { schoolId },
        OR: [{ targetType: 'STUDENT', targetIds: { has: studentId } }, { results: { some: { studentId } } }],
      },
      include: { gameAssessment: true, results: { where: { studentId }, select: { status: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const incomplete = earlier.find((candidate) =>
      String(candidate.gameAssessment?.settings && (candidate.gameAssessment.settings as any).source || '').startsWith('REAL_TIME_GAMES') === regularGame
      && candidate.results[0]?.status !== 'COMPLETED',
    );
    if (incomplete) throw new BadRequestException('Complete the previous game first. Games must be played in their assigned order.');
  }
  private availability(assignment: any, result?: any) {
    const now = new Date();
    if (assignment.status !== 'ASSIGNED') return { available: false, reason: 'Assignment is not active.' };
    if (assignment.startDate && now < assignment.startDate) return { available: false, reason: 'Assignment has not started.' };
    if (assignment.endDate && now > assignment.endDate) return { available: false, reason: 'Assignment has ended.' };
    const attemptsUsed = Number(result?.attempts?.length || 0);
    const permittedAttempts = Number(assignment.maxAttempts || 1) + (result?.reassessmentRequestStatus === 'APPROVED' ? 1 : 0);
    if (result?.status !== 'IN_PROGRESS' && attemptsUsed >= permittedAttempts) {
      return { available: false, reason: 'Maximum attempts reached.', attemptsUsed };
    }
    return { available: true, reason: null, attemptsUsed };
  }
}
