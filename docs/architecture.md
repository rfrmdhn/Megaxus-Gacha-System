# Architecture Decisions

Source of truth for *why* — see [erd.md](./erd.md) for schema and [api.md](./api.md) for endpoints.

## Stack

| Concern | Choice | Why |
|---|---|---|
| Backend | NestJS (Node.js/TypeScript) | Structured modules/DI; first-class libraries for every piece below (Prisma, ioredis, bullmq, native SSE via `@Sse()`). |
| Frontend | Next.js (React), split into `frontend-user` and `frontend-admin` | SPA-style consumption of the REST API; `EventSource` (SSE) is a native browser API, no extra dependency needed. Two separate apps sharing one backend so the admin bundle (event/item management, live history) never ships to a player's browser, and each has its own deploy/auth surface — the admin app's login rejects non-admin JWTs outright. |
| Primary datastore | PostgreSQL | Sole system of record. The core risk being tested — race conditions on a numeric balance — is exactly what relational transactions + row-level locking solve natively. `NUMERIC` gives exact decimal drop rates; `CHECK` constraints give DB-level integrity backstops. Chosen over MongoDB (would require reimplementing these guarantees in app code) and over MySQL (weaker constraint enforcement). |
| ORM | Prisma | Type-safe schema/migrations; `updateMany` with a `WHERE` guard clause maps directly onto the atomic-update concurrency pattern below without needing raw SQL for the hot path. |
| Cache | Redis (plain client) | Cache-aside for event/item drop-rate reads, invalidated on admin write — not used for locking. |
| Job queue | BullMQ (Redis-backed) | Decouples "a gacha pull committed" from "deliver it to the admin dashboard." Not used for caching or locking — those are separate concerns handled above. |
| Real-time transport | Server-Sent Events (SSE) | Admin dashboard only ever receives pushed updates, never sends data back over that channel — SSE is the correct fit for one-directional push, simpler than WebSockets, lower overhead than polling. |
| Auth | JWT | Stateless, fits a decoupled FE/BE REST architecture better than server-side sessions. `role` claim (`user`/`admin`) gates admin routes. |

## Concurrency control for coin deduction

**Decision: atomic guarded `UPDATE` ("Option C"), not `SELECT ... FOR UPDATE` and not optimistic/version locking.**

```sql
UPDATE users SET coins = coins - 10 WHERE id = :user_id AND coins >= 10 RETURNING coins;
```

- The `WHERE coins >= 10` clause folds the balance check and the deduction into a single atomic statement — there is no separate read step, so there is no window in which a race could occur. This is both the fastest option under contention (shortest possible lock, one round trip) and the strongest integrity guarantee.
- `CHECK (coins >= 0)` on `users.coins` is a DB-level backstop, independent of application code correctness.
- The full pull — deduct → read drop rates → roll → insert log — happens inside **one transaction**. Nothing is returned to the client, and no BullMQ job is enqueued, until `COMMIT` succeeds.
- Concurrency at scale (thousands/millions of users) is a non-issue for this design because Postgres row locks are per-row: different users' pulls never contend with each other. Contention only exists within a single user's own rapid repeated clicks — a small number of transactions, resolved by the same atomic statement.

## Weighted random algorithm

**Decision: Linear Prefix Sum, O(N).**

Gacha events have small, admin-curated item lists (single digits to a few dozen items), not hundreds or thousands. At that N, a linear scan is trivially fast — the cost is dominated by the DB transaction, not the roll. Binary search (O(log N)) and the Alias Method (O(1) with O(N) setup) solve problems that don't exist at this scale, and the Alias Method specifically introduces real risk: its precomputed table must be correctly rebuilt every time an admin edits a drop rate, or rolls silently diverge from configured rates — the exact fairness bug this system exists to prevent.

Millions of concurrent users does not change this: it scales the number of times per second the algorithm runs, not the cost of a single run, and the actual bottleneck at that scale is the DB transaction (already handled above), not roll CPU time.

## Drop-rate sum validation: draft vs active

Requiring an event's items to sum to exactly 100% on *every single write* would make incremental admin setup impossible (the first item added is never 100% on its own). Instead, events have a lifecycle:

- **Draft** (`isActive: false`, the default on creation): items can be added/edited one at a time; a write is only rejected if the running total would *exceed* 100%.
- **Activation** (`PUT /admin/events/:id { isActive: true }`): rejected unless the current items already sum to exactly 100%.
- **Active**: further item writes must keep the total at exactly 100% — no partial edits once live.
- **Pull-time defense-in-depth**: `GachaService.pull` re-validates the sum before rolling, catching the one remaining gap — deleting an item from an active event is allowed (admins shouldn't be blocked from removing something), but that can leave the event below 100% until fixed, so pulls refuse to run against a misconfigured active event rather than silently rolling against the wrong odds.

## Drop-rate caching

**Decision: cache-aside with write-side invalidation, not a TTL.**

```
Admin write (CRUD on gacha_items):
  BEGIN; validate sum=100%; write; COMMIT;
  -- only after commit: Redis.DEL(`event:{eventId}:items`)

Gacha pull read (inside the pull's transaction):
  cached = Redis.GET(`event:{eventId}:items`)
  if cached: use it
  else: read from Postgres, then Redis.SET(...) to repopulate
```

This has effectively zero staleness window in the common case (cache is either absent or exactly correct — never "stale for up to N seconds" the way a TTL-based cache would be), while still avoiding a DB read on every pull once warm. Delete-and-repopulate (rather than pushing the new value from the write path) keeps a single code path responsible for the cache's data shape.

## Real-time admin monitoring

**Decision: SSE fed by a BullMQ worker; cursor pagination for history browsing.**

- `POST /api/gacha/pull` commits its transaction → enqueues a BullMQ job → a worker consumes it and pushes an SSE event to connected admin clients.
- The number of admin dashboard viewers is small and bounded regardless of end-user scale (1 to a few dozen staff) — so the transport choice doesn't change with user growth.
- At very high pull volume, the worker should batch/throttle emitted events (e.g. every 200-500ms) rather than push one event per pull — documented here as the scale-out strategy; not required to fully implement for this submission.
- `GET /api/admin/history` (cursor-paginated) remains the mechanism for initial load and scrolling back through history; SSE is purely for "new since I started watching."
