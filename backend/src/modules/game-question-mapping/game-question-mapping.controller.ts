import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SchoolId } from '../../core/tenant.decorator';
import { SaveGameMappingDto } from './dto/game-question-mapping.dto';
import { GameQuestionMappingService } from './game-question-mapping.service';

@Controller('game-assessments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL, Role.TEACHER, Role.ADMISSIONS_STAFF)
export class GameQuestionMappingController {
  constructor(private readonly service: GameQuestionMappingService) {}

  @Get('game-templates')
  templates(@SchoolId() schoolId: string, @Query() query: any) { return this.service.templates(schoolId, query); }

  @Get('game-mapping')
  mappings(@SchoolId() schoolId: string, @Query() query: any) { return this.service.mappings(schoolId, query); }

  @Post('game-mapping')
  create(@Body() dto: SaveGameMappingDto, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.save(dto, schoolId, req.user.id);
  }

  @Put('game-mapping/:id')
  update(@Param('id') id: string, @Body() dto: SaveGameMappingDto, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.save(dto, schoolId, req.user.id, id);
  }
}
