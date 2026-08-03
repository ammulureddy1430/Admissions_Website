import { Controller, Delete, Get, Post, Patch, Body, Query, Param, UseGuards, Req } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { MentorshipService } from './mentorship.service';
import {
  CreateMentorDto,
  BookSessionDto,
  UpdateSessionDto,
  CreateReviewDto,
  SendMessageDto,
  CreateWebinarDto,
  CreateProjectDto,
  UpdateProjectDto,
  SubmitResumeDto,
  ReviewResumeDto,
  UpdatePortfolioDto,
  AddSessionResourceDto,
  CreateAvailabilityDto,
  CreateSessionTaskDto,
  CreateSessionTypeDto,
  CreateMentorResourceDto,
  MentorResourceUploadDto,
  PublishMentorResourceDto,
  UpdateMentorProfileDto,
} from './dto/mentorship.dto';

type AuthenticatedRequest = { user: User };

@Controller('mentorship')
export class MentorshipController {
  constructor(private readonly mentorshipService: MentorshipService) {}

  // --- MENTORS ---
  @Get('mentors')
  getMentors(
    @Query('search') search?: string,
    @Query('skill') skill?: string,
    @Query('country') country?: string,
    @Query('university') university?: string,
    @Query('verified') verified?: string,
  ) {
    return this.mentorshipService.getMentors({ search, skill, country, university, verified });
  }

