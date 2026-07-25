# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Longevity Health OS — a preventive health navigation MVP (React 18 + Vite, optional Supabase backend). It gives users a rule-based personal health plan (not a medical record, not real AI) with a dashboard, item detail/completion, reminders, vaccination tracking, and family profiles.

**The application is `src/` (plus its `tests/`, `supabase/`, and Storybook config).** This repo also contains a large amount of scaffold from the tool that originally generated this project: `fabric/`, `.system/`, `.agents/`, `docs/`, `project-brief_*.md`, `fabric.values.json`, `fabric_*.zip`. That scaffold is not part of the running app, is not imported by any code under `src/`, and should be treated as inert history — don't read it for architectural guidance and don't update it when making changes, unless the user explicitly asks you to work with it.

## Commands

- `npm run dev` — start the Vite dev server.
- `npm run build` — production build (also stamps `__APP_VERSION__` from `package.json` version, see `vite.config.js`).
- `npm run preview` — preview a production build.
- `npm test` — run the Node test runner (`node --test`) over `tests/**/*.test.{js,mjs}`.
  - Run a single file: `node --test tests/self-onboarding-to-first-dashboard/plan.test.js`
  - Run a single feature's suite: `node --test tests/health-plan-browsing-and-item-detail/`
- `npm run storybook` — Storybook dev server (port 6006).
- `npm run build-storybook` — static Storybook build.
- `npm run test:storybook` — Vitest (jsdom) run scoped to Storybook, via `vitest.config.ts`.
- `npm run pwa:icons` — regenerate PWA icons (`scripts/generate-pwa-icons.mjs`).

There is no `lint` script wired for `src/`; `eslint.config.mjs` only targets scaffold runtime files. There is no typecheck script even though `tsconfig.json` exists (`allowJs`, `strict: false`, `noEmit` — it's there for editor/IDE support, not enforced anywhere).

## Architecture

### Feature-slice structure

Application code lives under `src/features/<feature-name>/`, one directory per product area (e.g. `self-onboarding-to-first-dashboard`, `health-plan-browsing-and-item-detail`, `item-completion-and-reminder-actions`, `vaccination-tracking-area-and-manual-entries`, `family-onboarding-and-family-overview`, `profile-area-and-household-preferences`, `auth`, `live-enrollment`, `plan-timeline`). Each feature directory follows the same internal split, though not every feature has every file:

- `model.js` — domain enums/constants (categories, statuses, labels) and small predicates.
- `definitions.js` — locked, hand-authored source data (e.g. the MVP preventive-item definitions) with assertion helpers.
- `projection.js` — pure functions that build read models/view models from state (dashboard grouping, category tabs, detail resolution) — no side effects.
- `service.js` — stateful session/orchestration logic (e.g. `create*Session` factories) that features hand to their route.
- `<FeatureName>.jsx` — the top-level React component for the feature, paired with a co-located `.css` file.
- `index.js` — the feature's public barrel export; import from a feature via its `index.js`, not by reaching into internal files.

`src/routes/<feature-name>.jsx` are thin wrappers: import the feature's component + CSS from its barrel and forward props. Routing itself is not a router library — `src/App.jsx` is the single top-level owner of view state, switching a hand-rolled `activeView` (`onboarding` | `plan` | `timeline` | `profile`) that's synced to a `?view=` query param (`currentViewFromUrl` / `replaceViewInUrl`).

`src/App.jsx` is also where cross-feature orchestration happens: hydrating/persisting runtime state, resolving which persistence tier is active, mapping feature callbacks (`onOpenHealthPlan`, `onOpenVaccinations`, `onPlanSnapshotChange`, etc.) to view transitions, and keeping `profileAreaSeed` (the family/profile list + per-profile plans) in sync with whichever profile is currently active. When touching cross-feature navigation or state flow, this file is the place to look first.

### Persistence tiers

The app runs in one of three modes depending on env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_STATE_KEY`), resolved at startup in `App.jsx`:

1. **No Supabase configured** — local-only demo mode; a single `DEMO_PROFILE` and in-memory state, nothing persisted.
2. **`src/lib/persistence/supabaseAppState.js`** — single-blob persistence: the whole runtime state (profile, plan snapshot, profile-area seed) is serialized/deserialized as one JSON row keyed by `VITE_SUPABASE_STATE_KEY`. No real auth.
3. **`src/lib/persistence/supabaseLivePlans.js`** — full multi-user mode: real email/password auth (`EmailPasswordAuth`), per-user health profiles, and per-profile plan persistence with RLS and conflict detection (`isLivePlanConflictError`). This is the direction the project is moving toward (see recent commit "clean-up before moving to hosted DB").

`isSupabasePersistenceConfigured` / `isSupabaseLivePlansConfigured` / `isSupabaseCatalogConfigured` gate which tier is active — check these before assuming Supabase is reachable.

### Preventive item catalog

The catalog of preventive health items is fetched from Supabase (`src/lib/catalog/supabasePreventiveCatalog.js`) and cached in a module-level singleton (`src/lib/catalog/runtimeCatalog.js`, `setRuntimeCatalog` / `getRuntimeCatalog`). The catalog used to ship as a local CSV/XLSX under `self-onboarding-to-first-dashboard/`; those files have been removed in favor of the hosted DB — don't reintroduce a local catalog file without checking with the user first, since that migration is intentional and in progress.

### Database

Supabase schema/migrations live in `supabase/migrations/`, applied in filename (timestamp) order — covers app runtime state, the preventive catalog, live profile/plan entities, and several RLS-hardening passes on profile/family membership. `supabase/seed.sql` seeds local dev data.

### Testing conventions

`tests/<feature-name>/` mirrors `src/features/<feature-name>/`. Each feature typically has:
- a suite testing its own logic (e.g. `plan.test.js`, `dashboard.test.js`, `validation.test.js`, or `<feature-name>.test.mjs`), and
- a `carry-forward-invariants.test.mjs` that asserts cross-cutting invariants for that feature (e.g. "generated items only come from the locked MVP catalog", "plan generation completes within 5 seconds").

`tests/fixtures/` holds shared test doubles for the catalog (`catalogOptions.js`, `preventiveCatalog.js`) so feature tests don't depend on a real Supabase connection. `tests/regressions/` holds standalone regression tests not tied to one feature folder.

### Storybook

Stories live under `src/stories/`, configured via `.storybook/main.ts` (React + Vite framework, `addon-docs`).

### PWA

`public/manifest.webmanifest` and `public/sw.js` provide PWA support; `src/register-service-worker.js` (imported from `src/main.jsx`) registers the service worker only in production, and actively unregisters any service worker + clears caches when running on localhost in dev so local changes always reflect immediately.
