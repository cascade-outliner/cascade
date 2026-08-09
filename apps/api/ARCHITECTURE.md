# apps/api architecture

## Status

This app is a **scaffold**, not a working backend yet. The only real code is
the bootstrap itself (`src/main.ts`, `src/app.module.ts`) and one fully
implemented module, `modules/health`, which exists to prove the app actually
boots, listens, and is testable. Every other directory under `src/` is an
empty, `.gitkeep`-only placeholder marking where a future module's code goes.
Nothing in `apps/web-app` changes as part of this — it keeps owning the
database schema, the oRPC API, and auth session creation exactly as
described in the root `CLAUDE.md`.

Read this file before adding code to a placeholder directory: it records the
decisions already made so the first real PR into `modules/nodes` (or any
other module) doesn't have to re-litigate them.

The plan for actually getting from this scaffold to `apps/api` replacing
`apps/web-app`'s oRPC API — in what order, and with what safety net — is
[`MIGRATION.md`](./MIGRATION.md), not this file.

## Why a second backend app

`apps/web-app` already has a complete API: oRPC procedures under
`src/features/*/server/`, consumed through `@orpc/tanstack-query` by the
same app's own React client. That contract is optimized for exactly one
consumer — a first-party SPA living in the same TypeScript project, sharing
types by import rather than by schema. It is not meant to be a stable,
externally-documented public contract, and it isn't one today.

`apps/api` is for everything that *isn't* that first-party client:
third-party integrations, automation/scripting against a user's own tree,
and any future non-web client (native mobile, CLI) that can't import
TypeScript procedure types and needs a real, versioned, documented HTTP
contract instead. NestJS was chosen for this specific job — it has
first-class OpenAPI generation (`@nestjs/swagger`), a request pipeline
(guards → interceptors → pipes → controller) built for enforcing a public
contract's validation and auth rules consistently, and a module system that
maps cleanly onto the domain boundaries `apps/web-app/src/features` already
established.

