import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SchoolId } from '../../core/tenant.decorator';
import { CreateGameAssignmentDto, SubmitGameDto, UpdateGameAssignmentDto } from './dto/game-play.dto';
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
  @Patch('game-assignments/:assignmentId')
  @Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL, Role.TEACHER, Role.ADMISSIONS_STAFF)
  updateAssignment(@Param('assignmentId') assignmentId: string, @Body() dto: UpdateGameAssignmentDto, @SchoolId() schoolId: string) {
    return this.service.updateAssignment(assignmentId, dto.allowedReassessments, schoolId);
  }
  @Get('game-assignments/:assignmentId/students/:studentId/history')
  @Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL, Role.TEACHER, Role.ADMISSIONS_STAFF)
  attemptHistory(@Param('assignmentId') assignmentId: string, @Param('studentId') studentId: string, @SchoolId() schoolId: string) {
    return this.service.attemptHistory(assignmentId, studentId, schoolId);
  }
  @Get('assignment-venue')
  @Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL, Role.TEACHER, Role.ADMISSIONS_STAFF)
  assignmentVenue(@SchoolId() schoolId: string, @Query('ageGroup') ageGroup: string) {
    return this.service.assignmentVenue(schoolId, ageGroup);
  }
  @Get('parent/games')
  @Roles(Role.PARENT)
  parentGames(@SchoolId() schoolId: string, @Req() req: any) { return this.service.parentGames(schoolId, req.user.id); }
  @Post('parent/games/:assignmentId/reassessment-request')
  @Roles(Role.PARENT)
  requestGameReassessment(@Param('assignmentId') assignmentId: string, @Body() body: { childId: string; reason?: string }, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.requestGameReassessment(assignmentId, body.childId, schoolId, req.user.id, body.reason);
  }
  @Get('game-reassessment-requests')
  @Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL, Role.TEACHER, Role.ADMISSIONS_STAFF)
  gameReassessmentRequests(@SchoolId() schoolId: string, @Query('status') status?: string) {
    return this.service.gameReassessmentRequests(schoolId, status);
  }
  @Patch('game-reassessment-requests/:resultId')
  @Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL, Role.TEACHER, Role.ADMISSIONS_STAFF)
  decideGameReassessment(@Param('resultId') resultId: string, @Body() body: { decision: 'APPROVED' | 'REJECTED' }, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.decideGameReassessment(resultId, body.decision, schoolId, req.user.id);
  }
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
  @Post('parent/games/:assignmentId/finalize')
  @Roles(Role.PARENT)
  parentFinalize(@Param('assignmentId') assignmentId: string, @Body() body: { childId: string }, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.parentFinalize(assignmentId, body.childId, schoolId, req.user.id);
  }
  @Post('parent/children/:childId/games/finalize')
  @Roles(Role.PARENT)
  parentFinalizeGames(@Param('childId') childId: string, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.parentFinalizeGames(childId, schoolId, req.user.id);
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
  async studentGames(@SchoolId() schoolId: string, @Req() req: any) { return this.service.studentGames(schoolId, await this.service.studentApplicationId(schoolId, req.user.id)); }
  @Get('student/games/:assignmentId/tutorial')
  @Roles(Role.STUDENT)
  async tutorial(@Param('assignmentId') assignmentId: string, @SchoolId() schoolId: string, @Req() req: any) { return this.service.tutorial(assignmentId, schoolId, await this.service.studentApplicationId(schoolId, req.user.id)); }
  @Post('student/games/:assignmentId/tutorial/progress')
  @Roles(Role.STUDENT)
  async tutorialProgress(@Param('assignmentId') assignmentId: string, @Body() body: { tutorialViewed?: boolean; practiceCompleted?: boolean }, @SchoolId() schoolId: string, @Req() req: any) { return this.service.saveTutorialProgress(assignmentId, schoolId, await this.service.studentApplicationId(schoolId, req.user.id), body); }
  @Post('student/games/:assignmentId/practice/start')
  @Roles(Role.STUDENT)
  async practice(@Param('assignmentId') assignmentId: string, @SchoolId() schoolId: string, @Req() req: any) { return this.service.startPractice(assignmentId, schoolId, await this.service.studentApplicationId(schoolId, req.user.id)); }
  @Post('student/games/:assignmentId/practice/finish')
  @Roles(Role.STUDENT)
  async finishPractice(@Param('assignmentId') assignmentId: string, @Body() body: { sessionId: string }, @SchoolId() schoolId: string, @Req() req: any) { return this.service.finishPractice(assignmentId, body.sessionId, schoolId, await this.service.studentApplicationId(schoolId, req.user.id)); }
  @Post('student/games/:assignmentId/start')
  @Roles(Role.STUDENT)
  async start(@Param('assignmentId') assignmentId: string, @SchoolId() schoolId: string, @Req() req: any) { return this.service.start(assignmentId, schoolId, await this.service.studentApplicationId(schoolId, req.user.id)); }
  @Post('student/games/:assignmentId/restart')
  @Roles(Role.STUDENT)
  async restart(@Param('assignmentId') assignmentId: string, @SchoolId() schoolId: string, @Req() req: any) { return this.service.start(assignmentId, schoolId, await this.service.studentApplicationId(schoolId, req.user.id), true); }
  @Get('student/games/:assignmentId/resume')
  @Roles(Role.STUDENT)
  async resume(@Param('assignmentId') assignmentId: string, @SchoolId() schoolId: string, @Req() req: any) { return this.service.resume(assignmentId, schoolId, await this.service.studentApplicationId(schoolId, req.user.id)); }
  @Post('student/games/:assignmentId/submit')
  @Roles(Role.STUDENT)
  async submit(@Param('assignmentId') assignmentId: string, @Body() dto: SubmitGameDto, @SchoolId() schoolId: string, @Req() req: any) { return this.service.submit(assignmentId, dto.sessionId, schoolId, await this.service.studentApplicationId(schoolId, req.user.id)); }
}
