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

  // Top players ranked by lifetime pull count. Emails are resolved in a second
  // query since groupBy can only return the grouped/aggregated columns.
  async getLeaderboard(limit = 10) {
    const grouped = await this.prisma.gachaLog.groupBy({
      by: ['userId'],
      _count: { _all: true },
      _sum: { coinsSpent: true },
      orderBy: { _count: { userId: 'desc' } },
      take: limit,
    });

    const users = await this.prisma.user.findMany({
      where: { id: { in: grouped.map((g) => g.userId) } },
      select: { id: true, email: true },
    });
    const emailById = new Map(users.map((u) => [u.id, u.email]));

    return grouped.map((g) => ({
      userId: g.userId,
      email: emailById.get(g.userId) ?? null,
      pullCount: g._count._all,
      coinsSpent: g._sum.coinsSpent ?? 0,
    }));
  }

  // All-time pull counts per rarity, optionally scoped to a single event.
  // Rarity lives on GachaItem, not GachaLog, so items are grouped by itemId
  // first and resolved to rarities in a second query, mirroring getLeaderboard.
  async getRarityBreakdown(eventId?: string) {
    const grouped = await this.prisma.gachaLog.groupBy({
      by: ['itemId'],
      where: eventId ? { eventId } : undefined,
      _count: { _all: true },
    });

    const items = await this.prisma.gachaItem.findMany({
      where: { id: { in: grouped.map((g) => g.itemId) } },
      select: { id: true, rarity: true },
    });
    const rarityById = new Map(items.map((i) => [i.id, i.rarity]));

    const counts = new Map<string, number>();
    for (const g of grouped) {
      const rarity = rarityById.get(g.itemId) ?? 'unknown';
      counts.set(rarity, (counts.get(rarity) ?? 0) + g._count._all);
    }

    return Array.from(counts, ([rarity, count]) => ({ rarity, count }));
  }
}
