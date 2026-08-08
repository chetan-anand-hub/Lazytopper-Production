# LazyTopper Handoff SOP

## Purpose

This folder is the permanent session-to-session handoff area for the LazyTopper desktop graduation / Level-3 implementation project.

Every GPT session must update this folder incrementally before ending, especially after any:
- PR
- QA verdict
- implementation decision
- prototype decision
- operating-rule change
- environment lesson

## PER-PR HANDOFF RULE (non-negotiable)

**Every merged PR is IMMEDIATELY followed by a handoff update in the SAME work session** — no batching, no "later":

1. Prepend a newest-first entry to `CURRENT_STATE.md` **and** `SESSION_LOG.md`.
2. Update `SURFACE_TRACKER.md` if a surface moved (flip the cell + note it in §2a if scope was discovered).
2b. Update `LAUNCH_REMAINING.md` if a critical-path item advanced or a pre-launch gate flipped (append its change log).
3. Add/resolve follow-ups in `OPEN_QUESTIONS_AND_FOLLOWUPS.md`.
4. **Record the merged SHA in `CURRENT_STATE.md`** — the machine `ledger/MERGE_LEDGER.md` auto-append is
   SUMMARY-ONLY (`[FU-STATE-BOARD-SUMMARY-ONLY]`), so the narrative here is the authoritative merge record.

