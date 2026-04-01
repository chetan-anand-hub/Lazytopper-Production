# CI lint + tooling commit rules

## Why CI lint differs from local full lint
CI lint runs only on files changed against `origin/feature/topichub-ui-lock` so we can keep CI green while legacy lint debt remains. Full lint still exists for local cleanup and focused refactors.

## Rule
Rule: CI lint blocks only new/changed files; legacy debt is tracked separately.

## When to run lint:full
- Before large refactors or cleanup work that targets legacy lint errors.
- When making sweeping formatting or dependency updates that touch many files.
- When explicitly asked to remediate existing lint debt.

## Commit policy
- Commit/push: tooling changes that are allowed by the tooling scope guard (examples: `.gitattributes`, `scripts/lintCi.mjs`, this document, `package.json`).
- Never commit: generated artifacts under `.project_memory/` or any local outputs. Keep those local and out of git.

## Legacy Lint Debt Freeze
- The baseline is stored at `.project_memory/lint/baseline.json` and defines existing lint debt.
- `npm run lint:debt:check` fails only when new lint messages appear that are not in the baseline.
- To refresh the baseline intentionally, run `npm run lint:debt:freeze` and review the summary at `.project_memory/lint/baseline_summary.md`.
- Interpret check reports in `.project_memory/lint/check_report.md` to see any regressions.
- Hard rule: baseline updates only when planned (never accidentally during feature work).
