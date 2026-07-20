# Plan 002: Make CI verification honest — typecheck both apps, unbreak the web test scripts

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4fa856d..HEAD -- .github/workflows/ package.json apps/web/package.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `4fa856d`, 2026-07-20

## Why this matters

No CI workflow runs a TypeScript typecheck. `apps/app` is typechecked only as a side effect of the heavyweight e2e job (its `build` script is `vite build && tsc --noEmit`, and Playwright builds the app), but `apps/web`'s build is `node scripts/generate-sitemap.mjs && vite build` with **no** `tsc`, and no workflow builds or tests web at all — so web type errors merge to `main` uncaught. Separately, two test scripts are dead: `apps/web`'s `"test": "vitest run"` fails because zero test files exist (vitest exits non-zero without `--passWithNoTests`), and the root `test:e2e:web` filters to a `test:e2e` script web doesn't define. Green-looking scripts that error or assert nothing are worse than absent ones.

## Current state

- `.github/workflows/` contains: `biome.yml`, `changelog.yml`, `e2e.yml`, `linked-issue.yml`, `perf.yml`, `pr-title.yml`, `test.yml`. None runs `tsc`.
- `.github/workflows/test.yml` (whole job, verbatim):

  ```yaml
  jobs:
    test:
      runs-on: ubuntu-24.04
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v4
        - uses: actions/setup-node@v4
          with:
            node-version: 22
            cache: pnpm
        - run: pnpm install --frozen-lockfile
        - run: pnpm test:app
  ```

- Root `package.json` already has the right script to reuse: `"tsc": "pnpm --filter app exec tsc --noEmit && pnpm --filter web exec tsc --noEmit"`. It also has the dead `"test:e2e:web": "pnpm --filter web test:e2e"` (web has no `test:e2e` script and no `@playwright/test` dependency).
- `apps/web/package.json` scripts include `"test": "vitest run"`; there are **zero** `*.test.*` files under `apps/web/`.
- **Critical gotcha**: both apps import generated paraglide i18n modules (`#/paraglide/messages.js`), and `git ls-files apps/app/src/paraglide` returns nothing — the generated output is NOT committed. It is produced by `paraglideVitePlugin` during `vite dev`/`vite build` (see each app's `vite.config.ts`, `project: "./project.inlang"`, `outdir: "./src/paraglide"`). A standalone `tsc --noEmit` on a fresh checkout will fail with unresolved `#/paraglide/*` imports unless the paraglide compiler runs first. `@inlang/paraglide-js` ships a CLI: `paraglide-js compile --project ./project.inlang --outdir ./src/paraglide` (run it from each app's directory).
- Route trees (`src/routeTree.gen.ts`) ARE committed, so no `tsr generate` step is needed.

Repo conventions: workflows are minimal single-job files following the shape of `test.yml` above (checkout → pnpm/action-setup → setup-node 22 with pnpm cache → `pnpm install --frozen-lockfile` → command). Match that shape. Conventional Commits, lowercase (`ci: ...`).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `pnpm install` | exit 0 |
| Generate paraglide (app) | `cd apps/app && pnpm exec paraglide-js compile --project ./project.inlang --outdir ./src/paraglide` | exit 0, `src/paraglide/` populated |
| Generate paraglide (web) | `cd apps/web && pnpm exec paraglide-js compile --project ./project.inlang --outdir ./src/paraglide` | exit 0 |
| Typecheck both apps | `pnpm tsc` (repo root) | exit 0 |
| Web unit tests | `pnpm test:web` | exit 0 (after Step 2) |
| Lint (CI gate) | `pnpm check` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `.github/workflows/typecheck.yml` (create)
- `.github/workflows/test.yml`
- `apps/web/package.json`
- `package.json` (root — remove dead script only)

**Out of scope** (do NOT touch, even though they look related):
- `apps/web`'s `build` script — adding `tsc --noEmit` there would slow every build; the new workflow covers the gap.
- `e2e.yml` / `perf.yml` — leave the existing pipelines alone.
- Adding actual web tests — separate effort; this plan only makes the scripts honest.
- Any `tsconfig.json`.

## Git workflow

- Branch: follow the operator's instructions; otherwise `advisor/002-honest-ci-verification-gates`.
- Conventional Commits, e.g. `ci: add typecheck workflow and fix dead web test scripts`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create `.github/workflows/typecheck.yml`

Model it on `test.yml` (same trigger block: `pull_request` + `push` to `main`; same setup steps), then:

```yaml
      - run: pnpm --filter app exec paraglide-js compile --project ./project.inlang --outdir ./src/paraglide
      - run: pnpm --filter web exec paraglide-js compile --project ./project.inlang --outdir ./src/paraglide
      - run: pnpm tsc
```

**Verify locally**: run the three commands above yourself (install first). `pnpm tsc` → exit 0. If it reports pre-existing type errors, see STOP conditions.

### Step 2: Make `apps/web`'s test script honest

In `apps/web/package.json`, change `"test": "vitest run"` to `"test": "vitest run --passWithNoTests"`.

**Verify**: `pnpm test:web` → exit 0 (reports no test files, passes).

### Step 3: Remove the dead root `test:e2e:web` script

In root `package.json`, delete the line `"test:e2e:web": "pnpm --filter web test:e2e",`.

**Verify**: `grep -n "test:e2e:web" package.json` → no matches; `grep -rn "test:e2e:web" .github/ README.md CLAUDE.md` → no matches (nothing references it — if something does, see STOP conditions).

### Step 4: Run web tests in the unit-test workflow

In `.github/workflows/test.yml`, after `- run: pnpm test:app`, add `- run: pnpm test:web`.

**Verify**: `pnpm test:app && pnpm test:web` → both exit 0.

### Step 5: Run the CI gate

**Verify**: `pnpm check` → exit 0 (Biome also formats YAML/JSON it is configured for; fix any formatting it reports).

## Test plan

This plan is itself test infrastructure. Verification:

- `pnpm tsc` exits 0 locally after paraglide compile.
- `pnpm test:web` exits 0 with no test files.
- After pushing (when the operator opens a PR), the new `typecheck` workflow appears and passes. The executor does not push unless instructed.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `.github/workflows/typecheck.yml` exists and contains `pnpm tsc`
- [ ] `pnpm tsc` exits 0 locally (after paraglide compile steps)
- [ ] `pnpm test:web` exits 0
- [ ] `grep -rn "test:e2e:web" package.json` → no matches
- [ ] `pnpm check` exits 0
- [ ] `git status` shows only the four in-scope files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `paraglide-js compile` is not available or its CLI flags differ (check `pnpm --filter app exec paraglide-js compile --help`) — report the actual CLI so the plan can be corrected; do not guess alternative generation methods.
- `pnpm tsc` surfaces pre-existing type errors in either app that are not caused by your changes. Report them with file:line — fixing app source is out of scope for this plan.
- Anything in `.github/` or docs references `test:e2e:web` (removing it would break that reference).

## Maintenance notes

- When real web tests are added, `--passWithNoTests` can stay (it only changes the zero-file case).
- If the paraglide plugin config in either `vite.config.ts` changes (project path/outdir), the typecheck workflow's compile flags must be kept in sync — that's the thing a reviewer should check on future vite config PRs.
- Deferred: running `packages/*` tests in CI — no package has a test script yet; plan 004's suite lives in `apps/app` so it is covered by `test:app`/`test:db` instead.
