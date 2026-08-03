import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class CMSService {
  constructor(private readonly prisma: PrismaService) {}

  async createPage(data: { title: string; slug: string; content: string; published?: boolean }, schoolId: string) {
    const slug = data.slug.toLowerCase().trim();

    // Check slug uniqueness within this school tenant
    const existing = await this.prisma.cMSPage.findFirst({
      where: { schoolId, slug },
    });

    if (existing) {
      throw new BadRequestException('A page with this slug already exists for this school.');
    }

    return this.prisma.cMSPage.create({
      data: {
        title: data.title,
        slug,
        content: data.content,
        published: data.published ?? false,
        schoolId,
      },
    });
  }

  async getPage(slug: string, schoolId: string) {
    const page = await this.prisma.cMSPage.findFirst({
      where: { schoolId, slug: slug.toLowerCase() },
    });

    if (!page) {
      throw new NotFoundException('Page not found.');
    }

    return page;
  }

  async listPages(schoolId: string) {
    return this.prisma.cMSPage.findMany({
      where: { schoolId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updatePage(
    id: string,
    data: { title?: string; slug?: string; content?: string; published?: boolean },
    schoolId: string,
  ) {
    const page = await this.prisma.cMSPage.findFirst({
      where: { id, schoolId },
    });

    if (!page) {
      throw new NotFoundException('Page not found.');
    }

    const updateData: any = { ...data };
    if (data.slug) {
      const slug = data.slug.toLowerCase().trim();
      if (slug !== page.slug) {
        const existing = await this.prisma.cMSPage.findFirst({
          where: { schoolId, slug },
        });
        if (existing) {
          throw new BadRequestException('Slug is already taken by another page.');
        }
        updateData.slug = slug;
      }
    }

    return this.prisma.cMSPage.update({
      where: { id },
      data: updateData,
    });
  }

  async deletePage(id: string, schoolId: string) {
    const page = await this.prisma.cMSPage.findFirst({
      where: { id, schoolId },
    });

    if (!page) {
      throw new NotFoundException('Page not found.');
    }

    return this.prisma.cMSPage.delete({
      where: { id },
    });
  }
}
