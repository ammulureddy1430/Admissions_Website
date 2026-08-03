import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SchoolId } from '../../core/tenant.decorator';
import { GameInsightsService } from './game-insights.service';

@Controller('game-assessments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GameInsightsController {
  constructor(private readonly service: GameInsightsService) {}
  @Get('analytics/dashboard')
  @Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL, Role.TEACHER, Role.ADMISSIONS_STAFF)
  dashboard(@SchoolId() schoolId: string, @Query() query: any) { return this.service.dashboard(schoolId, query); }
  @Get('analytics/questions')
  @Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL, Role.TEACHER, Role.ADMISSIONS_STAFF)
  questions(@SchoolId() schoolId: string) { return this.service.questionAnalytics(schoolId); }
  @Get('analytics/student/:studentId')
  @Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL, Role.TEACHER, Role.ADMISSIONS_STAFF)
  student(@SchoolId() schoolId: string, @Req() req: any) { return this.service.studentAnalytics(schoolId, req.params.studentId); }
  @Get('gamification/profile')
  @Roles(Role.STUDENT)
  profile(@SchoolId() schoolId: string, @Req() req: any) { return this.service.profile(schoolId, req.user.id); }
  @Get('gamification/leaderboard')
  @Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL, Role.TEACHER, Role.ADMISSIONS_STAFF, Role.STUDENT, Role.PARENT)
  leaderboard(@SchoolId() schoolId: string, @Query('limit') limit?: string) { return this.service.leaderboard(schoolId, Number(limit) || 25); }
  @Get('gamification/challenges')
  @Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL, Role.TEACHER, Role.ADMISSIONS_STAFF, Role.STUDENT)
  challenges(@SchoolId() schoolId: string, @Req() req: any) { return this.service.challenges(schoolId, req.user.role === Role.STUDENT ? req.user.id : undefined); }
}
