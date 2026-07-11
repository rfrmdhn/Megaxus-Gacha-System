import { AdminStatsController } from './admin-stats.controller';

describe('AdminStatsController', () => {
  let statsService: any;
  let controller: AdminStatsController;

  beforeEach(() => {
    statsService = { getStats: jest.fn() };
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
});
