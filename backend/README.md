# Backend

NestJS API for the Gacha Event System — the single backend shared by [frontend-user](../frontend-user) and [frontend-admin](../frontend-admin).

For everything beyond local setup (architecture, the gacha algorithm, auth system, full API reference, database schema, admin features, testing, known issues), see the [project README](../README.md) — this is the one place all three apps are documented, since this repo's own `docs/` folder is a local, gitignored developer aid and isn't part of the shipped project.

## Setup

```bash
npm install
cp .env.example .env   # adjust DATABASE_URL / REDIS_HOST / REDIS_PORT if needed
npx prisma migrate dev   # also seeds the admin account + system config
npm run start:dev
```

Runs on http://localhost:3001, all routes under `/api` (versioned at `/api/v1`, except the version-neutral health check at `/api/health`). Requires Postgres + Redis running (locally or via `docker compose up -d postgres redis` from the repo root — see [project README § environment variables](../README.md#environment-variables) for the Docker Redis port caveat). MinIO (`docker compose up -d minio`) is only needed for the image upload/serve endpoints.

## Environment variables

Required: `DATABASE_URL`, `JWT_SECRET`. Everything else (Redis, MinIO, ports, rate limits, token lifetimes) has a working default in `.env.example`. Full variable-by-variable reference: [project README § Environment variables](../README.md#environment-variables).

Most gacha/auth tuning (pull cost, max bulk pull size, bcrypt rounds, refresh token lifetime, etc.) is **DB-backed system config**, not env vars — see [project README § System configuration](../README.md#system-configuration) and `prisma/seed.js`.

## Scripts

```bash
npm run start:dev   # dev server, watch mode
npm run build        # compile to dist/
npm run start:prod    # run compiled build
npm run lint          # eslint --fix
npm test              # unit tests (Jest), 100% coverage threshold
npm run test:e2e      # e2e tests — requires live Postgres + Redis
npm run db:seed       # re-run the idempotent admin + system-config seed
```

## Creating an admin user

Seeded automatically (`admin@admin.com` / `password123!`) — see [project README § Creating an admin user](../README.md#creating-an-admin-user) for the seed details and how to promote another account instead.
