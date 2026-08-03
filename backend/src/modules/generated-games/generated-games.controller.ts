import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SchoolId } from '../../core/tenant.decorator';
import { GenerateGameDto, UpdateGeneratedGameDto } from './dto/generated-game.dto';
import { GeneratedGamesService } from './generated-games.service';

@Controller('game-assessments/generated-games')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL, Role.TEACHER, Role.ADMISSIONS_STAFF)
export class GeneratedGamesController {
  constructor(private readonly service: GeneratedGamesService) {}
  @Post('generate') generate(@Body() dto: GenerateGameDto, @SchoolId() schoolId: string, @Req() req: any) { return this.service.generate(dto, schoolId, req.user.id); }
  @Get() list(@SchoolId() schoolId: string, @Query() query: any) { return this.service.list(schoolId, query); }
  @Get(':id') details(@Param('id') id: string, @SchoolId() schoolId: string) { return this.service.details(id, schoolId); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateGeneratedGameDto, @SchoolId() schoolId: string, @Req() req: any) { return this.service.update(id, dto, schoolId, req.user.id); }
  @Delete(':id') remove(@Param('id') id: string, @SchoolId() schoolId: string) { return this.service.remove(id, schoolId); }
  @Post(':id/regenerate') regenerate(@Param('id') id: string, @SchoolId() schoolId: string, @Req() req: any) { return this.service.regenerate(id, schoolId, req.user.id); }
  @Post(':id/preview') preview(@Param('id') id: string, @SchoolId() schoolId: string, @Req() req: any) { return this.service.preview(id, schoolId, req.user.id); }
  @Post(':id/publish') publish(@Param('id') id: string, @SchoolId() schoolId: string, @Req() req: any) { return this.service.publish(id, schoolId, req.user.id); }
}
