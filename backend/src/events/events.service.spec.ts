import { NotFoundException } from '@nestjs/common';
import { EventsService } from './events.service';

function makeEvent(overrides: Partial<any> = {}) {
  return {
    id: 'evt-1',
    name: 'Spring Event',
    isActive: true,
    startsAt: new Date('2026-01-01'),
    endsAt: new Date('2026-02-01'),
    ...overrides,
  };
}

describe('EventsService', () => {
  let prisma: any;
  let gachaCache: any;
  let service: EventsService;

  beforeEach(() => {
    prisma = {
      gachaEvent: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    gachaCache = { getEventItems: jest.fn() };
    service = new EventsService(prisma, gachaCache);
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
        },
        {
          id: 'evt-2',
          name: 'Summer Event',
          startsAt: expect.any(Date),
          endsAt: expect.any(Date),
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
        { id: 'item-1', name: 'Sword', rarity: 'rare', dropRate: 50 },
        { id: 'item-2', name: 'Shield', rarity: 'common', dropRate: 50 },
      ]);

      const result = await service.getById('evt-1');

      expect(result).toEqual({
        id: 'evt-1',
        name: 'Spring Event',
        startsAt: expect.any(Date),
        endsAt: expect.any(Date),
        items: [
          { id: 'item-1', name: 'Sword', rarity: 'rare', dropRate: '50.00' },
          { id: 'item-2', name: 'Shield', rarity: 'common', dropRate: '50.00' },
        ],
      });
      expect(gachaCache.getEventItems).toHaveBeenCalledWith('evt-1');
    });
  });
});
