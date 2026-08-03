import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CMSService } from './cms.service';
import { SchoolId, OptionalSchoolId } from '../../core/tenant.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { Role } from '@prisma/client';

@Controller('cms')
export class CMSController {
  constructor(private readonly cmsService: CMSService) {}

  @Get()
  async listPages(@OptionalSchoolId() schoolId: string) {
    if (!schoolId) {
      return [];
    }
    return this.cmsService.listPages(schoolId);
  }

  @Get(':slug')
  async getPage(@Param('slug') slug: string, @OptionalSchoolId() schoolId: string) {
    return this.cmsService.getPage(slug, schoolId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  @Post()
  async create(
    @Body() data: { title: string; slug: string; content: string; published?: boolean },
    @SchoolId() schoolId: string,
  ) {
    return this.cmsService.createPage(data, schoolId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: { title?: string; slug?: string; content?: string; published?: boolean },
    @SchoolId() schoolId: string,
  ) {
    return this.cmsService.updatePage(id, data, schoolId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SCHOOL_ADMIN)
  @Delete(':id')
  async delete(@Param('id') id: string, @SchoolId() schoolId: string) {
    return this.cmsService.deletePage(id, schoolId);
  }
}
