import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { Role } from '@prisma/client';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  // Schools management
  @Get('schools')
  async getSchools() {
    return this.superAdminService.getSchools();
  }

  @Get('applications')
  async getApplications() {
    return this.superAdminService.getApplications();
  }

  @Patch('schools/:id')
  async updateSchool(
    @Param('id') id: string,
    @Body() data: { name?: string; customDomain?: string; themeColor?: string },
  ) {
    return this.superAdminService.updateSchool(id, data);
  }

  @Delete('schools/:id')
  async deleteSchool(@Param('id') id: string) {
    return this.superAdminService.deleteSchool(id);
  }

  // Plans management
  @Get('plans')
  async getPlans() {
    return this.superAdminService.getPlans();
  }

  @Post('plans')
  async createPlan(
    @Body() data: { name: string; price: number; billingCycle: string; maxApplications: number; maxLeads: number },
  ) {
    return this.superAdminService.createPlan(data);
  }

  @Patch('plans/:id')
  async updatePlan(
    @Param('id') id: string,
    @Body() data: { name?: string; price?: number; billingCycle?: string; maxApplications?: number; maxLeads?: number },
  ) {
    return this.superAdminService.updatePlan(id, data);
  }

  // Subscriptions management
  @Get('subscriptions')
  async getSubscriptions() {
    return this.superAdminService.getSubscriptions();
  }

  @Post('subscriptions')
  async createSubscription(
    @Body() data: { schoolId: string; planId: string; endDate: string },
  ) {
    return this.superAdminService.createSubscription(data);
  }

  @Patch('subscriptions/:id')
  async updateSubscription(
    @Param('id') id: string,
    @Body() data: { planId?: string; status?: string; endDate?: string },
  ) {
    return this.superAdminService.updateSubscription(id, data);
  }

  // Users management
  @Get('users')
  async getUsers() {
    return this.superAdminService.getUsers();
  }

  @Patch('users/:id/status')
  async updateUserStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.superAdminService.updateUserStatus(id, status);
  }

  // Diagnostics
  @Get('analytics')
  async getAnalytics() {
    return this.superAdminService.getAnalytics();
  }
}
