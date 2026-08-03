import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ScheduleInterviewDto, FeedbackInterviewDto } from './dto/schedule-interview.dto';
import { Role } from '@prisma/client';

@Injectable()
export class InterviewService {
  constructor(private readonly prisma: PrismaService) {}

  async schedule(dto: ScheduleInterviewDto, schoolId: string) {
    // 1. Verify application ownership
    const app = await this.prisma.application.findFirst({
      where: { id: dto.applicationId, schoolId },
    });

    if (!app) {
      throw new NotFoundException('Application not found.');
    }

    // 2. Create the interview slot
    const interview = await this.prisma.interview.create({
      data: {
        applicationId: dto.applicationId,
        interviewerId: dto.interviewerId,
        dateTime: new Date(dto.dateTime),
        meetingLink: dto.meetingLink || 'https://meet.google.com/mock-link',
        schoolId,
        status: 'SCHEDULED',
      },
    });

    // 3. Update application status
    await this.prisma.application.update({
      where: { id: dto.applicationId },
      data: { status: 'INTERVIEW_SCHEDULED' },
    });

    return interview;
  }

  async findAll(schoolId: string) {
    return this.prisma.interview.findMany({
      where: { schoolId },
      include: {
        application: {
          select: {
            studentFirstName: true,
            studentLastName: true,
            grade: true,
            parent: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
            school: {
              select: {
                name: true,
              },
            },
          },
        },
        interviewer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { dateTime: 'asc' },
    });
  }

  async updateFeedback(id: string, dto: FeedbackInterviewDto, schoolId: string) {
    const interview = await this.prisma.interview.findFirst({
      where: { id, schoolId },
    });

    if (!interview) {
      throw new NotFoundException('Interview not found under this school tenant.');
    }

    return this.prisma.interview.update({
      where: { id },
      data: {
        status: dto.status,
        feedback: dto.feedback,
        score: dto.score,
      },
    });
  }

  async listStaff(schoolId: string) {
    return this.prisma.user.findMany({
      where: {
        schoolId,
        OR: [
          { role: Role.SCHOOL_ADMIN },
          { role: Role.ADMISSIONS_STAFF },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });
  }
}
