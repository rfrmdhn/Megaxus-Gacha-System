import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GachaCacheService } from '../gacha/gacha-cache.service';
import { StorageService, StoredObject } from '../storage/storage.service';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private gachaCache: GachaCacheService,
    private storage: StorageService,
  ) {}

  async listActive() {
    const events = await this.prisma.gachaEvent.findMany({
      where: { isActive: true },
      orderBy: { startsAt: 'desc' },
    });
    return events.map((event) => ({
      id: event.id,
      name: event.name,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      imageKey: event.imageKey,
    }));
  }

  async getById(eventId: string) {
    const event = await this.prisma.gachaEvent.findUnique({
      where: { id: eventId },
    });
    if (!event || !event.isActive)
      throw new NotFoundException('Event not found');

    const items = await this.gachaCache.getEventItems(eventId);
    return {
      id: event.id,
      name: event.name,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      imageKey: event.imageKey,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        rarity: item.rarity,
        dropRate: item.dropRate.toFixed(2),
        imageKey: item.imageKey,
      })),
    };
  }

  // Public counterpart to the admin item-image endpoint: players fetch item
  // artwork here without needing an admin token. Only the raw bytes are exposed.
  async getItemImage(itemId: string): Promise<StoredObject> {
    const item = await this.prisma.gachaItem.findUnique({
      where: { id: itemId },
      select: { imageKey: true },
    });
    if (!item?.imageKey) throw new NotFoundException('Item has no image');
    return this.storage.getObject(item.imageKey);
  }

  // Public event banner, same rationale as getItemImage.
  async getEventImage(eventId: string): Promise<StoredObject> {
    const event = await this.prisma.gachaEvent.findUnique({
      where: { id: eventId },
      select: { imageKey: true },
    });
    if (!event?.imageKey) throw new NotFoundException('Event has no image');
    return this.storage.getObject(event.imageKey);
  }
}
