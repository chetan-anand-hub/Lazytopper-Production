# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## HPQ Prediction Engine (Task #7 — completed)

Replaced synthetic/circular historical data with real CBSE board exam pattern data:
- `lazytopper/src/prediction/cbseHistoricalArchetypes.ts` — ~540 curated archetype entries from CBSE Class 10 board papers 2017-2025, covering all 14 Maths + 13 Science topics
- `lazytopper/src/prediction/historicalDataset.ts` — rewired to source from real archetypes instead of predictedQuestions (removed circular dependency); added fuzzy matching for subtopic lookups
- `lazytopper/src/data/predictionScoring.ts` — replaced `rotationFactor()` stub with real rotation detection using historical subtopic appearance; wired `baseTopicWeight()` to use actual CBSE weightage data from topic trends
- `lazytopper/src/prediction/probabilisticScoring.ts` — calibrated NEP policy boosts to reflect actual CBSE post-2023 observed shifts (case-based 1.52x, assertion-reasoning 1.38x)
- AI "Generate Similar" feature was already implemented (server endpoint `/api/more-like-this`, client `generateMoreLikeThis()`, full HPQ card UI)

## Homepage Redesign (revised)

Light-theme, student-friendly educational landing page:
- Clean white background with blue brand (#2563eb) and teal accent (#0d9488)
- Two subject entry buttons (Maths Trends / Science Trends) instead of single generic CTA
- Honest language: "most likely to appear" not "will ask"; disclaimer under hero
- 3-step "How it works" section: See trends → Learn → Practice
- 4 feature cards: Trends, AI tutor, HPQ predicted questions, Mock builder
- Trust section with honest stats (10 yrs data, Free, Both subjects)
- Bottom CTA reinforces the main action
- Mobile-first responsive (560px breakpoint)
- Full SEO preserved (title, description, OG, Twitter, JSON-LD, canonical, FAQ schema)
- Files: `lazytopper/src/pages/Home.tsx`, `lazytopper/src/pages/home.css`

## Dead Code Cleanup (Task #6 — completed)

Removed dead session/play infrastructure:
- Deleted: `sessionService.ts`, `SessionPlayPage.tsx`, `SessionPlayer.tsx`, `AiMentorPage.tsx`, `aiMentorStyles.css`
- Removed `/play/:sessionId` route and legacy `/topics/:topicKey` route from App.tsx
- `/ai-mentor` and `/mentor` routes now redirect to `/topic-hub` (preserving grade/subject context)
- Dashboard daily mix buttons navigate to `/daily-mix/:grade/:subject` instead of creating cloud sessions
- Login quick start navigates to `/dashboard` instead of creating a cloud session
- TopicHubHome: removed dead `startChapterSession` function and related state
- Cleaned docs bloat (`.docx` files, `NOTES/` directory)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── lazytopper-app/     # LazyTopper artifact (routes to lazytopper/ via artifact.toml)
├── lazytopper/             # LazyTopper source code (React + Vite, served on port 25246)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
