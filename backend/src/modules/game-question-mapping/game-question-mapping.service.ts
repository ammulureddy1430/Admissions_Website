import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { SaveGameMappingDto } from './dto/game-question-mapping.dto';

const RECOMMENDATIONS: Record<string, string> = {
  MCQ: 'Quiz Challenge', TRUE_FALSE: 'Fast Tap', FILL_IN_THE_BLANKS: 'Word Builder',
  MATCH_THE_FOLLOWING: 'Memory Match', ORDERING: 'Sequence Game',
};

@Injectable()
export class GameQuestionMappingService {
  constructor(private readonly prisma: PrismaService) {}

  templates(schoolId: string, q: any) {
    return this.prisma.gameTemplate.findMany({
      where: { schoolId, status: q.status || 'ACTIVE', ...(q.search && { name: { contains: q.search, mode: 'insensitive' } }) },
      include: { category: true }, orderBy: { name: 'asc' },
    });
  }

  async mappings(schoolId: string, q: any) {
    const mappings = await this.prisma.questionGameMapping.findMany({
      where: { schoolId, ...(q.questionId && { questionId: q.questionId }) },
      include: this.include(), orderBy: { updatedAt: 'desc' },
    });
    const approved = await this.prisma.gameAIQuestion.findMany({
      where: { schoolId, status: 'APPROVED', gameMapping: null },
      include: { processedTextbook: { include: { textbookVersion: { include: { textbook: true } } } } },
      orderBy: { updatedAt: 'desc' },
    });
    const templates = await this.prisma.gameTemplate.findMany({ where: { schoolId, status: 'ACTIVE' }, include: { category: true } });
    return {
      mappings,
      unmapped: approved.map((question) => {
        const recommendation = this.recommend(question, templates);
        return { ...question, recommendation };
      }),
    };
  }

  async save(dto: SaveGameMappingDto, schoolId: string, userId: string, mappingId?: string) {
    const question = await this.prisma.gameAIQuestion.findFirst({ where: { id: dto.questionId, schoolId } });
    if (!question) throw new NotFoundException('Game AI question not found.');
    if (question.status !== 'APPROVED') throw new BadRequestException('Only approved questions can be mapped to games.');
    const selected = await this.prisma.gameTemplate.findFirst({ where: { id: dto.selectedTemplateId, schoolId, status: 'ACTIVE' } });
    if (!selected) throw new BadRequestException('The selected game template is unavailable for this school.');
    if (dto.recommendedTemplateId) {
      const recommended = await this.prisma.gameTemplate.findFirst({ where: { id: dto.recommendedTemplateId, schoolId } });
      if (!recommended) throw new BadRequestException('The recommended template is invalid for this school.');
    }
    const data = {
      schoolId, questionId: dto.questionId, selectedTemplateId: dto.selectedTemplateId,
      recommendedTemplateId: dto.recommendedTemplateId, recommendationReason: dto.recommendationReason,
      recommendationKey: dto.recommendationKey || this.recommendationName(question),
      acceptedRecommendation: dto.acceptedRecommendation ?? dto.selectedTemplateId === dto.recommendedTemplateId,
      overriddenById: dto.selectedTemplateId !== dto.recommendedTemplateId ? userId : null, mappedById: userId,
    };
    const config = {
      difficulty: dto.difficulty, timerSeconds: dto.timerSeconds, lives: dto.lives,
      scoringRules: dto.scoringRules as Prisma.InputJsonValue, hintRules: dto.hintRules as Prisma.InputJsonValue,
      animationConfiguration: dto.animationConfiguration as Prisma.InputJsonValue,
      soundConfiguration: dto.soundConfiguration as Prisma.InputJsonValue,
      accessibilitySettings: dto.accessibilitySettings as Prisma.InputJsonValue,
    };
    if (mappingId) {
      const existing = await this.prisma.questionGameMapping.findFirst({ where: { id: mappingId, schoolId } });
      if (!existing) throw new NotFoundException('Question-to-game mapping not found.');
      if (existing.questionId !== dto.questionId) throw new BadRequestException('A mapping cannot be reassigned to another question.');
      return this.prisma.questionGameMapping.update({ where: { id: mappingId }, data: { ...data, configuration: { upsert: { create: config, update: config } } }, include: this.include() });
    }
    return this.prisma.questionGameMapping.upsert({
      where: { questionId: dto.questionId },
      create: { ...data, configuration: { create: config } },
      update: { ...data, configuration: { upsert: { create: config, update: config } } },
      include: this.include(),
    });
  }

  private recommend(question: any, templates: any[]) {
    const name = this.recommendationName(question);
    const template = templates.find((item) => item.name.toLowerCase().includes(name.toLowerCase())) ||
      templates.find((item) => item.category?.name?.toLowerCase().includes(name.split(' ')[0].toLowerCase())) || null;
    return { recommendationKey: name, template, reason: `Recommended from question type ${question.questionType} and textbook subject context.` };
  }

  private recommendationName(question: any) {
    if (RECOMMENDATIONS[question.questionType]) return RECOMMENDATIONS[question.questionType];
    const subject = question.processedTextbook?.textbookVersion?.textbook?.title?.toLowerCase() || '';
    if (subject.includes('math')) return 'Balloon Pop';
    if (subject.includes('science')) return 'Target Shooter';
    if (question.questionType === 'ONE_WORD') return 'Word Search';
    if (question.questionType === 'HOTS') return 'Crossword';
    return 'Quiz Challenge';
  }

  private include() {
    return {
      question: { include: { options: { orderBy: { sequence: 'asc' as const } } } },
      recommendedTemplate: { include: { category: true } },
      selectedTemplate: { include: { category: true } },
      configuration: true,
    };
  }
}
