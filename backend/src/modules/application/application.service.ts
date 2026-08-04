import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateApplicationDto, UpdateAssessmentRequirementDto } from './dto/create-application.dto';
import { randomUUID } from 'crypto';
import * as ExcelJS from 'exceljs';

export type StudentRosterQuery = {
  assessmentDate?: string;
  assessmentId?: string;
  grade?: string;
  section?: string;
  slotId?: string;
  assessmentStatus?: string;
  search?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
};

@Injectable()
export class ApplicationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateApplicationDto, parentId: string, schoolId: string) {
    return this.prisma.application.create({
      data: {
        studentFirstName: dto.studentFirstName,
        studentLastName: dto.studentLastName,
        studentDob: new Date(dto.studentDob),
        studentGender: dto.studentGender,
        grade: dto.grade,
        parentId,
        schoolId,
        status: dto.status || 'DRAFT',
        
        bloodGroup: dto.bloodGroup,
        nationality: dto.nationality,
        religion: dto.religion,
        motherTongue: dto.motherTongue,
        primaryAddress: dto.primaryAddress,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,

        fatherName: dto.fatherName,
        fatherOccupation: dto.fatherOccupation,
        fatherPhone: dto.fatherPhone,
        motherName: dto.motherName,
        motherOccupation: dto.motherOccupation,
        motherPhone: dto.motherPhone,

        previousSchoolName: dto.previousSchoolName,
        previousSchoolGrade: dto.previousSchoolGrade,
        previousSchoolMarks: dto.previousSchoolMarks,

        allergies: dto.allergies,
        medicalConditions: dto.medicalConditions,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,

        guardianName: dto.guardianName,
        guardianOccupation: dto.guardianOccupation,
        guardianPhone: dto.guardianPhone,
        guardianRelation: dto.guardianRelation,

        transportRequired: dto.transportRequired,
        transportRoute: dto.transportRoute,
      },
    });
  }

  async findAll(schoolId: string) {
    return this.prisma.application.findMany({
      where: { schoolId },
      include: {
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        documents: true,
        studentDocuments: true,
        interviews: true,
        payments: true,
        school: true,
        assessments: {
          select: {
            id: true,
            title: true,
            grade: true,
            subject: true,
            status: true,
            assessmentMode: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStudentRoster(
    schoolId: string,
    query: StudentRosterQuery,
    generatedBy = 'School Administrator',
  ) {
    const selectedSlotDisplay = query.slotId?.startsWith('display:')
      ? query.slotId.slice('display:'.length).split('|')
      : null;
    const [selectedSlotName, selectedSlotStart, selectedSlotEnd] = selectedSlotDisplay || [];
    const selectedDate = query.assessmentDate
      ? new Date(`${query.assessmentDate}T00:00:00.000Z`)
      : null;
    const nextDate = selectedDate
      ? new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)
      : null;
    const dateFilter =
      selectedDate && nextDate ? { gte: selectedDate, lt: nextDate } : undefined;

    const assessments = await this.prisma.assessment.findMany({
      where: {
        schoolId,
        assessmentMode: { in: ['HOME', 'SCHOOL', 'BOTH'] },
        status: { not: 'ARCHIVED' },
        applicationId: { not: null },
        ...(query.assessmentId ? { id: query.assessmentId } : {}),
        ...(query.grade ? { grade: query.grade } : {}),
        ...(dateFilter
          ? {
              OR: [
                { dueDate: dateFilter },
                { schedule: { assessmentDate: dateFilter } },
                {
                  slotBookings: {
                    some: {
                      bookingStatus: { not: 'CANCELLED' },
                      slot: { schedule: { assessmentDate: dateFilter } },
                    },
                  },
                },
              ],
            }
          : {}),
        application: {
          status: { in: ['APPROVED', 'ASSESSMENT'] },
          ...(query.section ? { section: query.section } : {}),
        },
        ...(query.slotId
          ? {
              slotBookings: {
                some: {
                  ...(selectedSlotDisplay
                    ? {
                        slot: {
                          slotName: selectedSlotName,
                          startTime: selectedSlotStart,
                          endTime: selectedSlotEnd,
                        },
                      }
                    : { slotId: query.slotId }),
                  bookingStatus: { not: 'CANCELLED' },
                },
              },
            }
          : {}),
      },
      include: {
        application: {
          include: {
            parent: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        schedule: {
          include: {
            slots: true,
          },
        },
        slotBookings: {
          where: { bookingStatus: { not: 'CANCELLED' } },
          include: {
            slot: {
              include: {
                schedule: {
                  include: { slots: true },
                },
              },
            },
          },
        },
        submissions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // School-based assessments always use an access code. Backfill one for
    // older assignments that were created before access became mandatory.
    const studentsNeedingAccess = new Map(
      assessments
        .filter(
          (assessment) =>
            (assessment.assessmentMode === 'SCHOOL' ||
              (assessment.assessmentMode === 'BOTH' &&
                assessment.venueChoice === 'SCHOOL')) &&
            assessment.application &&
            !assessment.application.accessCode,
        )
        .map((assessment) => [assessment.application!.id, assessment.application!]),
    );
    await Promise.all(
      Array.from(studentsNeedingAccess.values()).map(async (student) => {
        const accessCode = `STU-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
        await this.prisma.application.update({
          where: { id: student.id },
          data: { accessCode, assessmentAccessEnabled: true },
        });
        student.accessCode = accessCode;
        student.assessmentAccessEnabled = true;
      }),
    );

    const availableSchoolSlots = await this.prisma.assessmentSlot.findMany({
      where: {
        status: 'AVAILABLE',
        schedule: {
          assessment: {
            schoolId,
            applicationId: null,
            assessmentMode: { in: ['SCHOOL', 'BOTH'] },
            status: { not: 'ARCHIVED' },
          },
        },
      },
      select: {
        id: true,
        slotName: true,
        startTime: true,
        endTime: true,
      },
      orderBy: [{ startTime: 'asc' }, { slotName: 'asc' }],
    });

    const normalizedSearch = query.search?.trim().toLowerCase();
    let rows: any[] = assessments.flatMap((assessment) => {
      if (!assessment.application) return [];
      const student = assessment.application;
      const booking = assessment.slotBookings.find(
        (item) => item.studentId === student.id,
      );
      const schedule = booking?.slot.schedule || assessment.schedule;
      const submission = assessment.submissions[0];
      const requiresAccessCode =
        assessment.assessmentMode === 'SCHOOL' ||
        (assessment.assessmentMode === 'BOTH' &&
          assessment.venueChoice === 'SCHOOL');
      const accessCode = student.accessCode || '';
      const row = {
        id: `${assessment.id}:${student.id}`,
        studentId: student.id,
        studentName: `${student.studentFirstName} ${student.studentLastName}`.trim(),
        applicationId: student.id,
        admissionNumber: student.admissionNumber || '',
        grade: assessment.grade || student.grade,
        section: student.section || '',
        assessmentId: assessment.id,
        assessmentName: assessment.title,
        assessmentDate: (
          schedule?.assessmentDate ||
          assessment.dueDate ||
          assessment.createdAt
        )
          .toISOString()
          .slice(0, 10),
        assessmentMode: assessment.assessmentMode,
        venueChoice: assessment.venueChoice,
        venueChoiceDeadline: assessment.dueDate
          ? new Date(assessment.dueDate.getTime() - 4 * 24 * 60 * 60 * 1000)
              .toISOString()
              .slice(0, 10)
          : '',
        requiresAccessCode,
        assessmentTime: booking?.slot
          ? `${booking.slot.startTime} - ${booking.slot.endTime}`
          : '',
        slotId: booking?.slotId || '',
        slotName: booking?.slot.slotName || 'Not booked',
        campus: schedule?.campus || '',
        building: schedule?.building || '',
        roomNumber: schedule?.roomNumber || '',
        seatNumber: '',
        accessCode: requiresAccessCode ? accessCode : '',
        assessmentAccessEnabled: student.assessmentAccessEnabled,
        parentName:
          `${student.parent.firstName || ''} ${student.parent.lastName || ''}`.trim(),
        parentMobileNumber: student.parent.phone || '',
        emergencyContact: [
          student.emergencyContactName,
          student.emergencyContactPhone,
        ]
          .filter(Boolean)
          .join(' - '),
        attendanceStatus: booking?.attendanceStatus || 'PENDING',
        assessmentStatus: submission?.status || assessment.status,
        invigilatorRemarks: booking?.remarks || '',
      };

      if (
        query.assessmentStatus &&
        row.assessmentStatus !== query.assessmentStatus
      ) {
        return [];
      }

      if (
        normalizedSearch &&
        ![
          row.studentName,
          row.applicationId,
          row.admissionNumber,
          row.accessCode,
        ].some((value) => value.toLowerCase().includes(normalizedSearch))
      ) {
        return [];
      }
      return [row];
    });

    const schoolGameAssignments = await this.prisma.gameAssignment.findMany({
      where: { gameAssessment: { schoolId }, targetType: 'STUDENT', status: 'ASSIGNED' },
      include: { generatedGame: true, gameAssessment: true, results: true },
      orderBy: { createdAt: 'desc' },
    });
    const atSchoolGameAssignments = schoolGameAssignments.filter(
      assignment => String((assignment.assignmentSettings as any)?.deliveryMode || 'HOME').toUpperCase() === 'SCHOOL',
    );
    const gameStudentIds = Array.from(new Set(atSchoolGameAssignments.flatMap(assignment => assignment.targetIds)));
    const gameStudents = await this.prisma.application.findMany({
      where: {
        id: { in: gameStudentIds }, schoolId,
        status: { notIn: ['DRAFT', 'REJECTED', 'WITHDRAWN'] },
        ...(query.grade ? { grade: query.grade } : {}),
        ...(query.section ? { section: query.section } : {}),
      },
      include: { parent: { select: { firstName: true, lastName: true, phone: true, email: true } } },
    });
    const gameStudentMap = new Map(gameStudents.map(student => [student.id, student]));
    for (const assignment of atSchoolGameAssignments) {
      if (query.assessmentId && query.assessmentId !== assignment.id) continue;
      // At-school games use the same active venue and slot configuration as
      // the school's written assessment for that grade.
      const writtenSchedule = await this.prisma.assessmentSchedule.findFirst({
        where: {
          assessment: {
            schoolId,
            applicationId: null,
            grade: assignment.gameAssessment.grade,
            assessmentMode: { in: ['SCHOOL', 'BOTH'] },
            status: { not: 'ARCHIVED' },
          },
        },
        include: { slots: { orderBy: { startTime: 'asc' } } },
        orderBy: { assessmentDate: 'asc' },
      });
      const savedLocation = ((assignment.assignmentSettings as any)?.location || {}) as Record<string, any>;
      const gameSlot = writtenSchedule?.slots?.[0];
      for (const studentId of assignment.targetIds) {
        const student = gameStudentMap.get(studentId);
        if (!student) continue;
        const result = assignment.results.find(item => item.studentId === studentId);
        const accessCode = student.accessCode || '';
        const row = {
          id: `game:${assignment.id}:${student.id}`,
          studentId: student.id,
          studentName: `${student.studentFirstName} ${student.studentLastName}`.trim(),
          applicationId: student.id,
          admissionNumber: student.admissionNumber || '',
          grade: assignment.gameAssessment.grade || student.grade,
          section: student.section || '',
          assessmentId: assignment.id,
          assessmentName: `${assignment.generatedGame?.title || assignment.gameAssessment.name} (Game)`,
          assessmentDate: savedLocation.assessmentDate || (writtenSchedule?.assessmentDate || assignment.scheduledAt || assignment.startDate || assignment.createdAt).toISOString().slice(0, 10),
          assessmentMode: 'SCHOOL', venueChoice: 'SCHOOL', venueChoiceDeadline: '', requiresAccessCode: true,
          assessmentTime: savedLocation.startTime
            ? `${savedLocation.startTime} - ${savedLocation.endTime}`
            : gameSlot ? `${gameSlot.startTime} - ${gameSlot.endTime}` : '',
          slotId: savedLocation.slotId || gameSlot?.id || '',
          slotName: savedLocation.slotName || gameSlot?.slotName || 'At-school game',
          campus: savedLocation.campus || writtenSchedule?.campus || '',
          building: savedLocation.building || writtenSchedule?.building || '',
          roomNumber: savedLocation.roomNumber || writtenSchedule?.roomNumber || '',
          seatNumber: '',
          accessCode, assessmentAccessEnabled: student.assessmentAccessEnabled,
          parentName: `${student.parent.firstName || ''} ${student.parent.lastName || ''}`.trim(),
          parentMobileNumber: student.parent.phone || '', emergencyContact: '', attendanceStatus: 'PENDING',
          assessmentStatus: !result || result.status === 'NOT_STARTED' ? 'IN_PROGRESS' : result.status,
          invigilatorRemarks: '',
        };
        if (selectedSlotDisplay && !(
          row.slotName === selectedSlotName &&
          row.assessmentTime === `${selectedSlotStart} - ${selectedSlotEnd}`
        )) continue;
        if (query.slotId && !selectedSlotDisplay && row.slotId !== query.slotId) continue;
        if (query.assessmentStatus && row.assessmentStatus !== query.assessmentStatus) continue;
        if (normalizedSearch && ![row.studentName, row.applicationId, row.admissionNumber, row.accessCode].some(value => value.toLowerCase().includes(normalizedSearch))) continue;
        rows.push(row);
      }
    }

    const sortableFields: Record<string, keyof (typeof rows)[number]> = {
      studentName: 'studentName',
      applicationId: 'applicationId',
      assessmentTime: 'assessmentTime',
      slot: 'slotName',
      roomNumber: 'roomNumber',
      section: 'section',
      grade: 'grade',
    };
    const sortField = sortableFields[query.sortBy || 'studentName'] || 'studentName';
    const direction = query.sortDirection === 'desc' ? -1 : 1;
    rows = rows.sort((a, b) =>
      String(a[sortField]).localeCompare(String(b[sortField]), undefined, {
        numeric: true,
      }) * direction,
    );

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, logo: true },
    });

    const options = {
      assessments: Array.from(
        new Map(
          [...assessments.map((assessment) => [
            assessment.id,
            { id: assessment.id, name: assessment.title },
          ] as const), ...atSchoolGameAssignments.map(assignment => [assignment.id, { id: assignment.id, name: `${assignment.generatedGame?.title || assignment.gameAssessment.name} (Game)` }] as const)],
        ).values(),
      ).sort((a, b) => a.name.localeCompare(b.name)),
      grades: Array.from(
        new Set([...assessments.map((assessment) => assessment.grade), ...gameStudents.map(student => student.grade)]),
      ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
      sections: Array.from(
        new Set(
          [...assessments
            .map((assessment) => assessment.application?.section)
            .filter((value): value is string => Boolean(value)), ...gameStudents.map(student => student.section).filter((value): value is string => Boolean(value))],
        ),
      ).sort(),
      slots: Array.from(
        new Map(
          [
            ...availableSchoolSlots,
            ...assessments.flatMap((assessment) => [
              ...(assessment.schedule?.slots || []),
              ...assessment.slotBookings.flatMap(
                (booking) => booking.slot.schedule.slots,
              ),
            ]),
          ].map((slot) => {
            const displayKey = `${slot.slotName}|${slot.startTime}|${slot.endTime}`;
            return [
              displayKey,
              {
                id: `display:${displayKey}`,
                name: slot.slotName,
                time: `${slot.startTime} - ${slot.endTime}`,
              },
            ];
          }),
        ).values(),
      ).sort((a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name)),
    };

    return {
      rows,
      options,
      summary: {
        schoolName: school?.name || 'School',
        schoolLogo: school?.logo || null,
        assessmentName:
          query.assessmentId && rows.length ? rows[0].assessmentName : 'All Assessments',
        assessmentDate: query.assessmentDate || 'All Dates',
        totalStudents: rows.length,
        totalSlots: new Set(rows.map((row) => row.slotId).filter(Boolean)).size,
        generatedBy,
        generatedOn: new Date().toISOString(),
      },
    };
  }

  async exportStudentRosterExcel(
    schoolId: string,
    query: StudentRosterQuery,
    generatedBy: string,
  ) {
    const roster = await this.getStudentRoster(schoolId, query, generatedBy);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = generatedBy;
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Student Roster', {
      views: [{ state: 'frozen', ySplit: 5 }],
      pageSetup: { orientation: 'landscape', fitToPage: true, paperSize: 9 },
    });

    sheet.mergeCells('A1:V1');
    const title = sheet.getCell('A1');
    title.value = roster.summary.schoolName;
    title.font = { bold: true, size: 18, color: { argb: 'FF075E54' } };
    title.alignment = { horizontal: 'center' };
    sheet.mergeCells('A2:V2');
    sheet.getCell('A2').value = 'At-School Assessment Student Roster';
    sheet.getCell('A2').font = { bold: true, size: 13 };
    sheet.getCell('A2').alignment = { horizontal: 'center' };
    sheet.mergeCells('A3:V3');
    sheet.getCell('A3').value =
      `${roster.summary.assessmentName}  |  ${roster.summary.assessmentDate}  |  ` +
      `${roster.summary.totalStudents} students  |  Generated by ${generatedBy} on ${new Date(roster.summary.generatedOn).toLocaleString()}`;
    sheet.getCell('A3').alignment = { horizontal: 'center' };

    const columns = [
      'Serial Number', 'Student Name', 'Application ID', 'Admission Number',
      'Grade', 'Section', 'Assessment Name', 'Assessment Date',
      'Assessment Time', 'Selected Slot', 'Campus', 'Building', 'Room Number',
      'Seat Number', 'Access Code', 'Parent Name', 'Parent Mobile Number',
      'Emergency Contact', 'Attendance Status', 'Assessment Status',
      'Invigilator Remarks', 'Generated Date',
    ];
    const headerRow = sheet.getRow(5);
    headerRow.values = columns;
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF008F80' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    roster.rows.forEach((row, index) => {
      sheet.addRow([
        index + 1, row.studentName, row.applicationId, row.admissionNumber,
        row.grade, row.section, row.assessmentName,
        new Date(`${row.assessmentDate}T00:00:00`), row.assessmentTime,
        row.slotName, row.campus, row.building, row.roomNumber, row.seatNumber,
        row.accessCode, row.parentName, row.parentMobileNumber,
        row.emergencyContact, row.attendanceStatus, row.assessmentStatus,
        row.invigilatorRemarks, new Date(roster.summary.generatedOn),
      ]);
    });
    sheet.getColumn(8).numFmt = 'dd-mmm-yyyy';
    sheet.getColumn(22).numFmt = 'dd-mmm-yyyy hh:mm';
    sheet.columns.forEach((column, index) => {
      let width = Math.max(columns[index]?.length || 10, 12);
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        width = Math.min(35, Math.max(width, String(cell.value || '').length + 2));
      });
      column.width = width;
    });
    sheet.autoFilter = { from: 'A5', to: 'V5' };

    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer: Buffer.from(buffer), roster };
  }

  async findByParent(parentId: string, schoolId: string) {
    return this.prisma.application.findMany({
      where: { parentId, schoolId },
      include: {
        documents: true,
        interviews: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, schoolId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id, schoolId },
      include: {
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        documents: true,
        interviews: {
          include: {
            interviewer: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        payments: true,
        school: true,
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found under this school tenant.');
    }

    return application;
  }

  async updateStatus(id: string, status: string, schoolId: string) {
    const app = await this.prisma.application.findFirst({
      where: { id, schoolId },
    });

    if (!app) {
      throw new NotFoundException('Application not found.');
    }

    return this.prisma.application.update({
      where: { id },
      data: { status },
    });
  }

  async updateAssessmentRequirement(
    id: string,
    schoolId: string,
    dto: UpdateAssessmentRequirementDto,
  ) {
    const application = await this.prisma.application.findFirst({
      where: { id, schoolId },
      include: {
        assessments: {
          where: { status: { not: 'ARCHIVED' } },
          select: { id: true },
        },
      },
    });
    if (!application) throw new NotFoundException('Application not found.');

    if (!dto.assessmentRequired) {
      const gameAssignment = await this.prisma.gameAssignment.findFirst({
        where: { status: 'ASSIGNED', targetIds: { has: application.id } },
        select: { id: true },
      });
      if (application.assessments.length || gameAssignment) {
        throw new BadRequestException(
          'Remove or archive the existing academic and game-based assessments before marking this application as Assessment Not Required.',
        );
      }
    }

    const completedStages = ['INTERVIEW_SCHEDULED', 'SELECTED', 'APPROVED'];
    return this.prisma.application.update({
      where: { id: application.id },
      data: dto.assessmentRequired
        ? {
            assessmentRequired: true,
            assessmentWaivedAt: null,
            assessmentWaivedReason: null,
          }
        : {
            assessmentRequired: false,
            assessmentWaivedAt: new Date(),
            assessmentWaivedReason: dto.assessmentWaivedReason?.trim() || null,
            assessmentAccessEnabled: false,
            accessCode: null,
            ...(!completedStages.includes(application.status)
              ? { status: 'INTERVIEW_SCHEDULED' }
              : {}),
          },
    });
  }

  async updateAccessCode(id: string, schoolId: string, requestedCode?: string) {
    const application = await this.prisma.application.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        status: true,
        assessmentAccessEnabled: true,
        assessments: {
          where: {
            assessmentMode: { in: ['SCHOOL', 'BOTH'] },
            status: { not: 'ARCHIVED' },
          },
          select: { id: true },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Student application not found.');
    }
    if (!['APPROVED', 'ASSESSMENT'].includes(application.status)) {
      throw new BadRequestException('Access codes can only be issued to admitted students.');
    }
    if (application.assessments.length === 0) {
      throw new BadRequestException(
        'This student has no active school-mode assessment and does not need an access code.',
      );
    }

    const normalizedCode = requestedCode?.trim().toUpperCase();
    if (normalizedCode && !/^[A-Z0-9-]{6,20}$/.test(normalizedCode)) {
      throw new BadRequestException(
        'Access code must contain 6–20 letters, numbers, or hyphens.',
      );
    }

    const generatedCode = `STU-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    const accessCode = normalizedCode || generatedCode;

    await this.prisma.application.update({
      where: { id: application.id },
      data: { accessCode },
    });

    return {
      applicationId: application.id,
      accessCode,
      message: normalizedCode
        ? 'Student access code updated.'
        : 'New student access code generated.',
    };
  }

  async setAssessmentAccess(
    id: string,
    schoolId: string,
    enabled: boolean,
  ) {
    const application = await this.prisma.application.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        status: true,
        accessCode: true,
        assessments: {
          where: {
            assessmentMode: { in: ['SCHOOL', 'BOTH'] },
            status: { not: 'ARCHIVED' },
          },
          select: { id: true },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Student application not found.');
    }
    if (!['APPROVED', 'ASSESSMENT'].includes(application.status)) {
      throw new BadRequestException(
        'Assessment access can only be enabled for admitted students.',
      );
    }
    if (enabled && application.assessments.length === 0) {
      throw new BadRequestException(
        'Assign a school-mode assessment before enabling code access.',
      );
    }

    return this.prisma.application.update({
      where: { id: application.id },
      data: {
        assessmentAccessEnabled: enabled,
        ...(enabled
          ? {
              accessCode:
                application.accessCode ||
                `STU-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`,
            }
          : { accessCode: null }),
      },
      select: {
        id: true,
        assessmentAccessEnabled: true,
        accessCode: true,
      },
    });
  }

  async deleteParentDraft(id: string, parentId: string, schoolId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id, parentId, schoolId },
      select: { id: true, status: true },
    });

    if (!application) {
      throw new NotFoundException('Application not found.');
    }
    if (application.status !== 'DRAFT') {
      throw new BadRequestException('Only draft applications can be deleted.');
    }

    await this.prisma.application.delete({ where: { id: application.id } });
    return { success: true, message: 'Draft application deleted successfully.' };
  }
}
