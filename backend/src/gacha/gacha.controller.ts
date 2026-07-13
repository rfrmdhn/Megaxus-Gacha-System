import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { GachaService } from './gacha.service';
import { PullDto } from './dto/pull.dto';
import { PullBulkDto } from './dto/pull-bulk.dto';

// Throttle values are read from env vars at module init time.
// Changing these requires an application restart (decorator values are static).
const GACHA_THROTTLE = {
  default: {
    limit: Number(process.env.GACHA_PULL_THROTTLE_LIMIT ?? 120),
    ttl: Number(process.env.GACHA_PULL_THROTTLE_TTL_MS ?? 60_000),
  },
};

@Controller('gacha')
@UseGuards(JwtAuthGuard)
export class GachaController {
  constructor(private gachaService: GachaService) {}

  @Throttle(GACHA_THROTTLE)
  @Post('pull')
  @HttpCode(200)
  pull(@CurrentUser() user: AuthenticatedUser, @Body() dto: PullDto) {
    return this.gachaService.pull(user.id, dto.eventId);
  }

  @Throttle(GACHA_THROTTLE)
  @Post('pull-bulk')
  @HttpCode(200)
  pullBulk(@CurrentUser() user: AuthenticatedUser, @Body() dto: PullBulkDto) {
    return this.gachaService.pullBulk(user.id, dto.eventId, dto.count);
  }
}
