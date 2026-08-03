import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SchoolId } from '../../core/tenant.decorator';
import { ProcessDocumentDto, ReprocessDocumentDto } from './dto/document-processing.dto';
import { GameDocumentProcessingService } from './game-document-processing.service';

const GAME_DOCUMENT_ROLES = [Role.SCHOOL_ADMIN, Role.PRINCIPAL, Role.TEACHER, Role.ADMISSIONS_STAFF];

@Controller('game-assessments/documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...GAME_DOCUMENT_ROLES)
export class GameDocumentProcessingController {
  constructor(private readonly service: GameDocumentProcessingService) {}

  @Post('process')
  process(@Body() dto: ProcessDocumentDto, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.process(dto.textbookVersionId, schoolId, req.user.id);
  }

  @Get()
  list(@SchoolId() schoolId: string, @Query() query: any) {
    return this.service.list(schoolId, query);
  }

  @Get(':id/status')
  status(@Param('id') id: string, @SchoolId() schoolId: string) {
    return this.service.status(id, schoolId);
  }

  @Get(':id/chapters')
  chapters(@Param('id') id: string, @SchoolId() schoolId: string) {
    return this.service.chapters(id, schoolId);
  }

  @Get(':id/topics')
  topics(@Param('id') id: string, @SchoolId() schoolId: string) {
    return this.service.topics(id, schoolId);
  }

  @Get(':id')
  details(@Param('id') id: string, @SchoolId() schoolId: string) {
    return this.service.details(id, schoolId);
  }

  @Post('reprocess')
  reprocess(@Body() dto: ReprocessDocumentDto, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.reprocess(dto.processedTextbookId, schoolId, req.user.id);
  }
}
