import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GachaCacheService } from '../gacha/gacha-cache.service';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private gachaCache: GachaCacheService,
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
    }));
  }

  async getById(eventId: string) {
    const event = await this.prisma.gachaEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');

    const items = await this.gachaCache.getEventItems(eventId);
    return {
      id: event.id,
      name: event.name,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        rarity: item.rarity,
        dropRate: item.dropRate.toFixed(2),
      })),
    };
  }
}
