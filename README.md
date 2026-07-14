# Cascade

A self-hosted outliner.

## Features

- Tree-based outliner with infinitely nestable nodes, virtualized for large trees
- Self-hosted on your own infrastructure with a PostgreSQL database
- Type-safe throughout - RPC, database queries, and routing

## Getting started

**Prerequisites:** Node.js 22+, pnpm, PostgreSQL (or Docker)

```bash
git clone https://github.com/patrickroelofs/cascade
cd cascade
pnpm install
```

Copy `.env.local.example` to `.env.local` and set:

```env
DATABASE_URL=postgres://user:password@localhost:5432/cascade
```

Start a local database:

```bash
docker compose up -d
```

Apply the schema and seed:

```bash
pnpm db:push
pnpm db:seed
```

Start the dev server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Building for production

```bash
pnpm build
pnpm start
```

## Development

```bash
pnpm dev          # Start dev server
pnpm test         # Run tests
pnpm check        # Lint + format

pnpm db:push      # Apply schema changes to the database
pnpm db:studio    # Open Drizzle Studio
```

### Node URL slugs

Node detail URLs use the node text plus a short stable node id suffix:
`/<slug-from-content>-<uuid-first-block>`.

The content-derived slug is lowercased, strips special characters, and replaces
spaces/punctuation with hyphens, then is capped to a practical max length.
The `-<uuid-first-block>` suffix keeps duplicate node titles unambiguous while
keeping links stable and directly resolvable.

### End-to-end tests

`apps/app` has a Playwright suite under `apps/app/e2e`. It needs a running
database (`docker compose up -d`, `pnpm db:push:app`, plus the `COLLATE "C"`
fix above on a fresh database) and builds+starts the app itself, so no dev
server needs to be running first:

```bash
pnpm test:e2e:app
```

The suite authenticates once (`e2e/auth.setup.ts`, creating/reusing a
dedicated `e2e@cascadelist.com` user) and reuses that session across tests.
Each test gets its own throwaway node via the real API
(`e2e/support/fixtures.ts`'s `scratchNode` fixture) so tests never touch the
dev seed data and can run in parallel safely.

## AI usage

This project is developed with AI assistance as a convenience. The rule is simple: use AI when you already know the solution and want to move faster; use your own brain when you don't. AI is a execution accelerator, not a thinking replacement. Reaching for it to figure out what to build, or to paper over a gap in understanding, produces code nobody truly understands and nobody can confidently maintain. Know the problem, know the solution, then let AI write the boilerplate.
