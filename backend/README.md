# Backend

NestJS API for the Gacha Event System. See the [project README](../README.md) for installation and usage, and [docs/](./docs/) for architecture, data model, and API reference.

## Environment variables

```bash
cp .env.example .env
```

Required: `DATABASE_URL`, `JWT_SECRET`. Everything else (Redis, MinIO, ports, rate limits, token lifetimes) has a working default in `.env.example`. Full variable-by-variable reference: [project README § Environment variables](../README.md#environment-variables).
