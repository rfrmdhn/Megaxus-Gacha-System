import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { GachaService } from './gacha.service';
import { PullDto } from './dto/pull.dto';

@Controller('gacha')
@UseGuards(JwtAuthGuard)
export class GachaController {
  constructor(private gachaService: GachaService) {}

  @Post('pull')
  @HttpCode(200)
  pull(@CurrentUser() user: AuthenticatedUser, @Body() dto: PullDto) {
    return this.gachaService.pull(user.id, dto.eventId);
  }
}
