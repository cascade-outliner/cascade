# Plan 005: Reject mismatched anchor/parent pairs in createNode and moveNode

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4fa856d..HEAD -- apps/app/src/core/nodes/node.procedures.ts apps/app/src/core/nodes/node.procedures.db.test.ts`
> If `node.procedures.ts` changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (`node.procedures.db.test.ts` is
> expected to exist from plan 004.)

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/004-db-backed-procedure-tests.md (MUST be merged first — the new tests live in its suite)
- **Category**: bug
- **Planned at**: commit `4fa856d`, 2026-07-20

## Why this matters

Both ordering procedures trust that the client's anchor node actually lives under the requested parent, and neither verifies it. `createNode` fetches the `afterId` row by id+user only, and `moveNode` fetches the before/after `targetId` row by id+user only — then both compute the new fractional `order` key from that anchor's `order` but insert/move the row under `input.parentId`'s sibling set. If the pair disagrees (a buggy client, or a concurrent move that relocated the anchor between drag and request), the node lands under `input.parentId` at a position derived from a *foreign* sibling list — arbitrary placement the user never asked for. The per-user advisory lock serializes writes but cannot catch this logical inconsistency. The fix is a cheap server-side integrity check that turns silent misplacement into an explicit, retryable error.

## Current state

All excerpts from `apps/app/src/core/nodes/node.procedures.ts` at commit `4fa856d`.

- `createNode` (lines 138-197). The `afterId` branch fetches only `order`, with no parent check (lines 162-175):

  ```ts
  if (input.afterId) {
      const [after] = await tx
          .select({ order: nodes.order })
          .from(nodes)
          .where(and(eq(nodes.id, input.afterId), eq(nodes.userId, userId)))
          .limit(1);
      if (!after) throw errors.NOT_FOUND();
      const [next] = await tx
          .select({ order: nodes.order })
          .from(nodes)
          .where(and(parentFilter, gt(nodes.order, after.order)))
          .orderBy(asc(nodes.order))
          .limit(1);
      order = generateKeyBetween(after.order, next?.order ?? null);
  ```

  `parentFilter` (lines 151-156) scopes to `input.parentId` — so `next` comes from the requested parent's children while `after.order` may come from anywhere in the tree.

- `createNode`'s declared errors (lines 139-141): only `NOT_FOUND` today:

  ```ts
  .errors({
      NOT_FOUND: { status: 404, message: "Node not found" },
  })
  ```

- `moveNode` (lines 405-500). The target fetch for `before`/`after` positions selects only `order`, no parent check (lines 464-472):

  ```ts
  const [target] = await tx
      .select({ order: nodes.order })
      .from(nodes)
      .where(and(eq(nodes.id, input.targetId), eq(nodes.userId, userId)))
      .limit(1)
      .for("update");
  if (!target) {
      throw errors.INVALID_MOVE({ message: "Move target not found" });
  }
  ```

  `moveNode` already declares `INVALID_MOVE: { status: 422, message: "Invalid move operation" }` (line 408) and uses the `errors.INVALID_MOVE({ message: ... })` override pattern (lines 439-441).

- Client callers always send consistent pairs today, so this change should reject nothing in normal operation: `apps/app/src/ui/nodes/virtual-tree/data/mutations/use-create-mutation.ts` builds `{ parentId: sibling.parentId, afterId }` from the same row, and the drag/move layer builds `MoveTarget`s from rows in the same sibling context.

- Convention notes: `input.parentId` and the anchor's stored `parent_id` are both `string | null`; root-level nodes have `parentId === null`. Compare with null-normalization (`(a ?? null) === (b ?? null)` is sufficient since both are already `string | null`).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `pnpm install` | exit 0 |
| DB suite (needs Postgres, see plan 004) | `cd apps/app && DATABASE_URL=postgres://postgres:postgres@localhost:5432/cascade BETTER_AUTH_SECRET=local-test-secret-0123456789abcdefghij BETTER_AUTH_URL=http://localhost:3001 pnpm test:db` | all pass |
| Unit suite | `pnpm test:app` | all pass |
| Typecheck | `cd apps/app && pnpm exec tsc --noEmit` | exit 0 |
| Lint (CI gate) | `pnpm check` | exit 0 |
| e2e (optional, needs DB) | `pnpm test:e2e:app` | all pass |

## Scope

**In scope** (the only files you should modify):
- `apps/app/src/core/nodes/node.procedures.ts` (the two anchor fetches + one new error on `createNode`)
- `apps/app/src/core/nodes/node.procedures.db.test.ts` (add mismatch cases)
- `CHANGELOG.md` (required — touches `apps/app/`; add a dated fix entry)

**Out of scope** (do NOT touch, even though they look related):
- Client mutation hooks (`use-create-mutation.ts`, `use-move-mutation.ts`) — they already send consistent pairs; no client change is needed for this server-side check.
- The `append` position of `moveNode` — it has no target anchor; nothing to validate.
- The depth-64 cycle-guard cap (separate deferred finding; see `plans/README.md`).

## Git workflow

- Branch: follow the operator's instructions; otherwise `advisor/005-validate-anchor-parents`.
- Conventional Commits, e.g. `fix: reject anchor nodes outside the target parent in createnode and movenode`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Validate the anchor in `createNode`

1. Add a new declared error alongside `NOT_FOUND`:

   ```ts
   INVALID_ANCHOR: { status: 422, message: "Anchor node is not a child of the target parent" },
   ```

2. In the `afterId` branch, also select the anchor's parent: `.select({ order: nodes.order, parentId: nodes.parentId })`.
3. After the `if (!after) throw errors.NOT_FOUND();` line, add:

   ```ts
   if ((after.parentId ?? null) !== (input.parentId ?? null)) {
       throw errors.INVALID_ANCHOR();
   }
   ```

**Verify**: `cd apps/app && pnpm exec tsc --noEmit` → exit 0.

### Step 2: Validate the target in `moveNode`

1. In the target fetch, also select `parentId: nodes.parentId`.
2. After the existing `if (!target) throw errors.INVALID_MOVE({ message: "Move target not found" });`, add:

   ```ts
   if ((target.parentId ?? null) !== (input.parentId ?? null)) {
       throw errors.INVALID_MOVE({
           message: "Move target is not a child of the destination parent",
       });
   }
   ```

**Verify**: `cd apps/app && pnpm exec tsc --noEmit` → exit 0.

### Step 3: Add regression tests to the plan-004 suite

In `apps/app/src/core/nodes/node.procedures.db.test.ts`, add:

1. **createNode mismatch**: create parent P with child C, and root sibling R. `createNode({ parentId: P.id, afterId: R.id })` (R is a root, not P's child) rejects with `INVALID_ANCHOR`; no node was created under P (`listNodes({ parentId: P.id })` still returns exactly [C]).
2. **createNode null-parent mismatch**: `createNode({ parentId: null, afterId: C.id })` (C lives under P) rejects with `INVALID_ANCHOR`.
3. **moveNode mismatch**: with the same P/C/R, `moveNode({ id: R.id, parentId: null, position: "after", targetId: C.id })` (target C is not a root) rejects with `INVALID_MOVE`; R's parent is unchanged.
4. **Consistent pairs still work**: `createNode({ parentId: P.id, afterId: C.id })` succeeds and lands after C — guards against over-rejection.

**Verify**: `pnpm test:db` (with env, DB up, schema pushed) → all pass including 4 new tests.

### Step 4: Changelog + full gates

Add a dated `CHANGELOG.md` entry (match existing format): node create/move now reject inconsistent placement requests instead of silently misplacing the node.

**Verify**: `pnpm test:app` → pass; `pnpm test:db` → pass; `pnpm check` → exit 0. If a database is available, also run `pnpm test:e2e:app` to confirm the real UI flows still create/move nodes (they send consistent pairs).

## Test plan

Covered in Step 3 — four cases in the DB-backed suite from plan 004 (three rejections with no side effects, one happy-path guard against over-rejection). Model assertions on the existing error cases in that suite (e.g. the cycle-guard `INVALID_MOVE` test).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "INVALID_ANCHOR" apps/app/src/core/nodes/node.procedures.ts` → matches in `createNode`'s errors and the afterId branch
- [ ] `grep -n "destination parent" apps/app/src/core/nodes/node.procedures.ts` → one match in `moveNode`
- [ ] `pnpm test:db` (with env) exits 0, including the 4 new tests
- [ ] `pnpm test:app` exits 0
- [ ] `cd apps/app && pnpm exec tsc --noEmit` exits 0
- [ ] `pnpm check` exits 0
- [ ] `CHANGELOG.md` has a new dated entry
- [ ] `git status` shows only the three in-scope files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `plans/004`'s suite (`node.procedures.db.test.ts`) does not exist — this plan depends on it; execute 004 first.
- The excerpts in "Current state" no longer match `node.procedures.ts` (drift — e.g. someone already added the validation or refactored the file).
- The e2e suite (`pnpm test:e2e:app`) fails on node creation or drag-and-drop after your change — that means a real client flow sends mismatched pairs and this "defensive" check breaks it; report which flow instead of loosening the check.
- Step 3's happy-path test (case 4) fails — the null-normalization comparison is wrong; re-check before proceeding.

## Maintenance notes

- Any future client feature that creates/moves nodes with an anchor (e.g. paste, bulk import) must source `parentId` and the anchor from the same sibling snapshot, or it will hit these 422s — that is the intended contract, surface it in the feature's error handling.
- Reviewer should scrutinize: the check happens inside the advisory-lock transaction (it does — both fetches are on `tx`), so a concurrent move can't invalidate it between check and write.
- Deferred: returning a structured error the client could auto-retry with a refreshed tree snapshot; today the generic mutation error path (toast + invalidate) is acceptable.
