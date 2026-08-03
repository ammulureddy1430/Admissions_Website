import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SchoolId } from '../../core/tenant.decorator';
import { CreateGameAssignmentDto, SubmitGameDto } from './dto/game-play.dto';
import { GamePlayService } from './game-play.service';

@Controller('game-assessments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GamePlayController {
  constructor(private readonly service: GamePlayService) {}

  @Post('game-assignments')
  @Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL, Role.TEACHER, Role.ADMISSIONS_STAFF)
  assign(@Body() dto: CreateGameAssignmentDto, @SchoolId() schoolId: string, @Req() req: any) { return this.service.assign(dto, schoolId, req.user.id); }
  @Get('game-assignments')
  @Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL, Role.TEACHER, Role.ADMISSIONS_STAFF)
  assignments(@SchoolId() schoolId: string, @Query() query: any) { return this.service.assignments(schoolId, query); }
  @Get('parent/games')
  @Roles(Role.PARENT)
  parentGames(@SchoolId() schoolId: string, @Req() req: any) { return this.service.parentGames(schoolId, req.user.id); }
  @Post('parent/games/:assignmentId/start')
  @Roles(Role.PARENT)
  parentStart(@Param('assignmentId') assignmentId: string, @Body() body: { childId: string }, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.parentStart(assignmentId, body.childId, schoolId, req.user.id);
  }
  @Post('parent/games/:assignmentId/restart')
  @Roles(Role.PARENT)
  parentRestart(@Param('assignmentId') assignmentId: string, @Body() body: { childId: string }, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.parentStart(assignmentId, body.childId, schoolId, req.user.id, true);
  }
  @Post('parent/games/:assignmentId/submit')
  @Roles(Role.PARENT)
  parentSubmit(@Param('assignmentId') assignmentId: string, @Body() body: { childId: string; sessionId: string }, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.parentSubmit(assignmentId, body.sessionId, body.childId, schoolId, req.user.id);
  }
  @Post('parent/games/:assignmentId/tutorial')
  @Roles(Role.PARENT)
  parentTutorial(@Param('assignmentId') assignmentId: string, @Body() body: { childId: string }, @SchoolId() schoolId: string, @Req() req: any) { return this.service.parentTutorial(assignmentId, body.childId, schoolId, req.user.id); }
  @Post('parent/games/:assignmentId/tutorial/progress')
  @Roles(Role.PARENT)
  parentTutorialProgress(@Param('assignmentId') assignmentId: string, @Body() body: { childId: string; tutorialViewed?: boolean; practiceCompleted?: boolean }, @SchoolId() schoolId: string, @Req() req: any) { return this.service.parentTutorialProgress(assignmentId, body.childId, schoolId, req.user.id, body); }
  @Post('parent/games/:assignmentId/practice/start')
  @Roles(Role.PARENT)
  parentPractice(@Param('assignmentId') assignmentId: string, @Body() body: { childId: string }, @SchoolId() schoolId: string, @Req() req: any) { return this.service.parentPractice(assignmentId, body.childId, schoolId, req.user.id); }
  @Post('parent/games/:assignmentId/practice/finish')
  @Roles(Role.PARENT)
  parentFinishPractice(@Param('assignmentId') assignmentId: string, @Body() body: { childId: string; sessionId: string }, @SchoolId() schoolId: string, @Req() req: any) { return this.service.parentFinishPractice(assignmentId, body.sessionId, body.childId, schoolId, req.user.id); }
  @Get('student/games')
  @Roles(Role.STUDENT)
  studentGames(@SchoolId() schoolId: string, @Req() req: any) { return this.service.studentGames(schoolId, req.user.id); }
  @Get('student/games/:assignmentId/tutorial')
  @Roles(Role.STUDENT)
  tutorial(@Param('assignmentId') assignmentId: string, @SchoolId() schoolId: string, @Req() req: any) { return this.service.tutorial(assignmentId, schoolId, req.user.id); }
  @Post('student/games/:assignmentId/tutorial/progress')
  @Roles(Role.STUDENT)
  tutorialProgress(@Param('assignmentId') assignmentId: string, @Body() body: { tutorialViewed?: boolean; practiceCompleted?: boolean }, @SchoolId() schoolId: string, @Req() req: any) { return this.service.saveTutorialProgress(assignmentId, schoolId, req.user.id, body); }
  @Post('student/games/:assignmentId/practice/start')
  @Roles(Role.STUDENT)
  practice(@Param('assignmentId') assignmentId: string, @SchoolId() schoolId: string, @Req() req: any) { return this.service.startPractice(assignmentId, schoolId, req.user.id); }
  @Post('student/games/:assignmentId/practice/finish')
  @Roles(Role.STUDENT)
  finishPractice(@Param('assignmentId') assignmentId: string, @Body() body: { sessionId: string }, @SchoolId() schoolId: string, @Req() req: any) { return this.service.finishPractice(assignmentId, body.sessionId, schoolId, req.user.id); }
  @Post('student/games/:assignmentId/start')
  @Roles(Role.STUDENT)
  start(@Param('assignmentId') assignmentId: string, @SchoolId() schoolId: string, @Req() req: any) { return this.service.start(assignmentId, schoolId, req.user.id); }
  @Post('student/games/:assignmentId/restart')
  @Roles(Role.STUDENT)
  restart(@Param('assignmentId') assignmentId: string, @SchoolId() schoolId: string, @Req() req: any) { return this.service.start(assignmentId, schoolId, req.user.id, true); }
  @Get('student/games/:assignmentId/resume')
  @Roles(Role.STUDENT)
  resume(@Param('assignmentId') assignmentId: string, @SchoolId() schoolId: string, @Req() req: any) { return this.service.resume(assignmentId, schoolId, req.user.id); }
  @Post('student/games/:assignmentId/submit')
  @Roles(Role.STUDENT)
  submit(@Param('assignmentId') assignmentId: string, @Body() dto: SubmitGameDto, @SchoolId() schoolId: string, @Req() req: any) { return this.service.submit(assignmentId, dto.sessionId, schoolId, req.user.id); }
}
