import { apiFetch } from "./api";

export interface SystemConfig {
  PULL_COST: number;
  MAX_BULK_PULL: number;
  GACHA_PULL_THROTTLE_LIMIT: number;
  GACHA_PULL_THROTTLE_TTL_MS: number;
  ADMIN_FEED_RATE_LIMIT_MAX: number;
  ADMIN_FEED_RATE_LIMIT_DURATION_MS: number;
  GLOBAL_THROTTLE_LIMIT: number;
  GLOBAL_THROTTLE_TTL_MS: number;
  BCRYPT_ROUNDS: number;
  REFRESH_TOKEN_BYTES: number;
  DEFAULT_REFRESH_EXPIRES_SECONDS: number;
  JWT_ACCESS_EXPIRES_IN_SECONDS: number;
  RECENT_HISTORY_LIMIT: number;
  BACKSTOP_TTL_SECONDS: number;
  PULL_COST_FRONTEND: number;
  MULTI_PULL_COUNT: number;
  PULL_REVEAL_ANIMATION_MS: number;
  REFRESH_DEBOUNCE_MS: number;
}

let cachedConfig: SystemConfig | null = null;

export async function getConfig(): Promise<SystemConfig> {
  if (cachedConfig) return cachedConfig;
  cachedConfig = await apiFetch<SystemConfig>("/config");
  return cachedConfig;
}

export function invalidateConfigCache() {
  cachedConfig = null;
}
