import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { GameRuntimeService } from '../game-runtime/game-runtime.service';
import { GenerateGameDto, UpdateGeneratedGameDto } from './dto/generated-game.dto';

@Injectable()
export class GeneratedGamesService {
  constructor(private readonly prisma: PrismaService, private readonly runtime: GameRuntimeService) {}

  async generate(dto: GenerateGameDto, schoolId: string, userId: string) {
    const questions = await this.validQuestions(dto.questionIds, schoolId);
    if (dto.gameAssessmentId && !await this.prisma.gameAssessment.findFirst({ where: { id: dto.gameAssessmentId, schoolId } })) throw new BadRequestException('Invalid game assessment.');
    const mapping = questions[0].gameMapping!;
    const templateId = dto.templateId || mapping.selectedTemplateId;
    const template = await this.prisma.gameTemplate.findFirst({ where: { id: templateId, schoolId, status: 'ACTIVE' }, include: { category: true } });
    if (!template) throw new BadRequestException('A valid active game template is required.');
    const engineKey = dto.engineKey || this.engineKey(template.category.name, template.name);
    const configuration = { ...((mapping.configuration as any) || {}), ...(dto.configuration || {}) };
    const snapshot = questions.map((question) => ({
      id: question.id,
      questionText: question.questionText,
      questionType: question.questionType,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      difficulty: question.difficulty,
      bloomLevel: question.bloomLevel,
      options: question.options.map((option) => ({ optionKey: option.optionKey, optionText: option.optionText, isCorrect: option.isCorrect })),
      pageNumber: question.pageNumber,
    }));
    return this.prisma.$transaction(async (tx) => {
      const game = await tx.generatedGame.create({ data: {
        schoolId, gameAssessmentId: dto.gameAssessmentId, templateId, engineKey, title: dto.title,
        description: dto.description, mappingIds: questions.map((q) => q.gameMapping!.id), questionIds: questions.map((q) => q.id),
        questionSnapshot: snapshot, configuration: configuration as Prisma.InputJsonValue,
        generationPrompt: { source: 'APPROVED_MAPPED_QUESTIONS', questionCount: questions.length }, createdById: userId,
      } });
      const versionSnapshot = this.snapshot(game);
      await tx.generatedGameVersion.create({ data: { generatedGameId: game.id, version: 1, snapshot: versionSnapshot, changeNote: 'Initial generated game', createdById: userId } });
      await tx.generatedGameAuditLog.create({ data: { generatedGameId: game.id, schoolId, actorId: userId, operation: 'GENERATED', details: { engineKey, questionCount: questions.length } } });
      return tx.generatedGame.findUnique({ where: { id: game.id }, include: this.include() });
    });
  }

