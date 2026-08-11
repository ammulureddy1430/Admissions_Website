import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AssignRealTimeGameDto, BulkAssignRealTimeGamesDto, CreateGameDto, ReviewGameResultDto, UpdateGameDto } from './dto/game.dto';
import { GAME_CATALOG } from './game.catalog';
import { normalizeGameAgeGroup, studentMatchesAgeGroup } from './age-groups';

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

      let rescueCategory = await this.prisma.gameCategory.findFirst({ where: { name: 'Problem Solving & Cognitive Flexibility', schoolId: school.id } });
      if (!rescueCategory) rescueCategory = await this.prisma.gameCategory.create({ data: { schoolId: school.id, name: 'Problem Solving & Cognitive Flexibility', status: 'ACTIVE' } });
      await this.prisma.gameTemplate.upsert({
        where: { schoolId_templateId: { schoolId: school.id, templateId: 'GT-RESCUE-MISSION' } },
        create: { templateId: 'GT-RESCUE-MISSION', schoolId: school.id, name: 'Rescue Mission Template', description: 'A visual two-minute assessment of problem solving and cognitive flexibility.', categoryId: rescueCategory.id, difficulty: 'EASY_MEDIUM', estimatedDuration: 2, minimumQuestions: 1, maximumQuestions: 1, supportedDevices: ['Desktop', 'Tablet', 'Mobile'], status: 'ACTIVE', createdById: admin.id },
        update: { status: 'ACTIVE', estimatedDuration: 2 },
      });

      let parkingCategory = await this.prisma.gameCategory.findFirst({ where: { name: 'Strategic Planning & Spatial Reasoning', schoolId: school.id } });
      if (!parkingCategory) parkingCategory = await this.prisma.gameCategory.create({ data: { schoolId: school.id, name: 'Strategic Planning & Spatial Reasoning', status: 'ACTIVE' } });
      await this.prisma.gameTemplate.upsert({
        where: { schoolId_templateId: { schoolId: school.id, templateId: 'GT-PARKING-ESCAPE' } },
        create: { templateId: 'GT-PARKING-ESCAPE', schoolId: school.id, name: 'Parking Escape Template', description: 'A two-minute strategic planning and spatial reasoning assessment.', categoryId: parkingCategory.id, difficulty: 'MEDIUM', estimatedDuration: 2, minimumQuestions: 1, maximumQuestions: 1, supportedDevices: ['Desktop', 'Tablet', 'Mobile'], status: 'ACTIVE', createdById: admin.id },
        update: { status: 'ACTIVE', estimatedDuration: 2, difficulty: 'MEDIUM' },
      });

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

      for (const registered of GAME_CATALOG) {
        let category = await this.prisma.gameCategory.findFirst({ where: { name: registered.category, schoolId: school.id } });
        if (!category) category = await this.prisma.gameCategory.create({ data: { schoolId: school.id, name: registered.category, status: 'ACTIVE' } });
        await this.prisma.gameTemplate.upsert({
          where: { schoolId_templateId: { schoolId: school.id, templateId: registered.templateCode } },
          create: {
            templateId: registered.templateCode, schoolId: school.id, name: `${registered.name} Template`,
            description: registered.description, categoryId: category.id, difficulty: registered.difficulty,
            estimatedDuration: Math.max(1, Math.ceil(registered.durationSeconds / 60)), minimumQuestions: 0,
            maximumQuestions: 10, supportedDevices: ['Desktop', 'Tablet', 'Mobile'], status: 'ACTIVE', createdById: admin.id,
          },
          update: { status: 'ACTIVE', categoryId: category.id, difficulty: registered.difficulty, estimatedDuration: Math.max(1, Math.ceil(registered.durationSeconds / 60)) },
        });
      }
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
    if (game.componentName === 'RESCUE_MISSION') {
      const reports = await this.prisma.rescueMissionAnalytics.findMany({
        where: { gameId: id, gameResult: { assessment: { schoolId } } },
        select: { id: true, studentId: true, assessmentId: true, createdAt: true, problemSolvingScore: true, cognitiveFlexibilityScore: true, missionsCompleted: true, successfulRescues: true, strategyChanges: true, successfulStrategyChanges: true, averageSolutionTime: true, highestDifficulty: true, completionPercentage: true, overallScore: true, completionStatus: true },
        orderBy: { createdAt: 'desc' },
      });
      return reports.map((report) => ({ ...report, ageGroup: game.ageGroup }));
    }
    if (game.componentName === 'PARKING_ESCAPE') {
      const reports = await this.prisma.parkingEscapeAnalytics.findMany({ where: { gameId: id, gameResult: { assessment: { schoolId } } }, select: { id: true, studentId: true, assessmentId: true, createdAt: true, strategicPlanningScore: true, spatialReasoningScore: true, levelsCompleted: true, targetCarsEscaped: true, totalVehicleMoves: true, efficientMoves: true, unnecessaryMoves: true, averageLevelCompletionTime: true, highestLevel: true, completionPercentage: true, overallScore: true, completionStatus: true }, orderBy: { createdAt: 'desc' } });
      return reports.map((report) => ({ ...report, ageGroup: game.ageGroup, averageMovesPerLevel: report.levelsCompleted ? report.totalVehicleMoves / report.levelsCompleted : 0, moveEfficiency: report.totalVehicleMoves ? report.efficientMoves / report.totalVehicleMoves * 100 : 0 }));
    }
    if (game.componentName === 'WATER_PIPELINE') {
      const reports=await this.prisma.waterPipelineAnalytics.findMany({where:{gameId:id,gameResult:{assessment:{schoolId}}},select:{id:true,studentId:true,assessmentId:true,createdAt:true,logicalReasoningScore:true,problemSolvingScore:true,levelsCompleted:true,completedPipelines:true,averageSolutionTime:true,averageRotationsPerLevel:true,successfulConnections:true,failedConnections:true,highestLevel:true,completionPercentage:true,overallScore:true,completionStatus:true},orderBy:{createdAt:'desc'}});
      return reports.map(report=>({...report,ageGroup:game.ageGroup,connectionAccuracy:report.successfulConnections+report.failedConnections?report.successfulConnections/(report.successfulConnections+report.failedConnections)*100:0}));
    }
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
      select: { id: true, studentFirstName: true, studentLastName: true, studentDob: true, grade: true, status: true },
      orderBy: [{ studentFirstName: 'asc' }, { studentLastName: 'asc' }],
    });
    return students
      .filter((student) => studentMatchesAgeGroup(student.grade, student.studentDob, targetAgeGroup))
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
    const registration = GAME_CATALOG.find((item) => item.slug === game.slug);
    const template = registration && await this.prisma.gameTemplate.findFirst({ where: { schoolId, templateId: registration.templateCode, status: 'ACTIVE' } });
    if (!template) throw new NotFoundException('The assessment template for this game is unavailable.');
    return this.prisma.$transaction(async (tx) => {
      const assessment = await tx.gameAssessment.create({ data: {
        schoolId, createdById: userId, name: `${game.name} Assessment`, description: game.description,
        assessmentType: 'GAME_BASED', assessmentMode: 'ONLINE', subject: game.category, ageGroup: dto.ageGroup,
        topics: [registration?.cognitiveSkill || game.category], difficulty: game.difficulty, language: 'English',
        numberOfQuestions: 0, numberOfGames: 1, timeLimit: Math.max(1, Math.ceil(game.durationSeconds / 60)),
        passingMarks: 60, attemptLimit: 1, startTime: dto.startsAt ? new Date(dto.startsAt) : null,
        endTime: dto.endsAt ? new Date(dto.endsAt) : null, settings: { source: 'REAL_TIME_GAMES', gameId: game.id }, status: 'PUBLISHED',
      } });
      const generated = await tx.generatedGame.create({ data: {
        schoolId, gameAssessmentId: assessment.id, templateId: template.id, engineKey: game.componentName,
        title: game.name, description: game.description, mappingIds: [], questionIds: [], questionSnapshot: [],
        configuration: { durationSeconds: game.durationSeconds }, generationPrompt: { source: 'REAL_TIME_GAME_CATALOG' },
        status: 'PUBLISHED', createdById: userId, publishedAt: new Date(),
      } });
      const assignment = await tx.gameAssignment.create({ data: {
        gameAssessmentId: assessment.id, generatedGameId: generated.id, assignedById: userId,
        targetType: 'STUDENT', targetIds: studentIds, startDate: dto.startsAt ? new Date(dto.startsAt) : null,
        endDate: dto.endsAt ? new Date(dto.endsAt) : null, maxAttempts: 1,
        timeLimitMinutes: Math.max(1, Math.ceil(game.durationSeconds / 60)), passingScore: 60,
        assignmentSettings: { deliveryMode: 'SCHOOL', allowTutorialSkip: false }, status: 'ASSIGNED',
      } });
      await tx.gameResult.createMany({ data: studentIds.map((studentId) => ({ gameAssignmentId: assignment.id, studentId, gameId: game.id, assessmentId: assessment.id })) });
      const batch = await tx.realTimeGameAssignment.create({ data: {
        schoolId, gameId: id, assignedById: userId, ageGroup: dto.ageGroup, studentIds,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null, endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      } });
      return { ...batch, gameAssessmentId: assessment.id, gameAssignmentId: assignment.id, resultCount: studentIds.length };
    });
  }

  async bulkAssignmentOptions(ageGroupValue: string, studentId: string, schoolId: string) {
    const ageGroup = normalizeGameAgeGroup(ageGroupValue);
    if (!ageGroup) throw new BadRequestException('Please select an age group to assign all games.');
    const games = await this.prisma.game.findMany({
      where: { ageGroup, isActive: true, status: 'ACTIVE', gameType: { not: 'ASSESSMENT_ENGINE' } },
      select: { id: true, name: true, category: true, ageGroup: true, durationSeconds: true, componentName: true }, orderBy: { name: 'asc' },
    });
    if (!studentId) return { ageGroup, games: games.map((game) => ({ ...game, alreadyAssigned: false })) };
    const existing = await this.prisma.gameResult.findMany({
      where: { studentId, gameId: { in: games.map((game) => game.id) }, assessment: { schoolId }, gameAssignment: { status: 'ASSIGNED' } }, select: { gameId: true },
    });
    const assigned = new Set(existing.flatMap((row) => row.gameId ? [row.gameId] : []));
    return { ageGroup, games: games.map((game) => ({ ...game, alreadyAssigned: assigned.has(game.id) })) };
  }

  async bulkEligibleStudents(ageGroupValue: string, schoolId: string) {
    const ageGroup = normalizeGameAgeGroup(ageGroupValue);
    if (!ageGroup) throw new BadRequestException('Please select a valid age group.');

    const games = await this.prisma.game.findMany({
      where: { ageGroup, isActive: true, status: 'ACTIVE', gameType: { not: 'ASSESSMENT_ENGINE' } },
      select: { id: true },
    });
    if (!games.length) return [];

    const students = await this.prisma.application.findMany({
      where: {
        schoolId,
        assessmentRequired: { not: false },
        status: { notIn: ['DRAFT', 'REJECTED', 'WITHDRAWN'] },
      },
      select: { id: true, studentFirstName: true, studentLastName: true, studentDob: true, grade: true, status: true },
      orderBy: [{ studentFirstName: 'asc' }, { studentLastName: 'asc' }],
    });
    const eligible = students.filter((student) => studentMatchesAgeGroup(student.grade, student.studentDob, ageGroup));
    const results = await this.prisma.gameResult.findMany({
      where: {
        studentId: { in: eligible.map((student) => student.id) },
        gameId: { in: games.map((game) => game.id) },
        assessment: { schoolId },
        gameAssignment: { status: 'ASSIGNED' },
      },
      select: { studentId: true, gameId: true },
    });
    const assignedByStudent = new Map<string, Set<string>>();
    for (const result of results) {
      if (!result.gameId) continue;
      const assigned = assignedByStudent.get(result.studentId) || new Set<string>();
      assigned.add(result.gameId);
      assignedByStudent.set(result.studentId, assigned);
    }

    return eligible.map(({ studentDob: _studentDob, ...student }) => ({
      ...student,
      ageGroup,
      allGamesAssigned: (assignedByStudent.get(student.id)?.size || 0) >= games.length,
    }));
  }

  async bulkAssign(dto: BulkAssignRealTimeGamesDto, schoolId: string, userId: string) {
    const ageGroup = normalizeGameAgeGroup(dto.ageGroup);
    if (!ageGroup) throw new BadRequestException('Please select a valid age group to assign all games.');
    const requestedIds = [...new Set(dto.gameIds)];
    const games = await this.prisma.game.findMany({
      where: { id: { in: requestedIds }, ageGroup, isActive: true, status: 'ACTIVE', gameType: { not: 'ASSESSMENT_ENGINE' } },
      orderBy: { name: 'asc' },
    });
    if (games.length !== requestedIds.length) {
      throw new BadRequestException(`Every selected game must be active and belong to the ${ageGroup} age group.`);
    }
    const student = await this.prisma.application.findFirst({
      where: { id: dto.studentId, schoolId, assessmentRequired: { not: false }, status: { notIn: ['DRAFT', 'REJECTED', 'WITHDRAWN'] } },
      select: { id: true, studentFirstName: true, studentLastName: true, studentDob: true, grade: true },
    });
    if (!student || !studentMatchesAgeGroup(student.grade, student.studentDob, ageGroup)) {
      throw new BadRequestException(`The selected student is not eligible for the ${ageGroup} age group.`);
    }
    const existing = await this.prisma.gameResult.findMany({
      where: { studentId: student.id, gameId: { in: requestedIds }, assessment: { schoolId }, gameAssignment: { status: 'ASSIGNED' } },
      select: { gameId: true },
    });
    const alreadyAssignedIds = new Set(existing.flatMap((row) => row.gameId ? [row.gameId] : []));
    const newGames = games.filter((game) => !alreadyAssignedIds.has(game.id));
    const registrations = new Map(GAME_CATALOG.map((item) => [item.slug, item]));
    const templateCodes = newGames.map((game) => registrations.get(game.slug)?.templateCode).filter((code): code is string => Boolean(code));
    const templates = await this.prisma.gameTemplate.findMany({ where: { schoolId, templateId: { in: templateCodes }, status: 'ACTIVE' } });
    if (templates.length !== newGames.length) throw new BadRequestException('One or more selected games do not have an active assessment template.');

    const assignmentIds = await this.prisma.$transaction(async (tx) => {
      const created: string[] = [];
      for (const game of newGames) {
        const registration = registrations.get(game.slug)!;
        const template = templates.find((item) => item.templateId === registration.templateCode)!;
        const assessment = await tx.gameAssessment.create({ data: {
          schoolId, createdById: userId, name: `${game.name} Assessment`, description: game.description,
          assessmentType: 'GAME_BASED', assessmentMode: 'ONLINE', subject: game.category, ageGroup,
          topics: [registration.cognitiveSkill || game.category], difficulty: game.difficulty, language: 'English',
          numberOfQuestions: 0, numberOfGames: 1, timeLimit: Math.max(1, Math.ceil(game.durationSeconds / 60)),
          passingMarks: 60, attemptLimit: 1, settings: { source: 'REAL_TIME_GAMES_BULK', gameId: game.id }, status: 'PUBLISHED',
        } });
        const generated = await tx.generatedGame.create({ data: {
          schoolId, gameAssessmentId: assessment.id, templateId: template.id, engineKey: game.componentName,
          title: game.name, description: game.description, mappingIds: [], questionIds: [], questionSnapshot: [],
          configuration: { durationSeconds: game.durationSeconds }, generationPrompt: { source: 'REAL_TIME_GAME_CATALOG' },
          status: 'PUBLISHED', createdById: userId, publishedAt: new Date(),
        } });
        const assignment = await tx.gameAssignment.create({ data: {
          gameAssessmentId: assessment.id, generatedGameId: generated.id, assignedById: userId,
          targetType: 'STUDENT', targetIds: [student.id], maxAttempts: 1,
          timeLimitMinutes: Math.max(1, Math.ceil(game.durationSeconds / 60)), passingScore: 60,
          assignmentSettings: { deliveryMode: 'SCHOOL', allowTutorialSkip: false, bulkAgeGroup: ageGroup }, status: 'ASSIGNED',
        } });
        await tx.gameResult.create({ data: { gameAssignmentId: assignment.id, studentId: student.id, gameId: game.id, assessmentId: assessment.id } });
        await tx.realTimeGameAssignment.create({ data: { schoolId, gameId: game.id, assignedById: userId, ageGroup, studentIds: [student.id] } });
        created.push(assignment.id);
      }
      return created;
    });
    return {
      ageGroup, student: { id: student.id, name: `${student.studentFirstName} ${student.studentLastName}` },
      requestedGames: requestedIds.length, assignedCount: assignmentIds.length, alreadyAssignedCount: alreadyAssignedIds.size,
      assignedGameIds: newGames.map((game) => game.id), alreadyAssignedGameIds: [...alreadyAssignedIds],
      message: `${assignmentIds.length} assessments assigned successfully to ${student.studentFirstName} ${student.studentLastName} for the ${ageGroup} age group.`,
    };
  }

  async reviews(id: string, schoolId: string) {
    const game = await this.one(id, schoolId);
    const results = await this.prisma.gameResult.findMany({
      where: { gameId: id, assessment: { schoolId } },
      include: {
        gameAssignment: { include: { generatedGame: true } }, attempts: { include: { scores: true }, orderBy: { attemptNumber: 'desc' } },
        followLightsAnalytics: true, ballStackAnalytics: true, soundDetectiveAnalytics: true,
        colorPathAnalytics: true, magicPaintAnalytics: true, trainTrackAnalytics: true,
        packageSorterAnalytics: true, rescueMissionAnalytics: true, parkingEscapeAnalytics: true,
        waterPipelineAnalytics: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    const students = await this.prisma.application.findMany({
      where: { schoolId, id: { in: results.map((row) => row.studentId) } }, select: { id: true, studentFirstName: true, studentLastName: true, grade: true },
    });
    return results.map((result) => {
      const analytics = result.followLightsAnalytics || result.ballStackAnalytics || result.soundDetectiveAnalytics
        || result.colorPathAnalytics || result.magicPaintAnalytics || result.trainTrackAnalytics
        || result.packageSorterAnalytics || result.rescueMissionAnalytics || result.parkingEscapeAnalytics
        || result.waterPipelineAnalytics;
      const performanceMetrics = analytics ? Object.fromEntries(Object.entries(analytics).filter(([key]) => ![
        'id', 'studentId', 'assessmentId', 'gameId', 'gameResultId', 'createdAt', 'updatedAt',
      ].includes(key))) : {};
      return {
        ...result, gameName: game.name, componentName: game.componentName, performanceMetrics,
        student: students.find((student) => student.id === result.studentId) || null,
      };
    });
  }

  async review(id: string, resultId: string, dto: ReviewGameResultDto, schoolId: string, userId: string) {
    const result = await this.prisma.gameResult.findFirst({ where: { id: resultId, gameId: id, assessment: { schoolId }, status: 'COMPLETED' } });
    if (!result) throw new NotFoundException('A completed game result is required before school review.');
    const isFinalDecision = dto.reviewStatus !== 'PENDING';
    return this.prisma.gameResult.update({ where: { id: result.id }, data: {
      reviewStatus: dto.reviewStatus, schoolReview: dto.schoolReview.trim(), recommendation: dto.recommendation?.trim() || null,
      reviewedById: isFinalDecision ? userId : null, reviewedAt: isFinalDecision ? new Date() : null,
    } });
  }

  assignments(id: string, schoolId: string) {
    return this.prisma.realTimeGameAssignment.findMany({ where: { gameId: id, schoolId }, orderBy: { createdAt: 'desc' } });
  }
}
