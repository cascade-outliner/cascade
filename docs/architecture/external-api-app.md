# Proposal: a dedicated `apps/api` app for mobile + external integrations

Status: Phase 0 implemented; Phases 1-4 proposed
Related: #444

## Summary

To support a future mobile app and external integrations (including an MCP
client/server), add a third TanStack Start app, `apps/api`, that exposes a
stable, separately deployable API surface. It reuses the existing oRPC
router and procedures rather than rewriting them in a different framework
(e.g. NestJS) — the business logic and its type safety carry over unchanged;
what's missing today is non-cookie auth and a curated, versioned external
surface, not a different backend framework.

## Context

`apps/web-app` currently serves the outliner SSR pages and the oRPC API
(26 procedures across `nodes`, `premium`, `settings`, `tree-history`) from a
single Nitro process, mounted as TanStack Start routes
(`src/routes/api.rpc.$.ts`, `api.$.ts`, `api.auth.$.ts`). Every procedure is
built on one `authed` builder that validates a browser session cookie via
better-auth — there is no token-based auth and no procedure surface intended
for non-browser clients today.

`#444` asked whether the API should be pulled out into its own service (the
original suggestion was NestJS). Splitting it out wasn't justified on its
own — no observed scaling asymmetry, no second client, and no deploy
automation exists yet even for the two apps in the repo. Planned mobile +
external/MCP integrations change that: those clients need a stable, token
authenticated surface that isn't entangled with the SSR app's release cycle.
NestJS specifically would still cost more than it buys: it would mean
re-implementing 26 procedures' validation/DTOs by hand and losing oRPC's
end-to-end type inference with the existing web client, for framework
features (DI, decorators) that don't address anything mobile/MCP actually
need. Reusing the existing stack in a new TanStack Start app avoids that
cost entirely.

## Proposal

### Phase 0 — Extract a shared package (pure refactor, no behavior change) — **done**

Implemented as a single `@cascade/api` package (`packages/api`) rather than
the originally-sketched `packages/db` + `packages/api-core` split. Two
things discovered during implementation drove that:

- **One package, not two.** `db/schema.ts` is a barrel that re-exports the
  per-feature `*-table.ts` files, which live inside the feature folders. A
  separate `packages/db` owning the schema would therefore have to depend on
  the feature code that also depends on it — a cycle. Keeping the drizzle
  client, the schema barrel, and the feature server code in one package
  avoids that and preserves the existing convention of co-locating each
  feature's table with its procedures.
- **Module singletons, not a `createRouter({ db, auth })` factory.**
  Converting 26 procedures to take an injected `db` would have been an
  invasive rewrite of every query, and it buys nothing here: module-level
  singletons are already per-process, so a second app importing the package
  gets its own `db`/`auth` instances and its own connection pool for free.
  The package keeps the existing `db` and `auth` singletons as-is.

What moved into `packages/api/src`: `db/{index,schema}.ts`,
`orpc/{context,router}.ts`, `auth.ts` (was
`features/auth/server/auth.ts`), the `server/` folders of `nodes`,
`premium`, `settings`, `tree-history`, the `model/` schema files those
depend on, and `test-support/database-harness.ts`. Package-internal imports
use relative paths; `apps/web-app` now imports through the package's
`exports` map (`@cascade/api/db`, `/router`, `/context`, …).

What deliberately stayed in `apps/web-app`: `orpc/client.ts` and
`features/auth/server/get-session.ts` (both import `@tanstack/react-start`,
so they are app-level, not portable), the route files that mount the
handlers, `db/{migrate,seed,seed-tree}.ts`, and the React/Lexical contract
tests under `features/nodes/model/contracts/` plus
`settings/model/theme-registry.test.ts` (it reads the app's
`public/manifest.json`) — keeping React and Lexical out of the API
package's dependency tree.

Also updated: `drizzle.config.ts` schema globs, `db:purge-tree-history`
script path, `test:api`/`test:db:api`/`tsc:api` root scripts, and the
`typecheck`/`test`/`perf` workflows.

**Verified**: `pnpm check`, both typechecks, `test:api` (28), `test:app`
(153), `test:web`, `test:db:api` (36 against a real Postgres),
`pnpm build:app`, and a runtime smoke test of the built server — register
via better-auth, `401` on an unauthenticated RPC call, then
`nodes/create`, `nodes/visibleTree`, `settings/get`, and `premium/get` all
returning correctly through the extracted package.

