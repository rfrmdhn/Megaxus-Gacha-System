export const ADMIN_FEED_QUEUE = 'admin-feed';

// A bulk pull can fire up to MAX_BULK_PULL (10) events at once; this holds a
// burst in the queue and drip-feeds it to the admin SSE stream instead of
// flooding it in one tick. Single pulls under normal usage never hit this cap.
export const ADMIN_FEED_RATE_LIMIT = { max: 10, duration: 1000 };
