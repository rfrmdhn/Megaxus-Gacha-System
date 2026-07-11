import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GachaCacheService } from './gacha-cache.service';
import { AdminFeedProducer } from '../queue/admin-feed.producer';
import { pickWeightedRandom } from './weighted-random';
import { PULL_COST } from './gacha.constants';
import { assertDropRatesEqual100 } from '../admin/drop-rate.util';

@Injectable()
export class GachaService {
  private readonly logger = new Logger(GachaService.name);

  constructor(
    private prisma: PrismaService,
    private gachaCache: GachaCacheService,
    private adminFeed: AdminFeedProducer,
  ) {}

  async pull(userId: string, eventId: string) {
    const event = await this.prisma.gachaEvent.findUnique({ where: { id: eventId } });
    if (!event || !event.isActive) {
      throw new NotFoundException('Gacha event not found or inactive');
    }

    const items = await this.gachaCache.getEventItems(eventId);
    if (items.length === 0) {
      throw new BadRequestException('This event has no configured items');
    }
    // Defense-in-depth: an active event's items must sum to exactly 100%.
    // Activation already enforces this, but a later item edit could break it.
    assertDropRatesEqual100(items.map((i) => i.dropRate));

    const result = await this.prisma.$transaction(async (tx) => {
      // Atomic check-and-deduct: the WHERE clause folds the balance check and
      // the deduction into one statement, closing the race window entirely.
      const deducted = await tx.user.updateMany({
        where: { id: userId, coins: { gte: PULL_COST } },
        data: { coins: { decrement: PULL_COST } },
      });
      if (deducted.count === 0) {
        throw new BadRequestException('Insufficient coins');
      }

      const picked = pickWeightedRandom(items);

      const log = await tx.gachaLog.create({
        data: { userId, eventId, itemId: picked.id, coinsSpent: PULL_COST },
        include: { item: true },
      });

      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { email: true, coins: true },
      });

      return { log, user };
    });

    // Only after COMMIT succeeds: notify the real-time admin feed. The pull
    // itself is already durable at this point, so a queue/Redis failure here
    // must not surface as a failed pull to the client.
    try {
      await this.adminFeed.emitPull({
        userId,
        userEmail: result.user.email,
        eventId,
        eventName: event.name,
        itemName: result.log.item.name,
        rarity: result.log.item.rarity,
        createdAt: result.log.createdAt.toISOString(),
      });
    } catch (err) {
      this.logger.error('Failed to emit admin feed event for a completed pull', err as Error);
    }

    return {
      item: {
        id: result.log.item.id,
        name: result.log.item.name,
        rarity: result.log.item.rarity,
      },
      remainingCoins: result.user.coins,
    };
  }
}
