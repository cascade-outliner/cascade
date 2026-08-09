# Migration plan: replacing apps/web-app's oRPC API with apps/api

This is the step-by-step task list for moving Cascade's backend from
`apps/web-app`'s internal oRPC procedures onto `apps/api` (NestJS +
Drizzle), incrementally. Read `apps/api/ARCHITECTURE.md` first — this
document assumes its module map, layering convention, and the Fastify/
Vitest/TypeScript-6 tooling decisions it records.

## End state

- `apps/api` owns the database schema (via Drizzle), all business logic,
  and exposes it as a versioned, OpenAPI-documented REST API.
- `apps/web-app` has **no server-side procedures of its own** — no
  `src/features/*/server/`, no oRPC router. Its route loaders and mutation
  hooks call `apps/api` over HTTP instead, the same way a third-party
  integration would. `apps/web-app` keeps the login/register UI, but the
  session it creates is verified by `apps/api` the same way
  `ARCHITECTURE.md`'s [Auth](./ARCHITECTURE.md#auth-shared-session-not-a-second-login)
  section already describes.
- `apps/api` has its own Drizzle schema, under `apps/api/src/database/schema/`
  — not a package shared with `apps/web-app`. There's no long-term
  consumer on the `apps/web-app` side to share it with: once a module is
  migrated, `apps/web-app` stops touching Postgres for it entirely and
  fetches from `apps/api` instead. See
  [Why no shared schema package](#why-no-shared-schema-package) below.
- oRPC, `@orpc/*`, and `apps/web-app/src/db` are deleted at the end. Until
  then they keep working — nothing here is a big-bang cutover.

## Why no shared schema package

An earlier version of this plan proposed extracting the Drizzle schema
into a `packages/db` both apps would depend on. That solves the wrong
problem: a shared package earns its cost when two apps need to keep
importing the same thing indefinitely (`packages/auth` is exactly that —
both apps create sessions/verify cookies forever). That's not this
situation — `apps/web-app`'s server-side data access is being deleted, not
kept. Building a shared package for a consumer that's going away in a few
phases is speculative infrastructure for a need that expires.

Instead: `apps/api` writes its own copy of a table's Drizzle definition,
copied from `apps/web-app`'s current one at the point that module's
migration starts (each phase below says which files). For that module's
migration window, two TypeScript files describe the same table — that's
an accepted, temporary fork, not a drift risk to design around, because
`apps/web-app`'s copy is deleted as soon as the module's migration
finishes (its last step in every phase below).

What does **not** fork: actual schema *changes* (DDL). `apps/web-app`'s
existing `drizzle/` migration history stays the one source of truth for
`db:generate`/`db:push`/`db:migrate` for the entire transition — `apps/api`
only ever reads/writes through `drizzle-orm` against tables whose DDL
someone else manages, and doesn't get its own `drizzle-kit` config until
Phase 7, when migration ownership moves over wholesale (by moving the
`drizzle/` folder itself, preserving history — not regenerating it from
scratch). If a table needs a schema change while its migration is
in-flight, make it in `apps/web-app`'s copy (the one still driving
`drizzle-kit`) and hand-copy the change into `apps/api`'s copy — the same
manual sync any other temporary fork needs.

## Guiding principles

1. **Strangler fig, not a rewrite.** `apps/web-app`'s oRPC API keeps
   serving production traffic until the *specific* procedure being
   migrated has a working, tested `apps/api` equivalent and the client has
   been switched over to it. Never migrate logic and cut the client over
   in the same PR — see step-shape below.
2. **One seam at a time.** The natural seam is
   `apps/web-app/src/features/*/client/**/mutations` and `**/queries` —
   each hook already isolates "how do I fetch/mutate this" from the UI
   that calls it (`packages/outliner` takes data/callbacks, never fetches
   anything itself). Migrating a hook's internals from the oRPC client to
   an `apps/api` HTTP call is invisible to every component that uses it.
