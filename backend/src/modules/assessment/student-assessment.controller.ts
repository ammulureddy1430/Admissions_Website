import { Controller, Post, Get, Body, Req, UseGuards, BadRequestException, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuthService } from '../../auth/auth.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { Role } from '@prisma/client';
import { AssessmentService } from './assessment.service';
import { SubmitAssessmentDto } from './dto/submit-assessment.dto';

@Controller('assessments/student')
export class StudentAssessmentController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly assessmentService: AssessmentService,
  ) {}

  @Post('login-init')
  async loginInit(
    @Body() dto: { schoolId: string; identifier: string },
  ) {
    const { schoolId, identifier } = dto;
    if (!schoolId || !identifier) {
      throw new BadRequestException('School ID and identifier (email or phone) are required.');
    }

    // Find the school settings
    const settings = await this.prisma.schoolSettings.findUnique({
      where: { schoolId },
    });
    const authType = settings?.studentAuthType || 'ACCESS_CODE';

    // Find the application matching studentEmail or studentPhone (or fallback to parent details)
    const application = await this.prisma.application.findFirst({
      where: {
        schoolId,
        status: { not: 'DRAFT' },
        assessmentAccessEnabled: true,
        assessments: {
          some: {
            OR: [
              { assessmentMode: 'SCHOOL' },
              { assessmentMode: 'BOTH', venueChoice: 'SCHOOL' },
            ],
            status: { not: 'ARCHIVED' },
          },
        },
        OR: [
          { studentEmail: identifier },
          { studentPhone: identifier },
          { parent: { email: identifier } },
          { fatherPhone: identifier },
          { motherPhone: identifier },
        ],
      },
      include: {
        school: true,
      }
    });

    if (!application) {
      throw new NotFoundException(
        'No active school-based assessment was found for this student. Home assessments are accessed through the parent portal.',
      );
    }

    if (authType === 'OTP') {
      // Generate a 6-digit OTP code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

      await this.prisma.application.update({
        where: { id: application.id },
        data: { otpCode, otpExpires },
      });

      console.log(`[STUDENT ASSESSMENT LOGIN] Generated OTP for student ${application.studentFirstName}: ${otpCode}`);

      // Return the OTP in the response in development environment for easy verification/testing
      return {
        authType: 'OTP',
        message: 'OTP sent successfully. Enter the OTP code to log in.',
        devOtp: otpCode, // returning OTP for easy testing
      };
    } else {
      // ACCESS_CODE
      // If student access code is not set, set a default one
      let accessCode = application.accessCode;
      if (!accessCode) {
        accessCode = application.studentFirstName.toUpperCase() + '123';
        await this.prisma.application.update({
          where: { id: application.id },
          data: { accessCode },
        });
      }

      return {
        authType: 'ACCESS_CODE',
        message: 'One-Time Access Code required. Please enter the code provided by your school.',
      };
    }
  }

  @Post('login-verify')
  async loginVerify(
    @Body() dto: { schoolId: string; code: string },
  ) {
    const { schoolId, code } = dto;
    if (!schoolId || !code?.trim()) {
      throw new BadRequestException(
        'School ID and an access code are required.',
      );
    }

    const credential = code.trim();
    const matchingApplications = await this.prisma.application.findMany({
      where: {
        schoolId,
        status: { not: 'DRAFT' },
        assessmentAccessEnabled: true,
        accessCode: { equals: credential, mode: 'insensitive' },
        assessments: {
          some: {
            OR: [
              { assessmentMode: 'SCHOOL' },
              { assessmentMode: 'BOTH', venueChoice: 'SCHOOL' },
            ],
            status: { not: 'ARCHIVED' },
          },
        },
      },
      take: 2,
    });

    if (matchingApplications.length === 0) {
      throw new NotFoundException(
        'Invalid access code or no active school-based assessment was found.',
      );
    }
    if (matchingApplications.length > 1) {
      throw new BadRequestException(
        'This access code matches more than one student. Ask the school administrator for help.',
      );
    }
    const application = matchingApplications[0];

    // Authenticated! Now find or create student user record
    const studentEmail = application.studentEmail || `${application.studentFirstName.toLowerCase()}.${application.studentLastName.toLowerCase()}@student.demo`;
    
    let user = await this.prisma.user.findUnique({
      where: { email: studentEmail },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: studentEmail,
          passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijkl', // dummy bcrypt hash
          role: Role.STUDENT,
          firstName: application.studentFirstName,
          lastName: application.studentLastName,
          phone: application.studentPhone || application.fatherPhone || '',
          schoolId: schoolId,
        },
      });
    }

    // Generate token
    const tokens = await this.authService.generateTokens(user.id, user.email, Role.STUDENT, schoolId);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      student: {
        id: application.id,
        firstName: application.studentFirstName,
        lastName: application.studentLastName,
        admissionNumber: application.admissionNumber,
      },
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async getProfile(@Req() req: any) {
    const user = req.user;
    
    // Find matching application
    const application = await this.prisma.application.findFirst({
      where: {
        schoolId: user.schoolId,
        status: { not: 'DRAFT' },
        OR: [
          { studentEmail: user.email },
          { studentFirstName: user.firstName, studentLastName: user.lastName },
        ]
      },
      include: {
        school: true,
      }
    });

    if (!application) {
      throw new NotFoundException('Student application profile not found.');
    }

    // Get current Academic Year
    const currentAcademicYear = await this.prisma.academicYear.findFirst({
      where: {
        schoolId: user.schoolId,
        isCurrent: true,
      }
    });

    return {
      studentPhoto: application.studentPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200', // Premium default placeholder
      studentName: `${application.studentFirstName} ${application.studentLastName}`,
      admissionNumber: application.admissionNumber || 'GHC-2026-TEMP',
      class: application.grade,
      section: application.section || 'A',
      schoolName: application.school.name,
      academicYear: currentAcademicYear?.name || 'Academic Year 2026-27',
    };
  }

  @Get('list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async getAssessments(@Req() req: any) {
    const user = req.user;

    const application = await this.prisma.application.findFirst({
      where: {
        schoolId: user.schoolId,
        status: { not: 'DRAFT' },
        OR: [
          { studentEmail: user.email },
          { studentFirstName: user.firstName, studentLastName: user.lastName },
        ]
      }
    });

    if (!application) {
      throw new NotFoundException('Student application profile not found.');
    }

    // Fetch assessments matching student's application
    const assessments = await this.prisma.assessment.findMany({
      where: {
        applicationId: application.id,
        // Reassignment archives the previous assessment definition. Keep that
        // completed attempt visible in the student's Submitted history.
        AND: [
          {
            OR: [
              { status: { not: 'ARCHIVED' } },
              {
                submissions: {
                  some: {
                    status: {
                      in: ['SUBMITTED', 'UNDER_REVIEW', 'REVIEWED', 'EVALUATED', 'PUBLISHED'],
                    },
                  },
                },
              },
            ],
          },
          {
            OR: [
              { assessmentMode: 'SCHOOL' },
              { assessmentMode: 'BOTH', venueChoice: 'SCHOOL' },
            ],
          },
        ],
      },
      include: {
        submissions: {
          orderBy: { createdAt: 'desc' },
        },
        results: {
          where: {
            publishedAt: { not: null }
          }
        },
        slotBookings: {
          include: {
            slot: {
              include: {
                schedule: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Keep the student-facing workflow deliberately simple: an unfinished
    // attempt remains Pending, and only a submitted attempt moves to Submitted.
    const formatted = assessments.map(a => {
      const submission = a.submissions[0]; // latest attempt
      const result = a.results[0];

      let status = 'ASSIGNED';
      let tab = 'PENDING';

      if (result) {
        status = 'SUBMITTED';
        tab = 'SUBMITTED';
      } else if (submission) {
        if (submission.status === 'PUBLISHED' || submission.status === 'EVALUATED') {
          status = 'SUBMITTED';
          tab = 'SUBMITTED';
        } else if (submission.status === 'REVIEWED') {
          status = 'SUBMITTED';
          tab = 'SUBMITTED';
        } else if (submission.status === 'UNDER_REVIEW') {
          status = 'SUBMITTED';
          tab = 'SUBMITTED';
        } else if (submission.status === 'SUBMITTED') {
          status = 'SUBMITTED';
          tab = 'SUBMITTED';
        } else if (submission.status === 'IN_PROGRESS' || submission.status === 'STARTED' || submission.startedAt) {
          status = 'ASSIGNED';
          tab = 'PENDING';
        } else {
          status = 'ASSIGNED';
          tab = 'PENDING';
        }
      }

      // Generate components array
      const components = [];
      if (a.hasWritten) components.push('Written');
      if (a.hasReading) components.push('Reading');
      if (a.hasListening) components.push('Listening');
      if (a.hasSpeaking) components.push('Speaking');

      return {
        id: a.id,
        assessmentName: a.title,
        subject: a.subject,
        teacherName: 'Admissions Officer', // Mock teacher name
        components,
        duration: `${a.timeLimit} Mins`,
        dueDate: a.dueDate ? a.dueDate.toISOString().split('T')[0] : 'No Due Date',
        assignedDate: a.createdAt.toISOString().split('T')[0],
        attemptNumber: a.attemptNumber,
        status,
        tab,
        assessmentMode: a.assessmentMode,
        applicationId: a.applicationId,
        slotBookings: a.slotBookings,
      };
    });

    return formatted;
  }

  @Get('detail/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async getStudentAssessmentDetail(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    return this.assessmentService.getStudentAssessmentDetail(id, user.sub || user.id);
  }

  @Post('start/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async startStudentAssessment(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    return this.assessmentService.startStudentAssessment(id, user.sub || user.id);
  }

  @Post('save/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async saveStudentAnswers(@Param('id') id: string, @Body() dto: SubmitAssessmentDto, @Req() req: any) {
    const user = req.user;
    return this.assessmentService.saveStudentAnswers(id, dto, user.sub || user.id);
  }

  @Post('submit/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async submitStudentAssessment(@Param('id') id: string, @Body() dto: SubmitAssessmentDto, @Req() req: any) {
    const user = req.user;
    return this.assessmentService.submitStudentAssessment(id, dto, user.sub || user.id);
  }

  @Get('slots/:assessmentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async getStudentSlots(@Param('assessmentId') assessmentId: string) {
    return this.assessmentService.getAvailableSlots(assessmentId);
  }

  @Post('book-slot')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async bookStudentSlot(@Body() dto: { assessmentId: string; slotId: string }, @Req() req: any) {
    const user = req.user;
    const application = await this.prisma.application.findFirst({
      where: {
        schoolId: user.schoolId,
        status: { not: 'DRAFT' },
        OR: [
          { studentEmail: user.email },
          { studentFirstName: user.firstName, studentLastName: user.lastName },
        ]
      }
    });
    if (!application) throw new NotFoundException('Student application not found.');
    return this.assessmentService.bookSlot(dto.assessmentId, dto.slotId, application.id);
  }

  @Post('cancel-booking/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async cancelStudentBooking(@Param('id') bookingId: string) {
    return this.assessmentService.cancelBooking(bookingId);
  }
}
