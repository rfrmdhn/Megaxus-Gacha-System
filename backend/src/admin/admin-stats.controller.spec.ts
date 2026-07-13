import { AdminStatsController } from './admin-stats.controller';

describe('AdminStatsController', () => {
  let statsService: any;
  let controller: AdminStatsController;

  beforeEach(() => {
    statsService = {
      getStats: jest.fn(),
      getLeaderboard: jest.fn(),
      getRarityBreakdown: jest.fn(),
    };
    controller = new AdminStatsController(statsService);
  });

  it('delegates getStats to statsService', async () => {
    const stats = {
      totalUsers: 42,
      activeEvents: 3,
      totalEvents: 7,
      pullsToday: 15,
      totalPulls: 1200,
      totalCoinsSpent: 3400,
    };
    statsService.getStats.mockResolvedValue(stats);

    const result = await controller.getStats();

    expect(result).toEqual(stats);
    expect(statsService.getStats).toHaveBeenCalled();
  });

  it('delegates getLeaderboard to statsService', async () => {
    const leaderboard = [
      { userId: 'u1', email: 'top@test.com', pullCount: 50, coinsSpent: 500 },
    ];
    statsService.getLeaderboard.mockResolvedValue(leaderboard);

    const result = await controller.getLeaderboard();

    expect(result).toEqual(leaderboard);
    expect(statsService.getLeaderboard).toHaveBeenCalled();
  });

  it('delegates getRarityBreakdown to statsService with the query eventId', async () => {
    const breakdown = [{ rarity: 'legendary', count: 5 }];
    statsService.getRarityBreakdown.mockResolvedValue(breakdown);

    const result = await controller.getRarityBreakdown({ eventId: 'event-1' });

    expect(result).toEqual(breakdown);
    expect(statsService.getRarityBreakdown).toHaveBeenCalledWith('event-1');
  });

  it('delegates getRarityBreakdown to statsService with no eventId for all-time, all events', async () => {
    const breakdown = [{ rarity: 'common', count: 10 }];
    statsService.getRarityBreakdown.mockResolvedValue(breakdown);

    const result = await controller.getRarityBreakdown({});

    expect(result).toEqual(breakdown);
    expect(statsService.getRarityBreakdown).toHaveBeenCalledWith(undefined);
  });
});
