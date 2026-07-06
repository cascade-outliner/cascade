# Cascade

A self-hosted outliner.

## Features

- Tree-based outliner with infinitely nestable nodes, virtualized for large trees
- Self-hosted on your own infrastructure with a PostgreSQL database
- Type-safe throughout — RPC, database queries, and routing

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

> Note: the `order` column must use `COLLATE "C"` (byte-order comparison for
> fractional-index keys). `db:push` can't express collation — on a fresh
> database run once:
> `ALTER TABLE nodes ALTER COLUMN "order" TYPE text COLLATE "C";`

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

## AI usage

This project is developed with AI assistance as a convenience. The rule is simple: use AI when you already know the solution and want to move faster; use your own brain when you don't. AI is a execution accelerator, not a thinking replacement. Reaching for it to figure out what to build, or to paper over a gap in understanding, produces code nobody truly understands and nobody can confidently maintain. Know the problem, know the solution, then let AI write the boilerplate.
