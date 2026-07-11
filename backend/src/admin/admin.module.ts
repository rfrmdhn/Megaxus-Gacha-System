import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GachaModule } from '../gacha/gacha.module';
import { QueueModule } from '../queue/queue.module';
import { AdminEventsService } from './admin-events.service';
import { AdminItemsService } from './admin-items.service';
import { AdminHistoryService } from './admin-history.service';
import { AdminEventsController } from './admin-events.controller';
import { AdminItemsController } from './admin-items.controller';
import { AdminHistoryController } from './admin-history.controller';

@Module({
  imports: [AuthModule, GachaModule, QueueModule],
  controllers: [AdminEventsController, AdminItemsController, AdminHistoryController],
  providers: [AdminEventsService, AdminItemsService, AdminHistoryService],
})
export class AdminModule {}
