import { StreamableFile } from '@nestjs/common';
import { AdminEventsController } from './admin-events.controller';

describe('AdminEventsController', () => {
  let eventsService: any;
  let itemsService: any;
  let controller: AdminEventsController;

  beforeEach(() => {
    eventsService = {
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      uploadImage: jest.fn(),
      removeImage: jest.fn(),
      getImage: jest.fn(),
    };
    itemsService = { create: jest.fn() };
    controller = new AdminEventsController(eventsService, itemsService);
  });

  it('delegates list to eventsService', async () => {
    const events = [{ id: 'evt-1' }];
    eventsService.list.mockResolvedValue(events);

    const result = await controller.list();

    expect(result).toEqual(events);
    expect(eventsService.list).toHaveBeenCalled();
  });

  it('delegates create to eventsService', async () => {
    const dto = { name: 'Event', startsAt: '2026-01-01', endsAt: '2026-02-01' };
    eventsService.create.mockResolvedValue({ id: 'evt-1', ...dto });

    const result = await controller.create(dto);

    expect(eventsService.create).toHaveBeenCalledWith(dto);
    expect(result.id).toBe('evt-1');
  });

  it('delegates update to eventsService', async () => {
    eventsService.update.mockResolvedValue({ id: 'evt-1', name: 'Updated' });

    const result = await controller.update('evt-1', { name: 'Updated' });

    expect(eventsService.update).toHaveBeenCalledWith('evt-1', {
      name: 'Updated',
    });
    expect(result.name).toBe('Updated');
  });

  it('delegates remove to eventsService', async () => {
    eventsService.remove.mockResolvedValue(undefined);

    await controller.remove('evt-1');

    expect(eventsService.remove).toHaveBeenCalledWith('evt-1');
  });

  it('delegates addItem to itemsService', async () => {
    const dto = { name: 'Sword', rarity: 'rare', dropRate: 50 };
    itemsService.create.mockResolvedValue({ id: 'item-1' });

    const result = await controller.addItem('evt-1', dto);

    expect(itemsService.create).toHaveBeenCalledWith('evt-1', dto);
    expect(result.id).toBe('item-1');
  });

  it('delegates uploadImage to eventsService', async () => {
    const file = { buffer: Buffer.from('x'), mimetype: 'image/png' };
    eventsService.uploadImage.mockResolvedValue({ id: 'evt-1' });

    const result = await controller.uploadImage('evt-1', file);

    expect(eventsService.uploadImage).toHaveBeenCalledWith('evt-1', file);
    expect(result.id).toBe('evt-1');
  });

  it('delegates removeImage to eventsService', async () => {
    eventsService.removeImage.mockResolvedValue(undefined);

    await controller.removeImage('evt-1');

    expect(eventsService.removeImage).toHaveBeenCalledWith('evt-1');
  });

  it('streams the event image as a StreamableFile', async () => {
    eventsService.getImage.mockResolvedValue({
      stream: Buffer.from('img'),
      mimeType: 'image/png',
    });

    const result = await controller.getImage('evt-1');

    expect(eventsService.getImage).toHaveBeenCalledWith('evt-1');
    expect(result).toBeInstanceOf(StreamableFile);
  });
});
