import { Controller, Get } from '@nestjs/common';
import { SystemConfigService } from '../system-config/system-config.service';

@Controller('config')
export class ConfigController {
  constructor(private systemConfig: SystemConfigService) {}

  @Get()
  getConfig() {
    return this.systemConfig.getAll();
  }
}
