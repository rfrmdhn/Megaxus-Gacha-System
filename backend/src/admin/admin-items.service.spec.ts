import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminItemsService } from './admin-items.service';

function makeEvent(overrides: Partial<any> = {}) {
  return {
    id: 'evt-1',
    name: 'Spring Event',
    isActive: false,
    ...overrides,
  };
}

function makeItem(overrides: Partial<any> = {}) {
  return {
    id: 'item-1',
    eventId: 'evt-1',
    name: 'Sword',
    rarity: 'rare',
    dropRate: 50,
    ...overrides,
  };
}

describe('AdminItemsService', () => {
  let prisma: any;
  let gachaCache: any;
  let service: AdminItemsService;

  beforeEach(() => {
    prisma = {
      gachaEvent: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      gachaItem: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      gachaLog: { count: jest.fn().mockResolvedValue(0) },
    };
    gachaCache = { invalidate: jest.fn().mockResolvedValue(undefined) };
    service = new AdminItemsService(prisma, gachaCache);
  });

  describe('create', () => {
    it('throws NotFoundException when event does not exist', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(null);

      await expect(
        service.create('missing', { name: 'Sword', rarity: 'rare', dropRate: 50 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('validates drop rates sum to 100 for active events', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(makeEvent({ isActive: true }));
      prisma.gachaItem.findMany.mockResolvedValue([{ dropRate: 60 }]);

      await expect(
        service.create('evt-1', { name: 'Shield', rarity: 'common', dropRate: 50 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('validates drop rates do not exceed 100 for draft events', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(makeEvent({ isActive: false }));
      prisma.gachaItem.findMany.mockResolvedValue([{ dropRate: 80 }]);

      await expect(
        service.create('evt-1', { name: 'Shield', rarity: 'common', dropRate: 30 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates item and invalidates cache for active event with valid rates', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(makeEvent({ isActive: true }));
      prisma.gachaItem.findMany.mockResolvedValue([{ dropRate: 50 }]);
      const created = makeItem({ dropRate: 50 });
      prisma.gachaItem.create.mockResolvedValue(created);

      const result = await service.create('evt-1', {
        name: 'Shield',
        rarity: 'common',
        dropRate: 50,
      });

      expect(prisma.gachaItem.create).toHaveBeenCalledWith({
        data: { eventId: 'evt-1', name: 'Shield', rarity: 'common', dropRate: 50 },
      });
      expect(gachaCache.invalidate).toHaveBeenCalledWith('evt-1');
      expect(result).toEqual(created);
    });

    it('creates item for draft event when rates do not exceed 100', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(makeEvent({ isActive: false }));
      prisma.gachaItem.findMany.mockResolvedValue([{ dropRate: 30 }]);
      prisma.gachaItem.create.mockResolvedValue(makeItem());

      await service.create('evt-1', {
        name: 'Shield',
        rarity: 'common',
        dropRate: 50,
      });

      expect(prisma.gachaItem.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws NotFoundException when item does not exist', async () => {
      prisma.gachaItem.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', {})).rejects.toThrow(NotFoundException);
    });

    it('updates name without drop rate validation when dropRate not provided', async () => {
      prisma.gachaItem.findUnique.mockResolvedValue(makeItem());
      prisma.gachaItem.update.mockResolvedValue(makeItem({ name: 'Updated Sword' }));

      await service.update('item-1', { name: 'Updated Sword' });

      expect(prisma.gachaEvent.findUniqueOrThrow).not.toHaveBeenCalled();
      expect(prisma.gachaItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { name: 'Updated Sword' },
      });
    });

    it('validates drop rates when dropRate is provided for active event', async () => {
      prisma.gachaItem.findUnique.mockResolvedValue(makeItem());
      prisma.gachaEvent.findUniqueOrThrow.mockResolvedValue(makeEvent({ isActive: true }));
      prisma.gachaItem.findMany.mockResolvedValue([{ dropRate: 60 }]);
      prisma.gachaItem.update.mockResolvedValue(makeItem({ dropRate: 40 }));

      await service.update('item-1', { dropRate: 40 });

      expect(prisma.gachaItem.findMany).toHaveBeenCalledWith({
        where: { eventId: 'evt-1', id: { not: 'item-1' } },
        select: { dropRate: true },
      });
    });

    it('throws BadRequestException when updated drop rates exceed 100 for active event', async () => {
      prisma.gachaItem.findUnique.mockResolvedValue(makeItem());
      prisma.gachaEvent.findUniqueOrThrow.mockResolvedValue(makeEvent({ isActive: true }));
      prisma.gachaItem.findMany.mockResolvedValue([{ dropRate: 80 }]);

      await expect(service.update('item-1', { dropRate: 50 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('validates drop rates do not exceed 100 for draft event when dropRate provided', async () => {
      prisma.gachaItem.findUnique.mockResolvedValue(makeItem());
      prisma.gachaEvent.findUniqueOrThrow.mockResolvedValue(makeEvent({ isActive: false }));
      prisma.gachaItem.findMany.mockResolvedValue([{ dropRate: 80 }]);

      await expect(service.update('item-1', { dropRate: 30 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('updates rarity and invalidates cache', async () => {
      prisma.gachaItem.findUnique.mockResolvedValue(makeItem());
      prisma.gachaItem.update.mockResolvedValue(makeItem({ rarity: 'legendary' }));

      await service.update('item-1', { rarity: 'legendary' });

      expect(prisma.gachaItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { rarity: 'legendary' },
      });
      expect(gachaCache.invalidate).toHaveBeenCalledWith('evt-1');
    });

    it('updates multiple fields at once with dropRate validation for draft event', async () => {
      prisma.gachaItem.findUnique.mockResolvedValue(makeItem());
      prisma.gachaEvent.findUniqueOrThrow.mockResolvedValue(makeEvent({ isActive: false }));
      prisma.gachaItem.findMany.mockResolvedValue([{ dropRate: 30 }]);
      prisma.gachaItem.update.mockResolvedValue(makeItem());

      await service.update('item-1', { name: 'New Name', rarity: 'epic', dropRate: 25 });

      expect(prisma.gachaItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { name: 'New Name', rarity: 'epic', dropRate: 25 },
      });
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when item does not exist', async () => {
      prisma.gachaItem.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('deletes item and invalidates cache when it has no pull history', async () => {
      prisma.gachaItem.findUnique.mockResolvedValue(makeItem());
      prisma.gachaLog.count.mockResolvedValue(0);
      prisma.gachaItem.delete.mockResolvedValue(undefined);

      await service.remove('item-1');

      expect(prisma.gachaLog.count).toHaveBeenCalledWith({ where: { itemId: 'item-1' } });
      expect(prisma.gachaItem.delete).toHaveBeenCalledWith({ where: { id: 'item-1' } });
      expect(gachaCache.invalidate).toHaveBeenCalledWith('evt-1');
    });

    it('throws BadRequestException when the item has existing pull history', async () => {
      prisma.gachaItem.findUnique.mockResolvedValue(makeItem());
      prisma.gachaLog.count.mockResolvedValue(2);

      await expect(service.remove('item-1')).rejects.toThrow(BadRequestException);
      expect(prisma.gachaItem.delete).not.toHaveBeenCalled();
    });
  });
});
