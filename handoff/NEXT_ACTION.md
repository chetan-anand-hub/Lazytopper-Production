# LazyTopper Next Action

Timestamp: 2026-05-22T00:00:00Z UTC

## Current State

PRs #101 and #102 are MERGED into `base/approved-thru-437`.
Live base SHA: `56ce39bd88200abf196827e54a3d4feeb191237f` (PR #102 merge commit)
Predecessor base SHAs: `f88f742a5b30e9e34d4020345d70a611862b01d3` (PR #101 merge) and `443a913…` (PR #100 merge).

## IMMEDIATE — now in progress:

1. **Fix `deletionGuard.test.ts`** (3 broken assertions from PR #102 syllabus guard patch)
   File: `scripts/src/deletionGuard.test.ts` lines 110-130
   Changes needed:
   - `deletedSubtopicKeywords.length === 0`  →  `=== 6`
   - `isMathsDeletedFor2026_27("Statistics", "Ogive") === false`  →  `true`
   - Any assertion assuming no Maths deletions → flip to new doctrine
   Branch: `fix/deletion-guard-tests`
   Effort: S (Low mode)

2. **Science chapters 8-13 extraction (IN PROGRESS TODAY)**
   Branch: `content/question-bank-expansion-02`
   IMPORTANT: rebase this branch onto current base before starting:
   ```
   git checkout content/question-bank-expansion-02
   git rebase origin/base/approved-thru-437
   git rev-parse HEAD  (must be 56ce39bd…)
   ```

   Chapters and file names:

   **Ch 8 — Heredity** → `heredity.ncert.ts` + `heredity.exemplar.ts`
   - topicKey: `"heredity-and-evolution"`
   - Skip: all Evolution subtopics (Darwin, natural selection, fossils, speciation, origin of life, acquired traits)
   - Keep: Mendel's laws, inheritance, variation, sex determination
   - ID prefix: `HERED-NCERT-8-` / `HERED-EXMPLR-8-`
   - Source: `jesc108.pdf` (use `pdfplumber` — `pypdf` has decompression errors)
   - Exemplar: `jeep108.pdf`

   **Ch 9 — Light: Reflection and Refraction** → `light.ncert.ts` + `light.exemplar.ts`
   - topicKey: `"light-reflection-and-refraction-incl-human-eye-prism"`
   - ID prefix: `LIGHT-NCERT-9-` / `LIGHT-EXMPLR-9-`
   - Source: `jesc109.pdf` (try gdrive copy first)
   - Exemplar: `jeep109.pdf`

   **Ch 10 — Human Eye and Colourful World** → `humanEye.ncert.ts` + `humanEye.exemplar.ts`
   - topicKey: `"light-reflection-and-refraction-incl-human-eye-prism"` (SAME topicKey as Ch 9 — different ID prefix only)
   - ID prefix: `EYE-NCERT-10-` / `EYE-EXMPLR-10-`
   - Source: `jesc110.pdf`
   - Exemplar: `jeep110.pdf`

   **Ch 11 — Electricity** → `electricity.ncert.ts` + `electricity.exemplar.ts`
   - topicKey: `"electricity"`
   - ID prefix: `ELEC-NCERT-11-` / `ELEC-EXMPLR-11-`
   - Source: `jesc111.pdf`
   - Exemplar: `jeep111.pdf`

   **Ch 12 — Magnetic Effects of Electric Current** → `magneticEffects.ncert.ts` + `magneticEffects.exemplar.ts`
   - topicKey: `"magnetic-effects-of-electric-current"`
   - ID prefix: `MAG-NCERT-12-` / `MAG-EXMPLR-12-`
   - Source: `jesc112.pdf`
   - Exemplar: `jeep112.pdf`

   **Ch 13 — Our Environment** → `ourEnvironment.ncert.ts` + `ourEnvironment.exemplar.ts`
   - topicKey: `"our-environment"`
   - ID prefix: `ENV-NCERT-13-` / `ENV-EXMPLR-13-`
   - Source: `jesc113.pdf`
   - Exemplar: `jeep115.pdf` (NOT `jeep113` — verified)

   After extraction: register all new files in `canonicalQuestionBank.ts` (same pattern as PR #102 — 12 new imports + 12 new spreads).

   Effort: High mode agent

3. **Maths chapters 1-14 extraction**
   Branch: `content/question-bank-expansion-03`
   Create from base AFTER Science 8-13 PR merges.
   Skip entirely: Constructions chapter
   Skip subtopics: Frustum of cone, Ex 6.4 area-ratio theorem, Ogive construction, Euclid's Division Lemma proof
   Source PDFs: `C:\Users\Chetan\OneDrive\Desktop\diff\cbse-papers\gdrive\Class X\Maths\ebooks\Maths01.pdf` through `Maths15.pdf`
   Exemplar PDFs: `jeep201.pdf` through `jeep215.pdf` (skip `jeep211`)
   Special case: `jeep212.pdf` not in gdrive — use `ncert books` path
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
