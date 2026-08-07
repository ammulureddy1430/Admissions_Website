import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AssignRealTimeGameDto, CreateGameDto, UpdateGameDto } from './dto/game.dto';
import { GAME_CATALOG } from './game.catalog';
import { birthDateMatchesAgeGroup, normalizeGameAgeGroup } from './age-groups';

@Injectable()
export class GamesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await Promise.all(GAME_CATALOG.map(({ templateCode: _templateCode, cognitiveSkill: _skill, ...game }) =>
      this.prisma.game.upsert({
        where: { slug: game.slug },
        create: game,
        update: { name: game.name, description: game.description, category: game.category, ageGroup: game.ageGroup, difficulty: game.difficulty, durationSeconds: game.durationSeconds, componentName: game.componentName, gameType: game.gameType, thumbnail: game.thumbnail, status: 'ACTIVE', isActive: true },
      }),
    ));

    const schools = await this.prisma.school.findMany({ select: { id: true } });
    for (const school of schools) {
      const admin = await this.prisma.user.findFirst({
        where: { schoolId: school.id, role: 'SCHOOL_ADMIN' },
        select: { id: true }
      });
      if (!admin) continue;

      let categorySound = await this.prisma.gameCategory.findFirst({
        where: { name: 'Auditory Recognition', schoolId: school.id }
      });
      if (!categorySound) {
        categorySound = await this.prisma.gameCategory.create({
          data: {
            schoolId: school.id,
            name: 'Auditory Recognition',
            status: 'ACTIVE'
          }
        });
      }

      await this.prisma.gameTemplate.upsert({
        where: {
          schoolId_templateId: {
            schoolId: school.id,
            templateId: 'GT-SOUND'
          }
        },
        create: {
          templateId: 'GT-SOUND',
          schoolId: school.id,
          name: 'Sound Detective Template',
          description: 'A standard Auditory Recognition template.',
          categoryId: categorySound.id,
          difficulty: 'EASY',
          estimatedDuration: 2,
          minimumQuestions: 1,
          maximumQuestions: 10,
          supportedDevices: ['Desktop', 'Tablet', 'Mobile'],
          status: 'ACTIVE',
          createdById: admin.id
        },
        update: {
          status: 'ACTIVE'
        }
      });

      let categoryColorPath = await this.prisma.gameCategory.findFirst({ where: { name: 'Visual Recognition', schoolId: school.id } });
      if (!categoryColorPath) categoryColorPath = await this.prisma.gameCategory.create({ data: { schoolId: school.id, name: 'Visual Recognition', status: 'ACTIVE' } });
      await this.prisma.gameTemplate.upsert({
        where: { schoolId_templateId: { schoolId: school.id, templateId: 'GT-COLOR-PATH' } },
        create: {
          templateId: 'GT-COLOR-PATH', schoolId: school.id, name: 'Color Path Template',
          description: 'A one-minute, four-round visual recognition and observation assessment for ages 3–4.',
          categoryId: categoryColorPath.id, difficulty: 'EASY', estimatedDuration: 1,
          minimumQuestions: 1, maximumQuestions: 10, supportedDevices: ['Desktop', 'Tablet', 'Mobile'],
          status: 'ACTIVE', createdById: admin.id,
        },
        update: { status: 'ACTIVE', estimatedDuration: 1 },
      });

      let categorySpot = await this.prisma.gameCategory.findFirst({
        where: { name: 'Observation & Visual Recognition', schoolId: school.id }
      });
      if (!categorySpot) {
        categorySpot = await this.prisma.gameCategory.create({
          data: {
            schoolId: school.id,
            name: 'Observation & Visual Recognition',
            status: 'ACTIVE'
          }
        });
      }

      await this.prisma.gameTemplate.upsert({
        where: {
          schoolId_templateId: {
            schoolId: school.id,
            templateId: 'GT-SPOT'
          }
        },
        create: {
          templateId: 'GT-SPOT',
          schoolId: school.id,
          name: 'Spot the Change Template',
          description: 'A standard Observation & Visual Recognition template.',
          categoryId: categorySpot.id,
          difficulty: 'EASY',
          estimatedDuration: 2,
          minimumQuestions: 1,
          maximumQuestions: 10,
          supportedDevices: ['Desktop', 'Tablet', 'Mobile'],
          status: 'ACTIVE',
          createdById: admin.id
        },
        update: {
          status: 'ACTIVE'
        }
      });
    }
  }

  async list(schoolId: string, query: Record<string, string>) {
    const games = await this.prisma.game.findMany({
      where: {
        gameType: { not: 'ASSESSMENT_ENGINE' },
        ...(query.status && { status: query.status }),
        ...(query.active === 'true' && { isActive: true }),
        ...(query.ageGroup && { ageGroup: query.ageGroup }),
        ...(query.search && { OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { category: { contains: query.search, mode: 'insensitive' } },
        ] }),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
    const templateCodes = GAME_CATALOG.map((game) => game.templateCode);
    const templates = await this.prisma.gameTemplate.findMany({
      where: { schoolId, templateId: { in: templateCodes }, status: 'ACTIVE' },
      select: { id: true, templateId: true, estimatedDuration: true },
    });
    const assignmentCounts = await this.prisma.realTimeGameAssignment.groupBy({
      by: ['gameId'], where: { schoolId, status: 'ASSIGNED' }, _count: { _all: true },
    });
    return games.map((game) => {
      const registration = GAME_CATALOG.find((item) => item.slug === game.slug);
      const template = templates.find((item) => item.templateId === registration?.templateCode);
      return {
        ...game,
        cognitiveSkill: registration?.cognitiveSkill || 'Cognitive Skills',
        assignmentTemplateId: template?.id || null,
        availableForAssignment: game.isActive && game.status === 'ACTIVE' && Boolean(template),
        assignmentCount: assignmentCounts.find((item) => item.gameId === game.id)?._count._all || 0,
      };
    });
  }

  async one(id: string, schoolId: string) {
    const games = await this.list(schoolId, {});
    const game = games.find((item) => item.id === id);
    if (!game) throw new NotFoundException('Game not found.');
    return game;
  }

  create(dto: CreateGameDto) {
    return this.prisma.game.create({ data: {
      ...dto,
      slug: dto.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      componentName: dto.componentName.toUpperCase().trim().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, ''),
      gameType: dto.gameType || 'REAL_TIME', status: 'ACTIVE', isActive: true,
    } });
  }

  async update(id: string, dto: UpdateGameDto, schoolId: string) {
    await this.one(id, schoolId);
    return this.prisma.game.update({ where: { id }, data: dto });
  }

  async toggle(id: string, schoolId: string) {
    const game = await this.one(id, schoolId);
    return this.prisma.game.update({
      where: { id },
      data: { isActive: !game.isActive, status: game.isActive ? 'DISABLED' : 'ACTIVE' },
    });
  }

  async remove(id: string, schoolId: string) {
    await this.one(id, schoolId);
    await this.prisma.game.delete({ where: { id } });
    return { deleted: true, id };
  }

  async analytics(id: string, schoolId: string) {
    await this.one(id, schoolId);
    const [results, completed] = await Promise.all([
      this.prisma.gameResult.count({ where: { gameId: id, assessment: { schoolId } } }),
      this.prisma.gameResult.findMany({ where: { gameId: id, assessment: { schoolId }, status: 'COMPLETED' }, select: { totalScore: true, percentage: true } }),
    ]);
    return {
      attempts: results,
      completions: completed.length,
      averageScore: completed.length ? completed.reduce((sum, item) => sum + item.percentage, 0) / completed.length : 0,
    };
  }

  async reports(id: string, schoolId: string) {
    const game = await this.one(id, schoolId);
    if(game.componentName==='TRAIN_TRACK_BUILDER'){const reports=await this.prisma.trainTrackAnalytics.findMany({where:{gameId:id,gameResult:{assessment:{schoolId}}},select:{id:true,studentId:true,assessmentId:true,createdAt:true,logicalThinkingScore:true,causeEffectScore:true,tracksCompleted:true,averageCompletionTime:true,logicalAccuracy:true,highestDifficulty:true,completionStatus:true,overallScore:true},orderBy:{createdAt:'desc'}});return reports.map(report=>({...report,ageGroup:game.ageGroup}));}
    if(game.componentName==='PACKAGE_SORTER'){const reports=await this.prisma.packageSorterAnalytics.findMany({where:{gameId:id,gameResult:{assessment:{schoolId}}},select:{id:true,studentId:true,assessmentId:true,createdAt:true,organizationScore:true,decisionMakingScore:true,packagesSorted:true,correctDeliveries:true,incorrectDeliveries:true,averageDecisionTime:true,highestDifficulty:true,completionPercentage:true,overallScore:true,completionStatus:true},orderBy:{createdAt:'desc'}});return reports.map(report=>({...report,ageGroup:game.ageGroup}));}
    if(game.componentName==='MAGIC_PAINT'){const reports=await this.prisma.magicPaintAnalytics.findMany({where:{gameId:id,gameResult:{assessment:{schoolId}}},select:{id:true,studentId:true,assessmentId:true,createdAt:true,creativityScore:true,causeEffectScore:true,objectsCompleted:true,averageCompletionTime:true,interactionConsistency:true,completionStatus:true,overallScore:true},orderBy:{createdAt:'desc'}});return reports.map(report=>({...report,ageGroup:game.ageGroup}));}
    if (game.componentName === 'COLOR_PATH') {
      const reports = await this.prisma.colorPathAnalytics.findMany({
        where: { gameId: id, gameResult: { assessment: { schoolId } } },
        select: {
          id: true, studentId: true, assessmentId: true, createdAt: true,
          visualRecognitionScore: true, observationScore: true, correctSelections: true,
          incorrectSelections: true, averageResponseTime: true, highestDifficulty: true,
          completionStatus: true, overallScore: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return reports.map((report) => ({ ...report, ageGroup: game.ageGroup }));
    }
    if (game.componentName === 'SOUND_DETECTIVE') {
      const reports = await this.prisma.soundDetectiveAnalytics.findMany({
        where: { gameId: id, gameResult: { assessment: { schoolId } } },
        select: {
          id: true, studentId: true, assessmentId: true, createdAt: true,
          roundsPlayed: true, correctResponses: true, incorrectResponses: true,
          averageResponseTime: true, listeningScore: true, auditoryRecognitionScore: true,
          completionPercentage: true, overallScore: true, highestDifficulty: true,
          completionStatus: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return reports.map((report) => ({ ...report, ageGroup: game.ageGroup }));
    }

    if (game.componentName === 'BALL_STACK') {
      const reports = await this.prisma.ballStackAnalytics.findMany({
        where: { gameId: id, gameResult: { assessment: { schoolId } } },
        select: {
          id: true, studentId: true, assessmentId: true, createdAt: true,
          handEyeCoordinationScore: true, fineMotorScore: true, precisionScore: true,
          concentrationScore: true, patienceScore: true, reactionSpeedScore: true,
          overallCognitiveScore: true, highestTowerHeight: true, perfectPlacements: true,
          averageAlignment: true, averageReactionTime: true, completionStatus: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return reports.map((report) => ({ ...report, ageGroup: game.ageGroup }));
    }
    const reports = await this.prisma.followLightsAnalytics.findMany({
      where: { gameId: id, gameResult: { assessment: { schoolId } } },
      select: {
        id: true, studentId: true, assessmentId: true, createdAt: true,
        memoryScore: true, attention: true, focusScore: true, visualMemory: true,
        processingSpeed: true, learningPotential: true, accuracy: true, overallScore: true,
        longestSequence: true, averageReactionTime: true, mistakes: true, completionPercentage: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return reports.map((report) => ({ ...report, ageGroup: game.ageGroup }));
  }

  async eligibleStudents(id: string, schoolId: string, ageGroup?: string) {
    const game = await this.one(id, schoolId);
    const targetAgeGroup = normalizeGameAgeGroup(ageGroup || game.ageGroup);
    if (!targetAgeGroup) throw new NotFoundException('Select a valid age group.');
    const students = await this.prisma.application.findMany({
      where: {
        schoolId,
        assessmentRequired: { not: false },
        status: { notIn: ['DRAFT', 'REJECTED', 'WITHDRAWN'] },
      },
      select: { id: true, studentFirstName: true, studentLastName: true, studentDob: true, status: true },
      orderBy: [{ studentFirstName: 'asc' }, { studentLastName: 'asc' }],
    });
    return students
      .filter((student) => birthDateMatchesAgeGroup(student.studentDob, targetAgeGroup))
      .map(({ studentDob: _studentDob, ...student }) => ({ ...student, ageGroup: targetAgeGroup }));
  }

  async assign(id: string, dto: AssignRealTimeGameDto, schoolId: string, userId: string) {
    const game = await this.one(id, schoolId);
    if (!game.isActive) throw new NotFoundException('This game is not active.');
    const eligible = await this.eligibleStudents(id, schoolId, dto.ageGroup);
    const eligibleIds = new Set(eligible.map((student) => student.id));
    const studentIds = [...new Set(dto.studentIds)];
    if (!studentIds.length) throw new NotFoundException('Select at least one eligible student.');
    if (studentIds.some((studentId) => !eligibleIds.has(studentId))) throw new NotFoundException('One or more selected students do not match the assigned age group.');
    return this.prisma.realTimeGameAssignment.create({ data: {
      schoolId, gameId: id, assignedById: userId, ageGroup: dto.ageGroup, studentIds,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
    } });
  }

  assignments(id: string, schoolId: string) {
    return this.prisma.realTimeGameAssignment.findMany({ where: { gameId: id, schoolId }, orderBy: { createdAt: 'desc' } });
  }
}
