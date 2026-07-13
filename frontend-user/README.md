# Frontend (User)

Player-facing Next.js app: register/login, browse active events, pull gacha (single or bulk, with a full cinematic reveal animation), and view profile/coin balance and pull history. No admin routes live here — see [frontend-admin](../frontend-admin).

For everything beyond local setup (architecture, components, every feature in detail — including the gacha reveal animation system, testing, known issues), see the [project README](../README.md) — this is the one place all three apps are documented.

- [Architecture](../README.md#frontend-user-architecture)
- [Features & components](../README.md#frontend-user--features--components)
- [The gacha algorithm this app calls into](../README.md#the-gacha-algorithm--deep-dive)
- [API reference this app talks to](../README.md#api-reference)
- [Known issues](../README.md#known-issues)

## Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Runs on http://localhost:3000. Requires the [backend](../backend) running first.

## Environment variables

| Variable | Required | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | `http://localhost:3001/api/v1` |

Inlined at build time — changing it requires a rebuild, not just a restart. See [project README § Environment variables](../README.md#environment-variables).

## Scripts

```bash
npm run dev        # dev server on port 3000
npm run build       # production build
npm run start       # run production build
npm run lint         # eslint
npm test             # Vitest, 100% coverage threshold
npm run test:cov    # with coverage report
```

## Note on sound

The cinematic pull-reveal animation plays sound effects via Howler, but the `.mp3` files themselves are intentionally not committed — Howler fails silently on a missing file, so the app degrades gracefully to no audio rather than erroring.
