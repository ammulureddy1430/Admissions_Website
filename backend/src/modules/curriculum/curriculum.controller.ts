import {
  Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SchoolId } from '../../core/tenant.decorator';
import { CurriculumService } from './curriculum.service';
import {
  CreateAcademicYearDto, CreateBoardDto, CreateCategoryDto, CreateChapterDto,
  CreateGameTemplateDto, CreateGradeDto, CreateLearningOutcomeDto,
  CreateSubjectDto, CreateTopicDto, TemplateActionDto,
} from './dto/curriculum.dto';

const EDIT_ROLES = [Role.SCHOOL_ADMIN, Role.PRINCIPAL, Role.TEACHER, Role.ADMISSIONS_STAFF];
const ADMIN_ROLES = [Role.SCHOOL_ADMIN, Role.PRINCIPAL];

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...EDIT_ROLES)
export class CurriculumController {
  constructor(private readonly service: CurriculumService) {}

  @Post('boards') createBoard(@Body() dto: CreateBoardDto, @SchoolId() schoolId: string, @Req() req: any) { return this.service.createBoard(dto, schoolId, req.user.id); }
  @Get('boards') boards(@SchoolId() schoolId: string, @Query() q: any) { return this.service.boards(schoolId, q); }

  @Post('academic-years') createYear(@Body() dto: CreateAcademicYearDto, @SchoolId() schoolId: string, @Req() req: any) { return this.service.createAcademicYear(dto, schoolId, req.user.id); }
  @Get('academic-years') years(@SchoolId() schoolId: string, @Query() q: any) { return this.service.academicYears(schoolId, q); }

  @Post('grades') createGrade(@Body() dto: CreateGradeDto, @SchoolId() schoolId: string, @Req() req: any) { return this.service.createGrade(dto, schoolId, req.user.id); }
  @Get('grades') grades(@SchoolId() schoolId: string, @Query() q: any) { return this.service.grades(schoolId, q); }

  @Post('subjects') createSubject(@Body() dto: CreateSubjectDto, @SchoolId() schoolId: string, @Req() req: any) { return this.service.createSubject(dto, schoolId, req.user.id); }
  @Get('subjects') subjects(@SchoolId() schoolId: string, @Query() q: any) { return this.service.subjects(schoolId, q); }

  @Post('chapters') createChapter(@Body() dto: CreateChapterDto, @SchoolId() schoolId: string, @Req() req: any) { return this.service.createChapter(dto, schoolId, req.user.id); }
  @Get('chapters') chapters(@SchoolId() schoolId: string, @Query() q: any) { return this.service.chapters(schoolId, q); }

  @Post('topics') createTopic(@Body() dto: CreateTopicDto, @SchoolId() schoolId: string, @Req() req: any) { return this.service.createTopic(dto, schoolId, req.user.id); }
  @Get('topics') topics(@SchoolId() schoolId: string, @Query() q: any) { return this.service.topics(schoolId, q); }

  @Post('learning-outcomes') createOutcome(@Body() dto: CreateLearningOutcomeDto, @SchoolId() schoolId: string, @Req() req: any) { return this.service.createOutcome(dto, schoolId, req.user.id); }
  @Get('learning-outcomes') outcomes(@SchoolId() schoolId: string, @Query() q: any) { return this.service.outcomes(schoolId, q); }

  @Post('game-categories') createCategory(@Body() dto: CreateCategoryDto, @SchoolId() schoolId: string, @Req() req: any) { return this.service.createCategory(dto, schoolId, req.user.id); }
  @Get('game-categories') categories(@SchoolId() schoolId: string) { return this.service.categories(schoolId); }

  @Post('game-library') createTemplate(@Body() dto: CreateGameTemplateDto, @SchoolId() schoolId: string, @Req() req: any) { return this.service.createTemplate(dto, schoolId, req.user.id); }
  @Get('game-library') templates(@SchoolId() schoolId: string, @Query() q: any) { return this.service.templates(schoolId, q); }
  @Get('game-library/:id') template(@Param('id') id: string, @SchoolId() schoolId: string) { return this.service.template(id, schoolId); }
  @Put('game-library/:id') updateTemplate(@Param('id') id: string, @Body() dto: CreateGameTemplateDto, @SchoolId() schoolId: string, @Req() req: any) { return this.service.updateTemplate(id, dto, schoolId, req.user.id); }
  @Put('game-library') updateTemplateCompat(@Body() dto: CreateGameTemplateDto, @SchoolId() schoolId: string, @Req() req: any) { return this.service.updateTemplate(dto.id || '', dto, schoolId, req.user.id); }
  @Post('game-library/:id/action') templateAction(@Param('id') id: string, @Body() dto: TemplateActionDto, @SchoolId() schoolId: string, @Req() req: any) { return this.service.templateAction(id, dto.action.toUpperCase(), schoolId, req.user.id); }
  @Delete('game-library/:id') @Roles(...ADMIN_ROLES) deleteTemplate(@Param('id') id: string, @SchoolId() schoolId: string, @Req() req: any) { return this.service.removeTemplate(id, schoolId, req.user.id); }
  @Delete('game-library') @Roles(...ADMIN_ROLES) deleteTemplateCompat(@Query('id') id: string, @SchoolId() schoolId: string, @Req() req: any) { return this.service.removeTemplate(id, schoolId, req.user.id); }

  @Get('curriculum-audit-logs') @Roles(...ADMIN_ROLES) audit(@SchoolId() schoolId: string, @Query() q: any) { return this.service.auditLogs(schoolId, q); }
  @Put('curriculum/:type/:id') updateEntity(@Param('type') type: string, @Param('id') id: string, @Body() dto: any, @SchoolId() schoolId: string, @Req() req: any) { return this.service.updateEntity(type, id, dto, schoolId, req.user.id); }
  @Delete('curriculum/:type/:id') @Roles(...ADMIN_ROLES) deleteEntity(@Param('type') type: string, @Param('id') id: string, @SchoolId() schoolId: string, @Req() req: any) { return this.service.removeEntity(type, id, schoolId, req.user.id); }
}
