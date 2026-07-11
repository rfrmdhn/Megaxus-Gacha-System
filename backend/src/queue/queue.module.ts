import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ADMIN_FEED_QUEUE } from './queue.constants';
import { AdminFeedProducer } from './admin-feed.producer';
import { AdminFeedProcessor } from './admin-feed.processor';
import { AdminFeedService } from './admin-feed.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: ADMIN_FEED_QUEUE }),
  ],
  providers: [AdminFeedProducer, AdminFeedProcessor, AdminFeedService],
  exports: [AdminFeedProducer, AdminFeedService],
})
export class QueueModule {}
