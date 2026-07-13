import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma';
import { AdminEventsService } from './admin-events.service';
import { AdminItemsService } from './admin-items.service';
import type { UploadedImageFile } from './admin-items.service';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';
import { CreateItemDto } from './dto/item.dto';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

@Controller('admin/events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin)
export class AdminEventsController {
  constructor(
    private eventsService: AdminEventsService,
    private itemsService: AdminItemsService,
  ) {}

  @Get()
  list() {
    return this.eventsService.list();
  }

  @Post()
  create(@Body() dto: CreateEventDto) {
    return this.eventsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }

  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() dto: CreateItemDto) {
    return this.itemsService.create(id, dto);
  }

  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_SIZE_BYTES } }),
  )
  uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: UploadedImageFile,
  ) {
    return this.eventsService.uploadImage(id, file);
  }

  @Delete(':id/image')
  removeImage(@Param('id') id: string) {
    return this.eventsService.removeImage(id);
  }

  @Get(':id/image')
  async getImage(@Param('id') id: string): Promise<StreamableFile> {
    const { stream, mimeType } = await this.eventsService.getImage(id);
    return new StreamableFile(stream, { type: mimeType });
  }
}
