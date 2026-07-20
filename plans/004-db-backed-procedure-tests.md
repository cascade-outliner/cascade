# Plan 004: Stand up DB-backed characterization tests for the node procedures

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4fa856d..HEAD -- apps/app/src/core/nodes/node.procedures.ts apps/app/src/orpc/context.ts apps/app/vite.config.ts apps/app/package.json .github/workflows/test.yml`
> If any in-scope or referenced file changed since this plan was written, compare
> the "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: LOW
- **Depends on**: none (plans 005 depends on THIS)
- **Category**: tests
- **Planned at**: commit `4fa856d`, 2026-07-20

## Why this matters

The server mutation procedures — `createNode`'s fractional-order computation, `moveNode`'s cycle guard and reindexing, `visibleTree`'s cursor pagination, `setNodeTags`, `deleteNode`'s cascade — are the reason this app exists, and none of them has a single test. The only DB-exercising tests are two narrow Playwright specs (`node-slugs`, `user-settings`) and a perf harness that measures latency, not correctness. Any refactor of the data layer (several are queued: seek pagination, per-row subquery batching, anchor validation) is currently unverifiable. This plan creates the verification baseline the audit's riskier plans depend on: a vitest suite that runs the real procedures against a real Postgres.

## Current state

- Procedures live in `apps/app/src/core/nodes/node.procedures.ts` (528 lines). They are oRPC procedures built from `authed`:

  ```ts
  // apps/app/src/orpc/context.ts
  export interface ORPCContext {
      request: Request;
      session: Session | null;
  }
  export const base = os.$context<ORPCContext>();
  export const authed = base.use(({ context, next }) => {
      if (!context.session) {
          throw new ORPCError("UNAUTHORIZED", { status: 401 });
      }
      return next({ context: { user: context.session.user } });
  });
  ```

  So a test can invoke any procedure with oRPC's server-side `call` utility by supplying a context whose `session.user` is a real user row. `@orpc/server` is at `^1.14.7` and exports `call(procedure, input, { context })`.

- The DB connection is a module-level singleton: `apps/app/src/db/index.ts` creates `postgres(env.DATABASE_URL)` at import time, and `apps/app/src/env.ts` (t3-env) requires `DATABASE_URL`, `BETTER_AUTH_SECRET` (min 32 chars), and `BETTER_AUTH_URL` to be set or the import throws. Tests therefore run against whatever `DATABASE_URL` is in the environment — same model as the existing e2e suite, which runs against the dev database and isolates itself by creating dedicated throwaway users.

- `nodes.userId` has a foreign key to the better-auth `user` table (`apps/app/src/core/nodes/node.schema.ts:31-33`), so each test user must be inserted into `user` first. The `user` table (from `@cascade/auth/schema`, re-exported via `apps/app/src/db/schema.ts`) needs `id`, `name`, `email` (unique), and has defaults for the rest. Deleting the user cascades to all their nodes/tags (`onDelete: "cascade"` on `nodes.userId` and `tags.userId`).

- Vitest config: `apps/app/vite.config.ts` has `test.exclude: ["**/node_modules/**", "**/e2e/**", "**/e2e-perf/**"]`. The default `pnpm test:app` must NOT start requiring a database, so DB tests get their own file suffix and config.

- CI: `.github/workflows/test.yml` has no Postgres; `.github/workflows/e2e.yml` shows the repo's pattern for one — a `postgres:17-alpine` service with health checks and env `DATABASE_URL: postgres://postgres:postgres@localhost:5432/cascade`, `BETTER_AUTH_SECRET: ci-only-secret-do-not-use-in-production-1234`, `BETTER_AUTH_URL: http://localhost:3001`, followed by `pnpm db:push:app`. Copy that pattern.

