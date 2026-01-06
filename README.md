# WebhookRelay

Webhook reliability layer that adds persistence, retries, ordering, and replay capabilities to any webhook integration without code changes.

## Project Structure

```
webhook-relay/
├── apps/
│   ├── api/          # Cloudflare Worker API (Hono)
│   └── web/          # React dashboard (Vite + Tailwind)
├── packages/
│   ├── shared/       # Shared types, schemas, utilities
│   └── db/           # Drizzle ORM schema for D1
└── turbo.json        # Turborepo configuration
```

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Queue**: Cloudflare Queues
- **Storage**: Cloudflare R2
- **Cache**: Cloudflare KV
- **Framework**: Hono (API), React + Vite (Web)
- **ORM**: Drizzle
- **Validation**: Zod
- **Styling**: Tailwind CSS

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Cloudflare account with Workers, D1, Queues, R2, KV enabled

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up Cloudflare resources

```bash
# Create D1 database (note prod + preview IDs)
wrangler d1 create webhook-relay-db

# Create Queue (producer/consumer share the queue name)
wrangler queues create webhook-delivery

# Create R2 bucket for large payloads
wrangler r2 bucket create webhook-payloads

# Create KV namespaces (prod + preview)
wrangler kv:namespace create CACHE
wrangler kv:namespace create CACHE --preview
```

Update `apps/api/wrangler.toml` with the generated IDs (`database_id`, `preview_database_id`, `id`, `preview_id`).

Environment bindings expected by the Worker:

- `ENVIRONMENT` (`development` | `production`)
- `DB` (D1 database binding)
- `DELIVERY_QUEUE` (Queues binding for webhook delivery)
- `PAYLOADS` (R2 bucket binding for large payloads)
- `CACHE` (KV namespace binding for caching/rate limiting)

### 3. Run migrations

```bash
cd apps/api
pnpm db:migrate
```

### 4. Start development servers

```bash
# From root directory
pnpm dev
```

This starts:

- API at http://localhost:8787
- Web at http://localhost:3000

## Scripts

| Command           | Description                        |
| ----------------- | ---------------------------------- |
| `pnpm dev`        | Start all apps in development mode |
| `pnpm build`      | Build all apps                     |
| `pnpm lint`       | Lint all packages                  |
| `pnpm type-check` | TypeScript type checking           |
| `pnpm test`       | Run tests                          |
| `pnpm format`     | Format code with Prettier          |

## Deployment

### Deploy API to Cloudflare Workers

```bash
cd apps/api
pnpm deploy
```

### Deploy Web to Cloudflare Pages

```bash
cd apps/web
pnpm build
# Then deploy dist/ to Cloudflare Pages
```

## API Endpoints

### Ingress (Public)

```
POST /v1/webhooks/in/:integrationId
```

### Integrations (Authenticated)

```
GET    /v1/integrations
POST   /v1/integrations
GET    /v1/integrations/:id
PATCH  /v1/integrations/:id
DELETE /v1/integrations/:id
```

### Webhooks (Authenticated)

```
GET    /v1/webhooks
GET    /v1/webhooks/:id
POST   /v1/webhooks/:id/replay
GET    /v1/webhooks/:id/attempts
```

## License

MIT
