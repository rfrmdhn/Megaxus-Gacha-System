import { NotFoundException } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';

function makeUserRow(overrides: Partial<any> = {}) {
  return {
    id: 'u1',
    email: 'user@test.com',
    role: 'user',
    coins: 500,
    isBanned: false,
    createdAt: new Date('2026-01-01'),
    _count: { gachaLogs: 3 },
    ...overrides,
  };
}

describe('AdminUsersService', () => {
  let prisma: any;
  let service: AdminUsersService;

  beforeEach(() => {
    prisma = {
      user: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      gachaLog: { findMany: jest.fn() },
    };
    service = new AdminUsersService(prisma);
  });

  describe('list', () => {
    it('projects rows into the list DTO shape and passes through pagination', async () => {
      prisma.user.findMany.mockResolvedValue([makeUserRow()]);

      const result = await service.list({ limit: 20 } as any);

      expect(result.items).toEqual([
        {
          id: 'u1',
          email: 'user@test.com',
          role: 'user',
          coins: 500,
          isBanned: false,
          pullCount: 3,
          createdAt: makeUserRow().createdAt,
        },
      ]);
      expect(result.nextCursor).toBeNull();
    });

    it('filters by email case-insensitively when provided', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await service.list({ email: 'Foo', limit: 20 } as any);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: { contains: 'Foo', mode: 'insensitive' } },
        }),
      );
    });

    it('omits the where clause when no email filter is given', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await service.list({ limit: 20 } as any);

      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: undefined }));
    });
  });

  describe('getDetail', () => {
    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getDetail('missing')).rejects.toThrow(NotFoundException);
      expect(prisma.gachaLog.findMany).not.toHaveBeenCalled();
    });

    it('attaches recent history mapped into the response shape', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUserRow());
      prisma.gachaLog.findMany.mockResolvedValue([
        {
          id: 'log1',
          coinsSpent: 10,
          createdAt: new Date('2026-01-02'),
          event: { name: 'Spring Event' },
          item: { name: 'Sword', rarity: 'rare' },
        },
      ]);

      const result = await service.getDetail('u1');

      expect(result.pullCount).toBe(3);
      expect(result.recentHistory).toEqual([
        {
          id: 'log1',
          eventName: 'Spring Event',
          itemName: 'Sword',
          rarity: 'rare',
          coinsSpent: 10,
          createdAt: new Date('2026-01-02'),
        },
      ]);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { coins: 100 })).rejects.toThrow(NotFoundException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('only includes fields that were actually provided in the DTO', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUserRow());
      prisma.user.update.mockResolvedValue(makeUserRow({ isBanned: true }));

      await service.update('u1', { isBanned: true });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { isBanned: true },
      });
    });

    it('merges all provided fields when multiple are given', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUserRow());
      prisma.user.update.mockResolvedValue(makeUserRow());

      await service.update('u1', { coins: 999, role: 'admin' as any, isBanned: false });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { coins: 999, role: 'admin', isBanned: false },
      });
    });
  });
});
