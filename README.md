# Cascade

Cascade is a fast, tree-based outliner for organizing ideas, notes, and structured work in deeply nested hierarchies. It combines smooth editing with virtualized rendering for large trees, giving you responsive navigation and stable node URLs as your workspace grows.

## What it includes

- `apps/app` - outliner app (`localhost:3001`)
- `apps/web` - marketing + auth pages (`localhost:3000`)
- Shared packages for auth, UI, theme, outliner UI, and HTTP helpers

## Features

- Infinitely nestable tree with virtualization for large datasets
- PostgreSQL-backed data model for durable, scalable storage
- Type-safe stack (oRPC, Drizzle, TanStack Start/Router)

## Self-hosting status

Cascade can be self-hosted, and the architecture supports running it on your own infrastructure. That said, self-hosting setup and docs are not the current project focus.

## Quick start

**Prerequisites:** Node.js 22+, pnpm, Docker (or local PostgreSQL)

```bash
git clone https://github.com/patrickroelofs/cascade
cd cascade
pnpm install
docker compose up -d
```

Create env files:

```bash
cp apps/app/.env.local.example apps/app/.env.local
cp apps/web/.env.local.example apps/web/.env.local
```

Set `BETTER_AUTH_SECRET` to the same value in both env files.

Prepare the database and start both apps:

```bash
pnpm db:push:app
pnpm db:seed:app
pnpm dev
```

Open:

- Web: [http://localhost:3000](http://localhost:3000)
- App: [http://localhost:3001](http://localhost:3001)

## Common commands

```bash
# Development
pnpm dev
pnpm dev:app
pnpm dev:web

# Build
pnpm build:app
pnpm build:web

# Tests
pnpm test:app
pnpm test:web
pnpm test:e2e:app

# Code quality
pnpm check
pnpm lint
pnpm format:write

# Database (apps/app)
pnpm db:push:app
pnpm db:generate:app
pnpm db:migrate:app
pnpm db:seed:app
pnpm db:studio:app
```

## Node URL slugs

Node URLs use:

`/<slug-from-content>-<uuid-first-block>`

The text part is normalized (lowercase, punctuation stripped, spaces collapsed to `-`, length-capped). The UUID prefix keeps duplicate titles resolvable while preserving stable links.

## End-to-end tests

Playwright tests live in `apps/app/e2e`.

Requirements:

- running database
- `pnpm db:push:app`

Then run:

```bash
pnpm test:e2e:app
```

Tests authenticate once, reuse that session, and create throwaway nodes per test so they can run in parallel without touching seeded dev data.

## AI usage

Use AI to accelerate implementation when the problem and solution are already understood. Do not use AI as a substitute for product/design thinking or core technical understanding.

## Contributors

[![Contributors](https://contrib.rocks/image?repo=patrickroelofs/cascade)](https://github.com/patrickroelofs/cascade/graphs/contributors)