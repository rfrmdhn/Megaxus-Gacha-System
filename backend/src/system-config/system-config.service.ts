import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface SystemConfigEntry {
  key: string;
  value: unknown;
}

/**
 * Default values for every config key. Used as the final fallback when neither
 * the database nor an environment variable provides a value.
 */
const DEFAULTS: Record<string, unknown> = {
  PULL_COST: 10,
  MAX_BULK_PULL: 10,
  GACHA_PULL_THROTTLE_LIMIT: 120,
  GACHA_PULL_THROTTLE_TTL_MS: 60_000,
  ADMIN_FEED_RATE_LIMIT_MAX: 10,
  ADMIN_FEED_RATE_LIMIT_DURATION_MS: 1000,
  GLOBAL_THROTTLE_LIMIT: 40,
  GLOBAL_THROTTLE_TTL_MS: 60_000,
  BCRYPT_ROUNDS: 10,
  REFRESH_TOKEN_BYTES: 32,
  DEFAULT_REFRESH_EXPIRES_SECONDS: 604_800,
  JWT_ACCESS_EXPIRES_IN_SECONDS: 900,
  RECENT_HISTORY_LIMIT: 10,
  BACKSTOP_TTL_SECONDS: 86_400,
  PULL_COST_FRONTEND: 10,
  MULTI_PULL_COUNT: 10,
  PULL_REVEAL_ANIMATION_MS: 700,
  REFRESH_DEBOUNCE_MS: 500,
};

/**
 * Maps config keys to environment variable names. When an env var is set, it
 * takes precedence over the database value.
 */
const ENV_OVERRIDES: Record<string, string> = {
  JWT_ACCESS_EXPIRES_IN_SECONDS: 'JWT_ACCESS_EXPIRES_IN_SECONDS',
  DEFAULT_REFRESH_EXPIRES_SECONDS: 'REFRESH_TOKEN_EXPIRES_IN_SECONDS',
};

@Injectable()
export class SystemConfigService implements OnModuleInit {
  private readonly logger = new Logger(SystemConfigService.name);
  private cache = new Map<string, unknown>();
  private loaded = false;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.loadAll();
  }

  /** Load all config entries from the database into the in-memory cache. */
  async loadAll(): Promise<void> {
    try {
      const rows = await this.prisma.systemConfig.findMany();
      for (const row of rows) {
        this.cache.set(row.key, row.value);
      }
      this.loaded = true;
      this.logger.log(`Loaded ${rows.length} system config entries`);
    } catch {
      this.logger.warn('Failed to load system config from database, using defaults');
      this.loaded = true;
    }
  }

  /**
   * Get a config value by key. Resolution order:
   * 1. Environment variable (if mapped)
   * 2. Database value
   * 3. Hardcoded default
   */
  get<T = unknown>(key: string): T {
    // 1. Environment variable override
    const envKey = ENV_OVERRIDES[key];
    if (envKey) {
      const envVal = this.config.get<string>(envKey);
      if (envVal !== undefined) {
        return this.coerce(envVal, DEFAULTS[key]) as T;
      }
    }

    // 2. Database value
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    // 3. Default
    return (DEFAULTS[key] ?? null) as T;
  }

  /** Get all config entries (for the /config endpoint). */
  getAll(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(DEFAULTS)) {
      result[key] = this.get(key);
    }
    return result;
  }

  /** Update a config value in the database and refresh the cache. */
  async set(key: string, value: unknown): Promise<void> {
    await this.prisma.systemConfig.upsert({
      where: { key },
      create: { key, value: value as never },
      update: { value: value as never },
    });
    this.cache.set(key, value);
  }

  /** Coerce a string env var to the same type as the default value. */
  private coerce(envVal: string, defaultVal: unknown): unknown {
    if (typeof defaultVal === 'number') {
      const num = Number(envVal);
      return Number.isNaN(num) ? defaultVal : num;
    }
    if (typeof defaultVal === 'boolean') {
      return envVal === 'true' || envVal === '1';
    }
    return envVal;
  }
}
