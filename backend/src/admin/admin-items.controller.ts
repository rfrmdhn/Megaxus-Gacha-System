import { Body, Controller, Delete, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma';
import { AdminItemsService } from './admin-items.service';
import { UpdateItemDto } from './dto/item.dto';

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
}
