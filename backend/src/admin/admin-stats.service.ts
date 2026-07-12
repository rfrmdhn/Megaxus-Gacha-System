import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminStatsService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeEvents,
      totalEvents,
      pullsToday,
      totalPulls,
      coinsAgg,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.gachaEvent.count({ where: { isActive: true } }),
      this.prisma.gachaEvent.count(),
      this.prisma.gachaLog.count({
        where: { createdAt: { gte: startOfToday } },
      }),
      this.prisma.gachaLog.count(),
      this.prisma.gachaLog.aggregate({ _sum: { coinsSpent: true } }),
    ]);

    return {
      totalUsers,
      activeEvents,
      totalEvents,
      pullsToday,
      totalPulls,
      totalCoinsSpent: coinsAgg._sum.coinsSpent ?? 0,
    };
  }
}
