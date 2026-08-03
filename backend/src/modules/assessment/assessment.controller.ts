import { Controller, Post, Get, Put, Patch, Delete, Body, Param, Req, UseGuards, Query, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { AssessmentService } from './assessment.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { SubmitAssessmentDto } from './dto/submit-assessment.dto';
import { ReviewAssessmentDto } from './dto/review-assessment.dto';
import { LogAssessmentEventDto, UpdateSecurityStatsDto } from './dto/log-event.dto';
import { SchoolId } from '../../core/tenant.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { Role } from '@prisma/client';

@Controller('assessments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @Post()
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async create(@Body() dto: CreateAssessmentDto, @SchoolId() schoolId: string) {
    return this.assessmentService.create(dto, schoolId);
  }

  @Get()
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async findAll(
    @SchoolId() schoolId: string,
    @Query('status') status?: string,
    @Query('grade') grade?: string,
    @Query('subject') subject?: string,
  ) {
    return this.assessmentService.findAll(schoolId, status, grade, subject);
  }

  @Get(':id')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async findOne(@Param('id') id: string, @SchoolId() schoolId: string) {
    return this.assessmentService.findOne(id, schoolId);
  }

  @Put(':id')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async update(@Param('id') id: string, @Body() dto: CreateAssessmentDto, @SchoolId() schoolId: string) {
    return this.assessmentService.update(id, dto, schoolId);
  }

  @Delete(':id')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async remove(@Param('id') id: string, @SchoolId() schoolId: string) {
    return this.assessmentService.remove(id, schoolId);
  }

  @Post('generate')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async generate(
    @Body() dto: { grade: string; subject: string; difficulty: string; questionCount: number; writtenQuestionCount?: number; chapter?: string; questionTypes?: string[] },
    @SchoolId() schoolId: string,
    @Req() req: any,
  ) {
    if (req.user.role !== Role.SUPER_ADMIN && req.user.schoolId !== schoolId) {
      throw new ForbiddenException('You cannot generate an assessment from another school’s source library.');
    }
    return this.assessmentService.generateQuestions(dto, schoolId);
  }

  @Post('generate-listening')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async generateListening(
    @Body() dto: { grade: string; subject: string; difficulty: string; activityType: string; transcript?: string; questionCount: number },
    @SchoolId() schoolId: string,
  ) {
    return this.assessmentService.generateListeningQuestions(dto, schoolId);
  }

  @Post('publish')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async publish(
    @Body() dto: { assessmentId: string; applicationIds: string[]; dueDate: string; schedule?: any; slots?: any[]; autoBook?: boolean; notificationPreferences?: any },
    @SchoolId() schoolId: string,
  ) {
    return this.assessmentService.publish(dto, schoolId);
  }

  @Get('submissions/list')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async getSubmissions(@SchoolId() schoolId: string) {
    return this.assessmentService.getSubmissions(schoolId);
  }

  @Get('submissions/:id')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async getSubmission(@Param('id') id: string, @SchoolId() schoolId: string) {
    return this.assessmentService.getSubmission(id, schoolId);
  }

  @Post('submissions/:id/ai-grade')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async aiGrade(@Param('id') id: string, @SchoolId() schoolId: string) {
    return this.assessmentService.aiGradeSubmission(id, schoolId);
  }

  @Post('game-submissions/:id/ai-review')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async aiReviewGame(@Param('id') id: string, @SchoolId() schoolId: string) {
    return this.assessmentService.aiReviewGameSubmission(id, schoolId);
  }

  @Post('review')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async review(@Body() dto: ReviewAssessmentDto, @SchoolId() schoolId: string) {
    return this.assessmentService.review(dto, schoolId);
  }

  @Get('reassignment-requests/list')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async getReassignmentRequests(@SchoolId() schoolId: string, @Query('status') status?: string) {
    return this.assessmentService.getReassignmentRequests(schoolId, status);
  }

  @Post('reassignment-requests/:id/approve')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async approveReassignment(
    @Param('id') id: string,
    @Body() dto: { questionCount?: number; totalMarks?: number; timeLimit?: number; dueDate?: string; difficulty?: string; passingMarks?: number; questions?: any[]; hasWritten?: boolean; hasListening?: boolean; hasReading?: boolean; hasSpeaking?: boolean; proctoringEnabled?: boolean; readingText?: string; readingInstructions?: string; listeningActivityType?: string; listeningTranscript?: string; listeningInstructions?: string; speakingActivityType?: string; speakingPrompt?: string },
    @SchoolId() schoolId: string,
    @Req() req: any,
  ) {
    return this.assessmentService.approveReassignment(id, dto, schoolId, req.user.id);
  }

  @Post('reassignment-requests/:id/generate-preview')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async generateReassignmentPreview(
    @Param('id') id: string,
    @Body() dto: { questionCount?: number; difficulty?: string; writtenQuestionCount?: number; hasWritten?: boolean; hasListening?: boolean; hasReading?: boolean; hasSpeaking?: boolean; listeningActivityType?: string; listeningTranscript?: string },
    @SchoolId() schoolId: string,
  ) {
    return this.assessmentService.generateReassignmentPreview(id, dto, schoolId);
  }

  @Post('reassignment-requests/:id/reject')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async rejectReassignment(
    @Param('id') id: string,
    @Body() dto: { reason: string },
    @SchoolId() schoolId: string,
    @Req() req: any,
  ) {
    return this.assessmentService.rejectReassignment(id, dto.reason, schoolId, req.user.id);
  }

  // Parent Portal Routes
  @Get('parent/list')
  @Roles(Role.PARENT)
  async getParentAssessments(@Req() req: any) {
    const parent = req.user as any;
    return this.assessmentService.getParentAssessments(parent.id);
  }

  @Get('parent/detail/:id')
  @Roles(Role.PARENT)
  async getParentAssessment(@Param('id') id: string, @Req() req: any) {
    const parent = req.user as any;
    return this.assessmentService.getParentAssessment(id, parent.id);
  }

  @Post('parent/:id/venue-choice')
  @Roles(Role.PARENT)
  async chooseParentAssessmentVenue(
    @Param('id') id: string,
    @Body() dto: { venueChoice: 'HOME' | 'SCHOOL' },
    @Req() req: any,
  ) {
    if (!['HOME', 'SCHOOL'].includes(dto.venueChoice)) {
      throw new BadRequestException('Venue choice must be HOME or SCHOOL.');
    }
    const parent = req.user as any;
    return this.assessmentService.chooseParentAssessmentVenue(
      id,
      dto.venueChoice,
      parent.id,
    );
  }

  @Post('parent/start/:id')
  @Roles(Role.PARENT)
  async startParentAssessment(@Param('id') id: string, @Req() req: any) {
    const parent = req.user as any;
    return this.assessmentService.startParentAssessment(id, parent.id);
  }

  @Post('parent/save/:id')
  @Roles(Role.PARENT)
  async saveParentAnswers(@Param('id') id: string, @Body() dto: SubmitAssessmentDto, @Req() req: any) {
    const parent = req.user as any;
    return this.assessmentService.saveParentAnswers(id, dto, parent.id);
  }

  @Post('parent/submit/:id')
  @Roles(Role.PARENT)
  async submitParentAssessment(@Param('id') id: string, @Body() dto: SubmitAssessmentDto, @Req() req: any) {
    const parent = req.user as any;
    return this.assessmentService.submitParentAssessment(id, dto, parent.id);
  }

  @Get('parent/result/:id')
  @Roles(Role.PARENT)
  async getParentResult(@Param('id') id: string, @Req() req: any) {
    const parent = req.user as any;
    return this.assessmentService.getParentResult(id, parent.id);
  }

  @Post('parent/reassessment-request/:id')
  @Roles(Role.PARENT)
  async requestReassessment(@Param('id') id: string, @Body() dto: { reason?: string }, @Req() req: any) {
    return this.assessmentService.requestReassessment(id, req.user.id, dto.reason);
  }

  @Post('submissions/:id/log-event')
  @Roles(Role.PARENT, Role.STUDENT, Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async logEvent(
    @Param('id') submissionId: string,
    @Body() dto: LogAssessmentEventDto,
    @Req() req: any,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    return this.assessmentService.logSecurityEvent(submissionId, dto, Array.isArray(ip) ? ip[0] : ip);
  }

  @Patch('submissions/:id/security-stats')
  @Roles(Role.PARENT, Role.STUDENT)
  async updateSecurityStats(
    @Param('id') submissionId: string,
    @Body() dto: UpdateSecurityStatsDto,
  ) {
    return this.assessmentService.updateSecurityStats(submissionId, dto);
  }
  // ==========================================
  // AT-SCHOOL SCHEDULING & SLOT BOOKING
  // ==========================================

  @Get('schedule/:assessmentId')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async getSchedule(@Param('assessmentId') assessmentId: string, @SchoolId() schoolId: string) {
    return this.assessmentService.getSchedule(assessmentId);
  }

  @Get('bookings')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async getSchoolBookings(@SchoolId() schoolId: string, @Query('assessmentId') assessmentId?: string) {
    return this.assessmentService.getSchoolBookings(schoolId, assessmentId);
  }

  @Patch('bookings/:id/attendance')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async markAttendance(
    @Param('id') bookingId: string,
    @Body() dto: { attendanceStatus: string; remarks?: string }
  ) {
    return this.assessmentService.markAttendance(bookingId, dto.attendanceStatus, dto.remarks);
  }

  @Post('bookings/:id/reschedule')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async rescheduleBooking(
    @Param('id') bookingId: string,
    @Body() dto: { slotId: string }
  ) {
    return this.assessmentService.rescheduleBooking(bookingId, dto.slotId);
  }

  @Get('parent/slots/:assessmentId')
  @Roles(Role.PARENT)
  async getParentSlots(@Param('assessmentId') assessmentId: string) {
    return this.assessmentService.getAvailableSlots(assessmentId);
  }

  @Post('parent/book-slot')
  @Roles(Role.PARENT)
  async bookParentSlot(@Body() dto: { assessmentId: string; slotId: string; studentId: string }, @Req() req: any) {
    return this.assessmentService.bookSlot(dto.assessmentId, dto.slotId, dto.studentId, req.user.id);
  }

  @Post('parent/cancel-booking/:id')
  @Roles(Role.PARENT)
  async cancelParentBooking(@Param('id') bookingId: string) {
    return this.assessmentService.cancelBooking(bookingId);
  }
}