- Key behaviors to characterize (excerpts from `node.procedures.ts` at `4fa856d`):
  - `createNode` (lines 138-197): advisory-locks on the user id, computes `order` with `generateKeyBetween` — appended after the last sibling, or between `afterId`'s order and the next sibling's.
  - `moveNode` (lines 405-500): advisory lock; rejects moving a node into its own subtree via a recursive ancestors CTE (`INVALID_MOVE`), rejects unknown targets (`NOT_FOUND`/`INVALID_MOVE`); recomputes one fractional key.
  - `visibleTree` (lines 73-136): recursive CTE, DFS order by `path` (array of COLLATE "C" `order` values), cursor = `path` of last row, `limit` + `nextCursor` contract; only descends into `expanded` nodes unless `includeCollapsedDescendants`.
  - `deleteNode` (lines 502-519): FK cascade does the deletion; returns `childrenDeleted` count (capped at depth 64).
  - `setNodeTags` (lines 336-375): upserts tags, replaces the node's tag links; `listTags` returns per-tag node counts.

- Repo conventions: Biome tabs/double quotes; test files colocated with source (`*.test.ts` next to the module); vitest imports from `"vitest"`; no test helpers directory exists yet in `src/` — creating `apps/app/src/test-db/` for the harness is acceptable and keeps it out of the default suite by suffix.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `pnpm install` | exit 0 |
| Start local Postgres | `docker compose up -d` (repo root) | Postgres on :5432, db `cascade` |
| Apply schema | `pnpm db:push:app` | exit 0 |
| Run DB suite | `cd apps/app && DATABASE_URL=postgres://postgres:postgres@localhost:5432/cascade BETTER_AUTH_SECRET=local-test-secret-0123456789abcdefghij BETTER_AUTH_URL=http://localhost:3001 pnpm test:db` | all pass |
| Default unit suite (must stay DB-free) | `pnpm test:app` | all pass, no DB needed |
| Typecheck | `cd apps/app && pnpm exec tsc --noEmit` | exit 0 (needs paraglide compiled once — run `pnpm exec paraglide-js compile --project ./project.inlang --outdir ./src/paraglide` first if it complains) |
| Lint (CI gate) | `pnpm check` | exit 0 |

## Scope

**In scope** (the only files you should modify/create):
- `apps/app/src/test-db/harness.ts` (create)
- `apps/app/src/core/nodes/node.procedures.db.test.ts` (create)
- `apps/app/vitest.db.config.ts` (create)
- `apps/app/vite.config.ts` (only: add `**/*.db.test.ts` to `test.exclude`)
- `apps/app/package.json` (only: add `"test:db"` script)
- `package.json` (root — only: add `"test:db:app": "pnpm --filter app test:db"`)
- `.github/workflows/test.yml` (add a `test-db` job)
- `CHANGELOG.md` — the PR touches `apps/app/`; CI requires an entry or the `skip-changelog` label. Tests are not user-facing: prefer the `skip-changelog` label; if you cannot apply labels, add a brief dated entry.

**Out of scope** (do NOT touch, even though they look related):
- `apps/app/src/core/nodes/node.procedures.ts` — this plan CHARACTERIZES current behavior; it must not change it. (Plan 005 changes behavior, after this net exists.)
- `apps/app/e2e/`, `apps/app/e2e-perf/` — separate suites.
- Any schema/migration file.

## Git workflow

- Branch: follow the operator's instructions; otherwise `advisor/004-db-backed-procedure-tests`.
- Conventional Commits, e.g. `test: add db-backed characterization tests for node procedures`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create the harness (`apps/app/src/test-db/harness.ts`)

Exports:

- `createTestUser(): Promise<{ user: <better-auth user shape>, context: ORPCContext }>` — inserts a row into the `user` table via `db` (import `{ db }` from `"@/db"`, `{ user }` from `"@/db/schema"`) with `id: crypto.randomUUID()`, `name: "db-test"`, unique email like `db-test-${crypto.randomUUID()}@example.test`, then returns an oRPC context: `{ request: new Request("http://localhost/test"), session: { user: insertedUser } as unknown as Session }` (import the `Session` type the same way `apps/app/src/orpc/context.ts` does: `import type { Session } from "@cascade/auth/server"`). The cast is acceptable — `authed` only reads `session.user`.
- `deleteTestUser(userId: string): Promise<void>` — `db.delete(user).where(eq(user.id, userId))`; FK cascade removes the user's nodes and tags.

