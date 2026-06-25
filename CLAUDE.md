# CLAUDE.md — Claude Code Standing Instructions
# LazyTopper-Production | chetan-anand-hub/Lazytopper-Production
# Read this file at the start of every session before touching anything.

---

## 1. Project Identity

- Product: LazyTopper — CBSE Class 10 study cockpit
- Stack: React + TypeScript + Vite + Firebase (Auth + Firestore) — auth is Firebase Auth (Google + Email/Password + Phone). No Clerk.
- Active integration branch: `base/approved-thru-437`
- Working directory: `C:\Projects\Lazytopper-Production`
- App source lives at: `lazytopper/src/`
- Handoff docs live at: `handoff/`

---

## 2. Session Start Checklist

Before doing anything in a new session, always run:

```bash
git fetch origin
git branch --show-current
git log --oneline -5
git status
git rev-parse HEAD
```

Confirm HEAD matches the SHA recorded in `handoff/CURRENT_STATE.md`.
If there is a mismatch, stop and report — do not proceed.

---

## 2a. Worktree Isolation — Mandatory

Never work in the shared checkout when another agent may be active. Each task runs
in its OWN git worktree:
  git worktree add C:/Projects/LT-worktrees/<name> -b <branch> origin/base/approved-thru-437
Before EVERY commit, verify `git branch --show-current` matches your own branch —
if it does not, ABORT and report. Three prior collisions came from agents sharing
the one working directory `C:\Projects\Lazytopper-Production` (shared HEAD/index/tree);
one swept product code into a docs merge. Worktree isolation is non-negotiable.

---

## 3. Permissions

- Auto-approve all file reads
- Auto-approve git fetch, git log, git diff, git status, git rev-parse
- Auto-approve PowerShell read commands
- Auto-approve TypeScript compilation checks (npx tsc -p tsconfig.app.json --noEmit)
- Auto-approve build verification commands
- ASK before: git commit, git push, git merge, git rebase
- ASK before: any file write or edit
- NEVER auto-approve: git push --force, git reset --hard, branch deletion

---

## 4. Scope Discipline — Non-Negotiable

Every prompt defines an ALLOWED FILES list and a FORBIDDEN FILES list.
Follow them exactly. Never touch a file not in the allowed list.
If a required change needs a forbidden file, STOP and report — do not proceed.

Globally forbidden across all PRs unless explicitly scoped:
- `lazytopper/src/pages/Welcome.tsx`
- `lazytopper/src/App.tsx`
- `lazytopper/src/components/DesktopShell.tsx`
- `lazytopper/src/main.tsx`
- `vite.config.ts`
- `firebase.json`
- `firestore.rules`
- Any file under `lazytopper/src/data/`

---

## 5. Product Doctrine — Never Violate

- No fake data — no invented progress, accuracy, MI insights, weak areas, or premium status
- No guest mode — /browse is inspection only; no fake learner session
- No fake payment — payment is deferred; no client-side premium activation
- No fake trial activation — trial state must come from server/admin, never client UI
- Auth is Firebase-only (Google + Email/Password + Phone). Clerk was fully removed in the auth migration (PR-1..PR-3). Firestore is keyed on Firebase uid; admin routes authorize via ADMIN_FIREBASE_UIDS.
- Safe redirects always — reject any external URL in redirect params
- Visual grammar — deep navy, soft white, green accent, calm premium CBSE cockpit feel
- Honest empty states — if data is thin, show honest empty state, never invent content
- MockBuilder is retired — un-routed from the live product (code kept, tagged for PR-G deletion). Mistake Intelligence serves its purpose.
- Mistake Intelligence is navy-sidebar chrome ONLY — never render MI on a page body (e.g. the Topic Hub page body).
- Before generating or extracting ANY content, re-read `scripts/src/syllabusGuard.ts` and copy the EXACT banned keywords into the work — never from memory. Deleted/banned topics (e.g. heredity-and-evolution, magnetic-effects) must never appear in question banks or topic lists.

---

## 6. Validation — Run After Every Edit

