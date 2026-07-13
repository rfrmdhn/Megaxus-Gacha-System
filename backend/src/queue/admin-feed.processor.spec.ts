import { AdminFeedProcessor } from './admin-feed.processor';

describe('AdminFeedProcessor', () => {
  let adminFeedService: any;
  let processor: AdminFeedProcessor;

  beforeEach(() => {
    adminFeedService = { publish: jest.fn() };
    processor = new AdminFeedProcessor(adminFeedService);
  });

  it('publishes job data to adminFeedService', async () => {
    const event = {
      userId: 'u1',
      userEmail: 'test@test.com',
      eventId: 'evt-1',
      eventName: 'Spring Event',
      itemName: 'Sword',
      rarity: 'rare',
      createdAt: '2026-01-01',
    };
    const job = { data: event } as any;

    await processor.process(job);

    expect(adminFeedService.publish).toHaveBeenCalledWith(event);
  });
});