  list(schoolId: string, q: any) {
    return this.prisma.generatedGame.findMany({ where: { schoolId, ...(q.status && { status: q.status }) }, include: this.include(), orderBy: { updatedAt: 'desc' } });
  }
  async details(id: string, schoolId: string) {
    const game = await this.prisma.generatedGame.findFirst({ where: { id, schoolId }, include: { ...this.include(), versions: { orderBy: { version: 'desc' } }, auditLogs: { orderBy: { createdAt: 'desc' } } } });
    if (!game) throw new NotFoundException('Generated game not found.');
    return game;
  }
  async update(id: string, dto: UpdateGeneratedGameDto, schoolId: string, userId: string) {
    const current = await this.details(id, schoolId);
    if (dto.templateId && !await this.prisma.gameTemplate.findFirst({ where: { id: dto.templateId, schoolId, status: 'ACTIVE' } })) throw new BadRequestException('Invalid game template.');
    const version = current.version + 1;
    return this.prisma.$transaction(async (tx) => {
      const game = await tx.generatedGame.update({ where: { id }, data: {
        title: dto.title, description: dto.description, templateId: dto.templateId, engineKey: dto.engineKey,
        configuration: dto.configuration as Prisma.InputJsonValue, version, status: 'DRAFT', publishedAt: null,
      } });
      await tx.generatedGameVersion.create({ data: { generatedGameId: id, version, snapshot: this.snapshot(game), changeNote: dto.changeNote || 'Teacher configuration update', createdById: userId } });
      await tx.generatedGameAuditLog.create({ data: { generatedGameId: id, schoolId, actorId: userId, operation: 'UPDATED', details: { version } } });
      return tx.generatedGame.findUnique({ where: { id }, include: this.include() });
    });
  }
  async remove(id: string, schoolId: string) {
    await this.details(id, schoolId);
    await this.prisma.generatedGame.delete({ where: { id } });
    return { deleted: true, id };
  }
  async regenerate(id: string, schoolId: string, userId: string) {
    const game = await this.details(id, schoolId);
    const version = game.version + 1;
    const rotated = game.questionIds.length > 1 ? [...game.questionIds.slice(1), game.questionIds[0]] : game.questionIds;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.generatedGame.update({ where: { id }, data: { questionIds: rotated, version, status: 'DRAFT', publishedAt: null } });
      await tx.generatedGameVersion.create({ data: { generatedGameId: id, version, snapshot: this.snapshot(updated), changeNote: 'Regenerated game sequence', createdById: userId } });
      await tx.generatedGameAuditLog.create({ data: { generatedGameId: id, schoolId, actorId: userId, operation: 'REGENERATED', details: { version } } });
      return updated;
    });
  }
  async preview(id: string, schoolId: string, userId: string) {
    const game = await this.details(id, schoolId);
    const liveQuestions = await this.prisma.gameAIQuestion.count({
      where: {
        schoolId,
        id: { in: game.questionIds },
        status: 'APPROVED',
        gameMapping: { isNot: null },
      },
    });
    if (liveQuestions !== game.questionIds.length) {
      return this.snapshotPreview(game);
    }
    const session = await this.runtime.start({ engineKey: game.engineKey, questionIds: game.questionIds, configuration: game.configuration as Record<string, unknown>, mode: 'PREVIEW' }, schoolId, userId);
    await this.prisma.gameRuntimeSession.update({ where: { id: session.id }, data: { generatedGameId: id } });
    await this.prisma.generatedGameAuditLog.create({ data: { generatedGameId: id, schoolId, actorId: userId, operation: 'PREVIEWED', details: { sessionId: session.id } } });
    return this.runtime.state(session.id, schoolId, { id: userId, role: 'TEACHER' as any });
  }
  async publish(id: string, schoolId: string, userId: string) {
    const game = await this.details(id, schoolId);
    if (!game.questionIds.length) throw new BadRequestException('A game without questions cannot be published.');
    await this.validQuestions(game.questionIds, schoolId);
    const updated = await this.prisma.generatedGame.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
    await this.prisma.generatedGameAuditLog.create({ data: { generatedGameId: id, schoolId, actorId: userId, operation: 'PUBLISHED', details: { version: game.version } } });
    return updated;
  }

  private async validQuestions(ids: string[], schoolId: string) {
    const unique = [...new Set(ids)];
    const questions = await this.prisma.gameAIQuestion.findMany({ where: { schoolId, id: { in: unique }, status: 'APPROVED', gameMapping: { isNot: null } }, include: { options: true, gameMapping: { include: { configuration: true } } } });
    if (!unique.length || questions.length !== unique.length) throw new BadRequestException('Game generation requires approved, mapped questions only.');
    for (const question of questions) {
      if (['MCQ', 'TRUE_FALSE'].includes(question.questionType)) {
        const correct = question.options.filter((option) => option.isCorrect);
        if (question.options.length < 2 || correct.length !== 1 || correct[0].optionText.trim().toLowerCase() !== question.correctAnswer.trim().toLowerCase()) {
          throw new BadRequestException(`Question "${question.questionText.slice(0, 60)}" has invalid or ambiguous answer options.`);
        }
      }
    }
    return unique.map((id) => questions.find((q) => q.id === id)!);
  }
  private engineKey(category: string, templateName: string) {
    const key = category.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    const categoryEngines: Record<string, string> = {
      ADVENTURE_GAMES: 'ADVENTURE_GAME',
      BALLOON_POP: 'BALLOON_POP',
      BOARD_GAMES: 'BOARD_GAME',
      BUILDING_GAMES: 'BUILDING_GAME',
      DRAG_AND_DROP: 'DRAG_DROP',
      FISHING_GAMES: 'FISHING_GAME',
      LAB_SIMULATION: 'LAB_SIMULATION',
      LOGICAL_THINKING_GAMES: 'LOGIC_GAME',
      MATCHING_GAMES: 'MATCHING_GAME',
      MAZE_GAMES: 'MAZE',
      MEMORY_GAMES: 'MEMORY_MATCH',
      PLAYABLE_DEMO_GAMES: 'QUIZ_CHALLENGE',
      PUZZLE_GAMES: 'PUZZLE',
      QUIZ_GAMES: 'QUIZ_CHALLENGE',
      RACING_GAMES: 'RACING_GAME',
      SENTENCE_BUILDER: 'SENTENCE_BUILDER',
      SHOOTING_GAMES: 'SHOOTING_GAME',
      SIMULATION_GAMES: 'SIMULATION_GAME',
      SORTING_GAMES: 'SORTING_GAME',
      STORY_GAMES: 'STORY_GAME',
      STRATEGY_GAMES: 'STRATEGY_GAME',
      TREASURE_HUNT: 'TREASURE_HUNT',
      WORD_GAMES: 'WORD_GAME',
    };
    if (categoryEngines[key]) return categoryEngines[key];
    const templateKey = templateName.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    return templateKey === 'FAST_TAP' ? 'QUIZ_CHALLENGE' : templateKey === 'TARGET_SHOOTER' ? 'SHOOTING_GAME' : 'QUIZ_CHALLENGE';
  }
  private snapshotPreview(game: any) {
    const snapshots = Array.isArray(game.questionSnapshot) ? game.questionSnapshot : [];
    if (!snapshots.length) {
      throw new BadRequestException('This published game has no recoverable question snapshot. Create a new game from approved questions.');
    }
    const questions = snapshots.map((question: any, questionIndex: number) => {
      const options = (Array.isArray(question.options) ? question.options : []).map((option: any, optionIndex: number) => ({
        id: `${game.id}-snapshot-${questionIndex}-option-${optionIndex}`,
        optionKey: option.optionKey || String.fromCharCode(65 + optionIndex),
        optionText: option.optionText || `Option ${optionIndex + 1}`,
      }));
      return {
        id: question.id || `${game.id}-snapshot-${questionIndex}`,
        questionText: question.questionText || `Practice question ${questionIndex + 1}`,
        questionType: question.questionType || 'MCQ',
        pageNumber: question.pageNumber,
        options,
        correctAnswer: question.correctAnswer || options.find((option: any, optionIndex: number) => question.options?.[optionIndex]?.isCorrect)?.optionText || options[0]?.optionText || '',
        presentation: { mechanic: 'SELECT_ANSWER', prompt: question.questionText, responsive: true, keyboardEnabled: true },
      };
    });
    const engineKey = game.engineKey === 'MAZE' || game.engineKey === 'MEMORY_MATCH'
      ? 'QUIZ_CHALLENGE'
      : game.engineKey;
    return {
      demo: true,
      snapshotFallback: true,
      id: `snapshot-preview-${game.id}`,
      generatedGameId: game.id,
      engine: { engineKey, name: game.title },
      configuration: game.configuration,
      status: 'READY',
      currentIndex: 0,
      currentQuestion: questions[0],
      questionCount: questions.length,
      demoQuestions: questions,
      progress: 0,
      score: 0,
      livesRemaining: Number((game.configuration as any)?.lives || 3),
      hintsRemaining: Number((game.configuration as any)?.hints || 3),
      runtimeState: { answers: [], snapshotFallback: true },
    };
  }
  private snapshot(game: any): Prisma.InputJsonValue { return JSON.parse(JSON.stringify({ title: game.title, description: game.description, templateId: game.templateId, engineKey: game.engineKey, mappingIds: game.mappingIds, questionIds: game.questionIds, questionSnapshot: game.questionSnapshot, configuration: game.configuration, status: game.status, version: game.version })); }
  private include() { return { template: { include: { category: true } }, gameAssessment: true, _count: { select: { runtimeSessions: true } } }; }
}
