import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GachaCacheService } from '../gacha/gacha-cache.service';
import { assertDropRatesDoNotExceed100, assertDropRatesEqual100 } from './drop-rate.util';
import { CreateItemDto, UpdateItemDto } from './dto/item.dto';

@Injectable()
export class AdminItemsService {
  constructor(
    private prisma: PrismaService,
    private gachaCache: GachaCacheService,
  ) {}

  async create(eventId: string, dto: CreateItemDto) {
    const event = await this.prisma.gachaEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');

    const existing = await this.prisma.gachaItem.findMany({
      where: { eventId },
      select: { dropRate: true },
    });
    const rates = [...existing.map((i) => i.dropRate), dto.dropRate];
    // Active events must stay valid after every edit; draft events can be built up incrementally.
    event.isActive ? assertDropRatesEqual100(rates) : assertDropRatesDoNotExceed100(rates);

    const item = await this.prisma.gachaItem.create({
      data: { eventId, name: dto.name, rarity: dto.rarity, dropRate: dto.dropRate },
    });
    await this.gachaCache.invalidate(eventId);
    return item;
  }

  async update(itemId: string, dto: UpdateItemDto) {
    const item = await this.assertExists(itemId);

    if (dto.dropRate !== undefined) {
      const event = await this.prisma.gachaEvent.findUniqueOrThrow({
        where: { id: item.eventId },
      });
      const siblings = await this.prisma.gachaItem.findMany({
        where: { eventId: item.eventId, id: { not: itemId } },
        select: { dropRate: true },
      });
      const rates = [...siblings.map((i) => i.dropRate), dto.dropRate];
      event.isActive ? assertDropRatesEqual100(rates) : assertDropRatesDoNotExceed100(rates);
    }

    const updated = await this.prisma.gachaItem.update({
      where: { id: itemId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.rarity !== undefined ? { rarity: dto.rarity } : {}),
        ...(dto.dropRate !== undefined ? { dropRate: dto.dropRate } : {}),
      },
    });
    await this.gachaCache.invalidate(item.eventId);
    return updated;
  }

  async remove(itemId: string) {
    const item = await this.assertExists(itemId);
    // Deleting from an active event can leave it below 100% — GachaService's
    // pull-time check blocks pulls on a misconfigured active event as a backstop.
    await this.prisma.gachaItem.delete({ where: { id: itemId } });
    await this.gachaCache.invalidate(item.eventId);
  }

  private async assertExists(itemId: string) {
    const item = await this.prisma.gachaItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }
}
