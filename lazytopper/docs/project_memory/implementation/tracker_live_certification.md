# Tracker Live Mode Certification

## Certified Status
LIVE_TRACKING: PASS (2026-01-28)

## Evidence
C:\Users\Chetan\OneDrive\Desktop\Lazytopper\wayforward\01-02-2026\output\LazyTopper_CODEX_RUN_LT_TRACKER_T011_20260128_081159_CERTIFY_LIVE_TRACKING.zip

## How to run
- npm run tracker:live
- open http://localhost:4179

## Known pitfall
Opening the screener via file:// can show FAILED_TO_LOAD; HTTP server mode is authoritative.

## Baseline
- T010 commit: 3c1591495584dc6f0490c7f0ce80531c3384d3b9

## VS Code usage
- Run Task: Tracker: Live (background)
- Run Task: Tracker: Open UI

## Self-check
- npm run tracker:doctor

## Pitfall
file:// can show FAILED_TO_LOAD; use HTTP URL.

## Tooling blockers (never again)
- Build/PostCSS: config must match file type and be UTF-8 without BOM.
- Tracker YAML: paths must use single quotes or forward slashes (avoid \\U escapes).
- Windows artifacts: avoid creating `desktop.ini`/`Thumbs.db`/`.DS_Store`; if possible, don’t open repo folders in Explorer.

Pre-flight:
- npm run build
- npm run tracker
- npm run tracker:doctor

Nomenclature rule: R* roadmap vs B* tutor_rag blocks; no collisions.
YAML rule: use single quotes or forward slashes for Windows paths.

## Scope Guard
Run `npm run scope:guard` before committing tooling tasks.

- PostCSS config JSON MUST be UTF-8 NO BOM.
- If build throws “Unexpected token '﻿' … not valid JSON”, run BOM scan.
- Pre-flight includes: npm run build.

## Scope Guard Modes
- Tooling tasks: `npm run scope:guard`
- Tutor work: `npm run scope:guard:tutor`
- Never bypass scope guard; choose the correct mode.
