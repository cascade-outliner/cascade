# Cascade

Cascade is a fast, tree-based outliner for organizing ideas, notes, and structured work in deeply nested hierarchies. It combines smooth editing with virtualized rendering for large trees, giving you responsive navigation and stable node URLs as your workspace grows.

## What it includes

- `apps/website` - marketing + legal pages (`localhost:3000`)
- `apps/web-app` - the outliner application shell
- `packages/ui` - headless outliner components
- `docs/architecture` - design record: data model, front-end, extensibility

## Features

- Infinitely nestable tree with virtualization for large datasets
- PostgreSQL-backed data model for durable, scalable storage
- Type-safe stack (oRPC, Drizzle, TanStack Start/Router)

## Architecture

The target design is written down in [`docs/architecture`](./docs/architecture):
the Postgres data model, the operation vocabulary that sync and undo are built
on, the front-end store and editing surface, and the extension registries. Start
with the [index](./docs/architecture/README.md).

## AI usage

Use AI to accelerate implementation when the problem and solution are already understood. Do not use AI as a substitute for your own knowledge.

## Contributors

[![Contributors](https://contrib.rocks/image?repo=patrickroelofs/cascade)](https://github.com/patrickroelofs/cascade/graphs/contributors)