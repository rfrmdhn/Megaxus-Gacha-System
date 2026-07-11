import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma';
import { AdminEventsService } from './admin-events.service';
import { AdminItemsService } from './admin-items.service';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';
import { CreateItemDto } from './dto/item.dto';

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
}
