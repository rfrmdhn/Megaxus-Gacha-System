import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GachaService } from './gacha.service';

const EVENT_ID = 'event-1';
const USER_ID = 'user-1';

function makeEvent(overrides: Partial<any> = {}) {
  return { id: EVENT_ID, name: 'Spring Event', isActive: true, ...overrides };
}

function makeItem(overrides: Partial<any> = {}) {
  return {
    id: 'item-1',
    name: 'Sword',
    rarity: 'rare',
    dropRate: 100,
    ...overrides,
  };
}

function makeTx(overrides: Partial<any> = {}) {
  return {
    user: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValue({ email: 'user@test.com', coins: 490 }),
    },
    gachaLog: {
      create: jest.fn().mockResolvedValue({
        id: 'log-1',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        item: makeItem(),
      }),
    },
    ...overrides,
  };
}

describe('GachaService', () => {
  let prisma: any;
  let gachaCache: any;
  let adminFeed: any;
  let service: GachaService;

  beforeEach(() => {
    prisma = {
      gachaEvent: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    gachaCache = { getEventItems: jest.fn() };
    adminFeed = { emitPull: jest.fn().mockResolvedValue(undefined) };
    service = new GachaService(prisma, gachaCache, adminFeed);
  });

  it('throws NotFoundException when the event does not exist', async () => {
    prisma.gachaEvent.findUnique.mockResolvedValue(null);

    await expect(service.pull(USER_ID, EVENT_ID)).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the event is not active', async () => {
    prisma.gachaEvent.findUnique.mockResolvedValue(
      makeEvent({ isActive: false }),
    );

    await expect(service.pull(USER_ID, EVENT_ID)).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when the event has no configured items', async () => {
    prisma.gachaEvent.findUnique.mockResolvedValue(makeEvent());
    gachaCache.getEventItems.mockResolvedValue([]);

    await expect(service.pull(USER_ID, EVENT_ID)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when drop rates do not sum to 100 (defense-in-depth)', async () => {
    prisma.gachaEvent.findUnique.mockResolvedValue(makeEvent());
    gachaCache.getEventItems.mockResolvedValue([makeItem({ dropRate: 40 })]);

    await expect(service.pull(USER_ID, EVENT_ID)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when the user has insufficient coins', async () => {
    prisma.gachaEvent.findUnique.mockResolvedValue(makeEvent());
    gachaCache.getEventItems.mockResolvedValue([makeItem()]);
    const tx = makeTx({
      user: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUniqueOrThrow: jest.fn(),
      },
    });
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await expect(service.pull(USER_ID, EVENT_ID)).rejects.toThrow(
      'Insufficient coins',
    );
    expect(tx.user.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('deducts coins atomically, logs the pull, and emits an admin feed event on success', async () => {
    prisma.gachaEvent.findUnique.mockResolvedValue(makeEvent());
    gachaCache.getEventItems.mockResolvedValue([makeItem()]);
    const tx = makeTx();
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    const result = await service.pull(USER_ID, EVENT_ID);

    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: USER_ID, coins: { gte: 10 } },
      data: { coins: { decrement: 10 } },
    });
    expect(adminFeed.emitPull).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        eventId: EVENT_ID,
        itemName: 'Sword',
      }),
    );
    expect(result).toEqual({
      item: { id: 'item-1', name: 'Sword', rarity: 'rare' },
      remainingCoins: 490,
    });
  });

  it('still returns a successful result when the admin feed emit fails', async () => {
    prisma.gachaEvent.findUnique.mockResolvedValue(makeEvent());
    gachaCache.getEventItems.mockResolvedValue([makeItem()]);
    const tx = makeTx();
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));
    adminFeed.emitPull.mockRejectedValue(new Error('redis down'));

    const result = await service.pull(USER_ID, EVENT_ID);

    expect(result.remainingCoins).toBe(490);
  });
});
