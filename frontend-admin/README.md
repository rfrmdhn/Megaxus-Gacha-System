# Frontend (Admin)

Admin-only Next.js app: manage draft/active gacha events and items, watch live pull history via SSE. No self-registration — admin accounts are promoted directly in the database (see the [project README](../README.md)). Runs on port 3002 by default so it can run alongside [frontend-user](../frontend-user) (3000) and the backend (3001).

See [docs/](./docs/) for architecture, components, features, known issues, and testing.

## Environment variables

```bash
cp .env.local.example .env.local
```

| Variable | Required | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | `http://localhost:3001/api/v1` |

Inlined at build time — changing it requires a rebuild, not just a restart. See [project README § Environment variables](../README.md#environment-variables).
