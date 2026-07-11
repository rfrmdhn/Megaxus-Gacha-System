# API Reference

Base URL: `/api`. Admin routes require a JWT with `role: admin`.

## Auth

### `POST /api/auth/register`
```json
// request
{ "email": "player@example.com", "password": "secret123" }
// response 201
{ "user": { "id": "...", "email": "player@example.com", "coins": 500 }, "token": "<jwt>" }
```

### `POST /api/auth/login`
```json
// request
{ "email": "player@example.com", "password": "secret123" }
// response 200
{ "token": "<jwt>" }
```

## User

### `GET /api/user/profile` (auth required)
```json
// response 200
{ "id": "...", "email": "player@example.com", "coins": 470 }
```

### `GET /api/user/history?cursor=&limit=20` (auth required)
```json
// response 200
{
  "items": [
    { "id": "...", "eventName": "Summer Banner", "itemName": "Legendary Sword", "rarity": "legendary", "coinsSpent": 10, "createdAt": "..." }
  ],
  "nextCursor": "..." // null when no more pages
}
```

## Events (public, user-facing)

### `GET /api/events`
Active events only. Cacheable.
```json
[ { "id": "...", "name": "Summer Banner", "startsAt": "...", "endsAt": "..." } ]
```

### `GET /api/events/:id`
```json
{ "id": "...", "name": "Summer Banner", "items": [ { "id": "...", "name": "Legendary Sword", "rarity": "legendary", "dropRate": "1.00" } ] }
```

## Gacha

### `POST /api/gacha/pull` (auth required) — core transactional endpoint
```json
// request
{ "eventId": "..." }
// response 200
{ "item": { "id": "...", "name": "Legendary Sword", "rarity": "legendary" }, "remainingCoins": 460 }
// response 400 (insufficient balance)
{ "statusCode": 400, "message": "Insufficient coins" }
```
Deducts 10 coins, rolls a weighted-random item from the event's configured drop rates, and writes an immutable log entry — all inside a single atomic DB transaction. See [architecture.md](./architecture.md#concurrency-control-for-coin-deduction).

## Admin (requires `role: admin`)

### `GET /api/admin/events`
Returns all events (draft and active) with their items inline:
```json
[ { "id": "...", "name": "Summer Banner", "isActive": true, "startsAt": "...", "endsAt": "...", "items": [ { "id": "...", "name": "...", "rarity": "...", "dropRate": "1.00" } ] } ]
```

### `POST /api/admin/events`
```json
{ "name": "Summer Banner", "startsAt": "2026-08-01", "endsAt": "2026-08-31" }
```
Created as a **draft** (`isActive: false`) — items are added afterward, then the event is activated once its drop rates sum to 100%. See [erd.md](./erd.md#notes) for the full draft/active lifecycle.

### `PUT /api/admin/events/:id` / `DELETE /api/admin/events/:id`
`PUT { "isActive": true }` activates the event — rejected with 400 unless its items currently sum to exactly 100%.

### `POST /api/admin/events/:id/items`
```json
{ "name": "Legendary Sword", "rarity": "legendary", "dropRate": 1.0 }
```
While the event is a draft: rejected only if the running total would *exceed* 100% (partial configuration is fine). Once the event is active: rejected unless the resulting total is exactly 100%.

### `PUT /api/admin/items/:id` / `DELETE /api/admin/items/:id`
Same draft/active validation rules as item creation apply to updates. Deletion is always allowed, even if it leaves an active event's items summing to less than 100% — the gacha pull endpoint will refuse to roll on a misconfigured active event until it's fixed.

### `GET /api/admin/history?cursor=&limit=&userId=`
Paginated, all users. Same shape as the user history endpoint plus a `userId`/`userEmail` field.

### `GET /api/admin/history/stream` — Server-Sent Events
```
event: pull
data: { "userId": "...", "userEmail": "...", "itemName": "Legendary Sword", "createdAt": "..." }
```
Pushed live as pulls commit, via a BullMQ worker. See [architecture.md](./architecture.md#real-time-admin-monitoring).
