# Frontend (Admin)

Admin-only Next.js app: manage draft/active gacha events and items (including banner/artwork uploads), manage users, and watch live pull history via Server-Sent Events. No self-registration — admin accounts are promoted directly in the database (see the [project README](../README.md#creating-an-admin-user)). Runs on port **3002** by default so it can run alongside [frontend-user](../frontend-user) (3000) and the backend (3001).

For everything beyond local setup (architecture, components, every feature in detail, testing, known issues), see the [project README](../README.md) — this is the one place all three apps are documented.

- [Architecture](../README.md#frontend-admin-architecture)
- [Features & components](../README.md#frontend-admin--features--components)
- [API reference this app talks to](../README.md#api-reference)
- [Known issues](../README.md#known-issues)

## Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Runs on http://localhost:3002. Requires the [backend](../backend) running first.

## Environment variables

| Variable | Required | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | `http://localhost:3001/api/v1` |

Inlined at build time — changing it requires a rebuild, not just a restart. See [project README § Environment variables](../README.md#environment-variables).

## Scripts

```bash
npm run dev        # dev server on port 3002
npm run build       # production build
npm run start       # run production build on port 3002
npm run lint         # eslint
npm test             # Jest + Testing Library, 100% coverage threshold
npm run test:cov    # with coverage report
```
