import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ADMIN_FEED_QUEUE } from './queue.constants';
import { AdminFeedService, PullEvent } from './admin-feed.service';

@Processor(ADMIN_FEED_QUEUE)
export class AdminFeedProcessor extends WorkerHost {
  constructor(private adminFeedService: AdminFeedService) {
    super();
  }

  async process(job: Job<PullEvent>): Promise<void> {
    this.adminFeedService.publish(job.data);
  }
}
