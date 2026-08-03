import { Controller, Post, Get, Patch, Delete, Body, Param, Query, Req, Res, UseGuards, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApplicationService } from './application.service';
import type { StudentRosterQuery } from './application.service';
import { CreateApplicationDto, UpdateApplicationStatusDto, UpdateAssessmentRequirementDto } from './dto/create-application.dto';
import { SchoolId } from '../../core/tenant.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import type { Response } from 'express';

@Controller('application')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post()
  @Roles(Role.PARENT)
  async create(
    @Body() dto: CreateApplicationDto,
    @Req() req: Request,
    @SchoolId() schoolId: string,
  ) {
    const parent = req.user as any;
    return this.applicationService.create(dto, parent.id, schoolId);
  }

  @Get()
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async findAll(@SchoolId() schoolId: string) {
    return this.applicationService.findAll(schoolId);
  }

  @Get('student-roster')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async getStudentRoster(
    @SchoolId() schoolId: string,
    @Query() query: StudentRosterQuery,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    const generatedBy =
      `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
      user.email ||
      'School Administrator';
    return this.applicationService.getStudentRoster(
      schoolId,
      query,
      generatedBy,
    );
  }

  @Get('student-roster/export')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async exportStudentRoster(
    @SchoolId() schoolId: string,
    @Query() query: StudentRosterQuery,
    @Req() req: Request,
    @Res() response: Response,
  ) {
    const user = req.user as any;
    const generatedBy =
      `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
      user.email ||
      'School Administrator';
    const { buffer, roster } =
      await this.applicationService.exportStudentRosterExcel(
        schoolId,
        query,
        generatedBy,
      );
    const datePart =
      query.assessmentDate?.split('-').reverse().join('-') || 'all-dates';
    const gradePart = query.grade?.replace(/\s+/g, '') || 'AllGrades';
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="Assessment_${gradePart}_${datePart}.xlsx"`,
    );
    response.setHeader('X-Roster-Count', String(roster.rows.length));
    response.send(buffer);
  }

  @Get('parent')
  @Roles(Role.PARENT)
  async findByParent(@Req() req: Request, @SchoolId() schoolId: string) {
    const parent = req.user as any;
    return this.applicationService.findByParent(parent.id, schoolId);
  }

  @Delete(':id')
  @Roles(Role.PARENT)
  async deleteDraft(
    @Param('id') id: string,
    @Req() req: Request,
    @SchoolId() schoolId: string,
  ) {
    const parent = req.user as any;
    return this.applicationService.deleteParentDraft(id, parent.id, schoolId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: Request,
    @SchoolId() schoolId: string,
  ) {
    const user = req.user as any;
    const application = await this.applicationService.findOne(id, schoolId);

    // Parents can only view their own applications
    if (user.role === Role.PARENT && application.parentId !== user.id) {
      throw new ForbiddenException('You do not have permission to view this application.');
    }

    return application;
  }

  @Patch(':id/status')
  @Roles(Role.PARENT, Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
    @SchoolId() schoolId: string,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    if (user.role === Role.PARENT) {
      const application = await this.applicationService.findOne(id, schoolId);
      if (application.parentId !== user.id) {
        throw new ForbiddenException('You do not have permission to update this application.');
      }
    }
    return this.applicationService.updateStatus(id, dto.status, schoolId);
  }

  @Patch(':id/assessment-requirement')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async updateAssessmentRequirement(
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentRequirementDto,
    @SchoolId() schoolId: string,
  ) {
    return this.applicationService.updateAssessmentRequirement(id, schoolId, dto);
  }

  @Patch(':id/access-code')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async updateAccessCode(
    @Param('id') id: string,
    @Body() dto: { accessCode?: string },
    @SchoolId() schoolId: string,
  ) {
    return this.applicationService.updateAccessCode(
      id,
      schoolId,
      dto.accessCode,
    );
  }

  @Patch(':id/assessment-access')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async setAssessmentAccess(
    @Param('id') id: string,
    @Body() dto: { enabled: boolean },
    @SchoolId() schoolId: string,
  ) {
    if (typeof dto.enabled !== 'boolean') {
      throw new BadRequestException('The enabled field must be true or false.');
    }
    return this.applicationService.setAssessmentAccess(
      id,
      schoolId,
      dto.enabled,
    );
  }

  @Get(':id/receipt')
  @Roles(Role.PARENT, Role.SCHOOL_ADMIN)
  async downloadReceipt(
    @Param('id') id: string,
    @SchoolId() schoolId: string,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    const application = await this.applicationService.findOne(id, schoolId);

    if (user.role === Role.PARENT && application.parentId !== user.id) {
      throw new ForbiddenException('You do not have permission to view this receipt.');
    }

    const successfulPayment = application.payments.find(p => p.status === 'SUCCESS');
    if (!successfulPayment && application.paymentStatus !== 'PAID') {
      throw new NotFoundException('No successful payment found for this application.');
    }

    // Some imported applications predate transaction-level payment records but
    // still have an authoritative PAID application status.
    const receiptDate = successfulPayment?.createdAt ?? application.updatedAt;
    const orderId = successfulPayment?.razorpayOrderId ?? 'Legacy portal payment';
    const paymentId = successfulPayment?.razorpayPaymentId ?? 'Not recorded';
    const amount = successfulPayment?.amount ?? 1500;

    return `
      <html>
        <head>
          <title>Fee Receipt - ${application.studentFirstName}</title>
          <style>
            body { font-family: monospace; padding: 40px; background-color: #fafafa; color: #111; }
            .receipt-box { max-width: 600px; margin: auto; padding: 30px; border: 1px solid #eee; background: #fff; }
            h2 { text-align: center; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 1px; }
            .item { display: flex; justify-content: space-between; margin: 15px 0; border-bottom: 1px dashed #eee; padding-bottom: 5px; }
            .total { font-weight: bold; border-top: 2px solid #333; padding-top: 10px; margin-top: 20px; font-size: 1.1rem; }
            .footer { text-align: center; margin-top: 40px; font-size: 0.8rem; color: #666; }
          </style>
        </head>
        <body>
          <div class="receipt-box">
            <h2>ADMISSIONS OS FEE RECEIPT</h2>
            <div class="item"><span>Receipt Date:</span> <span>${new Date(receiptDate).toLocaleDateString()}</span></div>
            <div class="item"><span>Student Name:</span> <span>${application.studentFirstName} ${application.studentLastName}</span></div>
            <div class="item"><span>Grade Level:</span> <span>${application.grade}</span></div>
            <div class="item"><span>Order ID:</span> <span>${orderId}</span></div>
            <div class="item"><span>Payment ID:</span> <span>${paymentId}</span></div>
            <div class="item"><span>Status:</span> <span>SUCCESS (PAID)</span></div>
            <div class="item total"><span>Total Paid Amount:</span> <span>INR ${amount}</span></div>
            <div class="footer">Thank you for your payment. This is a computer generated invoice.</div>
          </div>
        </body>
      </html>
    `;
  }

  @Get(':id/admission-letter')
  @Roles(Role.PARENT, Role.SCHOOL_ADMIN)
  async downloadAdmissionLetter(
    @Param('id') id: string,
    @SchoolId() schoolId: string,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    const application = await this.applicationService.findOne(id, schoolId);

    if (user.role === Role.PARENT && application.parentId !== user.id) {
      throw new ForbiddenException('You do not have permission to view this letter.');
    }

    if (application.status !== 'APPROVED') {
      throw new BadRequestException('Admission letter is only available for approved student applications.');
    }

    const schoolAddress = [
      application.school.address,
      application.school.city,
      application.school.state,
      application.school.country,
    ].filter(Boolean).join(', ');
    const generatedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
      <html>
        <head>
          <title>Admission Offer Letter - ${application.studentFirstName}</title>
          <style>
            body { font-family: serif; padding: 50px; line-height: 1.6; color: #222; max-width: 800px; margin: auto; }
            .header { text-align: center; margin-bottom: 50px; }
            .school-name { font-size: 1.8rem; font-weight: bold; text-transform: uppercase; }
            .date { text-align: right; margin-bottom: 30px; font-style: italic; }
            .salutation { margin-bottom: 20px; font-weight: bold; }
            .content { text-align: justify; margin-bottom: 40px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
            .signature-line { border-top: 1px solid #444; width: 200px; text-align: center; padding-top: 5px; font-size: 0.9rem; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school-name">${application.school.name}</div>
            <div style="font-size: 0.9rem; color: #555;">Official Offer of Admission</div>
            <div style="font-size: 0.85rem; color: #666;">${schoolAddress}</div>
          </div>
          <div class="date">Generated on: ${generatedDate}</div>
          <div class="salutation">Dear Parent / Guardian of ${application.studentFirstName} ${application.studentLastName},</div>
          <div class="content">
            We are pleased to inform you that following the review of your student credentials dossier and subsequent assessment interview stages, 
            your child <strong>${application.studentFirstName} ${application.studentLastName}</strong> has been offered admission to 
            <strong>${application.grade}</strong> for the upcoming academic session.
            <br/><br/>
            Our team has evaluated the applicant's registration details and verified all uploaded transcripts. We are excited to welcome your family into our learning community.
            Please secure enrollment steps by checking instructions inside the parent portal.
          </div>
          <div class="salutation">Congratulations!</div>
          <div class="signatures">
            <div class="signature-line">Admissions Office Director</div>
            <div class="signature-line">School Principal</div>
          </div>
        </body>
      </html>
    `;
  }
}
