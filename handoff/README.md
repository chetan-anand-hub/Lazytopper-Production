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

Current confirmed base:
```
5a1bab9badb451b95d1d00a344421d5965f691c3
```

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

**Codespaces terminal:**
- default implementation method
- branch creation
- file edits
- validation
- PR creation

**Browser Agent:**
- visual and click QA only
- not source of truth
- must be grounded back to GitHub diff and validation

**Codex:**
- installed and signed in
- not the main executor yet
- can be used only when explicitly approved, usually for read-only review, risk checking, or test suggestion

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
   - `handoff/SESSION_LOG.md`

2. **Verify GitHub:**
   - current base SHA
   - PR states
   - changed files
   - draft/merged state
   - latest head SHA

3. **Confirm current stage.**

4. **Create clean branch** from `origin/base/approved-thru-437`.

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
   - base SHA
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
