# Gacha Event System

A production-minded gacha event system: users spend coins on weighted-random pulls, admins configure event drop rates, and an admin dashboard monitors pulls in real time. Built as a technical assessment focused on concurrency safety, fair weighted-random sampling, and clean API/architecture design.

Each app documents itself — every subproject has its own `docs/` folder. Full architectural reasoning (why Postgres over Mongo, why atomic `UPDATE` over locking, why Linear Prefix Sum, why SSE) lives in [backend/docs/adr.md](backend/docs/adr.md). Database design in [backend/docs/data-model.md](backend/docs/data-model.md). API reference in [backend/docs/api.md](backend/docs/api.md). See [Documentation](#documentation) below for the full index across all three apps.

The player-facing app and the admin dashboard are two separate Next.js apps ([frontend-user](frontend-user), [frontend-admin](frontend-admin)) sharing one backend — separate deployables, separate auth surfaces (the admin app rejects non-admin logins outright), no player ever ships admin code to their browser.

## Stack

- **Backend**: NestJS (TypeScript), PostgreSQL (Prisma ORM), Redis (cache + BullMQ job queue) — one API shared by both frontends
- **Frontend**: two Next.js (App Router) apps, Tailwind CSS — `frontend-user` (players) and `frontend-admin` (admins)
- **Real-time**: Server-Sent Events, fed by a BullMQ worker

## Installation — Docker (recommended)

Requires Docker Desktop.

```bash
docker compose up --build
```

This starts Postgres, Redis, the backend (runs pending Prisma migrations and seeds the admin account automatically on boot — see [Creating an admin user](#creating-an-admin-user)), and both frontends.

- User app: http://localhost:3000
- Admin app: http://localhost:3002
- Backend API: http://localhost:3001/api

## Installation — Local development

Requires Node.js 22+, and Postgres + Redis running locally (or via Docker: `docker compose up -d postgres redis`). Note: `docker-compose.yml` maps Redis to host port **6380** (to avoid clashing with a locally-installed Redis on 6379) — set `REDIS_PORT=6380` in `.env` if you use the Dockerized Redis instead of a native install. MinIO (`docker compose up -d minio`) is only needed once you hit the image upload/serve endpoints — the backend boots fine without it.

**Backend**
```bash
cd backend
npm install
cp .env.example .env   # adjust DATABASE_URL / REDIS_HOST / REDIS_PORT if needed
npx prisma migrate dev   # also seeds the admin account (see below)
npm run start:dev
```
Runs on http://localhost:3001, all routes under `/api`. If migrations were already applied earlier and no new one ran, seed explicitly with `npm run db:seed`.

**User app**
```bash
cd frontend-user
npm install
cp .env.local.example .env.local
npm run dev
```
Runs on http://localhost:3000.

**Admin app** (separate terminal)
```bash
cd frontend-admin
npm install
cp .env.local.example .env.local
npm run dev
```
Runs on http://localhost:3002 (`package.json` pins the dev/start scripts to that port so it doesn't clash with the user app on 3000).

## Environment variables

Every app ships a committed `.env.example` (`.env.local.example` for the two Next.js apps) — copy it and adjust as needed (see [Installation](#installation--local-development) above for the exact `cp` commands).

**Backend** (`backend/.env`, see [backend/.env.example](backend/.env.example))

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | yes | – | Postgres connection string |
| `JWT_SECRET` | yes | – | Signs access + refresh tokens |
| `REDIS_HOST` / `REDIS_PORT` | no | `localhost` / `6379` | Cache + BullMQ queue. Dockerized Redis maps to host port **6380** — see the note above |
| `JWT_ACCESS_EXPIRES_IN_SECONDS` | no | `900` | Access token TTL (seconds) |
| `REFRESH_TOKEN_EXPIRES_IN_SECONDS` | no | `604800` | Refresh token TTL (seconds) |
| `PORT` | no | `3001` | HTTP port |
| `FRONTEND_USER_ORIGIN` / `FRONTEND_ADMIN_ORIGIN` | no | `http://localhost:3000` / `http://localhost:3002` | CORS allowlist |
| `MINIO_ENDPOINT` / `MINIO_PORT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_BUCKET` / `MINIO_USE_SSL` | no | see `.env.example` | Object storage for event/item images. Only needed when hitting the image upload/serve endpoints — the app boots fine without MinIO running |
| `GLOBAL_THROTTLE_LIMIT` / `GLOBAL_THROTTLE_TTL_MS`, `GACHA_PULL_THROTTLE_LIMIT` / `GACHA_PULL_THROTTLE_TTL_MS`, `ADMIN_FEED_RATE_LIMIT_MAX` / `ADMIN_FEED_RATE_LIMIT_DURATION_MS` | no | see `.env.example` | Rate limits, read directly from env at module init (restart required to change) |

Everything else commented in `prisma/seed.js` (`PULL_COST`, `MAX_BULK_PULL`, `BCRYPT_ROUNDS`, `REFRESH_TOKEN_BYTES`, `RECENT_HISTORY_LIMIT`, `BACKSTOP_TTL_SECONDS`, etc.) is **DB-backed system config**, not an env var — tune it via the `system_config` table or `prisma/seed.js`'s defaults, not `.env`. The only system-config keys that double as env-var overrides are the two auth token lifetimes above (see `ENV_OVERRIDES` in [backend/src/system-config/system-config.service.ts](backend/src/system-config/system-config.service.ts)).

**Frontends** (`frontend-user/.env.local`, `frontend-admin/.env.local`)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | `http://localhost:3001/api/v1` | Base URL the browser calls for the backend API. Inlined at build time — changing it requires a rebuild, not just a restart |

## API documentation

Base URL: `/api/v1` (URI-versioned). The only exception is the health check, which is version-neutral at `/api/health` so probes survive version bumps. Full reference with every endpoint and edge case: [backend/docs/api.md](backend/docs/api.md).

Auth uses a short-lived **access token** plus a rotating **refresh token**: `register`/`login` return both, clients call `POST /auth/refresh` to mint a new pair when the access token expires, and `POST /auth/logout` revokes the refresh token.

| Endpoint | Auth | Request | Response |
|---|---|---|---|
| `GET /api/health` | – | – | `200 { "status": "ok", "db": "up", "redis": "up" }` or `503` when a dependency is down |
| `POST /api/v1/auth/register` | – | `{ "email", "password" }` | `201 { "user": { "id", "email", "coins": 500 }, "token", "refreshToken" }` |
| `POST /api/v1/auth/login` | – | `{ "email", "password" }` | `200 { "token", "refreshToken" }` |
| `POST /api/v1/auth/refresh` | – | `{ "refreshToken" }` | `200 { "token", "refreshToken" }` (rotates; the old token is invalidated) |
| `POST /api/v1/auth/logout` | user | – | `200 { "success": true }`, clears the stored refresh token |
| `GET /api/v1/user/profile` | user | – | `200 { "id", "email", "coins" }` |
| `GET /api/v1/user/history?cursor=&limit=` | user | – | `200 { "items": [{ "eventName", "itemName", "rarity", "coinsSpent", "createdAt" }], "nextCursor" }` |
| `GET /api/v1/events` | – | – | `200 [{ "id", "name", "startsAt", "endsAt", "imageKey" }]` (unpaginated — small, admin-curated list) |
| `GET /api/v1/events/:id` | – | – | `200 { "id", "name", "imageKey", "items": [{ "id", "name", "rarity", "dropRate", "imageKey" }] }` |
| `GET /api/v1/events/:id/image` | – | – | Raw image bytes for the event banner, or `404` |
| `GET /api/v1/events/items/:id/image` | – | – | Raw image bytes for an item, or `404` |
| `POST /api/v1/gacha/pull` | user | `{ "eventId" }` | `200 { "item": { "name", "rarity" }, "remainingCoins" }` or `400 { "message": "Insufficient coins" }` |
| `POST /api/v1/gacha/pull-bulk` | user | `{ "eventId", "count" }` (max 10) | `200 { "items": [...], "remainingCoins" }` — one atomic transaction |
| `GET /api/v1/admin/events` | admin | – | `200 [{ "id", "name", "isActive", "imageKey", "items": [...] }]` |
| `POST /api/v1/admin/events` | admin | `{ "name", "startsAt", "endsAt" }` | `201`, created as a **draft** (`isActive: false`) |
| `PUT /api/v1/admin/events/:id` | admin | `{ "isActive": true, ... }` | `200`, activating requires items to sum to exactly 100% |
| `DELETE /api/v1/admin/events/:id` | admin | – | `200` |
| `POST` / `DELETE /api/v1/admin/events/:id/image` | admin | multipart `file` (PNG/JPEG/WebP, ≤5MB) | `200`/`201` |
| `GET /api/v1/admin/events/:id/image` | admin | – | Raw image bytes |
| `POST /api/v1/admin/events/:id/items` | admin | `{ "name", "rarity", "dropRate" }` | `201` |
| `PUT` / `DELETE /api/v1/admin/items/:id` | admin | `{ "dropRate", ... }` | `200` |
| `POST` / `GET` / `DELETE /api/v1/admin/items/:id/image` | admin | multipart `file` (PNG/JPEG/WebP, ≤5MB) | `200`/`201` |
| `GET /api/v1/admin/history?cursor=&limit=&userId=` | admin | – | `200 { "items": [{ "userEmail", "eventName", "itemName", ... }], "nextCursor" }` |
| `GET /api/v1/admin/history/stream` | admin (via `?token=`) | – | Server-Sent Events, `event: pull` pushed live on every commit |
| `GET /api/v1/admin/users?cursor=&limit=&email=` | admin | – | `200 { "items": [{ "email", "role", "coins", "isBanned", "pullCount", ... }], "nextCursor" }` |
| `GET /api/v1/admin/users/:id` | admin | – | `200 { ...user, "recentHistory": [...] }` or `404` |
| `PUT /api/v1/admin/users/:id` | admin | `{ "coins"?, "role"?, "isBanned"? }` | `200`, updates only the provided fields |
| `DELETE /api/v1/admin/users/:id` | admin | – | `200 { "success": true }`, or `409` if the user has pull history (ban instead) |
| `GET /api/v1/admin/stats` | admin | – | `200 { "totalUsers", "activeEvents", "totalEvents", "pullsToday", "totalPulls", "totalCoinsSpent" }` |
| `GET /api/v1/admin/stats/leaderboard` | admin | – | `200 [{ "userId", "email", "pullCount", "coinsSpent" }]` — top players by lifetime pulls |

Rate limits: a global default of 40 requests/60s, tightened to 10/60s on `auth/*` and relaxed to 120/60s on `gacha/*`. Exceeding a limit returns `429`.

## Database design

```
users                        gacha_events
├─ id (PK)                   ├─ id (PK)
├─ email (unique)            ├─ name
├─ password_hash             ├─ is_active (default false — draft until admin activates)
├─ role (user/admin)         ├─ starts_at / ends_at
├─ coins (default 500,       ├─ image_key (nullable — banner in object storage)
│    CHECK coins >= 0)        └─ created_at
├─ is_banned                        │
├─ refresh_token_hash               │ 1:N
├─ refresh_token_expires_at         │
└─ created_at                       │
      │                     gacha_items
      │ 1:N                 ├─ id (PK)
      ▼                     ├─ event_id (FK → gacha_events)
gacha_logs                  ├─ name / rarity
├─ id (PK)                  ├─ drop_rate NUMERIC(5,2)
├─ user_id  (FK → users)    └─ created_at
├─ event_id (FK → gacha_events)
├─ item_id  (FK → gacha_items)
├─ coins_spent (snapshot)
└─ created_at
```

- `drop_rate` is `NUMERIC(5,2)`, not float — exact decimal, no rounding errors when validating a 100% sum.
- `gacha_logs` is append-only: the permanent record of every coin spent and item received.
- An event's items must sum to exactly 100% once `is_active = true`; while still a draft, they can be built up incrementally.

Full schema with all notes: [backend/docs/data-model.md](backend/docs/data-model.md).

## Creating an admin user

There is no public admin-registration endpoint by design (admin access shouldn't be self-service).

**Seeded admin account** — [backend/prisma/seed.js](backend/prisma/seed.js) upserts a ready-to-use admin on every `prisma migrate deploy`/`db seed` run (Docker runs this automatically on boot; see below for local dev):
```
email:    admin@admin.com
password: password123!
```
The upsert is a no-op if the account already exists, so it never overwrites a password changed later via the app.

To promote any other account instead, register it normally, then update it directly in the database:
```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```
Log out and back in afterward so the JWT picks up the new role.

## Using the app

1. **Register** at `frontend-user` `/register` — new accounts start with 500 coins.
2. Promote that account to admin (see below), then log in at `frontend-admin` `/login` — the admin app has no register page and its login rejects non-admin accounts.
3. As an **admin**, on `frontend-admin`'s `/events`: create a draft event, add items with drop rates (they can be added incrementally — only the *active* total must equal exactly 100%), then click **Activate**.
4. As a **user**, on `frontend-user`'s `/gacha`, pick the event, and pull (10 coins per pull).
5. Check `frontend-user`'s `/profile` for your coin balance and pull history.
6. As an admin, `frontend-admin`'s `/history` shows paginated history plus a live feed that updates in real time as pulls happen (Server-Sent Events, fed by a BullMQ worker).
7. `frontend-admin`'s `/` (Dashboard) shows aggregate stats (total users, active/total events, pulls today, total pulls, total coins spent); `/users` lists all users with search-by-email, and drilling into one shows their recent pull history plus controls to adjust coins, ban, or promote to admin.

## Running tests

```bash
cd backend
npm test              # unit tests — includes a 200k-trial statistical check that the
                       # weighted-random algorithm converges to configured drop rates
npm run test:e2e       # e2e — includes a concurrency test that fires 15 simultaneous
                       # pull requests against a balance that can only cover 2, and
                       # asserts the balance never goes negative and no pull is double-counted
```

## Key design decisions (short version)

- **Coin deduction race conditions**: a single atomic `UPDATE users SET coins = coins - 10 WHERE id = ? AND coins >= 10`, wrapped in the same DB transaction as the item roll and the history log write. No separate read-then-write step exists, so there's no window for a race — proven by the concurrency e2e test above. See ADR-002 in [backend/docs/adr.md](backend/docs/adr.md).
- **Weighted random**: Linear Prefix Sum over each event's (small, admin-curated) item list — simplest correct approach at this scale; see ADR-003 in [backend/docs/adr.md](backend/docs/adr.md) for why Binary Search / Alias Method aren't worth their added complexity here.
- **Drop rates must sum to 100%**: enforced with a draft → active lifecycle so admins can build up an event's items one at a time, rather than requiring every single write to already total 100%. See ADR-004 in [backend/docs/adr.md](backend/docs/adr.md).
- **Drop-rate storage**: `NUMERIC(5,2)`, not floating point — avoids the classic bug where percentages that should sum to exactly 100 fail a float equality check due to binary rounding.

## Documentation

Each app documents itself independently — there is no shared root `docs/` folder:

| App | Docs |
|---|---|
| `backend` | [backend/docs/](backend/docs/) — architecture, ADRs, data model, auth, API reference, per-feature specs, known issues, testing, AI guidelines, code-audit workflow |
| `frontend-admin` | [frontend-admin/docs/](frontend-admin/docs/) — architecture, core infrastructure, component API, data types, per-feature specs, known issues, testing, AI guidelines, code-audit workflow |
| `frontend-user` | [frontend-user/docs/](frontend-user/docs/) — architecture, core infrastructure, component API, data types, per-feature specs, known issues, testing, AI guidelines, code-audit workflow |

Start with each app's `docs/architecture.md`, then `docs/known-issues.md` for anything you're about to touch.
