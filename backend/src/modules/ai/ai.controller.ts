import { Controller, Post, Body, Get, Query, Req, UseGuards, UploadedFile, UseInterceptors, Delete, Param, ForbiddenException } from '@nestjs/common';
import { AIService } from './ai.service';
import { SchoolId } from '../../core/tenant.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { VertexRagService } from './vertex-rag.service';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly vertexRagService: VertexRagService,
  ) {}

  private assertSchoolAccess(schoolId: string, user: { role: Role; schoolId?: string | null }) {
    if (user.role !== Role.SUPER_ADMIN && user.schoolId !== schoolId) {
      throw new ForbiddenException('You cannot access another school’s AI source library.');
    }
  }

  @Post('chat')
  async chat(
    @Body() dto: { message: string },
    @SchoolId() schoolId: string,
  ) {
    if (!dto.message) {
      throw new Error('Message is required.');
    }
    return this.aiService.chat(dto.message, schoolId);
  }

  @Post('assessment-assistant')
  async assessmentAssistant(@Body() dto: any, @SchoolId() schoolId: string, @Req() req: any) {
    return this.aiService.assessmentAssistant(dto, schoolId, req.user.id);
  }

  @Get('assessment-assistant/logs')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async assessmentChatLogs(@SchoolId() schoolId: string, @Query('assessmentId') assessmentId?: string) {
    return this.aiService.assessmentChatLogs(schoolId, assessmentId);
  }

  @Get('sources')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async sourceLibrary(@SchoolId() schoolId: string, @Req() req: any) {
    this.assertSchoolAccess(schoolId, req.user);
    return this.vertexRagService.listSources(schoolId);
  }

  @Get('source-mode')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  sourceMode(@SchoolId() schoolId: string, @Req() req: any) {
    this.assertSchoolAccess(schoolId, req.user);
    return this.vertexRagService.generationMode();
  }

  @Post('sources/upload')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024, files: 1 },
    }),
  )
  async uploadSource(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: {
      sourceName?: string;
      grade?: string;
      subject?: string;
      chapter?: string;
    },
    @SchoolId() schoolId: string,
    @Req() req: any,
  ) {
    this.assertSchoolAccess(schoolId, req.user);
    return this.vertexRagService.uploadPdf(
      schoolId,
      req.user.id,
      file,
      body,
    );
  }

  @Delete('sources/:id')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async deleteSource(@Param('id') id: string, @SchoolId() schoolId: string, @Req() req: any) {
    this.assertSchoolAccess(schoolId, req.user);
    return this.vertexRagService.deleteSource(schoolId, id);
  }
}
