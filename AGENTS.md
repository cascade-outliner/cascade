# Agent instructions

- pnpm monorepo (`apps/*`, `packages/*`). Use root scripts: `pnpm check`, `pnpm typecheck`, `pnpm web-app:e2e`.
- Format/lint with Biome (`pnpm format:write`), not Prettier/ESLint.
- Component styles use Panda CSS v2 (`css`, `css.raw`, `keyframes`, `viewTransition`, `firstThatWorks` …), not Tailwind or new CSS files. Tokens and conditions live in `packages/theme/panda.config.ts`, published as a design system with `panda lib` (`pnpm theme:build`, also run on install). `packages/ui` imports from `@cascade/theme/css`; apps set `designSystem: "@cascade/theme"` and import their own generated `#/styled-system/css` (web-app) or `@/styled-system/css` (website). The `styled-system` folders are generated, never edited.
- Web-app imports use `#/…` (maps to `apps/web-app/src`).
- The outline lives in IndexedDB; Postgres sync is optional. E2E runs with `DATABASE_URL=""`, so no server or sync.
- PR titles and commits follow Conventional Commits with a lowercase subject (`feat: add x`). CI rejects anything else.

## Tests

- Before writing or editing Playwright tests (`apps/web-app/e2e/**`), invoke the `playwright-best-practices` skill.
- E2E: use fixtures and page objects from `apps/web-app/e2e/fixtures.ts` and `e2e/pages/`, and locate elements by `data-testid`. Tests start onboarded; opt out with `test.use({ onboarded: false })`.
