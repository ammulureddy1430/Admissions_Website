import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../../prisma.service';
import { RuntimeActionDto, StartRuntimeDto } from './dto/game-runtime.dto';
import { randomInt } from 'crypto';

const ENGINES = [
  ['QUIZ_CHALLENGE','Quiz Challenge'],['ADVENTURE_GAME','Adventure Game'],['BALLOON_POP','Balloon Pop'],
  ['BOARD_GAME','Board Game'],['BUILDING_GAME','Building Game'],['DRAG_DROP','Drag & Drop'],
  ['FISHING_GAME','Fishing Game'],['LAB_SIMULATION','Lab Simulation'],['LOGIC_GAME','Logical Thinking Game'],
  ['MATCHING_GAME','Matching Game'],['MAZE','Maze'],['MEMORY_MATCH','Memory Game'],
  ['PUZZLE','Puzzle Game'],['RACING_GAME','Racing Game'],['SENTENCE_BUILDER','Sentence Builder'],
  ['SHOOTING_GAME','Shooting Game'],['SIMULATION_GAME','Simulation Game'],['SORTING_GAME','Sorting Game'],
  ['STORY_GAME','Story Game'],['STRATEGY_GAME','Strategy Game'],['TREASURE_HUNT','Treasure Hunt'],
  ['WORD_GAME','Word Game'],['WORD_SEARCH','Word Search'],['CROSSWORD','Crossword'],
  ['SEQUENCE_GAME','Sequence Game'],['ENDLESS_RUNNER','Endless Runner'],['SPIN_WHEEL','Spin Wheel'],
  ['BASKETBALL_CHALLENGE','Basketball Challenge'],['FOOTBALL_GOAL_QUIZ','Football Goal Quiz'],
  ['FOLLOW_THE_LIGHTS','Follow the Lights'],
  ['BALL_STACK','Ball Stack'],
  ['SOUND_DETECTIVE','Sound Detective'],
  ['COLOR_PATH','Color Path'],
  ['MAGIC_PAINT','Magic Paint'],
  ['TRAIN_TRACK_BUILDER','Train Track Builder'],
  ['PACKAGE_SORTER','Package Sorter'],
  ['RESCUE_MISSION','Rescue Mission'],
  ['PARKING_ESCAPE','Parking Escape'],
  ['WATER_PIPELINE','Water Pipeline'],
] as const;

// These catalog games generate their own rounds and cognitive metrics at
// runtime. Unlike question-driven templates, they do not require AI question
// records or question mappings.
const SELF_CONTAINED_ENGINES = new Set([
  'FOLLOW_THE_LIGHTS', 'BALL_STACK', 'SOUND_DETECTIVE', 'COLOR_PATH',
  'MAGIC_PAINT', 'TRAIN_TRACK_BUILDER', 'PACKAGE_SORTER', 'RESCUE_MISSION',
  'PARKING_ESCAPE', 'WATER_PIPELINE',
]);

@Injectable()
export class GameRuntimeService {
  private readonly recordingStorage = new S3Client({
    region: 'us-east-1',
    endpoint: `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || 9000}`,
    credentials: { accessKeyId: process.env.MINIO_ACCESS_KEY || 'admin', secretAccessKey: process.env.MINIO_SECRET_KEY || 'adminpassword' },
    forcePathStyle: true,
  });
  private readonly recordingBucket = process.env.MINIO_BUCKET || 'admissionsos';
  constructor(private readonly prisma: PrismaService) {}

  async recordingUploadUrl(id: string, schoolId: string, user: { id: string; role: Role }, contentType?: string) {
    const session = await this.owned(id, schoolId, user);
    if (session.mode !== 'ASSIGNMENT') throw new BadRequestException('Gameplay recording is only available for assigned games.');
    const mimeType = contentType === 'video/webm;codecs=vp9' ? contentType : 'video/webm';
    const objectKey = `tenants/${schoolId}/gameplay-recordings/${session.id}.webm`;
    try {
      const uploadUrl = await getSignedUrl(this.recordingStorage, new PutObjectCommand({ Bucket: this.recordingBucket, Key: objectKey, ContentType: mimeType }), { expiresIn: 1800 });
      return { uploadUrl, contentType: mimeType, objectKey };
    } catch {
      throw new ServiceUnavailableException('Gameplay recording storage is unavailable.');
    }
  }

  async recordingReady(id: string, schoolId: string, user: { id: string; role: Role }, objectKey: string, contentType?: string) {
    const session = await this.owned(id, schoolId, user);
    const expectedKey = `tenants/${schoolId}/gameplay-recordings/${session.id}.webm`;
    if (objectKey !== expectedKey) throw new BadRequestException('Gameplay recording path is invalid.');
    try {
      const object = await this.recordingStorage.send(new HeadObjectCommand({ Bucket: this.recordingBucket, Key: objectKey }));
      if (!object.ContentLength) throw new BadRequestException('The gameplay recording is empty.');
      const runtime = (session.runtimeState || {}) as Record<string, unknown>;
      await this.prisma.gameRuntimeSession.update({ where: { id: session.id }, data: { runtimeState: { ...runtime, recordingObjectKey: objectKey, recordingMimeType: contentType || 'video/webm', recordingSize: Number(object.ContentLength) } as Prisma.InputJsonValue } });
      return { saved: true, size: Number(object.ContentLength) };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new ServiceUnavailableException('The gameplay recording upload could not be verified.');
    }
  }

  async recordingPlaybackUrl(id: string, schoolId: string) {
    const session = await this.prisma.gameRuntimeSession.findFirst({ where: { id, schoolId, gameResultId: { not: null } } });
    const runtime = (session?.runtimeState || {}) as Record<string, unknown>;
    const objectKey = typeof runtime.recordingObjectKey === 'string' ? runtime.recordingObjectKey : '';
    if (!session || !objectKey) throw new NotFoundException('No gameplay recording is available for this session.');
    try {
      return { url: await getSignedUrl(this.recordingStorage, new GetObjectCommand({ Bucket: this.recordingBucket, Key: objectKey }), { expiresIn: 900 }) };
    } catch {
      throw new ServiceUnavailableException('Gameplay recording playback is unavailable.');
    }
  }

  async definitions(schoolId: string) {
    await this.prisma.gameEngineDefinition.createMany({
      data: ENGINES.map(([engineKey, name]) => ({
        schoolId, engineKey, name, supportedDevices: ['DESKTOP','TABLET','MOBILE'],
        capabilities: { timer: true, lives: true, hints: true, pause: true, resume: true, sound: true, animations: true, accessibility: true },
        defaultConfig: { timerSeconds: 30, lives: 3, hints: 3, sound: true, animations: true, reducedMotion: false, highContrast: false },
      })), skipDuplicates: true,
    });
    return this.prisma.gameEngineDefinition.findMany({ where: { schoolId, status: 'ACTIVE' }, orderBy: { name: 'asc' } });
  }

  async start(dto: StartRuntimeDto, schoolId: string, userId: string) {
    await this.definitions(schoolId);
    const engine = await this.prisma.gameEngineDefinition.findFirst({ where: { schoolId, engineKey: dto.engineKey, status: 'ACTIVE' } });
    if (!engine) throw new BadRequestException('Unsupported or disabled game engine.');
    const ids = [...new Set(dto.questionIds)];
    if (!ids.length && !SELF_CONTAINED_ENGINES.has(dto.engineKey)) {
      throw new BadRequestException('At least one approved mapped question is required.');
    }
    const questions = await this.prisma.gameAIQuestion.findMany({
      where: { schoolId, id: { in: ids }, status: 'APPROVED', gameMapping: { isNot: null } }, include: { options: true },
    });
    if (questions.length !== ids.length) throw new BadRequestException('Every runtime question must be approved and mapped.');
    const defaults = engine.defaultConfig as Record<string, any>;
    const configuration = { ...defaults, ...(dto.configuration || {}) };
    const maze = dto.engineKey === 'MAZE'
      ? await this.createMaze(configuration, questions)
      : null;
    const session = await this.prisma.gameRuntimeSession.create({ data: {
      schoolId, engineId: engine.id, userId, mode: dto.mode || 'PREVIEW', status: 'READY',
      questionIds: ids, livesRemaining: Number(configuration.lives ?? 3), hintsRemaining: Number(configuration.hints ?? 3),
      runtimeState: { answers: [], correct: 0, incorrect: 0, ...(maze && { maze }) }, configuration: configuration as Prisma.InputJsonValue,
    } });
    await this.event(session.id, 'SESSION_CREATED', { engineKey: engine.engineKey, questionCount: ids.length });
    return this.state(session.id, schoolId, { id: userId, role: Role.TEACHER });
  }

