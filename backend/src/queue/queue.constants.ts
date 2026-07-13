export const ADMIN_FEED_QUEUE = 'admin-feed';

// Rate limit values are read from env vars at module init time.
// Changing these requires an application restart (decorator values are static).
export const ADMIN_FEED_RATE_LIMIT = {
  max: Number(process.env.ADMIN_FEED_RATE_LIMIT_MAX ?? 10),
  duration: Number(process.env.ADMIN_FEED_RATE_LIMIT_DURATION_MS ?? 1000),
};
