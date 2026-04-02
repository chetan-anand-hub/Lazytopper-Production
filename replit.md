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
- AI "Generate Similar" endpoint still available on server (`/api/more-like-this`) but removed from HPQ UI — replaced by "Practice similar" smart filtering

## AI Provider — Replit AI Integration Proxy

The server uses Replit's AI Integration proxy for Gemini access, eliminating free-tier rate limits (429 errors):
- Environment variables: `AI_INTEGRATIONS_GEMINI_BASE_URL` and `AI_INTEGRATIONS_GEMINI_API_KEY` (auto-provisioned, never modify manually)
- Fallback: If proxy vars are missing, falls back to `GEMINI_API_KEY` / `API_KEY` direct key
- Model: `gemini-2.5-flash` (configurable via `GEMINI_MODEL` env var)
- All endpoints use the proxy: `/api/step-solution`, `/api/more-like-this`, `/api/mentor`, `/api/variants`
- Charges are billed to Replit credits (no separate API key needed)

## HPQ UX Improvements (Post-Task #14)

- **Removed AI variants** from HPQ cards — button, state, handler, and display all removed; cleaner card layout
- **"Practice similar" button** replaces old "Bank practice" — navigates to Practice page with smart filters: `subtopicHint` (from `q.subtopic`), `difficultyPreset: "All"` (no marks/section constraints)
- **Concept teach focus fix**: `openConceptDrawer` now passes `q.subtopic || q.concept || bucket.topic` as `topicKey` (was always `bucket.topic`). Server prompt hardened to say "DO NOT teach entire chapter, ONLY teach [concept]"
- **Button sizing fix**: Added `whiteSpace: "nowrap"` + `alignItems: "center"` to action button row so buttons don't overflow when solution panel is open
- Files: `HighlyProbableQuestions.tsx`, `practiceNavigation.ts`, `PracticePage.tsx`, `server/index.cjs`

## UX Polish & New Features (Post-Task #14 Phase 2)

- **Practice page button cleanup**: Removed "Ask mentor about this question" and "Mentor help" dropdown buttons; single "Step-by-Step Solution" button is now the primary action; "Teach me this concept" + "Check My Solution" live inside the solution panel
- **LaTeX/Math rendering**: `MathText` component (`components/question/MathText.tsx`) renders LaTeX expressions using KaTeX library; handles `\(...\)` inline math and `\[...\]` display math delimiters; Unicode fallbacks for bare LaTeX commands (`\sqrt`, `\times`, etc.); XSS-safe — only KaTeX-rendered output uses `dangerouslySetInnerHTML`, all plain text uses React safe rendering; applied to question text, solution steps, and assertions in both HPQ and Practice pages
- **Tutor response truncation fix**: Conversational teach `maxOutputTokens` increased from 800 to 1600 to prevent opening statements from being cut off
- **Image upload solution checking**: New `/api/check-solution` endpoint accepts student's handwritten solution image + question context; uses Gemini vision to evaluate against CBSE marking scheme; returns step-by-step feedback with marks awarded per step, overall score, and improvement tips; `SolutionChecker` component (`components/question/SolutionChecker.tsx`) provides upload UI with preview, evaluation results, and retry
- **Server body size limit**: `readJson()` now enforces 5 MB max request body to prevent DoS
- Files: `MathText.tsx`, `SolutionChecker.tsx`, `aiClient.ts`, `PracticePage.tsx`, `HighlyProbableQuestions.tsx`, `server/index.cjs`

## CBSE Solution Quality Overhaul (Phase 1 & 2)

Step-by-step solutions now match official CBSE marking scheme format:
- **MCQ detection**: `isObjectiveType(qType, section)` detects MCQ/AR/Section A questions; MCQ solutions show 1 scored step + optional 0-mark explanation step
- **Half-mark support**: 0.5-mark steps display as "½ mark" throughout; marks badge handles all fractional values
- **0-mark explanatory steps**: Show "Explanation" badge in grey (#f3f4f6) instead of blue marks badge
- **Practice page integration**: Inline step-by-step solution panel on Practice page (same as HPQ); loads on "Show solution" click via `fetchStepSolution`; solution cache clears on question regeneration
- **Fallback improvements**: All error/empty paths now use `buildFallbackSteps` when answer/explanation exist (uses real answer content instead of generic template); all fallback paths pass `qType` and `section` params
- **AI context**: AI prompt now receives existing answer/explanation as context to EXPAND on, not just repeat; MCQ-specific instructions disable "Writing given data" pattern
- Files: `lazytopper/server/index.cjs` (server), `lazytopper/src/pages/PracticePage.tsx`, `lazytopper/src/pages/HighlyProbableQuestions.tsx`, `lazytopper/src/ai/aiClient.ts`

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
