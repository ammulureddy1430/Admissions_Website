import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CollegeReviewDto, CreateHigherEducationApplicationDto } from './dto/higher-education-application.dto';
import { HigherEducationService } from './higher-education.service';

@Controller('higher-education-applications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HigherEducationController {
  constructor(private readonly service: HigherEducationService) {}

  @Post()
  @Roles(Role.PARENT)
  create(@Body() dto: CreateHigherEducationApplicationDto, @Req() req: Request) {
    const user = req.user as any;
    return this.service.create(dto, user.id, user.schoolId);
  }

  @Get('mine')
  @Roles(Role.PARENT)
  findMine(@Req() req: Request) {
    return this.service.findMine((req.user as any).id);
  }

  @Patch(':id/documents-complete')
  @Roles(Role.PARENT)
  documentsComplete(@Param('id') id: string, @Req() req: Request) {
    return this.service.updateByApplicant(id, (req.user as any).id, 'documents');
  }

  @Patch(':id/submit')
  @Roles(Role.PARENT)
  submit(@Param('id') id: string, @Req() req: Request) {
    return this.service.updateByApplicant(id, (req.user as any).id, 'submit');
  }

  @Delete(':id')
  @Roles(Role.PARENT)
  removeDraft(@Param('id') id: string, @Req() req: Request) {
    return this.service.removeDraft(id, (req.user as any).id);
  }

  @Get('college')
  @Roles(Role.COLLEGE_ADMIN)
  findForCollege(@Req() req: Request) {
    return this.service.findForCollege((req.user as any).schoolId);
  }

  @Patch(':id/review')
  @Roles(Role.COLLEGE_ADMIN)
  review(@Param('id') id: string, @Body() dto: CollegeReviewDto, @Req() req: Request) {
    const user = req.user as any;
    return this.service.review(id, user.schoolId, user.id, dto);
  }
}
