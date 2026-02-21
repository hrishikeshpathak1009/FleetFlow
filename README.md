# FleetFlow Backend

Koa + Bun TypeScript backend with authentication, middleware stack, and demo fleet routes.

## Project Structure

- `src/server.ts`: application entrypoint
- `src/config/*`: environment config, logger, Redis clients
- `src/middleware/*`: 13-layer middleware onion and auth helpers
- `src/router/*`: API routes (`vehicles`, `drivers`, `trips`)
- `src/types/index.ts`: shared TypeScript types
- `public/`: static files served at runtime

## Prerequisites

- Bun 1.1+
- Redis (local or remote)
- Node.js 20+ (for tooling/type checks)

## Setup

1. Install dependencies:

```bash
bun install
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


Run and open:

1. Start server:
```bash
bun run dev
```
2. Open in browser:
- `http://localhost:3001/`



