import { AdminHistoryService } from './admin-history.service';

function makeLog(overrides: Partial<any> = {}) {
  return {
    id: 'log-1',
    userId: 'user-1',
    coinsSpent: 10,
    createdAt: new Date('2026-01-01'),
    user: { email: 'user@test.com' },
    event: { name: 'Spring Event' },
    item: { name: 'Sword', rarity: 'rare' },
    ...overrides,
  };
}

describe('AdminHistoryService', () => {
  let prisma: any;
  let service: AdminHistoryService;

  beforeEach(() => {
    prisma = {
      gachaLog: { findMany: jest.fn() },
    };
    service = new AdminHistoryService(prisma);
  });

  it('returns mapped history items with nextCursor null when no more pages', async () => {
    prisma.gachaLog.findMany.mockResolvedValue([makeLog()]);

    const result = await service.list({ limit: 20 });

    expect(result.items).toEqual([
      {
        id: 'log-1',
        userId: 'user-1',
        userEmail: 'user@test.com',
        eventName: 'Spring Event',
        itemName: 'Sword',
        rarity: 'rare',
        coinsSpent: 10,
        createdAt: expect.any(Date),
      },
    ]);
    expect(result.nextCursor).toBeNull();
  });

  it('returns nextCursor when there are more rows than the limit', async () => {
    const rows = Array.from({ length: 21 }, (_, i) =>
      makeLog({ id: `log-${i}`, userId: `user-${i}` }),
    );
    prisma.gachaLog.findMany.mockResolvedValue(rows);

    const result = await service.list({ limit: 20 });

    expect(result.items).toHaveLength(20);
    expect(result.nextCursor).toBe('log-19');
  });

  it('filters by userId when provided', async () => {
    prisma.gachaLog.findMany.mockResolvedValue([]);

    await service.list({ userId: 'user-1', limit: 20 });

    expect(prisma.gachaLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
      }),
    );
  });

  it('does not filter by userId when not provided', async () => {
    prisma.gachaLog.findMany.mockResolvedValue([]);

    await service.list({ limit: 20 });

    expect(prisma.gachaLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: undefined,
      }),
    );
  });

  it('passes cursor args for pagination', async () => {
    prisma.gachaLog.findMany.mockResolvedValue([]);

    await service.list({ cursor: 'some-cursor', limit: 10 });

    expect(prisma.gachaLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 11,
        cursor: { id: 'some-cursor' },
        skip: 1,
      }),
    );
  });

  it('selects only the fields it needs from item/event/user relations', async () => {
    prisma.gachaLog.findMany.mockResolvedValue([]);

    await service.list({ limit: 20 });

    expect(prisma.gachaLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          item: { select: { name: true, rarity: true } },
          event: { select: { name: true } },
          user: { select: { email: true } },
        },
      }),
    );
  });
});
