# Plan 003: Due-date range filter includes nodes due on the end day

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4fa856d..HEAD -- packages/outliner/src/virtual-tree/filter-visibility.ts apps/app/src/ui/nodes/virtual-tree/filter-visibility.test.ts packages/outliner/src/due-date-bucket.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `4fa856d`, 2026-07-20

## Why this matters

The due-date **range** filter compares the node's stored due date — which carries a time-of-day — against range bounds that are local midnights. A node due on the range's end day at any time after 00:00 fails the `dueDate > end` check and is wrongly hidden, so the end date of a range effectively doesn't count. Every other due-date predicate in the codebase (`isDueToday`, `isDueThisWeek`, `isDueOnDate`) normalizes both sides to the start of day; the range check is the one place that forgot. Users filtering "July 15 – July 17" silently lose everything due on July 17.

## Current state

- `packages/outliner/src/virtual-tree/filter-visibility.ts` — the buggy comparison is in `rowMatchesFilters` (lines 120–139):

  ```ts
  function rowMatchesFilters(row: VisibleNodeRow, filters: NodeFilters): boolean {
      if (!row.dueDate) return false;
      const dueDate = new Date(row.dueDate);
      if (filters.dueToday && !isDueToday(dueDate)) {
          return false;
      }
      // ... dueThisWeek, dueOnDate checks ...
      if (filters.dueDateRange) {
          const { start, end } = filters.dueDateRange;
          if (dueDate < start || dueDate > end) {   // <-- raw timestamp vs local midnights
              return false;
          }
      }
      return true;
  }
  ```

  Its imports (line 1): `import { isDueOnDate, isDueThisWeek, isDueToday } from "../due-date-bucket";`

- `packages/outliner/src/due-date-bucket.ts:3-5` — the normalizer to reuse, already exported:

  ```ts
  export function startOfDay(date: Date): Date {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
  ```

  Note how `isDueOnDate` (line 36-38) does it: `startOfDay(dueDate).getTime() === startOfDay(selected).getTime()` — normalize the due date, compare against already-normalized bounds.

- Why the bounds are local midnights: `apps/app/src/ui/nodes/use-node-filters.ts:8-25` parses `due_start`/`due_end` URL params with `parseAsLocalDate`, which constructs `new Date(year, month-1, day)` — local midnight, no time component. `dueDateRange` is `{ start, end }` of those two dates.

- Repo conventions: Biome (tabs, double quotes); `packages/outliner` is framework-agnostic and must not import from apps. Tests for this module live in the **app** workspace: `apps/app/src/ui/nodes/virtual-tree/filter-visibility.test.ts` (406 lines, assertion-dense, uses `vi.useFakeTimers()` with a fixed Wednesday `new Date(2026, 6, 15, 12, 0, 0)` and a `row(...)` helper building `VisibleNodeRow`s). Model new tests on its existing `describe` blocks.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `pnpm install` | exit 0 |
| Unit tests (app) | `pnpm test:app` | all pass |
| Single test file | `cd apps/app && pnpm vitest run src/ui/nodes/virtual-tree/filter-visibility.test.ts` | all pass |
| Lint/format (CI gate) | `pnpm check` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `packages/outliner/src/virtual-tree/filter-visibility.ts`
- `apps/app/src/ui/nodes/virtual-tree/filter-visibility.test.ts`
- `CHANGELOG.md` (required — the PR touches `apps/app/`, and CI enforces a changelog entry)

**Out of scope** (do NOT touch, even though they look related):
- `packages/outliner/src/due-date-bucket.ts` — its predicates are correct; you only import `startOfDay` from it.
- `apps/app/src/ui/nodes/use-node-filters.ts` — the URL parsing is correct.
- The storage semantics of `due_date` (timestamptz vs date) — a separate, larger finding (see `plans/README.md` deferred list); do not change schema or server code here.

## Git workflow

- Branch: follow the operator's instructions; otherwise `advisor/003-due-date-range-include-end-day`.
- Conventional Commits, e.g. `fix: include the end day in the due-date range filter`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Normalize the due date before the range comparison

