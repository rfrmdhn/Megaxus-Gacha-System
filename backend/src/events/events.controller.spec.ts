import { StreamableFile } from '@nestjs/common';
import { EventsController } from './events.controller';

describe('EventsController', () => {
  let eventsService: any;
  let controller: EventsController;

  beforeEach(() => {
    eventsService = {
      listActive: jest.fn(),
      getById: jest.fn(),
      getItemImage: jest.fn(),
      getEventImage: jest.fn(),
    };
    controller = new EventsController(eventsService);
  });

  it('delegates list to eventsService.listActive', async () => {
    const events = [{ id: 'evt-1', name: 'Spring Event' }];
    eventsService.listActive.mockResolvedValue(events);

    const result = await controller.list();

    expect(result).toEqual(events);
    expect(eventsService.listActive).toHaveBeenCalled();
  });

  it('delegates getById to eventsService.getById', async () => {
    const event = { id: 'evt-1', name: 'Spring Event', items: [] };
    eventsService.getById.mockResolvedValue(event);

    const result = await controller.getById('evt-1');

    expect(result).toEqual(event);
    expect(eventsService.getById).toHaveBeenCalledWith('evt-1');
  });

  it('streams item image bytes from eventsService.getItemImage', async () => {
    const stream = { pipe: jest.fn() };
    eventsService.getItemImage.mockResolvedValue({
      stream,
      mimeType: 'image/png',
    });

    const result = await controller.getItemImage('item-1');

    expect(eventsService.getItemImage).toHaveBeenCalledWith('item-1');
    expect(result).toBeInstanceOf(StreamableFile);
  });

  it('streams event image bytes from eventsService.getEventImage', async () => {
    const stream = { pipe: jest.fn() };
    eventsService.getEventImage.mockResolvedValue({
      stream,
      mimeType: 'image/png',
    });

    const result = await controller.getEventImage('evt-1');

    expect(eventsService.getEventImage).toHaveBeenCalledWith('evt-1');
    expect(result).toBeInstanceOf(StreamableFile);
  });
});
