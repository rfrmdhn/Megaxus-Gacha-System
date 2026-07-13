import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ADMIN_FEED_QUEUE, ADMIN_FEED_RATE_LIMIT } from './queue.constants';
import { AdminFeedService, PullEvent } from './admin-feed.service';

// Rate-limited: BullMQ holds any events past ADMIN_FEED_RATE_LIMIT in the
// queue and releases them once the window rolls over, instead of publishing
// every event to the SSE stream the instant it's enqueued.
@Processor(ADMIN_FEED_QUEUE, { limiter: ADMIN_FEED_RATE_LIMIT })
export class AdminFeedProcessor extends WorkerHost {
  constructor(private adminFeedService: AdminFeedService) {
    super();
  }

  async process(job: Job<PullEvent>): Promise<void> {
    this.adminFeedService.publish(job.data);
  }
}
