import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { EmailWorkflowService } from './email-workflow.service';
import { SchoolId } from '../../core/tenant.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { Role } from '@prisma/client';
import type { Request } from 'express';

@Controller('email-workflow')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailWorkflowController {
  constructor(private readonly service: EmailWorkflowService) {}

  @Get('template')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async getTemplates(@SchoolId() schoolId: string) {
    return this.service.getTemplates(schoolId);
  }

  @Post('template')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async createTemplate(
    @SchoolId() schoolId: string,
    @Body() body: { name: string; subject: string; body: string },
  ) {
    return this.service.createTemplate(schoolId, body.name, body.subject, body.body);
  }

  @Get('draft/:applicationId')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async getDraft(
    @Param('applicationId') applicationId: string,
    @SchoolId() schoolId: string,
  ) {
    return this.service.getDraft(applicationId, schoolId);
  }

  @Post('draft/:applicationId')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async updateDraft(
    @Param('applicationId') applicationId: string,
    @SchoolId() schoolId: string,
    @Req() req: Request,
    @Body() body: { subject: string; body: string; attachments: any[] },
  ) {
    const admin = req.user as any;
    return this.service.updateDraft(applicationId, body.subject, body.body, body.attachments, admin.id, schoolId);
  }

  @Post('preview/:applicationId')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async preview(
    @Param('applicationId') applicationId: string,
    @SchoolId() schoolId: string,
    @Body() body: { subject: string; body: string },
  ) {
    return this.service.preview(applicationId, body.subject, body.body, schoolId);
  }

  @Post('send/:applicationId')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async sendEmail(
    @Param('applicationId') applicationId: string,
    @SchoolId() schoolId: string,
    @Req() req: Request,
    @Body() body: { subject: string; body: string },
  ) {
    const admin = req.user as any;
    return this.service.sendEmail(applicationId, body.subject, body.body, admin.id, schoolId);
  }

  @Post('resend/:historyId')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async resendEmail(
    @Param('historyId') historyId: string,
    @SchoolId() schoolId: string,
    @Req() req: Request,
  ) {
    const admin = req.user as any;
    return this.service.resendEmail(historyId, admin.id, schoolId);
  }

  @Get('history/:applicationId')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async getHistory(@Param('applicationId') applicationId: string) {
    return this.service.getHistory(applicationId);
  }
}
