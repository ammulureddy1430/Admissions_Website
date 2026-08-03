import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma.service';
import {
  CreateAcademicYearDto,
  CreateBoardDto,
  CreateCategoryDto,
  CreateChapterDto,
  CreateGameTemplateDto,
  CreateGradeDto,
  CreateLearningOutcomeDto,
  CreateSubjectDto,
  CreateTopicDto,
} from './dto/curriculum.dto';

const DEFAULT_CATEGORIES = [
  'Adventure Games', 'Treasure Hunt',
  'Maze Games', 'Memory Games',
  'Drag and Drop', 'Sorting Games',
  'Fishing Games', 'Balloon Pop',
  'Building Games', 'Board Games', 'Logical Thinking Games', 'Racing Games',
];

type Db = PrismaClient | Prisma.TransactionClient;

@Injectable()
export class CurriculumService {
  constructor(private readonly prisma: PrismaService) {}

  private audit(db: Db, schoolId: string, userId: string, entityType: string, entityId: string, action: string, changes?: unknown) {
    return db.curriculumAuditLog.create({
      data: {
        schoolId, userId, entityType, entityId, action,
        changes: changes === undefined ? undefined : changes as Prisma.InputJsonValue,
      },
    });
  }

  async createBoard(dto: CreateBoardDto, schoolId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.curriculumBoard.create({ data: { ...dto, code: dto.code.toUpperCase(), schoolId } });
      await this.audit(tx, schoolId, userId, 'BOARD', row.id, 'CREATE', dto);
      return row;
    });
  }

  boards(schoolId: string, query: any) {
    return this.prisma.curriculumBoard.findMany({
      where: { schoolId, ...(query.status && { status: query.status }), ...(query.search && { name: { contains: query.search, mode: 'insensitive' } }) },
      include: { _count: { select: { academicYears: true, grades: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createAcademicYear(dto: CreateAcademicYearDto, schoolId: string, userId: string) {
    await this.requireOwned('curriculumBoard', dto.boardId, schoolId);
    if (new Date(dto.endDate) <= new Date(dto.startDate)) throw new BadRequestException('End date must be after start date.');
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.academicYear.create({ data: { ...dto, schoolId, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate) } });
      await this.audit(tx, schoolId, userId, 'ACADEMIC_YEAR', row.id, 'CREATE', dto);
      return row;
    });
  }

  academicYears(schoolId: string, query: any) {
    return this.prisma.academicYear.findMany({
      where: { schoolId, ...(query.boardId && { boardId: query.boardId }), ...(query.status && { status: query.status }) },
      include: { board: true, _count: { select: { grades: true } } },
      orderBy: { startDate: 'desc' },
    });
  }

  async createGrade(dto: CreateGradeDto, schoolId: string, userId: string) {
    await Promise.all([this.requireOwned('curriculumBoard', dto.boardId, schoolId), this.requireOwned('academicYear', dto.academicYearId, schoolId)]);
    return this.createAudited('curriculumGrade', 'GRADE', { ...dto, schoolId }, schoolId, userId);
  }

  grades(schoolId: string, q: any) {
    return this.prisma.curriculumGrade.findMany({
      where: { schoolId, ...(q.boardId && { boardId: q.boardId }), ...(q.academicYearId && { academicYearId: q.academicYearId }), ...(q.status && { status: q.status }) },
      include: { board: true, academicYear: true, _count: { select: { subjects: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createSubject(dto: CreateSubjectDto, schoolId: string, userId: string) {
    await this.requireOwned('curriculumGrade', dto.gradeId, schoolId);
    return this.createAudited('curriculumSubject', 'SUBJECT', { ...dto, schoolId }, schoolId, userId);
  }

  subjects(schoolId: string, q: any) {
    return this.prisma.curriculumSubject.findMany({
      where: { schoolId, ...(q.gradeId && { gradeId: q.gradeId }), ...(q.status && { status: q.status }), ...(q.search && { name: { contains: q.search, mode: 'insensitive' } }) },
      include: { grade: true, _count: { select: { chapters: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createChapter(dto: CreateChapterDto, schoolId: string, userId: string) {
    await this.requireOwned('curriculumSubject', dto.subjectId, schoolId);
    return this.createAudited('curriculumChapter', 'CHAPTER', { ...dto, learningObjectives: dto.learningObjectives || [], schoolId }, schoolId, userId);
  }

  chapters(schoolId: string, q: any) {
    return this.prisma.curriculumChapter.findMany({
      where: { schoolId, ...(q.subjectId && { subjectId: q.subjectId }), ...(q.status && { status: q.status }), ...(q.search && { name: { contains: q.search, mode: 'insensitive' } }) },
      include: { subject: true, _count: { select: { topics: true } } },
      orderBy: { chapterNumber: 'asc' },
    });
  }

  async createTopic(dto: CreateTopicDto, schoolId: string, userId: string) {
    await this.requireOwned('curriculumChapter', dto.chapterId, schoolId);
    return this.createAudited('curriculumTopic', 'TOPIC', { ...dto, learningObjectives: dto.learningObjectives || [], schoolId }, schoolId, userId);
  }

  topics(schoolId: string, q: any) {
    return this.prisma.curriculumTopic.findMany({
      where: { schoolId, ...(q.chapterId && { chapterId: q.chapterId }), ...(q.difficulty && { difficulty: q.difficulty }), ...(q.status && { status: q.status }), ...(q.search && { name: { contains: q.search, mode: 'insensitive' } }) },
      include: { chapter: true, _count: { select: { learningOutcomes: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createOutcome(dto: CreateLearningOutcomeDto, schoolId: string, userId: string) {
    await this.requireOwned('curriculumTopic', dto.topicId, schoolId);
    return this.createAudited('learningOutcome', 'LEARNING_OUTCOME', { ...dto, schoolId }, schoolId, userId);
  }

  outcomes(schoolId: string, q: any) {
    return this.prisma.learningOutcome.findMany({
      where: { schoolId, ...(q.topicId && { topicId: q.topicId }), ...(q.difficulty && { difficulty: q.difficulty }), ...(q.status && { status: q.status }), ...(q.search && { OR: [{ outcome: { contains: q.search, mode: 'insensitive' } }, { outcomeCode: { contains: q.search, mode: 'insensitive' } }] }) },
      include: { topic: { include: { chapter: { include: { subject: { include: { grade: true } } } } } } },
      orderBy: { outcomeCode: 'asc' },
    });
  }

  async categories(schoolId: string) {
    await this.prisma.gameCategory.createMany({
      data: DEFAULT_CATEGORIES.map((name) => ({ schoolId, name })),
      skipDuplicates: true,
    });
    return this.prisma.gameCategory.findMany({
      where: { schoolId, name: { in: DEFAULT_CATEGORIES } },
      include: { _count: { select: { templates: true } } },
      orderBy: { name: 'asc' },
    });
  }

  createCategory(dto: CreateCategoryDto, schoolId: string, userId: string) {
    return this.createAudited('gameCategory', 'GAME_CATEGORY', { ...dto, schoolId }, schoolId, userId);
  }

  async createTemplate(dto: CreateGameTemplateDto, schoolId: string, userId: string) {
    await this.requireOwned('gameCategory', dto.categoryId, schoolId);
    this.validateQuestionRange(dto);
    return this.prisma.$transaction(async (tx) => {
      const template = await tx.gameTemplate.create({
        data: {
          templateId: dto.templateId || `GT-${randomUUID().slice(0, 8).toUpperCase()}`,
          schoolId, createdById: userId, name: dto.name, description: dto.description,
          categoryId: dto.categoryId, difficulty: dto.difficulty, estimatedDuration: dto.estimatedDuration,
          minimumQuestions: dto.minimumQuestions, maximumQuestions: dto.maximumQuestions,
          supportedDevices: dto.supportedDevices, thumbnail: dto.thumbnail, previewImage: dto.previewImage,
          status: dto.status,
        },
      });
      await this.replaceMappings(tx, template.id, dto);
      await tx.gameTemplateVersion.create({ data: { templateId: template.id, version: 1, createdById: userId, changeNote: 'Initial version', snapshot: this.snapshot(template, dto) } });
      await this.audit(tx, schoolId, userId, 'GAME_TEMPLATE', template.id, 'CREATE', dto);
      return template;
    });
  }

  async templates(schoolId: string, q: any) {
    const page = Math.max(Number(q.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(q.pageSize) || 12, 1), 100);
    const mappingFilters = ['gradeId', 'subjectId', 'chapterId', 'topicId', 'learningOutcomeId']
      .filter((key) => q[key]).map((key) => ({ [key]: q[key] }));
    const where: any = {
      schoolId,
      category: { name: { in: DEFAULT_CATEGORIES } },
      ...(q.categoryId && { categoryId: q.categoryId }),
      ...(q.difficulty && { difficulty: q.difficulty }),
      ...(q.status && { status: q.status }),
      ...(q.search && { OR: [{ name: { contains: q.search, mode: 'insensitive' } }, { templateId: { contains: q.search, mode: 'insensitive' } }] }),
      ...(mappingFilters.length && { mappings: { some: { OR: mappingFilters } } }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.gameTemplate.findMany({ where, include: { category: true, mappings: true, _count: { select: { versions: true, assessments: true } } }, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.gameTemplate.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async template(id: string, schoolId: string) {
    const row = await this.prisma.gameTemplate.findFirst({ where: { id, schoolId }, include: { category: true, mappings: true, versions: { orderBy: { version: 'desc' } }, _count: { select: { assessments: true } } } });
    if (!row) throw new NotFoundException('Game template not found.');
    return row;
  }

  async updateTemplate(id: string, dto: CreateGameTemplateDto, schoolId: string, userId: string) {
    const current = await this.template(id, schoolId);
    await this.requireOwned('gameCategory', dto.categoryId, schoolId);
    this.validateQuestionRange(dto);
    return this.prisma.$transaction(async (tx) => {
      const version = current.version + 1;
      const updated = await tx.gameTemplate.update({
        where: { id }, data: {
          name: dto.name, description: dto.description, categoryId: dto.categoryId,
          difficulty: dto.difficulty, estimatedDuration: dto.estimatedDuration,
          minimumQuestions: dto.minimumQuestions, maximumQuestions: dto.maximumQuestions,
          supportedDevices: dto.supportedDevices, thumbnail: dto.thumbnail,
          previewImage: dto.previewImage, status: dto.status, version,
        },
      });
      await this.replaceMappings(tx, id, dto);
      await tx.gameTemplateVersion.create({ data: { templateId: id, version, createdById: userId, changeNote: dto.changeNote || 'Template updated', snapshot: this.snapshot(updated, dto) } });
      await this.audit(tx, schoolId, userId, 'GAME_TEMPLATE', id, 'UPDATE', dto);
      return updated;
    });
  }

  async templateAction(id: string, action: string, schoolId: string, userId: string) {
    const current = await this.template(id, schoolId);
    if (['DUPLICATE', 'CLONE'].includes(action)) {
      const dto: CreateGameTemplateDto = {
        name: `${current.name} (${action === 'CLONE' ? 'Clone' : 'Copy'})`,
        description: current.description || undefined, categoryId: current.categoryId,
        difficulty: current.difficulty, estimatedDuration: current.estimatedDuration,
        minimumQuestions: current.minimumQuestions, maximumQuestions: current.maximumQuestions,
        supportedDevices: current.supportedDevices, thumbnail: current.thumbnail || undefined,
        previewImage: current.previewImage || undefined, status: 'DRAFT',
        gradeIds: current.mappings.flatMap((m) => m.gradeId ? [m.gradeId] : []),
        subjectIds: current.mappings.flatMap((m) => m.subjectId ? [m.subjectId] : []),
        chapterIds: current.mappings.flatMap((m) => m.chapterId ? [m.chapterId] : []),
        topicIds: current.mappings.flatMap((m) => m.topicId ? [m.topicId] : []),
        learningOutcomeIds: current.mappings.flatMap((m) => m.learningOutcomeId ? [m.learningOutcomeId] : []),
      };
      return this.createTemplate(dto, schoolId, userId);
    }
    const statuses: Record<string, string> = { ARCHIVE: 'ARCHIVED', ENABLE: 'ACTIVE', DISABLE: 'DISABLED' };
    if (!statuses[action]) throw new BadRequestException('Unsupported template action.');
    const updated = await this.prisma.gameTemplate.update({ where: { id }, data: { status: statuses[action] } });
    await this.audit(this.prisma, schoolId, userId, 'GAME_TEMPLATE', id, action, { from: current.status, to: updated.status });
    return updated;
  }

  async removeTemplate(id: string, schoolId: string, userId: string) {
    const current = await this.template(id, schoolId);
    return this.prisma.$transaction(async (tx) => {
      const generatedGames = await tx.generatedGame.count({ where: { templateId: id, schoolId } });
      const assessmentLinks = await tx.gameAssessmentTemplate.count({ where: { templateId: id } });
      const questionMappings = await tx.questionGameMapping.count({
        where: { schoolId, OR: [{ selectedTemplateId: id }, { recommendedTemplateId: id }] },
      });
      await this.audit(tx, schoolId, userId, 'GAME_TEMPLATE', id, 'DELETE', current);
      await tx.generatedGame.deleteMany({ where: { templateId: id, schoolId } });
      await tx.gameAssessmentTemplate.deleteMany({ where: { templateId: id } });
      await tx.questionGameMapping.deleteMany({
        where: { schoolId, OR: [{ selectedTemplateId: id }, { recommendedTemplateId: id }] },
      });
      await tx.gameTemplate.delete({ where: { id } });
      return { success: true, deleted: { generatedGames, assessmentLinks, questionMappings } };
    });
  }

  auditLogs(schoolId: string, q: any) {
    return this.prisma.curriculumAuditLog.findMany({
      where: { schoolId, ...(q.entityType && { entityType: q.entityType }) },
      orderBy: { createdAt: 'desc' }, take: Math.min(Number(q.limit) || 50, 200),
    });
  }

  async updateEntity(type: string, id: string, data: any, schoolId: string, userId: string) {
    const map: Record<string, { model: string; label: string }> = {
      boards: { model: 'curriculumBoard', label: 'BOARD' }, 'academic-years': { model: 'academicYear', label: 'ACADEMIC_YEAR' },
      grades: { model: 'curriculumGrade', label: 'GRADE' }, subjects: { model: 'curriculumSubject', label: 'SUBJECT' },
      chapters: { model: 'curriculumChapter', label: 'CHAPTER' }, topics: { model: 'curriculumTopic', label: 'TOPIC' },
      'learning-outcomes': { model: 'learningOutcome', label: 'LEARNING_OUTCOME' }, 'game-categories': { model: 'gameCategory', label: 'GAME_CATEGORY' },
    };
    const target = map[type];
    if (!target) throw new BadRequestException('Unsupported curriculum entity.');
    await this.requireOwned(target.model, id, schoolId);
    const safe = { ...data }; delete safe.id; delete safe.schoolId; delete safe.createdAt; delete safe.updatedAt;
    if (safe.startDate) safe.startDate = new Date(safe.startDate);
    if (safe.endDate) safe.endDate = new Date(safe.endDate);
    const row = await (this.prisma as any)[target.model].update({ where: { id }, data: safe });
    await this.audit(this.prisma, schoolId, userId, target.label, id, 'UPDATE', safe);
    return row;
  }

  async removeEntity(type: string, id: string, schoolId: string, userId: string) {
    const map: Record<string, { model: string; label: string }> = {
      boards: { model: 'curriculumBoard', label: 'BOARD' }, 'academic-years': { model: 'academicYear', label: 'ACADEMIC_YEAR' },
      grades: { model: 'curriculumGrade', label: 'GRADE' }, subjects: { model: 'curriculumSubject', label: 'SUBJECT' },
      chapters: { model: 'curriculumChapter', label: 'CHAPTER' }, topics: { model: 'curriculumTopic', label: 'TOPIC' },
      'learning-outcomes': { model: 'learningOutcome', label: 'LEARNING_OUTCOME' }, 'game-categories': { model: 'gameCategory', label: 'GAME_CATEGORY' },
    };
    const target = map[type];
    if (!target) throw new BadRequestException('Unsupported curriculum entity.');
    const current = await this.requireOwned(target.model, id, schoolId);
    await this.prisma.$transaction(async (tx) => {
      await this.audit(tx, schoolId, userId, target.label, id, 'DELETE', current);
      await (tx as any)[target.model].delete({ where: { id } });
    });
    return { success: true };
  }

  private async createAudited(model: string, type: string, data: any, schoolId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const row = await (tx as any)[model].create({ data });
      await this.audit(tx, schoolId, userId, type, row.id, 'CREATE', data);
      return row;
    });
  }

  private async requireOwned(model: string, id: string, schoolId: string) {
    const row = await (this.prisma as any)[model].findFirst({ where: { id, schoolId } });
    if (!row) throw new NotFoundException('Curriculum record not found for this school.');
    return row;
  }

  private validateQuestionRange(dto: CreateGameTemplateDto) {
    if (dto.maximumQuestions < dto.minimumQuestions) throw new BadRequestException('Maximum questions must be at least the minimum questions.');
  }

  private snapshot(template: any, dto: CreateGameTemplateDto): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify({ ...template, mappings: {
      gradeIds: dto.gradeIds || [], subjectIds: dto.subjectIds || [], chapterIds: dto.chapterIds || [],
      topicIds: dto.topicIds || [], learningOutcomeIds: dto.learningOutcomeIds || [],
    }})) as Prisma.InputJsonValue;
  }

  private async replaceMappings(tx: Prisma.TransactionClient, templateId: string, dto: CreateGameTemplateDto) {
    await tx.gameTemplateMapping.deleteMany({ where: { templateId } });
    const data = [
      ...(dto.gradeIds || []).map((gradeId) => ({ templateId, gradeId })),
      ...(dto.subjectIds || []).map((subjectId) => ({ templateId, subjectId })),
      ...(dto.chapterIds || []).map((chapterId) => ({ templateId, chapterId })),
      ...(dto.topicIds || []).map((topicId) => ({ templateId, topicId })),
      ...(dto.learningOutcomeIds || []).map((learningOutcomeId) => ({ templateId, learningOutcomeId })),
    ];
    if (data.length) await tx.gameTemplateMapping.createMany({ data });
  }
}
