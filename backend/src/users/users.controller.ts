import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { UsersService } from './users.service';
import { HistoryQueryDto } from './dto/history-query.dto';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getProfile(user.id);
  }

  @Get('history')
  getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: HistoryQueryDto,
  ) {
    return this.usersService.getHistory(user.id, query);
  }
}
