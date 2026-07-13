import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GachaCacheService } from '../gacha/gacha-cache.service';
import { StorageService, StoredObject } from '../storage/storage.service';
import {
  assertDropRatesDoNotExceed100,
  assertDropRatesEqual100,
} from './drop-rate.util';
import { CreateItemDto, UpdateItemDto } from './dto/item.dto';

const ALLOWED_IMAGE_MIME_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export interface UploadedImageFile {
  buffer: Buffer;
  mimetype: string;
}

@Injectable()
export class AdminItemsService {
  constructor(
    private prisma: PrismaService,
    private gachaCache: GachaCacheService,
    private storage: StorageService,
  ) {}

  async create(eventId: string, dto: CreateItemDto) {
    const event = await this.prisma.gachaEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Event not found');

    const existing = await this.prisma.gachaItem.findMany({
      where: { eventId },
      select: { dropRate: true },
    });
    const rates = [...existing.map((i) => i.dropRate), dto.dropRate];
    // Active events must stay valid after every edit; draft events can be built up incrementally.
    event.isActive
      ? assertDropRatesEqual100(rates)
      : assertDropRatesDoNotExceed100(rates);

    const item = await this.prisma.gachaItem.create({
      data: {
        eventId,
        name: dto.name,
        rarity: dto.rarity,
        dropRate: dto.dropRate,
      },
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
      event.isActive
        ? assertDropRatesEqual100(rates)
        : assertDropRatesDoNotExceed100(rates);
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
    const pullCount = await this.prisma.gachaLog.count({ where: { itemId } });
    if (pullCount > 0) {
      throw new BadRequestException(
        'Cannot delete an item that has already been awarded to a player',
      );
    }
    // Deleting from an active event can leave it below 100% — GachaService's
    // pull-time check blocks pulls on a misconfigured active event as a backstop.
    await this.prisma.gachaItem.delete({ where: { id: itemId } });
    await this.gachaCache.invalidate(item.eventId);
  }

  async uploadImage(itemId: string, file: UploadedImageFile) {
    const item = await this.assertExists(itemId);

    const extension = ALLOWED_IMAGE_MIME_TYPES[file.mimetype];
    if (!extension) {
      throw new BadRequestException('Image must be PNG, JPEG, or WebP');
    }

    const key = `items/${itemId}-${Date.now()}.${extension}`;
    await this.storage.upload(key, file.buffer, file.mimetype);
    if (item.imageKey) await this.storage.remove(item.imageKey);

    const updated = await this.prisma.gachaItem.update({
      where: { id: itemId },
      data: { imageKey: key },
    });
    await this.gachaCache.invalidate(item.eventId);
    return updated;
  }

  async removeImage(itemId: string) {
    const item = await this.assertExists(itemId);
    if (!item.imageKey) return;

    await this.storage.remove(item.imageKey);
    await this.prisma.gachaItem.update({
      where: { id: itemId },
      data: { imageKey: null },
    });
    await this.gachaCache.invalidate(item.eventId);
  }

  async getImage(itemId: string): Promise<StoredObject> {
    const item = await this.assertExists(itemId);
    if (!item.imageKey) throw new NotFoundException('Item has no image');
    return this.storage.getObject(item.imageKey);
  }

  private async assertExists(itemId: string) {
    const item = await this.prisma.gachaItem.findUnique({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }
}
