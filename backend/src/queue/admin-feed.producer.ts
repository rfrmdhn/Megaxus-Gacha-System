import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ADMIN_FEED_QUEUE } from './queue.constants';
import { PullEvent } from './admin-feed.service';

@Injectable()
export class AdminFeedProducer {
  constructor(@InjectQueue(ADMIN_FEED_QUEUE) private queue: Queue<PullEvent>) {}

  async emitPull(event: PullEvent) {
    await this.queue.add('pull', event, {
      removeOnComplete: true,
      removeOnFail: 100,
    });
  }
}
