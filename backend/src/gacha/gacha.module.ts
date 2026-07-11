import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { GachaService } from './gacha.service';
import { GachaController } from './gacha.controller';
import { GachaCacheService } from './gacha-cache.service';

@Module({
  imports: [QueueModule],
  controllers: [GachaController],
  providers: [GachaService, GachaCacheService],
  exports: [GachaCacheService],
})
export class GachaModule {}