### Phase 1 — Scaffold `apps/api`

- New TanStack Start app shaped like `apps/website` (no Lexical/outliner
  deps), package name `api`, dev port `3002`.
- Depends on `@cascade/api`, which brings its own `db`/`auth` singletons
  and the assembled router.
- Routes:
  - `src/routes/openapi.$.ts` — `OpenAPIHandler`, same shape as today's
    `apps/web-app/src/routes/api.$.ts`. This is the mobile app's primary
    integration surface.
  - `src/routes/mcp.$.ts` — an MCP server wrapping a curated subset of
    procedures as MCP tools (MCP TypeScript SDK, streamable-HTTP
    transport).
  - `src/routes/oauth/*` — OAuth 2.1 authorization endpoints plus a couple
    of actually-rendered pages (consent screen, error states) for the MCP
    auth flow. This is the concrete reason this is a TanStack Start app
    rather than a bare HTTP server — a couple of real pages are needed
    here regardless.

### Phase 2 — Non-cookie auth

- Add an API-key/token plugin to the shared `createAuth` config in
  `packages/auth` (mobile gets a long-lived token after login; MCP/third
  party integrations get OAuth-issued scoped tokens).
- Add a parallel procedure builder in `packages/api`, e.g.
  `apiKeyAuthed`, alongside the existing `authed` — validates a bearer
  token instead of a session cookie.
- Define scopes per token (`nodes:read`, `nodes:write`, etc.) so an MCP
  integration can be granted less access than the mobile app's own token.

### Phase 3 — Surface curation

- In `apps/api`, define an explicit allowlisted router
  (`src/orpc/external-router.ts`) re-exporting only the procedures meant
  for external use, wrapped in `apiKeyAuthed` and scope checks. Internal
  only procedures (e.g. tree-history maintenance) stay unexposed.
- Version it from day one (`/v1/...`) since external clients can't be
  forced to upgrade in lockstep with internal deploys.

### Phase 4 — Cross-cutting

- CORS on `apps/api` needs to allow the mobile app's origin/bundle id and
  MCP client origins. `apps/web-app`'s CSP likely doesn't need to change,
  since the outliner UI keeps calling its own in-process RPC route as it
  does today.
- Extend CI (`typecheck.yml`, `test.yml`, `biome.yml`) filters and add
  `dev:api` / `build:api` / `test:api` scripts mirroring the existing
  `:app` / `:web` convention.
- There's no deploy automation for either existing app today — this is a
  natural point to set up deploy infra for all three processes together
  rather than adding a third unautomated deploy target.

## Alternatives considered

- **NestJS, as a separate service**: rejected — would require
  re-implementing all 26 procedures' validation/DTOs and lose oRPC's
  shared type inference with the web client, for framework features (DI,
  module decorators) that don't map to anything the stated goals
  (mobile app, external integrations, MCP) actually need.
- **No split, extend `apps/web-app` in place**: viable for the auth work
  (Phase 2) alone, but doesn't give mobile/external clients a surface that
  can be versioned, scaled, or deployed independently of the SSR app's
  release cycle — which is the actual gap once real external consumers
  are planned.

## Sequencing

Phase 0 is worth doing regardless of the rest — it's a good boundary on
its own and is fully reversible. Suggested order: **Phase 0 → Phase 2
(auth primitives, testable against the existing `apps/web-app` route
before `apps/api` exists) → Phase 1 (scaffold, mount curated router) →
Phase 3 → Phase 4.**

## Open questions

- Whether `apps/api` needs cookie-based session support at all (e.g. for a
  future API-key management dashboard) or is strictly token-authed.
- Production deploy topology for three processes, given none exists yet
  for the current two.

## Verification (once implemented)

- Phase 1: `pnpm dev:api` boots; `/openapi/...` responds and round-trips
  against the same Postgres instance as `apps/web-app`.
- Phase 2: automated test that a request with a valid API key succeeds and
  one without a valid key/token gets `401`.
- Phase 3: confirm an unlisted internal procedure is unreachable via the
  external router.
