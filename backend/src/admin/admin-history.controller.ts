import {
  Controller,
  Get,
  MessageEvent,
  Query,
  Sse,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Role } from '../../generated/prisma';
import { AdminHistoryService } from './admin-history.service';
import { AdminFeedService } from '../queue/admin-feed.service';
import { AdminHistoryQueryDto } from './dto/admin-history-query.dto';
import { PrismaService } from '../prisma/prisma.service';

// Class-level guards match every other admin controller, so any new route added
// here is admin-protected by default. The SSE stream is the one deliberate
// exception, opted out via @Public() because it authenticates by query param.
@Controller('admin/history')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin)
export class AdminHistoryController {
  constructor(
    private historyService: AdminHistoryService,
    private adminFeed: AdminFeedService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  @Get()
  list(@Query() query: AdminHistoryQueryDto) {
    return this.historyService.list(query);
  }

  // Native browser EventSource cannot set an Authorization header, so the
  // token is passed as a query param here and verified manually rather than
  // via the standard Bearer-header JwtAuthGuard. Role/ban status is re-read
  // from the DB (not trusted from the token payload) so a demotion or ban
  // takes effect immediately, matching JwtStrategy.validate's behavior.
  @Public()
  @Sse('stream')
  async stream(
    @Query('token') token: string,
  ): Promise<Observable<MessageEvent>> {
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or missing token');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { role: true, isBanned: true },
    });
    if (!user || user.isBanned || user.role !== Role.admin) {
      throw new UnauthorizedException('Admin role required');
    }
    return this.adminFeed.stream();
  }
}