Docs/handoff PRs are SEPARATE from product PRs (CLAUDE.md §8) and are self-merge-eligible (§6a) once the diff shows
zero code/config files. The multi-PR catch-up backlog that once required a dedicated reconstruction task (#377 —
docs left stale from #364 through #375) is the failure mode this rule exists to prevent.

## Why this exists

Future GPT sessions must not rely only on:
- ChatGPT memory
- screenshots
- downloaded Word documents
- stale Codespaces branches
- stale Replit state
- prior GPT summaries without GitHub verification

## Source of truth

Production repo:
```
chetan-anand-hub/Lazytopper-Production
```

Active integration branch:
```
base/approved-thru-437
```

Latest verified live base after PR #80 merge:
```
018c95b11f5168d27fb93bb3a2cae3859b682627
```

Important:
The live base can advance after docs-only handoff PRs. Future sessions must verify `origin/base/approved-thru-437` directly before implementation.

Current handoff checkpoint after PR #80:
- PR #80 / PR-K2H-4 is merged into `base/approved-thru-437`.
- PR #80 title: `PR-K2H-4: Frozen landing page and explore-first entry`.
- Final PR head: `045ffa00a3894405f67a5ceda778f313c693fa0f`.
- Merge commit / new base SHA: `018c95b11f5168d27fb93bb3a2cae3859b682627`.
- Changed files: 3.
- PR #80 QA result: PASS.
- Frozen public landing is implemented and should not be redesigned casually.
- Explore-first browse mode is implemented through `/browse`.
- No open implementation PR should be assumed unless live GitHub says so.

Next recommended implementation after this docs-only handoff update:
PR-K2H-5 - Login visual parity + auth gate polish while preserving real Clerk auth, no guest mode, reason/redirect handling, safe redirects, and the PR #80 Explore/sign-in funnel.

PR #69 / K2D remains separate. Do not merge it blindly or absorb it into K2H without explicit audit and owner approval.

## Current activation status

The handoff folder became active after PR #54 merged into base/approved-thru-437.

Current activation merge commit:
7518d2fc4a181472b4dafd1969a41d96eec2ec3d

Latest verified live base after PR #80 merge:
018c95b11f5168d27fb93bb3a2cae3859b682627

From this point forward, every GPT session must update handoff/SESSION_LOG.md before ending, and must update handoff/CURRENT_STATE.md whenever the base SHA, active stage, PR status, QA verdict, or next safe action changes.

## Operating model (post-Vercel production setup)

- GitHub is the source of truth.
- Codex is the preferred executor going forward.
- Vercel is the preferred preview provider.
- Browser Agent QA on Vercel production/preview URLs with /app/ appended.
- Do not use the bare root URL except when specifically testing the root redirect.
- Replit only for fresh clean import/preview workspace if proven clean.
- Contaminated Replit main must not be used.

## Timestamp rule

Every handoff update must include a timestamp.

Use:
- UTC timestamp in ISO format: YYYY-MM-DDTHH:MM:SSZ
- user-local date/time when known

Example:

`2026-05-04T17:00:55Z UTC / 2026-05-04 22:30 IST`

A handoff update without a timestamp is incomplete.

## Session learnings rule

Every session log entry must include a section called:

### Session learnings

This section must record anything learned during the session that can prevent future confusion, for example:
- Codespaces preview limitations
- Browser Agent access limitations
- GitHub source-of-truth lessons
- branch hygiene problems
- product/data-honesty clarifications
- prototype/reference decisions
- route/login issues
- validation/build lessons
- UI/QA findings
- what not to repeat

Do not leave important learnings only in chat.

## Regular update rule

The handoff folder must be updated:
- after any PR is created
- after any PR is merged
- after any PR is held
- after Browser Agent QA returns
- after manual QA substitutes for Browser Agent
- after base SHA changes
- after next implementation stage changes
- after any important product/data/prototype decision
- before the GPT session ends

For long sessions, update the handoff folder at meaningful checkpoints rather than waiting until the end.

## End-of-session handoff rule

Before ending a GPT session:
1. Update `handoff/SESSION_LOG.md`.
2. Update `handoff/CURRENT_STATE.md` if material state changed.
3. Create a docs-only PR for handoff updates, unless the update is intentionally deferred and clearly stated.
4. Tell the next GPT session to read the GitHub handoff folder first.
5. Provide the last verified live base SHA, active branch, open PRs, and next safe action. If a docs-only handoff PR just merged, explicitly state that the live base must be re-verified.
6. Do not rely on ChatGPT memory as handoff.

**GitHub is source of truth.**

Every session must verify live GitHub state before implementation:

```bash
git fetch origin
git rev-parse origin/base/approved-thru-437
git status --short
```

## Role model

**GPT:**
- product thinker
- architect
- prompt writer
- auditor
- data-honesty reviewer
- GitHub diff reviewer

**Codex:**
- preferred implementation executor going forward
- creates clean branches from `origin/base/approved-thru-437`
- makes scoped code/doc edits
- opens draft PRs
- reports changed files, validation evidence, PR URL, and preview URL when relevant
- must not merge PRs

**Vercel:**
- preferred public preview provider
- provides stable PR preview URLs for Browser Agent QA
- app is served under `/app/`, so root `/` may 404 depending deployment settings

**Codespaces terminal:**
- fallback repair/manual executor
- useful for docs-only cleanup, emergency branch repair, and validation commands
- not preferred for Browser Agent QA because forwarded URLs can be unreliable

**Browser Agent:**
- visual and click QA only
- not source of truth
- must be grounded back to GitHub diff and validation
- should use Vercel preview URLs when available

**Replit:**
- not trusted as source of truth
- contaminated Replit main must not be used for implementation
- fresh Replit import may be used only if proven clean by branch/head/diff checks

**GitHub:**
- final source of truth
- every PR must be audited there before merge

**User:**
- manually approves and merges PRs

## Required workflow for every future session

1. **Read:**
   - `docs/desktop-graduation-state.md`
   - `handoff/README.md`
   - `handoff/CURRENT_STATE.md`
   - `handoff/NEXT_ACTION.md`
   - `handoff/IMPLEMENTATION_ROADMAP.md`
   - `handoff/DECISION_LOG.md`
   - `handoff/OPEN_QUESTIONS_AND_FOLLOWUPS.md`
   - `handoff/SESSION_LOG.md`
   - `handoff/templates/session-update-template.md`

2. **Verify GitHub:**
   - current live base SHA from GitHub
   - PR states
   - changed files
   - draft/merged state
   - latest head SHA

3. **Confirm current stage.**

4. **Create clean branch** from `origin/base/approved-thru-437` after verifying the live SHA.

5. **Keep changed-file scope narrow.**

6. **Run required validations:**
   ```bash
   pnpm --filter lazytopper exec tsc --noEmit
   NODE_ENV=production BASE_PATH=/app/ pnpm --filter lazytopper run build
   node scripts/verify-production-build.mjs
   git diff --name-only origin/base/approved-thru-437...HEAD
   ```

7. **QA visible work:**
   - Browser Agent if preview is accessible
   - manual human QA if Codespaces preview blocks Browser Agent

8. **GPT audits:**
   - GitHub PR state
   - base SHA verified live from GitHub
   - head SHA
   - changed files
   - source diff
   - validation
   - QA evidence
   - data honesty
   - route behaviour

9. **Classify:**
   - PASS
   - PASS WITH FOLLOW-UP
   - HOLD

10. **Update handoff folder** before ending.

## Handoff file map

- `README.md` - SOP and operating model
- `CURRENT_STATE.md` - latest checkpoint
- `NEXT_ACTION.md` - immediate next task
- `IMPLEMENTATION_ROADMAP.md` - full staged implementation sequence
- `DECISION_LOG.md` - permanent decisions
- `OPEN_QUESTIONS_AND_FOLLOWUPS.md` - unresolved issues
- `SESSION_LOG.md` - timestamped session diary
- `templates/session-update-template.md` - update template

## Preview and QA rule

Preferred preview:
- deployed public preview that does not require Codespaces forwarding

Acceptable:
- Lovable / Vercel / Netlify-style public URL

Fallback:
- Codespaces public forwarded URL + manual human QA

If Browser Agent cannot access Codespaces preview due to certificate, port, forwarding, login, or safe-browsing restrictions, record:

```
INCONCLUSIVE - preview access limitation
```

Do not treat that as product failure unless the LazyTopper app itself loads and fails.

## Data-honesty rules

The product must never claim these unless the real data path exists:

- fake mastery
- fake score
- fake saved progress
- fake weak areas
- fake Mistake Intelligence
- fake generated question content
- fake solution content
- fake AI grading
- fake prediction certainty
- hidden persistence

Also include:
- generated/saved worksheet activity is not mastery
- worksheet attempted is not checked
- checked answer is not mistake logged unless a real checked-evidence path logs it
- trusted wrong MCQ can feed Mistake Intelligence as objective-question mistake evidence after PR #75
- correct MCQ durable attempt history remains deferred until a broader attempt-log model exists
- Show Steps is a model answer / marking guide, not grading of the student's actual work
- Mistake Intelligence and Me / Progress must be based on saved checked evidence only

## Mandatory update moments

Every session must update `handoff/SESSION_LOG.md` and, if needed, `handoff/CURRENT_STATE.md` when:
- PR is created
- PR is merged
- PR is held
- Browser QA returns
- manual QA substitutes for Browser Agent
- base SHA changes
- next stage changes
- prototype/reference rule changes
- environment issue is discovered
- data-honesty rule is clarified
- session is ending

## WAVE STATE DOCS — LIFECYCLE

`handoff/WAVE_STATE_<WAVE>_LIVE.md` is the controller's working state for an OPEN wave.
It is untracked by design: it churns every pass and would bury the diff.

**On wave close, before opening the next wave:**

1. Copy `WAVE_STATE_<WAVE>_LIVE.md` to `WAVE_STATE_<WAVE>_ARCHIVE.md`.
2. Commit the ARCHIVE in the wave's closing docs PR.
3. Verify it landed by content on trunk, THEN delete the local `_LIVE`.

**The `_LIVE` file is the ONLY copy until step 2 lands.** It is not backed up, not on a
remote, and not recoverable if the disk fails. A wave that opens before the previous
wave's ARCHIVE is on trunk has put unrecoverable state at risk.

Waves 4 and 5A stalled at step 1 and stayed laptop-only until this commit. Nothing in
this README had ever stated the rule, which is how that happened.
