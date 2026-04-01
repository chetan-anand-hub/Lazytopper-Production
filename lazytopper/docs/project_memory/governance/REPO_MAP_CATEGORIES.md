<!-- Category: Tracked Tooling (Governance); Purpose: Classify top-level repo paths by boundary category and record evidence ignore coverage. -->
# Repo Map + Category Report

Report date: February 1, 2026

## Top-Level Directories and Categories

- `.codex_runs` - Generated Evidence (ignored)
- `.githooks` - Tracked Tooling
- `.github` - Tracked Tooling
- `.project_memory` - Generated Evidence (ignored)
- `.vscode` - Local-only tooling (ignored)
- `dist` - Generated Evidence (ignored)
- `docs` - Tracked Tooling (governance + ops docs)
- `node_modules` - Generated Evidence (ignored)
- `NOTES` - Tracked Tooling (documentation)
- `public` - Product (ship) code
- `RUN_LT_B01_T025R7B_2026-01-23_0041_IST_CI_PASS_PROOF_CAPTURE` - Generated Evidence (ignored)
- `RUN_LT_B01_T025R7B_2026-01-23_011424_CI_PASS_PROOF_CAPTURE` - Generated Evidence (ignored)
- `RUN_LT_B01_T025R7B_2026-01-23_012712_CI_PASS_PROOF_CAPTURE` - Generated Evidence (ignored)
- `RUN_LT_B01_T025R7B_2026-01-23_014623_CI_PASS_PROOF_CAPTURE` - Generated Evidence (ignored)
- `scripts` - Tracked Tooling
- `server` - Product (ship) code
- `src` - Product (ship) code
- `tests` - Product (ship) code
- `tools` - Tracked Tooling (local-only subtree enforced via per-worktree exclude)
- `_handoff` - Generated Evidence (ignored)
- `_rollback` - Generated Evidence (ignored)

## Generated Evidence Paths (Ignored)

Confirmed ignored by `.gitignore`:
- `.project_memory/`
- `docs/project_memory/test_runs/`
- `docs/project_memory/strategy_reports/`
- generated `docs/project_memory/review_packets/*_review.md`
- generated `docs/project_memory/review_packets/*_review.json`
- timestamped generated packet instances under `docs/project_memory/review_packets/`
- `.codex_runs/`
- `RUN_*/` and `**/RUN_*/`
- `docs/ops/out/`
- `dist/`
- `build/` (build outputs)
- `node_modules/`
- `Reports/`
- `_handoff/`
- `_rollback/`

Local-only tooling (per-worktree exclude):
- `tools/.local_ops/` (enforced by `scripts/ops/bootstrap_local_ops.ps1`)

Stable tracked review guidance:
- `docs/project_memory/review_packets/README.md`
- optional tracked templates/contracts under `docs/project_memory/review_packets/templates/`
