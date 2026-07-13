export const PULL_COST = 10;

// Upper bound on pulls per bulk request. Bounds the transaction size and the
// coin cost a single request can incur (PULL_COST * count).
export const MAX_BULK_PULL = 10;

// Higher than the app-wide default (40/60s) since a player tapping through
// several pulls in a row is normal gacha usage, not abuse.
export const GACHA_PULL_THROTTLE = { default: { limit: 120, ttl: 60_000 } };
