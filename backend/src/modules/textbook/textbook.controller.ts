import {
  Body, Controller, Delete, Get, Param, Post, Put, Query, Req,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SchoolId } from '../../core/tenant.decorator';
import { CreateTextbookDto, RestoreTextbookDto, UploadTextbookDto } from './dto/textbook.dto';
import { TextbookService } from './textbook.service';

const EDIT_ROLES = [Role.SCHOOL_ADMIN, Role.PRINCIPAL, Role.TEACHER, Role.ADMISSIONS_STAFF];
const ADMIN_ROLES = [Role.SCHOOL_ADMIN, Role.PRINCIPAL];
const pdfUpload = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
});

@Controller('textbooks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...EDIT_ROLES)
export class TextbookController {
  constructor(private readonly service: TextbookService) {}

  @Post()
  create(@Body() dto: CreateTextbookDto, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.create(dto, schoolId, req.user.id);
  }

  @Get()
  list(@SchoolId() schoolId: string, @Query() query: any) {
    return this.service.list(schoolId, query);
  }

  @Get('meta/options')
  options(@SchoolId() schoolId: string) {
    return this.service.options(schoolId);
  }

  @Get('meta/audit-logs')
  @Roles(...ADMIN_ROLES)
  audits(@SchoolId() schoolId: string, @Query('limit') limit?: string) {
    return this.service.auditLogs(schoolId, Number(limit) || 100);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @SchoolId() schoolId: string) {
    return this.service.findOne(id, schoolId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: CreateTextbookDto, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.update(id, dto, schoolId, req.user.id);
  }

  @Delete(':id')
  @Roles(...ADMIN_ROLES)
  remove(@Param('id') id: string, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.remove(id, schoolId, req.user.id);
  }

  @Post(':id/upload')
  @UseInterceptors(pdfUpload)
  upload(@Param('id') id: string, @Body() dto: UploadTextbookDto, @UploadedFile() file: Express.Multer.File, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.upload(id, dto, file, schoolId, req.user.id);
  }

  @Post(':id/replace')
  @UseInterceptors(pdfUpload)
  replace(@Param('id') id: string, @Body() dto: UploadTextbookDto, @UploadedFile() file: Express.Multer.File, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.upload(id, dto, file, schoolId, req.user.id, true);
  }

  @Get(':id/preview')
  preview(@Param('id') id: string, @Query('versionId') versionId: string | undefined, @SchoolId() schoolId: string) {
    return this.service.accessUrl(id, schoolId, 'inline', versionId);
  }

  @Get(':id/download')
  download(@Param('id') id: string, @Query('versionId') versionId: string | undefined, @SchoolId() schoolId: string) {
    return this.service.accessUrl(id, schoolId, 'attachment', versionId);
  }

  @Get(':id/versions')
  versions(@Param('id') id: string, @SchoolId() schoolId: string) {
    return this.service.versions(id, schoolId);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string, @Body() dto: RestoreTextbookDto, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.restore(id, dto, schoolId, req.user.id);
  }
}
