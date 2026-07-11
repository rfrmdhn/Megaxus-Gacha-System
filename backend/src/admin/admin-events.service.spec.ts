import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminEventsService } from './admin-events.service';

function makeEvent(overrides: Partial<any> = {}) {
  return {
    id: 'evt-1',
    name: 'Spring Event',
    isActive: false,
    startsAt: new Date('2026-01-01'),
    endsAt: new Date('2026-02-01'),
    createdAt: new Date('2026-01-01'),
    items: [],
    ...overrides,
  };
}

describe('AdminEventsService', () => {
  let prisma: any;
  let gachaCache: any;
  let service: AdminEventsService;

  beforeEach(() => {
    prisma = {
      gachaEvent: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      gachaItem: { findMany: jest.fn() },
    };
    gachaCache = { invalidate: jest.fn().mockResolvedValue(undefined) };
    service = new AdminEventsService(prisma, gachaCache);
  });

  describe('list', () => {
    it('returns all events ordered by createdAt desc with items', async () => {
      const events = [makeEvent(), makeEvent({ id: 'evt-2' })];
      prisma.gachaEvent.findMany.mockResolvedValue(events);

      const result = await service.list();

      expect(result).toEqual(events);
      expect(prisma.gachaEvent.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      });
    });
  });

  describe('create', () => {
    it('creates an event with parsed dates', async () => {
      const created = makeEvent();
      prisma.gachaEvent.create.mockResolvedValue(created);

      const result = await service.create({
        name: 'Spring Event',
        startsAt: '2026-01-01T00:00:00.000Z',
        endsAt: '2026-02-01T00:00:00.000Z',
      });

      expect(prisma.gachaEvent.create).toHaveBeenCalledWith({
        data: {
          name: 'Spring Event',
          startsAt: expect.any(Date),
          endsAt: expect.any(Date),
        },
      });
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when event does not exist', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', {})).rejects.toThrow(NotFoundException);
    });

    it('updates name only when only name is provided', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(makeEvent());
      prisma.gachaEvent.update.mockResolvedValue(makeEvent({ name: 'New Name' }));

      const result = await service.update('evt-1', { name: 'New Name' });

      expect(prisma.gachaEvent.update).toHaveBeenCalledWith({
        where: { id: 'evt-1' },
        data: { name: 'New Name' },
      });
      expect(result.name).toBe('New Name');
    });

    it('validates drop rates when activating a draft event', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(makeEvent({ isActive: false }));
      prisma.gachaItem.findMany.mockResolvedValue([{ dropRate: 60 }, { dropRate: 40 }]);
      prisma.gachaEvent.update.mockResolvedValue(makeEvent({ isActive: true }));

      await service.update('evt-1', { isActive: true });

      expect(prisma.gachaItem.findMany).toHaveBeenCalledWith({
        where: { eventId: 'evt-1' },
        select: { dropRate: true },
      });
      expect(prisma.gachaEvent.update).toHaveBeenCalled();
    });

    it('throws BadRequestException when activating with invalid drop rates', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(makeEvent({ isActive: false }));
      prisma.gachaItem.findMany.mockResolvedValue([{ dropRate: 50 }]);

      await expect(service.update('evt-1', { isActive: true })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('does not re-validate drop rates when event is already active', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(makeEvent({ isActive: true }));
      prisma.gachaEvent.update.mockResolvedValue(makeEvent({ isActive: true }));

      await service.update('evt-1', { isActive: true });

      expect(prisma.gachaItem.findMany).not.toHaveBeenCalled();
    });

    it('does not re-validate drop rates when not changing isActive', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(makeEvent({ isActive: false }));
      prisma.gachaEvent.update.mockResolvedValue(makeEvent());

      await service.update('evt-1', { name: 'Updated' });

      expect(prisma.gachaItem.findMany).not.toHaveBeenCalled();
    });

    it('invalidates cache when isActive is changed', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(makeEvent({ isActive: false }));
      prisma.gachaItem.findMany.mockResolvedValue([{ dropRate: 100 }]);
      prisma.gachaEvent.update.mockResolvedValue(makeEvent({ isActive: true }));

      await service.update('evt-1', { isActive: true });

      expect(gachaCache.invalidate).toHaveBeenCalledWith('evt-1');
    });

    it('does not invalidate cache when isActive is not changed', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(makeEvent());
      prisma.gachaEvent.update.mockResolvedValue(makeEvent());

      await service.update('evt-1', { name: 'Updated' });

      expect(gachaCache.invalidate).not.toHaveBeenCalled();
    });

    it('updates startsAt and endsAt with parsed dates', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(makeEvent());
      prisma.gachaEvent.update.mockResolvedValue(makeEvent());

      await service.update('evt-1', {
        startsAt: '2026-03-01T00:00:00.000Z',
        endsAt: '2026-04-01T00:00:00.000Z',
      });

      expect(prisma.gachaEvent.update).toHaveBeenCalledWith({
        where: { id: 'evt-1' },
        data: {
          startsAt: expect.any(Date),
          endsAt: expect.any(Date),
        },
      });
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when event does not exist', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('deletes the event when it exists', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(makeEvent());
      prisma.gachaEvent.delete.mockResolvedValue(undefined);

      await service.remove('evt-1');

      expect(prisma.gachaEvent.delete).toHaveBeenCalledWith({ where: { id: 'evt-1' } });
    });
  });
});
