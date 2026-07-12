import { AdminHistoryController } from './admin-history.controller';

describe('AdminHistoryController#list', () => {
  let historyService: any;
  let adminFeed: any;
  let jwtService: any;
  let prisma: any;
  let controller: AdminHistoryController;

  beforeEach(() => {
    historyService = { list: jest.fn() };
    adminFeed = { stream: jest.fn() };
    jwtService = { verify: jest.fn() };
    prisma = { user: { findUnique: jest.fn() } };
    controller = new AdminHistoryController(
      historyService,
      adminFeed,
      jwtService,
      prisma,
    );
  });

  it('delegates list to historyService', async () => {
    const query = { limit: 20 };
    const result = { items: [], nextCursor: null };
    historyService.list.mockResolvedValue(result);

    const res = await controller.list(query);

    expect(historyService.list).toHaveBeenCalledWith(query);
    expect(res).toEqual(result);
  });
});
