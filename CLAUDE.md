# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Cascade is a self-hosted, tree-based outliner (infinitely nestable nodes, virtualized for large trees). It's a pnpm monorepo with two TanStack Start apps and several shared packages, backed by PostgreSQL via Drizzle.

- `apps/app` — the outliner itself (`app.cascadelist.com`, dev port 3001). Owns the database schema, the oRPC API, auth session creation, and the login/register UI.
- `apps/web` — marketing site + legal pages (`cascadelist.com`, dev port 3000). No database access of its own; its `/login` and `/register` routes are pure redirects to `apps/app`.
- `packages/auth` — better-auth setup (`createAuth(db)`), used by `apps/app`; the resulting session cookie is scoped to span both origins in production (`COOKIE_DOMAIN`).
- `packages/http` — shared HTTP concerns (e.g. security headers).
- `packages/outliner` — the tree/editor UI: virtualized tree rendering, drag-and-drop, Lexical-based node editor, node/tree types, filters. Framework-agnostic React, no oRPC/data-fetching code — consumers pass in data and callbacks.
- `packages/ui` — generic design-system primitives (button, input, checkbox, popover, calendar, toast, etc.) built on `@base-ui/react` + `cva`.
- `packages/theme` — a single `theme.css` (colors like `super-ginger`/`dark-grey` seen in `apps/app`'s root layout) consumed by both apps.

Packages are consumed as workspace deps (`@cascade/auth`, `@cascade/http`, `@cascade/outliner`, `@cascade/ui`, `@cascade/theme`) via `workspace:*` and per-package `exports` maps in their `package.json` — check the `exports` field before assuming a file is importable from outside its package.

## Commands

Run from the repo root with pnpm. Most scripts have `:app` / `:web` variants that filter to one workspace.

```bash
pnpm install            # install all workspaces

pnpm dev                # run both apps in parallel (app :3001, web :3000)
pnpm dev:app            # just apps/app
pnpm dev:web            # just apps/web

pnpm build:app          # vite build && tsc --noEmit
pnpm build:web

pnpm test:app           # vitest run (apps/app)
pnpm test:web           # vitest run (apps/web)
pnpm test:e2e:app       # Playwright e2e suite (apps/app only, see below)

pnpm check              # biome check (lint + format), the CI gate
pnpm lint               # biome lint only
pnpm format:write       # biome format --write

pnpm db:push:app        # apply schema changes to the database (no migration files)
pnpm db:generate:app    # generate a drizzle migration from schema changes
pnpm db:migrate:app     # run drizzle migrations
pnpm db:seed:app        # seed dev data
pnpm db:studio:app      # open Drizzle Studio
pnpm db:purge-deleted:app -- --days=30 --dry-run  # permanently remove nodes past the soft-delete retention window (see below)

pnpm perf:seed:app      # seed a large tree for perf testing (see below)
pnpm perf:query:app     # benchmark visibleTree latency
pnpm perf:mutate:app    # benchmark createNode/moveNode/duplicateNode latency
pnpm perf:filter:app    # benchmark tag/due-date filter latency
pnpm test:perf:ui:app   # Playwright perf spec: virtualized tree render/scroll
```

To run a single vitest test file or by name, `cd` into the workspace and use vitest directly, e.g. `cd apps/app && pnpm vitest run path/to/file.test.ts` or `pnpm vitest run -t "test name"`.

### Local setup

Requires Node 22+, pnpm, and Postgres (`docker compose up -d` starts one on `:5432`, db `cascade`). Copy `apps/app/.env.local.example` (and the equivalent in `apps/web`) to `.env.local`. Only `apps/app` reads `BETTER_AUTH_SECRET` — it signs the session cookie that both apps' users end up with; `apps/web` just needs `VITE_APP_URL` pointing at `apps/app`. After the database is up, run `pnpm db:push:app` before `pnpm dev`.

### End-to-end tests

`apps/app/e2e` is a Playwright suite. It needs a running database and builds+starts the app itself (no dev server needs to be running first). It authenticates once (`e2e/auth.setup.ts`, creating/reusing a dedicated `e2e@cascadelist.com` user) and reuses that session across tests; each test gets its own throwaway node via the real oRPC API (`e2e/support/fixtures.ts`'s `scratchNode` fixture) so tests never touch dev seed data and can run in parallel.

### Performance testing

`apps/app/e2e-perf/` is a repeatable perf harness for the tree data layer (see issue #304 for the motivating story), living alongside the Playwright perf spec rather than in a separate scripts directory. It's independent of the `apps/app/e2e` suite and never runs as part of the default `pnpm test:e2e:app`. CLI entry points (`seed.ts`, `query-bench.ts`, `mutation-bench.ts`, `filter-bench.ts`, `report.ts`, `virtual-tree-scroll.spec.ts`, `auth.setup.ts`) live at the top level; shared plumbing (`config.ts`, `cli-args.ts`, `http-client.ts`, `stats.ts`, `env.ts`, `synthetic-tree.ts`) lives under `e2e-perf/support/`.

- `pnpm perf:seed:app -- --count=20000 --shape=balanced|wide|deep --seed=42` seeds a large tree for a dedicated throwaway `perf-harness@cascadelist.com` user (never the dev seed user), non-interactively. `wide` makes one root with `count` direct children, `deep` makes a single chain `count` nodes long (exercising the recursive queries at depth, which is unbounded), `balanced` scales the interactive dev seed's branching shape to land on ~`count` total nodes. Every non-leaf node is seeded `expanded: true` so the app's default tree view actually shows the seeded scale. `--seed` (default `42`) seeds the faker-driven branching factor so repeated runs — and base-vs-head comparisons in `perf.yml` — build the *same* tree shape instead of a fresh random one each time; override it to intentionally sample a different shape. It builds on `apps/app/src/db/seed-tree.ts`, the shared tree-generator the interactive dev seed (`pnpm db:seed:app`) also uses — that file stays in `src/db/` since it's production-adjacent code, not test-only.
- `pnpm perf:query:app` needs the app server already running (`pnpm dev:app`, or a built server) at `APP_URL` (default `http://localhost:3001`). It authenticates as the perf-harness user over HTTP and calls the real `visibleTree` oRPC procedure repeatedly, walking cursor-paginated pages and reporting latency percentiles to `apps/app/perf-results/` (gitignored).
- `pnpm perf:mutate:app -- --creates=50 --moves=50 --duplicates=10 --duplicateSubtreeSize=20` benchmarks `createNode`, `moveNode` (advisory-locked reorder + fractional-index recomputation), and `duplicateNode` (recursive-CTE subtree copy, batched insert) latency over real HTTP calls, same server/auth requirements as `perf:query:app`. All three operations run against scratch parent nodes created just for the run (not the seeded tree from `perf:seed:app`), so results don't depend on `--shape`/`--count` and repeated runs don't drift the seeded tree's size; `duplicateNode` repeatedly duplicates the same `--duplicateSubtreeSize`-node template subtree, leaving each copy in place. The scratch parents (and everything created under them, including every duplicate) are deleted via `deleteNode`'s cascade when the run finishes. Results also go to `apps/app/perf-results/` (`mutation-bench.json`).
- `pnpm perf:filter:app -- --count=5000 --shape=balanced|wide|deep --seed=42 --collapsedFraction=0.5 --iterations=50` benchmarks `getRowVisibility` (`packages/outliner/src/virtual-tree/filter-visibility.ts`, the tag/due-date filter — see #374) directly against a synthetic, in-memory tree built by `e2e-perf/support/synthetic-tree.ts`, rather than over HTTP: filtering is pure client-side logic with no server round trip, so there's nothing for `http-client.ts` to call. `--shape`/`--seed` mean the same thing as `perf:seed:app`; `--collapsedFraction` controls what fraction of non-leaf rows start collapsed (collapsed descendants stay in the flattened row array rather than being dropped, so they still cost the filter something to skip past — this is what made the `getCollapsedDescendantIds` regression in #374 possible). Reports `tagFilter`/`dueTodayFilter` latency percentiles to `apps/app/perf-results/` (`filter-bench.json`).
- `pnpm perf:report:app -- --beforeDir=<dir> --afterDir=<dir>` diffs two `perf-results/` snapshots (`query-bench.json` and, if present, `mutation-bench.json`/`filter-bench.json`) into a markdown comparison table.
- `pnpm test:perf:ui:app` is a separate Playwright config/project (`playwright.perf.config.ts`, testing `e2e-perf/`) that loads the seeded tree in a real browser and asserts the number of mounted `role="treeitem"` rows stays small and roughly constant regardless of total tree size — a regression here means virtualization itself broke.
- `.github/workflows/perf.yml` runs `perf:seed`/`perf:query`/`perf:mutate`/`perf:filter` against both a PR's base and head commit and posts a single comment on the PR with the `visibleTree`, `createNode`, `moveNode`, and filter (`tagFilter`/`dueTodayFilter`) before/after comparison. It's a comparison for a human to read, not a merge gate, and only triggers on changes to `apps/app`/`packages/outliner`/`packages/auth`/`packages/http`.
- **Not yet measured, and why**: drag-and-drop latency (mouse-up to rendered result) and mutation reconciliation (server response to visible-tree update in TanStack Query) are both client-side/browser timings, closer in kind to `test:perf:ui:app`'s Playwright approach than to the pure-function/HTTP scripts above — neither has a harness yet.

## Architecture notes

### Data layer: fractional indexing + recursive CTEs

`nodes` (`apps/app/src/db/schema.ts`) is a self-referencing tree table (`parent_id` FK to `nodes.id`, cascade delete). Sibling order is a fractional index string (`order`, via `fractional-indexing`'s `generateKeyBetween`), stored with a custom `COLLATE "C"` text type so that byte-order comparison matches the fractional-indexing library's ordering. Because of that, moves and inserts only ever need to touch the moved/inserted row.

Reads for the tree view go through a single recursive CTE (`visibleTree` in `apps/app/src/core/nodes/node.procedures.ts`) that walks expanded nodes depth-first server-side, building a `path` array of `order` values per row for cursor pagination (`WHERE path > cursor`) and correct DFS ordering. `moveNode` takes a `pg_advisory_xact_lock` keyed on the user id to serialize concurrent reorders, and validates the destination isn't inside the moved node's own subtree via another recursive CTE before recomputing the fractional index.

### Soft-delete and retention

`deleteNode` doesn't remove rows — it stamps the target node and its whole subtree with a shared `deletedAt` (nodes.deletedAt), so a deleted node's `node_versions` survive and it stays restorable from version history (`restoreNodeVersion`/`restoreDeletedSubtree`, both in `node.procedures.ts`). Every normal read/write path (`listNodes`, `visibleTree`, `getNode`, `createNode`, `moveNode`, `duplicateNode`, slug resolution) filters out `deletedAt IS NOT NULL` rows, so deleted nodes are invisible everywhere except version history until restored.

`deleteNode` also inserts one `node_versions` marker row for the directly-targeted node only (`descendantsDeleted`, the count of descendants deleted alongside it — `NULL` on every normal content-edit row). `listTreeVersions` shows this marker but hides every other version belonging to a currently-deleted node, so a whole-subtree deletion collapses into a single tree-wide history entry instead of one per affected node; `listNodeVersions` (a specific node's own history) is unaffected and still lists everything. Restoring a marker (vs. an ordinary version) skips `snapshotAndSetContent` entirely — deletion never touched `content`, so there's nothing to roll back there, only `deletedAt`/`parentId`/`order` to undo.

Soft-deleted rows aren't kept forever: `apps/app/src/db/purge-deleted-nodes.ts` (`pnpm db:purge-deleted:app`) permanently removes any node whose `deletedAt` is older than a retention window (30 days by default, override with `--days=N`; `--dry-run` reports what would be purged without deleting). FK cascades take `node_versions` and `node_tags` with it — that's the point at which a deleted node's history is actually gone for good. This is a standalone script, not a request-time code path or a built-in scheduler — a self-hosted deployment is expected to invoke it periodically (e.g. a host cron job or systemd timer running `pnpm db:purge-deleted:app` daily).

### API: oRPC, not REST

`apps/app/src/orpc/router/index.ts` assembles the full router from procedures defined in `apps/app/src/core/<domain>/`. Procedures are built from `authed` (`apps/app/src/orpc/context.ts`), which requires a valid better-auth session and injects `context.user`. All node procedures re-scope every query by `userId` — there's no separate authorization layer, so a new procedure that queries `nodes` must filter by the current user itself. The web client (`apps/app/src/orpc/client.ts`) is consumed through `@orpc/tanstack-query` — route loaders call `queryClient.ensureQueryData(orpc.<x>.queryOptions(...))`, and one-off mutations go through the plain `client.<x>(...)` call, both from the same generated proxy.

### Routing: TanStack Start, file-based

Both apps use `@tanstack/react-router`'s file-based routing (`src/routes/`) with SSR via `@tanstack/react-start`. Routes are generated with `pnpm generate-routes:app` / `:web` (`tsr generate`) — don't hand-edit `src/routeTree.gen.ts`. `apps/app`'s root route (`src/routes/__root.tsx`) gates the whole app behind a session check in `beforeLoad`, redirecting to its own `/login` when unauthenticated; `apps/app` owns the actual login/register UI and calls the better-auth client, while `apps/web`'s `/login` and `/register` routes are pure redirects to `apps/app`.

Path aliases: within a workspace, `@/*` and `#/*` both resolve to that workspace's `src/*` (see each app's `tsconfig.json`); imports across workspaces use the `@cascade/*` package names and their `exports` map.

### Node content: Lexical

Node text is stored as serialized Lexical editor state (`jsonb` `content` column). `packages/outliner/src/lexical/edit` has the editable view, `.../lexical/read` has a read-only renderer, and `lexical-content.ts` has plain-text extraction (`lexicalToPlainText`) used for slugs and breadcrumb labels. `node.procedures.ts` validates incoming content against a recursive Zod schema shaped like a minimal Lexical tree before writing it.

### Node URL slugs

Node detail URLs are `/<slug-from-content>-<uuid-first-block>` (see `apps/app/src/ui/nodes/node-slug.ts`). The content-derived slug is normalized (lowercased, diacritics stripped, non-alphanumerics collapsed to hyphens) and capped in length; the trailing UUID-first-block suffix disambiguates duplicate titles while keeping links stable. `resolveNodeSlug` (`node.procedures.ts`) resolves a slug back to a node id, falling back to a full-UUID match and, when the first-block prefix is ambiguous, filtering candidates by the slug text before raising `SLUG_AMBIGUOUS`.

### i18n

Both apps use `@inlang/paraglide-js` (English + Dutch). Generated message functions live under `src/paraglide` (excluded from Biome) and are imported as `m` (e.g. `m.ui_loading()`). UI/outliner packages don't import `m` directly — they take a `labels` object via context providers (`UiLabelsProvider`, `OutlinerLabelsProvider`) that the consuming app populates with translated strings, so `packages/ui` and `packages/outliner` stay decoupled from the message catalog.

## Conventions

- **Formatting/linting**: Biome (tabs, double quotes, import organization on save). `pnpm check` is what CI runs — run it before considering a change done.
- **Commits / PR titles**: Conventional Commits (`feat:`, `fix:`, `chore:`, etc.), lowercase subject. PR titles are linted in CI.
- **CHANGELOG.md**: CI requires every PR that touches `apps/app` to also touch `CHANGELOG.md` with a user-facing entry (dated, newest on top), unless labeled `skip-changelog`. PRs that don't touch `apps/app` (e.g. `apps/web`-only or package-only changes) skip this check.
- **Linked issues**: CI requires every PR to close a linked issue.
- **AI-assisted changes**: per the README, use AI to execute a solution you already understand, not to figure out what to build — know the problem and the intended fix before generating code.
