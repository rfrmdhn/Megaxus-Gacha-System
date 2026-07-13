import { Global, Module } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { ConfigController } from '../config/config.controller';

@Global()
@Module({
  controllers: [ConfigController],
  providers: [SystemConfigService],
  exports: [SystemConfigService],
})
export class SystemConfigModule {}
