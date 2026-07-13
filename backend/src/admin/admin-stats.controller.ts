import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma';
import { AdminStatsService } from './admin-stats.service';
import { RarityBreakdownQueryDto } from './dto/rarity-breakdown-query.dto';

@Controller('admin/stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin)
export class AdminStatsController {
  constructor(private statsService: AdminStatsService) {}

  @Get()
  getStats() {
    return this.statsService.getStats();
  }

  @Get('leaderboard')
  getLeaderboard() {
    return this.statsService.getLeaderboard();
  }

  @Get('rarity')
  getRarityBreakdown(@Query() query: RarityBreakdownQueryDto) {
    return this.statsService.getRarityBreakdown(query.eventId);
  }
}
