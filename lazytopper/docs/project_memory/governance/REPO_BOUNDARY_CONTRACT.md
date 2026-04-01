<!-- Category: Tracked Tooling (Governance); Purpose: Define hard repo boundaries so sessions don't mix product code, tooling, evidence, or local-only artifacts. -->
# Repo Boundary Contract (LazyTopper)

Effective date: February 1, 2026

## Canonical Taxonomy (Hard Boundary)

1) Product (ship) code
- Definition: Source that ships to users or is required for product runtime behavior.
- Examples: `src/`, `server/`, `public/`, `tests/` (when tests are part of shipped quality gates).
- Commit: YES (tracked).

2) Tracked dev tooling (gates, governance, tracker, blackbox)
- Definition: Tooling, governance docs, checklists, and scripts that define or enforce product quality.
- Examples: `scripts/`, `tools/`, `docs/ops/checklists/`, `docs/project_memory/governance/`, stable review instructions such as `docs/project_memory/review_packets/README.md`, optional tracked templates under `docs/project_memory/review_packets/templates/`, `.githooks/`, `.github/`.
- Commit: YES (tracked).

3) Generated evidence outputs (must never be committed)
- Definition: Build outputs, audit artifacts, run logs, reports, and volatile evidence created by tools.
- Examples: `docs/ops/out/`, `.project_memory/`, `docs/project_memory/test_runs/`, `docs/project_memory/strategy_reports/`, generated task review packets such as `docs/project_memory/review_packets/*_review.md`, `docs/project_memory/review_packets/*_review.json`, or timestamped packet instances, `.codex_runs/`, `RUN_*/`, `dist/`, `build/`, `node_modules/`, `Reports/`.
- Commit: NO (must be ignored).

4) Local-only tooling (must never be committed; per-worktree ignore)
- Definition: Per-developer utilities or local configs not suitable for sharing.
- Examples: `tools/.local_ops/`, `.vscode/`, local scratch logs.
- Commit: NO (must be ignored via per-worktree exclude).

## Commit Rules
- Product + Tracked Tooling: allowed and expected.
- Generated Evidence: never commit; always ignored by `.gitignore` and/or `.git/info/exclude`.
- Local-only tooling: never commit; must be enforced via per-worktree exclude (see bootstrap script).
- If a file is machine-generated from one task run, treat it as generated evidence unless it has been intentionally promoted into a stable tracked contract/template.

## Gate Worktree SOP (Detached Gate Worktree)
Purpose: avoid running gates in a dirty worktree while keeping evidence out of the repo.

1) Ensure your main worktree is clean: `git status --porcelain` should be empty.
2) Run the gate worktree script:
   - `powershell -File scripts/ops/create_gate_worktree.ps1 -MainPath <repo> -GatePath <gate_path> -OutDir <outside_repo_dir>`
   - Optional: `-Commit <sha>` to test a specific commit (default is current HEAD).
3) The script creates a detached worktree at the commit, runs:
   - `npm ci`, `npm run build`, `npm run lint`, `npm run tutor:eval`, `node scripts/ops/triangles_audit.mjs`
4) Logs are exported to the provided `-OutDir` (must be outside the repo).
5) Any artifacts created inside the gate worktree are disposable; they must not be committed.

## Session Kit (upload to new GPT sessions)
- `docs/project_memory/governance/REPO_BOUNDARY_CONTRACT.md`
- `docs/project_memory/governance/REPO_MAP_CATEGORIES.md`
- `.gitignore`
- `scripts/ops/bootstrap_local_ops.ps1`
- `scripts/ops/create_gate_worktree.ps1`
- `docs/ops/checklists/triangles.closure.checklist.json`
