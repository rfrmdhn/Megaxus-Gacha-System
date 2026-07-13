import { GachaCacheService } from './gacha-cache.service';

describe('GachaCacheService', () => {
  let redis: any;
  let prisma: any;
  let service: GachaCacheService;

  beforeEach(() => {
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    prisma = {
      gachaItem: { findMany: jest.fn() },
    };
    service = new GachaCacheService(redis, prisma);
  });

  describe('getEventItems', () => {
    it('returns cached items when cache hit', async () => {
      const cached = [
        { id: 'item-1', name: 'Sword', rarity: 'rare', dropRate: 50 },
      ];
      redis.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.getEventItems('evt-1');

      expect(result).toEqual(cached);
      expect(redis.get).toHaveBeenCalledWith('event:evt-1:items');
      expect(prisma.gachaItem.findMany).not.toHaveBeenCalled();
    });

    it('fetches from DB and caches on cache miss', async () => {
      redis.get.mockResolvedValue(null);
      const dbItems = [
        { id: 'item-1', name: 'Sword', rarity: 'rare', dropRate: 50, imageKey: null },
        {
          id: 'item-2',
          name: 'Shield',
          rarity: 'common',
          dropRate: 50,
          imageKey: 'items/item-2.png',
        },
      ];
      prisma.gachaItem.findMany.mockResolvedValue(dbItems);

      const result = await service.getEventItems('evt-1');

      expect(result).toEqual([
        { id: 'item-1', name: 'Sword', rarity: 'rare', dropRate: 50, imageKey: null },
        {
          id: 'item-2',
          name: 'Shield',
          rarity: 'common',
          dropRate: 50,
          imageKey: 'items/item-2.png',
        },
      ]);
      expect(prisma.gachaItem.findMany).toHaveBeenCalledWith({
        where: { eventId: 'evt-1' },
        select: {
          id: true,
          name: true,
          rarity: true,
          dropRate: true,
          imageKey: true,
        },
      });
      expect(redis.set).toHaveBeenCalledWith(
        'event:evt-1:items',
        expect.any(String),
      );
    });

    it('converts dropRate from Prisma Decimal to number', async () => {
      redis.get.mockResolvedValue(null);
      prisma.gachaItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          name: 'Sword',
          rarity: 'rare',
          dropRate: { toString: () => '50' },
        },
      ]);

      const result = await service.getEventItems('evt-1');

      expect(result[0].dropRate).toBe(50);
    });
  });

  describe('invalidate', () => {
    it('deletes the cache key', async () => {
      await service.invalidate('evt-1');

      expect(redis.del).toHaveBeenCalledWith('event:evt-1:items');
    });
  });
});
