import { AdminFeedService } from './admin-feed.service';
import { take } from 'rxjs/operators';

describe('AdminFeedService', () => {
  let service: AdminFeedService;

  beforeEach(() => {
    service = new AdminFeedService();
  });

  it('publishes events that are received by the stream', (done) => {
    const event = {
      userId: 'u1',
      userEmail: 'test@test.com',
      eventId: 'evt-1',
      eventName: 'Spring Event',
      itemName: 'Sword',
      rarity: 'rare',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    service
      .stream()
      .pipe(take(1))
      .subscribe((messageEvent) => {
        expect(messageEvent.type).toBe('pull');
        expect(messageEvent.data).toEqual(event);
        done();
      });

    service.publish(event);
  });

  it('wraps each event with type "pull"', (done) => {
    const event = {
      userId: 'u1',
      userEmail: 'test@test.com',
      eventId: 'evt-1',
      eventName: 'Spring Event',
      itemName: 'Sword',
      rarity: 'rare',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    service
      .stream()
      .pipe(take(1))
      .subscribe((messageEvent) => {
        expect(messageEvent).toHaveProperty('type', 'pull');
        expect(messageEvent).toHaveProperty('data');
        done();
      });

    service.publish(event);
  });

  it('delivers multiple published events in order', (done) => {
    const events = [
      {
        userId: 'u1',
        userEmail: 'a@test.com',
        eventId: 'e1',
        eventName: 'E1',
        itemName: 'I1',
        rarity: 'common',
        createdAt: '2026-01-01',
      },
      {
        userId: 'u2',
        userEmail: 'b@test.com',
        eventId: 'e2',
        eventName: 'E2',
        itemName: 'I2',
        rarity: 'rare',
        createdAt: '2026-01-02',
      },
    ];

    const received: any[] = [];
    service
      .stream()
      .pipe(take(2))
      .subscribe({
        next: (e) => received.push(e),
        complete: () => {
          expect(received).toHaveLength(2);
          expect(received[0].data.userId).toBe('u1');
          expect(received[1].data.userId).toBe('u2');
          done();
        },
      });

    service.publish(events[0]);
    service.publish(events[1]);
  });
});
