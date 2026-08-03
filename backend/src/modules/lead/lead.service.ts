import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLeadDto, schoolId: string) {
    return this.prisma.lead.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        grade: dto.grade,
        notes: dto.notes,
        source: dto.source || 'WEBSITE',
        referredBy: dto.referredBy,
        schoolId,
      },
    });
  }

  async findAll(schoolId: string) {
    return this.prisma.lead.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: string, schoolId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, schoolId },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found under this school tenant.');
    }

    return this.prisma.lead.update({
      where: { id },
      data: { status },
    });
  }

  async delete(id: string, schoolId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, schoolId },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found under this school tenant.');
    }

    return this.prisma.lead.delete({
      where: { id },
    });
  }
}
