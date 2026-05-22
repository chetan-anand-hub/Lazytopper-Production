# LazyTopper Next Action

Timestamp: 2026-05-22T23:00:00Z UTC

## Current State

PRs #100, #101, #102, #103, #105, #106 are MERGED into `base/approved-thru-437`.
Live base SHA: `dfbf725a362b11a4113ec63f4ecebbaa792848a3` (PR #106 merge commit).

Science extraction COMPLETE:
- Ch 1-7: 608 questions (PRs #98, #102)
- Ch 8-12: 296 questions (PR #106)
- Ch 13 Our Environment: deleted from CBSE 2026-27 — not extracted
- Total Science NCERT+Exemplar in engine: **904 questions**

## IMMEDIATE:

1. **Fix `deletionGuard.test.ts`** — 3 broken assertions from PR #102
   File: `scripts/src/deletionGuard.test.ts` lines 110-130
   Changes:
   - `deletedSubtopicKeywords.length === 0`  →  `=== 6`
   - `isMathsDeletedFor2026_27("Statistics", "Ogive") === false`  →  `true`
   - Any assertion assuming no Maths deletions → flip to new doctrine
   Branch: `fix/deletion-guard-tests`
   Effort: **Low mode**

2. **Maths ch1-14 extraction**
   Branch: `content/question-bank-expansion-03`
   Create from `base/approved-thru-437 @ dfbf725a362b11a4113ec63f4ecebbaa792848a3`
   Source: `C:\Users\Chetan\OneDrive\Desktop\diff\cbse-papers\gdrive\Class X\Maths\`
   Effort: **High mode**

   IMPORTANT before starting:
   - Read `lazytopper/src/lib/desktop/topics.ts` to verify ALL Maths slugs (do not trust the original task prompt — PR #106 revealed prompt slugs can be wrong)
   - Skip Constructions chapter entirely
   - Skip subtopics: Frustum, Ex 6.4 area-ratio, Ogive construction, Euclid's Division Lemma proof
   - Verify each Exemplar PDF header matches the expected chapter title before extracting (lesson from PR #106: Exemplar PDFs use old CBSE numbering while NCERT uses new numbering)

## Data-Honesty Guardrails

- LazyTopper is browse-first and action-gated.
- Public landing is frozen from PR #80.
- Landing has one primary CTA only: Explore.
- No Start free trial on landing.
- No Explore as Guest on landing.
- No real-app guest mode.
- No fake local session or fake user.
- Browse mode is for product inspection only and must not create learner data.
- Every real learner should authenticate before real learning actions.
- Signing in is required to save attempts, progress, mistakes, checked answers, and Mistake Intelligence.
- No fake progress, mastery, score, weak areas, premium, payment, or Mistake Intelligence.
- Practice Level-3 visual design from PR #73 remains approved/frozen.
- Preserve PR #77 route-context behavior and source/returnTo navigation.

## Active Follow-ups (post-launch / parallel work)

- Production launch still requires Clerk production instance / `pk_live` env configuration.
- Before public launch, capture Vercel/production Login screenshot with production Clerk config.
- External Google/Clerk continuation screens remain outside app UI control.
- Pricing visual redesign remains pending.
- `/profile` direct-reference cleanup remains pending.
- Payment gateway / GPay / UPI QR / Razorpay/Cashfree is deferred and must be server/admin verified.
- CI syllabus guard not enforced in GitHub Actions (both workflows use npm; root preinstall rejects npm). Fix by switching workflow yml files to pnpm.

## Operating Model

- Claude Code (Opus 4.7) is the primary implementation executor.
- Owner uses VS Code PowerShell for commit, push, and PR creation/update unless explicitly overridden.
- GitHub live state always wins over docs and memory.

## PR #69 / K2D Separation Rule

PR #69 / K2D remains separate from this handoff sequence.
- Do not merge PR #69 blindly or automatically.
- Do not absorb K2D into K2H without explicit audit and product owner approval.
- Each PR must be audited and validated independently before merge.
