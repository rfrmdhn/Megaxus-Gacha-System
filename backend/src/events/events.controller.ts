import { Controller, Get, Param } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Get()
  list() {
    return this.eventsService.listActive();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.eventsService.getById(id);
  }
}
