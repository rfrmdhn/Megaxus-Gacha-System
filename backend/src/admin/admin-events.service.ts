import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GachaCacheService } from '../gacha/gacha-cache.service';
import { StorageService, StoredObject } from '../storage/storage.service';
import type { UploadedImageFile } from './admin-items.service';
import { assertDropRatesEqual100 } from './drop-rate.util';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';

function assertDateRangeValid(startsAt: Date, endsAt: Date): void {
  if (endsAt <= startsAt) {
    throw new BadRequestException('endsAt must be after startsAt');
  }
}

// A cosmetic banner for the event — unlike item drop-rate edits it never
// affects pull outcomes, so no gacha cache invalidation is needed here.
const ALLOWED_IMAGE_MIME_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

@Injectable()
export class AdminEventsService {
  constructor(
    private prisma: PrismaService,
    private gachaCache: GachaCacheService,
    private storage: StorageService,
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

  async uploadImage(id: string, file: UploadedImageFile) {
    const event = await this.assertExists(id);

    const extension = ALLOWED_IMAGE_MIME_TYPES[file.mimetype];
    if (!extension) {
      throw new BadRequestException('Image must be PNG, JPEG, or WebP');
    }

    const key = `events/${id}-${Date.now()}.${extension}`;
    await this.storage.upload(key, file.buffer, file.mimetype);
    if (event.imageKey) await this.storage.remove(event.imageKey);

    return this.prisma.gachaEvent.update({
      where: { id },
      data: { imageKey: key },
    });
  }

  async removeImage(id: string) {
    const event = await this.assertExists(id);
    if (!event.imageKey) return;

    await this.storage.remove(event.imageKey);
    await this.prisma.gachaEvent.update({
      where: { id },
      data: { imageKey: null },
    });
  }

  async getImage(id: string): Promise<StoredObject> {
    const event = await this.assertExists(id);
    if (!event.imageKey) throw new NotFoundException('Event has no image');
    return this.storage.getObject(event.imageKey);
  }

  private async assertExists(id: string) {
    const event = await this.prisma.gachaEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }
}
