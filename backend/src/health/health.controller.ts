import {
  Controller,
  Get,
  ServiceUnavailableException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { HealthService } from './health.service';

// Version-neutral: liveness/readiness probes live at a stable /api/health,
// unaffected by API version bumps. No auth — orchestrators must reach it freely.
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  async check() {
    const report = await this.health.check();
    if (report.status !== 'ok') {
      // 503 so load balancers / k8s mark the instance unready.
      throw new ServiceUnavailableException(report);
    }
    return report;
  }
}
