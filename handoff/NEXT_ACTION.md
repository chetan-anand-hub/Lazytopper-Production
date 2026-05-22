# LazyTopper Next Action

Timestamp: 2026-05-22T00:00:00Z UTC

## Current State

PR #100 is OPEN — awaiting merge into `base/approved-thru-437`.
Branch: `content/wire-ncert-exemplar-science-ch1-7` @ `519b65123a8d2e9ba5f35d76624cf7c5b81fb0d3`
Base before merge (origin/base/approved-thru-437): `6a70889f3dfaadd5c33c3fa410f360036fd69a19`

## IMMEDIATE — after PR #100 merges:

1. **Update deletionGuard.test.ts** — 3 assertions need updating:
   - `deletedSubtopicKeywords.length === 0`  →  `=== 6`
   - `isMathsDeletedFor2026_27("Statistics", "Ogive") === false`  →  `=== true`
   - Any other assertion assuming no Maths deletions → flip to new doctrine
   File: `scripts/src/deletionGuard.test.ts` lines 110-130
   Effort: S (Low mode agent, ~5 min)
   Branch: `fix/deletion-guard-tests` (create from base after PR #100 merges)

2. **Science chapters 8-13 extraction**
   Branch: `content/question-bank-expansion-02` (already exists, clean, HEAD = `6a70889f3dfaadd5c33c3fa410f360036fd69a19`)
   Topics:
   - Ch8: Heredity → topicKey: `heredity-and-evolution` (skip Evolution subtopics: Darwin, natural selection, fossils, speciation, origin of life)
   - Ch9: Light → topicKey: `light-reflection-and-refraction-incl-human-eye-prism`
   - Ch10: Human Eye → same topicKey as Ch9, ID prefix: `EYE-NCERT-10-*`
   - Ch11: Electricity → topicKey: `electricity`
   - Ch12: Magnetic Effects → topicKey: `magnetic-effects-of-electric-current`
   - Ch13: Our Environment → topicKey: `our-environment`
     NOTE: use `jeep115.pdf` for exemplar (not `jeep113`)
   Source PDFs: `C:\Users\Chetan\OneDrive\Desktop\diff\cbse-papers\gdrive\`
   After extraction: register new files in `canonicalQuestionBank.ts` (same pattern as PR #100)
   Effort: High mode agent

3. **Maths chapters 1-14 extraction**
   Branch: `content/question-bank-expansion-03` (create from base AFTER Science 8-13 PR merges)
   Skip: Constructions chapter entirely
   Skip subtopics: Frustum of cone, Ex 6.4 area-ratio theorem, Ogive construction, Euclid's Division Lemma proof
   Effort: High mode agent

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