3. **Copy the schema a module needs, then business logic, then the wire
   format.** Copying (not sharing) is fine here specifically because the
   copy is short-lived — see
   [Why no shared schema package](#why-no-shared-schema-package). Delete
   `apps/web-app`'s copy of a table file once nothing in `apps/web-app`
   imports it anymore — for a table used by only one phase's procedures
   that's "as soon as that phase's retirements are done," but
   `node-tables.ts` (used across Phases 2 *and* 3) and
   `tree-history-table.ts` (used by Phase 1's `maintenance` *and* Phase
   4's `tree-history`, and Phase 1's cutover is deliberately deferred to
   Phase 7 — see that phase) live longer. Check for remaining importers
   before deleting a table file, don't assume "this phase is done" means
   "this table is free."
4. **Port persistence logic, don't re-derive it.** Fractional-index
   recomputation, the advisory-lock reorder in `moveNode`, the recursive
   CTE in `visibleTree`/`duplicateNode`'s subtree copy — these are
   correctness-critical and already debugged. Move the file, adjust
   imports, don't rewrite the algorithm from memory.
5. **Prove parity before switching the client.** Every migrated
   procedure needs a test (unit + a `.db.test.ts`-style integration test
   against a real Postgres, matching `apps/web-app`'s existing
   `node-procedures.db.test.ts` pattern) asserting the same behavior as
   the oRPC procedure it replaces, run against the same schema.

## Step shape (repeat for every procedure)

Every procedure migration — whether it's `list-tags` or `move-node` —
goes through the same five steps, in the same order:

1. **Port**: move the procedure's logic into
   `apps/api/src/modules/<module>/application/`, backed by a repository in
   `infrastructure/` built on `apps/api`'s own copy of the relevant
   `src/database/schema/` table(s) and its shared `DatabaseModule` client.
2. **Expose**: add the controller route + `dto/` request/response classes
   (`class-validator`/`class-transformer`, `@nestjs/swagger`-decorated).
3. **Test**: unit-test the application service, integration-test the
   repository against Postgres, and add a parity assertion (see
   [Parity testing](#parity-testing)).
4. **Cut over**: change the *one* `apps/web-app` client hook that used the
   oRPC procedure to call `apps/api` instead (see
   [Client cutover](#phase-6-client-cutover)). Ship this as its own PR,
   separate from step 1–3's PR, so a bad cutover is a one-line revert.
5. **Retire**: once the cutover PR has been live long enough to trust,
   delete the old oRPC procedure file and its exports from
   `apps/web-app/src/orpc/router.ts` in a follow-up PR.

## Phase 0 — Foundations (blocks every module)

This has to land before any module's real logic is ported. Unlike the
earlier draft of this plan, there's no shared-package extraction here —
just `apps/api` standing up its own database access, independent of
`apps/web-app`'s.

- [ ] In `apps/api`, implement `src/database` for real: add `drizzle-orm`
      and `postgres` as dependencies (no `drizzle-kit` yet — see
      [Why no shared schema package](#why-no-shared-schema-package)), and
      a `DatabaseModule` providing a Drizzle client as a Nest custom
      provider (e.g. token `DRIZZLE`), configured from `DATABASE_URL`. Port
      the `statement_timeout: 30_000` connection option from
      `apps/web-app/src/db/index.ts` — don't drop it silently.
- [ ] `src/database/schema/` starts empty (no `.gitkeep` needed once this
      lands — Phase 1 adds its first file immediately after). Each later
      phase copies in exactly the table file(s) it needs, from
      `apps/web-app`'s current definitions:
      - Phase 1 (`maintenance`) needs
        `features/tree-history/server/tree-history-table.ts`
        (`treeHistoryEvents`, `treeHistorySnapshots`).
      - Phases 2–3 (`nodes`) need
        `features/nodes/server/persistence/node-tables.ts`
        (`statuses`, `nodes`, `tags`, `nodeTags`).
      - Phase 5 (`users`) needs
        `features/settings/server/settings-table.ts` (`userSettings`) and,
        if premium-seat data is read/written by anything ported in that
        phase, `features/premium/server/premium-table.ts` (`premiumSeats`).
- [ ] Add real env validation to `apps/api/src/config`: `@t3-oss/env-core`
      + `zod`, matching `packages/auth/src/env.ts`'s pattern (per
      `ARCHITECTURE.md`'s [Config](./ARCHITECTURE.md#config) section) —
      at minimum `DATABASE_URL` and `BETTER_AUTH_SECRET` become required,
      non-optional server env vars at this point.
- [x] Implement `modules/auth/guards`' `SessionGuard` against
      `createAuth(db)` from `@cascade/auth/server`, plus
      `modules/auth/decorators`'s `@CurrentUser()`. Apply the guard
      app-wide (e.g. via `APP_GUARD` in `app.module.ts`) before any other
      module starts accepting requests, with an explicit `@Public()`
      escape hatch for `/health` and anything else that must stay
      unauthenticated.
- [x] Wire a global `ValidationPipe({ whitelist: true, transform: true })`
      and the RFC 7807 exception filter (`common/filters`) in `main.ts`,
      per `ARCHITECTURE.md`'s [Validation](./ARCHITECTURE.md#validation-and-api-docs)
      and [Error handling](./ARCHITECTURE.md#error-handling)
      sections, before the first real DTO lands.
- [x] Add `@nestjs/swagger`, wire `SwaggerModule` in `main.ts` behind a
      `/docs` route, so every module below documents itself as it's built
      instead of retrofitting docs at the end.
- [ ] Upgrade `modules/health`'s check to a real readiness probe (via
      `@nestjs/terminus`) that pings the now-real `DatabaseModule`, not
      just process uptime — this was explicitly deferred in
      `health.controller.ts`'s existing comment until `src/database`
      existed.

## Phase 1 — First real module: `maintenance`

Migrate this one first, before touching `nodes` at all. It's the smallest
possible slice that exercises the whole request pipeline (guard → DTO →
service → repository → response) end to end, and it's already
token-authenticated and REST-shaped in `apps/web-app` today (`POST
/api/maintenance/purge-tree-history`), so there's no design decision to
make about what the contract should look like — just port it.

- [ ] Copy `features/tree-history/server/tree-history-table.ts`
      (`treeHistoryEvents`, `treeHistorySnapshots`) into
      `apps/api/src/database/schema/` — `apps/web-app`'s copy stays put for
      now (Phase 4 still needs it, and per the note below so does this
      module's own cutover).
- [ ] Port the purge logic from
      `apps/web-app/src/features/tree-history/server/purge-tree-history.ts`
      into `modules/maintenance/application`.
- [ ] Add a token guard (bearer `TREE_HISTORY_PURGE_TOKEN`, same
      32+-char-secret convention as today) — this can reuse or sit
      alongside `modules/auth`'s guards, but it's deliberately *not* the
      session guard, matching how `apps/web-app`'s route isn't
      session-gated either.
- [ ] Add `POST /v1/maintenance/purge-tree-history` with a DTO matching the
      existing `{ days?, dryRun? }` body.
- [ ] Port `apps/web-app`'s test coverage for the purge job.
- [ ] Leave `apps/web-app`'s route in place for now (it's a cron/ops
      target, not something the SPA calls — cut it over in Phase 7 by
      repointing whatever deployment cron/systemd timer calls it, not via
      a client hook).

## Phase 2 — Read-only node/tag/status endpoints

Reads are lower-risk than writes (no data corruption if something's
subtly wrong, easier to compare parity against production data) and
`nodes` is the app's core domain — start earning real confidence here
before touching mutations.

- [ ] Copy `features/nodes/server/persistence/node-tables.ts`
      (`statuses`, `nodes`, `tags`, `nodeTags`) into
      `apps/api/src/database/schema/` — `apps/web-app`'s copy stays put
      until every procedure in this phase *and* Phase 3 is retired (see
      [Guiding principles](#guiding-principles) #3).
- [ ] `GET /v1/nodes/:id` — port `get-node.ts`.
- [ ] `GET /v1/nodes/:id/ancestors` — port `get-node-ancestors.ts`.
- [ ] `GET /v1/nodes` (cursor-paginated visible tree) — port
      `visible-tree.ts`, including its recursive CTE from
      `features/nodes/server/persistence/tree-cte.ts`. This is the
      highest-traffic read in the app; give it the most parity-testing
      attention of anything in this phase.
- [ ] `GET /v1/nodes/resolve/:slug` — port `resolve-node-slug.ts`
      (including its `SLUG_AMBIGUOUS` fallback behavior).
- [ ] `GET /v1/tags`, `GET /v1/statuses` — port `list-tags.ts` /
      `list-statuses.ts`.
- [ ] `GET /v1/nodes/due-soon` — port `list-due-soon.ts`.
- [ ] `GET /v1/nodes/quick-open` — port `quick-open.ts`.
- [ ] `GET /v1/nodes` (flat list variant, if distinct from the tree
      query) — port `list-nodes.ts`.

## Phase 3 — Node mutations

Order these by blast radius: single-field setters first (a bad deploy
loses one field on one node), transactional tree-shape operations last (a
bad deploy can corrupt sibling ordering or orphan subtrees).

- [ ] Simple field setters — one PR each, or a few batched together once
      the pattern is proven on the first: `set-node-due-date.ts`,
      `set-node-icon.ts`, `set-node-priority.ts`, `set-node-recurrence.ts`,
      `set-node-status.ts`, `set-node-tags.ts`, `set-node-type.ts`,
      `set-node-board-view.ts`, `set-task-completed.ts`,
      `toggle-node-expanded.ts`, `update-node-content.ts` (port its
      recursive Lexical-content Zod validation as-is, don't loosen it).
- [ ] Tag/status CRUD: `create-tag.ts`, `rename-tag.ts`, `delete-tag.ts`,
      `create-status.ts`, `update-status.ts`, `delete-status.ts`.
- [ ] `create-node.ts`.
- [ ] `delete-node.ts` / `restore-node.ts` (cascade-delete semantics,
      restore-from-tree-history interaction — port together, they're two
      halves of one feature).
- [ ] `move-node.ts` — port the `pg_advisory_xact_lock` + fractional-index
      recompute from `features/nodes/server/persistence/sibling-order.ts`
      exactly; add a concurrency test (two simultaneous moves under the
      same parent) before trusting this one.
- [ ] `duplicate-node.ts` — port the recursive-CTE subtree copy +
      batched insert from `persistence/subtree-copy.ts` and
      `persistence/batch-inserts.ts`. Test with the same
      `--duplicateSubtreeSize` shapes `perf:mutate:app` already exercises,
      not just single-node cases.
- [ ] Once every Phase 2 and Phase 3 procedure above has been cut over and
      retired (per [Step shape](#step-shape-repeat-for-every-procedure)),
      delete `apps/web-app/src/features/nodes/server/persistence/node-tables.ts`
      — `apps/api`'s copy is now the only one.

## Phase 4 — Tree history

Depends on Phase 3 being complete for the mutations that emit history
events: port this only once node mutations in `apps/api` already write
`tree_history_events`/`tree_history_snapshots` rows in the same shape
`apps/web-app` does, otherwise a node edited through `apps/api` has a gap
in its undo history. The `tree-history-table.ts` schema copy already
exists in `apps/api/src/database/schema/` from Phase 1 — nothing to add
there, just build on it.

- [ ] Port the read/list/restore procedures under
      `features/tree-history/server/` (check that folder for the current
      procedure list — it wasn't enumerated during the `apps/api` scaffold
      work and needs a fresh look here).
- [ ] Port the `TREE_HISTORY_RETENTION_DAYS`-based visibility cutoff so
      `apps/api`'s read/restore endpoints respect the same retention
      window `purge-tree-history` (already migrated in Phase 1) enforces.

## Phase 5 — Users / account / settings / sessions

- [ ] Copy `features/settings/server/settings-table.ts` (`userSettings`)
      into `apps/api/src/database/schema/`, and
      `features/premium/server/premium-table.ts` (`premiumSeats`) too if
      the premium work below ends up needing it.
- [ ] Port `features/account-data`, `features/settings`,
      `features/sessions`'s server procedures into `modules/users`.
- [ ] Port `features/onboarding`'s `onUserCreated` hook path — check how
      it's wired into `createAuth`'s `hooks.onUserCreated` today in
      `apps/web-app` and decide whether `apps/api` needs to own it or
      whether it stays a `packages/auth` + `apps/web-app` concern
      permanently (this is the one piece of "auth-adjacent" logic that
      isn't obviously just session verification — needs its own design
      pass, not a straight port).
- [ ] Port `features/premium` if/where it has server procedures beyond
      the `premiumSeats` table itself.
- [ ] Once this phase's procedures are cut over and retired, delete
      `apps/web-app/src/features/settings/server/settings-table.ts` and
      (if copied above) `.../premium/server/premium-table.ts`.

## Phase 6 — Client cutover

Do this incrementally, module by module, following each module's Phase
2–5 work — not as one final phase at the end.

- [ ] Generate a typed HTTP client from `apps/api`'s OpenAPI spec (e.g.
      `openapi-typescript` + `openapi-fetch`, or `orval` generating
      TanStack Query hooks directly) rather than hand-writing `fetch`
      wrappers per endpoint — with ~40 procedures to port, a generated
      client is what keeps this from becoming its own maintenance burden,
      and it's the direct payoff of `ARCHITECTURE.md`'s OpenAPI-first
      choice.
- [ ] For each migrated procedure, update the *one* corresponding hook
      under `apps/web-app/src/features/nodes/client/tree/mutations/` (or
      the relevant feature's `client/`) to call the generated client
      instead of `client.<x>(...)`/`orpc.<x>.queryOptions(...)`. Because
      these hooks already sit behind `packages/outliner`'s callback-based
      API, no component code changes.
- [ ] Keep both code paths buildable during the transition: don't delete
      an oRPC procedure in the same PR that cuts its client hook over
      (see [Step shape](#step-shape-repeat-for-every-procedure), step 5).
- [ ] Re-run `apps/web-app`'s Playwright e2e suite
      (`pnpm test:e2e:app`) after each cutover PR — it's the one test
      layer that exercises real client → server round trips and will
      catch a subtly wrong DTO shape that unit tests miss.

## Phase 7 — Decommission

Only once every procedure has been ported, tested, and cut over:

- [ ] Repoint whatever deployment cron/systemd timer calls
      `POST /api/maintenance/purge-tree-history` at `apps/api`'s
      `/v1/maintenance/purge-tree-history` instead (Phase 1's cutover,
      deliberately deferred to here — it's an ops target, not a client
      hook).
- [ ] Delete `apps/web-app/src/orpc` and the `@orpc/*` dependencies from
      `apps/web-app/package.json`.
- [ ] Sweep `apps/web-app/src/features/*/server/` for anything left —
      per-procedure retirement (Step shape, step 5) should have already
      emptied it out module by module, so this is a verification pass,
      not the primary deletion mechanism. `.../tree-history/server/`
      (including `tree-history-table.ts`, kept alive by the maintenance
      route above) and `.../nodes/server/persistence/node-tables.ts` (if
      Phase 3's retirement step was somehow missed) are the two most
      likely leftovers. Keep `apps/web-app/src/features/*/client/` and
      `ui/` — those aren't going anywhere.
- [ ] Delete `apps/web-app/src/db` (the connection factory `apps/web-app`
      no longer needs, since it no longer talks to Postgres directly).
- [ ] Move Drizzle migration ownership to `apps/api`: `git mv` `apps/web-app/drizzle/`
      (the actual migration history) and `apps/web-app/drizzle.config.ts`
      into `apps/api`, add `drizzle-kit` as an `apps/api` dependency, and
      point the moved config's `schema` glob at
      `apps/api/src/database/schema/**/*.ts` instead of the old
      `*-table(s).ts` globs. This is the one point in the whole migration
      where `apps/api` starts owning DDL — see
      [Why no shared schema package](#why-no-shared-schema-package).
- [ ] Move `db:generate`/`db:migrate`/`db:push`/`db:seed`/`db:studio`
      script ownership from `apps/web-app`'s `package.json` to
      `apps/api`'s, and update root `package.json`'s `:app`-suffixed DB
      scripts to `:api`.
- [ ] Update `CLAUDE.md`'s "What this is" section: `apps/web-app` no
      longer "owns the database schema [and] the oRPC API" — `apps/api`
      does. Update `apps/api/ARCHITECTURE.md` too — its "Why a second
      backend app" and "Data layer" sections both describe the
      in-progress state this phase completes.
- [ ] Add `apps/api` to the root `pnpm dev` parallel run.
- [ ] Retire the perf harness's assumption that `apps/web-app` is the
      server under test (`e2e-perf/support/http-client.ts`'s `APP_URL`
      default) — repoint `perf:query`/`perf:mutate`/`perf:filter`/
      `perf:workflow` at `apps/api`.

## Parity testing

Until a module reaches Phase 6, keep a scratch comparison test (doesn't
need to be permanent CI) that runs the same input through both the oRPC
procedure and the `apps/api` equivalent against the same seeded data and
diffs the result. This is cheap insurance against the two implementations
silently drifting during the window where both exist. It's the
business-logic equivalent of the discipline
[Why no shared schema package](#why-no-shared-schema-package) already
applies to the temporarily-forked table definitions: an accepted,
temporary fork is fine as long as something is actually watching for it
to drift, not fine left to chance.

## What this plan deliberately leaves open

- **Whether `apps/api`'s contract is REST or something else.**
  `ARCHITECTURE.md` picked REST + OpenAPI for the reasons given there;
  this plan doesn't revisit that, but if it changes, Phase 6's "generate a
  typed client from OpenAPI" step changes with it.
- **Whether migrated `apps/web-app` SSR loaders call `apps/api` over the
  network or in-process.** Calling over HTTP (even for same-host
  server-to-server calls) is the simplest mental model and what "no
  server-side procedures of its own" in [End state](#end-state) assumes;
  an in-process shortcut is a possible later optimization, not a
  Phase-0–7 concern.
- **Exact endpoint URL/verb choices per procedure.** The phase lists above
  say *what* to port, not the final REST shape (e.g. whether
  `set-node-status` is `PATCH /v1/nodes/:id/status` or a field on a
  general `PATCH /v1/nodes/:id`) — design that when a module's Phase 2–5
  work actually starts, informed by whatever DTO conventions the earlier
  modules already established.