  @Get('mentors/:id')
  getMentorById(@Param('id') id: string) {
    return this.mentorshipService.getMentorById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PARENT, Role.STUDENT, Role.MENTOR, Role.ALUMNI)
  @Post('mentors')
  registerMentor(@Req() req: AuthenticatedRequest, @Body() dto: CreateMentorDto) {
    return this.mentorshipService.registerMentor(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Patch('mentors/:id/verify')
  verifyMentor(@Param('id') id: string, @Body('verified') verified: boolean) {
    return this.mentorshipService.verifyMentor(id, verified);
  }

  // --- SESSIONS ---
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PARENT, Role.STUDENT)
  @Post('sessions')
  bookSession(@Req() req: AuthenticatedRequest, @Body() dto: BookSessionDto) {
    return this.mentorshipService.bookSession(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions/student')
  getStudentSessions(@Req() req: AuthenticatedRequest) {
    return this.mentorshipService.getStudentSessions(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions/mentor')
  async getMentorSessions(@Req() req: AuthenticatedRequest) {
    const mentor = await this.mentorshipService.getMentorByUserId(req.user.id);
    if (!mentor) return [];
    return this.mentorshipService.getMentorSessions(mentor.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('sessions/:id')
  updateSession(@Param('id') id: string, @Req() req: AuthenticatedRequest, @Body() dto: UpdateSessionDto) {
    return this.mentorshipService.updateSession(id, req.user.id, dto);
  }

  // --- REVIEWS ---
  @UseGuards(JwtAuthGuard)
  @Post('reviews')
  writeReview(@Req() req: AuthenticatedRequest, @Body() dto: CreateReviewDto) {
    return this.mentorshipService.writeReview(req.user.id, dto);
  }

  // --- MESSAGES ---
  @UseGuards(JwtAuthGuard)
  @Post('messages')
  sendMessage(@Req() req: AuthenticatedRequest, @Body() dto: SendMessageDto) {
    return this.mentorshipService.sendMessage(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('messages/candidates')
  getMessageCandidates(@Req() req: AuthenticatedRequest) {
    return this.mentorshipService.getMessageCandidates(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('messages/:recipientId')
  getMessages(@Req() req: AuthenticatedRequest, @Param('recipientId') recipientId: string) {
    return this.mentorshipService.getMessages(req.user.id, recipientId);
  }

  // --- WEBINARS ---
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MENTOR)
  @Post('webinars')
  createWebinar(@Req() req: AuthenticatedRequest, @Body() dto: CreateWebinarDto) {
    return this.mentorshipService.createWebinar(req.user.id, dto);
  }

  @Get('webinars')
  getWebinars() {
    return this.mentorshipService.getWebinars();
  }

  @UseGuards(JwtAuthGuard)
  @Post('webinars/:id/register')
  registerWebinar(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.mentorshipService.registerWebinar(id, req.user.id);
  }

  // --- PROJECTS ---
  @UseGuards(JwtAuthGuard)
  @Post('projects')
  createProject(@Req() req: AuthenticatedRequest, @Body() dto: CreateProjectDto) {
    return this.mentorshipService.createProject(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('projects/student')
  getStudentProjects(@Req() req: AuthenticatedRequest) {
    return this.mentorshipService.getStudentProjects(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('projects/mentor')
  getMentorProjects(@Req() req: AuthenticatedRequest) {
    return this.mentorshipService.getMentorProjects(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('projects/:id')
  updateProject(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.mentorshipService.updateProject(id, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('projects/:id')
  deleteProject(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.mentorshipService.deleteProject(id, req.user.id);
  }

  // --- RESUMES ---
  @UseGuards(JwtAuthGuard)
  @Post('resumes')
  submitResume(@Req() req: AuthenticatedRequest, @Body() dto: SubmitResumeDto) {
    return this.mentorshipService.submitResume(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('resumes/student')
  getStudentResumes(@Req() req: AuthenticatedRequest) {
    return this.mentorshipService.getStudentResumes(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('resumes/mentor')
  getMentorResumes(@Req() req: AuthenticatedRequest) {
    return this.mentorshipService.getMentorResumes(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('resumes/:id/review')
  reviewResume(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: ReviewResumeDto) {
    return this.mentorshipService.reviewResume(id, req.user.id, dto);
  }

  // --- PORTFOLIOS ---
  @UseGuards(JwtAuthGuard)
  @Get('portfolios/mine')
  getPortfolio(@Req() req: AuthenticatedRequest) {
    return this.mentorshipService.getPortfolio(req.user.id);
  }

  @Get('portfolios/public/:publicUrl')
  getPortfolioByPublicUrl(@Param('publicUrl') publicUrl: string) {
    return this.mentorshipService.getPortfolioByPublicUrl(publicUrl);
  }

  @UseGuards(JwtAuthGuard)
  @Post('portfolios')
  updatePortfolio(@Req() req: AuthenticatedRequest, @Body() dto: UpdatePortfolioDto) {
    return this.mentorshipService.updatePortfolio(req.user.id, dto);
  }

  // --- ADVISORIES ---
  @Get('careers')
  getCareers() {
    return this.mentorshipService.getCareers();
  }

  @Get('careers/:id')
  getCareerById(@Param('id') id: string) {
    return this.mentorshipService.getCareerById(id);
  }

  @Get('scholarships')
  getScholarships(@Query('search') search?: string, @Query('country') country?: string) {
    return this.mentorshipService.getScholarships({ search, country });
  }

  // --- DASHBOARDS ---
  @UseGuards(JwtAuthGuard)
  @Get('dashboards/student')
  getStudentDashboard(@Req() req: AuthenticatedRequest) {
    return this.mentorshipService.getStudentDashboard(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboards/mentor')
  getMentorDashboard(@Req() req: AuthenticatedRequest) {
    return this.mentorshipService.getMentorDashboard(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MENTOR)
  @Get('analytics/mentor')
  getMentorAnalytics(@Req() req: AuthenticatedRequest) {
    return this.mentorshipService.getMentorAnalytics(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MENTOR)
  @Get('earnings/mentor')
  getMentorEarnings(@Req() req: AuthenticatedRequest) {
    return this.mentorshipService.getMentorEarnings(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MENTOR)
  @Get('profile/mentor')
  getOwnMentorProfile(@Req() req: AuthenticatedRequest) {
    return this.mentorshipService.getOwnMentorProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MENTOR)
  @Get('students/:id/profile')
  getMentorStudentProfile(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.mentorshipService.getMentorStudentProfile(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MENTOR)
  @Patch('profile/mentor')
  updateOwnMentorProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateMentorProfileDto,
  ) {
    return this.mentorshipService.updateOwnMentorProfile(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mentors/:id/follow')
  followMentor(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.mentorshipService.followMentor(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('mentors/:id/follow')
  unfollowMentor(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.mentorshipService.unfollowMentor(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mentors/:id/save')
  saveMentor(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.mentorshipService.saveMentor(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('mentors/:id/save')
  unsaveMentor(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.mentorshipService.unsaveMentor(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MENTOR)
  @Post('session-types')
  createSessionType(@Req() req: AuthenticatedRequest, @Body() dto: CreateSessionTypeDto) {
    return this.mentorshipService.createSessionType(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MENTOR)
  @Post('availability')
  createAvailability(@Req() req: AuthenticatedRequest, @Body() dto: CreateAvailabilityDto) {
    return this.mentorshipService.createAvailability(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/:id/resources')
  addSessionResource(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: AddSessionResourceDto) {
    return this.mentorshipService.addSessionResource(id, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MENTOR)
  @Get('resources')
  getMentorResources(@Req() req: AuthenticatedRequest) {
    return this.mentorshipService.getMentorResources(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MENTOR)
  @Post('resources/upload-url')
  createMentorResourceUpload(
    @Req() req: AuthenticatedRequest,
    @Body() dto: MentorResourceUploadDto,
  ) {
    return this.mentorshipService.createMentorResourceUpload(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MENTOR)
  @Post('resources')
  createMentorResource(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateMentorResourceDto,
  ) {
    return this.mentorshipService.createMentorResource(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MENTOR)
  @Get('resources/:id/download-url')
  getMentorResourceDownload(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.mentorshipService.getMentorResourceDownload(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MENTOR)
  @Patch('resources/:id/publish')
  publishMentorResource(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: PublishMentorResourceDto,
  ) {
    return this.mentorshipService.publishMentorResource(req.user.id, id, dto.published);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MENTOR)
  @Delete('resources/:id')
  deleteMentorResource(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.mentorshipService.deleteMentorResource(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/:id/tasks')
  addSessionTask(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: CreateSessionTaskDto) {
    return this.mentorshipService.addSessionTask(id, req.user.id, dto);
  }
}