**Update:** the intent has since become to replace `apps/web-app`'s oRPC
API with `apps/api` over time — see `MIGRATION.md` for the step-by-step
plan. This section's reasoning still stands as the *reason to build on
NestJS/REST/OpenAPI in the first place*; it just turned out to also be a
reasonable target to migrate the first-party client onto, not only
third-party integrations. Either way, the transition is incremental: at
every point along `MIGRATION.md`'s phases, `apps/web-app`'s oRPC API keeps
working until the specific piece replacing it is proven, and `apps/api`
reuses the same Postgres database and the same better-auth session cookie
rather than owning a parallel copy of either — see
[Data layer](#data-layer-shared-postgres-not-a-second-database) and
[Auth](#auth-shared-session-not-a-second-login) below.

## Module map

Modules mirror `apps/web-app/src/features` boundaries so the two apps stay
conceptually aligned even though they're structured differently day to day.

| Module | Mirrors (`apps/web-app/src/features/`) | Layers present | Status |
|---|---|---|---|
| `modules/health` | — (infra-only) | flat, no layering | **Implemented** |
| `modules/auth` | `auth`, `sessions` | `guards/`, `decorators/` | Placeholder |
| `modules/users` | `account-data`, `settings` | `domain/`, `application/`, `infrastructure/`, `dto/` | Placeholder |
| `modules/nodes` | `nodes` (tree CRUD, tags, statuses, due dates, quick-open, board view) | `domain/`, `application/`, `infrastructure/`, `dto/` | Placeholder |
| `modules/tree-history` | `tree-history` | `domain/`, `application/`, `infrastructure/`, `dto/` | Placeholder |
| `modules/maintenance` | `tree-history`'s purge job / `POST /api/maintenance/purge-tree-history` | `application/`, `infrastructure/`, `dto/` | Placeholder |

Notes on the boundary choices:

- **`nodes` stays one module**, not split into `nodes`/`tags`/`statuses`/
  `due-dates`. In `apps/web-app` those are procedures within one feature,
  not separate features, because they share the same aggregate (a node)
  and the same transactional persistence helpers
  (`features/nodes/server/persistence/`). Splitting them into separate Nest
  modules would fragment an aggregate that's tightly coupled by design.
- **`auth` has no `domain/`/`application/` layers.** It doesn't own a
  domain concept or run its own use cases — it verifies sessions that
  `packages/auth` (better-auth) already created and persisted. Its only job
  is a guard that checks the incoming session cookie and a decorator that
  exposes the resulting user to controllers. See
  [Auth](#auth-shared-session-not-a-second-login).
- **`maintenance` has no `domain/`.** It's a thin operational wrapper that
  triggers tree-history's existing purge logic on a schedule/token-auth'd
  request; it doesn't introduce a domain concept of its own, matching how
  `apps/web-app`'s `POST /api/maintenance/purge-tree-history` route already
  behaves as a thin operational endpoint rather than a feature.
- **`health` stays flat.** A liveness check is one function; giving it
  `domain/application/infrastructure` folders would be layering for its own
  sake.

## Layering convention (inside a feature module)

Where a module has layers, they mean the same thing every time:

```
modules/<name>/
  domain/          framework-agnostic entities, value objects, invariants
                    (e.g. a fractional-index value object, subtree-move
                    validation). No Nest imports, no Drizzle imports.
  application/      use-case services — one class per use case, orchestrating
                    domain + infrastructure. Mirrors apps/web-app's
                    one-procedure-per-file convention under
                    features/*/server/procedures/.
  infrastructure/    Drizzle repositories and other persistence-specific
                    code. Implements interfaces defined in domain/, so
                    application/ depends on an abstraction, not Drizzle
                    directly.
  dto/               HTTP-facing request/response shapes: class-validator +
                    class-transformer classes, decorated for
                    @nestjs/swagger. Controllers (not yet
                    scaffolded — one per module, at the module root)
                    depend on dto/ and application/ only, never on
                    domain/ or infrastructure/ directly.
```

Dependency direction is one-way: `dto`/controller → `application` →
`domain` ← `infrastructure`. `domain/` never imports from the other three.
This is the same reasoning that already keeps
`packages/outliner`/`packages/ui` framework-agnostic and decoupled from
oRPC/data-fetching in this repo — it's applied here at the module level
instead of the package level.

## Data layer: shared Postgres, not a second database

`apps/api` is meant to read and write the **same** `nodes`/`tags`/
`tree_history_events` tables `apps/web-app` owns, not a parallel copy. That
has one prerequisite this scaffold deliberately does not do yet:
`apps/web-app/src/db/schema.ts` currently lives inside `apps/web-app/src/`,
which `apps/api` cannot import (cross-workspace imports only go through a
package's `exports` map, per the root `CLAUDE.md`).

**Before `src/database` gets real code**, the Drizzle schema needs to move
to a new `packages/db` (or similar) that both apps depend on via
`workspace:*`, the same way `packages/auth` already centralizes the
better-auth schema. Until that happens, `src/database` stays a placeholder
rather than growing a second, drifting copy of the schema. This is the
single biggest piece of groundwork the next PR into this app should do.

Once that split exists, `src/database` becomes a small `DatabaseModule`
providing a `drizzle-orm/postgres-js` client configured from `DATABASE_URL`
(same connection string as `apps/web-app`, see `.env.local.example`),
injected into each module's `infrastructure/` repositories.

## Auth: shared session, not a second login

`apps/api` has no login/register UI or endpoints of its own — per
`CLAUDE.md`, `apps/web-app` owns that, and `packages/auth`'s
`createAuth(db)` is the single source of truth for how a session is
created and how the cookie is scoped (`COOKIE_DOMAIN` in production).

The planned `modules/auth/guards` contains a `SessionGuard` that calls
`createAuth(db).api.getSession({ headers })` (the same call
`apps/web-app`'s oRPC context uses) against the incoming request's cookies,
attaching the resolved user via `modules/auth/decorators`' `@CurrentUser()`.
This makes `apps/api` a second *verifier* of sessions `apps/web-app`
issues, never a second issuer — a user logs in once, on `apps/web-app`, and
the resulting cookie authenticates them on both. This guard needs
`packages/auth` as a dependency and therefore also needs `BETTER_AUTH_SECRET`
(see `.env.local.example`) — it must be the *same* secret `apps/web-app`
signs cookies with, not a freshly generated one.

Every procedure in `apps/web-app` re-scopes its own queries by
`context.user.id` rather than relying on a separate authorization layer
(see `CLAUDE.md`). The same rule applies here: `SessionGuard` establishes
*who* is calling, but each `application/` use case is still responsible for
scoping its own queries to that user — there's no row-level security or
shared authorization layer to fall back on.

## HTTP adapter: Fastify

`NestFactory.create` in `src/main.ts` is given `@nestjs/platform-fastify`
explicitly rather than Nest's default Express adapter. Nest's public API is
adapter-agnostic (guards/pipes/interceptors/decorators all behave the same
either way), so this is a low-regret choice made once, up front, rather
than a migration later.

## Versioning

`app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" })`
in `main.ts` means every controller route defaults to living under `/v1/*`
unless it opts out. `GET /health` explicitly opts out
(`@Controller({ path: "health", version: VERSION_NEUTRAL })` — the class-level
`version` option, not the method-only `@Version()` decorator) because infra
liveness/readiness probes
should have one stable, unversioned URL. As a public-facing contract (see
[Why a second backend app](#why-a-second-backend-app)), breaking changes to
`apps/api` need a new version segment rather than a silent behavior change
on an existing route — unlike the internal oRPC API, which can change
in lockstep with its one consumer.

## Validation and API docs (planned)

Not wired up yet — no DTOs exist for the pipeline to validate. When the
first real module lands:

- Request/response shapes go in that module's `dto/` as
  `class-validator`-decorated classes, enabled globally via a
  `ValidationPipe({ whitelist: true, transform: true })` in `main.ts`.
- Those same DTOs get `@nestjs/swagger` decorators so `SwaggerModule` can
  serve generated OpenAPI docs — the point of building this on NestJS
  instead of another oRPC instance is exactly this: a contract that's
  documented for consumers who aren't importing this repo's TypeScript
  types.

## Error handling (planned)

A global exception filter (`common/filters`) will translate thrown
domain/application errors into a consistent
[RFC 7807](https://www.rfc-editor.org/rfc/rfc7807) `application/problem+json`
body, rather than each controller handling its own error shape. Not
implemented yet since there are no errors to translate — `common/filters`
is a placeholder for this one filter, not a grab-bag.

## Testing: Vitest, not Jest

Nest's CLI defaults to Jest; this app uses Vitest instead, to match every
other workspace in the monorepo (`test:app`, `test:web`,
`test:outliner`, `test:ui`, `test:coverage:http` are all Vitest) rather than
running two different test runners in one repo.

The one wrinkle: Vitest's default transform (esbuild) doesn't emit
TypeScript decorator metadata, which Nest's DI container needs at runtime
to resolve constructor parameters by type. `vitest.config.ts` uses
[`unplugin-swc`](https://github.com/unplugin/unplugin-swc) (the same fix
the NestJS docs themselves recommend for Vitest) so `@Injectable()`
constructor injection works the same under test as it does under `nest
build`. `modules/health/health.controller.spec.ts` is the smoke test
proving this actually works, not just a placeholder.

Unit specs live next to the code they test (`*.spec.ts`), matching the rest
of the repo. `test/e2e` is reserved for whole-app boot tests (start Nest,
issue real HTTP requests via `supertest`) once there's more than one
controller worth exercising end-to-end.

## Config

`ConfigModule.forRoot({ isGlobal: true })` in `app.module.ts` loads
`.env.local`/`.env` today, but nothing validates its contents yet — `PORT`
is the only variable actually read (directly, in `main.ts`), and a missing
or malformed value just falls back to `3002`. Once `src/config` has real
environment variables to validate (`DATABASE_URL`, `BETTER_AUTH_SECRET`,
...), it should use `@t3-oss/env-core` + `zod` the same way
`packages/auth/src/env.ts` and `apps/web-app` already do, rather than
introducing a different env-validation library for this one app.

## Why this app pins TypeScript 6, not 7

Every other workspace in the monorepo is on `typescript@^7.0.2` (the native
compiler). `apps/api` deliberately pins `^6.0.3` instead — this is the one
place in the repo where that's intentional, not a stale dependency:

- `@nestjs/cli`'s build/watch pipeline (`nest build`, `nest start --watch`)
  loads the `typescript` package at runtime and calls
  `ts.getParsedCommandLineOfConfigFile(...)` to read `tsconfig.json` before
  handing off to whichever builder is configured (`tsc`, `webpack`, or
  `swc`, see below) — it needs that call regardless of which builder does
  the actual compiling. TypeScript 7.0's native port doesn't expose that
  function yet (Nest's own error message points at 7.1); `nest build`
  fails immediately with `UNSUPPORTED_TYPESCRIPT_VERSION` under 7.0.2, no
  matter what else is configured.
- The other apps never hit this because they never call into `typescript`'s
  programmatic API — `apps/web-app`/`apps/website` build via Vite (esbuild
  under the hood) and only *invoke* `tsc --noEmit` as a separate CLI
  process for type-checking, which the 7.0 executable still supports fine.
- `apps/api` does the same split for the same reason: `nest build` builds
  (via `swc`, not `tsc`, see below), and a separate `tsc --noEmit` process
  (part of this app's own `build` script) does the actual type-checking —
  but the first half still needs a `typescript` version whose API Nest's
  CLI can call, hence the 6.x pin.

Revisit this pin once `@nestjs/cli` supports TypeScript 7.1+, so `apps/api`
can rejoin the rest of the repo on one TypeScript version.

## Build: `swc`, not `tsc`

`nest-cli.json` sets `"builder": "swc"` (with `"typeCheck": false`) instead
of Nest's default `tsc`-API-driven build. This wasn't a performance
preference — it's required by the TypeScript 6 pin above: even with `swc`
doing the actual compilation, `nest build` still shells out to
`typescript` once just to parse `tsconfig.json`, but that call works fine
on 6.x, and swc itself never touches the TS compiler API at all. Type
correctness is still enforced — just by the separate `tsc --noEmit -p
tsconfig.build.json` step chained after `nest build` in this app's `build`
script, matching how `apps/web-app`'s `build` script is `vite build && tsc
--noEmit` (bundle/transpile, then a dedicated type-check pass) rather than
relying on the bundler's own type checking.

One consequence: `tsconfig.json` intentionally has no `baseUrl`/`paths`
path-alias config. Nothing in this scaffold needs one yet, and swc's
module-resolution transform needs `baseUrl` to be an absolute directory it
can resolve aliases against if one is ever added — add it back together
with the matching `jsc.baseUrl` swc config (in `vitest.config.ts`'s
`swc.vite()` call and implicitly via `nest-cli.json`'s builder) rather than
copying just the `tsconfig.json` half from another workspace.

## Biome, not ESLint/Prettier

Nest's CLI scaffolds ESLint + Prettier by default; both were dropped here.
The root `biome.json` already lints/formats everything under `**/src/**/*`
across the monorepo (tabs, double quotes, import organization), and
`pnpm check` is the CI gate for all of it — adding a second linter/formatter
pair for just this one app would fight that gate instead of running under
it.

## Directory layout

```
apps/api/
  src/
    main.ts                    Nest bootstrap (Fastify adapter, versioning)
    app.module.ts               Root module: ConfigModule + feature modules
    common/                     Cross-cutting, app-wide pipeline pieces
      decorators/                (empty — e.g. a future @Public() marker)
      filters/                   (empty — the planned RFC 7807 exception filter)
      interceptors/               (empty — e.g. logging/timeout)
      middleware/                 (empty — e.g. request-id)
      pipes/                      (empty — validation pipe config, if it
                                   outgrows a one-liner in main.ts)
    config/                      (empty — typed env validation, see Config)
    database/                    (empty — DrizzleModule, see Data layer)
    modules/
      health/                    Implemented: liveness probe
        health.module.ts
        health.controller.ts
        health.controller.spec.ts
      auth/                      Placeholder: session verification
        guards/
        decorators/
      users/                     Placeholder: account/profile/settings
        domain/ application/ infrastructure/ dto/
      nodes/                     Placeholder: tree CRUD, tags, statuses,
        domain/ application/ infrastructure/ dto/   due dates, quick-open, board view
      tree-history/              Placeholder: undo/history read + restore
        domain/ application/ infrastructure/ dto/
      maintenance/               Placeholder: purge-tree-history endpoint
        application/ infrastructure/ dto/
  test/
    e2e/                        (empty — whole-app supertest specs)
  ARCHITECTURE.md                This file
  .env.local.example
  package.json / tsconfig*.json / nest-cli.json / vitest.config.ts
```

## Explicit follow-ups before real implementation

Superseded by `MIGRATION.md`'s Phase 0, which covers the same ground
(shared-schema extraction, the auth guard, global validation/error
handling, the `pnpm dev` question) in the actual order and detail needed
to execute it — this section used to list them in brief but a second,
lower-detail copy next to the real plan is exactly the kind of drift this
whole doc warns against elsewhere, so it's been removed in favor of one
source of truth.
