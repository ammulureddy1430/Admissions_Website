import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { SchoolId } from '../../core/tenant.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { Role, User } from '@prisma/client';
import { UpdateNotificationPreferencesDto } from './notification.dto';

type AuthenticatedRequest = { user: User };

@Controller('notification')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async findAll(@SchoolId() schoolId: string) {
    return this.notificationService.findAll(schoolId);
  }

  @Get('mine')
  findMine(@Req() request: AuthenticatedRequest) {
    return this.notificationService.findMine(request.user.id);
  }

  @Patch(':id/read')
  markRead(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.notificationService.markRead(request.user.id, id);
  }

  @Patch('mine/read-all')
  markAllRead(@Req() request: AuthenticatedRequest) {
    return this.notificationService.markAllRead(request.user.id);
  }

  @Get('preferences/mine')
  getPreferences(@Req() request: AuthenticatedRequest) {
    return this.notificationService.getPreferences(request.user.id);
  }

  @Patch('preferences/mine')
  updatePreferences(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationService.updatePreferences(request.user.id, dto);
  }
}
