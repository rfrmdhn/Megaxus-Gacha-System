import { Module } from '@nestjs/common';
import { GachaModule } from '../gacha/gacha.module';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';

@Module({
  imports: [GachaModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