In `packages/outliner/src/virtual-tree/filter-visibility.ts`:

1. Extend the existing import from `"../due-date-bucket"` to include `startOfDay`.
2. In `rowMatchesFilters`, change the range check to compare the due date's day:

   ```ts
   if (filters.dueDateRange) {
       const { start, end } = filters.dueDateRange;
       const dueDay = startOfDay(dueDate);
       if (dueDay < start || dueDay > end) {
           return false;
       }
   }
   ```

   `start`/`end` are already local midnights, so this makes both bounds inclusive by calendar day — matching `isDueOnDate` semantics.

**Verify**: `pnpm check` → exit 0.

### Step 2: Add regression tests

In `apps/app/src/ui/nodes/virtual-tree/filter-visibility.test.ts`, add a `describe("getRowVisibility with dueDateRange", ...)` block (reuse the file's existing `row(...)` helper and fake-timer setup). Filters object: spread `noFilters` and set `dueDateRange: { start: new Date(2026, 6, 15), end: new Date(2026, 6, 17) }`. Cases:

1. **End-day with time-of-day (the regression)**: a row due `new Date(2026, 6, 17, 15, 30)` is NOT in `hiddenIds`.
2. **Start-day boundary**: a row due `new Date(2026, 6, 15, 0, 0)` is NOT in `hiddenIds`.
3. **Day before start**: a row due `new Date(2026, 6, 14, 23, 59)` IS in `hiddenIds`.
4. **Day after end**: a row due `new Date(2026, 6, 18, 0, 30)` IS in `hiddenIds`.
5. **Inside the range**: a row due `new Date(2026, 6, 16, 9, 0)` is NOT in `hiddenIds`.

Before the fix, case 1 fails; after, all pass. Check the exact shape other `getRowVisibility` describe blocks use for asserting `hiddenIds` membership and mirror it (including how they pass filters — look at the `dueThisWeek` block).

**Verify**: `cd apps/app && pnpm vitest run src/ui/nodes/virtual-tree/filter-visibility.test.ts` → all pass, including 5 new tests.

### Step 3: Changelog entry

Add a dated entry at the top of `CHANGELOG.md` (newest first, match the file's existing format exactly): the due-date range filter now includes items due on the range's end day.

**Verify**: `git diff --name-only` includes `CHANGELOG.md`.

### Step 4: Full gates

**Verify**: `pnpm test:app` → all pass; `pnpm check` → exit 0.

## Test plan

Covered in Step 2 — five table cases in `filter-visibility.test.ts`, modeled on the existing `getRowVisibility with dueThisWeek` describe block. Verification: `pnpm test:app` all green including the new block.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "startOfDay" packages/outliner/src/virtual-tree/filter-visibility.ts` → at least one match (import + use)
- [ ] `cd apps/app && pnpm vitest run src/ui/nodes/virtual-tree/filter-visibility.test.ts` → all pass, 5 new range tests present
- [ ] `pnpm test:app` exits 0
- [ ] `pnpm check` exits 0
- [ ] `CHANGELOG.md` has a new dated entry on top
- [ ] `git status` shows only the three in-scope files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `rowMatchesFilters` no longer matches the "Current state" excerpt (drift).
- The new end-day test passes **before** you make the fix — that means the behavior changed since planning; re-diagnose instead of shipping a no-op.
- Making the range inclusive breaks an existing test — that would mean some caller depends on the exclusive end; report which test.

## Maintenance notes

- If a future change moves due-date storage to a calendar `date` column (see deferred finding in `plans/README.md`), this normalization becomes redundant but stays harmless.
- Reviewer should scrutinize: no behavior change for `dueToday`/`dueThisWeek`/`dueOnDate` paths, and that the fix lives in `packages/outliner` (shared) not the app.
- Follow-up deferred: the server-side storage of due dates as `timestamptz` with client-local coercion (audit finding CORRECT-07) — bigger change, needs a migration.
