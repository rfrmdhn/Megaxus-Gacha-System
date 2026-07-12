import { Module } from '@nestjs/common';
import { GachaModule } from '../gacha/gacha.module';
import { StorageModule } from '../storage/storage.module';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';

@Module({
  imports: [GachaModule, StorageModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
