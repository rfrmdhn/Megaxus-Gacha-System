import { AdminStatsService } from './admin-stats.service';

describe('AdminStatsService', () => {
  let prisma: any;
  let service: AdminStatsService;

  beforeEach(() => {
    prisma = {
      user: { count: jest.fn() },
      gachaEvent: { count: jest.fn() },
      gachaLog: { count: jest.fn(), aggregate: jest.fn() },
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
});
