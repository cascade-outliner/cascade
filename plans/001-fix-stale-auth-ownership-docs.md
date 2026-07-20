# Plan 001: Make the docs describe the real auth ownership (app owns login, web redirects)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4fa856d..HEAD -- CLAUDE.md README.md apps/app/.env.local.example apps/web/src/routes/login.tsx apps/app/src/routes/__root.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `4fa856d`, 2026-07-20

## Why this matters

PR #281 (commit `60a39d4`, "move authentication UI and routing ownership from `apps/web` to `apps/app`") inverted who owns login/register, but the repo's two most load-bearing onboarding documents were not updated. `CLAUDE.md` is read by every AI agent working on this repo and still says `apps/web` owns the login/register UI and that both apps must share `BETTER_AUTH_SECRET`; the README tells self-hosters to set an env var that `apps/web` no longer reads. Anyone following these docs will edit auth code in the wrong app and configure an env file with settings that do nothing.

## Current state

What the **code** actually does today (verified at commit `4fa856d`):

- `apps/app/src/routes/login.tsx` and `apps/app/src/routes/register.tsx` contain the real login/register UI, using `authClient` from `@cascade/auth/client`.
- `apps/app/src/routes/__root.tsx:37-49` gates the app and redirects unauthenticated users to the **app's own** `/login`:

  ```ts
  const authPaths = new Set(["/login", "/register"]);
  // ...
  beforeLoad: async ({ location }) => {
      const session = await getSession();
      const isAuthPath = authPaths.has(location.pathname);
      if (!session && !isAuthPath) {
          throw redirect({ to: "/login" });
      }
  ```

- `apps/web/src/routes/login.tsx` and `apps/web/src/routes/register.tsx` are pure redirects to the app (`apps/web/src/lib/app-url.ts` builds `appLoginUrl`/`appRegisterUrl` from `VITE_APP_URL`):

  ```ts
  export const Route = createFileRoute("/login")({
      beforeLoad: () => {
          throw redirect({ href: appLoginUrl });
      },
      component: () => null,
  });
  ```

- `apps/web/package.json` has **no** dependency on `@cascade/auth`. `apps/web/.env.local.example` contains only `VITE_APP_URL`.
- `apps/app/src/ui/user-menu/UserSettingsDialog.tsx:35` is the only consumer of `VITE_WEB_URL` in `apps/app` — it links back to the marketing site; it is not a login redirect target.

The **stale doc passages** to fix:

1. `CLAUDE.md` — "What this is" bullet for `apps/web`:
   > `apps/web` — marketing site + login/register/legal pages (`cascadelist.com`, dev port 3000). No database access of its own; talks to `apps/app`'s API and shares its auth session via a cross-subdomain cookie.

   Wrong: web no longer hosts login/register UI or handles sessions; its `/login` and `/register` routes redirect to `apps/app`.

2. `CLAUDE.md` — "What this is" bullet for `packages/auth`:
   > `packages/auth` — better-auth setup (`createAuth(db)`), shared by both apps so the session cookie is valid on both origins.

   Wrong: only `apps/app` depends on `@cascade/auth` now.

3. `CLAUDE.md` — "Local setup" section:
   > `BETTER_AUTH_SECRET` must be identical across both apps — it signs the shared session cookie.

   Wrong: only `apps/app/.env.local` has `BETTER_AUTH_SECRET`.

4. `CLAUDE.md` — "Routing: TanStack Start, file-based" section:
   > `apps/app`'s root route (`src/routes/__root.tsx`) gates the whole app behind a session check in `beforeLoad`, redirecting to `apps/web`'s `/login` when unauthenticated; `apps/web` owns the actual login/register UI and calls the shared better-auth client.

   Wrong direction: app redirects to its **own** `/login`; web redirects **to** the app.

5. `README.md` — Quick start:
   > Set `BETTER_AUTH_SECRET` to the same value in both env files.

   Wrong: only `apps/app/.env.local` takes it.

6. `apps/app/.env.local.example` — two stale comments:
   > `# Must be identical in apps/web (shared session cookie signing).` (above `BETTER_AUTH_SECRET`)
   > `# Where unauthenticated users are sent to log in (apps/web).` (above `VITE_WEB_URL`)

   The first is wrong (web doesn't sign sessions). The second is wrong (unauthenticated users go to the app's own `/login`; `VITE_WEB_URL` is only a link back to the marketing site from the user-settings dialog).

