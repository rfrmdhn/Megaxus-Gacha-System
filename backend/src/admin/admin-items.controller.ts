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
import { AdminItemsService } from './admin-items.service';
import type { UploadedImageFile } from './admin-items.service';
import { UpdateItemDto } from './dto/item.dto';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

@Controller('admin/items')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin)
export class AdminItemsController {
  constructor(private itemsService: AdminItemsService) {}

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.itemsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.itemsService.remove(id);
  }

  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_SIZE_BYTES } }),
  )
  uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: UploadedImageFile,
  ) {
    return this.itemsService.uploadImage(id, file);
  }

  @Delete(':id/image')
  removeImage(@Param('id') id: string) {
    return this.itemsService.removeImage(id);
  }

  @Get(':id/image')
  async getImage(@Param('id') id: string): Promise<StreamableFile> {
    const { stream, mimeType } = await this.itemsService.getImage(id);
    return new StreamableFile(stream, { type: mimeType });
  }
}
