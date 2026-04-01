<!-- Category: Tracked Tooling (Governance); Purpose: Keep commits lane-pure and release-safe. -->
# Commit Lane Playbook

## Three Practical Buckets
- `Product`: user-facing behavior and runtime code (`src/`, `server/`, `public/`, product tests).
- `Tooling`: governance, scripts, CI/workflows, docs that improve delivery speed and quality.
- `Generated/Local`: evidence outputs and local-only helpers (`.project_memory/`, `docs/session/`, `docs/project_memory/test_runs/`, `docs/project_memory/strategy_reports/`, generated `docs/project_memory/review_packets/*_review.*` or timestamped packet instances, `RUN_*`, `tools/.local_ops/`) and never committed.

## Commit Rule (Hard)
- One commit = one lane + one intention.
- Never mix `Product` and `Tooling` files in a single commit.
- Never stage `Generated/Local` files.
- Track reusable review/QA infrastructure, not task-run artifacts:
  - track `tools/codex/`, `scripts/ops/`, stable governance docs, `docs/project_memory/review_packets/README.md`, and stable templates/contracts.
  - do not track generated packet instances, test-run summaries, strategy reports, or `.project_memory/` outputs.
- `package.json` stays product by default, except script-wrapper-only changes that expose tooling commands; those may ride with the tooling lane.

## Pre-Commit Routine
1. `git status --short`
2. `npm run scope:guard -- --mode product` for product commits, or `npm run scope:guard` for tooling commits.
3. Product lane gates: `npm run lint:debt:check` and relevant acceptance tests.
4. Tooling lane gate: `npm run test:repo-boundary`.

## Validation Loop
- Student-facing product tasks should use this default loop:
  1. `npm run test:software-bot`
  2. `npm run test:persona-gate`
  3. `npm run test:persona-browser-gate`
  4. `npm run test:browser:mentor` when mentor behavior is touched
  5. the most relevant additional targeted browser journey, if one exists
- Tooling tasks that change review/test infrastructure should still run:
  1. `npm run scope:guard`
  2. `npm run test:repo-boundary`
  3. the new software-testing bot in the most relevant mode (`fast` or `product`)
- Software-testing bot lane behavior:
  - by default it detects the current changed surface and uses product-mode scope guard for product files, tooling/default scope guard for tooling-only changes
  - `--lane=product` or `--lane=tooling` can override that detection when needed
- Mentor smoke:
  - `test:software-bot` now includes a deterministic mentor runtime smoke in `product` and `full` modes.
  - `npm run test:mentor:smoke` is the direct entrypoint for that check.
- Generated evidence stays local-only even when these checks write JSON reports.

## Push Rule
1. Push only after lane-specific checks pass.
2. Keep history readable: separate commit messages for product vs tooling.
3. If a commit touches both lanes, split it before pushing.
