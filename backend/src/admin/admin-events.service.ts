import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GachaCacheService } from '../gacha/gacha-cache.service';
import { assertDropRatesEqual100 } from './drop-rate.util';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';

function assertDateRangeValid(startsAt: Date, endsAt: Date): void {
  if (endsAt <= startsAt) {
    throw new BadRequestException('endsAt must be after startsAt');
  }
}

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
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    assertDateRangeValid(startsAt, endsAt);
    return this.prisma.gachaEvent.create({
      data: { name: dto.name, startsAt, endsAt },
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

    const startsAt =
      dto.startsAt !== undefined ? new Date(dto.startsAt) : event.startsAt;
    const endsAt =
      dto.endsAt !== undefined ? new Date(dto.endsAt) : event.endsAt;
    if (dto.startsAt !== undefined || dto.endsAt !== undefined) {
      assertDateRangeValid(startsAt, endsAt);
    }

    const updated = await this.prisma.gachaEvent.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.startsAt !== undefined ? { startsAt } : {}),
        ...(dto.endsAt !== undefined ? { endsAt } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    if (dto.isActive !== undefined) await this.gachaCache.invalidate(id);
    return updated;
  }

  async remove(id: string) {
    await this.assertExists(id);
    const pullCount = await this.prisma.gachaLog.count({
      where: { eventId: id },
    });
    if (pullCount > 0) {
      throw new BadRequestException(
        'Cannot delete an event with existing pull history; deactivate it instead',
      );
    }
    await this.prisma.gachaEvent.delete({ where: { id } });
  }

  private async assertExists(id: string) {
    const event = await this.prisma.gachaEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }
}
