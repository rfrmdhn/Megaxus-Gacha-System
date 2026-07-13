import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { CachedGachaItem, GachaCacheService } from './gacha-cache.service';
import { AdminFeedProducer } from '../queue/admin-feed.producer';
import { pickWeightedRandom } from './weighted-random';
import { assertDropRatesEqual100 } from '../admin/drop-rate.util';

@Injectable()
export class GachaService {
  private readonly logger = new Logger(GachaService.name);

  constructor(
    private prisma: PrismaService,
    private gachaCache: GachaCacheService,
    private adminFeed: AdminFeedProducer,
    private systemConfig: SystemConfigService,
  ) {}

  async pull(userId: string, eventId: string) {
    const { event, items } = await this.loadActiveEventWithItems(eventId);
    const pullCost = this.systemConfig.get<number>('PULL_COST');

    const result = await this.prisma.$transaction(async (tx) => {
      await this.deductCoinsOrThrow(tx, userId, pullCost);

      const picked = pickWeightedRandom(items);

      const log = await tx.gachaLog.create({
        data: { userId, eventId, itemId: picked.id, coinsSpent: pullCost },
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
      item: this.toItemResponse(result.log.item),
      remainingCoins: result.user.coins,
    };
  }

  async pullBulk(userId: string, eventId: string, count: number) {
    const maxBulk = this.systemConfig.get<number>('MAX_BULK_PULL');
    if (count > maxBulk) {
      throw new BadRequestException(
        `Cannot pull more than ${maxBulk} items at once`,
      );
    }

    const { event, items } = await this.loadActiveEventWithItems(eventId);
    const pullCost = this.systemConfig.get<number>('PULL_COST');
    const totalCost = pullCost * count;
    const createdAt = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      await this.deductCoinsOrThrow(tx, userId, totalCost);

      const picked = Array.from({ length: count }, () =>
        pickWeightedRandom(items),
      );

      await tx.gachaLog.createMany({
        data: picked.map((item) => ({
          userId,
          eventId,
          itemId: item.id,
          coinsSpent: pullCost,
          createdAt,
        })),
      });

      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { email: true, coins: true },
      });

      return { picked, user };
    });

    const best = result.picked.reduce((rarest, item) =>
      item.dropRate < rarest.dropRate ? item : rarest,
    );
    const worst = result.picked.reduce((commonest, item) =>
      item.dropRate > commonest.dropRate ? item : commonest,
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
      items: result.picked.map((item) => this.toItemResponse(item)),
      bestRarity: best.rarity,
      worstRarity: worst.rarity,
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
    assertDropRatesEqual100(items.map((i) => i.dropRate));

    return { event, items };
  }

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

  private toItemResponse(item: {
    id: string;
    name: string;
    rarity: string;
    imageKey: string | null;
  }) {
    return {
      id: item.id,
      name: item.name,
      rarity: item.rarity,
      imageKey: item.imageKey,
    };
  }

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
