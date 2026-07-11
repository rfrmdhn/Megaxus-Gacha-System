import { AdminItemsController } from './admin-items.controller';

describe('AdminItemsController', () => {
  let itemsService: any;
  let controller: AdminItemsController;

  beforeEach(() => {
    itemsService = {
      update: jest.fn(),
      remove: jest.fn(),
    };
    controller = new AdminItemsController(itemsService);
  });

  it('delegates update to itemsService', async () => {
    const dto = { name: 'Updated Sword', dropRate: 30 };
    itemsService.update.mockResolvedValue({ id: 'item-1', ...dto });

    const result = await controller.update('item-1', dto as any);

    expect(itemsService.update).toHaveBeenCalledWith('item-1', dto);
    expect(result.name).toBe('Updated Sword');
  });

  it('delegates remove to itemsService', async () => {
    itemsService.remove.mockResolvedValue(undefined);

    await controller.remove('item-1');

    expect(itemsService.remove).toHaveBeenCalledWith('item-1');
  });
});
