import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CollegeReviewDto, CreateHigherEducationApplicationDto } from './dto/higher-education-application.dto';

@Injectable()
export class HigherEducationService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateHigherEducationApplicationDto, applicantId: string, collegeId: string) {
    return this.prisma.higherEducationApplication.create({ data: { ...dto, applicantId, collegeId } });
  }

  findMine(applicantId: string) {
    return this.prisma.higherEducationApplication.findMany({
      where: { applicantId },
      include: { college: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findForCollege(collegeId: string) {
    return this.prisma.higherEducationApplication.findMany({
      where: { collegeId, status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'DECISION'] } },
      include: { applicant: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async updateByApplicant(id: string, applicantId: string, action: 'documents' | 'submit') {
    const application = await this.prisma.higherEducationApplication.findUnique({ where: { id } });
    if (!application) throw new NotFoundException('Higher-education application not found.');
    if (application.applicantId !== applicantId) throw new ForbiddenException('This application does not belong to you.');
    if (action === 'documents' && application.status !== 'DRAFT') throw new BadRequestException('Only draft applications can complete documents.');
    if (action === 'submit' && application.status !== 'DOCUMENTS_COMPLETED') throw new BadRequestException('Complete documents before submitting.');
    return this.prisma.higherEducationApplication.update({
      where: { id },
      data: action === 'documents' ? { status: 'DOCUMENTS_COMPLETED' } : { status: 'SUBMITTED', submittedAt: new Date() },
    });
  }

  async removeDraft(id: string, applicantId: string) {
    const application = await this.prisma.higherEducationApplication.findUnique({ where: { id } });
    if (!application) throw new NotFoundException('Higher-education application not found.');
    if (application.applicantId !== applicantId) throw new ForbiddenException('This application does not belong to you.');
    if (application.status !== 'DRAFT' && application.status !== 'SUBMITTED') throw new BadRequestException('Only draft or submitted applications can be removed.');
    await this.prisma.higherEducationApplication.delete({ where: { id } });
    return { deleted: true };
  }

  async review(id: string, collegeId: string, reviewerId: string, dto: CollegeReviewDto) {
    const application = await this.prisma.higherEducationApplication.findUnique({ where: { id } });
    if (!application || application.collegeId !== collegeId) throw new NotFoundException('Application not found for this college.');
    if (dto.status === 'UNDER_REVIEW' && application.status !== 'SUBMITTED') throw new BadRequestException('Only submitted applications can enter review.');
    if (dto.status === 'DECISION' && application.status !== 'UNDER_REVIEW') throw new BadRequestException('Begin review before recording a decision.');
    if (dto.status === 'DECISION' && !dto.decision) throw new BadRequestException('A decision is required.');
    return this.prisma.higherEducationApplication.update({
      where: { id },
      data: dto.status === 'UNDER_REVIEW'
        ? { status: 'UNDER_REVIEW', reviewedById: reviewerId, reviewedAt: new Date() }
        : { status: 'DECISION', decision: dto.decision, reviewedById: reviewerId, decidedAt: new Date() },
    });
  }
}
