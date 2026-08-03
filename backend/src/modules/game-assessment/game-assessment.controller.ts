import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SchoolId } from '../../core/tenant.decorator';
import {
  AssignGameDto,
  CreateGameAssessmentDto,
} from './dto/game-assessment.dto';
import { GameAssessmentService } from './game-assessment.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class GameAssessmentController {
  constructor(private readonly service: GameAssessmentService) {}

  private assertSchoolAccess(schoolId: string, user: { role: Role; schoolId?: string | null }) {
    if (user.role !== Role.SUPER_ADMIN && user.schoolId !== schoolId) {
      throw new ForbiddenException('You cannot access another school’s game assessments.');
    }
  }

  @Post('game-assessments')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  create(@Body() dto: CreateGameAssessmentDto, @SchoolId() schoolId: string, @Req() req: any) {
    this.assertSchoolAccess(schoolId, req.user);
    return this.service.create(dto, schoolId, req.user.id);
  }

  @Get('game-assessments')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  findAll(@SchoolId() schoolId: string, @Req() req: any) {
    this.assertSchoolAccess(schoolId, req.user);
    return this.service.findAll(schoolId);
  }

  @Put('game-assessments/:id')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  update(@Param('id') id: string, @Body() dto: CreateGameAssessmentDto, @SchoolId() schoolId: string, @Req() req: any) {
    this.assertSchoolAccess(schoolId, req.user);
    return this.service.update(id, dto, schoolId);
  }

  @Delete('game-assessments/:id')
  @Roles(Role.SCHOOL_ADMIN)
  remove(@Param('id') id: string, @SchoolId() schoolId: string, @Req() req: any) {
    this.assertSchoolAccess(schoolId, req.user);
    return this.service.remove(id, schoolId);
  }

  @Post('assign-game')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  assign(@Body() dto: AssignGameDto, @SchoolId() schoolId: string, @Req() req: any) {
    this.assertSchoolAccess(schoolId, req.user);
    return this.service.assign(dto, schoolId, req.user.id);
  }

  @Get('student-games')
  studentGames(@Req() req: any) {
    return this.service.studentGames(req.user.id);
  }

  @Post('submit-game')
  submitGame() {
    return { status: 'PLACEHOLDER', message: 'Game engine submission is reserved for a later phase.' };
  }

  @Get('leaderboard')
  leaderboard() {
    return this.service.leaderboardPlaceholder();
  }

  @Get('game-analytics')
  analytics() {
    return this.service.analyticsPlaceholder();
  }
}
