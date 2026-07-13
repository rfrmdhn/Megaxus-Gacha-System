# Gacha Event System

A production-minded gacha event system: users spend coins on weighted-random pulls, admins configure event drop rates, and an admin dashboard monitors pulls in real time. Built as a technical assessment focused on concurrency safety, fair weighted-random sampling, and clean API/architecture design.

This document is the single, complete reference for the whole project — backend, both frontends, environment setup, every API endpoint, the full database schema, the authentication system, and a full function-level walkthrough of the gacha algorithm itself. Each app also keeps a local (gitignored, developer-machine-only) `docs/` folder used during development; nothing in it is lost — its substance has been folded into this file so the project is fully documented from a fresh clone.

The player-facing app and the admin dashboard are two separate Next.js apps ([frontend-user](frontend-user), [frontend-admin](frontend-admin)) sharing one backend — separate deployables, separate auth surfaces (the admin app rejects non-admin logins outright), no player ever ships admin code to their browser.

## Table of contents

- [Stack](#stack)
- [Monorepo layout](#monorepo-layout)
- [Quick start — Docker](#quick-start--docker)
- [Quick start — local development](#quick-start--local-development)
- [Environment variables](#environment-variables)
- [Creating an admin user](#creating-an-admin-user)
- [Using the app](#using-the-app)
- [Architecture](#architecture)
  - [Backend architecture](#backend-architecture)
  - [Frontend-admin architecture](#frontend-admin-architecture)
  - [Frontend-user architecture](#frontend-user-architecture)
- [Key design decisions (ADRs)](#key-design-decisions-adrs)
- [Database schema](#database-schema)
- [Auth system](#auth-system)
- [The gacha algorithm — deep dive](#the-gacha-algorithm--deep-dive)
- [System configuration](#system-configuration)
- [API reference](#api-reference)
- [Admin features](#admin-features)
- [Frontend-admin — features & components](#frontend-admin--features--components)
- [Frontend-user — features & components](#frontend-user--features--components)
- [Testing](#testing)
- [Known issues](#known-issues)

---

## Stack

- **Backend**: NestJS (TypeScript), PostgreSQL (Prisma ORM), Redis (cache + BullMQ job queue), MinIO (object storage for images) — one API shared by both frontends
- **Frontend**: two Next.js 16 (App Router) apps, React 19, TypeScript, Tailwind CSS v4 — `frontend-user` (players) and `frontend-admin` (admins)
- **Real-time**: Server-Sent Events, fed by a BullMQ worker, for the admin live pull feed
- **Auth**: JWT access token + rotating refresh token
- **Testing**: Jest (backend, frontend-admin), Vitest (frontend-user) — all three apps enforce a **100% coverage threshold**

## Monorepo layout

```
Megaxus/
├── docker-compose.yml         # postgres, redis, minio, backend, frontend-user, frontend-admin
├── backend/                   # NestJS API
│   ├── src/                   # see Backend architecture
│   ├── prisma/                # schema.prisma, seed.js, migrations/
│   └── test/                  # e2e tests (require live Postgres + Redis)
├── frontend-user/             # Next.js — player-facing app (port 3000)
│   └── src/
└── frontend-admin/            # Next.js — admin dashboard (port 3002)
    └── src/
```

## Quick start — Docker

Requires Docker Desktop.

```bash
docker compose up --build
```

This starts Postgres, Redis, MinIO, the backend (runs pending Prisma migrations and seeds the admin account + system config automatically on boot), and both frontends.

- User app: http://localhost:3000
- Admin app: http://localhost:3002
- Backend API: http://localhost:3001/api
- MinIO console: http://localhost:9001 (`minioadmin` / `minioadmin`)

## Quick start — local development

Requires Node.js 22+, and Postgres + Redis running locally (or via Docker: `docker compose up -d postgres redis`). Note: `docker-compose.yml` maps Redis to host port **6380** (to avoid clashing with a locally-installed Redis on 6379) — set `REDIS_PORT=6380` in `.env` if you use the Dockerized Redis instead of a native install. MinIO (`docker compose up -d minio`) is only needed once you hit the image upload/serve endpoints — the backend boots fine without it.

**Backend**
```bash
cd backend
npm install
cp .env.example .env   # adjust DATABASE_URL / REDIS_HOST / REDIS_PORT if needed
npx prisma migrate dev   # also seeds the admin account + system config (see below)
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

Every app ships a committed `.env.example` (`.env.local.example` for the two Next.js apps) — copy it and adjust as needed (see [Quick start — local development](#quick-start--local-development) above for the exact `cp` commands).

### Backend (`backend/.env`)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | yes | – | Postgres connection string. Read by `PrismaService` via the `PrismaPg` adapter. |
| `JWT_SECRET` | yes | – | Signs + verifies access and refresh JWTs. Boot throws (`getOrThrow`) if unset. |
| `REDIS_HOST` / `REDIS_PORT` | no | `localhost` / `6379` | Cache + BullMQ queue connection. Dockerized Redis maps to host port **6380** — see the note above. |
| `JWT_ACCESS_EXPIRES_IN_SECONDS` | no | `900` (15 min) | Access token TTL. Also a system-config key with an env-override exception — see [System configuration](#system-configuration). |
| `REFRESH_TOKEN_EXPIRES_IN_SECONDS` | no | `604800` (7 days) | Refresh token TTL. Overrides system-config key `DEFAULT_REFRESH_EXPIRES_SECONDS` (name mismatch is intentional — see [System configuration](#system-configuration)). |
| `PORT` | no | `3001` | HTTP listen port. |
| `FRONTEND_USER_ORIGIN` / `FRONTEND_ADMIN_ORIGIN` | no | `http://localhost:3000` / `http://localhost:3002` | CORS allowlist, `credentials: true`. |
| `MINIO_ENDPOINT` / `MINIO_PORT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_BUCKET` / `MINIO_USE_SSL` | no | `localhost` / `9000` / `minioadmin` / `minioadmin` / `item-images` / `false` | Object storage for event/item images. Only needed when hitting the image upload/serve endpoints — the app boots fine without MinIO running. |
| `GLOBAL_THROTTLE_LIMIT` / `GLOBAL_THROTTLE_TTL_MS` | no | `40` / `60000` | Global rate limit (`ThrottlerModule.forRoot`, applied as `APP_GUARD`). Read from `process.env` at module load — **restart required to change**. |
| `GACHA_PULL_THROTTLE_LIMIT` / `GACHA_PULL_THROTTLE_TTL_MS` | no | `120` / `60000` | Rate limit on `POST /gacha/pull` and `/gacha/pull-bulk`. Same static-at-load caveat. |
| `ADMIN_FEED_RATE_LIMIT_MAX` / `ADMIN_FEED_RATE_LIMIT_DURATION_MS` | no | `10` / `1000` | BullMQ admin-feed queue rate limiter. Same static-at-load caveat. |

Everything else commented in `prisma/seed.js` (`PULL_COST`, `MAX_BULK_PULL`, `BCRYPT_ROUNDS`, `REFRESH_TOKEN_BYTES`, `RECENT_HISTORY_LIMIT`, `BACKSTOP_TTL_SECONDS`, and four frontend-only display keys) is **DB-backed system config**, not an env var — tune it via the `system_config` table or `prisma/seed.js`'s defaults, not `.env`. Full detail, including exactly which keys take effect live vs. only at boot: [System configuration](#system-configuration).

### Frontends (`frontend-user/.env.local`, `frontend-admin/.env.local`)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | `http://localhost:3001/api/v1` | Base URL the browser calls for the backend API. Inlined at build time — changing it requires a rebuild, not just a restart. |

## Creating an admin user

There is no public admin-registration endpoint by design (admin access shouldn't be self-service) — `POST /auth/register` never accepts a `role` field.

**Seeded admin account** — [backend/prisma/seed.js](backend/prisma/seed.js) upserts a ready-to-use admin on every `prisma migrate deploy`/`db seed` run (Docker runs this automatically on boot; local dev needs `npx prisma migrate dev` or `npm run db:seed`):
```
email:    admin@admin.com
password: password123!
```
The upsert is a no-op if the account already exists, so it never overwrites a password changed later via the app.

To promote any other account instead, register it normally, then either have an existing admin call `PUT /api/v1/admin/users/:id { "role": "admin" }`, or update the row directly:
```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```
The promoted account should log out and back in — though a role change actually takes effect on the *very next request*, since [the auth system](#auth-system) re-reads the user's role from the database on every call rather than trusting the JWT's `role` claim.

## Using the app

1. **Register** at `frontend-user`'s `/register` — new accounts start with 500 coins.
2. Promote that account to admin (see above), then log in at `frontend-admin`'s `/login` — the admin app has no register page and its login rejects non-admin accounts outright (decodes the JWT client-side, and if `role !== "admin"` clears the token and bounces back to `/login`).
3. As an **admin**, on `frontend-admin`'s `/events`: create a draft event (optionally with a banner image), add items with drop rates and optional artwork (items can be added incrementally — only the *active* total must equal exactly 100%), then click **Activate**.
4. As a **user**, browse `frontend-user`'s `/events` for a visual grid of active banners, or go straight to `/gacha`, pick the event, and pull — single pull or a 10x bulk "Summon," each triggering a cinematic rarity-reveal animation (skippable, speed-adjustable, with sound/haptics) before the result commits.
5. Check `frontend-user`'s `/profile` for your coin balance and paginated pull history.
6. As an admin, `frontend-admin`'s `/history` shows paginated history plus a live feed that updates in real time as pulls happen anywhere in the app (Server-Sent Events, fed by a BullMQ worker).
7. `frontend-admin`'s `/` (Dashboard) shows aggregate stats (total users, active/total events, pulls today, total pulls, total coins spent), a live rarity breakdown chart filterable by event, and a top-players leaderboard; `/users` lists all users with server-side email search and client-side role filtering, and drilling into one shows their recent pull history plus controls to adjust coins, ban/unban, promote to admin, or (if they have no pull history) delete outright.

## Architecture

No microservices, no API gateway, no separate proxy layer — one NestJS process serves both the public/player API and the admin API under one global prefix, backed by a single Postgres database and a single Redis instance (used for two unrelated purposes: drop-rate cache and BullMQ transport).

```
frontend-user (3000) ─┐
                       ├─► backend (3001) /api/*  ──► PostgreSQL (Prisma)
frontend-admin (3002) ─┘         │                └──► Redis (cache + BullMQ)
                                  ├─► MinIO (event/item images, streamed through the backend)
                                  └─► BullMQ worker (in-process) ─► SSE (admin dashboard)
```

| Concern | Choice | Why |
|---|---|---|
| Backend | NestJS (TypeScript) | Structured modules/DI; first-class libraries for every piece below (Prisma, `ioredis`, BullMQ, native SSE via `@Sse()`). |
| Primary datastore | PostgreSQL | Sole system of record. The core risk this system is built around — a race condition on a numeric balance (`users.coins`) — is exactly what relational transactions and row-level locking solve natively. `NUMERIC(5,2)` gives exact decimal drop rates; `CHECK` constraints give a DB-level integrity backstop. |
| ORM | Prisma | Type-safe schema/migrations; `updateMany` with a `WHERE` guard clause maps directly onto the atomic-update concurrency pattern (see [the algorithm deep dive](#the-gacha-algorithm--deep-dive)) without needing raw SQL for the hot path. |
| Cache | Redis (plain `ioredis` client) | Cache-aside for event/item drop-rate reads, invalidated on every admin write — never used for locking. |
| Job queue | BullMQ (Redis-backed) | Decouples "a gacha pull committed" from "deliver it to the admin dashboard" — a slow or failing delivery path can never block or fail a pull. |
| Real-time transport | Server-Sent Events | The admin dashboard only ever receives pushed updates, never sends data back over that channel — simpler than WebSockets, lower overhead than polling, and `EventSource` is a native browser API. |
| Object storage | MinIO (S3-compatible) | Event banners and item artwork — binary blobs don't belong in Postgres rows/backups; a container volume survives backend redeploys. |
| Auth | JWT (Passport `passport-jwt`) | Stateless, fits a decoupled REST API consumed by two separate frontends. The `role` claim (`user`/`admin`) gates admin routes but is never trusted on its own — see [Auth system](#auth-system). |

### Backend architecture

**Module map** (flat under `src/`, no `src/modules` wrapper):

| Module | Controllers | Providers/Services | Responsibility |
|---|---|---|---|
| `src/app.module.ts` | `AppController` | `AppService`, `APP_GUARD` → `ThrottlerGuard` | Root module. Wires `ConfigModule` (global), `ThrottlerModule` (global rate-limit guard), and every feature module. |
| `src/auth/` | `AuthController` | `AuthService`, `JwtStrategy` | Registration/login, JWT signing (async-configured `JwtModule`), exports the configured `JwtModule` for reuse (admin SSE token verification). |
| `src/users/` | `UsersController` | `UsersService` | Authenticated player self-service: profile, own pull history. |
| `src/events/` | `EventsController` | `EventsService` | Public (unauthenticated) read-only listing of active events + item drop-rate display, plus image byte streaming. |
| `src/gacha/` | `GachaController` | `GachaService`, `GachaCacheService` (exported) | Core gacha pull endpoints (`pull`, `pull-bulk`): atomic coin deduction, weighted roll, log write, admin-feed emit, `bestRarity`/`worstRarity` for bulk pulls. |
| `src/admin/` | `AdminEventsController`, `AdminItemsController`, `AdminHistoryController`, `AdminUsersController`, `AdminStatsController` | matching services | All admin-only CRUD (events/items/users), global history browsing + live SSE feed, dashboard stats. |
| `src/system-config/` (`@Global()`) | `ConfigController` (physically under `src/config/`, wired into this module) | `SystemConfigService` (exported) | DB/env/default-fallback config resolution (`GET /api/config`). |
| `src/queue/` | — | `AdminFeedProducer`, `AdminFeedProcessor`, `AdminFeedService` | BullMQ queue registration + producer/consumer/in-process pub-sub bridging pulls → SSE. |
| `src/redis/` (`@Global()`) | — | `REDIS_CLIENT` (`ioredis` factory), `RedisLifecycle` | Global Redis client provider + graceful `quit()` on shutdown. |
| `src/prisma/` | — | `PrismaService` | Prisma client wrapper (connect/disconnect lifecycle hooks). |
| `src/storage/` | — | `StorageService` | Thin MinIO wrapper for event/item image upload, streaming read, and removal. |
| `src/common/` | — | `JwtAuthGuard`, `RolesGuard`, `@Roles()`, `@Public()`, `@CurrentUser()`, `buildCursorArgs`/`paginate` | Cross-cutting auth guards/decorators and the shared cursor-pagination helper. |

Root-level: `src/app.controller.ts` / `src/app.service.ts` — trivial `GET /` → `"Hello World!"`. `src/main.ts` — bootstrap.

**HTTP layer:**
- **Port**: `3001` (env `PORT`).
- **Global prefix**: `/api`, plus URI versioning (`app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })`) — every route is implicitly `/api/v1`, except `@Version(VERSION_NEUTRAL)` (health check at `/api/health`, so probes survive version bumps).
- **Response format**: raw JSON directly from controller methods. No `{ success, data }` envelope anywhere — e.g. `POST /api/v1/gacha/pull` returns `{ item, remainingCoins }` directly.
- **Error format**: no global exception filter. Nest's default: `{ statusCode, message, error }`, `message` a string or array of strings for validation errors.
- **Validation**: global `ValidationPipe` = `{ whitelist: true, transform: true, forbidNonWhitelisted: true }` — unknown fields → 400; DTO types coerced.
- **Security headers**: `helmet()` globally, `crossOriginResourcePolicy: { policy: 'cross-origin' }` so images can be loaded cross-origin by both frontends.
- **CORS**: `origin: [FRONTEND_USER_ORIGIN, FRONTEND_ADMIN_ORIGIN], credentials: true`.
- **Rate limiting**: `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 40 }])` as `APP_GUARD` — 40 req/min/IP default; 10/min on register/login/refresh; 120/min on gacha pull endpoints.

**Cursor pagination convention** — implemented once in `src/common/pagination.ts`, used by every paginated list endpoint:

```ts
function buildCursorArgs(cursor: string | undefined, limit: number) {
  return { take: limit + 1, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) };
}
function paginate<T extends { id: string }>(rows: T[], limit: number) {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1].id : null;
  return { items, nextCursor };
}
```

Fetch `limit + 1` rows, peek whether there's an extra, slice it off, use the last returned row's `id` as `nextCursor`. Response shape is always `{ items: [...], nextCursor: string | null }`. Used by `GET /user/history`, `GET /admin/history`, `GET /admin/users`, all ordered `createdAt: 'desc'`.

**Directory structure:**

```
backend/
├── src/
│   ├── admin/
│   │   ├── dto/                     event, item, create-user, update-user, admin-history-query, admin-user-query DTOs
│   │   ├── admin-events.controller.ts / .service.ts
│   │   ├── admin-items.controller.ts / .service.ts
│   │   ├── admin-history.controller.ts / .service.ts   (list = guarded REST; stream = SSE, manual token auth)
│   │   ├── admin-users.controller.ts / .service.ts
│   │   ├── admin-stats.controller.ts / .service.ts
│   │   ├── drop-rate.util.ts                            (assertDropRatesDoNotExceed100 / assertDropRatesEqual100)
│   │   └── admin.module.ts
│   ├── auth/
│   │   ├── dto/                     register.dto.ts, login.dto.ts
│   │   ├── auth.controller.ts / .service.ts
│   │   ├── jwt.strategy.ts           exports AuthenticatedUser
│   │   └── auth.module.ts
│   ├── common/
│   │   ├── decorators/               roles.decorator.ts, current-user.decorator.ts
│   │   ├── guards/                   jwt-auth.guard.ts, roles.guard.ts
│   │   └── pagination.ts             buildCursorArgs, paginate
│   ├── events/                       events.controller.ts / .service.ts / .module.ts  (public: list active, get by id, images)
│   ├── gacha/
│   │   ├── dto/                      pull.dto.ts, pull-bulk.dto.ts
│   │   ├── gacha.controller.ts / .service.ts / .module.ts
│   │   ├── gacha-cache.service.ts     Redis cache-aside for event items
│   │   └── weighted-random.ts         pickWeightedRandom
│   ├── prisma/                       prisma.service.ts / .module.ts
│   ├── queue/
│   │   ├── admin-feed.producer.ts     BullMQ producer
│   │   ├── admin-feed.processor.ts    BullMQ WorkerHost consumer
│   │   ├── admin-feed.service.ts      RxJS Subject bridging worker → SSE
│   │   ├── queue.constants.ts         ADMIN_FEED_QUEUE = 'admin-feed'; rate-limit env vars
│   │   └── queue.module.ts
│   ├── redis/                        redis.module.ts            @Global, REDIS_CLIENT ioredis provider
│   ├── system-config/                system-config.service.ts / .module.ts   @Global, DB/env/default config resolution
│   ├── config/                       config.controller.ts       GET /api/config — served by SystemConfigModule
│   ├── users/
│   │   ├── dto/history-query.dto.ts
│   │   └── users.controller.ts / .service.ts / .module.ts
│   ├── app.controller.ts / app.service.ts / app.module.ts
│   └── main.ts
├── prisma/
│   ├── schema.prisma
│   ├── seed.js
│   └── migrations/
├── generated/prisma/                  custom Prisma client output (not the default @prisma/client path — every import is a relative path, e.g. `'../../generated/prisma'`)
└── test/                              e2e: app.e2e-spec.ts, gacha-concurrency.e2e-spec.ts
```

### Frontend-admin architecture

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Ant Design icons only (no full component library), Jest + SWC + Testing Library. No React Query/SWR/Redux/Zustand — pages fetch via custom hooks built on plain `useState`/`useEffect`.

**Root layout** (`src/app/layout.tsx`): Geist/Geist Mono fonts, wraps `<NavBar/>` + `<main>` in a single global context provider, `ConfirmProvider`:

```tsx
<body className="min-h-full md:flex">
  <ConfirmProvider>
    <NavBar />
    <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
  </ConfirmProvider>
</body>
```

`ConfirmProvider`/`useConfirm()` (`src/components/molecules/ConfirmDialog.tsx`) is a promise-based replacement for `window.confirm`, used everywhere a destructive action needs a modal confirmation:
```ts
export interface ConfirmOptions { title?: string; message: ReactNode; confirmLabel?: string; cancelLabel?: string; danger?: boolean; }
export function ConfirmProvider({ children }: { children: ReactNode })
export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean>
```
Any hook/component calls `await confirm({...})` and gets the user's choice, rendered through the shared `Dialog` component. Gates: event delete, item delete, user delete, ban/unban, and role changes.

**Routes** (no `middleware.ts` — every route protection is client-side):

| Path | Renders | Guarded? |
|---|---|---|
| `/` | Dashboard: 6 stat tiles, live rarity chart, leaderboard | Yes — `useRequireAdmin()` |
| `/login` | Email+password login; decodes the JWT client-side and rejects non-admin roles without saving the token | No |
| `/events` | Event list, search/status filters, activate/deactivate/edit/delete, item management dialog | Yes |
| `/users` | Cursor-paginated user list, email search + client-side role filter, ban/unban/delete, create/edit dialogs | Yes |
| `/history` | Live SSE feed + cursor-paginated history browser | Yes |

`useRequireAdmin()` (`src/lib/useRequireAdmin.ts`) returns `{ user: JwtPayload | null, checking: boolean }`. On mount: no user → redirect to `/login`; user present but `role !== "admin"` → clear the token and redirect to `/login`; otherwise resolve. Every guarded page destructures both fields and renders a page-specific skeleton while `checking`. The login page itself never calls this hook (avoids a redirect loop); `NavBar` independently checks `pathname === "/login"` to hide itself there.

**Component organization** — atomic design, plus a feature-module layer:
- `src/components/atoms/` — `Badge`, `Button`, `IconButton`, `Input`, `Select`, `Skeleton`/`TableSkeleton`
- `src/components/molecules/` — `Card`, `ConfirmDialog`, `Dialog`, `FormField`, `StatCard`
- `src/components/organisms/` — `NavBar`
- `src/features/<domain>/` (`events`, `users`, `history`, `stats`) — each with `api.ts` (thin `apiFetch`/`apiFetchBlob` wrappers, the real "service layer"), `types.ts`, `hooks/`, `components/`

**Core infrastructure** (`src/lib/`):
- `api.ts` — `apiFetch<T>` (attaches `Authorization: Bearer`, omits `Content-Type` for `FormData` bodies so the browser sets the multipart boundary, throws `ApiError` on non-2xx), `apiFetchBlob(path)` (binary fetch for images), `sseUrl(path)` (builds `?token=` URL for `EventSource`, which can't set custom headers).
- `auth.ts` — `localStorage` key `"gacha_token"`; `decodeToken` is display-only (no signature verification — the source comment is explicit that the server is the real trust boundary); `getCurrentUser()` additionally checks local `exp` expiry.
- `config.ts` — `getConfig()` fetches `GET /api/config` once, caches for the page's lifetime.

### Frontend-user architecture

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Vitest + Testing Library. No `middleware.ts` — every page is `"use client"` and self-guards via `useRequireAuth()`.

**Root layout** (`src/app/layout.tsx`): Geist/Geist Mono fonts, `<NavBar/>` + `<main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">`, no providers.

**Routes:**

| Path | Renders | Guarded? |
|---|---|---|
| `/` | Redirect only — `getCurrentUser() ? /gacha : /login` | No |
| `/login` | Email+password login | No |
| `/register` | Email+password registration ("New accounts start with 500 coins.") | No |
| `/events` | Grid of active-event banner cards, links into `/gacha?eventId=` | Yes |
| `/gacha` | Event picker, drop-rate list, single/bulk pull, cinematic reveal | Yes |
| `/profile` | Coin balance + paginated pull history | Yes |

`useRequireAuth()` (`src/lib/useRequireAuth.ts`) — identical shape/contract to the admin app's hook, minus the role check: no user → redirect to `/login`, otherwise resolve `{ user, checking }`.

**Component organization:**
- `src/components/atoms/` — `Button`, `Input`, `Checkbox`
- `src/components/molecules/` — `AuthCard` (shared gradient-bordered card chrome for login/register), `CoinBadge`
- `src/components/organisms/` — `NavBar`
- `src/components/Skeleton.tsx` — `Skeleton`, `TableSkeleton`
- `src/features/{auth,events,gacha,profile}/` — each with `api.ts`, `types.ts`, `hooks/`, `components/`

**Core infrastructure** (`src/lib/`):
- `api.ts` — `apiFetch<T>` with an **automatic silent token-refresh flow**: on a `401`, if a refresh token exists and this isn't already a retry, it calls `POST /auth/refresh`, and on success replays the original request once with the new access token. Concurrent 401s share one in-flight refresh via a module-level promise, so multiple simultaneous requests never each try to rotate the refresh token. If the refresh itself fails, the whole session is cleared.
- `auth.ts` — dual-token storage: `saveSession({token, refreshToken})`/`clearSession()` are the primary lifecycle functions; individual `saveToken`/`getToken`/`clearToken` still exist for narrower use. `decodeToken`/`getCurrentUser` behave the same as the admin app's (display-only decode, local `exp` check).
- `config.ts` — `getConfig()`, same shape and caching as the admin app.
- `itemIcon.ts` — `getItemIcon(rarity)` (falls back to a rarity SVG), `getItemImageSrc(item)` / `getEventImageSrc(event)` (prefer an admin-uploaded image, fall back to the icon/a gradient placeholder).

The single biggest subsystem in this app — the cinematic gacha-reveal animation — is covered in full under [Frontend-user — features & components](#frontend-user--features--components).

## Key design decisions (ADRs)

**ADR-001 — Stack: NestJS, PostgreSQL, Prisma, Redis, BullMQ, SSE, JWT.** See the [Architecture](#architecture) stack table above for the reasoning behind each choice. Implication: do not introduce a second datastore for anything already covered here without a concrete requirement Postgres/Redis can't satisfy.

**ADR-002 — Atomic guarded `UPDATE` for coin deduction — not `SELECT ... FOR UPDATE`, not optimistic locking.** Full mechanics in [the algorithm deep dive](#the-gacha-algorithm--deep-dive). In short: `UPDATE users SET coins = coins - :amount WHERE id = :user_id AND coins >= :amount` folds the balance check and the deduction into one atomic statement — no separate read step, so there's no window for a race. `SELECT ... FOR UPDATE` was rejected (extra round trip, lock held across two statements, for no additional correctness). Optimistic locking (a `version` column + retry) was rejected because it pushes retry logic onto the caller for a case a single atomic statement already resolves server-side. Implication: never reintroduce a `findUnique` balance check followed by a separate `update` — that reopens the exact race window this design closes.

**ADR-003 — Weighted random: Linear Prefix Sum, not Binary Search or the Alias Method.** Gacha events have small, admin-curated item lists (single digits to a few dozen), so a linear scan is trivially fast — the cost of a pull is dominated by the DB transaction, not the roll. Binary search solves a problem that doesn't exist at this scale. The Alias Method (O(1) roll, O(N) setup) was considered and rejected: its precomputed table must be correctly rebuilt every time an admin edits a drop rate, or rolls silently diverge from the configured rates — exactly the fairness bug this system exists to prevent. Higher end-user concurrency doesn't change this calculus: it scales how many times per second the algorithm runs, not the cost of a single run — the actual bottleneck at scale is the DB transaction (ADR-002). Implication: do not swap in the Alias Method or a Fenwick-tree/binary-search structure without an actual measured bottleneck.

**ADR-004 — Drop-rate sum validation: draft vs. active lifecycle.** Events have two states gated by `isActive`: **draft** (default on creation — item writes rejected only if the running total would *exceed* 100%) and **active** (item writes must keep the total exactly 100%; activation itself is rejected unless the current items already sum to exactly 100%). Requiring every write to already sum to 100% would make incremental admin setup impossible; splitting draft vs. active lets admins build up items one at a time while guaranteeing a *live* event's odds are always well-defined. Pull-time defense-in-depth: `GachaService.pull` re-validates the sum immediately before rolling, even though activation already enforced it once — this catches the gap write-time checks don't cover (deleting an item from an active event is allowed and can leave it below 100%). Implication: deactivating an event never re-validates anything — intentionally asymmetric with activation, since a draft is allowed to be partial/inconsistent.

**ADR-005 — Drop-rate caching: cache-aside with write-side invalidation, plus a backstop TTL.** `GachaCacheService` caches an event's item list under `event:${eventId}:items`, populated on read-miss, explicitly deleted on every admin write that could change it. A TTL-based cache alone would have a staleness window bounded by the TTL; invalidate-on-write means the cache is either absent (falls through to Postgres, always correct) or exactly correct. A 24-hour backstop TTL (`BACKSTOP_TTL_SECONDS`) was later added purely as defense-in-depth — every current write path was audited and confirmed to call `invalidate()` correctly, so this TTL isn't fixing a bug, it just means a *future* write path that forgets to invalidate self-heals within 24h instead of staying stale indefinitely. Implication: do not treat the TTL as a substitute for invalidation discipline.

**ADR-006 — Real-time admin monitoring: SSE fed by BullMQ; cursor pagination for history browsing.** `POST /gacha/pull` commits its transaction, then (outside the transaction, best-effort, try/catch) enqueues a BullMQ job; a worker consumes it and pushes into an in-process RxJS `Subject`, which the admin history controller exposes as a live SSE stream. `GET /admin/history` (cursor-paginated) remains the mechanism for initial load and scrolling back — SSE is purely "new since I started watching." A Redis/BullMQ failure here is only logged, never surfaced to the player, since the pull is already durable in Postgres. **Single-instance limitation, by design and explicitly documented in code**: the bridge from BullMQ job to SSE push is an in-process `Subject` — on more than one backend instance, only the instance that ran the worker for a given job delivers it to *its own* connected clients. Scaling out would require Redis pub/sub fan-out instead; not implemented, documented as the known scale-out path. Implication: do not deploy more than one backend instance and assume the live feed works correctly across instances — it doesn't yet.

**ADR-007 — Item/event images: MinIO object storage, header-authenticated proxy, no public bucket or query-token auth.** `GachaItem.imageKey`/`GachaEvent.imageKey` (nullable) store an object key in a MinIO bucket. Images are admin-managed: uploaded via multipart `POST`, served via `GET` that streams the object through the backend as a `StreamableFile` rather than exposing MinIO directly — the admin frontend fetches with a normal `Authorization: Bearer` header (via `fetch`) and renders a blob URL, since an `<img src>` can't attach an auth header. A public bucket would mean images are reachable by anyone with the URL, with no auth at all — the default-secure option was chosen instead. The object key encodes the extension (`items/<itemId>-<timestamp>.<ext>`) rather than a separate MIME column; the old object is deleted on replace, not versioned. Implication: scoped to admin tooling for management — `frontend-user` renders these same images (via public, unauthenticated `GET /events/:id/image` / `GET /events/items/:id/image` routes) with a rarity-SVG/gradient-placeholder fallback if none is set.

## Database schema

```
┌───────────────────────┐          ┌────────────────────────┐
│ users                 │          │ gacha_events           │
├───────────────────────┤          ├────────────────────────┤
│ id            PK      │          │ id             PK      │
│ email         UNIQUE  │          │ name                   │
│ password_hash         │          │ is_active   boolean    │
│ role          enum    │          │   DEFAULT false        │
│ coins         INTEGER │          │ starts_at              │
│   DEFAULT 500          │          │ ends_at                │
│   CHECK (coins >= 0)   │          │ image_key   nullable   │
│ is_banned     boolean │          │ created_at             │
│   DEFAULT false        │          └───────────┬────────────┘
│ refresh_token_hash     │                      │ 1
│ refresh_token_expires_at │                    │
│ created_at             │                      │ N
└───────────┬───────────┘          ┌──────────▼─────────────┐
            │ 1                    │ gacha_items             │
            │                      ├─────────────────────────┤
            │ N                    │ id             PK       │
┌───────────▼───────────┐          │ event_id      FK        │
│ gacha_logs             │◄─────────┤ name                    │
├───────────────────────┤   N   │ rarity        string   │
│ id            PK       │           │ drop_rate  NUMERIC(5,2)│
│ user_id       FK       │           │ image_key   nullable   │
│ event_id      FK       │           │ created_at             │
│ item_id       FK       │           └────────────┬────────────┘
│ coins_spent   INTEGER │                        │ N
│ created_at             │◄───────────────────────┘
└───────────────────────┘

system_config
├─ key    PK (string)
├─ value  JSON
├─ created_at
└─ updated_at
```

`Role` enum: `user | admin` — two roles only, no multi-role RBAC.

### `User` (`@@map("users")`)

```prisma
model User {
  id                    String    @id @default(uuid())
  email                 String    @unique
  passwordHash          String    @map("password_hash")
  role                  Role      @default(user)
  coins                 Int       @default(500)
  isBanned              Boolean   @default(false) @map("is_banned")
  refreshTokenHash      String?   @map("refresh_token_hash")
  refreshTokenExpiresAt DateTime? @map("refresh_token_expires_at")
  createdAt             DateTime  @default(now()) @map("created_at")

  gachaLogs GachaLog[]
  @@map("users")
}
```
`passwordHash` (bcrypt) and both refresh-token fields are never included in any API response — every user-returning endpoint routes through a projection helper (`toUserSummary`) that excludes credential fields; see [Known issues](#known-issues) for the one place this was previously missed and has since been fixed.

### `GachaEvent` (`@@map("gacha_events")`)

```prisma
model GachaEvent {
  id        String   @id @default(uuid())
  name      String
  isActive  Boolean  @default(false) @map("is_active")
  startsAt  DateTime @map("starts_at")
  endsAt    DateTime @map("ends_at")
  imageKey  String?  @map("image_key")
  createdAt DateTime @default(now()) @map("created_at")

  items     GachaItem[]
  gachaLogs GachaLog[]
  @@map("gacha_events")
}
```
`endsAt` must be after `startsAt` (`assertDateRangeValid`). `isActive` defaults to `false` (draft) — an early migration briefly defaulted it to `true` before this was corrected.

### `GachaItem` (`@@map("gacha_items")`)

```prisma
model GachaItem {
  id        String   @id @default(uuid())
  eventId   String   @map("event_id")
  name      String
  rarity    String
  dropRate  Decimal  @map("drop_rate") @db.Decimal(5, 2)
  imageKey  String?  @map("image_key")
  createdAt DateTime @default(now()) @map("created_at")

  event     GachaEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  gachaLogs GachaLog[]
  @@index([eventId])
  @@map("gacha_items")
}
```
`rarity` is a **plain string, not an enum** — there is no `Rarity` enum anywhere in the schema; both frontends independently normalize whatever string the backend/admin provides (see [the algorithm deep dive](#the-gacha-algorithm--deep-dive) and the frontend-user rarity model). `dropRate` is `NUMERIC(5,2)` — exact decimal, avoids float-sum rounding bugs when validating a 100% total.

### `GachaLog` (`@@map("gacha_logs")`) — immutable pull record

```prisma
model GachaLog {
  id         String   @id @default(uuid())
  userId     String   @map("user_id")
  eventId    String   @map("event_id")
  itemId     String   @map("item_id")
  coinsSpent Int      @map("coins_spent")
  createdAt  DateTime @default(now()) @map("created_at")

  user  User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  event GachaEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  item  GachaItem  @relation(fields: [itemId], references: [id], onDelete: Restrict)
  @@index([userId, createdAt])
  @@index([createdAt])
  @@map("gacha_logs")
}
```
`coinsSpent` is a **snapshot** of cost at pull time, not derived from a join — historical logs stay accurate even if `PULL_COST` changes later. `gacha_logs` is append-only — no soft-delete column, nothing ever updates or deletes a row. `item_id`'s `onDelete: Restrict` means an item that's ever been awarded to a player can never be deleted (enforced at the DB level, and independently checked in application code).

### `SystemConfig` (`@@map("system_config")`)

```prisma
model SystemConfig {
  key       String   @id
  value     Json
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  @@map("system_config")
}
```
Flat key/value store, no foreign keys. Read entirely into memory on module init rather than queried per-key — see [System configuration](#system-configuration).

### Constraints

| Constraint | Table | Definition | Why |
|---|---|---|---|
| `users_coins_nonnegative` | `users` | `CHECK (coins >= 0)` | Raw-SQL migration, not expressible in `schema.prisma` directly. Defense-in-depth alongside the guarded `updateMany` in the pull path. |
| `gacha_items.event_id → gacha_events.id` | `gacha_items` | `onDelete: Cascade` | Deleting an event with zero pull logs also deletes its items. |
| `gacha_logs.item_id → gacha_items.id` | `gacha_logs` | `onDelete: Restrict` | An item awarded to a player can never be deleted. |
| Drop-rate sum = 100% for active events | `gacha_items` (per `event_id`) | Application-level only (`assertDropRatesEqual100`) | Cross-row aggregate — a Postgres `CHECK` can't express this per row. |

### Seed script (`prisma/seed.js`)

Idempotent **upsert** of one bootstrap admin account plus 18 `system_config` rows (see [System configuration](#system-configuration) for the full list). Docker Compose runs `npx prisma migrate deploy && npx prisma db seed` on every container boot — a no-op on the admin account if it already exists (never overwrites a changed password), and `update: {}` on every config row (never overwrites a value an admin has changed via direct DB access).

## Auth system

### Flow

1. Client calls `POST /auth/register` or `POST /auth/login`; both return `{ user?, token, refreshToken }`.
2. `AuthService` validates credentials against `users.password_hash` (bcrypt) and signs the access JWT.
3. Client sends `Authorization: Bearer <token>` on every subsequent request.
4. `JwtAuthGuard` (`AuthGuard('jwt')`) triggers `JwtStrategy.validate`, which **re-fetches the user from the database on every request** — it never trusts the token's `role`/`email` claims for authorization.
5. When the access token expires, the client calls `POST /auth/refresh` with the refresh token to mint a new pair without a full re-login. `POST /auth/logout` invalidates the stored refresh token.

### JWT payload

```ts
{ sub: <user.id>, email: <user.email>, role: <user.role> }
```
Signed with `JWT_SECRET`, expires after `JWT_ACCESS_EXPIRES_IN_SECONDS` (default `900`, 15 minutes).

### Refresh tokens

- **Shape**: `<userId>.<opaque-secret>` — the id prefix lets the server locate the row without a reversible lookup; only `bcrypt.hash(secret)` is persisted (`users.refresh_token_hash`), never the raw secret.
- **Expiry**: `users.refresh_token_expires_at`, controlled by `REFRESH_TOKEN_EXPIRES_IN_SECONDS` (default `604800`, 7 days).
- **Rotation**: every successful `POST /auth/refresh` mints a brand-new `{ token, refreshToken }` pair and overwrites the stored hash — a previously-presented refresh token can never be reused.
- **Revocation**: `POST /auth/logout` clears `refresh_token_hash`/`refresh_token_expires_at`.
- Every refresh call re-checks `isBanned` and the stored hash/expiry from the database.

### Why claims aren't trusted

`JwtStrategy.validate(payload)` re-queries the database by `payload.sub` for `{ id, email, role, isBanned }` on **every request**, and throws `UnauthorizedException('Account is unavailable')` if the user no longer exists or `isBanned` is `true`. Effects: a ban takes effect immediately (not at token expiry), and a role change takes effect immediately. The value exposed to controllers via `@CurrentUser()` is freshly read from the database, not decoded from the JWT body — one extra DB read per authenticated request, accepted deliberately for instant ban/role enforcement.

### Guards and decorators

| Item | Purpose |
|---|---|
| `JwtAuthGuard` | `extends AuthGuard('jwt')` |
| `RolesGuard` | Reads `@Roles()` metadata off the handler/class; no metadata → allow; otherwise checks `request.user.role`, throws `ForbiddenException('Insufficient role permissions')`. Must run after `JwtAuthGuard`. |
| `@Roles(...roles: Role[])` | Sets the roles metadata a `RolesGuard` checks. |
| `@CurrentUser()` | Pulls `request.user` (the freshly-fetched `{ id, email, role }`). |
| `@Public()` | Opts a route out of class-level guards — used specifically for the SSE stream route, which can't carry a normal `Authorization` header. |

There is no `@Public()` usage for ordinary public routes — those are public simply by omitting `@UseGuards` entirely (e.g. auth, public events listing).

### SSE endpoint auth

`GET /admin/history/stream` can't use the standard `Authorization` header because native `EventSource` can't set custom headers:
1. Client connects with the token as a query param: `?token=<jwt>`.
2. The route is marked `@Public()`; the controller reads `?token=` and calls `jwtService.verify(token)` manually.
3. It manually re-queries the database for the user's current `role`/`isBanned`, throwing `UnauthorizedException` unless a non-banned admin.

Test coverage exercises invalid/expired tokens, a subject that no longer exists, a banned admin with an otherwise-valid token, and a user demoted from admin after token issuance. Passing a JWT as a URL query param carries the usual caveats (access logs, browser history, proxy logs) — an accepted tradeoff for this single low-traffic admin-only endpoint.

### Rate limiting

Global default: 40 req/min/IP. Overridden to 10/min on `register`/`login`/`refresh`. Gacha pull endpoints default to 120/min. All four numbers are read straight from `process.env` at module-load time — they also exist as `system_config` rows, but editing the DB row alone has no effect (see [System configuration](#system-configuration)).

### Bootstrap admin

No public admin self-registration endpoint — `POST /auth/register` never accepts a `role` field. See [Creating an admin user](#creating-an-admin-user) for the seeded account and promotion path.

## The gacha algorithm — deep dive

This is the core of the system: what happens, step by step, when a player spends coins on a pull. All source lives under `backend/src/gacha/`.

### `GachaService.pull(userId, eventId)` — single pull

```ts
async pull(userId: string, eventId: string) {
  const { event, items } = await this.loadActiveEventWithItems(eventId);
  const pullCost = this.systemConfig.get<number>('PULL_COST');

  const result = await this.prisma.$transaction(async (tx) => {
    await this.deductCoinsOrThrow(tx, userId, pullCost);

    const picked = pickWeightedRandom(items);

    const log = await tx.gachaLog.create({
      data: { userId, eventId, itemId: picked.id, coinsSpent: pullCost },
      include: { item: true },
    });

    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, coins: true },
    });

    return { log, user };
  });

  await this.emitPull({ /* ... admin-feed payload ... */ });

  return {
    item: this.toItemResponse(result.log.item),
    remainingCoins: result.user.coins,
  };
}
```

Step by step:

1. **`loadActiveEventWithItems(eventId)`** runs *outside* the transaction:
   - Fetches the event; if missing or `!event.isActive` → `404 NotFoundException('Gacha event not found or inactive')`.
   - Reads the item list via `GachaCacheService.getEventItems` — a cache-aside read (see below); an empty list → `400 BadRequestException('This event has no configured items')`.
   - Runs `assertDropRatesEqual100` on the item list as defense-in-depth — even though activation already enforced this once, deleting an item post-activation can silently break it, and a pull must never roll against odds that don't sum to 100%.
2. **`pullCost`** is resolved per-call from `SystemConfigService` (env → DB → default 10), not hard-coded — so an admin can change the price without a redeploy.
3. **Everything else runs inside one `prisma.$transaction`**:
   - `deductCoinsOrThrow` — the atomic guarded update (below).
   - `pickWeightedRandom(items)` — the roll itself, using the already-fetched item list (no extra DB read inside the transaction).
   - `tx.gachaLog.create(...)` — the permanent, immutable pull record.
   - A post-deduction balance read, for the response.
4. **After commit, outside the transaction**: the admin-feed emit (SSE pipeline) is fire-and-forget inside a try/catch — a failure here is only logged, never surfaced to the client, and never rolls back the already-committed pull.
5. **Response**: `{ item: { id, name, rarity }, remainingCoins }`.

### The atomic coin-deduction mechanism

```ts
private async deductCoinsOrThrow(tx: Prisma.TransactionClient, userId: string, amount: number): Promise<void> {
  const deducted = await tx.user.updateMany({
    where: { id: userId, coins: { gte: amount } },
    data: { coins: { decrement: amount } },
  });
  if (deducted.count === 0) {
    throw new BadRequestException('Insufficient coins');
  }
}
```

This is the Prisma equivalent of:
```sql
UPDATE users SET coins = coins - :amount WHERE id = :user_id AND coins >= :amount;
```

One round trip, no separate read-then-write step. `updateMany` (not `update`) is used specifically because the `WHERE` clause includes a data condition (`coins >= amount`) beyond just the primary key — `update` requires a unique-only `where` and would throw if zero rows matched, whereas `updateMany` returns `{ count: 0 }`, which the code checks explicitly. If `count === 0`, either the user doesn't exist or (far more commonly) their balance was insufficient at the exact moment of the guarded update.

Because there is no read step before this statement, there is no window in which two concurrent requests could both read a stale "sufficient" balance and both proceed to deduct: Postgres's row-level lock on the `UPDATE` serializes concurrent attempts against the same user row, and each one re-evaluates `coins >= amount` against the current (post-lock) value. `CHECK (coins >= 0)` on `users.coins` is a DB-level backstop, independent of this application logic entirely. This exact mechanism is proven correct by the concurrency e2e test described in [Testing](#testing).

The whole pull — deduct → roll → log write → balance re-read — happens inside one transaction; nothing is returned to the client and no BullMQ job is enqueued until `COMMIT` succeeds.

### Drop-rate validation

```ts
function sumOf(rates: (Decimal | number | string)[]): Decimal {
  return rates.reduce<Decimal>((sum, rate) => sum.plus(rate), new Decimal(0));
}

export function assertDropRatesDoNotExceed100(rates): void {
  const total = sumOf(rates);
  if (total.greaterThan(new Decimal(100))) {
    throw new BadRequestException(`Drop rates for this event cannot exceed 100% (would be ${total.toString()}%)`);
  }
}

export function assertDropRatesEqual100(rates): void {
  const total = sumOf(rates);
  if (!total.equals(new Decimal(100))) {
    throw new BadRequestException(`Drop rates for this event must sum to exactly 100% (currently ${total.toString()}%)`);
  }
}
```

Uses Prisma's `Decimal` class throughout (`.plus()`, `.greaterThan()`, `.equals()`) — never native `+`/`===` on floats — so summing e.g. `33.34 + 33.33 + 33.33` compares exactly against `100` without binary floating-point rounding error. `assertDropRatesDoNotExceed100` gates writes while an event is a draft; `assertDropRatesEqual100` gates activation, writes to an already-active event, and the pull-time defense-in-depth check.

### `pickWeightedRandom` — the weighted-random roll itself

```ts
export interface WeightedItem { id: string; dropRate: number; }

export function pickWeightedRandom<T extends WeightedItem>(items: T[]): T {
  if (items.length === 0) {
    throw new Error('Cannot pick a weighted random item from an empty list');
  }

  const totalWeight = items.reduce((sum, item) => sum + item.dropRate, 0);
  const roll = Math.random() * totalWeight;

  let cumulative = 0;
  for (const item of items) {
    cumulative += item.dropRate;
    if (roll < cumulative) return item;
  }

  // Floating point edge case (roll landed exactly on totalWeight): fall back to the last item.
  return items[items.length - 1];
}
```

This is the **Linear Prefix Sum** algorithm (see ADR-003 for why this over binary search or the Alias Method):

1. `totalWeight` sums every item's `dropRate` (already converted from Prisma `Decimal` to a plain `Number` by the cache layer — the roll itself doesn't need `Decimal` precision, only the 100%-sum validation does).
2. `roll = Math.random() * totalWeight` — a uniform random float in `[0, totalWeight)`.
3. **The linear walk**: accumulate `cumulative` item by item, and return the first item where `roll < cumulative`. Each item occupies a `[cumulative_before, cumulative_after)` sub-interval of `[0, totalWeight)` proportional to its `dropRate` — the roll falls into exactly one interval, so an item with `dropRate: 1` (out of 100) has exactly a 1-in-100 chance across many rolls.
4. If the loop exhausts without any `roll < cumulative` ever being true — only possible if `roll` lands exactly on `totalWeight` via floating-point rounding, since `Math.random()` returns `[0, 1)` — the function explicitly falls back to the last item, rather than returning `undefined`.

This is proven correct at scale by a **200,000-trial statistical convergence test** (see [Testing](#testing)) and exercised for edge cases (empty list, single 100%-weight item, the exact-`totalWeight` boundary, and a `dropRate: 0` item that must never be selected).

### Bulk pull — `GachaService.pullBulk`

```ts
async pullBulk(userId: string, eventId: string, count: number) {
  const maxBulk = this.systemConfig.get<number>('MAX_BULK_PULL');
  if (count > maxBulk) {
    throw new BadRequestException(`Cannot pull more than ${maxBulk} items at once`);
  }

  const { event, items } = await this.loadActiveEventWithItems(eventId);
  const pullCost = this.systemConfig.get<number>('PULL_COST');
  const totalCost = pullCost * count;
  const createdAt = new Date();

  const result = await this.prisma.$transaction(async (tx) => {
    await this.deductCoinsOrThrow(tx, userId, totalCost);

    const picked = Array.from({ length: count }, () => pickWeightedRandom(items));

    await tx.gachaLog.createMany({
      data: picked.map((item) => ({ userId, eventId, itemId: item.id, coinsSpent: pullCost, createdAt })),
    });

    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, coins: true } });
    return { picked, user };
  });

  const best = result.picked.reduce((rarest, item) => (item.dropRate < rarest.dropRate ? item : rarest));
  const worst = result.picked.reduce((commonest, item) => (item.dropRate > commonest.dropRate ? item : commonest));

  await Promise.all(result.picked.map((item) => this.emitPull({ /* ... */ })));

  return {
    items: result.picked.map((item) => this.toItemResponse(item)),
    bestRarity: best.rarity,
    worstRarity: worst.rarity,
    remainingCoins: result.user.coins,
  };
}
```

Key mechanics:

- **Max-count enforcement happens before the event even loads**, against `MAX_BULK_PULL` (system config, default 10). Note that the request DTO itself only bounds `count` to `1..100` via `class-validator` — the real business-rule cap (`MAX_BULK_PULL`) is enforced separately here, so a request with `count: 50` passes DTO validation but is rejected with a 400 at this check.
- **A single atomic deduction covers the whole batch**: `totalCost = pullCost * count`, deducted via the exact same `deductCoinsOrThrow` guarded update used by single pulls. A bulk pull can never partially succeed or overspend — either the whole batch's cost is available and gets deducted atomically, or none of it does and the whole call fails with a 400.
- **A single shared `createdAt`**, captured once before the transaction and applied to every row in the batch `createMany` call — this is what distinguishes "one 10-pull batch" from "10 separately-timestamped individual pulls" when browsing history later.
- **`bestRarity`/`worstRarity`** are computed after commit, purely in memory over the already-picked items (no extra DB read): `best` is the item with the **lowest** `dropRate` in the batch (the rarest thing that was actually rolled), `worst` is the item with the **highest** `dropRate` (the most common thing rolled). Both are pure numeric comparisons on `dropRate` — the server never assumes any ordering over human-authored rarity *labels* (it never assumes `"legendary" > "common"` as strings), so admins are free to name rarities anything.
- **Fan-out SSE emit**: each picked item gets its own admin-feed emit, fired via `Promise.all` (parallel) — a bulk pull of 10 produces 10 separate live-feed events, all sharing the same `createdAt`.

**Is `worstRarity` a pity system?** No. It's a pure, stateless, per-call computation added alongside the pre-existing `bestRarity` (git commit `aabf47e`, "add worstRarity to Gacha service and related components for improved rarity tracking") purely for UX/statistical display — showing a player both ends of the rarity spectrum they hit within a single batch ("your best pull was X, your worst was Y"). It reads only the items rolled in that specific call; there is no counter incremented per user, no persisted state, no "guaranteed rare after N pulls" mechanic anywhere in the codebase. The weighted random is memoryless on every call, for both single pulls and every one of the `count` picks inside a bulk pull.

### Drop-rate caching

```ts
async getEventItems(eventId: string): Promise<CachedGachaItem[]> {
  const cached = await this.redis.get(cacheKey(eventId));
  if (cached) return JSON.parse(cached);

  const items = await this.prisma.gachaItem.findMany({
    where: { eventId },
    select: { id: true, name: true, rarity: true, dropRate: true, imageKey: true },
  });
  const serializable = items.map((item) => ({ ...item, dropRate: Number(item.dropRate) }));

  const backstopTtl = this.systemConfig.get<number>('BACKSTOP_TTL_SECONDS');
  await this.redis.set(cacheKey(eventId), JSON.stringify(serializable), 'EX', backstopTtl);
  return serializable;
}

async invalidate(eventId: string): Promise<void> {
  await this.redis.del(cacheKey(eventId));
}
```

`cacheKey(eventId)` is `` `event:${eventId}:items` ``. On a cache miss, the Prisma `Decimal` → plain `Number` conversion happens exactly once, here — every downstream consumer (the weighted-random roll, the 100%-sum check) works with a consistent numeric type from that point on. `invalidate(eventId)` is called from every admin write that can change an event's items — see [Admin features](#admin-features) for the exact call sites.

### Statistical convergence test

```ts
it('converges to configured drop rates over many trials', () => {
  const items = [
    { id: 'legendary', dropRate: 1 },
    { id: 'rare', dropRate: 19 },
    { id: 'common', dropRate: 80 },
  ];
  const TRIALS = 200_000;
  const counts = { legendary: 0, rare: 0, common: 0 };

  for (let i = 0; i < TRIALS; i++) counts[pickWeightedRandom(items).id]++;

  const TOLERANCE = 0.01;
  expect(Math.abs(counts.legendary / TRIALS - 0.01)).toBeLessThan(TOLERANCE);
  expect(Math.abs(counts.rare / TRIALS - 0.19)).toBeLessThan(TOLERANCE);
  expect(Math.abs(counts.common / TRIALS - 0.8)).toBeLessThan(TOLERANCE);
});
```

Runs the real `pickWeightedRandom` 200,000 times against a 3-item weight set (1/19/80), and asserts each observed selection frequency lands within an **absolute 1 percentage point** of its configured drop rate — large enough `N` that random variance is small relative to that tolerance, but still tight enough to catch a systematically-skewed distribution (e.g. an off-by-one bug in the cumulative-sum walk).

## System configuration

Most tunable values in the backend are **DB-backed** (the `system_config` table), not environment variables — `SystemConfigService` (`@Global()`) resolves each key through a three-step fallback:

```ts
get<T>(key: string): T {
  // 1. Environment variable — only for the two keys in ENV_OVERRIDES
  // 2. In-memory cache, loaded from the system_config table on module init
  // 3. Hard-coded DEFAULTS
}
```

```ts
const ENV_OVERRIDES: Record<string, string> = {
  JWT_ACCESS_EXPIRES_IN_SECONDS: 'JWT_ACCESS_EXPIRES_IN_SECONDS',
  DEFAULT_REFRESH_EXPIRES_SECONDS: 'REFRESH_TOKEN_EXPIRES_IN_SECONDS',
};
```
(Note the second entry's config-key name and env-var name intentionally differ.)

`GET /api/config` (public, no auth) exposes every key with a default — consumed by both frontends' `config.ts`, cached client-side for the page's lifetime.

### Which keys are actually live vs. static-at-boot

| Key | Default | Wired live via `SystemConfigService`? | Where read |
|---|---|---|---|
| `PULL_COST` | 10 | Yes, per-call | `GachaService.pull`/`pullBulk` |
| `MAX_BULK_PULL` | 10 | Yes, per-call | `GachaService.pullBulk` |
| `BCRYPT_ROUNDS` | 10 | Yes, per-call | `AdminUsersService.create`, `AuthService` |
| `REFRESH_TOKEN_BYTES` | 32 | Yes, per-call | `AuthService` (refresh-token generation) |
| `DEFAULT_REFRESH_EXPIRES_SECONDS` | 604800 | Yes, per-call (env-overridable) | `AuthService` |
| `RECENT_HISTORY_LIMIT` | 10 | Yes, per-call | `AdminUsersService.getDetail` |
| `BACKSTOP_TTL_SECONDS` | 86400 | Yes, per-call | `GachaCacheService.getEventItems` |
| `JWT_ACCESS_EXPIRES_IN_SECONDS` | 900 | No — env only, read once at `JwtModule.registerAsync` | `auth.module.ts` |
| `GACHA_PULL_THROTTLE_LIMIT` / `_TTL_MS` | 120 / 60000 | No — `process.env` at controller load | `gacha.controller.ts` |
| `ADMIN_FEED_RATE_LIMIT_MAX` / `_DURATION_MS` | 10 / 1000 | No — `process.env` at module load | `queue/queue.constants.ts` |
| `GLOBAL_THROTTLE_LIMIT` / `_TTL_MS` | 40 / 60000 | No — `process.env` in `ThrottlerModule.forRoot()` | `app.module.ts` |
| `PULL_COST_FRONTEND` | 10 | N/A — never read backend-side | Frontend display only |
| `MULTI_PULL_COUNT` | 10 | N/A — never read backend-side | Frontend display/request-size only |
| `PULL_REVEAL_ANIMATION_MS` | 700 | N/A — never read backend-side | Frontend display only |
| `REFRESH_DEBOUNCE_MS` | 500 | N/A — never read backend-side | Frontend display only |

**Practical implication**: changing `PULL_COST` in the DB takes effect on the very next pull, no restart needed. Changing `GACHA_PULL_THROTTLE_LIMIT` in the DB does nothing until the matching env var is also set and the process restarted — these values are baked into NestJS decorators/module registration at boot, which need static values.

**Frontend-only keys can silently drift from server-enforced values**: `PULL_COST_FRONTEND` (displayed cost per pull) is a separate key from `PULL_COST` (actually charged) — nothing keeps them in sync if edited independently. Same relationship between `MULTI_PULL_COUNT` (frontend's requested bulk-pull size) and `MAX_BULK_PULL` (server-enforced cap) — if the former is ever configured above the latter, every bulk pull just 400s.

`SystemConfigService.set(key, value)` exists (upserts the DB row and updates the in-memory cache immediately) but **no code path calls it today** — there is no admin UI/endpoint for editing config yet; changes happen only via direct DB access (`psql`, Prisma Studio, or editing `prisma/seed.js`'s defaults before a fresh seed).

## API reference

Base URL: **`/api/v1`** (URI-versioned). The only exception is the health check, which is version-neutral at `/api/health` so probes survive version bumps. No response envelope anywhere — every endpoint returns raw JSON as shown.

### Health

**`GET /api/health`** — no auth, version-neutral. Pings Postgres and Redis. `200 { "status": "ok", "db": "up", "redis": "up" }`, or `503` with the same shape (`status: "error"`) if a dependency is unreachable.

### Auth

| Endpoint | Auth | Rate limit | Request | Response |
|---|---|---|---|---|
| `POST /auth/register` | – | 10/60s | `{ email, password }` | `201 { user: { id, email, coins: 500 }, token, refreshToken }` |
| `POST /auth/login` | – | 10/60s | `{ email, password }` | `200 { token, refreshToken }` |
| `POST /auth/refresh` | – | 10/60s | `{ refreshToken }` | `200 { token, refreshToken }` (rotates — old token invalidated); `401` if unknown/expired/reused/malformed |
| `POST /auth/logout` | user | – | – | `200 { success: true }`, clears the stored refresh token |

### User

| Endpoint | Auth | Response |
|---|---|---|
| `GET /user/profile` | user | `200 { id, email, coins }` |
| `GET /user/history?cursor=&limit=` (1–100, default 20) | user | `200 { items: [{ id, eventName, itemName, rarity, coinsSpent, createdAt }], nextCursor }` |

### Events (public, player-facing)

| Endpoint | Auth | Response |
|---|---|---|
| `GET /events` | – | `200 [{ id, name, startsAt, endsAt, imageKey }]` — active only, unpaginated (small, admin-curated list) |
| `GET /events/:id` | – | `200 { id, name, imageKey, items: [{ id, name, rarity, dropRate, imageKey }] }`; `404` if not found or inactive |
| `GET /events/:id/image` | – | Raw image bytes, or `404` |
| `GET /events/items/:id/image` | – | Raw image bytes, or `404` |

Both image routes are declared before `GET /events/:id` in the controller so the multi-segment path matches unambiguously.

### Gacha

| Endpoint | Auth | Rate limit | Request | Response |
|---|---|---|---|---|
| `POST /gacha/pull` | user | 120/60s | `{ eventId }` | `200 { item: { id, name, rarity }, remainingCoins }`, or `400 { message: "Insufficient coins" }` |
| `POST /gacha/pull-bulk` | user | 120/60s | `{ eventId, count }` (DTO caps at 100; business rule caps at `MAX_BULK_PULL`, default 10) | `200 { items: [...], bestRarity, worstRarity, remainingCoins }` — one atomic transaction |

### Config

**`GET /api/config`** — no auth. Returns all 18 system-config keys with their currently-effective values (see [System configuration](#system-configuration)).

### Admin — Events (requires `role: admin`)

| Endpoint | Request | Response / notes |
|---|---|---|
| `GET /admin/events` | – | `200` all events (draft + active), items inline |
| `POST /admin/events` | `{ name, startsAt, endsAt }` | `201`, always created as a draft (`isActive: false`, not settable via create) |
| `PUT /admin/events/:id` | any subset of `name`/`startsAt`/`endsAt`/`isActive` | `200`; activating requires items to already sum to exactly 100%; deactivating never re-validates |
| `DELETE /admin/events/:id` | – | `200`, hard-deletes and cascades to items; `409` if the event has pull history (deactivate instead) |
| `POST`/`GET`/`DELETE /admin/events/:id/image` | multipart `file` (PNG/JPEG/WebP, ≤5MB) | Sets/streams/removes the event banner; never touches the gacha cache (a banner doesn't affect pull outcomes) |
| `POST /admin/events/:id/items` | `{ name, rarity, dropRate }` | `201`; draft: rejected only if total would exceed 100%; active: rejected unless resulting total is exactly 100% |

### Admin — Items (requires `role: admin`)

| Endpoint | Notes |
|---|---|
| `PUT /admin/items/:id` | Same draft/active drop-rate validation, re-checked only when `dropRate` is present in the body |
| `DELETE /admin/items/:id` | `400` if the item has already been awarded (has `gacha_logs`); otherwise always allowed — even from an active event, even if it leaves the total below 100%. Returns `{ success: true }` or `{ success: true, warning: "..." }` describing the new (non-100%) total |
| `POST`/`GET`/`DELETE /admin/items/:id/image` | multipart upload; each mutation invalidates the event's gacha cache (the cache stores `imageKey` too, even though it's unused by the roll itself) |

### Admin — Users (requires `role: admin`)

| Endpoint | Request | Response |
|---|---|---|
| `GET /admin/users?cursor=&limit=&email=` | optional case-insensitive substring `email` filter | `200 { items: [{ id, email, role, coins, isBanned, pullCount, createdAt }], nextCursor }` |
| `GET /admin/users/:id` | – | Same shape + `recentHistory` (most recent pulls, `RECENT_HISTORY_LIMIT`); `404` if not found |
| `POST /admin/users` | `{ email, password, role?, coins? }` | Admin-created account — a separate path from public register, which never accepts `role` |
| `PUT /admin/users/:id` | `{ coins?, role?, isBanned? }` | `200`, updates only the provided fields |
| `DELETE /admin/users/:id` | – | `200 { success: true }`; `409` if the user has pull history (ban instead — see [Admin features](#admin-features)); `404` if not found |

### Admin — History & live feed (requires `role: admin`)

| Endpoint | Notes |
|---|---|
| `GET /admin/history?cursor=&limit=&userId=` | Cursor-paginated, all users, optional `userId` filter |
| `GET /admin/history/stream` | Server-Sent Events, auth via `?token=<jwt>` query param (see [Auth system](#auth-system)). Event name `pull`, payload `{ userId, userEmail, eventId, eventName, itemName, rarity, createdAt }`. Fed by the BullMQ worker strictly after a pull's transaction commits — never before, never on failure |

### Admin — Stats (requires `role: admin`)

| Endpoint | Response |
|---|---|
| `GET /admin/stats` | `200 { totalUsers, activeEvents, totalEvents, pullsToday, totalPulls, totalCoinsSpent }` — all six counters run inside a single `$transaction` |
| `GET /admin/stats/leaderboard` | `200 [{ userId, email, pullCount, coinsSpent }]` — top 10 by lifetime pull count |

Rate limits summary: global default 40 req/60s, tightened to 10/60s on `auth/*`, relaxed to 120/60s on `gacha/*`. Exceeding a limit returns `429`.

## Admin features

### Events/items lifecycle

```
create ──► [draft: isActive=false] ──► activate (PUT isActive:true) ──► [active: isActive=true]
              │  items: sum ≤ 100%           requires sum == 100%          items: sum must stay == 100%
              │  (partial config OK)                                            │
              └──────────────◄────────────── deactivate (PUT isActive:false, no re-check) ◄┘
```

- **Create**: `endsAt` must be after `startsAt`, else a 400. No drop-rate check at creation. Always created as a draft.
- **Activation**: the only place drop rates are gated on update — fetches all item drop rates and requires them to sum to exactly 100%.
- **Deactivation or any other update**: no drop-rate re-check. Date range is re-validated only if a date field changes.
- **Any `isActive` change**: invalidates the event's gacha cache. Not invoked for name/date-only changes.
- **Delete**: 404 if missing; blocked (400) if any `gacha_logs` reference the event; otherwise hard-deletes and cascades to items.
- **Item create/update**: branches on the parent event's `isActive` — `assertDropRatesEqual100` if active, `assertDropRatesDoNotExceed100` if still a draft. Invalidates the cache on every successful write.
- **Item delete**: 404 if missing; blocked (400) if the item has already been awarded to a player; otherwise always allowed — even from an active event, even if the result leaves it below 100%. This is an accepted, deliberate gap (not an oversight): the only backstop is `GachaService.pull`'s defense-in-depth check, which blocks every pull against that event until an admin restores the total. The delete response includes a `warning` field describing the resulting total in that case.

### Image upload

Multipart (`file` field), PNG/JPEG/WebP, ≤5MB — for both event banners and item artwork. Old object is deleted on replace, not versioned. Object key format `items/<itemId>-<timestamp>.<ext>` (the extension encodes content type; there's no separate MIME column). Served via `StreamableFile`, streamed through the backend from MinIO — never a direct public MinIO URL. The admin frontend fetches with an `Authorization: Bearer` header via `fetch()` and converts the response to a blob URL, since an `<img src>` can't attach an auth header.

### Live history feed pipeline

```
GachaService.pull() commits its transaction
        │  (fire-and-forget, try/catch — failure here never affects the pull's response)
        ▼
AdminFeedProducer.emitPull(event)  →  BullMQ queue "admin-feed"
        ▼
AdminFeedProcessor (a BullMQ worker)  →  AdminFeedService.publish(event)
        │  in-process RxJS Subject<PullEvent>
        ▼
AdminHistoryController's @Sse('stream') route  →  GET /admin/history/stream
        ▼
Connected admin dashboard clients (EventSource)
```

`GET /admin/history` (cursor-paginated) remains the mechanism for initial load and scrolling back — the SSE stream is purely "new since I started watching," with no replay of past events on connect. See ADR-006 above for the single-instance scale-out limitation.

### User management

`isBanned` is the primary lifecycle-off switch — enforced at login (a banned user can't get a new token) and on every authenticated request (`JwtStrategy.validate` re-fetches `isBanned` per request), so a ban is effective immediately across every existing session, with no "wait for token expiry" gap. A hard **delete** is also available, but only for users with **no pull history** (`409` otherwise) — preserving referential integrity with `gacha_logs` and keeping historical pull data attributable to a real account. For a user with history, banning is the only disable mechanism.

### Stats and leaderboard

`GET /admin/stats`'s six counters (`totalUsers`, `activeEvents`, `totalEvents`, `pullsToday`, `totalPulls`, `totalCoinsSpent`) run inside a single `$transaction` rather than six sequential queries. The leaderboard groups `gacha_logs` by user for the top 10 by lifetime pull count, resolving emails in a second query (`null` if the user row no longer exists — rare in practice, since users with pull history can't be hard-deleted).

## Frontend-admin — features & components

### Dashboard (`/`)

Six stat tiles (total users, active events, total events, pulls today, total pulls, total coins spent), a live rarity-breakdown bar chart filterable by event, and a top-players leaderboard. Initial load fetches config, stats, and leaderboard together; a second effect loads the rarity breakdown for the selected event filter. A live `EventSource` connection to `/admin/history/stream` updates the rarity chart in place when a pull matches the current event filter, and always (debounced by `REFRESH_DEBOUNCE_MS`, default 500ms) triggers a background refresh of the stats tiles and leaderboard — so the chart is event-scoped but the KPI tiles/leaderboard are always global and reactive to every pull anywhere in the app. A green/grey "Live"/"Offline" indicator reflects the SSE connection state.

### Events (`/events`)

Client-side search (by name) and status filter (`all`/`active`/`draft`) over the full fetched list. Create/edit dialog collects name, start/end datetime, and an optional banner image (uploaded in a separate call after the event record itself is created/updated, since the image endpoints need an existing event id). The item-management dialog supports add, in-place inline edit, and delete, each item optionally carrying its own artwork (lazily fetched thumbnail per row); a running drop-rate total is shown, colored green at exactly 100% and amber otherwise — this coloring is informational only and never blocks a save, since the true enforcement is entirely server-side (see [Admin features](#admin-features)). Deleting an event or an item requires confirming through the shared `ConfirmDialog`.

### Users (`/users`)

Cursor-paginated list with **server-side** email search (debounced) and a **client-side-only** role filter (`all`/`user`/`admin`) applied over whatever page has already loaded — so an admin-role user on a not-yet-loaded page won't appear under the "admin" filter until "Load more" reaches that page. The edit dialog fetches full user detail (including recent history) and supports adjusting coins, changing role, and toggling ban, each gated by a confirm dialog for destructive/elevated actions. A delete action is also available, gated by a confirm dialog whose copy explicitly states that users with pull history can't be deleted — ban them instead (the backend enforces this with a `409`).

### History (`/history`)

Two independent, non-cross-synced data sources on one page: a live feed (`EventSource` to `/admin/history/stream`, capped at the last 20 events, showing "Live"/"Disconnected" based on the connection's open/error state, with no manual reconnect UI — relying on the browser's native `EventSource` auto-reconnect) and a cursor-paginated history browser (`GET /admin/history`) with its own client-side text search across user email/event name/item name. Reloading the paginated browser never touches the live SSE connection, and vice versa.

## Frontend-user — features & components

### Auth (`/login`, `/register`)

Plain email/password forms (register requires an 8-character minimum password) using native HTML5 validation only — no client-side validation library. On success, both flows store the returned access + refresh token pair and redirect to `/gacha`. Register shows static copy ("New accounts start with 500 coins") — the actual starting balance is enforced entirely server-side.

### Events browser (`/events`)

A responsive grid of `EventCard`s for every active event — banner image (admin-uploaded artwork, falling back to a gradient placeholder with the event's initial if none is set or the image fails to load), a formatted date range, and a link into `/gacha?eventId=<id>`, which the gacha page picks up to auto-select that event.

### Gacha pull (`/gacha`) — event selection, pulling, and the cinematic reveal

The core interactive loop: pick an active event (auto-selected from a `?eventId=` deep link if present, else the first event in the list), view its drop-rate list (each row showing admin artwork or a rarity-tier fallback icon), and pull — a single pull (`POST /gacha/pull`) or a bulk "Summon" (`POST /gacha/pull-bulk`, count from the `MULTI_PULL_COUNT` system-config value, default 10).

Every pull result is wrapped in a full-screen, skippable **cinematic reveal sequence**, driven by a per-rarity "treatment" definition (`src/features/gacha/lib/rarity.ts`) covering three tiers — `common`, `rare`, `legendary` (there is no fourth "epic" tier in the current model). Each treatment bundles:
- A **timeline** of named phases (`charging → portal → freeze → spark → flash → burst → pillars → cardEmerge → revealed`, with per-rarity durations — roughly 1–2s for common, 3–4s for rare, 5–7s for legendary) driven by a pure timer-based phase machine (`useRevealSequence`), scaled by a user-adjustable speed multiplier (0.5×–2×) and short-circuited straight to the final card if the player enables "skip animation" or the OS-level reduced-motion preference is on.
- Visual effects gated per phase and per rarity: background starfield/nebula (`BackgroundEffects`), a radial particle burst (`ParticleField`), a spinning dual-ring "summon portal" (`SummonPortal`), and — for the final phases — the actual reward card(s) with a pointer-driven 3D tilt effect and a shimmering gradient border.
- Sound cues (via Howler, `howler` package) at specific phase transitions — a portal-charge sound, a rarity-specific reveal sound, and a generic "reward" chime — and a haptic vibration pattern on supporting devices, intensity scaled to rarity.
- Sound files are **intentionally not committed to the repo** (see `frontend-user/public/sounds/README.md`) — Howler fails silently on a missing file, so the app degrades gracefully to no audio rather than erroring.

For a bulk "Summon," the reveal is keyed off the batch's `bestRarity` (server-computed — see [the algorithm deep dive](#the-gacha-algorithm--deep-dive)) for its buildup intensity, then transitions into a grid of individually-animated reward cards showing every item pulled, with "Best pull"/"Worst pull" callouts.

Coin balance updates optimistically the moment a pull's API response returns, but the actual result/reward state only **commits** once the reveal animation's timeline finishes (or is skipped) — so a player can't see the outcome before the reveal plays out, even though the pull already succeeded server-side.

### Profile / history (`/profile`)

Coin balance plus a cursor-paginated table of past pulls (event, item, rarity, coins spent, timestamp), with a "Load more" button.

## Testing

All three apps enforce a **100% code-coverage threshold** (statements/branches/functions/lines) as a hard gate on their respective `test:cov` scripts — not a soft target.

### Backend

```bash
cd backend
npm test              # unit tests (Jest) — enforces 100% coverage
npm run test:e2e      # e2e tests (Jest, separate config) — requires live Postgres + Redis
```

- **Unit tests**: roughly one spec file per source file. Controllers are tested only for delegation to their service (thin-controller pattern); every DTO has a matching validation spec; guards/strategies get explicit security-branch coverage (missing user, banned user, demoted-after-issuance, etc.); pure-logic utilities (`drop-rate.util.ts`, `weighted-random.ts`) get exhaustive edge-case coverage, including the 200,000-trial statistical convergence test described in [the algorithm deep dive](#the-gacha-algorithm--deep-dive).
- **`test/gacha-concurrency.e2e-spec.ts`** — the concurrency proof for [the atomic coin-deduction design](#the-gacha-algorithm--deep-dive): registers a real user via the real API, sets their balance to exactly `25` (room for exactly 2 pulls at 10 coins each), activates a real event with one item, then fires **15 concurrent `POST /gacha/pull` requests**. Asserts exactly 2 succeed (`200`) and 13 fail (`400 Insufficient coins`), the final balance is exactly `5` (never negative, never miscounted), and exactly 2 `GachaLog` rows exist. This is treated as the strongest possible signal that the atomic-update guard (or the transaction boundary around it) has regressed — any change to `GachaService` is expected to keep this test green.

### Frontend-admin

```bash
cd frontend-admin
npm test         # Jest + SWC + Testing Library
npm run test:cov # with coverage
```
Jest config enforces the same 100% threshold. Component/hook/page tests mock the `apiFetch` layer per test file; destructive-action flows (delete/ban/role-change) render through `ConfirmProvider` rather than stubbing `window.confirm`.

### Frontend-user

```bash
cd frontend-user
npm test         # Vitest
npm run test:cov # with coverage
```
Vitest (not Jest) with `jsdom`, also gated at 100% coverage. Shared test setup mocks Next.js navigation (`useRouter`/`usePathname`/`useSearchParams`), `next/link`, `next/image`, `motion/react` (stripped to plain DOM elements so animation props don't cause React warnings), `howler` (a no-op `Howl`), `window.matchMedia`, `navigator.vibrate`, and the Fullscreen API — supporting tests for the reveal-animation and presentation-preference hooks without a real browser.

## Known issues

A living list of accepted gaps and deliberate tradeoffs — not all "known issues" are bugs; several are explicit scope decisions.

### Backend

- **Deleting an item from an active event can leave drop rates below 100%.** No check at delete time that the remaining items still sum to 100%; the only backstop is the pull-time defense-in-depth check, which blocks every pull against that event until fixed. The delete response now includes a `warning` describing the resulting total — informational only, nothing is blocked at delete time. Accepted gap by design.
- **The drop-rate cache's 24h backstop TTL is not a substitute for invalidation.** Correctness still depends on every write path calling `invalidate(eventId)`; the TTL exists purely so a *future* write path that forgets to invalidate self-heals within 24h rather than staying stale indefinitely.
- **`PULL_COST` is global, not configurable per event.** Now resolved via system config (no redeploy needed to adjust), but still a single value shared by every event — no per-event/per-item pricing. Scope limitation, not a bug.
- **Not every system-config key is actually live** — see the table in [System configuration](#system-configuration). Several are read from `process.env` at boot only (NestJS decorators/`ThrottlerModule.forRoot()` need static values at registration time); editing their DB row does nothing until the matching env var is also set and the process restarted. Accepted gap by design.
- **Deactivating an event never re-validates drop rates** — an intentional asymmetry with activation, since a draft is allowed to be partial/inconsistent by design.
- **The 100% Jest coverage threshold is a strict, deliberate gate** — any new service/controller/util/guard must ship with a spec reaching full branch coverage, or `npm test` fails the build.

### Frontend-admin

- **Drop-rate sum validation is UI-only in this app** — the events list and item dialog compute and color-flag the 100%-sum status, but never block a save/activate client-side; the real enforcement is entirely backend-side.
- **`AdminItem.dropRate` is typed `string`** (matching the raw API response) while forms parse it to a number before submitting — no dedicated validation layer smooths this over.
- **The users role filter is client-side only**, applied over whatever page of results has already loaded — the email search, by contrast, is a real server-side query that correctly resets pagination.
- **No SSE reconnect indicator** — the "Live"/"Disconnected" badge only reflects the last `onopen`/`onerror` event; there's no intermediate "reconnecting…" state, even though the browser's native `EventSource` does reconnect automatically.
- **No optimistic UI beyond the coin/role/ban patch** — every other mutation (event/item CRUD, user create/delete) triggers a full list re-fetch or a filtered-array removal rather than an in-place optimistic update.
- **`invalidateConfigCache()` is unused** — of the 18 system-config keys this app fetches, only `REFRESH_DEBOUNCE_MS` is actually consumed; the rest are typed but not read anywhere in this app, and there's no cache-busting path if a value changes mid-session (a page reload is the only way to pick up a new value).

### Frontend-user

- **`sseUrl()` is dead code** — fully implemented and tested, but no `EventSource` usage exists anywhere in this app (likely scaffolding for a future real-time feature).
- **No shared auth/profile state across pages** — `/gacha`, `/profile`, `/events`, and the nav bar each independently resolve the current user/profile with no shared cache; a coin-balance change on one page doesn't reflect on another until it's revisited.
- **No `middleware.ts` / no server-side auth enforcement** — all route protection happens client-side in a `useEffect`; a protected page's JS briefly mounts (rendering a skeleton) before any redirect. The real security boundary is the backend rejecting requests with an invalid/expired token, not the frontend route guard.
- **A stale token isn't always cleared after a failed profile fetch** — narrowed somewhat by `apiFetch`'s automatic silent-refresh-then-clear-on-failure path, but a direct profile-fetch failure outside that flow still doesn't proactively clear the session.
- **The profile page's history-loading function has no error handling** — a thrown error from the history endpoint is an unhandled rejection; the loading spinner still resolves, but no error is shown, and an empty list is indistinguishable from a real empty history.
- **`EventItem.dropRate` is typed/rendered as a raw string**, with no client-side parsing or validation.
- **Displayed pull cost can drift from the actually-charged cost** — `PULL_COST_FRONTEND` (display) and `PULL_COST` (server-enforced) are independent config keys with nothing keeping them in sync; similarly, the bulk-pull button's price label uses a hardcoded "×10" rather than deriving from the configured bulk-pull count.
- **`MULTI_PULL_COUNT` isn't validated against the backend's `MAX_BULK_PULL`** — if the former is ever configured larger than the latter, every bulk pull request fails with a 400.
- **`invalidateConfigCache()` is unused**, same as the admin app.
- **100% coverage threshold** — same deliberate gate as the other two apps (`vitest.config.ts`), not to be lowered to unblock a failing suite.
