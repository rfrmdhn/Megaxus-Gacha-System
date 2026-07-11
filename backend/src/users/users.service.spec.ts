import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

function makeUser(overrides: Partial<any> = {}) {
  return {
    id: 'user-1',
    email: 'user@test.com',
    coins: 500,
    ...overrides,
  };
}

function makeLog(overrides: Partial<any> = {}) {
  return {
    id: 'log-1',
    coinsSpent: 10,
    createdAt: new Date('2026-01-01'),
    event: { name: 'Spring Event' },
    item: { name: 'Sword', rarity: 'rare' },
    ...overrides,
  };
}

describe('UsersService', () => {
  let prisma: any;
  let service: UsersService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      gachaLog: { findMany: jest.fn() },
    };
    service = new UsersService(prisma);
  });

  describe('getProfile', () => {
    it('throws NotFoundException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('missing')).rejects.toThrow(NotFoundException);
    });

    it('returns mapped profile when user exists', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());

      const result = await service.getProfile('user-1');

      expect(result).toEqual({ id: 'user-1', email: 'user@test.com', coins: 500 });
    });
  });

  describe('getHistory', () => {
    it('returns mapped history items', async () => {
      prisma.gachaLog.findMany.mockResolvedValue([makeLog()]);

      const result = await service.getHistory('user-1', { limit: 20 } as any);

      expect(result.items).toEqual([
        {
          id: 'log-1',
          eventName: 'Spring Event',
          itemName: 'Sword',
          rarity: 'rare',
          coinsSpent: 10,
          createdAt: expect.any(Date),
        },
      ]);
      expect(result.nextCursor).toBeNull();
    });

    it('returns nextCursor when there are more rows', async () => {
      const rows = Array.from({ length: 21 }, (_, i) => makeLog({ id: `log-${i}` }));
      prisma.gachaLog.findMany.mockResolvedValue(rows);

      const result = await service.getHistory('user-1', { limit: 20 } as any);

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toBe('log-19');
    });

    it('passes cursor args for pagination', async () => {
      prisma.gachaLog.findMany.mockResolvedValue([]);

      await service.getHistory('user-1', { cursor: 'some-cursor', limit: 10 } as any);

      expect(prisma.gachaLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          take: 11,
          cursor: { id: 'some-cursor' },
          skip: 1,
        }),
      );
    });
  });
});
