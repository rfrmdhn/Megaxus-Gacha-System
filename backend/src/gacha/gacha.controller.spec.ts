import { GachaController } from './gacha.controller';

describe('GachaController', () => {
  let gachaService: any;
  let controller: GachaController;

  beforeEach(() => {
    gachaService = { pull: jest.fn(), pullBulk: jest.fn() };
    controller = new GachaController(gachaService);
  });

  it('delegates pull to gachaService with user id and event id', async () => {
    const user = { id: 'user-1', email: 'test@test.com', role: 'user' };
    const dto = { eventId: 'evt-1' };
    gachaService.pull.mockResolvedValue({
      item: { id: 'item-1', name: 'Sword', rarity: 'rare' },
      remainingCoins: 490,
    });

    const result = await controller.pull(user as any, dto);

    expect(gachaService.pull).toHaveBeenCalledWith('user-1', 'evt-1');
    expect(result.item.name).toBe('Sword');
    expect(result.remainingCoins).toBe(490);
  });

  it('delegates pullBulk to gachaService with user id, event id, and count', async () => {
    const user = { id: 'user-1', email: 'test@test.com', role: 'user' };
    const dto = { eventId: 'evt-1', count: 10 };
    gachaService.pullBulk.mockResolvedValue({
      items: [{ id: 'item-1', name: 'Sword', rarity: 'rare' }],
      bestRarity: 'rare',
      remainingCoins: 400,
    });

    const result = await controller.pullBulk(user as any, dto);

    expect(gachaService.pullBulk).toHaveBeenCalledWith('user-1', 'evt-1', 10);
    expect(result.bestRarity).toBe('rare');
    expect(result.remainingCoins).toBe(400);
  });
});
