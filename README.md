# Cascade

Cascade is a fast, tree-based outliner for organizing ideas, notes, and structured work in deeply nested hierarchies. It combines smooth editing with virtualized rendering for large trees, giving you responsive navigation and stable node URLs as your workspace grows.

## Sync

The outline lives in the browser (IndexedDB) and works fully offline. Optionally, set `DATABASE_URL` (see `.env.example`) and run `pnpm db:migrate` to mirror it to Postgres in the background: local edits are pushed from an outbox, and server changes are pulled and merged with last-write-wins per node. Without `DATABASE_URL` the app never talks to a server. There are no user accounts yet; each browser syncs under its own anonymous workspace id, shown during onboarding and recorded with its onboarding time in the `workspaces` table.

## Website

`apps/website` is the marketing site: a TanStack Start app with Payload as its CMS. Pages are built from blocks (hero, feature grid, daily notes, pricing, FAQ, call to action) in the admin at `/admin`; the header and footer are globals. It needs `DATABASE_URL_WEBSITE` and `PAYLOAD_SECRET` (see `.env.example`).

```sh
pnpm website:migrate                          # apply schema migrations
pnpm --filter @cascade/website seed           # header, footer and the home page (add --force to overwrite)
pnpm website:dev                              # http://localhost:3000
```

After changing a collection, block or global: `pnpm --filter @cascade/website generate:types`, then `pnpm website:migrate:create <name>`.

## AI usage

Use AI to accelerate implementation when the problem and solution are already understood. Do not use AI as a substitute for your own knowledge.

## Contributors

[![Contributors](https://contrib.rocks/image?repo=patrickroelofs/cascade)](https://github.com/patrickroelofs/cascade/graphs/contributors)
