import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CachedGachaItem, GachaCacheService } from './gacha-cache.service';
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
    const { event, items } = await this.loadActiveEventWithItems(eventId);

    const result = await this.prisma.$transaction(async (tx) => {
      await this.deductCoinsOrThrow(tx, userId, PULL_COST);

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

    await this.emitPull({
      userId,
      userEmail: result.user.email,
      eventId,
      eventName: event.name,
      itemName: result.log.item.name,
      rarity: result.log.item.rarity,
      createdAt: result.log.createdAt.toISOString(),
    });

    return {
      item: {
        id: result.log.item.id,
        name: result.log.item.name,
        rarity: result.log.item.rarity,
      },
      remainingCoins: result.user.coins,
    };
  }

  async pullBulk(userId: string, eventId: string, count: number) {
    const { event, items } = await this.loadActiveEventWithItems(eventId);
    const totalCost = PULL_COST * count;
    // One timestamp shared by every log row and every feed event, so the DB
    // record and the admin feed agree on when the bulk pull happened.
    const createdAt = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // All-or-nothing: the whole batch is charged up front in one guarded
      // deduction. Either the user can afford all `count` pulls or none happen.
      await this.deductCoinsOrThrow(tx, userId, totalCost);

      const picked = Array.from({ length: count }, () =>
        pickWeightedRandom(items),
      );

      await tx.gachaLog.createMany({
        data: picked.map((item) => ({
          userId,
          eventId,
          itemId: item.id,
          coinsSpent: PULL_COST,
          createdAt,
        })),
      });

      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { email: true, coins: true },
      });

      return { picked, user };
    });

    // Best pull is decided on the server by drop rate (rarest = lowest
    // dropRate) so the client never has to interpret free-form rarity labels.
    const best = result.picked.reduce((rarest, item) =>
      item.dropRate < rarest.dropRate ? item : rarest,
    );

    await Promise.all(
      result.picked.map((item) =>
        this.emitPull({
          userId,
          userEmail: result.user.email,
          eventId,
          eventName: event.name,
          itemName: item.name,
          rarity: item.rarity,
          createdAt: createdAt.toISOString(),
        }),
      ),
    );

    return {
      items: result.picked.map((item) => ({
        id: item.id,
        name: item.name,
        rarity: item.rarity,
      })),
      bestRarity: best.rarity,
      remainingCoins: result.user.coins,
    };
  }

  private async loadActiveEventWithItems(eventId: string): Promise<{
    event: { name: string };
    items: CachedGachaItem[];
  }> {
    const event = await this.prisma.gachaEvent.findUnique({
      where: { id: eventId },
    });
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

    return { event, items };
  }

  // Atomic check-and-deduct: the WHERE clause folds the balance check and the
  // deduction into one statement, closing the race window entirely. See
  // docs/adr.md ADR-002 — do not split this into a read + separate update.
  private async deductCoinsOrThrow(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: number,
  ): Promise<void> {
    const deducted = await tx.user.updateMany({
      where: { id: userId, coins: { gte: amount } },
      data: { coins: { decrement: amount } },
    });
    if (deducted.count === 0) {
      throw new BadRequestException('Insufficient coins');
    }
  }

  // Best-effort real-time notification. Called only after COMMIT, so the pull is
  // already durable — a queue/Redis failure here must never fail the pull.
  private async emitPull(event: {
    userId: string;
    userEmail: string;
    eventId: string;
    eventName: string;
    itemName: string;
    rarity: string;
    createdAt: string;
  }): Promise<void> {
    try {
      await this.adminFeed.emitPull(event);
    } catch (err) {
      this.logger.error(
        'Failed to emit admin feed event for a completed pull',
        err as Error,
      );
    }
  }
}
