import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SchoolId } from '../../core/tenant.decorator';
import { GenerateGameQuestionsDto, ReviewGameQuestionsDto, UpdateGameQuestionDto } from './dto/game-ai-question.dto';
import { GameAIQuestionsService } from './game-ai-questions.service';

@Controller('game-assessments/questions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL, Role.TEACHER, Role.ADMISSIONS_STAFF)
export class GameAIQuestionsController {
  constructor(private readonly service: GameAIQuestionsService) {}

  @Post('generate')
  generate(@Body() dto: GenerateGameQuestionsDto, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.generate(dto, schoolId, req.user.id);
  }

  @Get()
  list(@SchoolId() schoolId: string, @Query() query: any) { return this.service.list(schoolId, query); }

  @Get('review')
  review(@SchoolId() schoolId: string, @Query() query: any) { return this.service.review(schoolId, query); }

  @Post('approve')
  approve(@Body() dto: ReviewGameQuestionsDto, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.reviewAction(dto.questionIds, 'APPROVED', dto.note, schoolId, req.user.id);
  }

  @Post('reject')
  reject(@Body() dto: ReviewGameQuestionsDto, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.reviewAction(dto.questionIds, 'REJECTED', dto.note, schoolId, req.user.id);
  }

  @Post('draft')
  draft(@Body() dto: ReviewGameQuestionsDto, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.saveDrafts(dto.questionIds, dto.note, schoolId, req.user.id);
  }

  @Post('bulk-delete')
  bulkDelete(@Body() dto: ReviewGameQuestionsDto, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.bulkDelete(dto.questionIds, schoolId, req.user.id);
  }

  @Get(':id')
  details(@Param('id') id: string, @SchoolId() schoolId: string) { return this.service.details(id, schoolId); }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGameQuestionDto, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.update(id, dto, schoolId, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.remove(id, schoolId, req.user.id);
  }
}
