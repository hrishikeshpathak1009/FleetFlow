# FleetFlow 

Koa + Bun TypeScript backend with authentication, middleware stack, and demo fleet routes.

## Prerequisites

- Bun 1.1+
- Redis (local or remote)
- Node.js 20+ (for tooling/type checks)

## Setup

1. Install dependencies:

```bash
bun install
```


2. Start Redis (if local):

```bash
redis-server
```

3. Apply database schema:

```bash
bun run db:push
```

## Run

Development mode (hot reload):

```bash
bun run dev
```

Production-like start:

```bash
bun run start
```

Server default URL:

- `http://localhost:3001`
- Health check: `GET /health`
- Frontend dashboard: `http://localhost:3001/`

## Quality Checks

Type check:

```bash
bun run lint
```

Drizzle database commands:

```bash
bun run db:generate
bun run db:push
bun run db:studio
```

## Demo Auth

Login endpoint:

- `POST /api/auth/login`

Demo users:

- `manager@fleetflow.com` / `manager123`
- `dispatcher@fleetflow.com` / `dispatch123`
- `safety@fleetflow.com` / `safety123`
- `finance@fleetflow.com` / `finance123`

Example login request:

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"manager@fleetflow.com","password":"manager123"}'
```

Use returned bearer token for protected routes:

```bash
curl http://localhost:3001/api/vehicles \
  -H "Authorization: Bearer <TOKEN>"
```

## Project Structure

- `src/server.ts`: application entrypoint
- `src/config/*`: environment config, logger, Redis clients
- `src/middleware/*`: 13-layer middleware onion and auth helpers
- `src/router/*`: API routes (`vehicles`, `drivers`, `trips`)
- `src/types/index.ts`: shared TypeScript types
- `db/schema.ts`: Drizzle schema definitions
- `db/config.ts`: DB config for Drizzle
- `db/migrations/`: generated SQL migrations
- `docs/`: static frontend files (GitHub Pages compatible)