This repo is a **pnpm workspace** — `npm install` is blocked by a root `preinstall`
guard, and `scripts/` uses pnpm `catalog:` refs that only pnpm resolves. Use pnpm
(via `corepack pnpm` if pnpm is not on PATH). Install once with
`corepack pnpm install --frozen-lockfile`.

Always run these gates before reporting done:

```bash
# TypeScript typecheck (lazytopper app — bare `tsc --noEmit` has given false-greens)
cd lazytopper
npx tsc -p tsconfig.app.json --noEmit

# Production build (Vite; base "/app/" is hardcoded in vite.config.ts — no env vars needed)
pnpm run build
node scripts/verify-production-build.mjs        # post-build bundle verifier

# Content + scope guards (lazytopper)
pnpm run check:mojibake
pnpm run scope:guard --mode product             # or --mode mixed; works post-#192

# Root guard matrix — 5 suites (syllabus, deletion, reproduction, ops, practice-set); count GROWS over time — verify what the suite reports now, do NOT hardcode a number
cd ../scripts
pnpm run test:matrix:all

# lazytopper ops matrix (bank-health, weightage-mix, canonical-gen, trig-retire, llm-path, bsre)
cd ../lazytopper
pnpm run test:matrix:all

# Diff hygiene
cd ..
git diff --check
git diff --name-only origin/base/approved-thru-437
```

NOTE — there are TWO `test:matrix:all` scripts: the root `scripts/` 5-suite guard matrix
and the `lazytopper/` ops-checks matrix. Run BOTH; they are different.

The production build (`vite build`) is pinned to linux-x64 (the CI linux runner / GitHub
Codespaces; non-linux platform binaries are stripped in `pnpm-workspace.yaml`). Windows
dev boxes cannot run it locally — it is gated by CI on linux (see §6a). The other gates
above run on any platform.

Report each result explicitly: PASS or FAIL with details.
If any step fails: STOP. Do not proceed to commit. Report to owner.

Static gates are necessary but NOT sufficient — tsc/matrix/build pass whether or not
the live path works. Any change touching a live round-trip (auth, grading, persistence,
routing/filtering, the tutor) requires ONE real live owner execution before "done".
Flag such changes in your report as needing live-verify.

---

## 6a. CI — Active Quality Gate