Repo conventions that apply: docs are plain Markdown; Biome does not lint Markdown but `pnpm check` must still pass overall. Commit messages use Conventional Commits with lowercase subject (e.g. `docs: fix stale auth ownership description`).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `pnpm install` | exit 0 |
| Lint/format (CI gate) | `pnpm check` | exit 0 |
| Grep for leftovers | see Done criteria | no stale matches |

## Scope

**In scope** (the only files you should modify):
- `CLAUDE.md`
- `README.md`
- `apps/app/.env.local.example`

**Out of scope** (do NOT touch, even though they look related):
- Any `.ts`/`.tsx` source file — the code is correct; only the docs are wrong.
- `apps/web/.env.local.example` — already correct (only `VITE_APP_URL`).
- `CHANGELOG.md` — this change touches `apps/app/` (the env example), so the changelog CI check will trigger; apply the `skip-changelog` label to the PR instead of adding an entry (no user-facing app change). If you cannot apply labels, add a dated entry noting corrected setup docs.

## Git workflow

- Branch: follow the operator's instructions; otherwise `advisor/001-fix-stale-auth-ownership-docs`.
- Conventional Commits, lowercase subject, e.g. `docs: describe app-owned auth flow in claude.md and readme`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Rewrite the four stale CLAUDE.md passages

In `CLAUDE.md`, make these replacements (keep surrounding structure intact):

1. `apps/web` bullet → describe it as: marketing site + legal pages (`cascadelist.com`, dev port 3000); no database access of its own; its `/login` and `/register` routes redirect to `apps/app`, which owns all auth UI and session creation.
2. `packages/auth` bullet → better-auth setup (`createAuth(db)`), consumed by `apps/app` only (schema, server, and React client); `apps/web` does not depend on it.
3. Local setup sentence → `BETTER_AUTH_SECRET` is set only in `apps/app/.env.local` (it signs the session cookie); `apps/web` needs only `VITE_APP_URL`.
4. Routing paragraph → `apps/app`'s root route (`src/routes/__root.tsx`) gates the whole app behind a session check in `beforeLoad`, redirecting to its own `/login` when unauthenticated; `apps/app` owns the login/register UI; `apps/web`'s `/login` and `/register` redirect to the app via `appLoginUrl`/`appRegisterUrl` (`apps/web/src/lib/app-url.ts`).

**Verify**: `grep -n "apps/web\` owns the actual login" CLAUDE.md` → no matches; `grep -n "identical across both apps" CLAUDE.md` → no matches.

### Step 2: Fix README.md quick start

Replace "Set `BETTER_AUTH_SECRET` to the same value in both env files." with an instruction to set `BETTER_AUTH_SECRET` (any random 32+ char string) in `apps/app/.env.local` only, and to point `apps/web`'s `VITE_APP_URL` at the app origin (`http://localhost:3001` for dev).

**Verify**: `grep -n "same value in both env files" README.md` → no matches.

### Step 3: Fix the two stale comments in apps/app/.env.local.example

- Above `BETTER_AUTH_SECRET`: replace the "Must be identical in apps/web" comment with e.g. `# Signs the session cookie. Any random string of 32+ characters.`
- Above `VITE_WEB_URL`: replace with e.g. `# Marketing site origin (used for links back to cascadelist.com).`

**Verify**: `grep -n "identical in apps/web" apps/app/.env.local.example` → no matches; `grep -rn "unauthenticated users are sent" apps/app/.env.local.example` → no matches.

### Step 4: Run the CI gate

**Verify**: `pnpm check` → exit 0.

## Test plan

No code changes, so no new tests. Verification is the grep gates above plus `pnpm check`.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -rn "owns the actual login" CLAUDE.md` → no matches
- [ ] `grep -rn "identical across both apps\|identical in apps/web\|same value in both env files" CLAUDE.md README.md apps/app/.env.local.example` → no matches
- [ ] `pnpm check` exits 0
- [ ] `git status` shows only the three in-scope files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The current CLAUDE.md/README text does not contain the quoted stale passages (someone already fixed them — mark this plan DONE-by-others in the index instead).
- You find the code has changed direction again (e.g. `apps/web/src/routes/login.tsx` no longer redirects to the app) — the docs fix would then be wrong; report what you found.

## Maintenance notes

- If auth ownership moves again, these same four CLAUDE.md passages plus README and both `.env.local.example` files are the checklist of places to update.
- Reviewer should read the new CLAUDE.md bullets against `apps/app/src/routes/login.tsx` and `apps/web/src/routes/login.tsx` to confirm direction.
- Deferred: a CONTRIBUTING or docs page describing the auth flow diagram — out of scope here.
