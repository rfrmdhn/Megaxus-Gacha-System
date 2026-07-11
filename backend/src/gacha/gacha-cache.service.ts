import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { PrismaService } from '../prisma/prisma.service';

export interface CachedGachaItem {
  id: string;
  name: string;
  rarity: string;
  dropRate: number;
}

function cacheKey(eventId: string) {
  return `event:${eventId}:items`;
}

/**
 * Cache-aside for an event's items/drop-rates. Invalidated (deleted) on admin
 * write, never updated in place, so there is only one code path (this read)
 * responsible for the cached shape. See docs/architecture.md.
 */
@Injectable()
export class GachaCacheService {
  constructor(
    @Inject(REDIS_CLIENT) private redis: Redis,
    private prisma: PrismaService,
  ) {}

  async getEventItems(eventId: string): Promise<CachedGachaItem[]> {
    const cached = await this.redis.get(cacheKey(eventId));
    if (cached) return JSON.parse(cached);

    const items = await this.prisma.gachaItem.findMany({
      where: { eventId },
      select: { id: true, name: true, rarity: true, dropRate: true },
    });
    const serializable = items.map((item) => ({ ...item, dropRate: Number(item.dropRate) }));
    await this.redis.set(cacheKey(eventId), JSON.stringify(serializable));
    return serializable;
  }

  async invalidate(eventId: string): Promise<void> {
    await this.redis.del(cacheKey(eventId));
  }
}
