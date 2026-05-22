# LazyTopper Next Action

Timestamp: 2026-05-22T20:00:00Z UTC

## Current State

PR #104 (Science ch8-12 NCERT+Exemplar extraction + engine registration) is **OPEN** on `content/question-bank-expansion-02`.
Branch tip SHA: `83c92893a246cc7eee8221be000957bfa2054b22`
Parent base SHA: `63a015756c45007de035c35616fb2571c5daa60e` (post-PR #103).

PRs #100, #101, #102, #103 are MERGED into `base/approved-thru-437`.

## IMMEDIATE:

1. **Merge PR #104** (Science ch8-12 extraction)
   Branch: `content/question-bank-expansion-02`
   Commit: `83c92893a246cc7eee8221be000957bfa2054b22`
   296 new questions; all validations PASS; engine reachability 5/5 PASS.
   Recommended owner spot-checks before merge: Electricity numericals, Heredity Punnett squares, `light.exemplar.ts` vs `jeep110.pdf` (fabrication incident — see `OPEN_QUESTIONS_AND_FOLLOWUPS.md`).

2. **Fix `deletionGuard.test.ts`** (3 broken assertions from PR #102 syllabus guard patch)
   File: `scripts/src/deletionGuard.test.ts` lines 110-130
   Changes needed:
   - `deletedSubtopicKeywords.length === 0`  →  `=== 6`
   - `isMathsDeletedFor2026_27("Statistics", "Ogive") === false`  →  `true`
   - Any assertion assuming no Maths deletions → flip to new doctrine
   Branch: `fix/deletion-guard-tests`
   Effort: **Low mode**

3. **Maths chapters 1-14 extraction**
   Branch: `content/question-bank-expansion-03`
   Create from base **AFTER PR #104 merges** (must rebase onto the new merge SHA).
   Skip entirely: Constructions chapter
   Skip subtopics: Frustum of cone, Ex 6.4 area-ratio theorem, Ogive construction, Euclid's Division Lemma proof
   Source PDFs: `C:\Users\Chetan\OneDrive\Desktop\diff\cbse-papers\gdrive\Class X\Maths\ebooks\Maths01.pdf` through `Maths15.pdf`
   Exemplar PDFs: `jeep201.pdf` through `jeep215.pdf` (skip `jeep211`)
   Special case: `jeep212.pdf` not in gdrive — use `ncert books` path
   Lesson from PR #104: verify each Exemplar PDF header matches the expected chapter title before extracting (Exemplar uses old CBSE numbering; NCERT uses new numbering).
   Effort: **High mode** agent

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
