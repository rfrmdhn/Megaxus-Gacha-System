import { ConflictException, NotFoundException } from '@nestjs/common';
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
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      gachaLog: { findMany: jest.fn(), count: jest.fn() },
    };
    service = new AdminUsersService(prisma);
  });

  describe('list', () => {
    it('projects rows into the list DTO shape and passes through pagination', async () => {
      prisma.user.findMany.mockResolvedValue([makeUserRow()]);

      const result = await service.list({ limit: 20 });

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

      await service.list({ email: 'Foo', limit: 20 });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: { contains: 'Foo', mode: 'insensitive' } },
        }),
      );
    });

    it('omits the where clause when no email filter is given', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await service.list({ limit: 20 });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });

  describe('create', () => {
    it('throws ConflictException when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUserRow());

      await expect(
        service.create({ email: 'user@test.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('hashes the password and creates the user with default role/coins', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(
        makeUserRow({
          id: 'new-user',
          email: 'new@test.com',
          _count: undefined,
        }),
      );

      const result = await service.create({
        email: 'new@test.com',
        password: 'password123',
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'new@test.com',
          passwordHash: expect.any(String),
        },
      });
      expect(prisma.user.create.mock.calls[0][0].data.passwordHash).not.toBe(
        'password123',
      );
      expect(result).toEqual({
        id: 'new-user',
        email: 'new@test.com',
        role: 'user',
        coins: 500,
        isBanned: false,
        pullCount: 0,
        createdAt: makeUserRow().createdAt,
      });
    });

    it('passes through an explicit role and coins when provided', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(
        makeUserRow({
          id: 'new-user',
          email: 'new@test.com',
          role: 'admin',
          coins: 1000,
        }),
      );

      await service.create({
        email: 'new@test.com',
        password: 'password123',
        role: 'admin',
        coins: 1000,
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'new@test.com',
          passwordHash: expect.any(String),
          role: 'admin',
          coins: 1000,
        },
      });
    });
  });

  describe('getDetail', () => {
    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getDetail('missing')).rejects.toThrow(
        NotFoundException,
      );
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

    it('selects only the fields it needs from item/event relations', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUserRow());
      prisma.gachaLog.findMany.mockResolvedValue([]);

      await service.getDetail('u1');

      expect(prisma.gachaLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            item: { select: { name: true, rarity: true } },
            event: { select: { name: true } },
          },
        }),
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { coins: 100 })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('only includes fields that were actually provided in the DTO', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUserRow());
      prisma.user.update.mockResolvedValue(makeUserRow({ isBanned: true }));

      await service.update('u1', { isBanned: true });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { isBanned: true },
        include: { _count: { select: { gachaLogs: true } } },
      });
    });

    it('merges all provided fields when multiple are given', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUserRow());
      prisma.user.update.mockResolvedValue(makeUserRow());

      await service.update('u1', {
        coins: 999,
        role: 'admin',
        isBanned: false,
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { coins: 999, role: 'admin', isBanned: false },
        include: { _count: { select: { gachaLogs: true } } },
      });
    });

    it('omits isBanned from data when not provided', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUserRow());
      prisma.user.update.mockResolvedValue(makeUserRow({ coins: 200 }));

      await service.update('u1', { coins: 200 });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { coins: 200 },
        include: { _count: { select: { gachaLogs: true } } },
      });
    });

    it('projects the safe summary shape and never leaks credential hashes', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUserRow());
      prisma.user.update.mockResolvedValue(
        makeUserRow({
          coins: 200,
          passwordHash: 'super-secret-bcrypt-hash',
          refreshTokenHash: 'refresh-hash',
          refreshTokenExpiresAt: new Date('2026-02-01'),
        }),
      );

      const result = await service.update('u1', { coins: 200 });

      expect(result).toEqual({
        id: 'u1',
        email: 'user@test.com',
        role: 'user',
        coins: 200,
        isBanned: false,
        pullCount: 3,
        createdAt: makeUserRow().createdAt,
      });
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('refreshTokenHash');
      expect(result).not.toHaveProperty('refreshTokenExpiresAt');
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the user has pull history', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUserRow());
      prisma.gachaLog.count.mockResolvedValue(5);

      await expect(service.remove('u1')).rejects.toThrow(ConflictException);
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('deletes a user with no pull history', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUserRow());
      prisma.gachaLog.count.mockResolvedValue(0);
      prisma.user.delete.mockResolvedValue(undefined);

      const result = await service.remove('u1');

      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
      expect(result).toEqual({ success: true });
    });
  });
});
