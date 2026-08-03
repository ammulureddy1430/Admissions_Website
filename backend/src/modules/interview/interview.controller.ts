import { Controller, Post, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { InterviewService } from './interview.service';
import { ScheduleInterviewDto, FeedbackInterviewDto } from './dto/schedule-interview.dto';
import { SchoolId } from '../../core/tenant.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { Role } from '@prisma/client';

@Controller('interview')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Post()
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async schedule(@Body() dto: ScheduleInterviewDto, @SchoolId() schoolId: string) {
    return this.interviewService.schedule(dto, schoolId);
  }

  @Get()
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async findAll(@SchoolId() schoolId: string) {
    return this.interviewService.findAll(schoolId);
  }

  @Patch(':id/feedback')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async updateFeedback(
    @Param('id') id: string,
    @Body() dto: FeedbackInterviewDto,
    @SchoolId() schoolId: string,
  ) {
    return this.interviewService.updateFeedback(id, dto, schoolId);
  }

  @Get('staff')
  async listStaff(@SchoolId() schoolId: string) {
    return this.interviewService.listStaff(schoolId);
  }
}
