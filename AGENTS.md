# Agent instructions

- pnpm monorepo (`apps/*`, `packages/*`). Use root scripts: `pnpm check`, `pnpm typecheck`, `pnpm web-app:e2e`.
- Format/lint with Biome (`pnpm format:write`), not Prettier/ESLint.
- Component styles use StyleX (`@stylexjs/stylex`), not Tailwind or new CSS files.
- Web-app imports use `#/…` (maps to `apps/web-app/src`).
- The outline lives in IndexedDB; Postgres sync is optional. E2E runs with `DATABASE_URL=""`, so no server or sync.
- PR titles and commits follow Conventional Commits with a lowercase subject (`feat: add x`). CI rejects anything else.

## Tests

- Before writing or editing Playwright tests (`apps/web-app/e2e/**`), invoke the `playwright-best-practices` skill.
- E2E: use fixtures and page objects from `apps/web-app/e2e/fixtures.ts` and `e2e/pages/`, and locate elements by `data-testid`. Tests start onboarded; opt out with `test.use({ onboarded: false })`.
