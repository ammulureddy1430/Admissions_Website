import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SchoolId } from '../../core/tenant.decorator';
import { AssignRealTimeGameDto, BulkAssignRealTimeGamesDto, CreateGameDto, ReviewGameResultDto, UpdateGameDto } from './dto/game.dto';
import { GamesService } from './games.service';

@Controller('games')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL, Role.TEACHER, Role.ADMISSIONS_STAFF)
export class GamesController {
  constructor(private readonly service: GamesService) {}
  @Get() list(@SchoolId() schoolId: string, @Query() query: Record<string, string>) { return this.service.list(schoolId, query); }
  @Post() @Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL) create(@Body() dto: CreateGameDto) { return this.service.create(dto); }
  @Post('bulk-assign') bulkAssign(@Body() dto: BulkAssignRealTimeGamesDto, @SchoolId() schoolId: string, @Req() req: any) { return this.service.bulkAssign(dto, schoolId, req.user.id); }
  @Get('bulk-eligible-students') bulkEligibleStudents(@Query('ageGroup') ageGroup: string, @SchoolId() schoolId: string) { return this.service.bulkEligibleStudents(ageGroup, schoolId); }
  @Get('bulk-assignment-options') bulkAssignmentOptions(@Query('ageGroup') ageGroup: string, @Query('studentId') studentId: string, @SchoolId() schoolId: string) { return this.service.bulkAssignmentOptions(ageGroup, studentId, schoolId); }
  @Get('results/summary') resultSummary(@SchoolId() schoolId: string, @Query() query: Record<string, string>) { return this.service.resultSummary(schoolId, query); }
  @Patch('results/student/:studentId/review') reviewStudentResults(@Param('studentId') studentId: string, @Body() dto: ReviewGameResultDto, @SchoolId() schoolId: string, @Req() req: any) { return this.service.reviewStudentResults(studentId, dto, schoolId, req.user.id); }
  @Get('results/:resultId') resultDetail(@Param('resultId') resultId: string, @SchoolId() schoolId: string) { return this.service.resultDetail(resultId, schoolId); }
  @Get(':id') one(@Param('id') id: string, @SchoolId() schoolId: string) { return this.service.one(id, schoolId); }
  @Get(':id/analytics') analytics(@Param('id') id: string, @SchoolId() schoolId: string) { return this.service.analytics(id, schoolId); }
  @Get(':id/reports') reports(@Param('id') id: string, @SchoolId() schoolId: string) { return this.service.reports(id, schoolId); }
  @Get(':id/reviews') reviews(@Param('id') id: string, @SchoolId() schoolId: string) { return this.service.reviews(id, schoolId); }
  @Patch(':id/reviews/:resultId') review(@Param('id') id: string, @Param('resultId') resultId: string, @Body() dto: ReviewGameResultDto, @SchoolId() schoolId: string, @Req() req: any) { return this.service.review(id, resultId, dto, schoolId, req.user.id); }
  @Get(':id/eligible-students') eligibleStudents(@Param('id') id: string, @Query('ageGroup') ageGroup: string, @SchoolId() schoolId: string) { return this.service.eligibleStudents(id, schoolId, ageGroup); }
  @Get(':id/assignments') assignments(@Param('id') id: string, @SchoolId() schoolId: string) { return this.service.assignments(id, schoolId); }
  @Post(':id/assignments') assign(@Param('id') id: string, @Body() dto: AssignRealTimeGameDto, @SchoolId() schoolId: string, @Req() req: any) { return this.service.assign(id, dto, schoolId, req.user.id); }
  @Patch(':id') @Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL) update(@Param('id') id: string, @Body() dto: UpdateGameDto, @SchoolId() schoolId: string) { return this.service.update(id, dto, schoolId); }
  @Patch(':id/toggle') @Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL) toggle(@Param('id') id: string, @SchoolId() schoolId: string) { return this.service.toggle(id, schoolId); }
  @Delete(':id') @Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL) remove(@Param('id') id: string, @SchoolId() schoolId: string) { return this.service.remove(id, schoolId); }
}
