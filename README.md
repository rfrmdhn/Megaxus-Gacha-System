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

Requires Node.js 22+, and Postgres + Redis running locally (or via Docker: `docker compose up -d postgres redis`). Note: `docker-compose.yml` maps Redis to host port **6380** (to avoid clashing with a locally-installed Redis on 6379) — set `REDIS_PORT=6380` in `.env` if you use the Dockerized Redis instead of a native install.

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

## API documentation

Base URL: `/api`. Full reference with every endpoint and edge case: [backend/docs/api.md](backend/docs/api.md).

| Endpoint | Auth | Request | Response |
|---|---|---|---|
| `POST /api/auth/register` | – | `{ "email", "password" }` | `201 { "user": { "id", "email", "coins": 500 }, "token" }` |
| `POST /api/auth/login` | – | `{ "email", "password" }` | `200 { "token" }` |
| `GET /api/user/profile` | user | – | `200 { "id", "email", "coins" }` |
| `GET /api/user/history?cursor=&limit=` | user | – | `200 { "items": [{ "eventName", "itemName", "rarity", "coinsSpent", "createdAt" }], "nextCursor" }` |
| `GET /api/events` | – | – | `200 [{ "id", "name", "startsAt", "endsAt" }]` |
| `GET /api/events/:id` | – | – | `200 { "id", "name", "items": [{ "name", "rarity", "dropRate" }] }` |
| `POST /api/gacha/pull` | user | `{ "eventId" }` | `200 { "item": { "name", "rarity" }, "remainingCoins" }` or `400 { "message": "Insufficient coins" }` |
| `GET /api/admin/events` | admin | – | `200 [{ "id", "name", "isActive", "items": [...] }]` |
| `POST /api/admin/events` | admin | `{ "name", "startsAt", "endsAt" }` | `201`, created as a **draft** (`isActive: false`) |
| `PUT /api/admin/events/:id` | admin | `{ "isActive": true, ... }` | `200`, activating requires items to sum to exactly 100% |
| `DELETE /api/admin/events/:id` | admin | – | `200` |
| `POST /api/admin/events/:id/items` | admin | `{ "name", "rarity", "dropRate" }` | `201` |
| `PUT` / `DELETE /api/admin/items/:id` | admin | `{ "dropRate", ... }` | `200` |
| `GET /api/admin/history?cursor=&limit=&userId=` | admin | – | `200 { "items": [{ "userEmail", "eventName", "itemName", ... }], "nextCursor" }` |
| `GET /api/admin/history/stream` | admin (via `?token=`) | – | Server-Sent Events, `event: pull` pushed live on every commit |
| `GET /api/admin/users?cursor=&limit=&email=` | admin | – | `200 { "items": [{ "email", "role", "coins", "isBanned", "pullCount", ... }], "nextCursor" }` |
| `GET /api/admin/users/:id` | admin | – | `200 { ...user, "recentHistory": [...] }` or `404` |
| `PUT /api/admin/users/:id` | admin | `{ "coins"?, "role"?, "isBanned"? }` | `200`, updates only the provided fields |
| `GET /api/admin/stats` | admin | – | `200 { "totalUsers", "activeEvents", "totalEvents", "pullsToday", "totalPulls", "totalCoinsSpent" }` |

## Database design

```
users                        gacha_events
├─ id (PK)                   ├─ id (PK)
├─ email (unique)            ├─ name
├─ password_hash             ├─ is_active (default false — draft until admin activates)
├─ role (user/admin)         ├─ starts_at / ends_at
├─ coins (default 500,       └─ created_at
│    CHECK coins >= 0)              │
└─ created_at                       │ 1:N
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
