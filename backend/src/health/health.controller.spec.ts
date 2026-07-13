import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import type { HealthReport } from './health.service';

describe('HealthController', () => {
  let health: { check: jest.Mock };
  let controller: HealthController;

  beforeEach(() => {
    health = { check: jest.fn() };
    controller = new HealthController(health as any);
  });

  it('returns the report when status is ok', async () => {
    const report: HealthReport = { status: 'ok', db: 'up', redis: 'up' };
    health.check.mockResolvedValue(report);

    await expect(controller.check()).resolves.toEqual(report);
  });

  it('throws 503 with the report when status is error', async () => {
    const report: HealthReport = { status: 'error', db: 'down', redis: 'up' };
    health.check.mockResolvedValue(report);

    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
