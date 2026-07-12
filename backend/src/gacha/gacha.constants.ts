export const PULL_COST = 10;

// Higher than the app-wide default (20/60s) since a player tapping through
// several pulls in a row is normal gacha usage, not abuse.
export const GACHA_PULL_THROTTLE = { default: { limit: 60, ttl: 60_000 } };
