# CLAUDE.md — Claude Code Standing Instructions
# LazyTopper-Production | chetan-anand-hub/Lazytopper-Production
# Read this file at the start of every session before touching anything.

---

## 1. Project Identity

- Product: LazyTopper — CBSE Class 10 study cockpit
- Stack: React + TypeScript + Vite + Firebase + Clerk auth
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

## 3. Permissions

- Auto-approve all file reads
- Auto-approve git fetch, git log, git diff, git status, git rev-parse
- Auto-approve PowerShell read commands
- Auto-approve TypeScript compilation checks (tsc --noEmit)
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
- Clerk stays for now — auth architecture is a deliberate future decision (K2H-15)
- Safe redirects always — reject any external URL in redirect params
- Visual grammar — deep navy, soft white, green accent, calm premium CBSE cockpit feel
- Honest empty states — if data is thin, show honest empty state, never invent content

---

## 6. Validation — Run After Every Edit

Always run in this order before reporting done:

```bash
cd lazytopper
npx tsc --noEmit
NODE_ENV=production BASE_PATH=/app/ npm run build
node scripts/verify-build.mjs
git diff --check
git diff --name-only origin/base/approved-thru-437
```

Report each result explicitly: PASS or FAIL with details.
If any step fails: STOP. Do not proceed to commit. Report to owner.

---

## 7. Forbidden Patterns — Never Introduce

- No `console.log` left in production code
- No hardcoded `/app/` route prefixes in source
- No `Math.random()` for any user-facing data
- No `localStorage` writes for premium/trial state
- No inline `style={{}}` objects in new components (use CSS classes)
- No direct Firestore writes without auth check
- No API keys or tokens in source files

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
official CBSE 2025-26 step-marking scheme. The OLD doctrine "A=2, B=3, C=4,
D=5, E=4 steps" was wrong — Section A is a 1-mark item and earns 1 step.

solutionSteps minimums — aligned with official CBSE 2025-26 step-marking scheme:
  Section A (1mk MCQ/AR):  1 step  — correct answer + brief justification
                                      (MCQ: why correct option; AR: why assertion/reason true/false)
  Section B (2mk VSA):     2 steps — formula/approach + substitution/working + answer with unit
  Section C (3mk SA):      3 steps — given+formula + substitution + intermediate working + final answer+unit
  Section D (5mk LA):      5 steps — define/setup + formulate + simplify + solve + conclude with units
  Section E (4mk case):    4 steps — Part(i) answer [1mk] + Part(ii) answer [1mk] +
                                      Part(iii) working [1mk] + Part(iii) final answer [1mk]

CBSE step-marking principles (source: official CBSE OSM guide, cbseacademic.nic.in 2025-26):
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
