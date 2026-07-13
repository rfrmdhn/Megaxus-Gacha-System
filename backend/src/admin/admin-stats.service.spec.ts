import { AdminStatsService } from './admin-stats.service';

describe('AdminStatsService', () => {
  let prisma: any;
  let service: AdminStatsService;

  beforeEach(() => {
    prisma = {
      user: { count: jest.fn(), findMany: jest.fn() },
      gachaEvent: { count: jest.fn() },
      gachaLog: { count: jest.fn(), aggregate: jest.fn(), groupBy: jest.fn() },
      gachaItem: { findMany: jest.fn() },
      $transaction: jest.fn(),
    };
    service = new AdminStatsService(prisma);
  });

  it('aggregates every metric from the transaction into the stats DTO', async () => {
    prisma.$transaction.mockResolvedValue([
      42,
      3,
      7,
      15,
      1200,
      { _sum: { coinsSpent: 3400 } },
    ]);

    const result = await service.getStats();

    expect(result).toEqual({
      totalUsers: 42,
      activeEvents: 3,
      totalEvents: 7,
      pullsToday: 15,
      totalPulls: 1200,
      totalCoinsSpent: 3400,
    });
  });

  it('defaults totalCoinsSpent to 0 when no pulls have ever happened', async () => {
    prisma.$transaction.mockResolvedValue([
      0,
      0,
      0,
      0,
      0,
      { _sum: { coinsSpent: null } },
    ]);

    const result = await service.getStats();

    expect(result.totalCoinsSpent).toBe(0);
  });

  it('runs all counts inside a single transaction', async () => {
    prisma.$transaction.mockResolvedValue([
      0,
      0,
      0,
      0,
      0,
      { _sum: { coinsSpent: null } },
    ]);

    await service.getStats();

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Array));
  });

  describe('getLeaderboard', () => {
    it('ranks users by pull count and resolves their emails', async () => {
      prisma.gachaLog.groupBy.mockResolvedValue([
        { userId: 'u1', _count: { _all: 50 }, _sum: { coinsSpent: 500 } },
        { userId: 'u2', _count: { _all: 20 }, _sum: { coinsSpent: 200 } },
      ]);
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', email: 'top@test.com' },
        { id: 'u2', email: 'second@test.com' },
      ]);

      const result = await service.getLeaderboard();

      expect(result).toEqual([
        { userId: 'u1', email: 'top@test.com', pullCount: 50, coinsSpent: 500 },
        {
          userId: 'u2',
          email: 'second@test.com',
          pullCount: 20,
          coinsSpent: 200,
        },
      ]);
    });

    it('falls back to null email and zero coins when data is missing', async () => {
      prisma.gachaLog.groupBy.mockResolvedValue([
        { userId: 'ghost', _count: { _all: 5 }, _sum: { coinsSpent: null } },
      ]);
      prisma.user.findMany.mockResolvedValue([]);

      const result = await service.getLeaderboard();

      expect(result).toEqual([
        { userId: 'ghost', email: null, pullCount: 5, coinsSpent: 0 },
      ]);
    });
  });

  describe('getRarityBreakdown', () => {
    it('groups all-time pull counts by rarity across every event when no eventId is given', async () => {
      prisma.gachaLog.groupBy.mockResolvedValue([
        { itemId: 'item-legendary', _count: { _all: 3 } },
        { itemId: 'item-common', _count: { _all: 7 } },
      ]);
      prisma.gachaItem.findMany.mockResolvedValue([
        { id: 'item-legendary', rarity: 'legendary' },
        { id: 'item-common', rarity: 'common' },
      ]);

      const result = await service.getRarityBreakdown();

      expect(prisma.gachaLog.groupBy).toHaveBeenCalledWith({
        by: ['itemId'],
        where: undefined,
        _count: { _all: true },
      });
      expect(result).toEqual([
        { rarity: 'legendary', count: 3 },
        { rarity: 'common', count: 7 },
      ]);
    });

    it('scopes the query to a single event when eventId is given', async () => {
      prisma.gachaLog.groupBy.mockResolvedValue([
        { itemId: 'item-rare', _count: { _all: 2 } },
      ]);
      prisma.gachaItem.findMany.mockResolvedValue([
        { id: 'item-rare', rarity: 'rare' },
      ]);

      const result = await service.getRarityBreakdown('event-1');

      expect(prisma.gachaLog.groupBy).toHaveBeenCalledWith({
        by: ['itemId'],
        where: { eventId: 'event-1' },
        _count: { _all: true },
      });
      expect(result).toEqual([{ rarity: 'rare', count: 2 }]);
    });

    it('sums counts from multiple items sharing the same rarity', async () => {
      prisma.gachaLog.groupBy.mockResolvedValue([
        { itemId: 'item-a', _count: { _all: 4 } },
        { itemId: 'item-b', _count: { _all: 6 } },
      ]);
      prisma.gachaItem.findMany.mockResolvedValue([
        { id: 'item-a', rarity: 'common' },
        { id: 'item-b', rarity: 'common' },
      ]);

      const result = await service.getRarityBreakdown();

      expect(result).toEqual([{ rarity: 'common', count: 10 }]);
    });

    it('falls back to "unknown" when an item no longer resolves (e.g. deleted)', async () => {
      prisma.gachaLog.groupBy.mockResolvedValue([
        { itemId: 'missing-item', _count: { _all: 1 } },
      ]);
      prisma.gachaItem.findMany.mockResolvedValue([]);

      const result = await service.getRarityBreakdown();

      expect(result).toEqual([{ rarity: 'unknown', count: 1 }]);
    });

    it('returns an empty array when there are no pulls yet', async () => {
      prisma.gachaLog.groupBy.mockResolvedValue([]);
      prisma.gachaItem.findMany.mockResolvedValue([]);

      const result = await service.getRarityBreakdown();

      expect(result).toEqual([]);
    });
  });
});
