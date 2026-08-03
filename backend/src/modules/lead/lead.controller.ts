import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { LeadService } from './lead.service';
import { CreateLeadDto, UpdateLeadStatusDto } from './dto/create-lead.dto';
import { SchoolId } from '../../core/tenant.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { Role } from '@prisma/client';

@Controller('lead')
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Post()
  async create(@Body() dto: CreateLeadDto, @SchoolId() schoolId: string) {
    return this.leadService.create(dto, schoolId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  @Get()
  async findAll(@SchoolId() schoolId: string) {
    return this.leadService.findAll(schoolId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLeadStatusDto,
    @SchoolId() schoolId: string,
  ) {
    return this.leadService.updateStatus(id, dto.status, schoolId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SCHOOL_ADMIN)
  @Delete(':id')
  async delete(@Param('id') id: string, @SchoolId() schoolId: string) {
    return this.leadService.delete(id, schoolId);
  }
}
