# Repo access · Gates · Forbidden lanes · Git doctrine · Gotchas
# The DURABLE technical details. The VOLATILE state (trunk SHA, merged PRs, surface statuses) is NOT here —
# read `handoff/CURRENT_STATE.md` live via codeload at session start for that.

## REPO ACCESS
- Repo: `chetan-anand-hub/Lazytopper-Production` · trunk branch `base/approved-thru-437`.
- Codeload tarball (audits): `https://codeload.github.com/chetan-anand-hub/Lazytopper-Production/tar.gz/<ref>`
  (`<ref>` = a branch name, or a commit SHA to review a pushed PR). Owner supplies the trunk SHA — codeload
  doesn't expose it; RE-DERIVE via the owner or the branch tarball, never trust a written SHA.
- Owner dir `C:\Projects\Lazytopper-Production` · agent worktrees `C:/Projects/LT-worktrees/` · reports →
  `C:\Users\Chetan\OneDrive\Desktop\diff\`.

## GATES (exact commands)
- Typecheck: `cd lazytopper && npx tsc -p tsconfig.app.json --noEmit` — NEVER bare `npx tsc` (root tsconfig has
  `files:[]`, always exits 0).
- Build: `npm run build` · Verifier: `node scripts/verify-production-build.mjs`.
- Root matrix: `cd scripts && npm run test:matrix:all` (~181 — counts GROW, report the real number, never hardcode).
- Ops matrix: `npm run test:matrix:all` (in lazytopper). Mojibake: `npm run check:mojibake`. Git: `git diff --check`.
- Vitest: **Codespace only (Node 22, linux-pinned)** — a standalone vitest test does NOT run in CI (CI runs the
  MATRICES, not the general suite). Run it in a Codespace and paste raw output. Plain-Node diagnostics (no vitest)
  can run locally on Windows first (simpler).
- Worktree install: `corepack pnpm@10.32.1` (default corepack pnpm fails on the overrides mismatch — D42).
- CI (quality-gate) must be GREEN before merge.

## FORBIDDEN / GATED · SECRETS
- GATED (need explicit owner authorization per task): `src/lib/desktop/`, `src/data/`.
- FORBIDDEN without a stated reason: `Welcome.tsx` / `App.tsx` / `DesktopShell.tsx` / `main.tsx`,
  `vite.config.ts`, `firebase.json`, `firestore.rules`, `predictionTypes.ts`.
  (firestore.rules is owner-only — deploy via Firebase Console or `firebase deploy --only firestore:rules`; agents
  flag, never edit. Keep the repo copy mirrored to what's deployed.)
- SECRETS: never paste/echo a key value anywhere (chat, terminal, tmp, report, agent context). Confirm PRESENT/
  MISSING only. Key env = `API_KEY` (auto-sets gemini); Codespaces secret must be named `API_KEY`, injected at start.

## GIT DOCTRINE
- Branch from the RE-DERIVED origin tip. Fresh worktree per task. Squash-merge; delete branch+worktree after
  (verify with `git ls-remote`; the Windows node_modules lock on worktree dirs is harmless residue).
- Stage explicitly (never `git add -A`). Co-Authored-By the executing model. Lockfile regen in a Codespace only.
- Docs-handoff PR AFTER every code PR, as a SEPARATE PR. Docs-only PRs may self-merge (§6a) IF the remote diff is
  strictly `handoff/*.md` (zero code). Docs handoffs edit the SAME files → SERIALIZE them (one fully merged before
  the next opens).
- **STALE-BASE RULE (learned ×3 — #329/#330 and a near-miss):** a draft PR left open while trunk moves goes stale;
  its copies of files changed elsewhere are OLD, and merging it can SILENTLY REVERT other PRs. Merge a passing PR
  PROMPTLY, or REBASE right before merge and confirm `git diff --name-only origin/base...HEAD` is ONLY its own
  files + the bug-fix/handoff files are byte-identical to trunk. A GitHub squash-merge applies only the branch's
  diff-from-merge-base, so a disjoint stale branch is SAFE if verified content-only — but VERIFY, never merge on faith.
- **CLOSE, don't hoard.** A PR that isn't merging SOON should be CLOSED, not left draft-open. An open PR left across a
  moving trunk doesn't just go stale — it becomes an active revert-bomb (its April copies of Dockerfile / grader /
  App.tsx would roll back months on merge). Audit any long-open PR against current trunk (staleness + what it reverts
  + whether its intent is already met/superseded); salvage-by-rebase ONLY if there's unbuilt intent, else close +
  delete the branch. Keep the open-PR count near zero. (Learned from 5 stale branches — #180/#1/#2/#17/#69 — all
  pre-#338, all superseded, all closed.)

## COORDINATION & MERGE DISCIPLINE (automate the deterministic; keep human the judgment)
The line: AUTOMATE the mechanical + error-prone-by-hand — rebasing onto current trunk, detecting lane collisions,
re-running proofs, recording the real merged SHA. KEEP HUMAN the judgment — merge approval, live-verification of a
real round-trip, ratifying a scope/pedagogy call. Automation PREPARES a merge to a quick owner yes; it never decides.
- **MERGE QUEUE mechanizes the stale-base rule.** An approved PR enters a serial queue; GitHub rebases onto current
  trunk (+ any PR ahead), re-runs CI on the rebased result, merges only if green (= stale-base + serial-merge in one
  setting). Until it's on, hand-rebase the SECOND PR onto trunk+first, re-run its proof, THEN merge.
- **LANE-OVERLAP CI CHECK catches collisions.** It intersects a PR's changed paths with every other open PR's and
  fails on overlap. File-disjoint lanes (content vs `src/data` vs CI) parallelize; two PRs on `src/data/**` do NOT —
  sequence them. Mechanical, not held-in-head.
- **The written SHA is stale by design** (one-commit doc lag) — re-derive, never trust it. An AUTO-STATE-BOARD Action
  records the real merged SHA + files to a ledger on every merge (machine-recorded, not hand-copied).
- **Every "I manually verified X" becomes a committed CI check.** Once a proof is import-based and wired into
  `test:matrix:all` (e.g. `topickey_runtime_proof.mjs`), a green check MEANS something — stop re-deriving by hand.
- **INDEPENDENT AUDIT is a STANDING step for substantive PRs** — a separate agent (not the author, no write access)
  re-runs the checks + adversarially samples → PASS/REJECT; the owner reviews the VERDICT (minutes), not the raw diff.
  Review bandwidth is the real bottleneck; this is the biggest lever on it.
- **CODEOWNERS enforces gated lanes** (`src/data/**`, forbidden files, `cofounder-skill/**`) — a prose rule that
  isn't a gate eventually gets missed.

- **DIRECT PUSH TO TRUNK — scope (owner only, via the ruleset bypass).** The owner (Repository admin, on the
  ruleset bypass list) may push straight to trunk, skipping the PR gate, ONLY when ALL hold: (a) it's the OWNER,
  not an agent — agent output ALWAYS goes through a PR + byte-review, regardless of size; (b) it's docs/handoff/
  skill/ledger TEXT (`*.md`, `handoff/`, `cofounder-skill/`, `ledger/`) — words a human reads; (c) it cannot break
  a build or change behavior — NEVER `lazytopper/src/**`, `.github/**`, config, `firestore.rules`, or any data; (d)
  a mistake is one `git revert` away. Everything else — any `src/**`, the question bank / `src/data/**`, `.github/**`,
  config, or ANY agent-produced change — goes through a PR (the byte-review + live-verify + census/guard loop exists
  precisely for those). One-line test: "my own words in a text file, revertible → push; code, config, data, CI, or
  an agent's work → PR."

- **SOLO-OWNER APPROVAL — required approvals = 0 BY DESIGN (`[FU-SOLO-OWNER-APPROVAL]`).** The trunk ruleset
  requires **0** approving reviews, NOT because review is skipped but because GitHub forbids a PR author from
  approving their own PR — and the owner is both the sole code-owner AND the author of most PRs, so a mandatory
  foreign approval is structurally unsatisfiable and blocks every merge. Do NOT "helpfully" re-enable required
  approvals or Code-Owner approval — it would wall the owner out again. The review that matters is carried by the
  MECHANICAL required checks (`lane-overlap` + `quality-gate` + up-to-date-before-merge) plus the mandatory
  INDEPENDENT AUDITOR on every substantive batch; agents never self-merge and lack write access, so agent work is
  gated by auditor-then-owner-merge regardless of the approval count. CODEOWNERS still LABELS ownership (surfaces
  sensitive-lane PRs) even at 0 approvals.
## BYTE-REVIEW RECIPE (never rubber-stamp a report)
1. Pull the branch tarball. 2. `diff -rq` against the branch's TRUE base (mind base drift — diff vs CURRENT trunk,
and explain any extra "differs" as stale-base vs real modification). 3. Confirm exact scope (only its files).
4. Confirm forbidden files untouched / byte-identical. 5. Confirm shared-infra changes are ADDITIVE (grep the
existing exports/behaviour intact). 6. No fabrication. 7. PASS/FAIL with specific checks. 8. Live-verify still required.
- **PROVE COVERAGE, NOT JUST GREEN.** A static check that SCANS SOURCE is convention-blind — it silently misses
  whatever its pattern doesn't match (factory questions, JSON-style keys). A proof/census/guard that covers a SUBSET
  is the exact failure mode being cured. Verify by reading the ASSEMBLED artifact (import), never a green text-scan;
  if a green result and the assembled artifact disagree, the artifact wins.

## KNOWN GOTCHAS (durable ones; new ones accrue in handoff/OPEN_QUESTIONS)
- GRADER: TWO functions in `checkSolution.cjs` (`handleCheckSolution` + `gradeStructuredSet`) — patch BOTH; keep in sync.
- DETECT: `thinkingBudget:0` on `handleDetectQuestion` — never remove.
- FIRESTORE D32: init MUST use `initializeFirestore(app,{ignoreUndefinedProperties:true})`. D33: a new collection is
  invisible in the console until reload; for a "write not landing" symptom, read the HAR Firestore-write payload first.
- BACKEND PROGRESS 503: `/api/user/progress/*` → 503 because `DATABASE_URL` is UNSET (legacy focus/XP/streak
  Postgres). SUPERSEDED by the Progress-Journey arc (Firestore `sessionRecords`) — do NOT provision a DB. The
  frontend sync fails SILENTLY (localStorage fallback) → no user impact. [FU-BACKEND-DATABASE-URL-UNSET]
- MCQ: 0 correctOption annotated → MCQ practice not recorded [FU-MCQ-ATTEMPTS-NOT-RECORDED] (content).
- C&I multi-Q per-step view is EXPANDABLE (collapsed by default — tap the question). C&I + Worksheet share the
  `worksheetPdfExport` PDF core (bridge to the Universal Scorecard).
- Full Mock reads `predictedQuestions`, NOT `canonicalQuestionBank` (re-source needed for new questions to reach mocks).
- `canonicalQuestionBank.ts` returns silent 0-questions on a MISSING spread — confirm new banks are spread in.
- Railway builder MUST be Dockerfile. Test on the STABLE Vercel URL. Dev auto-signs-in via `DEV && navigator.webdriver`.
- `sessionRecords/{uid}/**` Firestore rule deployed + mirrored to repo firestore.rules (dc73360).
