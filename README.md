# Saveasy

A small, self-hosted personal finance app: import bank exports, categorise spending automatically and keep track of savings goals. Built to run on a home server or behind a VPN with minimal resources. The UI is in Hungarian.

**Stack:** TypeScript · React · Vite · Recharts · Fastify · SQLite (better-sqlite3) · Caddy · Docker

## Features

- **CSV import** of bank exports (e.g. Revolut) with automatic column mapping, time of day support and hash based duplicate detection, so importing the same file twice never creates duplicates.
- **Rules engine:** if a description matches a pattern, the category is applied on import and retroactively to uncategorised transactions. When you categorise manually, the app suggests a new rule, but never creates one silently.
- **Dashboard:** spending by category and period, monthly category trends, drill-down from any chart slice to the underlying transactions, Markdown export of category tables.
- **Savings:** separate savings buckets with transfers from liquid money, optional manual market value (for stocks or crypto) and notes.
- **Recurring items** and their share of the monthly total.
- **Transactions:** infinite scroll, bulk select and delete, inline editing with math expressions (`31000-3000`), notes.
- **History** of the last 50 changes, and full database **backup and restore** from the UI without downtime.
- **Optional login:** single password, bcrypt hashed, signed httpOnly session cookie, rate limited endpoints. Off by default for VPN-only setups.

## Architecture

```
          :80
           |
       [ Caddy ] --- /       -> static React build
           |     --- /api/*  -> Fastify backend -> SQLite file (volume)
```

Separate dev and prod Docker Compose stacks, each with isolated data. Details in [PROJECT.md](PROJECT.md).

## Quick start

```bash
cp .env.example .env
docker compose -f docker-compose.prod.yml up -d --build   # prod, served on HTTP_PORT
docker compose -f docker-compose.dev.yml up -d --build    # dev with hot reload
```

To enable login, set `AUTH_ENABLED=true` and a 32 byte hex `SESSION_KEY` in `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The app then asks you to set a password the first time you open it.

## Docs

- [PROJECT.md](PROJECT.md): concept, stack and architecture (Hungarian)
- [CHANGELOG.md](CHANGELOG.md): releases and features
