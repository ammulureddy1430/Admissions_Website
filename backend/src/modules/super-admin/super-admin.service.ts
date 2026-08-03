import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class SuperAdminService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Schools Management
  async getSchools() {
    return this.prisma.school.findMany({
      include: {
        settings: true,
        subscription: {
          include: { plan: true },
        },
      },
    });
  }

  async getApplications() {
    return this.prisma.application.findMany({
      select: {
        id: true,
        studentFirstName: true,
        studentLastName: true,
        grade: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
        school: {
          select: { id: true, name: true },
        },
        parent: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSchool(id: string, data: { name?: string; customDomain?: string; themeColor?: string }) {
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) throw new NotFoundException('School not found.');

    return this.prisma.school.update({
      where: { id },
      data,
    });
  }

  async deleteSchool(id: string) {
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) throw new NotFoundException('School not found.');

    await this.prisma.user.deleteMany({ where: { schoolId: id } });
    await this.prisma.storageUsage.deleteMany({ where: { schoolId: id } });
    await this.prisma.subscription.deleteMany({ where: { schoolId: id } });
    await this.prisma.schoolSettings.deleteMany({ where: { schoolId: id } });
    await this.prisma.application.deleteMany({ where: { schoolId: id } });
    await this.prisma.studentDocument.deleteMany({ where: { schoolId: id } });
    await this.prisma.requiredDocument.deleteMany({ where: { schoolId: id } });
    await this.prisma.documentAuditLog.deleteMany({ where: { schoolId: id } });
    await this.prisma.lead.deleteMany({ where: { schoolId: id } });

    return this.prisma.school.delete({ where: { id } });
  }

  // 2. School subscription plans
  async getPlans() {
    return this.prisma.plan.findMany();
  }

  async createPlan(data: { name: string; price: number; billingCycle: string; maxApplications: number; maxLeads: number }) {
    return this.prisma.plan.create({ data });
  }

  async updatePlan(id: string, data: { name?: string; price?: number; billingCycle?: string; maxApplications?: number; maxLeads?: number }) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found.');

    return this.prisma.plan.update({
      where: { id },
      data,
    });
  }

  // 3. Subscriptions Management
  async getSubscriptions() {
    return this.prisma.subscription.findMany({
      include: {
        school: { select: { id: true, name: true, subdomain: true } },
        plan: true,
      },
    });
  }

  async createSubscription(data: { schoolId: string; planId: string; endDate: string }) {
    return this.prisma.subscription.create({
      data: {
        schoolId: data.schoolId,
        planId: data.planId,
        endDate: new Date(data.endDate),
        status: 'ACTIVE',
      },
    });
  }

  async updateSubscription(id: string, data: { planId?: string; status?: string; endDate?: string }) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Subscription not found.');

    return this.prisma.subscription.update({
      where: { id },
      data: {
        planId: data.planId,
        status: data.status,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }

  // 4. Global Users Management
  async getUsers() {
    return this.prisma.user.findMany({
      include: {
        school: { select: { id: true, name: true } },
      },
    });
  }

  async updateUserStatus(id: string, status: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');

    return this.prisma.user.update({
      where: { id },
      data: { status },
    });
  }

  // 5. System wide Analytics
  async getAnalytics() {
    const [schoolsCount, activeSubsCount, plans, totalApps] = await Promise.all([
      this.prisma.school.count(),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.plan.findMany(),
      this.prisma.application.count(),
    ]);

    // Calculate simulated MRR based on active plans
    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: { plan: true },
    });
    const monthlyRecurringRevenue = activeSubscriptions.reduce((sum, sub) => sum + (sub.plan?.price || 0), 0);

    return {
      schools: schoolsCount,
      activeSubscriptions: activeSubsCount,
      totalApplications: totalApps,
      mrr: monthlyRecurringRevenue,
      plans: plans.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        count: activeSubscriptions.filter(sub => sub.planId === p.id).length,
      })),
    };
  }
}