**Verify**: `cd apps/app && pnpm exec tsc --noEmit` → exit 0.

### Step 2: Create `apps/app/vitest.db.config.ts` and scripts

Config (mirror the resolve setup of the existing `vite.config.ts`, minimal plugins):

```ts
import { defineConfig } from "vite";

export default defineConfig({
	resolve: { tsconfigPaths: true },
	test: {
		include: ["src/**/*.db.test.ts"],
		// DB tests share one database; procedures use per-user advisory locks,
		// so distinct users per file are safe, but keep one worker for determinism.
		fileParallelism: false,
	},
});
```

Add to `apps/app/package.json` scripts: `"test:db": "vitest run --config vitest.db.config.ts"`.
Add to root `package.json` scripts (in the app section): `"test:db:app": "pnpm --filter app test:db"`.
In `apps/app/vite.config.ts`, extend `test.exclude` with `"**/*.db.test.ts"` so the default suite never loads them.

**Verify**: `pnpm test:app` → passes WITHOUT any `DATABASE_URL` set (proves exclusion works; the suite must not import `@/db`).

### Step 3: Write `apps/app/src/core/nodes/node.procedures.db.test.ts`

Import `{ call }` from `"@orpc/server"`, the procedures from `"./node.procedures"`, and the harness. Structure: one `describe` per procedure; `beforeEach` creates a fresh test user + context, `afterEach` deletes it (cascade cleans all data — no truncation, parallel-safe against the dev DB like the e2e suite).

Characterization cases (assert CURRENT behavior):

1. **createNode append ordering**: create three root nodes (`parentId: null`, no `afterId`); `call(listNodes, { parentId: null }, { context })` returns them in creation order with strictly increasing `order` strings (compare with `<`).
2. **createNode afterId insertion**: create A, B at root; create C with `afterId: A.id`; `listNodes` order is A, C, B.
3. **createNode unknown afterId**: `call` with a random UUID `afterId` rejects with an oRPC error whose `code`/`status` is the `NOT_FOUND` defined on the procedure.
4. **moveNode before/after/append**: build A, B, C at root; move C `before` A → order C, A, B; move A `append` under B (parentId B) → A's `parentId` is B; move with `position: "after"` similarly asserted.
5. **moveNode cycle guard**: create parent P with child C (via `createNode` with `parentId: P.id`); moving P to `parentId: C.id, position: "append"` rejects with `INVALID_MOVE`.
6. **moveNode into own self**: moving P under `parentId: P.id` rejects with `INVALID_MOVE` (the ancestors CTE starts at the target parent and includes it).
7. **visibleTree DFS + expansion**: root R (expanded: created collapsed by default — first call `toggleNodeExpanded` with `expanded: true`) with children C1, C2; child C1 collapsed with grandchild G. `visibleTree({ rootId: null, cursor: null, includeCollapsedDescendants: false, limit: 500 })` returns R, C1, C2 (G hidden); with `includeCollapsedDescendants: true` G appears after C1; `depth`/`parentId`/`hasChildren`/`isLastChild` fields match expectations.
8. **visibleTree cursor pagination**: create 5 root nodes; walk `visibleTree` with `limit: 2` passing each `nextCursor` until null; concatenated pages equal the `limit: 500` single-page result exactly (no duplicates, no gaps, same order); final page's `nextCursor` is null.
9. **deleteNode cascade**: P → C → G chain; `deleteNode(P)` returns `childrenDeleted: 2`; `listNodes({ parentId: null })` no longer contains P; direct `db.select` for C and G ids returns nothing.
10. **setNodeTags/listTags/deleteTag**: set tags `["a", "b"]` on a node → `listTags` shows both with count 1; re-set to `["b", "c"]` → counts b:1, c:1, a:0 (a still listed with count 0 — assert whatever current behavior is: `listTags` LEFT JOINs, so an unused tag remains with count 0); `deleteTag("b")` removes it; unknown tag name rejects `NOT_FOUND`.

