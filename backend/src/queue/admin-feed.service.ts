import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';

export interface PullEvent {
  userId: string;
  userEmail: string;
  eventId: string;
  eventName: string;
  itemName: string;
  rarity: string;
  createdAt: string;
}

/**
 * In-process pub/sub fed by the BullMQ worker, consumed by the admin SSE
 * endpoint. Scoped to a single backend instance — see docs/architecture.md
 * for the noted scale-out path (Redis pub/sub fan-out) if running >1 instance.
 */
@Injectable()
export class AdminFeedService {
  private subject = new Subject<PullEvent>();

  publish(event: PullEvent) {
    this.subject.next(event);
  }

  stream(): Observable<MessageEvent> {
    return this.subject
      .asObservable()
      .pipe(map((event) => ({ data: event, type: 'pull' })));
  }
}
