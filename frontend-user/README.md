# Frontend (User)

Player-facing Next.js app: register/login, pull gacha, view profile and pull history. No admin routes live here — see [frontend-admin](../frontend-admin). See the [project README](../README.md) for installation and usage.

See [docs/](./docs/) for architecture, components, features, known issues, and testing.

## Environment variables

```bash
cp .env.local.example .env.local
```

| Variable | Required | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | `http://localhost:3001/api/v1` |

Inlined at build time — changing it requires a rebuild, not just a restart. See [project README § Environment variables](../README.md#environment-variables).
