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

Latest verified live base after PR #73 merge:
```
39861a455dd9728dea70924e8e9dea6575bf1208
```

Important:
The live base can advance after docs-only handoff PRs. Future sessions must verify `origin/base/approved-thru-437` directly before implementation.

## Operating model (post-Vercel production setup)

- GitHub is the source of truth.
- Codex is the preferred executor going forward.
- Vercel is the preferred preview provider.
- Browser Agent QA on Vercel production/preview URLs with /app/ appended.
- Do not use the bare root URL except when specifically testing the root redirect.
- Replit only for fresh clean import/preview workspace if proven clean.
- Contaminated Replit main must not be used.

## Current activation status

The handoff folder became active after PR #54 merged into base/approved-thru-437.

Current activation merge commit:
39861a455dd9728dea70924e8e9dea6575bf1208

From this point forward, every GPT session must update handoff/SESSION_LOG.md before ending, and must update handoff/CURRENT_STATE.md whenever the base SHA, active stage, PR status, QA verdict, or next safe action changes.

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

- `README.md` — SOP and operating model
- `CURRENT_STATE.md` — latest checkpoint
- `NEXT_ACTION.md` — immediate next task
- `IMPLEMENTATION_ROADMAP.md` — full staged implementation sequence
- `DECISION_LOG.md` — permanent decisions
- `OPEN_QUESTIONS_AND_FOLLOWUPS.md` — unresolved issues
- `SESSION_LOG.md` — timestamped session diary
- `templates/session-update-template.md` — update template

## Preview and QA rule

Preferred preview:
- deployed public preview that does not require Codespaces forwarding

Acceptable:
- Lovable / Vercel / Netlify-style public URL

Fallback:
- Codespaces public forwarded URL + manual human QA

If Browser Agent cannot access Codespaces preview due to certificate, port, forwarding, login, or safe-browsing restrictions, record:

```
INCONCLUSIVE — preview access limitation
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
- checked answer is not mistake logged unless the real Check & Improve path logs it
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
