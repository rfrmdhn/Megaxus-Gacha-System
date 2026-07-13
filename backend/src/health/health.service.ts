import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';

export interface HealthReport {
  status: 'ok' | 'error';
  db: 'up' | 'down';
  redis: 'up' | 'down';
}

@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  async check(): Promise<HealthReport> {
    const [db, redis] = await Promise.all([
      this.ping(() => this.prisma.$queryRaw`SELECT 1`),
      this.ping(() => this.redis.ping()),
    ]);
    return {
      status: db && redis ? 'ok' : 'error',
      db: db ? 'up' : 'down',
      redis: redis ? 'up' : 'down',
    };
  }

  private async ping(probe: () => Promise<unknown>): Promise<boolean> {
    try {
      await probe();
      return true;
    } catch {
      return false;
    }
  }
}
