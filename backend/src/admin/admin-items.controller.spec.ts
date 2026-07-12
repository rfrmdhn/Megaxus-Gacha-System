import { StreamableFile } from '@nestjs/common';
import { AdminItemsController } from './admin-items.controller';

describe('AdminItemsController', () => {
  let itemsService: any;
  let controller: AdminItemsController;

  beforeEach(() => {
    itemsService = {
      update: jest.fn(),
      remove: jest.fn(),
      uploadImage: jest.fn(),
      removeImage: jest.fn(),
      getImage: jest.fn(),
    };
    controller = new AdminItemsController(itemsService);
  });

  it('delegates update to itemsService', async () => {
    const dto = { name: 'Updated Sword', dropRate: 30 };
    itemsService.update.mockResolvedValue({ id: 'item-1', ...dto });

    const result = await controller.update('item-1', dto);

    expect(itemsService.update).toHaveBeenCalledWith('item-1', dto);
    expect(result.name).toBe('Updated Sword');
  });

  it('delegates remove to itemsService', async () => {
    itemsService.remove.mockResolvedValue(undefined);

    await controller.remove('item-1');

    expect(itemsService.remove).toHaveBeenCalledWith('item-1');
  });

  it('delegates uploadImage to itemsService', async () => {
    const file = { mimetype: 'image/png', buffer: Buffer.from('x') } as any;
    itemsService.uploadImage.mockResolvedValue({
      id: 'item-1',
      imageKey: 'items/item-1-1.png',
    });

    const result = await controller.uploadImage('item-1', file);

    expect(itemsService.uploadImage).toHaveBeenCalledWith('item-1', file);
    expect(result.imageKey).toBe('items/item-1-1.png');
  });

  it('delegates removeImage to itemsService', async () => {
    itemsService.removeImage.mockResolvedValue(undefined);

    await controller.removeImage('item-1');

    expect(itemsService.removeImage).toHaveBeenCalledWith('item-1');
  });

  it('streams the image returned by itemsService', async () => {
    itemsService.getImage.mockResolvedValue({
      stream: {} as any,
      mimeType: 'image/png',
    });

    const result = await controller.getImage('item-1');

    expect(itemsService.getImage).toHaveBeenCalledWith('item-1');
    expect(result).toBeInstanceOf(StreamableFile);
  });
});