  async state(id: string, schoolId: string, user: { id: string; role: Role }) {
    const session = await this.owned(id, schoolId, user);
    const questions = await this.prisma.gameAIQuestion.findMany({
      where: { id: { in: session.questionIds } }, include: { options: { orderBy: { sequence: 'asc' } }, gameMapping: { include: { selectedTemplate: true, configuration: true } } },
    });
    const ordered = session.questionIds.map((questionId) => questions.find((question) => question.id === questionId)).filter(Boolean);
    const runtime = (session.runtimeState || {}) as any;
    if (session.engine.engineKey === 'MAZE' && (!Array.isArray(runtime.maze?.challenges) || runtime.maze.challenges.length !== ordered.length)) {
      const maze = await this.createMaze(session.configuration as Record<string, any>, ordered);
      session.runtimeState = { ...runtime, maze };
      await this.prisma.gameRuntimeSession.update({
        where: { id: session.id },
        data: { runtimeState: session.runtimeState as Prisma.InputJsonValue },
      });
      await this.event(session.id, 'MAZE_UPGRADED_WITH_QUESTIONS', { questionCount: ordered.length });
    }
    if (session.engine.engineKey === 'MAZE' && Array.isArray(runtime.maze?.challenges) && Number(runtime.maze.version || 1) < 2) {
      const maze = {
        ...runtime.maze,
        version: 2,
        challenges: runtime.maze.challenges.map((challenge: any) => {
          const question: any = ordered.find((item: any) => item.id === challenge.questionId);
          return {
            ...challenge,
            pageNumber: question?.pageNumber,
            options: (question?.options || []).map((option: any) => ({
              id: option.id,
              optionKey: option.optionKey,
              optionText: option.optionText,
            })),
          };
        }),
      };
      session.runtimeState = { ...runtime, maze };
      await this.prisma.gameRuntimeSession.update({
        where: { id: session.id },
        data: { runtimeState: session.runtimeState as Prisma.InputJsonValue },
      });
      await this.event(session.id, 'MAZE_PRESENTATION_UPGRADED', { version: 2 });
    }
    const current = ordered[session.currentIndex];
    return {
      ...session,
      engine: session.engine,
      progress: ordered.length ? Math.round((session.currentIndex / ordered.length) * 100) : 0,
      currentQuestion: current ? this.publicQuestion(current, session.engine.engineKey, session.currentIndex) : null,
      questionCount: ordered.length,
    };
  }

  async action(id: string, dto: RuntimeActionDto, schoolId: string, user: { id: string; role: Role }) {
    const session = await this.owned(id, schoolId, user);
    const action = dto.action.toUpperCase();
    if (action === 'END') {
      if (session.status === 'COMPLETED') return { state: await this.state(id, schoolId, user) };
      return this.transition(id, 'COMPLETED', { completedAt: new Date() }, 'ENDED_EARLY', dto.payload, schoolId, user);
    }
    if (session.engine.engineKey === 'COLOR_PATH' && ['PAUSE', 'HINT', 'ANSWER', 'COMPLETE'].includes(action)) {
      throw new BadRequestException('Color Path does not allow pause, hints, retries, skips, or question answers.');
    }
    if (session.engine.engineKey === 'MAGIC_PAINT' && ['PAUSE', 'HINT', 'ANSWER', 'COMPLETE'].includes(action)) throw new BadRequestException('Magic Paint does not allow pause, hints, retries, skips, or question answers.');
    if (session.engine.engineKey === 'TRAIN_TRACK_BUILDER' && ['PAUSE', 'HINT', 'ANSWER', 'COMPLETE'].includes(action)) throw new BadRequestException('Train Track Builder does not allow pause, hints, retries, skips, or question answers.');
    if (session.engine.engineKey === 'PACKAGE_SORTER' && ['PAUSE', 'HINT', 'ANSWER', 'COMPLETE'].includes(action)) throw new BadRequestException('Package Sorter does not allow pause, hints, retries, skips, or question answers.');
    if (session.engine.engineKey === 'RESCUE_MISSION' && ['PAUSE', 'HINT', 'ANSWER', 'COMPLETE'].includes(action)) throw new BadRequestException('Rescue Mission does not allow pause, hints, retries, skips, or question answers.');
    if (session.engine.engineKey === 'PARKING_ESCAPE' && ['PAUSE', 'HINT', 'ANSWER', 'COMPLETE'].includes(action)) throw new BadRequestException('Parking Escape does not allow pause, hints, answers, or skips.');
    if (session.engine.engineKey === 'WATER_PIPELINE' && ['PAUSE', 'HINT', 'ANSWER', 'COMPLETE'].includes(action)) throw new BadRequestException('Water Pipeline does not allow pause, hints, answers, or skips.');
    if (action === 'START') return this.transition(session.id, 'RUNNING', { startedAt: session.startedAt || new Date(), pausedAt: null }, 'STARTED', dto.payload, schoolId, user);
    if (action === 'PAUSE') {
      if (session.status !== 'RUNNING') throw new BadRequestException('Only a running game can be paused.');
      return this.transition(session.id, 'PAUSED', { pausedAt: new Date() }, 'PAUSED', dto.payload, schoolId, user);
    }
    if (action === 'RESUME') {
      if (session.status !== 'PAUSED') throw new BadRequestException('Only a paused game can be resumed.');
      return this.transition(session.id, 'RUNNING', { pausedAt: null }, 'RESUMED', dto.payload, schoolId, user);
    }
    if (action === 'HINT') {
      if (session.hintsRemaining <= 0) throw new BadRequestException('No hints remain.');
      const question = await this.currentQuestion(session);
      await this.prisma.gameRuntimeSession.update({ where: { id }, data: { hintsRemaining: { decrement: 1 }, score: { decrement: 2 } } });
      await this.event(id, 'HINT_USED', { questionId: question.id });
      return { hint: question.explanation || `Review the textbook idea from page ${question.pageNumber}.`, state: await this.state(id, schoolId, user) };
    }
    if (action === 'ANSWER') return this.answer(session, String((dto.payload as any)?.answer ?? ''), Number((dto.payload as any)?.timeTaken || 0), schoolId, user);
    if (action === 'MAZE_PROGRESS') return this.mazeProgress(session, dto.payload, schoolId, user);
    if (action === 'MAZE_ANSWER') return this.mazeAnswer(session, dto.payload, schoolId, user);
    if (action === 'MAZE_COMPLETE') return this.mazeComplete(session, dto.payload, schoolId, user);
    if (action === 'MEMORY_COMPLETE') return this.memoryComplete(session, dto.payload, schoolId, user);
    if (action === 'FOLLOW_LIGHTS_COMPLETE') return this.followLightsComplete(session, dto.payload, schoolId, user);
    if (action === 'BALL_STACK_COMPLETE') return this.ballStackComplete(session, dto.payload, schoolId, user);
    if (action === 'SOUND_DETECTIVE_COMPLETE') return this.soundDetectiveComplete(session, dto.payload, schoolId, user);
    if (action === 'COLOR_PATH_COMPLETE') return this.colorPathComplete(session, dto.payload, schoolId, user);
    if (action === 'MAGIC_PAINT_PROGRESS') return this.magicPaintProgress(session, dto.payload, schoolId, user);
    if (action === 'MAGIC_PAINT_COMPLETE') return this.magicPaintComplete(session, dto.payload, schoolId, user);
    if (action === 'TRAIN_TRACK_COMPLETE') return this.trainTrackComplete(session, dto.payload, schoolId, user);
    if (action === 'PACKAGE_SORTER_COMPLETE') return this.packageSorterComplete(session, dto.payload, schoolId, user);
    if (action === 'RESCUE_MISSION_COMPLETE') return this.rescueMissionComplete(session, dto.payload, schoolId, user);
    if (action === 'PARKING_ESCAPE_COMPLETE') return this.parkingEscapeComplete(session, dto.payload, schoolId, user);
    if (action === 'WATER_PIPELINE_COMPLETE') return this.waterPipelineComplete(session, dto.payload, schoolId, user);
    if (action === 'SECURITY_VIOLATION') return this.securityViolation(session, dto.payload, schoolId, user);
    if (action === 'RECORDING_STOPPED') return this.recordingStopped(session, schoolId, user);
    if (action === 'COMPLETE') return this.transition(id, 'COMPLETED', { completedAt: new Date() }, 'COMPLETED', dto.payload, schoolId, user);
    throw new BadRequestException('Unsupported runtime action.');
  }

