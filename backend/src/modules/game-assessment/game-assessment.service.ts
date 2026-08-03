import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import {
  AssignGameDto,
  CreateGameAssessmentDto,
} from './dto/game-assessment.dto';

@Injectable()
export class GameAssessmentService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateGameAssessmentDto, schoolId: string, userId: string) {
    if (!['HOME', 'SCHOOL'].includes(String(dto.assessmentMode || '').toUpperCase())) {
      throw new BadRequestException('Assessment mode must be HOME or SCHOOL.');
    }
    const { templateIds = [], ...assessment } = dto;
    return this.prisma.gameAssessment.create({
      data: {
        ...assessment,
        schoolId,
        createdById: userId,
        startTime: dto.startTime ? new Date(dto.startTime) : null,
        endTime: dto.endTime ? new Date(dto.endTime) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        settings: dto.settings as Prisma.InputJsonValue,
        templateSelections: templateIds.length ? {
          create: templateIds.map((templateId) => ({ templateId })),
        } : undefined,
      },
      include: { templateSelections: { include: { template: true } } },
    });
  }

  findAll(schoolId: string) {
    return this.prisma.gameAssessment.findMany({
      where: { schoolId },
      include: {
        _count: { select: { questions: true, assignments: true } },
        templateSelections: { include: { template: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async update(
    id: string,
    dto: CreateGameAssessmentDto,
    schoolId: string,
  ) {
    if (!['HOME', 'SCHOOL'].includes(String(dto.assessmentMode || '').toUpperCase())) {
      throw new BadRequestException('Assessment mode must be HOME or SCHOOL.');
    }
    await this.requireAssessment(id, schoolId);
    const { templateIds = [], ...assessment } = dto;
    return this.prisma.gameAssessment.update({
      where: { id },
      data: {
        ...assessment,
        startTime: dto.startTime ? new Date(dto.startTime) : null,
        endTime: dto.endTime ? new Date(dto.endTime) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        settings: dto.settings as Prisma.InputJsonValue,
        templateSelections: {
          deleteMany: {},
          create: templateIds.map((templateId) => ({ templateId })),
        },
      },
      include: { templateSelections: { include: { template: true } } },
    });
  }

  async remove(id: string, schoolId: string) {
    await this.requireAssessment(id, schoolId);
    // A generated game contains its own question/configuration snapshots and
    // remains independently playable after its setup draft is removed.
    // Detach it first so the assessment relation cannot cascade-delete it.
    await this.prisma.$transaction(async (tx) => {
      await tx.generatedGame.updateMany({
        where: { gameAssessmentId: id, schoolId },
        data: { gameAssessmentId: null },
      });
      await tx.gameAssessment.delete({ where: { id } });
    });
    return { success: true };
  }

  async assign(dto: AssignGameDto, schoolId: string, userId: string) {
    await this.requireAssessment(dto.gameAssessmentId, schoolId);
    return this.prisma.gameAssignment.create({
      data: {
        gameAssessmentId: dto.gameAssessmentId,
        assignedById: userId,
        targetType: dto.targetType,
        targetIds: dto.targetIds,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
    });
  }

  studentGames(studentId: string) {
    return this.prisma.gameResult.findMany({
      where: { studentId },
      include: {
        gameAssignment: { include: { gameAssessment: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  leaderboardPlaceholder() {
    return { status: 'PLACEHOLDER', rankings: [] };
  }

  analyticsPlaceholder() {
    return { status: 'PLACEHOLDER', metrics: {} };
  }

  private async requireAssessment(id: string, schoolId: string) {
    const assessment = await this.prisma.gameAssessment.findFirst({
      where: { id, schoolId },
    });
    if (!assessment) throw new NotFoundException('Game assessment not found.');
    return assessment;
  }
}
