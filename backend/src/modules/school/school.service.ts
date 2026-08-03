import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { OnboardSchoolDto } from './dto/onboard-school.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SchoolService {
  constructor(private readonly prisma: PrismaService) {}

  async onboard(dto: OnboardSchoolDto) {
    const name = dto.name.trim();
    const code = dto.schoolCode.trim().toUpperCase();
    const subdomain = dto.schoolCode.toLowerCase().trim();
    const adminEmail = dto.adminEmail.toLowerCase().trim();

    // Friendly checks; database unique constraints still protect concurrent requests.
    const existingSchool = await this.prisma.school.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { code: { equals: code, mode: 'insensitive' } },
          { subdomain },
          { customDomain: subdomain },
        ],
      },
    });

    if (existingSchool) {
      if (existingSchool.name.toLowerCase() === name.toLowerCase()) {
        throw new ConflictException('A school with this name already exists.');
      }
      throw new ConflictException('This school code or subdomain is already taken.');
    }

    // 2. Validate email uniqueness
    const existingUser = await this.prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingUser) {
      throw new BadRequestException('A user with this admin email already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);

    // 3. Create everything in a database transaction
    const now = new Date();
    const academicStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const academicYearName = `${academicStartYear}-${academicStartYear + 1}`;
    const defaultClasses = dto.schoolType === 'Preschool'
      ? ['Playgroup', 'Nursery', 'LKG', 'UKG']
      : dto.schoolType === 'College'
        ? ['Year 1', 'Year 2', 'Year 3', 'Year 4']
        : ['Nursery', 'LKG', 'UKG', ...Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`)];

    try {
      return await this.prisma.$transaction(async (tx) => {
      // Create School (Tenant)
      const school = await tx.school.create({
        data: {
          name,
          code,
          subdomain,
          type: dto.schoolType,
          board: dto.board,
          logo: dto.logo,
          address: dto.address.trim(),
          city: dto.city.trim(),
          state: dto.state.trim(),
          country: dto.country.trim(),
          contactPerson: dto.contactPerson.trim(),
          email: dto.email.toLowerCase().trim(),
          phone: dto.phone.trim(),
          website: dto.website || null,
          principalName: dto.principalName.trim(),
          themeColor: dto.primaryBrandColor,
          secondaryColor: dto.secondaryBrandColor,
        },
      });

      // Create Settings
      await tx.schoolSettings.create({
        data: {
          schoolId: school.id,
          supportEmail: dto.supportEmail || dto.email,
          supportPhone: dto.supportPhone || dto.phone,
          admissionFee: 1000.0, // default fee
        },
      });

      // Create School Admin
      const admin = await tx.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          role: Role.SCHOOL_ADMIN,
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName,
          schoolId: school.id,
        },
      });

      await tx.schoolClass.createMany({
        data: defaultClasses.map((className, index) => ({ schoolId: school.id, name: className, sortOrder: index + 1 })),
      });

      await tx.academicYear.create({
        data: {
          schoolId: school.id,
          name: academicYearName,
          startDate: new Date(academicStartYear, 3, 1),
          endDate: new Date(academicStartYear + 1, 2, 31),
        },
      });

      await tx.tenantRole.createMany({
        data: [
          { schoolId: school.id, name: 'School Admin', permissions: ['*'] },
          { schoolId: school.id, name: 'Admissions Staff', permissions: ['applications.read', 'applications.write', 'interviews.manage', 'documents.review'] },
          { schoolId: school.id, name: 'Parent', permissions: ['applications.own', 'documents.own', 'payments.own'] },
          { schoolId: school.id, name: 'Student', permissions: ['profile.own', 'applications.view'] },
        ],
      });

      // Create Default CMS Pages
      await tx.cMSPage.createMany({
        data: [
          {
            schoolId: school.id,
            title: 'Home',
            slug: 'home',
            content: `# Welcome to ${school.name}\n\nOur admission portal is now open. Register as a parent, fill out the application details, submit required certificates, and manage interview schedules.`,
            published: true,
          },
          {
            schoolId: school.id,
            title: 'About Us',
            slug: 'about',
            content: `# About Us\n\nWe provide a standard for high-quality education and support development for students.`,
            published: true,
          },
        ],
      });

      const { passwordHash: _, refreshTokenHash: __, ...sanitizedAdmin } = admin;
      return {
        message: 'School onboarded successfully.',
        school,
        admin: sanitizedAdmin,
      };
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('A school with this name, code, or subdomain already exists.');
      }
      throw error;
    }
  }

  async getDetails(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        settings: true,
      },
    });

    if (!school) {
      throw new BadRequestException('School tenant not found.');
    }

    return school;
  }

  async listAll() {
    return this.prisma.school.findMany({
      select: {
        id: true,
        name: true,
        subdomain: true,
        code: true,
        logo: true,
      },
    });
  }

  async updateSettings(schoolId: string, data: {
    admissionFee?: number;
    autoApproveLeads?: boolean;
    supportEmail?: string;
    supportPhone?: string;
    paymentUpiId?: string;
    paymentPageUrl?: string;
    aiContext?: string;
    assessmentAiEnabled?: boolean;
    assessmentAiMode?: string;
    assessmentAiLogChats?: boolean;
    logo?: string | null;
    schoolPhone?: string;
  }) {
    const { logo, schoolPhone, ...settingsData } = data;

    const [school, settings] = await this.prisma.$transaction([
      this.prisma.school.update({
        where: { id: schoolId },
        data: {
          ...(logo !== undefined ? { logo } : {}),
          ...(schoolPhone !== undefined ? { phone: schoolPhone } : {}),
        },
      }),
      this.prisma.schoolSettings.update({
        where: { schoolId },
        data: settingsData,
      }),
    ]);

    return { school, settings };
  }
}