Error-assertion pattern: `await expect(call(...)).rejects.toMatchObject({ code: "NOT_FOUND" })` (oRPC typed errors surface `code`/`status` on the thrown `ORPCError` — check the actual thrown shape in the first failing run and pin it; the point is to distinguish NOT_FOUND from INVALID_MOVE).

**Verify**: with docker Postgres up and schema pushed:
`cd apps/app && DATABASE_URL=postgres://postgres:postgres@localhost:5432/cascade BETTER_AUTH_SECRET=local-test-secret-0123456789abcdefghij BETTER_AUTH_URL=http://localhost:3001 pnpm test:db` → all pass (≥10 tests).

### Step 4: Add the CI job

In `.github/workflows/test.yml`, add a second job `test-db` copying the `services:`/env pattern from `.github/workflows/e2e.yml` verbatim (postgres:17-alpine service, same health checks, same env values), with steps: checkout → pnpm setup → node setup → `pnpm install --frozen-lockfile` → `pnpm db:push:app` → `pnpm test:db:app`.

**Verify**: `pnpm check` → exit 0 (Biome-formatted YAML); the job's step list matches e2e.yml's setup ordering.

### Step 5: Full local gates

**Verify**: `pnpm test:app` (no DB env) → pass; `pnpm test:db:app` (with env) → pass; `cd apps/app && pnpm exec tsc --noEmit` → exit 0; `pnpm check` → exit 0.

## Test plan

This plan IS the test plan — the ten characterization cases in Step 3. Pattern file for style: `apps/app/src/ui/nodes/virtual-tree/data/use-visible-tree.test.tsx` (naming/structure), but do NOT mock `@/orpc/client` — the whole point is exercising the real procedures against real Postgres.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm test:app` passes with no `DATABASE_URL` in the environment
- [ ] `pnpm test:db:app` passes against the docker-compose database (≥10 tests, covering createNode/moveNode/visibleTree/deleteNode/setNodeTags)
- [ ] `cd apps/app && pnpm exec tsc --noEmit` exits 0
- [ ] `pnpm check` exits 0
- [ ] `.github/workflows/test.yml` contains a `test-db` job with a postgres service
- [ ] `git status` shows only in-scope files modified/created
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `@orpc/server` does not export `call`, or calling a procedure that way fails on middleware/context typing after one honest fix attempt — report the actual oRPC invocation API available in `1.14.x`.
- Importing `@/db` (or `@/env`) in the test context fails for a reason other than missing env vars (e.g. the vitest config can't resolve `@/` or workspace imports) — report the resolution error rather than restructuring configs beyond this plan.
- Any characterization test reveals behavior that contradicts this plan's expectations (e.g. pagination duplicates a row). Do NOT "fix" the production code — record the actual behavior, make the test assert the truth, and flag the discrepancy in your report (it may be a real bug worth its own plan).
- `docker compose up -d` is unavailable in your environment and no `DATABASE_URL` is provided — report that the suite needs a database to verify.

## Maintenance notes

- Plan 005 (anchor-parent validation) adds cases to this suite and depends on it being merged first.
- Future data-layer refactors (seek pagination for `visibleTree`, batching the per-row tag subquery) should extend case 8 with deeper trees before changing the SQL.
- The suite runs against `DATABASE_URL` like the e2e tests do; if a dedicated test database is ever wanted, only the CI env and the local command line change — the harness itself is database-agnostic.
- Reviewer should scrutinize: no production code changed; the default unit suite still runs without a database; `afterEach` cleanup actually deletes the test user even when a test fails (vitest runs `afterEach` on failure).
