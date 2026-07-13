import { Controller, Get, Param, StreamableFile } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Get()
  list() {
    return this.eventsService.listActive();
  }

  // Public item artwork. Declared before ':id' so the 3-segment path is matched
  // unambiguously. Served as a raw stream for direct use in an <img src>.
  @Get('items/:id/image')
  async getItemImage(@Param('id') id: string): Promise<StreamableFile> {
    const { stream, mimeType } = await this.eventsService.getItemImage(id);
    return new StreamableFile(stream, { type: mimeType });
  }

  // Public event banner. Declared before ':id' for the same disambiguation reason.
  @Get(':id/image')
  async getEventImage(@Param('id') id: string): Promise<StreamableFile> {
    const { stream, mimeType } = await this.eventsService.getEventImage(id);
    return new StreamableFile(stream, { type: mimeType });
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.eventsService.getById(id);
  }
}
