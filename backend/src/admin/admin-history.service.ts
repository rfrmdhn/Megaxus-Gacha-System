import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildCursorArgs, paginate } from '../common/pagination';
import { AdminHistoryQueryDto } from './dto/admin-history-query.dto';

@Injectable()
export class AdminHistoryService {
  constructor(private prisma: PrismaService) {}

  async list(query: AdminHistoryQueryDto) {
    const rows = await this.prisma.gachaLog.findMany({
      where: query.userId ? { userId: query.userId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { item: true, event: true, user: true },
      ...buildCursorArgs(query.cursor, query.limit),
    });

    const { items, nextCursor } = paginate(rows, query.limit);
    return {
      items: items.map((log) => ({
        id: log.id,
        userId: log.userId,
        userEmail: log.user.email,
        eventName: log.event.name,
        itemName: log.item.name,
        rarity: log.item.rarity,
        coinsSpent: log.coinsSpent,
        createdAt: log.createdAt,
      })),
      nextCursor,
    };
  }
}
