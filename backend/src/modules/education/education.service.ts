import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import {
  AdminUniversityQueryDto,
  CatalogQueryDto,
  GlobalSearchQueryDto,
  UpsertCourseDto,
  UpsertUniversityDto,
} from './education.dto';

@Injectable()
export class EducationService {
  constructor(private readonly prisma: PrismaService) {}

  async listUniversities(query: AdminUniversityQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.UniversityWhereInput = {
      ...(query.includeUnpublished ? {} : { published: true }),
      ...(query.country
        ? { country: { equals: query.country, mode: 'insensitive' } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { city: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.degreeLevel || query.fieldOfStudy
        ? {
            courses: {
              some: {
                published: true,
                ...(query.degreeLevel
                  ? {
                      degreeLevel: {
                        equals: query.degreeLevel,
                        mode: 'insensitive',
                      },
                    }
                  : {}),
                ...(query.fieldOfStudy
                  ? {
                      fieldOfStudy: {
                        contains: query.fieldOfStudy,
                        mode: 'insensitive',
                      },
                    }
                  : {}),
              },
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.university.findMany({
        where,
        include: {
          courses: {
            where: { published: true },
            take: 4,
            orderBy: { name: 'asc' },
          },
        },
        orderBy: [{ verified: 'desc' }, { ranking: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.university.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getUniversity(slug: string) {
    const university = await this.prisma.university.findFirst({
      where: { OR: [{ slug }, { id: slug }], published: true },
      include: {
        courses: {
          where: { published: true },
          orderBy: [{ degreeLevel: 'asc' }, { name: 'asc' }],
        },
      },
    });
    if (!university) throw new NotFoundException('University not found.');
    return university;
  }

  async listCountries() {
    const records = await this.prisma.university.findMany({
      where: { published: true },
      distinct: ['country'],
      select: { country: true },
      orderBy: { country: 'asc' },
    });
    return records.map((record) => record.country);
  }

  async listCourses(query: CatalogQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.CourseWhereInput = {
      published: true,
      ...(query.degreeLevel
        ? {
            degreeLevel: {
              equals: query.degreeLevel,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.fieldOfStudy
        ? {
            fieldOfStudy: {
              contains: query.fieldOfStudy,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.country
        ? {
            university: {
              country: { equals: query.country, mode: 'insensitive' },
              published: true,
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { fieldOfStudy: { contains: query.search, mode: 'insensitive' } },
              {
                university: {
                  name: { contains: query.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        include: {
          university: {
            select: { id: true, slug: true, name: true, country: true },
          },
        },
        orderBy: [{ university: { name: 'asc' } }, { name: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.course.count({ where }),
    ]);
    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async saveUniversity(userId: string, universityId: string) {
    const university = await this.prisma.university.findFirst({
      where: { id: universityId, published: true },
      select: { id: true },
    });
    if (!university) throw new NotFoundException('University not found.');
    return this.prisma.savedUniversity.upsert({
      where: { userId_universityId: { userId, universityId } },
      create: { userId, universityId },
      update: {},
    });
  }

  async removeSavedUniversity(userId: string, universityId: string) {
    await this.prisma.savedUniversity.deleteMany({
      where: { userId, universityId },
    });
    return { success: true };
  }

  getSavedUniversities(userId: string) {
    return this.prisma.savedUniversity.findMany({
      where: { userId },
      include: { university: { include: { courses: { where: { published: true }, take: 3 } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async compareUniversities(ids: string[]) {
    const uniqueIds = [...new Set(ids)].slice(0, 4);
    if (uniqueIds.length < 2) {
      throw new BadRequestException('Select between two and four universities.');
    }
    return this.prisma.university.findMany({
      where: { id: { in: uniqueIds }, published: true },
      include: { courses: { where: { published: true } } },
    });
  }

  async globalSearch(userId: string, query: GlobalSearchQueryDto) {
    const search = query.search.trim();
    if (search.length < 2) {
      throw new BadRequestException('Search must contain at least two characters.');
    }
    const limit = query.limit ?? 5;
    const contains = { contains: search, mode: Prisma.QueryMode.insensitive };

    const [universities, courses, scholarships, mentors, applications, documents] =
      await Promise.all([
        this.prisma.university.findMany({
          where: { published: true, OR: [{ name: contains }, { city: contains }, { country: contains }] },
          select: { id: true, slug: true, name: true, city: true, country: true },
          take: limit,
        }),
        this.prisma.course.findMany({
          where: { published: true, OR: [{ name: contains }, { fieldOfStudy: contains }] },
          select: { id: true, slug: true, name: true, degreeLevel: true, university: { select: { name: true } } },
          take: limit,
        }),
        this.prisma.scholarship.findMany({
          where: { active: true, OR: [{ name: contains }, { provider: contains }, { eligibility: contains }] },
          select: { id: true, name: true, country: true, deadline: true, provider: true },
          take: limit,
        }),
        this.prisma.mentor.findMany({
          where: {
            verified: true,
            OR: [
              { user: { firstName: contains } },
              { user: { lastName: contains } },
              { position: contains },
              { company: contains },
            ],
          },
          select: { id: true, position: true, company: true, rating: true, user: { select: { firstName: true, lastName: true } } },
          take: limit,
        }),
        this.prisma.higherEducationApplication.findMany({
          where: {
            applicantId: userId,
            OR: [{ institutionName: contains }, { programme: contains }, { status: contains }],
          },
          select: { id: true, institutionName: true, programme: true, status: true, intake: true },
          take: limit,
        }),
        this.prisma.resumeReview.findMany({
          where: {
            studentId: userId,
            OR: [{ originalName: contains }, { reviewType: contains }, { status: contains }],
          },
          select: { id: true, originalName: true, reviewType: true, status: true, resumeUrl: true },
          take: limit,
        }),
      ]);

    return { universities, courses, scholarships, mentors, applications, documents };
  }

  createUniversity(dto: UpsertUniversityDto) {
    return this.prisma.university.create({
      data: {
        ...dto,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async updateUniversity(id: string, dto: UpsertUniversityDto) {
    await this.requireUniversity(id);
    return this.prisma.university.update({
      where: { id },
      data: {
        ...dto,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async deleteUniversity(id: string) {
    await this.requireUniversity(id);
    await this.prisma.university.delete({ where: { id } });
    return { success: true };
  }

  async createCourse(universityId: string, dto: UpsertCourseDto) {
    await this.requireUniversity(universityId);
    return this.prisma.course.create({
      data: {
        ...dto,
        universityId,
        requirements: dto.requirements as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async updateCourse(id: string, dto: UpsertCourseDto) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!course) throw new NotFoundException('Course not found.');
    return this.prisma.course.update({
      where: { id },
      data: {
        ...dto,
        requirements: dto.requirements as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async deleteCourse(id: string) {
    const result = await this.prisma.course.deleteMany({ where: { id } });
    if (!result.count) throw new NotFoundException('Course not found.');
    return { success: true };
  }

  private async requireUniversity(id: string) {
    const university = await this.prisma.university.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!university) throw new NotFoundException('University not found.');
    return university;
  }
}
