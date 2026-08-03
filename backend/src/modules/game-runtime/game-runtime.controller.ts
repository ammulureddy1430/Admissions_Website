import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SchoolId } from '../../core/tenant.decorator';
import { RuntimeActionDto, StartRuntimeDto } from './dto/game-runtime.dto';
import { GameRuntimeService } from './game-runtime.service';

@Controller('game-assessments/engine')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GameRuntimeController {
  constructor(private readonly service: GameRuntimeService) {}

  @Get('definitions')
  @Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL, Role.TEACHER, Role.ADMISSIONS_STAFF, Role.STUDENT)
  definitions(@SchoolId() schoolId: string) { return this.service.definitions(schoolId); }

  @Post('sessions')
  @Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL, Role.TEACHER, Role.ADMISSIONS_STAFF, Role.STUDENT)
  start(@Body() dto: StartRuntimeDto, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.start(dto, schoolId, req.user.id);
  }

  @Get('sessions/:id')
  @Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL, Role.TEACHER, Role.ADMISSIONS_STAFF, Role.STUDENT, Role.PARENT)
  state(@Param('id') id: string, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.state(id, schoolId, req.user);
  }

  @Post('sessions/:id/action')
  @Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL, Role.TEACHER, Role.ADMISSIONS_STAFF, Role.STUDENT, Role.PARENT)
  action(@Param('id') id: string, @Body() dto: RuntimeActionDto, @SchoolId() schoolId: string, @Req() req: any) {
    return this.service.action(id, dto, schoolId, req.user);
  }
}
