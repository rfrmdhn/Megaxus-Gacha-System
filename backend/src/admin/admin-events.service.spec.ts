import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminEventsService } from './admin-events.service';

function makeEvent(overrides: Partial<any> = {}) {
  return {
    id: 'evt-1',
    name: 'Spring Event',
    isActive: false,
    startsAt: new Date('2026-01-01'),
    endsAt: new Date('2026-02-01'),
    imageKey: null,
    createdAt: new Date('2026-01-01'),
    items: [],
    ...overrides,
  };
}

describe('AdminEventsService', () => {
  let prisma: any;
  let gachaCache: any;
  let storage: any;
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
      gachaLog: { count: jest.fn().mockResolvedValue(0) },
    };
    gachaCache = { invalidate: jest.fn().mockResolvedValue(undefined) };
    storage = {
      upload: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      getObject: jest.fn(),
    };
    service = new AdminEventsService(prisma, gachaCache, storage);
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

    it('throws BadRequestException when endsAt is not after startsAt', () => {
      expect(() =>
        service.create({
          name: 'Spring Event',
          startsAt: '2026-02-01T00:00:00.000Z',
          endsAt: '2026-01-01T00:00:00.000Z',
        }),
      ).toThrow(BadRequestException);
      expect(prisma.gachaEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws NotFoundException when event does not exist', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('updates name only when only name is provided', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(makeEvent());
      prisma.gachaEvent.update.mockResolvedValue(
        makeEvent({ name: 'New Name' }),
      );

      const result = await service.update('evt-1', { name: 'New Name' });

      expect(prisma.gachaEvent.update).toHaveBeenCalledWith({
        where: { id: 'evt-1' },
        data: { name: 'New Name' },
      });
      expect(result.name).toBe('New Name');
    });

    it('validates drop rates when activating a draft event', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(
        makeEvent({ isActive: false }),
      );
      prisma.gachaItem.findMany.mockResolvedValue([
        { dropRate: 60 },
        { dropRate: 40 },
      ]);
      prisma.gachaEvent.update.mockResolvedValue(makeEvent({ isActive: true }));

      await service.update('evt-1', { isActive: true });

      expect(prisma.gachaItem.findMany).toHaveBeenCalledWith({
        where: { eventId: 'evt-1' },
        select: { dropRate: true },
      });
      expect(prisma.gachaEvent.update).toHaveBeenCalled();
    });

    it('throws BadRequestException when activating with invalid drop rates', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(
        makeEvent({ isActive: false }),
      );
      prisma.gachaItem.findMany.mockResolvedValue([{ dropRate: 50 }]);

      await expect(service.update('evt-1', { isActive: true })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('does not re-validate drop rates when event is already active', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(
        makeEvent({ isActive: true }),
      );
      prisma.gachaEvent.update.mockResolvedValue(makeEvent({ isActive: true }));

      await service.update('evt-1', { isActive: true });

      expect(prisma.gachaItem.findMany).not.toHaveBeenCalled();
    });

    it('does not re-validate drop rates when not changing isActive', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(
        makeEvent({ isActive: false }),
      );
      prisma.gachaEvent.update.mockResolvedValue(makeEvent());

      await service.update('evt-1', { name: 'Updated' });

      expect(prisma.gachaItem.findMany).not.toHaveBeenCalled();
    });

    it('invalidates cache when isActive is changed', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(
        makeEvent({ isActive: false }),
      );
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

    it('throws BadRequestException when the updated range is invalid against the existing endsAt', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(makeEvent());

      await expect(
        service.update('evt-1', { startsAt: '2026-03-01T00:00:00.000Z' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.gachaEvent.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the updated range is invalid against the existing startsAt', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(makeEvent());

      await expect(
        service.update('evt-1', { endsAt: '2025-12-01T00:00:00.000Z' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.gachaEvent.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when event does not exist', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deletes the event when it exists and has no pull history', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(makeEvent());
      prisma.gachaLog.count.mockResolvedValue(0);
      prisma.gachaEvent.delete.mockResolvedValue(undefined);

      await service.remove('evt-1');

      expect(prisma.gachaLog.count).toHaveBeenCalledWith({
        where: { eventId: 'evt-1' },
      });
      expect(prisma.gachaEvent.delete).toHaveBeenCalledWith({
        where: { id: 'evt-1' },
      });
    });

    it('throws BadRequestException when the event has existing pull history', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(makeEvent());
      prisma.gachaLog.count.mockResolvedValue(3);

      await expect(service.remove('evt-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.gachaEvent.delete).not.toHaveBeenCalled();
    });
  });

  describe('uploadImage', () => {
    const file = { buffer: Buffer.from('x'), mimetype: 'image/png' };

    it('throws NotFoundException when event does not exist', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(null);

      await expect(service.uploadImage('missing', file)).rejects.toThrow(
        NotFoundException,
      );
      expect(storage.upload).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for an unsupported mime type', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(makeEvent());

      await expect(
        service.uploadImage('evt-1', {
          buffer: Buffer.from('x'),
          mimetype: 'image/gif',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(storage.upload).not.toHaveBeenCalled();
    });

    it('uploads and stores the key when the event has no prior image', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(
        makeEvent({ imageKey: null }),
      );
      prisma.gachaEvent.update.mockResolvedValue(makeEvent());

      await service.uploadImage('evt-1', file);

      expect(storage.upload).toHaveBeenCalledWith(
        expect.stringContaining('events/evt-1-'),
        file.buffer,
        'image/png',
      );
      expect(storage.remove).not.toHaveBeenCalled();
      expect(prisma.gachaEvent.update).toHaveBeenCalledWith({
        where: { id: 'evt-1' },
        data: { imageKey: expect.stringContaining('events/evt-1-') },
      });
    });

    it('removes the previous image when replacing an existing one', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(
        makeEvent({ imageKey: 'events/evt-1-old.png' }),
      );
      prisma.gachaEvent.update.mockResolvedValue(makeEvent());

      await service.uploadImage('evt-1', file);

      expect(storage.remove).toHaveBeenCalledWith('events/evt-1-old.png');
    });
  });

  describe('removeImage', () => {
    it('does nothing when the event has no image', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(
        makeEvent({ imageKey: null }),
      );

      await service.removeImage('evt-1');

      expect(storage.remove).not.toHaveBeenCalled();
      expect(prisma.gachaEvent.update).not.toHaveBeenCalled();
    });

    it('removes the object and clears the key when an image exists', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(
        makeEvent({ imageKey: 'events/evt-1.png' }),
      );
      prisma.gachaEvent.update.mockResolvedValue(makeEvent());

      await service.removeImage('evt-1');

      expect(storage.remove).toHaveBeenCalledWith('events/evt-1.png');
      expect(prisma.gachaEvent.update).toHaveBeenCalledWith({
        where: { id: 'evt-1' },
        data: { imageKey: null },
      });
    });
  });

  describe('getImage', () => {
    it('throws NotFoundException when the event has no image', async () => {
      prisma.gachaEvent.findUnique.mockResolvedValue(
        makeEvent({ imageKey: null }),
      );

      await expect(service.getImage('evt-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the stored object when an image exists', async () => {
      const stored = { stream: {}, mimeType: 'image/png' };
      prisma.gachaEvent.findUnique.mockResolvedValue(
        makeEvent({ imageKey: 'events/evt-1.png' }),
      );
      storage.getObject.mockResolvedValue(stored);

      const result = await service.getImage('evt-1');

      expect(storage.getObject).toHaveBeenCalledWith('events/evt-1.png');
      expect(result).toBe(stored);
    });
  });
});
