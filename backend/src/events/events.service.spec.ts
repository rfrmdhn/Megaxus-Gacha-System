import { NotFoundException } from '@nestjs/common';
import { EventsService } from './events.service';

function makeEvent(overrides: Partial<any> = {}) {
  return {
    id: 'evt-1',
    name: 'Spring Event',
    isActive: true,
    startsAt: new Date('2026-01-01'),
    endsAt: new Date('2026-02-01'),
    imageKey: null,
    ...overrides,
  };
}

describe('EventsService', () => {
  let prisma: any;
  let gachaCache: any;
  let storage: any;
  let service: EventsService;

  beforeEach(() => {
    prisma = {
      gachaEvent: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      gachaItem: {
        findUnique: jest.fn(),
      },
    };
    gachaCache = { getEventItems: jest.fn() };
    storage = { getObject: jest.fn() };
    service = new EventsService(prisma, gachaCache, storage);
  });

  describe('listActive', () => {
    it('returns active events mapped to the public DTO shape', async () => {
      const events = [
        makeEvent(),
        makeEvent({ id: 'evt-2', name: 'Summer Event' }),
      ];
      prisma.gachaEvent.findMany.mockResolvedValue(events);

      const result = await service.listActive();

      expect(result).toEqual([
        {
          id: 'evt-1',
          name: 'Spring Event',
          startsAt: expect.any(Date),
          endsAt: expect.any(Date),
          imageKey: null,
        },
        {
          id: 'evt-2',
          name: 'Summer Event',
          startsAt: expect.any(Date),
          endsAt: expect.any(Date),
          imageKey: null,
        },
      ]);
      expect(prisma.gachaEvent.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { startsAt: 'desc' },
      });
    });
  });

  describe('getById', () => {
    it('throws NotFoundException when event does not exist', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(null);

      await expect(service.getById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when event exists but is inactive', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(
        makeEvent({ isActive: false }),
      );

      await expect(service.getById('evt-1')).rejects.toThrow(NotFoundException);
    });

    it('returns event with items for an active event', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(makeEvent());
      gachaCache.getEventItems.mockResolvedValue([
        { id: 'item-1', name: 'Sword', rarity: 'rare', dropRate: 50, imageKey: null },
        {
          id: 'item-2',
          name: 'Shield',
          rarity: 'common',
          dropRate: 50,
          imageKey: 'items/item-2.png',
        },
      ]);

      const result = await service.getById('evt-1');

      expect(result).toEqual({
        id: 'evt-1',
        name: 'Spring Event',
        startsAt: expect.any(Date),
        endsAt: expect.any(Date),
        imageKey: null,
        items: [
          { id: 'item-1', name: 'Sword', rarity: 'rare', dropRate: '50.00', imageKey: null },
          {
            id: 'item-2',
            name: 'Shield',
            rarity: 'common',
            dropRate: '50.00',
            imageKey: 'items/item-2.png',
          },
        ],
      });
      expect(gachaCache.getEventItems).toHaveBeenCalledWith('evt-1');
    });
  });

  describe('getItemImage', () => {
    it('throws NotFoundException when the item has no image', async () => {
      prisma.gachaItem.findUnique.mockResolvedValue({ imageKey: null });

      await expect(service.getItemImage('item-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when the item does not exist', async () => {
      prisma.gachaItem.findUnique.mockResolvedValue(null);

      await expect(service.getItemImage('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the stored object for an item that has an image', async () => {
      prisma.gachaItem.findUnique.mockResolvedValue({
        imageKey: 'items/item-1.png',
      });
      const stored = { stream: {}, mimeType: 'image/png' };
      storage.getObject.mockResolvedValue(stored);

      const result = await service.getItemImage('item-1');

      expect(result).toBe(stored);
      expect(storage.getObject).toHaveBeenCalledWith('items/item-1.png');
    });
  });

  describe('getEventImage', () => {
    it('throws NotFoundException when the event has no image', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue({ imageKey: null });

      await expect(service.getEventImage('evt-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when the event does not exist', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(null);

      await expect(service.getEventImage('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the stored object for an event that has an image', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue({
        imageKey: 'events/evt-1.png',
      });
      const stored = { stream: {}, mimeType: 'image/png' };
      storage.getObject.mockResolvedValue(stored);

      const result = await service.getEventImage('evt-1');

      expect(result).toBe(stored);
      expect(storage.getObject).toHaveBeenCalledWith('events/evt-1.png');
    });
  });
});
