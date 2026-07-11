import { AdminFeedProducer } from './admin-feed.producer';

describe('AdminFeedProducer', () => {
  let queue: any;
  let producer: AdminFeedProducer;

  beforeEach(() => {
    queue = { add: jest.fn().mockResolvedValue(undefined) };
    producer = new AdminFeedProducer(queue);
  });

  it('adds a pull job to the queue with correct options', async () => {
    const event = {
      userId: 'u1',
      userEmail: 'test@test.com',
      eventId: 'evt-1',
      eventName: 'Spring Event',
      itemName: 'Sword',
      rarity: 'rare',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    await producer.emitPull(event);

    expect(queue.add).toHaveBeenCalledWith('pull', event, {
      removeOnComplete: true,
      removeOnFail: 100,
    });
  });
});
