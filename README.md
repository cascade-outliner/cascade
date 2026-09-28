# Cascade

Cascade is a fast, tree-based outliner for organizing ideas, notes, and structured work in deeply nested hierarchies. It combines smooth editing with virtualized rendering for large trees, giving you responsive navigation and stable node URLs as your workspace grows.

## Sync

The outline lives in the browser (IndexedDB) and works fully offline. Optionally, set `DATABASE_URL` plus the Google sign-in variables (see `.env.example`) and run `pnpm db:migrate` to mirror it to Postgres in the background: local edits are pushed from an outbox, and server changes are pulled and merged with last-write-wins per node. Without these the app never talks to a server.

Sync is tied to an account. Users sign in with Google ([better-auth](https://www.better-auth.com)); each user gets one workspace on first push, recorded with its onboarding time in the `workspaces` table. A browser keeps syncing the account that first synced its outline: signing in as someone else on the same browser starts from that account's server copy instead.

## AI usage

Use AI to accelerate implementation when the problem and solution are already understood. Do not use AI as a substitute for your own knowledge.

## Contributors

[![Contributors](https://contrib.rocks/image?repo=patrickroelofs/cascade)](https://github.com/patrickroelofs/cascade/graphs/contributors)