  private async followLightsComplete(session: any, payload: unknown, schoolId: string, user: { id: string; role: Role }) {
    if (session.engine.engineKey !== 'FOLLOW_THE_LIGHTS' || !['RUNNING', 'PAUSED'].includes(session.status)) {
      throw new BadRequestException('Follow the Lights metrics require an active Follow the Lights session.');
    }
    const input = (payload || {}) as Record<string, any>;
    const number = (key: string, maximum = 100000) => Math.max(0, Math.min(maximum, Number(input[key]) || 0));
    const totalSequences = number('totalSequences', 1000);
    const completedSequences = Math.min(totalSequences, number('completedSequences', 1000));
    const correctTaps = number('correctTaps', 10000);
    const wrongTaps = number('wrongTaps', 10000);
    const mistakes = Math.min(3, number('mistakes', 3));
    const longestSequence = number('longestSequence', 100);
    const averageReactionTime = number('averageReactionTime', 60000);
    const averageTapDelay = number('averageTapDelay', 60000);
    const taps = correctTaps + wrongTaps;
    const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value * 10) / 10));
    const accuracy = clamp(taps ? correctTaps / taps * 100 : 0);
    const completionPercentage = clamp(totalSequences ? completedSequences / totalSequences * 100 : 0);
    const memoryScore = clamp(longestSequence / 10 * 100);
    const focusScore = clamp(accuracy * .72 + (3 - mistakes) / 3 * 28);
    const processingSpeed = clamp(100 - Math.max(0, averageReactionTime - 350) / 12);
    const learningPotential = clamp(memoryScore * .55 + completionPercentage * .45);
    const attention = clamp(focusScore * .65 + processingSpeed * .35);
    const visualMemory = clamp(memoryScore * .8 + accuracy * .2);
    const overallScore = clamp(memoryScore * .24 + focusScore * .18 + processingSpeed * .16 + learningPotential * .18 + accuracy * .12 + attention * .12);
    const cognitiveAnalytics = { totalSequences, completedSequences, longestSequence, mistakes, correctTaps, wrongTaps, averageReactionTime, averageTapDelay, completionPercentage, memoryScore, focusScore, processingSpeed, learningPotential, accuracy, attention, visualMemory, overallScore, endReason: String(input.endReason || 'COMPLETED') };
    await this.prisma.gameRuntimeSession.update({ where: { id: session.id }, data: {
      status: 'COMPLETED', completedAt: new Date(), score: overallScore,
      elapsedSeconds: Math.min(120, number('elapsedSeconds', 120)),
      runtimeState: { ...((session.runtimeState || {}) as Record<string, unknown>), cognitiveAnalytics } as Prisma.InputJsonValue,
    } });
    await this.event(session.id, 'FOLLOW_LIGHTS_COMPLETED', cognitiveAnalytics);
    return { state: await this.state(session.id, schoolId, user) };
  }

  private async ballStackComplete(session: any, payload: unknown, schoolId: string, user: { id: string; role: Role }) {
    if (session.engine.engineKey !== 'BALL_STACK' || !['RUNNING', 'PAUSED'].includes(session.status)) throw new BadRequestException('Ball Stack metrics require an active Ball Stack session.');
    const input = (payload || {}) as Record<string, any>;
    const number = (key: string, maximum = 100000) => Math.max(0, Math.min(maximum, Number(input[key]) || 0));
    const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value * 10) / 10));
    const totalBallsDropped = number('totalBallsDropped', 1000);
    const successfulPlacements = Math.min(totalBallsDropped, number('successfulPlacements', 1000));
    const failedPlacements = Math.min(totalBallsDropped - successfulPlacements, number('failedPlacements', 1000));
    const highestTowerHeight = Math.min(successfulPlacements, number('highestTowerHeight', 1000));
    const perfectPlacements = Math.min(successfulPlacements, number('perfectPlacements', 1000));
    const averageAlignment = clamp(number('averageAlignment', 100));
    const averageReactionTime = number('averageReactionTime', 60000);
    const towerStabilityScore = clamp(number('towerStabilityScore', 100));
    const successRate = totalBallsDropped ? successfulPlacements / totalBallsDropped * 100 : 0;
    const reactionSpeedScore = clamp(100 - Math.max(0, averageReactionTime - 650) / 22);
    const consistencyScore = clamp(number('consistencyScore', 100));
    const handEyeCoordinationScore = clamp(successRate * .45 + averageAlignment * .35 + reactionSpeedScore * .2);
    const fineMotorScore = clamp(averageAlignment * .52 + towerStabilityScore * .3 + consistencyScore * .18);
    const precisionScore = clamp(averageAlignment * .7 + perfectPlacements / Math.max(1, totalBallsDropped) * 30);
    const concentrationScore = clamp(successRate * .45 + consistencyScore * .35 + Math.min(100, highestTowerHeight * 8) * .2);
    const patienceScore = clamp(Math.min(100, averageReactionTime / 18) * .35 + towerStabilityScore * .65);
    const timingAccuracyScore = clamp(reactionSpeedScore * .4 + averageAlignment * .6);
    const overallCognitiveScore = clamp(handEyeCoordinationScore * .23 + fineMotorScore * .2 + precisionScore * .18 + concentrationScore * .14 + patienceScore * .1 + reactionSpeedScore * .08 + consistencyScore * .07);
    const completionStatus = String(input.endReason) === 'TOWER_COLLAPSED' ? 'TOWER_COLLAPSED' : 'COMPLETED';
    const cognitiveAnalytics = { totalBallsDropped, successfulPlacements, failedPlacements, highestTowerHeight, averageAlignment, perfectPlacements, averageReactionTime, towerStabilityScore, handEyeCoordinationScore, fineMotorScore, precisionScore, concentrationScore, patienceScore, reactionSpeedScore, consistencyScore, timingAccuracyScore, overallCognitiveScore, completionStatus };
    await this.prisma.gameRuntimeSession.update({ where: { id: session.id }, data: { status: 'COMPLETED', completedAt: new Date(), score: overallCognitiveScore, elapsedSeconds: Math.min(90, number('elapsedSeconds', 90)), runtimeState: { ...((session.runtimeState || {}) as Record<string, unknown>), cognitiveAnalytics } as Prisma.InputJsonValue } });
    await this.event(session.id, 'BALL_STACK_COMPLETED', cognitiveAnalytics);
    return { state: await this.state(session.id, schoolId, user) };
  }

  private async soundDetectiveComplete(session: any, payload: unknown, schoolId: string, user: { id: string; role: Role }) {
    if (session.engine.engineKey !== 'SOUND_DETECTIVE' || !['RUNNING', 'PAUSED'].includes(session.status)) {
      throw new BadRequestException('Sound Detective metrics require an active Sound Detective session.');
    }
    const input = (payload || {}) as Record<string, any>;
    const number = (key: string, maximum = 100000) => Math.max(0, Math.min(maximum, Number(input[key]) || 0));
    const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value * 10) / 10));

    const roundsPlayed = number('roundsPlayed', 1000);
    const correctResponses = Math.min(roundsPlayed, number('correctResponses', 1000));
    const incorrectResponses = number('incorrectResponses', 1000);
    const averageResponseTime = number('averageResponseTime', 60000);
    const highestDifficulty = Math.min(5, Math.max(1, number('highestDifficulty', 5)));
    const elapsedSeconds = Math.min(120, number('elapsedSeconds', 120));

    const totalResponses = correctResponses + incorrectResponses;
    const accuracy = totalResponses ? (correctResponses / totalResponses) * 100 : 0;
    const completionPercentage = clamp((elapsedSeconds / 120) * 100);

    const auditoryRecognitionScore = clamp(accuracy * 0.7 + (highestDifficulty / 5) * 30);
    const listeningScore = clamp(accuracy * 0.6 + completionPercentage * 0.4);
    const overallScore = clamp(auditoryRecognitionScore * 0.5 + listeningScore * 0.5);
    const completionStatus = String(input.endReason || 'COMPLETED');
    const roundResponses = Array.isArray(input.roundResponses) ? input.roundResponses.slice(0, 20).map((row: any, index: number) => ({
      questionId: `sound-round-${index + 1}`,
      number: index + 1,
      questionText: 'Which picture matches the sound you heard?',
      options: Array.isArray(row?.options) ? row.options.slice(0, 8).map((option: unknown) => String(option).slice(0, 100)) : [],
      correctAnswer: String(row?.correctAnswer || 'Unknown sound').slice(0, 100),
      answer: String(row?.studentAnswer || 'Not answered').slice(0, 100),
      correct: Boolean(row?.correct),
      points: row?.correct ? 25 : 0,
      timeTaken: Math.max(0, Math.round((Number(row?.responseTimeMs) || 0) / 1000)),
    })) : [];

    const cognitiveAnalytics = {
      roundsPlayed,
      correctResponses,
      incorrectResponses,
      averageResponseTime,
      listeningScore,
      auditoryRecognitionScore,
      completionPercentage,
      overallScore,
      highestDifficulty,
      completionStatus,
    };

    await this.prisma.gameRuntimeSession.update({
      where: { id: session.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        score: overallScore,
        elapsedSeconds,
        runtimeState: {
          ...((session.runtimeState || {}) as Record<string, unknown>),
          cognitiveAnalytics,
          answers: roundResponses,
          correct: roundResponses.filter((row: any) => row.correct).length,
          incorrect: roundResponses.filter((row: any) => !row.correct).length,
        } as Prisma.InputJsonValue,
      },
    });

    await this.event(session.id, 'SOUND_DETECTIVE_COMPLETED', {
      ...cognitiveAnalytics,
      capturedRounds: roundResponses.length,
      roundResponses,
    });
    return { state: await this.state(session.id, schoolId, user) };
  }

  private async colorPathComplete(session: any, payload: unknown, schoolId: string, user: { id: string; role: Role }) {
    if (session.engine.engineKey !== 'COLOR_PATH' || !['RUNNING', 'PAUSED'].includes(session.status)) throw new BadRequestException('Color Path metrics require an active Color Path session.');
    const input = (payload || {}) as Record<string, any>;
    const number = (key: string, maximum = 100000) => Math.max(0, Math.min(maximum, Number(input[key]) || 0));
    const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value * 10) / 10));
    const roundsPlayed = number('roundsPlayed', 1000);
    const correctSelections = Math.min(roundsPlayed, number('correctSelections', 1000));
    const incorrectSelections = Math.min(roundsPlayed, number('incorrectSelections', 1000));
    const averageResponseTime = number('averageResponseTime', 60000);
    const highestDifficulty = Math.min(4, Math.max(1, number('highestDifficulty', 4)));
    const elapsedSeconds = Math.min(60, number('elapsedSeconds', 60));
    const totalSelections = correctSelections + incorrectSelections;
    const observationAccuracy = clamp(totalSelections ? correctSelections / totalSelections * 100 : 0);
    const difficultyProgress = highestDifficulty / 4 * 100;
    const completionPercentage = clamp(roundsPlayed / 4 * 100);
    const visualRecognitionScore = clamp(observationAccuracy * .82 + difficultyProgress * .18);
    const observationScore = clamp(observationAccuracy * .72 + difficultyProgress * .18 + completionPercentage * .1);
    const overallScore = clamp((visualRecognitionScore + observationScore) / 2);
    const completionStatus = roundsPlayed >= 4 ? 'COMPLETED' : 'INCOMPLETE';
    const cognitiveAnalytics = { roundsPlayed, correctSelections, incorrectSelections, averageResponseTime, observationAccuracy, observationScore, visualRecognitionScore, highestDifficulty, completionPercentage, overallScore, completionStatus };
    await this.prisma.gameRuntimeSession.update({ where: { id: session.id }, data: { status: 'COMPLETED', completedAt: new Date(), score: overallScore, elapsedSeconds, runtimeState: { ...((session.runtimeState || {}) as Record<string, unknown>), cognitiveAnalytics } as Prisma.InputJsonValue } });
    await this.event(session.id, 'COLOR_PATH_COMPLETED', cognitiveAnalytics);
    return { state: await this.state(session.id, schoolId, user) };
  }

  private async magicPaintComplete(session: any, payload: unknown, schoolId: string, user: { id: string; role: Role }) {
    if (session.engine.engineKey !== 'MAGIC_PAINT' || !['RUNNING', 'PAUSED'].includes(session.status)) throw new BadRequestException('Magic Paint metrics require an active Magic Paint session.');
    const input=(payload||{}) as Record<string,any>; const number=(key:string,max=100000)=>Math.max(0,Math.min(max,Number(input[key])||0)); const clamp=(value:number)=>Math.max(0,Math.min(100,Math.round(value*10)/10));
    const objectsCompleted=number('objectsCompleted',1000); const colorsUsed=Array.isArray(input.colorsUsed)?[...new Set(input.colorsUsed.map(String))].slice(0,7):[]; const interactionsPerObject=Array.isArray(input.interactionsPerObject)?input.interactionsPerObject.map((n:unknown)=>Math.max(0,Math.min(100,Number(n)||0))).slice(0,1000):[];
    const averageCompletionTime=number('averageCompletionTime',120000); const interactionConsistency=clamp(number('interactionConsistency',100)); const completionPercentage=clamp(number('completionPercentage',100)); const creativityScore=clamp(number('creativityScore',100)); const causeEffectScore=clamp(number('causeEffectScore',100)); const overallScore=clamp((creativityScore+causeEffectScore)/2); const elapsedSeconds=Math.min(120,number('elapsedSeconds',120)); const completionStatus=objectsCompleted>=5||elapsedSeconds>=119?'COMPLETED':'ENDED';
    const cognitiveAnalytics={objectsCompleted,colorsUsed,interactionsPerObject,averageCompletionTime,interactionConsistency,completionPercentage,creativityScore,causeEffectScore,overallScore,completionStatus};
    await this.prisma.gameRuntimeSession.update({where:{id:session.id},data:{status:'COMPLETED',completedAt:new Date(),score:overallScore,elapsedSeconds,runtimeState:{...((session.runtimeState||{}) as Record<string,unknown>),cognitiveAnalytics} as Prisma.InputJsonValue}}); await this.event(session.id,'MAGIC_PAINT_COMPLETED',cognitiveAnalytics); return {state:await this.state(session.id,schoolId,user)};
  }

  private async magicPaintProgress(session: any, payload: unknown, schoolId: string, user: { id: string; role: Role }) {
    if (session.engine.engineKey !== 'MAGIC_PAINT' || session.status !== 'RUNNING') throw new BadRequestException('Magic Paint progress requires an active session.');
    const input = (payload || {}) as Record<string, any>;
    const number = (key: string, max = 100000) => Math.max(0, Math.min(max, Number(input[key]) || 0));
    const livePerformance = {
      objectsCompleted: number('objectsCompleted', 1000),
      colorsUsed: Array.isArray(input.colorsUsed) ? [...new Set(input.colorsUsed.map(String))].slice(0, 7) : [],
      interactionsPerObject: Array.isArray(input.interactionsPerObject) ? input.interactionsPerObject.map((value: unknown) => Math.max(0, Math.min(100, Number(value) || 0))).slice(0, 1000) : [],
      averageCompletionTime: number('averageCompletionTime', 120000),
      interactionConsistency: number('interactionConsistency', 100),
      completionPercentage: number('completionPercentage', 100),
      creativityScore: number('creativityScore', 100),
      causeEffectScore: number('causeEffectScore', 100),
      overallScore: number('overallScore', 100),
      completionStatus: 'IN PROGRESS',
    };
    const elapsedSeconds = Math.min(120, number('elapsedSeconds', 120));
    await this.prisma.gameRuntimeSession.update({ where: { id: session.id }, data: {
      score: livePerformance.overallScore,
      elapsedSeconds,
      runtimeState: { ...((session.runtimeState || {}) as Record<string, unknown>), livePerformance } as Prisma.InputJsonValue,
    } });
    await this.event(session.id, 'MAGIC_PAINT_PROGRESS', { objectsCompleted: livePerformance.objectsCompleted, elapsedSeconds });
    return { state: await this.state(session.id, schoolId, user) };
  }

  private async trainTrackComplete(session: any, payload: unknown, schoolId: string, user: { id: string; role: Role }) {
    if (session.engine.engineKey !== 'TRAIN_TRACK_BUILDER' || !['RUNNING', 'PAUSED'].includes(session.status)) throw new BadRequestException('Train Track Builder metrics require an active session.');
    const input=(payload||{}) as Record<string,any>;const number=(key:string,max=100000)=>Math.max(0,Math.min(max,Number(input[key])||0));const clamp=(value:number)=>Math.max(0,Math.min(100,Math.round(value*10)/10));
    const roundsPlayed=number('roundsPlayed',1000),tracksCompleted=number('tracksCompleted',10000),successfulRoutes=Math.min(roundsPlayed,number('successfulRoutes',1000)),correctRotations=number('correctRotations',10000),incorrectRotations=number('incorrectRotations',10000),averageCompletionTime=number('averageCompletionTime',120000),highestDifficulty=Math.min(7,Math.max(1,number('highestDifficulty',7))),elapsedSeconds=Math.min(120,number('elapsedSeconds',120));
    const rotations=correctRotations+incorrectRotations,logicalAccuracy=clamp(rotations?correctRotations/rotations*100:0),routeRate=roundsPlayed?successfulRoutes/roundsPlayed*100:0,difficulty=highestDifficulty/7*100,completionPercentage=clamp(roundsPlayed/7*100),logicalThinkingScore=clamp(logicalAccuracy*.55+routeRate*.3+difficulty*.15),causeEffectScore=clamp(routeRate*.48+logicalAccuracy*.32+completionPercentage*.2),overallScore=clamp((logicalThinkingScore+causeEffectScore)/2),completionStatus=elapsedSeconds>=119||roundsPlayed>=7?'COMPLETED':'PARTIAL';
    const cognitiveAnalytics={roundsPlayed,tracksCompleted,successfulRoutes,correctRotations,incorrectRotations,averageCompletionTime,highestDifficulty,logicalAccuracy,logicalThinkingScore,causeEffectScore,completionPercentage,overallScore,completionStatus};
    await this.prisma.gameRuntimeSession.update({where:{id:session.id},data:{status:'COMPLETED',completedAt:new Date(),score:overallScore,elapsedSeconds,runtimeState:{...((session.runtimeState||{}) as Record<string,unknown>),cognitiveAnalytics} as Prisma.InputJsonValue}});await this.event(session.id,'TRAIN_TRACK_COMPLETED',cognitiveAnalytics);return{state:await this.state(session.id,schoolId,user)};
  }

  private async packageSorterComplete(session: any, payload: unknown, schoolId: string, user: { id: string; role: Role }) {
    if (session.engine.engineKey !== 'PACKAGE_SORTER' || !['RUNNING', 'PAUSED'].includes(session.status)) throw new BadRequestException('Package Sorter metrics require an active session.');
    const input = (payload || {}) as Record<string, any>;
    const number = (key: string, max = 100000) => Math.max(0, Math.min(max, Number(input[key]) || 0));
    const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value * 10) / 10));

    const roundsPlayed = number('roundsPlayed', 1000);
    const packagesSorted = number('packagesSorted', 10000);
    const correctDeliveries = number('correctDeliveries', 10000);
    const incorrectDeliveries = number('incorrectDeliveries', 10000);
    const averageDecisionTime = number('averageDecisionTime', 60000);
    const highestDifficulty = Math.min(5, Math.max(1, number('highestDifficulty', 5)));
    const elapsedSeconds = Math.min(120, number('elapsedSeconds', 120));

    const accuracy = packagesSorted ? (correctDeliveries / packagesSorted) * 100 : 0;
    const completionPercentage = clamp((elapsedSeconds / 120) * 100);

    const organizationScore = clamp(accuracy * 0.8 + (roundsPlayed / 5) * 20);
    const decisionSpeedScore = clamp(100 - Math.max(0, averageDecisionTime - 1200) / 15);
    const decisionMakingScore = clamp(accuracy * 0.6 + decisionSpeedScore * 0.4);

    const overallScore = clamp((organizationScore + decisionMakingScore) / 2);
    const completionStatus = elapsedSeconds >= 119 || roundsPlayed >= 5 ? 'COMPLETED' : 'PARTIAL';

    const cognitiveAnalytics = {
      roundsPlayed,
      packagesSorted,
      correctDeliveries,
      incorrectDeliveries,
      averageDecisionTime,
      highestDifficulty,
      sortingAccuracy: accuracy,
      organizationScore,
      decisionMakingScore,
      completionPercentage,
      overallScore,
      completionStatus,
    };

    await this.prisma.gameRuntimeSession.update({
      where: { id: session.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        score: overallScore,
        elapsedSeconds,
        runtimeState: {
          ...((session.runtimeState || {}) as Record<string, unknown>),
          cognitiveAnalytics,
        } as Prisma.InputJsonValue,
      },
    });

    await this.event(session.id, 'PACKAGE_SORTER_COMPLETED', cognitiveAnalytics);
    return { state: await this.state(session.id, schoolId, user) };
  }

  private async rescueMissionComplete(session: any, payload: unknown, schoolId: string, user: { id: string; role: Role }) {
    if (session.engine.engineKey !== 'RESCUE_MISSION' || !['RUNNING', 'PAUSED'].includes(session.status)) throw new BadRequestException('Rescue Mission metrics require an active session.');
    const input = (payload || {}) as Record<string, any>;
    const number = (key: string, max = 100000) => Math.max(0, Math.min(max, Number(input[key]) || 0));
    const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value * 10) / 10));
    const missionsStarted = number('missions_started', 1000);
    const missionsCompleted = Math.min(missionsStarted, number('missions_completed', 1000));
    const successfulRescues = Math.min(missionsCompleted, number('successful_rescues', 1000));
    const unsuccessfulActions = number('unsuccessful_actions', 10000);
    const strategyChanges = number('strategy_changes', 10000);
    const successfulStrategyChanges = Math.min(strategyChanges, number('successful_strategy_changes', 10000));
    const averageDecisionTime = number('average_decision_time', 120000);
    const averageSolutionTime = number('average_solution_time', 120000);
    const highestDifficulty = Math.min(6, Math.max(1, number('highest_difficulty', 6)));
    const elapsedSeconds = Math.min(120, number('elapsed_seconds', 120));
    const completionRate = missionsStarted ? missionsCompleted / missionsStarted : 0;
    const actionEfficiency = successfulRescues + unsuccessfulActions ? successfulRescues / (successfulRescues + unsuccessfulActions) : 0;
    const recovery = strategyChanges ? successfulStrategyChanges / strategyChanges : (unsuccessfulActions ? 0 : 1);
    const difficultyProgress = highestDifficulty / 6;
    const problemSolvingScore = clamp((completionRate * .42 + actionEfficiency * .36 + difficultyProgress * .22) * 100);
    const cognitiveFlexibilityScore = clamp((recovery * .58 + Math.min(1, strategyChanges / 4) * .22 + difficultyProgress * .2) * 100);
    const completionPercentage = clamp(Math.max(missionsStarted / 4, elapsedSeconds / 120) * 100);
    const overallScore = clamp((problemSolvingScore + cognitiveFlexibilityScore) / 2);
    const completionStatus = missionsStarted >= 4 || elapsedSeconds >= 119 ? 'COMPLETED' : 'PARTIAL';
    const cognitiveAnalytics = { missionsStarted, missionsCompleted, successfulRescues, unsuccessfulActions, strategyChanges, successfulStrategyChanges, averageDecisionTime, averageSolutionTime, highestDifficulty, problemSolvingScore, cognitiveFlexibilityScore, completionPercentage, overallScore, completionStatus };
    await this.prisma.gameRuntimeSession.update({ where: { id: session.id }, data: { status: 'COMPLETED', completedAt: new Date(), score: overallScore, elapsedSeconds, runtimeState: { ...((session.runtimeState || {}) as Record<string, unknown>), cognitiveAnalytics } as Prisma.InputJsonValue } });
    await this.event(session.id, 'RESCUE_MISSION_COMPLETED', cognitiveAnalytics);
    return { state: await this.state(session.id, schoolId, user) };
  }

  private async parkingEscapeComplete(session: any, payload: unknown, schoolId: string, user: { id: string; role: Role }) {
    if (session.engine.engineKey !== 'PARKING_ESCAPE' || !['RUNNING', 'PAUSED'].includes(session.status)) throw new BadRequestException('Parking Escape metrics require an active session.');
    const input = (payload || {}) as Record<string, any>;
    const number = (key: string, max = 100000) => Math.max(0, Math.min(max, Number(input[key]) || 0));
    const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value * 10) / 10));
    const levelsStarted = number('levels_started', 100), levelsCompleted = Math.min(levelsStarted, number('levels_completed', 100));
    const targetCarsEscaped = Math.min(levelsCompleted, number('target_cars_escaped', 100));
    const totalVehicleMoves = number('total_vehicle_moves'), efficientMoves = Math.min(totalVehicleMoves, number('efficient_moves'));
    const unnecessaryMoves = Math.min(totalVehicleMoves, number('unnecessary_moves'));
    const highestLevel = Math.min(4, Math.max(1, number('highest_level', 4)));
    const averageLevelCompletionTime = number('average_level_completion_time', 120);
    const moveEfficiency = totalVehicleMoves ? efficientMoves / totalVehicleMoves : 0;
    const escapeRate = levelsStarted ? targetCarsEscaped / levelsStarted : 0;
    const strategicPlanningScore = clamp((moveEfficiency * .55 + escapeRate * .3 + highestLevel / 4 * .15) * 100);
    const spatialReasoningScore = clamp((escapeRate * .55 + moveEfficiency * .3 + highestLevel / 4 * .15) * 100);
    const completionPercentage = clamp(Math.max(levelsCompleted / 4, number('completion_percentage') / 100) * 100);
    const overallScore = clamp((strategicPlanningScore + spatialReasoningScore) / 2);
    const completionStatus = String(input.completionStatus || 'COMPLETED');
    const cognitiveAnalytics = { levelsStarted, levelsCompleted, targetCarsEscaped, totalVehicleMoves, efficientMoves, unnecessaryMoves, averageLevelCompletionTime, highestLevel, strategicPlanningScore, spatialReasoningScore, completionPercentage, overallScore, completionStatus };
    await this.prisma.gameRuntimeSession.update({ where: { id: session.id }, data: { status: 'COMPLETED', completedAt: new Date(), score: overallScore, elapsedSeconds: 120, runtimeState: { ...((session.runtimeState || {}) as Record<string, unknown>), cognitiveAnalytics } as Prisma.InputJsonValue } });
    await this.event(session.id, 'PARKING_ESCAPE_COMPLETED', cognitiveAnalytics);
    return { state: await this.state(session.id, schoolId, user) };
  }

  private async waterPipelineComplete(session: any, payload: unknown, schoolId: string, user: { id: string; role: Role }) {
    if (session.engine.engineKey !== 'WATER_PIPELINE' || !['RUNNING', 'PAUSED'].includes(session.status)) throw new BadRequestException('Water Pipeline metrics require an active session.');
    const input=(payload||{}) as Record<string,any>,number=(key:string,max=100000)=>Math.max(0,Math.min(max,Number(input[key])||0)),clamp=(value:number)=>Math.max(0,Math.min(100,Math.round(value*10)/10));
    const levelsStarted=number('levels_started',4),levelsCompleted=Math.min(levelsStarted,number('levels_completed',4)),pipesRotated=number('pipes_rotated'),successfulConnections=number('successful_connections'),failedConnections=number('failed_connections'),completedPipelines=Math.min(levelsCompleted,number('completed_pipelines',4)),averageSolutionTime=number('average_solution_time',120),averageRotationsPerLevel=number('average_rotations_per_level'),highestLevel=Math.min(4,Math.max(1,number('highest_level',4))),attempts=successfulConnections+failedConnections,accuracy=attempts?successfulConnections/attempts:0,completion=completedPipelines/4,efficiency=averageRotationsPerLevel?Math.min(1,8/averageRotationsPerLevel):0;
    const logicalReasoningScore=clamp((accuracy*.38+completion*.42+highestLevel/4*.2)*100),problemSolvingScore=clamp((efficiency*.4+completion*.45+(failedConnections?Math.min(1,completedPipelines/failedConnections):1)*.15)*100),completionPercentage=clamp(levelsCompleted/4*100),overallScore=clamp((logicalReasoningScore+problemSolvingScore)/2),completionStatus=String(input.completionStatus||'COMPLETED');
    const cognitiveAnalytics={levelsStarted,levelsCompleted,pipesRotated,successfulConnections,failedConnections,completedPipelines,averageSolutionTime,averageRotationsPerLevel,highestLevel,logicalReasoningScore,problemSolvingScore,completionPercentage,overallScore,completionStatus};
    await this.prisma.gameRuntimeSession.update({where:{id:session.id},data:{status:'COMPLETED',completedAt:new Date(),score:overallScore,elapsedSeconds:120,runtimeState:{...((session.runtimeState||{}) as Record<string,unknown>),cognitiveAnalytics}as Prisma.InputJsonValue}});await this.event(session.id,'WATER_PIPELINE_COMPLETED',cognitiveAnalytics);return{state:await this.state(session.id,schoolId,user)};
  }


  private async securityViolation(session: any, payload: unknown, schoolId: string, user: { id: string; role: Role }) {
    if (session.status !== 'RUNNING') throw new BadRequestException('Security violations can only be logged during an active assessment.');
    const details = (payload || {}) as Record<string, unknown>;
    const type = details.type === 'fullscreen_exit' ? 'fullscreen_exit' : 'tab_switch';
    const runtime = (session.runtimeState || {}) as Record<string, any>;
    const current = (runtime.security || {}) as Record<string, number>;
    const totalWarnings = Number(current.totalWarnings || 0) + 1;
    const security = {
      totalWarnings,
      tabSwitchCount: Number(current.tabSwitchCount || 0) + (type === 'tab_switch' ? 1 : 0),
      fullscreenExitCount: Number(current.fullscreenExitCount || 0) + (type === 'fullscreen_exit' ? 1 : 0),
    };
    const terminated = totalWarnings >= 3;
    await this.prisma.gameRuntimeSession.update({
      where: { id: session.id },
      data: {
        runtimeState: { ...runtime, security } as Prisma.InputJsonValue,
        ...(terminated && { status: 'COMPLETED', completedAt: new Date() }),
      },
    });
    await this.event(session.id, type === 'fullscreen_exit' ? 'FULLSCREEN_EXIT' : 'TAB_CHANGED', {
      ...details,
      ...security,
      terminated,
    });
    return this.state(session.id, schoolId, user);
  }

  private async recordingStopped(session: any, schoolId: string, user: { id: string; role: Role }) {
    if (session.status !== 'RUNNING') return this.state(session.id, schoolId, user);
    const runtime = (session.runtimeState || {}) as Record<string, any>;
    const current = (runtime.security || {}) as Record<string, number>;
    const security = {
      ...current,
      totalWarnings: Number(current.totalWarnings || 0) + 1,
      recordingStopped: true,
    };
    await this.prisma.gameRuntimeSession.update({
      where: { id: session.id },
      data: {
        status: 'PAUSED',
        pausedAt: new Date(),
        runtimeState: { ...runtime, security, interruptionReason: 'SCREEN_RECORDING_STOPPED' } as Prisma.InputJsonValue,
      },
    });
    await this.event(session.id, 'SCREEN_RECORDING_STOPPED', { security, paused: true });
    return this.state(session.id, schoolId, user);
  }

  private async answer(session: any, answer: string, timeTaken: number, schoolId: string, user: { id: string; role: Role }) {
    if (session.status !== 'RUNNING') throw new BadRequestException('Start or resume the game before answering.');
    const question = await this.currentQuestion(session);
    const logicMissionComplete = session.engine.engineKey === 'LOGIC_GAME' && answer === '__LOGIC_MISSION_CORRECT__';
    const correct = logicMissionComplete || answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
    const config = session.configuration as any;
    const points = correct ? Number(config?.scoringRules?.correct ?? 10) : Number(config?.scoringRules?.incorrect ?? 0);
    const runtime = (session.runtimeState || {}) as any;
    const answers = [...(runtime.answers || []), { questionId: question.id, answer, correct, points, timeTaken }];
    const nextIndex = session.currentIndex + 1;
    const completed = nextIndex >= session.questionIds.length;
    await this.prisma.gameRuntimeSession.update({ where: { id: session.id }, data: {
      currentIndex: nextIndex, score: { increment: points }, livesRemaining: correct ? undefined : { decrement: 1 },
      elapsedSeconds: { increment: Math.max(timeTaken, 0) },
      runtimeState: { answers, correct: Number(runtime.correct || 0) + (correct ? 1 : 0), incorrect: Number(runtime.incorrect || 0) + (correct ? 0 : 1) },
      ...(completed && { status: 'COMPLETED', completedAt: new Date() }),
    } });
    await this.event(session.id, 'ANSWER_SUBMITTED', { questionId: question.id, correct, points, timeTaken });
    if (['ADVENTURE_GAME', 'BOARD_GAME', 'DRAG_DROP', 'LOGIC_GAME', 'RACING_GAME', 'SORTING_GAME', 'TREASURE_HUNT'].includes(session.engine.engineKey)) {
      return { state: await this.state(session.id, schoolId, user) };
    }
    return { correct, points, explanation: question.explanation, state: await this.state(session.id, schoolId, user) };
  }

  private async mazeProgress(session: any, payload: unknown, schoolId: string, user: { id: string; role: Role }) {
    if (session.engine.engineKey !== 'MAZE' || session.status !== 'RUNNING') throw new BadRequestException('Maze progress requires a running maze.');
    const runtime = (session.runtimeState || {}) as any;
    const maze = runtime.maze;
    const progress = (payload || {}) as any;
    if (!maze || !Number.isInteger(progress.row) || !Number.isInteger(progress.col)) throw new BadRequestException('Invalid maze progress.');
    const cell = maze.cells?.find((entry: any) => entry.row === progress.row && entry.col === progress.col);
    if (!cell) throw new BadRequestException('Maze position is outside the board.');
    const savedMaze = {
      ...maze,
      player: { row: progress.row, col: progress.col },
      collected: Array.isArray(progress.collected) ? progress.collected.slice(0, 32) : maze.collected,
      sequenceIndex: Math.max(0, Number(progress.sequenceIndex || 0)),
      activatedSwitches: Array.isArray(progress.switches) ? progress.switches.slice(0, 16) : (maze.activatedSwitches || []),
      completedChallenges: Array.isArray(progress.completedChallenges) ? progress.completedChallenges.slice(0, session.questionIds.length) : (maze.completedChallenges || []),
      moves: Math.max(0, Number(progress.moves || 0)),
    };
    await this.prisma.gameRuntimeSession.update({
      where: { id: session.id },
      data: { runtimeState: { ...runtime, maze: savedMaze } as Prisma.InputJsonValue, lastHeartbeatAt: new Date() },
    });
    await this.event(session.id, 'MAZE_PROGRESS_SAVED', { row: progress.row, col: progress.col, moves: savedMaze.moves });
    return this.state(session.id, schoolId, user);
  }

  private async mazeAnswer(session: any, payload: unknown, schoolId: string, user: { id: string; role: Role }) {
    if (session.engine.engineKey !== 'MAZE' || session.status !== 'RUNNING') throw new BadRequestException('Maze questions require a running maze.');
    const runtime = (session.runtimeState || {}) as any;
    const maze = runtime.maze;
    const attempt = (payload || {}) as any;
    const challenge = maze?.challenges?.find((item: any) => item.id === attempt.challengeId);
    if (!challenge) throw new BadRequestException('Maze question checkpoint was not found.');
    const completedChallenges = maze.completedChallenges || [];
    if (completedChallenges.includes(challenge.id)) return { state: await this.state(session.id, schoolId, user) };
    const question = await this.prisma.gameAIQuestion.findUnique({ where: { id: challenge.questionId } });
    if (!question) throw new NotFoundException('Generated maze question was not found.');
    const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[^\p{L}\p{N}.%-]+/gu, ' ');
    const correct = normalize(attempt.answer) === normalize(question.correctAnswer);
    const config = session.configuration as any;
    const points = correct ? Number(config?.scoringRules?.correct ?? 10) : Number(config?.scoringRules?.incorrect ?? 0);
    const answers = [...(runtime.answers || []), {
      questionId: question.id,
      answer: String(attempt.answer || ''),
      correct,
      points,
      timeTaken: Number(attempt.timeTaken || 0),
    }];
    const nextCompleted = [...completedChallenges, challenge.id];
    await this.prisma.gameRuntimeSession.update({
      where: { id: session.id },
      data: {
        score: { increment: points },
        currentIndex: Math.min(session.currentIndex + 1, session.questionIds.length),
        livesRemaining: correct ? undefined : { decrement: 1 },
        elapsedSeconds: { increment: Math.max(0, Number(attempt.timeTaken || 0)) },
        runtimeState: {
          ...runtime,
          answers,
          correct: Number(runtime.correct || 0) + (correct ? 1 : 0),
          incorrect: Number(runtime.incorrect || 0) + (correct ? 0 : 1),
          maze: { ...maze, completedChallenges: nextCompleted },
        } as Prisma.InputJsonValue,
      },
    });
    await this.event(session.id, 'MAZE_QUESTION_ATTEMPTED', { questionId: question.id, challengeId: challenge.id, correct, points });
    return { state: await this.state(session.id, schoolId, user) };
  }

  private async mazeComplete(session: any, payload: unknown, schoolId: string, user: { id: string; role: Role }) {
    if (session.engine.engineKey !== 'MAZE' || session.status !== 'RUNNING') throw new BadRequestException('Maze completion requires a running maze.');
    const runtime = (session.runtimeState || {}) as any;
    const maze = runtime.maze;
    const result = (payload || {}) as any;
    if (!maze || result.row !== maze.exit.row || result.col !== maze.exit.col) throw new BadRequestException('Reach the maze exit before submitting.');
    const requiredIds = (maze.collectibles || []).filter((item: any) => item.required).map((item: any) => item.id);
    if (requiredIds.some((id: string) => !result.collected?.includes(id))) throw new BadRequestException('Complete every maze objective before exiting.');
    if (maze.type === 'NUMBER' && Number(result.sequenceIndex) < requiredIds.length) throw new BadRequestException('Complete the number sequence before exiting.');
    if (maze.type === 'LOGIC' && (maze.switches || []).some((item: any) => !result.switches?.includes(item.id))) throw new BadRequestException('Unlock every maze door before exiting.');
    const completedChallenges = result.completedChallenges || maze.completedChallenges || [];
    if ((maze.challenges || []).some((item: any) => !completedChallenges.includes(item.id))) throw new BadRequestException('Complete every generated question checkpoint before exiting.');
    const config = session.configuration as any;
    const pointsEach = Number(config?.scoringRules?.correct ?? 10);
    const total = session.questionIds.length;
    const hasQuestionChallenges = Array.isArray(maze.challenges) && maze.challenges.length > 0;
    const answers = hasQuestionChallenges ? (runtime.answers || []) : session.questionIds.map((questionId: string) => ({ questionId, answer: 'MAZE_COMPLETED', correct: true, points: pointsEach, timeTaken: 0 }));
    const elapsed = Math.max(0, Number(result.timeTaken || 0));
    await this.prisma.gameRuntimeSession.update({
      where: { id: session.id },
      data: {
        currentIndex: total,
        score: hasQuestionChallenges ? session.score : pointsEach * total,
        elapsedSeconds: elapsed,
        status: 'COMPLETED',
        completedAt: new Date(),
        runtimeState: { ...runtime, answers, correct: hasQuestionChallenges ? Number(runtime.correct || 0) : total, maze: { ...maze, player: maze.exit, completed: true, collected: result.collected || [], activatedSwitches: result.switches || [], completedChallenges, moves: Number(result.moves || 0) } } as Prisma.InputJsonValue,
      },
    });
    await this.event(session.id, 'MAZE_COMPLETED', { moves: result.moves, elapsedSeconds: elapsed, mazeType: maze.type });
    return this.state(session.id, schoolId, user);
  }

  private async memoryComplete(session: any, payload: unknown, schoolId: string, user: { id: string; role: Role }) {
    if (session.engine.engineKey !== 'MEMORY_MATCH' || session.status !== 'RUNNING') throw new BadRequestException('Memory completion requires a running Memory Game.');
    const question = await this.currentQuestion(session);
    const response = (payload || {}) as any;
    const presentation = this.memoryPresentation(question, session.currentIndex);
    const valid = this.validateMemoryResponse(presentation, response);
    if (!valid) throw new BadRequestException('Complete the memory interaction before continuing.');
    const config = session.configuration as any;
    const points = Number(config?.scoringRules?.correct ?? 10);
    const runtime = (session.runtimeState || {}) as any;
    const answerRecord = {
      questionId: question.id,
      answer: { gameType: presentation.type, response: response.response },
      correct: true,
      points,
      timeTaken: Math.max(0, Number(response.timeTaken || 0)),
    };
    const nextIndex = session.currentIndex + 1;
    const completed = nextIndex >= session.questionIds.length;
    await this.prisma.gameRuntimeSession.update({
      where: { id: session.id },
      data: {
        currentIndex: nextIndex,
        score: { increment: points },
        elapsedSeconds: { increment: answerRecord.timeTaken },
        runtimeState: {
          ...runtime,
          answers: [...(runtime.answers || []), answerRecord],
          correct: Number(runtime.correct || 0) + 1,
          memoryProgress: { completedQuestionIds: [...(runtime.memoryProgress?.completedQuestionIds || []), question.id] },
        } as Prisma.InputJsonValue,
        ...(completed && { status: 'COMPLETED', completedAt: new Date() }),
      },
    });
    await this.event(session.id, 'MEMORY_CHALLENGE_COMPLETED', { questionId: question.id, gameType: presentation.type, points });
    return this.state(session.id, schoolId, user);
  }

  private async createMaze(configuration: Record<string, any>, questions: any[]) {
    const grade = String(configuration.grade || 'Grade 5');
    const difficulty = String(configuration.difficulty || questions[0]?.difficulty || 'MEDIUM').toUpperCase();
    const gradeNumber = Math.max(1, Math.min(12, Number(grade.match(/\d+/)?.[0] || 5)));
    const difficultyBoost = difficulty === 'HARD' ? 3 : difficulty === 'EASY' ? 0 : 2;
    const size = Math.max(7, Math.min(19, 7 + Math.floor((gradeNumber - 1) / 2) * 2 + difficultyBoost));
    const normalizedSize = size % 2 === 0 ? size + 1 : size;
    const types = ['CLASSIC', 'COLLECT_EXIT', 'NUMBER', 'SHAPE', 'LOGIC'];
    const themes = [
      { id: 'forest', name: 'Enchanted Forest', accent: '#69f0ad', glow: '#3fd79b' },
      { id: 'crystal', name: 'Crystal Cave', accent: '#8de8ff', glow: '#a875ff' },
      { id: 'ice', name: 'Frozen Labyrinth', accent: '#c5f7ff', glow: '#62bfff' },
      { id: 'jungle', name: 'Jungle Temple', accent: '#b6ed72', glow: '#43c878' },
      { id: 'ruins', name: 'Ancient Ruins', accent: '#ffd078', glow: '#e98b4e' },
      { id: 'space', name: 'Orbital Station', accent: '#80e8ff', glow: '#9d70ff' },
      { id: 'castle', name: 'Magic Castle', accent: '#e2a8ff', glow: '#8d72ff' },
      { id: 'underwater', name: 'Sunken Kingdom', accent: '#66f4e2', glow: '#35a9e8' },
      { id: 'desert', name: 'Desert Pyramid', accent: '#ffe073', glow: '#ff994d' },
      { id: 'volcano', name: 'Volcano Vault', accent: '#ffb066', glow: '#ff4f4f' },
    ];
    const type = types[this.randomInt(types.length)];
    const theme = themes[this.randomInt(themes.length)];
    const cells = this.carveMaze(normalizedSize);
    const start = cells[this.randomInt(cells.length)];
    const distances = this.mazeDistances(cells, start);
    const exit = [...cells].sort((a, b) => (distances.get(`${b.row}:${b.col}`) || 0) - (distances.get(`${a.row}:${a.col}`) || 0))[0];
    const candidates = cells.filter((cell) => !(cell.row === start.row && cell.col === start.col) && !(cell.row === exit.row && cell.col === exit.col));
    this.shuffle(candidates);
    const challenges = questions.map((question, index) => ({
      id: `challenge-${index + 1}`,
      questionId: question.id,
      questionText: question.questionText,
      difficulty: question.difficulty,
      pageNumber: question.pageNumber,
      options: question.options.map((option: any) => ({
        id: option.id,
        optionKey: option.optionKey,
        optionText: option.optionText,
      })),
      row: candidates[index % candidates.length].row,
      col: candidates[index % candidates.length].col,
      index: index + 1,
    }));
    const available = candidates.slice(Math.min(challenges.length, candidates.length));
    const count = type === 'CLASSIC' ? 0 : Math.max(2, Math.min(7, Math.floor(gradeNumber / 2) + (difficulty === 'HARD' ? 2 : 1)));
    const shapes = ['circle', 'triangle', 'square', 'diamond'];
    const collectibles = available.slice(0, count + (type === 'SHAPE' ? 3 : 0)).map((cell, index) => ({
      id: `item-${index + 1}`, row: cell.row, col: cell.col,
      kind: type === 'NUMBER' ? 'number' : type === 'SHAPE' ? shapes[index % shapes.length] : 'star',
      label: type === 'NUMBER' ? String(index + 1) : type === 'SHAPE' ? shapes[index % shapes.length] : String(index + 1),
      required: type !== 'SHAPE' || index % shapes.length === 0,
      order: index + 1,
    }));
    const switches = type === 'LOGIC' ? available.slice(count + 2, count + 5).map((cell, index) => ({ id: `switch-${index + 1}`, row: cell.row, col: cell.col, order: index + 1 })) : [];
    const obstacles = available.slice(count + 6, count + 6 + Math.min(8, Math.floor(normalizedSize / 2))).map((cell, index) => ({ id: `obstacle-${index}`, row: cell.row, col: cell.col, phase: index % 3 }));
    return {
      version: 2, seed: `${Date.now()}-${this.randomInt(1_000_000)}`, type, grade, difficulty,
      title: `${theme.name} Maze`, mission: this.mazeMission(type, collectibles, switches),
      size: normalizedSize, theme, cells, start, exit, player: start, collectibles, collected: [], switches, obstacles, challenges,
      sequenceIndex: 0, activatedSwitches: [], completedChallenges: [], moves: 0, generatedBy: 'PROCEDURAL_ENGINE',
    };
  }

  private carveMaze(size: number) {
    const cells: any[] = [];
    const map = new Map<string, any>();
    for (let row = 0; row < size; row += 1) for (let col = 0; col < size; col += 1) {
      const cell = { row, col, walls: { n: true, e: true, s: true, w: true } };
      cells.push(cell); map.set(`${row}:${col}`, cell);
    }
    const visited = new Set<string>();
    const first = cells[this.randomInt(cells.length)];
    const stack = [first]; visited.add(`${first.row}:${first.col}`);
    const directions = [{ dr: -1, dc: 0, a: 'n', b: 's' }, { dr: 0, dc: 1, a: 'e', b: 'w' }, { dr: 1, dc: 0, a: 's', b: 'n' }, { dr: 0, dc: -1, a: 'w', b: 'e' }];
    while (stack.length) {
      const current = stack[stack.length - 1];
      const choices = this.shuffle([...directions]).map((direction) => ({ direction, next: map.get(`${current.row + direction.dr}:${current.col + direction.dc}`) })).filter(({ next }) => next && !visited.has(`${next.row}:${next.col}`));
      if (!choices.length) { stack.pop(); continue; }
      const { direction, next } = choices[0];
      current.walls[direction.a] = false; next.walls[direction.b] = false;
      visited.add(`${next.row}:${next.col}`); stack.push(next);
    }
    const extraOpenings = Math.floor(size * 0.7);
    for (let index = 0; index < extraOpenings; index += 1) {
      const cell = cells[this.randomInt(cells.length)], direction = directions[this.randomInt(directions.length)];
      const next = map.get(`${cell.row + direction.dr}:${cell.col + direction.dc}`);
      if (next) { cell.walls[direction.a] = false; next.walls[direction.b] = false; }
    }
    return cells;
  }

  private mazeDistances(cells: any[], start: any) {
    const map = new Map(cells.map((cell) => [`${cell.row}:${cell.col}`, cell]));
    const distances = new Map<string, number>([[`${start.row}:${start.col}`, 0]]);
    const queue = [start];
    const directions = [{ dr: -1, dc: 0, wall: 'n' }, { dr: 0, dc: 1, wall: 'e' }, { dr: 1, dc: 0, wall: 's' }, { dr: 0, dc: -1, wall: 'w' }];
    while (queue.length) {
      const current = queue.shift()!;
      for (const direction of directions) {
        if (current.walls[direction.wall]) continue;
        const key = `${current.row + direction.dr}:${current.col + direction.dc}`;
        if (map.has(key) && !distances.has(key)) { distances.set(key, (distances.get(`${current.row}:${current.col}`) || 0) + 1); queue.push(map.get(key)); }
      }
    }
    return distances;
  }

  private mazeMission(type: string, collectibles: any[], switches: any[]) {
    if (type === 'COLLECT_EXIT') return `Collect all ${collectibles.filter((item) => item.required).length} stars, then reach the portal.`;
    if (type === 'NUMBER') return `Collect numbers 1–${collectibles.length} in order, then reach the portal.`;
    if (type === 'SHAPE') return 'Collect only the glowing circles, avoid the other shapes, then reach the portal.';
    if (type === 'LOGIC') return `Activate ${switches.length} rune switches in order to unlock the portal.`;
    return 'Navigate from the start beacon to the glowing portal.';
  }

  private randomInt(max: number) {
    return max <= 1 ? 0 : randomInt(max);
  }

  private shuffle<T>(items: T[]) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swap = this.randomInt(index + 1);
      [items[index], items[swap]] = [items[swap], items[index]];
    }
    return items;
  }

  private publicQuestion(question: any, engineKey: string, questionIndex = 0) {
    return {
      id: question.id, questionText: question.questionText, questionType: question.questionType,
      difficulty: question.difficulty, pageNumber: question.pageNumber, bloomLevel: question.bloomLevel,
      options: question.options.map((option: any) => ({ id: option.id, optionKey: option.optionKey, optionText: option.optionText })),
      presentation: this.presentation(engineKey, question),
      ...(engineKey === 'MEMORY_MATCH' && { memory: this.memoryPresentation(question, questionIndex) }),
    };
  }

  private memoryPresentation(question: any, _index: number) {
    const options = (question.options || []).map((option: any) => ({
      id: option.id,
      optionKey: option.optionKey,
      text: option.optionText,
      imageUrl: option.imageUrl || option.image || null,
    }));
    const metadata = (question.metadata || question.presentationMetadata || {}) as any;
    const explicitSequence = Array.isArray(metadata.sequenceElements) ? metadata.sequenceElements : [];
    const imageObjects = options.filter((option: any) => option.imageUrl);
    const type = explicitSequence.length >= 2 ? 'SEQUENCE' : imageObjects.length >= 2 ? 'OBJECT_MEMORY' : 'CARD_FLIP';
    if (type === 'CARD_FLIP') {
      const cards = this.seededShuffle(options.map((option: any) => ({
        id: option.id,
        optionKey: option.optionKey,
        face: option.text,
        imageUrl: option.imageUrl,
      })), question.id);
      return { type, previewSeconds: 4, cards, cardCount: cards.length };
    }
    if (type === 'SEQUENCE') {
      const sequence = explicitSequence.map((item: any, sequenceIndex: number) => ({
        id: String(item.id || `${question.id}-sequence-${sequenceIndex}`),
        text: String(item.text || item.label || item),
        imageUrl: item.imageUrl || null,
      }));
      return { type, previewSeconds: Math.min(7, Math.max(3, options.length + 1)), sequence, itemCount: sequence.length };
    }
    const shown = imageObjects.map((option: any) => ({ id: option.id, text: option.text, imageUrl: option.imageUrl }));
    const words = String(question.questionText || '').split(/\s+/).map((word: string) => word.replace(/[^\p{L}\p{N}]/gu, '')).filter((word: string) => word.length > 3);
    const distractors = words.slice(0, Math.max(2, shown.length)).map((word: string, wordIndex: number) => ({ id: `distractor-${question.id}-${wordIndex}`, text: word }));
    return { type, previewSeconds: 4, shown, objects: this.seededShuffle([...shown, ...distractors], `${question.id}-objects`) };
  }

  private validateMemoryResponse(presentation: any, payload: any) {
    const response = payload?.response;
    if (presentation.type === 'CARD_FLIP') {
      return typeof response?.selectedOptionId === 'string' && presentation.cards.some((card: any) => card.id === response.selectedOptionId);
    }
    if (presentation.type === 'SEQUENCE') {
      return Array.isArray(response?.orderedIds) && response.orderedIds.join('|') === presentation.sequence.map((item: any) => item.id).join('|');
    }
    return Array.isArray(response?.selectedIds)
      && [...response.selectedIds].sort().join('|') === presentation.shown.map((item: any) => item.id).sort().join('|');
  }

  private seededShuffle<T>(items: T[], seed: string) {
    const result = [...items];
    let value = [...seed].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 2166136261);
    for (let index = result.length - 1; index > 0; index -= 1) {
      value = (value * 1664525 + 1013904223) >>> 0;
      const swap = value % (index + 1);
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
  }

  private presentation(engineKey: string, question: any) {
    const mechanics: Record<string, string> = {
      ADVENTURE_GAME: 'MAP_CHOICE', BALLOON_POP: 'POP_TARGET', BOARD_GAME: 'BOARD_MOVE',
      BUILDING_GAME: 'BUILD_STACK', DRAG_DROP: 'DRAG_TARGET', FISHING_GAME: 'CATCH_TARGET',
      LAB_SIMULATION: 'MIX_FORMULA', LOGIC_GAME: 'SOLVE_LOGIC', MATCHING_GAME: 'MATCH_PAIR',
      MAZE: 'PATH_CHOICE', MEMORY_MATCH: 'FLIP_PAIRS', PUZZLE: 'PLACE_PIECE',
      RACING_GAME: 'LANE_CHOICE', SENTENCE_BUILDER: 'BUILD_SENTENCE', SHOOTING_GAME: 'SHOOT_TARGET',
      SIMULATION_GAME: 'CONTROL_SIMULATION', SORTING_GAME: 'SORT_TARGET', STORY_GAME: 'STORY_CHOICE',
      STRATEGY_GAME: 'TACTICAL_CHOICE', TREASURE_HUNT: 'OPEN_CHEST', WORD_GAME: 'WORD_CHOICE',
    };
    const mechanic = mechanics[engineKey] || (engineKey.includes('SPORT') || engineKey.includes('BALL') || engineKey.includes('FOOTBALL') ? 'AIM_AND_SCORE' : 'SELECT_ANSWER');
    return { mechanic, prompt: question.questionText, responsive: true, keyboardEnabled: true };
  }

  private async currentQuestion(session: any) {
    const id = session.questionIds[session.currentIndex];
    const question = await this.prisma.gameAIQuestion.findUnique({ where: { id }, include: { options: { orderBy: { sequence: 'asc' } } } });
    if (!question) throw new NotFoundException('Current game question was not found.');
    return question;
  }

  private async transition(id: string, status: string, data: any, eventType: string, payload: unknown, schoolId: string, user: any) {
    await this.prisma.gameRuntimeSession.update({ where: { id }, data: { status, ...data, lastHeartbeatAt: new Date() } });
    await this.event(id, eventType, payload);
    return this.state(id, schoolId, user);
  }

  private async owned(id: string, schoolId: string, user: { id: string; role: Role }) {
    const session = await this.prisma.gameRuntimeSession.findFirst({
      where: { id, schoolId },
      include: {
        engine: true,
        generatedGame: {
          select: { id: true, title: true, description: true, engineKey: true },
        },
      },
    });
    if (!session) throw new NotFoundException('Game runtime session not found.');
    if (user.role === Role.STUDENT && session.userId !== user.id) {
      const account = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { email: true, firstName: true, lastName: true },
      });
      const studentApplication = account
        ? await this.prisma.application.findFirst({
            where: {
              id: session.userId,
              schoolId,
              status: { not: 'DRAFT' },
              OR: [
                { studentEmail: account.email },
                { studentFirstName: account.firstName, studentLastName: account.lastName },
              ],
            },
            select: { id: true },
          })
        : null;
      if (!studentApplication) throw new ForbiddenException('This game session belongs to another student.');
    }
    if (user.role === Role.PARENT) {
      const child = await this.prisma.application.findFirst({ where: { id: session.userId, schoolId, parentId: user.id }, select: { id: true } });
      if (!child) throw new ForbiddenException('This game session does not belong to your child.');
    }
    return session;
  }

  private async event(sessionId: string, eventType: string, payload?: unknown) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const latest = await this.prisma.gameRuntimeEvent.aggregate({
        where: { sessionId },
        _max: { sequence: true },
      });
      try {
        return await this.prisma.gameRuntimeEvent.create({
          data: {
            sessionId,
            eventType,
            sequence: Number(latest._max.sequence || 0) + 1,
            payload: payload as Prisma.InputJsonValue,
          },
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002' || attempt === 4) throw error;
      }
    }
    throw new ServiceUnavailableException('The game event could not be recorded.');
  }
}
