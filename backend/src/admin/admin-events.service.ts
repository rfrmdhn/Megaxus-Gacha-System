import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GachaCacheService } from '../gacha/gacha-cache.service';
import { assertDropRatesEqual100 } from './drop-rate.util';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';

@Injectable()
export class AdminEventsService {
  constructor(
    private prisma: PrismaService,
    private gachaCache: GachaCacheService,
  ) {}

  list() {
    return this.prisma.gachaEvent.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  create(dto: CreateEventDto) {
    return this.prisma.gachaEvent.create({
      data: { name: dto.name, startsAt: new Date(dto.startsAt), endsAt: new Date(dto.endsAt) },
    });
  }

  async update(id: string, dto: UpdateEventDto) {
    const event = await this.assertExists(id);

    if (dto.isActive === true && !event.isActive) {
      const items = await this.prisma.gachaItem.findMany({
        where: { eventId: id },
        select: { dropRate: true },
      });
      assertDropRatesEqual100(items.map((i) => i.dropRate));
    }

    const updated = await this.prisma.gachaEvent.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.startsAt !== undefined ? { startsAt: new Date(dto.startsAt) } : {}),
        ...(dto.endsAt !== undefined ? { endsAt: new Date(dto.endsAt) } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    if (dto.isActive !== undefined) await this.gachaCache.invalidate(id);
    return updated;
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.gachaEvent.delete({ where: { id } });
  }

  private async assertExists(id: string) {
    const event = await this.prisma.gachaEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }
}