CI is **active**: `.github/workflows/quality-gate.yml` (repo ROOT — the only place GitHub
registers workflows) runs on every PR targeting `base/approved-thru-437` and on push to
that branch. On a linux runner it installs the workspace with pnpm and gates the full bar:
the root `scripts` `test:matrix:all` (count grows over time — verify, don't hardcode), then lazytopper `check:mojibake`, `build`,
and lazytopper `test:matrix:all`. A red CI run blocks merge.

`scope:guard` is intentionally NOT wired into CI — it inspects the LOCAL working-tree diff
(staged / unstaged / untracked files), so on a clean CI checkout there is nothing for it
to classify (false-PASS). It remains a **local** pre-commit gate (run it before committing,
as in §6). The human merge gate is retained — CI does NOT auto-merge product PRs.

---

## 7. Forbidden Patterns — Never Introduce

- No `console.log` left in production code
- No hardcoded `/app/` route prefixes in source
- No `Math.random()` for any user-facing data
- No `localStorage` writes for premium/trial state
- No inline `style={{}}` objects in new components (use CSS classes)
- No direct Firestore writes without auth check
- No API keys or tokens in source files
- Marks buckets ("1"/"23"/"5"/"4") FUSE 2-and-3-mark questions and cannot isolate a
  single mark value. For exact mark-range filtering (e.g. a concept's 3–5 band), filter
  by the actual numeric `q.marks`, never the coarse buckets.

---

## 8. Git Discipline

- Never commit directly to `base/approved-thru-437`
- Always create a feature branch from the verified base SHA
- Branch naming: `feat/desktop-pr-[id]-[short-description]` for product PRs
- Branch naming: `docs/post-pr-[number]-[short-description]` for docs PRs
- One PR per stage — never bundle two stages into one PR
- Docs-only PRs must contain zero product file changes
- Product PRs must contain zero handoff doc changes

---

## 9. Reporting Rules

- Save all reports longer than 30 lines to: `C:\Users\Chetan\OneDrive\Desktop\diff\`
- File naming: `report-[taskname]-[YYYY-MM-DD].md`
- Every report must include:
  - Current branch and HEAD SHA
  - Files changed (list)
  - Validation results (tsc, build, verifier, git diff --check)
  - Forbidden file check result
  - VERDICT: PASS / PASS-WITH-FOLLOW-UP / HOLD

---

## 10. Handoff Update Rule

After every merged PR, a docs-only handoff update must be created before starting the next product PR.
Update these files in `handoff/`:
- `CURRENT_STATE.md` — update SHA, stage, PR state
- `NEXT_ACTION.md` — update next task and doctrine
- `SESSION_LOG.md` — prepend new entry at the TOP (newest-first)
- `IMPLEMENTATION_ROADMAP.md` — mark completed stage
- `OPEN_QUESTIONS_AND_FOLLOWUPS.md` — add any new follow-ups
- `SURFACE_TRACKER.md` — flip cells for any surface this PR moved; if scope was discovered, log it in `DECISION_LOG` + the tracker's §2a and set that surface's Scope to Settling; if none moved, state so

Never append SESSION_LOG entries at the bottom — always prepend at the top.

---

## 11. Output Paths

- Long reports: `C:\Users\Chetan\OneDrive\Desktop\diff\`
- Screenshots: `docs/screenshots/` (if capturing)
- Never write output files into `lazytopper/src/` or `handoff/`

---

## 12. GitHub MCP Usage

GitHub MCP is available for:
- Verifying live branch SHA after push
- Reading PR diff after push, before merge
- Confirming forbidden files were not touched on remote
- Reading handoff files from `base/approved-thru-437`

Use GitHub MCP for verification only — never for direct commits or merges.
All commits and pushes go through local git commands confirmed by owner.

---

## 13. CBSE Content Doctrine — Step Marking

When extracting or authoring questions, populate `solutionSteps` to match the
official CBSE 2026-27 step-marking scheme. The OLD doctrine "A=2, B=3, C=4,
D=5, E=4 steps" was wrong — Section A is a 1-mark item and earns 1 step.

CBSE 2026-27 paper pattern (verified, cbseacademic.nic.in): ~50% competency-based /
20% MCQ / 30% short-and-long answer. Question generation for mocks/worksheets should
represent the competency proportion, not just section/marks counts.

solutionSteps minimums — aligned with official CBSE 2026-27 step-marking scheme:
  Section A (1mk MCQ/AR):  1 step  — correct answer + brief justification
                                      (MCQ: why correct option; AR: why assertion/reason true/false)
  Section B (2mk VSA):     2 steps — formula/approach + substitution/working + answer with unit
  Section C (3mk SA):      3 steps — given+formula + substitution + intermediate working + final answer+unit
  Section D (5mk LA):      5 steps — define/setup + formulate + simplify + solve + conclude with units
  Section E (4mk case):    4 steps — Part(i) answer [1mk] + Part(ii) answer [1mk] +
                                      Part(iii) working [1mk] + Part(iii) final answer [1mk]

CBSE step-marking principles (source: official CBSE OSM guide, cbseacademic.nic.in 2026-27):
- Half-mark steps are real: stating the correct formula alone earns 0.5mk even if the
  rest is wrong.
- Error carried forward: if a step has a calculation error but subsequent steps follow
  correct method from that value, full marks are awarded for those subsequent steps.
- SI units mandatory: a final numerical answer without unit loses 0.5mk.
- Science keywords: exact CBSE technical term required (e.g. oesophagus not food pipe).
- Science chemistry: balanced equation earns 0.5mk; state symbols/catalyst earns 0.5mk
  — store these as two separate `solutionSteps` entries.
- Science diagrams: label as Step "Diagram: [description]"; accuracy and labels are
  separately marked — store as two `solutionSteps` entries if both are required.
