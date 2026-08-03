import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(schoolId: string) {
    const [
      applicationsCount,
      approvedAppsCount,
      paymentsSuccess,
      appsByStatus,
      appsByGrade,
    ] = await Promise.all([
      // Total applications
      this.prisma.application.count({ where: { schoolId } }),
      // Approved applications
      this.prisma.application.count({ where: { schoolId, status: 'APPROVED' } }),
      // Successful payments & revenue sum
      this.prisma.payment.findMany({
        where: { schoolId, status: { in: ['SUCCESS', 'PAID'] } },
        select: { amount: true, createdAt: true },
      }),
      // Applications by status aggregation
      this.prisma.application.groupBy({
        by: ['status'],
        where: { schoolId },
        _count: { id: true },
      }),
      // Applications by grade aggregation
      this.prisma.application.groupBy({
        by: ['grade'],
        where: { schoolId },
        _count: { id: true },
      }),
    ]);

    // Calculate revenue
    const totalRevenue = paymentsSuccess.reduce((acc, pay) => acc + pay.amount, 0);

    // Calculate Conversion Rate: Approved / Applied * 100
    const conversionRate = applicationsCount > 0 
      ? Math.round((approvedAppsCount / applicationsCount) * 1000) / 10 
      : 0;

    // Transform apps by status
    const appsStatusStats = appsByStatus.map((group) => ({
      status: group.status,
      count: group._count.id,
    }));

    // Transform apps by grade
    const appsGradeStats = appsByGrade.map((group) => ({
      grade: group.grade,
      count: group._count.id,
    }));

    // Calculate database-backed monthly revenue timeline
    const monthsList = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const timelineMap = new Map<string, { month: string; revenue: number; start: Date; end: Date }>();
    
    // Initialize last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      timelineMap.set(key, { month: monthsList[d.getMonth()], revenue: 0, start: d, end });
    }

    paymentsSuccess.forEach((pay) => {
      const key = `${pay.createdAt.getFullYear()}-${pay.createdAt.getMonth()}`;
      const bucket = timelineMap.get(key);
      if (bucket && pay.createdAt >= bucket.start && pay.createdAt < bucket.end) bucket.revenue += pay.amount;
    });

    const revenueTimeline = Array.from(timelineMap.values()).map(({ month, revenue }) => ({ month, revenue }));

    return {
      totals: {
        applications: applicationsCount,
        approved: approvedAppsCount,
        revenue: totalRevenue,
        conversionRate,
      },
      applicationsByStatus: appsStatusStats,
      applicationsByGrade: appsGradeStats,
      revenueTimeline,
    };
  }
}
