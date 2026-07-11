import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildCursorArgs, paginate } from '../common/pagination';
import { HistoryQueryDto } from './dto/history-query.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return { id: user.id, email: user.email, coins: user.coins };
  }

  async getHistory(userId: string, query: HistoryQueryDto) {
    const rows = await this.prisma.gachaLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        item: { select: { name: true, rarity: true } },
        event: { select: { name: true } },
      },
      ...buildCursorArgs(query.cursor, query.limit),
    });

    const { items, nextCursor } = paginate(rows, query.limit);
    return {
      items: items.map((log) => ({
        id: log.id,
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
