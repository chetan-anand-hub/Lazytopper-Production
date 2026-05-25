## 2026-05-25 — Post-PR #126 (P2 APQ Maths PQ1+PQ2) open items

### RESOLVED — P2 APQ Maths PQ1+PQ2 extraction (PR #126)
13 new `.additionalPQ.ts` files (one per Maths topic) created with 76 questions
combined from Mathematics-PQ1.pdf + Mathematics-PQ2.pdf. All 13 retained Maths
topicKeys covered. Anti-fabrication maintained; isPYQ false on all 76; pyqSet
omitted; Section E case-based as one row marks=4. Authentic count 1,717 → 1,793.

### LOCKED — Pack retirement threshold REVISED (4,500 from 6,000)
New decision in PR #126 cycle. Rationale: 5,000+ authentic is sufficient for
CBSE Class 10 prep. At 4,500 authentic, retire all AI packs (~2,815 Qs). Bank
becomes 100% authentic + 100% routable. No OCR phase needed.
Current progress: 1,793 / 4,500 = 39.8%.

### LOCKED — REQUIRES-FIGURE doctrine (PR #126)
Questions referencing PDF diagrams/tables/graphs that don't render in text
tag with `strategyHint: "REQUIRES-FIGURE: [description]"`. ~22 questions in
PR #126 carry this tag. Resolution path: Option B (placeholder image) at
launch, Option A (SVG render) post-launch.

### OPEN — REQUIRES-FIGURE backlog (LOW, post-launch resolution)
~22 Maths APQ questions in PR #126 + likely many more in upcoming Science APQ
extraction. Plan: enumerate post-launch, batch-resolve via either placeholder
images (faster) or SVG renders (higher quality). Track in a dedicated
follow-up issue when count grows.

### OPEN — B/C/D/E density gap (MEDIUM, doctrine-blocking)
Section A (MCQ/AR) over-represented across all extractions to date. PR #126
showed 40:36 A:non-A split. Future extractions MUST extract BOTH OR variants
for B/C/D/E sections to double non-MCQ density. Bake into all future
extraction agent instructions starting with P2 APQ continuation
(PQ_2022 + Science).

### OPEN — AR (Assertion-Reasoning) density gap (MEDIUM, post-P2-APQ)
AR coverage thin across all extractions. Dedicated `.assertionReasoning.ts`
extraction pass scheduled after P2 APQ completes. Target: 2-3 AR questions
per topic for both Maths and Science. Source: NCERT/Exemplar/APQ/SQP PDFs
with AR coverage we haven't extracted yet.

### OPEN — Our Environment has 0 questions in the question bank (LOW, needs extraction)
Unchanged since PR #124. Our Environment chapter is in scope (Unit V, 5 marks);
topicKey `our-environment` is registered in topics.ts; but question bank has
0 questions tagged to this topicKey. Needs future content extraction covering
food chains, trophic levels, ecosystem interactions, pollution, waste management.

### OPEN — K2H-8f PYQ engine filter (MEDIUM, pre-condition for P5)
Unchanged. `practiceSetGenerator.ts` does not bias pool toward `pyqYear`-tagged
questions; PYQ filter returns 0 results when `pyqOnly===true`. Must fix before
P5 PYQ extraction. Branch: `fix/pyq-engine-bias` | Mode: Medium.

### OPEN — pyqSet format inconsistency (LOW, carry forward)
Unchanged. Some AR files use full CBSE set codes (e.g. "30/1/1") in pyqSet
rather than the short form ("1"|"2"|"3"). Non-blocking — field is string |
undefined. Normalise during P5 cleanup pass.

### OPEN — .claude/ folder not in .gitignore (LOW)
Unchanged. Untracked .claude/ shows in every `git status`. Add to .gitignore
in a future docs-only PR. Do NOT stage it for any commit.

### OPEN — Clerk pk_live production key (unknown status)
Unchanged. No production Clerk instance configured. Pre-requisite for public launch.

### OPEN — API gateway / vercel rewrite for /api/* (no branch in progress)
Unchanged. AI features return 404 in production because vercel.json has no
/api/* rewrite.

---

## 2026-05-24 — Post syllabusGuard 2026-27 doctrine fix (PR #124) open items

### RESOLVED — syllabusGuard incorrectly banned Our Environment subtopics (PR #124)
14 Our Environment ecology strings (Our Environment, Ecosystem, Food Chain,
Food Web, Biodegradable, Non-Biodegradable, Ozone Depletion, Ozone Layer,
Biological Magnification, Energy Flow, Trophic Levels, Trophic Level, Waste
Management, Environmental Problems) removed from Science banned list. Our
Environment is RETAINED in 2026-27 (Unit V, 5 marks, ecology scope).

### RESOLVED — syllabusGuard incorrectly banned Contraception/STDs (PR #124)
12 reproductive-health strings (Reproductive Health, Contraception, Family
Planning, STI, STDs, Sexually Transmitted Infections/Diseases, Barrier
Contraception, Contraception Methods, Reasons for Contraception,
Contraceptive Methods, Birth Control Methods) removed from Science banned
list. Reproductive health is RETAINED in 2026-27 (Ch 8 board scope).

### RESOLVED — 18 reproduction questions wrongly removed in PR #121 (PR #124)
All 18 questions restored from git history at pre-PR #121 commit `0222917e`.
Subtopics retagged to 2026-27-compliant values:
  - "Safe Sex and HIV/AIDS" for STD/HIV/safe-sex content
  - "Family Planning" for contraception/family-planning content
  - "Reproductive Health" for general reproductive-health content

### RESOLVED — Motor/Generator/EMI not tracked in archetypes (PR #124)
New `SCIENCE_DELETED_CHAPTERS_2026_27.formativeOnlyTopics` array added with
["Electric Motor", "Electromagnetic Induction", "Electric Generator"]. These
topics are taught in 2026-27 but not assessed in the year-end board exam
(Science_SecP1_2026-27.pdf Note for Teachers). Tracked in the prediction
engine; NOT banned in question bank (preserves the 36 formative practice
questions in magneticEffects.exemplar/pack1/pack2).

### RESOLVED — Sources of Energy doctrine cleanup (PR #124)
Sources of Energy was previously matched only as a subtopic-keyword fallback
under Our Environment. PR #124 promoted it to a proper `deletedTopics` entry
in cbseHistoricalArchetypes (Ch 14 is fully deleted from board scope). The
subtopic-keyword fallback was retained as a belt-and-suspenders measure for
any legacy questions still tagged with topic="Our Environment".

### OPEN — Our Environment has 0 questions in the question bank (LOW, needs extraction)
Our Environment chapter is in scope (Unit V, 5 marks), the topicKey
`our-environment` is registered in topics.ts with weight 4, but the question
bank currently has 0 questions tagged to this topicKey. Needs future content
extraction (NCERT Ch 13 of the new numbering, or Ch 15 of legacy numbering)
covering food chains, trophic levels, ecosystem interactions, pollution, and
waste management.

### OPEN — K2H-8f PYQ engine filter (MEDIUM, pre-condition for P5)
Unchanged. `practiceSetGenerator.ts` does not bias pool toward `pyqYear`-tagged
questions; PYQ filter returns 0 results when `pyqOnly===true`. Must fix before
P5 PYQ extraction. Branch: `fix/pyq-engine-bias` | Mode: Medium.

### OPEN — pyqSet format inconsistency (LOW, carry forward)
Unchanged. Some AR files use full CBSE set codes (e.g. "30/1/1") in pyqSet
rather than the short form ("1"|"2"|"3"). Non-blocking — field is string |
undefined. Normalise during P5 cleanup pass.

### OPEN — .claude/ folder not in .gitignore (LOW)
Unchanged. Untracked .claude/ shows in every `git status`. Add to .gitignore
in a future docs-only PR. Do NOT stage it for any commit.

### OPEN — Clerk pk_live production key (unknown status)
Unchanged. No production Clerk instance configured. Pre-requisite for public
launch.

### OPEN — API gateway / vercel rewrite for /api/* (no branch in progress)
Unchanged. AI features return 404 in production because vercel.json has no
/api/* rewrite.

---

## 2026-05-24 — Post-PR #121 open items

### RESOLVED — Reproduction bank syllabusGuard violations (PR #121)
The long-running V1 validation failure carried across PRs #117, #119, #120 is now fixed.
Removed 18 questions across the 3 reproduction banks (4 exemplar + 3 ncert + 11 pack2)
covering deleted Ch8 sub-topics (Reproductive Health, Contraception, STDs).

### RESOLVED — syllabusGuard compound-variant gap (PR #121)
3 questions used compound subtopics ("Barrier Contraception", "Contraception Methods",
"Reasons for Contraception") that slipped past the exact-match guard despite being
entirely about banned topics. Guard extended with these 5 strings (3 actual + 2 defensive
forward-looking variants: "Contraceptive Methods", "Birth Control Methods").

### RESOLVED — Reproduction bank regression coverage (PR #121)
35-test regression suite added at `scripts/src/reproductionBankGuard.test.ts`
(banned variants flagged + retained subtopics clean + substring safety +
multi-banned counted + repo-file regression lock). Wired into both `test:reproduction`
standalone and `test:matrix:all` (now 3 test files, 74 tests total).

### OPEN — ops/ acceptance test: Our Environment chapter assertion (MEDIUM, carry forward)
Unchanged since PR #117. `lazytopper/scripts/ops/cbse_registry_2026_27_acceptance.mjs`
(lines 26-30 EXCLUDED_CHAPTER_TITLES; lines 208-218 our_environment_chapter_present_in_scope
assertion) and `lazytopper/scripts/ops/science_deleted_zeroing_acceptance.ts` (lines 226-249
"food chains under Our Environment NOT zeroed") still contradict the doctrine that
Our Environment is fully deleted per CBSE 2025-26. Now the highest-priority follow-up.

### OPEN — K2H-8f PYQ engine filter (MEDIUM, pre-condition for P5)
Unchanged. `practiceSetGenerator.ts` does not bias pool toward `pyqYear`-tagged questions;
PYQ filter returns 0 results when `pyqOnly===true`. Must fix before P5 PYQ extraction.
Branch: `fix/pyq-engine-bias` | Mode: Medium.

### OPEN — pyqSet format inconsistency (LOW, carry forward)
Unchanged. Some AR files use full CBSE set codes (e.g. "30/1/1") in pyqSet rather than
the short form ("1"|"2"|"3"). Non-blocking — field is string | undefined. Normalise
during P5 cleanup pass.

### OPEN — .claude/ folder not in .gitignore (LOW)
Unchanged. Untracked .claude/ shows in every `git status`. Add to .gitignore in a future
docs-only PR. Do NOT stage it for any commit.

### OPEN — Clerk pk_live production key (unknown status)
No production Clerk instance configured. Pre-requisite for public launch.

### OPEN — API gateway / vercel rewrite for /api/* (no branch in progress)
AI features return 404 in production because vercel.json has no /api/* rewrite.

---

## 2026-05-23 — Post-PR #114 open items

### OPEN — Mojibake in P0.5 case-based + circles proof files (HIGH priority, UI render broken)
Files affected:
  lazytopper/src/data/questionBanks/class10/maths/maths.caseBased.ts
  lazytopper/src/data/questionBanks/class10/science/science.caseBased.ts
  lazytopper/src/data/questionBanks/class10/maths/circles.proof.ts
Symptom: UTF-8 multibyte sequences rendered as Latin-1 garbage in questionText,
solutionSteps, answer, finalAnswer, explanation, strategyHint. Examples:
`â–³` (should be `△`), `âˆ¥` (`∥`), `âˆš` (`√`), `Â²` (`²`), `Î©` (`Ω`),
`â‚‚` (`₂`), `â†’` (`→`), `Â°` (`°`), `âˆ ` (`∠`), `â‚¹` (`₹`).
Origin: inherited from diff/ source pack files; not introduced by P0.5 merge script.
Action: PRE-P1 byte-level replacement pass. Branch `content/fix-p05-symbol-restoration`,
Low mode, data-only, ~30 min. Must merge BEFORE P1-M (Practise Papers extraction will
produce the same class of garbage if the recipe isn't established first).
Reference: NEXT_ACTION.md has the full replacement table.

### OPEN — pyqSet format inconsistency (LOW priority, carries forward from PR #112)
Still applies. The P0.5 case-based + circles proof files also use full CBSE set codes
(e.g. "30/1/1") in pyqSet rather than the short form ("1"|"2"|"3") that will be used
in P5 PYQ extraction. Non-blocking — field is string | undefined. Normalise during P5
cleanup pass across:
  triangles.assertionReasoning.ts, trigonometry.assertionReasoning.ts (P0)
  triangles.proof.ts, trigonometry.proof.ts (P0)
  science.assertionReasoning.ts (P0)
  maths.caseBased.ts, science.caseBased.ts, circles.proof.ts (P0.5)

### OPEN — K2H-8f PYQ engine filter (MEDIUM priority, pre-condition for P5)
Unchanged from post-PR #112. practiceSetGenerator.ts does not bias pool toward
pyqYear-tagged questions; PYQ filter returns 0 results when pyqOnly===true.
Must fix before P5 PYQ extraction. Branch: fix/pyq-engine-bias | Mode: Medium.

### OPEN — .claude/ folder not in .gitignore (LOW priority)
Unchanged. Add to .gitignore in a future docs-only PR. Do NOT stage it for any commit.

### RESOLVED — P0.5 pack registration (PR #114)
21 questions registered from 3 diff/ pack files:
  maths.caseBased.ts: 6 Section E case sets (4 marks each; merged from 18 split sub-rows)
  science.caseBased.ts: 5 Section E case sets (4 marks each; merged from 15 split sub-rows)
  circles.proof.ts: 10 (5 Section C Short 3-mark + 5 Section D Long 5-mark)
topicKey normalisation complete (8 keys across 3 files).
"format": "Proof" → "Short"/"Long" applied to circles.proof.ts only (case-based files
use format="Case-Based" which is valid).
Mid-flight V2 blocker (33 mark/section mismatches) resolved via Option 2 restructure:
each split 3-row case set merged into one 4-mark Section E row. Owner-directed.
All 6 validations PASS. Merged as PR #114.
Authentic total: 1,609 → 1,630.

---

## 2026-05-23 — Post-PR #112 open items

### OPEN — P0.5 probe pending (LOW priority, quick win)
Three diff/ pack files not yet probed or registered:
  maths_case_based_pack.ts (~23.8 KB)
  science_case_based_pack.ts (~24.8 KB)
  circles_proof_pack.ts (~18.5 KB)
Expected pattern: same topicKey title-case issue as P0. Same fix.
Expected yield: ~30-80 questions (Section E case-based + circles proofs).
Action: Low mode agent, branch content/register-diff-packs-p05.

### OPEN — K2H-8f PYQ engine filter (MEDIUM priority, pre-condition for P5)
practiceSetGenerator.ts does not bias pool toward pyqYear-tagged questions.
PYQ filter returns 0 results when pyqOnly===true.
Must fix before P5 PYQ extraction — otherwise PYQ questions won't surface
via the PYQ filter even after extraction.
Branch: fix/pyq-engine-bias | Mode: Medium

### OPEN — pyqSet format inconsistency (LOW priority, cleanup)
AR files registered in PR #112 use full CBSE set codes ("30/1/1") in pyqSet
rather than the short form ("1"|"2"|"3") that will be used in P5 PYQ extraction.
Non-blocking — field is string | undefined. Normalise during P5 cleanup pass.
Files: triangles.assertionReasoning.ts, trigonometry.assertionReasoning.ts

### OPEN — .claude/ folder not in .gitignore (LOW priority)
The .claude/ IDE state folder is untracked (shows in git status).
Add to .gitignore in a future docs-only PR.
Do NOT stage it for any content commit.

### RESOLVED — Pass 1C gdrive unprobed folders
All 6 unprobed gdrive subfolders assessed. Key findings:
  Science/Chapter-wise/: ~1,422 net new Qs — added as P4b to extraction queue
  cbse-papers/PYQ/: 26 READY papers, ~784 net new Qs
  Science/NCERT Examplers 2020/: 100% duplicate — permanently skip
  misc/: English literature only — permanently skip
  Maths/PYQs/: all Basic — permanently skip
  Sample+Preboard: ~199 PDF-extractable Qs — added as P6

### RESOLVED — P0 pack registration (PR #112)
62 questions registered from 4 diff/ pack files.
topicKey normalisation complete.
"format": "Proof" schema issue found and fixed (→ "Short"/"Long").
All 6 validations PASS. Merged as PR #112.

## 2026-05-23 — Post-PR #109 open items

### OPEN — Pack quality audit required (HIGH)
~2,470 existing pack1/pack2/pack3 questions are AI-generated without
source PDF verification. quality-assessment-report.md (in diff folder)
has full details. Decision needed: keep/fix/replace strategy.

### OPEN — PYQ extraction pending
87 text-extractable CBSE papers available (2023/2024/2025).
extraction-report.md documents 220 Triangles+Trig questions already
extracted with symbol stripping issues.
Separate sessions needed: Maths PYQ + Science PYQ.

### OPEN — assertion_reason_pack.ts not yet registered
File exists at C:\Users\Chetan\OneDrive\Desktop\diff\assertion_reason_pack.ts
Needs schema validation and canonicalQuestionBank.ts registration.

### OPEN — K2H-8f PYQ filter engine fix
practiceSetGenerator.ts does not bias pool toward pyqYear questions.
PYQ filter returns 0 results. Fix after PYQ extraction completes.

### RESOLVED — Maths ch1-14 NCERT+Exemplar extraction
643 questions across 26 files. All wired into engine. PR #109 merged.

### RESOLVED — PR #108 deletionGuard test fix
3 broken assertions fixed. All 29 tests passing.

---

## 2026-05-22 — PR #106 follow-ups

### OPEN — Spot-check Science ch8-12 question accuracy

Verify 10-15 random questions especially:
- Electricity numericals (`electricity.ncert.ts`, `electricity.exemplar.ts`) — solutionSteps accuracy, units, sign convention
- Heredity Punnett squares (`heredity.ncert.ts`, `heredity.exemplar.ts`) — genotype/phenotype ratios
- `light.exemplar.ts` against `jeep110.pdf` (fabrication incident — re-extracted from correct PDF, but extra eyeball wise)
Priority: **Medium**

### OPEN — PR numbering correction

Handoff previously recorded Science ch8-12 as PR #104.
Actual GitHub PR numbers: **#106** (content) and **#105** (handoff docs).
Priority: **Low** (documentation only)

### RESOLVED — Science ch8-12 engine extraction

296 questions extracted, wired, and engine-reachability verified.
PRs #105 (docs) and #106 (content) merged. Base SHA: `dfbf725a362b11a4113ec63f4ecebbaa792848a3`.

---

## 2026-05-22 — PR #104 follow-ups

### OPEN — Spot-check Science ch8-12 question accuracy

Owner should verify 10-15 random questions especially:
- Electricity numericals (`electricity.ncert.ts`, `electricity.exemplar.ts`) — solutionSteps accuracy, units, sign convention
- Heredity Punnett squares (`heredity.ncert.ts`, `heredity.exemplar.ts`) — genotype/phenotype ratios
- `light.exemplar.ts` against `jeep110.pdf` (fabrication incident — original agent generated 27 questions from training data before mislabelled source was caught; file deleted and re-extracted from correct PDF, but extra eyeball is wise)
Priority: **Medium** (pre-merge)

### RESOLVED — Science ch8-12 engine extraction

296 questions extracted across 10 files and wired into `canonicalQuestionBank`. All 5 topicMatches() routing simulations pass against actual topics.ts slugs. Engine reachability live-import test: 296/296 PASS.

### RESOLVED — Ch 13 "Our Environment" inclusion question

Confirmed deleted from CBSE 2026-27. Not extracted. Existing legacy `ourEnvironment.pack1.ts` / `.pack2.ts` retained but not added to.

### RESOLVED — Slug mapping in original Ch8-13 prompt

Original prompt proposed `heredity-and-evolution` and a shared `light-reflection-and-refraction-incl-human-eye-prism` slug for Ch9+Ch10. Neither exists in `topics.ts`. Per Rule 2 (use topics.ts verbatim), all new files use the actual canonical slugs: `heredity`, `light-reflection-and-refraction`, `human-eye-and-colourful-world`, `electricity`, `magnetic-effects-of-electric-current`. Engine routes correctly.

---

## 2026-05-22 — PR #101 + #102 follow-ups

### OPEN — `deletionGuard.test.ts` needs updating

3 assertions in `scripts/src/deletionGuard.test.ts` (lines 110-130) now fail after PR #102 populated `MATHS_DELETED_CHAPTERS_2026_27`. Fix in next small PR before any `pnpm test` run.
Priority: **High** (blocks clean CI)

### OPEN — CI not using pnpm (syllabusGuard never runs in CI)

Both GH Actions workflows use npm; root `preinstall` rejects npm. `syllabusGuard` only runs on manual `pnpm build` locally.
Fix: update workflow yml to use pnpm setup + `pnpm build`.
Priority: **Medium** (post-launch)

### RESOLVED — Clerk OAuth 404 on Vercel preview deployments

Fixed by PR #101. `forceRedirectUrl` now uses full absolute URL with BASE_PATH prefix. Verified working on Vercel after merge.

### RESOLVED — 608 Science ch1-7 questions invisible to engine

Fixed by PR #102. All 608 questions now wired into the canonical bank.

### RESOLVED — topicKey mismatch for Control & Coordination and Reproduction

Fixed by PR #102. Both files retagged to canonical `topics.ts` slugs.

### RESOLVED — Maths syllabus guard missing Constructions chapter

Fixed by PR #102. `syllabusGuard.ts` and `cbseHistoricalArchetypes.ts` both updated and now in sync.

---

## 2026-05-22 — PR #100 follow-ups (post engine wiring + topicKey fixes + syllabus guard patch)

### OPEN — Maths question bank empty (no NCERT/Exemplar extraction yet)

All 13 Maths topics have only pack1/pack2/pack3 questions. NCERT + Exemplar extraction pending (`content/question-bank-expansion-03`).
Priority: **High** (pre-launch content depth)

---

## 2026-05-17 - PR #82 Login polish follow-ups and PR-K2H-6 next stage

Status:
Active follow-ups after PR-K2H-5 / PR #82 merge.

Observation:
PR #82 passed validation and owner Vercel preview QA for the production Login gate. Login now better aligns with the frozen landing and Lovable/topic-focus-lite LoginGate visual/composition direction while preserving real Clerk SignIn, reason-aware prompts, redirect priority, safe redirects, no guest CTA, and no app shell/sidebar/bottom nav.

Action:
- Production launch still requires Clerk production instance / `pk_live` env configuration. Do not treat `unsafe_disableDevelopmentModeWarnings` as a substitute for production Clerk configuration.
- Before public launch, capture a Vercel/production Login screenshot with production Clerk config.
- External Google/Clerk continuation screens remain outside app UI control and should not be described as fixed by app UI polish.
- PR-K2H-6 is the recommended next implementation stage: Home/cockpit learning order + Continue repair.
- K2H-6 should make Home/browse cockpit order match Exam Trends -> Practice -> Worksheets -> Check & Improve.
- K2H-6 should repair "Continue where you left off" so it never routes to TopicHub "Topic not found"; if the topic is not curated, hide the continue card or route safely to Practice Hub / Exam Trends with honest state.
- Do not touch landing, Login, pricing, Practice internals, HPQ, or TopicHub content unless a future K2H-6 prompt explicitly scopes it.
- Do not start PR-K2H-6 until this docs-only handoff update is merged.
- Future product prompts must use `base/approved-thru-437 @ 11aac1bc8bce67e6b2d67e540b4295491c0b78e0`.

Parked PRs:
- PR #69 solution provenance / student notices remains open draft and must not be mixed.
- PR #17 diagnostic categories remains open draft preservation-only and must not be mixed.
- Old mobile PRs #1/#2 remain outside the desktop K2H lane unless separately audited.

Operating model:
- Codex should be used for code edits, local validation, screenshots, source diff/report only.
- Owner will use VS Code PowerShell for commit, push, and PR creation/update unless explicitly overridden.
- GPT remains prompt writer, source/PR auditor, and merge recommender.

## 2026-05-16 - PR #80 follow-ups after frozen landing merge

Status:
Active follow-ups after PR-K2H-4 / PR #80 merge.

Observation:
PR #80 passed QA and implemented the frozen landing page plus Explore-first `/browse` entry. Landing should not be redesigned casually. The next highest-priority visible gap is Login visual parity / auth gate polish.

Action:
- Login visual parity / auth gate polish is the recommended next implementation PR. It must keep real Clerk auth, no guest mode, reason/redirect handling, safe redirects, Explore/sign-in funnel behavior, and improve visual match to the calm split login prototype. Do not alter payment/pricing/practice/HPQ in the same PR.
- Clerk friction / auth strategy remains an open product question. Observed flow can include LazyTopper login -> Google account chooser -> Clerk consent/continuation screen -> product. Short-term: polish Login around Clerk. Long-term: evaluate whether Clerk should remain or whether direct Firebase/Google/phone OTP is better for launch. Do not remove Clerk without a dedicated auth architecture PR.
- Home/cockpit card order follow-up remains. Owner noted logical learning order should be Exam Trends -> Practice -> Worksheets -> Check & Improve. Sidebar already better reflects the learning order. Home cards may still need reordering in DesktopHome in a future PR. Do not mix with Login PR unless explicitly approved.
- Pricing visual redesign remains pending. Pricing is functionally safer after PR #78 but visually not aligned with final product grammar.
- Continue where you left off route repair remains pending. It can still route to TopicHub "Topic not found." Future small PR may hide the card when saved topic is not curated, route to Practice Hub/Exam Trends, or map to safe topic slug.
- `/profile` direct-reference cleanup remains pending. PR #78 protects `/profile` via redirect/login handling, but future route-hardening can replace direct `/profile` references with `/me` where appropriate.
- Payment gateway / GPay / UPI QR / Razorpay/Cashfree is deferred and must be server/admin verified. Normal client UI must never mark premium directly.

Landing doctrine after PR #80:
- Public landing is frozen.
- One primary CTA only: Explore.
- No Start free trial on landing.
- No Explore as Guest on landing.
- Explore opens browse mode for product inspection only; it must not create a fake guest learner.
- Real actions remain action-gated through auth/trial gate where already implemented.

## 2026-05-16 - PR #78 QA follow-ups and frozen landing target

Status:
Active follow-ups after PR-K2H-3 / PR #78 merge.

Observation:
PR #78 passed QA with follow-up. Login/auth/session behavior is safer and functionally correct, but visual and route/content polish remains.

Action:
- Login visual parity remains a follow-up. The right-side Clerk/auth panel should be polished while preserving real Clerk auth, reason/redirect behavior, split layout, and no guest CTA.
- Pricing visual redesign remains a follow-up. Pricing is honest but not yet aligned with final LazyTopper product/landing design grammar.
- Home "Continue where you left off" can route to TopicHub "Topic not found"; hide the card when the saved topic is not curated, route to Practice Hub/Exam Trends, or map to a safe topic slug.
- Remaining direct `/profile` references can be cleaned later; PR #78 protects them through `/profile` -> `/me` redirect.
- Payment gateway is parked. Future payment activation must be server/admin verified; client UI must never mark premium directly.

Historical frozen landing page target before PR #80:
- Superseded by PR #80 implementation. Current doctrine is one primary CTA text `Explore`, CTA below the four cards and above Mistake Intelligence, no Start free trial, no Explore as Guest, and no casual redesign unless owner explicitly reopens landing design.
- No left sidebar on landing.
- One primary CTA only: Explore LazyTopper. Historical note: PR #80 final CTA text is `Explore`.
- Top-right secondary CTA: Sign in.
- Hero headline: Study smarter for CBSE Class 10.
- Visual storyboard over wall of text.
- Product loop shown visually: Exam Trends -> Practice -> Check & Improve -> Mistake Intelligence -> Me / Progress.
- Mistake Intelligence is the emotional/product centerpiece.
- Me / Progress is shown as the connected dashboard.
- Final composition uses layout/style/color/CTA/sign-in treatment from final option and card content/story richness from option 7.
- Landing must stay in sync with overall LazyTopper design grammar: deep navy, soft white, green accent, elegant cards, calm premium CBSE Class 10 study cockpit.

## 2026-05-13 - PR #75 merged; post-K2H-1 follow-ups

Status:
Active follow-ups after PR-K2H-1 / PR #75 merge.

Observation:
PR #75 hardened Practice checked-evidence states and allowed trusted wrong MCQ attempts to feed existing mistake-history evidence for eligible signed-in non-local-session learners. It did not add a broad durable attempt-log model, advanced Practice filters, route/context repairs, sign-in/trial enforcement audit, Mock detail finalisation, or HPQ quality repair.

Action:
- Durable answer-attempt model for correct and wrong MCQ attempts.
- Advanced Practice filters: Section A/B/C/D/E, marks, type/family, competency, difficulty, count.
- HPQ -> Build mock -> Back should return to HPQ, not old Exam Trends.
- TopicHub Board Essentials -> Practise this should open context-aware Practice for that exact concept/focus, not generic topic Practice.
- Sign-in/trial enforcement pass across learning surfaces so Firestore-backed Me / Progress and Mistake Intelligence can work reliably.
- Verify generated step-solution cache / `step_solutions` behavior on deployed environment.
- Mock Level-3 detail finalisation.
- HPQ question-bank / solution / diagram / structured-option quality.

Data-honesty rules:
- MCQ click is a real answer attempt.
- Wrong trusted MCQ can feed Mistake Intelligence as objective-question mistake evidence.
- Correct MCQ durable attempt history remains deferred until a broader attempt-log model exists.
- Show Steps is model answer / CBSE-style marking guide, not grading of the student's actual work.
- Check my answer is actual answer checking and richer evidence.
- No fake progress, mastery, score, weak areas, or Mistake Intelligence should be introduced.

PR #69 / K2D warning:
PR #69 / K2D remains separate. Do not merge blindly. Do not absorb into K2H without explicit audit and owner approval.

## 2026-05-12 - PR #73 K2H follow-up seed; superseded by PR #75

Status:
Historical follow-up seed. Current active implementation after PR #75 / PR-K2H-1 is PR-K2H-2 route/context repair.

Observation:
PR #75 / PR-K2H-1 is merged. Next active implementation is PR-K2H-2 route/context repair. PR #75 completed the first checked-evidence hardening slice, but durable Practice evidence, routing, filtering, sign-in/trial, step-solution, Mock, and HPQ quality follow-ups remain.

Action:
- PR-K2H-2 route/context repair:
  - HPQ Build Mock back navigation should return to HPQ, not old Exam Trends.
  - TopicHub Board Essentials -> Practise this should open context-aware Practice for that exact concept/focus, not generic topic Practice.
- Durable MCQ answer-attempt model for correct and wrong attempts.
- Advanced Practice filters: Section A/B/C/D/E, marks, type/family, competency, difficulty, count.
- Sign-in/trial enforcement pass across learning surfaces.
- Verify generated step-solution cache / `step_solutions` behavior on deployed environment.
- Mock Level-3 detail finalisation.
- HPQ question-bank / solution / diagram / structured-option quality.

## 2026-05-08 - PR #72 final GPT audit pending

Status:
Active before PR #72 review/merge.

Observation:
PR #72 has Vercel preview evidence and manual authenticated HPQ QA recorded, but final GPT owner audit of the GitHub diff and scope is still pending.

Action:
Owner should audit PR #72 diff, validation, QA evidence, and changed-file scope before marking ready for review or merge.

## 2026-05-08 - PR #72 HPQ Browser QA auth/paywall blocked; manual QA substituted

Status:
Recorded QA limitation.

Observation:
Browser Agent verified Practice visual grammar, but HPQ / Exam Trends Browser QA was blocked by the Premium Feature interstitial in guest state. Browser Agent cannot complete magic-link authenticated QA. Product owner manually verified HPQ on the Vercel preview while signed in / trial-unlocked.

Action:
Treat HPQ Browser QA as inconclusive due to auth/paywall limitation, not as product failure. Preserve manual QA evidence in handoff and proceed to final GPT audit.

## 2026-05-08 - Practice Level-3 detail finalisation after PR #72

Status:
Next implementation stage after PR #72 merge.

Observation:
PR #72 handles broad Practice + HPQ visual grammar alignment. Practice still needs a detail pass focused on execution/detail states, CTA hierarchy, question interaction, option interactivity if needed, source/return behavior, responsive polish, and honest unavailable states.

Action:
Start Practice detail finalisation after PR #72 is merged and base advancement is verified.

## 2026-05-08 - Mock pages Level-3 detail finalisation after Practice details

Status:
Post-Practice follow-up.

Observation:
Mock builder / mock attempt / mock review pages need Level-3 desktop grammar and clear lifecycle wording.

Action:
Run Mock page detail finalisation after Practice detail stage. Do not claim mock performance feeds Mistake Intelligence until real graded mock evidence exists.

## 2026-05-08 - HPQ question / solution quality later

Status:
Deferred until after Practice and Mock detail stages unless the product owner reprioritises.

Observation:
Manual authenticated QA found remaining HPQ question, solution, diagram, and completeness issues. These are content/data/quality issues, not PR #72 visual grammar issues.

Action:
Sequence this as audit report first, then data-only structured options normalization, then solution/diagram/cache quality repair.

## 2026-05-08 - PR #72 Vercel / Browser QA state

Status:
Active follow-up before PR #72 merge.

Observation:
PR #72 has a Vercel preview at `https://lazytopper-production-desktop-ja96piv2q.vercel.app/app/`. Browser Agent verified Practice visual grammar but could not complete HPQ / Exam Trends QA because guest state hit the Premium Feature interstitial. Product owner manually verified authenticated HPQ on preview.

Action:
Proceed to final GPT owner audit. Do not claim PR #72 is merge-ready until that audit passes.

## 2026-05-08 - Science / Maths HPQ MCQ structured options normalization

Status:
Future data-only PR.

Observation:
Codex read-only Science audit found 29 Science MCQ / AssertionReason items. Structured `options` / `aROptions` exist for 14, and `correctOption` exists for 14. Missing structured option examples include `mnm-hpq-101`, `lp-hpq-101`, `sci-cre-hpq-1`, `sci-abs-hpq-1`, `2026-MNM-01b`, and `sci-light-hpq-1`.

Action:
Create a separate data-only normalization PR for Science and Maths MCQ / Assertion-Reason structured options. Do not invent options in UI and do not modify grading/checking APIs.

## 2026-05-08 - Local gateway and env requirements for HPQ step-solution QA

Status:
Document for future QA.

Observation:
Frontend Vite proxies `/api` to `API_SERVER_PORT`, using `8080` locally. If `dev:gateway` is not running, `/api/step-solution` fails with `ECONNREFUSED`. Running `npx --yes pnpm@10.23.0 run dev:gateway` with `PORT=8080` starts the LazyTopper AI server. Without `DATABASE_URL` and provider API keys, cache/generation may be limited or stubbed.

Action:
Future local QA for HPQ solution logic must start both frontend and backend gateway and must not treat missing local env as production proof.

## 2026-05-08 - Mock grading to Mistake Intelligence and Me / Progress

Status:
Future product work.

Observation:
PR #72 keeps Add to mock as basket/planning-only. Actual written-and-graded mocks should eventually feed Mistake Intelligence and Me / Progress through real saved grading evidence.

Action:
Plan a later evidence-path PR for mock grading output to Mistake Intelligence and Me / Progress. Do not claim this in PR #72.

## 2026-05-08 - PR #69 / K2D remains separate

Status:
Still draft/open/not merged unless live GitHub verification later says otherwise.

Observation:
PR #69 / K2D remains separate from PR #72 and must not be merged blindly. PR #72 must not cherry-pick or absorb K2D code unless explicitly approved.

Action:
Verify live GitHub state before acting on PR #69. Rebase/update and audit separately if it is revived.

## 2026-05-06T00:00:00Z - K2D normalization after K2C

Status:
K2D is the next stage after post-K2C handoff repair and Vercel-Codex setup.

Observation:
K2D = Missing solution AI fallback. It must distinguish generated AI solution from stored verified solution. It must not claim official CBSE answer unless verified.

Action:
Do not start K2D until Vercel setup is complete and /app/ deployment is verified on base d9d0d5df1e9de45df4e555b186903070e7b0e873.
# LazyTopper Open Questions and Follow-ups

This file tracks unresolved items so they do not get buried in session logs.

Newest items should be added at the top with UTC timestamp.

## 2026-05-07 Ã¢— Practice and HPQ Level-3 design grammar alignment

Status:
Active follow-up before desktop graduation sign-off.

Observation:
During manual 7-day trial QA, Practice and HPQ old-format pages were confirmed functional but visually outdated. They do not echo the Level-3 / desktop design grammar of the overall LazyTopper site. While functionally correct, this visual/design parity gap is a key item for pre-graduation review.

Action:
Plan a future scoped PR (likely PR-K2F or equivalent) to align Practice and HPQ surfaces with the upgraded Level-3 desktop design grammar. Do not block trial entitlement. Add to implementation roadmap for post-K2E stage.

## 2026-05-07 Ã¢— Browser Agent cannot complete magic-link auth without inbox access

Status:
Permanent QA caution for trial entitlement testing.

Observation:
Browser Agent could not automate the magic-link email login flow because it lacks access to the email inbox. This blocked Browser Agent from completing full trial entitlement QA for trial/expired/premium states. Manual human QA substituted successfully after signing in with a real magic link.

Action:
For future Browser Agent trial entitlement testing, either: (1) set up a passwordless or test-account-based QA flow for Browser Agent, or (2) document that manual QA is required for magic-link-gated trial testing.

## Active follow-ups after K1B / K1C / handoff setup

### K1B Practice query polish

Status:
Follow-up only.

Observation:
Browser QA reported that one K1B query route may sometimes require one click on the Trigonometry chip before the context bar reflects Trigonometry.

Action:
Re-check later during route/context hardening. Do not block K2A.

### /app/me shell consistency

Status:
Follow-up only.

Observation:
K1C QA noted /app/me sometimes rendered without DesktopShell when directly loaded, while still honest and usable.

Action:
Track for later shell-route consistency pass. Do not block K2A.

### Codespaces Browser Agent access

Status:
Permanent QA caution.

Observation:
Browser Agent can sometimes access Codespaces previews, but can also fail due to certificate, forwarding, port, login, or safe-browsing issues.

Action:
Prefer deployed public preview for Browser Agent. Use manual human QA for Codespaces-only URLs when needed.

### Revised Level 3 improvement prototype

Status:
No canonical finalized prototype.

Observation:
The revised Level 3 improvement prototype could not be finalized. Some experimental prototypes were discarded or considered non-canonical.

Action:
For K2 onward, use product-native specs and QA gates. Use Level 1/2 references for visual grammar and historical Level 3 for behaviour inspiration only.

### AI fallback solution

Status:
Future PR-K2D.

Observation:
A student should not feel a solution availability gap. If stored solution is missing, product should generate a board-style solution through AI, matching the stored solution format.

Action:
Do not implement in K2A. Plan as a separate later PR.

### Tutor and examiner quality polish

Status:
Future K6.

Observation:
Product should be useful from student, tutor, and CBSE board examiner lenses.

Action:
Add tutor/examiner wording and quality checks later, after real worksheet/check/progress paths are grounded.
---

## PR-K2H-6 Continue Repair Decision — Option B

Owner-approved decision: use Option B for the K2H-6 “Continue where you left off” repair.

Saved worksheet memory:
- CTA label: `Continue worksheet plan`
- Route: `/practice/worksheets`
- Preserve `source=home` and `returnTo=/`

Grade + subject memory only:
- CTA label: `Resume with Exam Trends`
- Route: `/exam-trends?subject=<subject>`
- Preserve `source=home` and `returnTo=/`

Profile-only memory:
- Do not show a Continue CTA.

No broad grade/subject-only memory should route to TopicHub.
TopicHub should only be used for resume in a future PR if there is a verified curated topic key or safe topic mapping.

Home primary cards should be ordered:
`Exam Trends -> Practice -> Worksheets -> Check & Improve`

Likely K2H-6 product scope:
- `lazytopper/src/pages/desktop/DesktopHome.tsx`
- `lazytopper/src/lib/desktop/landingMemory.ts`

Read-only inspect:
- `lazytopper/src/App.tsx`
- `lazytopper/src/pages/desktop/DesktopTopicHubPage.tsx`
- `lazytopper/src/lib/desktop/topics.ts`

K2H-6 non-goals:
- Do not touch landing, Login, pricing, Practice internals, HPQ, Mock, TopicHub content, docs/handoff, package/server/env/data in the product PR unless explicitly rescoped.
- Do not redesign Home.
- Do not create fake memory, fake topic history, fake attempts, or fake personalization.
- Do not change `/browse` behavior unless source audit proves it is necessary.
- Do not route to old `/trends/:grade/:subject`.
- Do not hard-code `/app` routes in source.

---

## Post-PR #85 / PR-K2H-6 handoff update

PR #85 / PR-K2H-6 — Home cockpit order + safe Continue repair is merged.

Current checkpoint:
- Active integration branch: `base/approved-thru-437`
- Previous base before PR #85: `c5515abf5cf616137391dc02f5e673ecc098baac`
- PR #85 head SHA: `f490a59bb97857e6be484fa288872eb625d69fd6`
- PR #85 merge commit / new base: `a0e540a837cebe21ffdb8537b9da241537f42fd9`

What PR #85 changed:
- Reordered Home cockpit primary cards to: `Exam Trends -> Practice -> Worksheets -> Check & Improve`
- Implemented K2H-6 Option B for Continue/resume behavior:
  - saved worksheet memory -> `Continue worksheet plan` -> `/practice/worksheets`
  - grade + subject memory -> `Resume with Exam Trends` -> `/exam-trends?subject=<subject>`
  - profile-only memory -> no Continue CTA
- Removed broad grade/subject memory routing to TopicHub to avoid TopicHub "Topic not found" risk.
- Preserved `/browse` behavior, no guest mode, no fake memory, and no fake personalization.

Files changed by PR #85:
- `lazytopper/src/lib/desktop/landingMemory.ts`
- `lazytopper/src/pages/desktop/DesktopHome.tsx`

Validation and QA:
- TypeScript passed.
- Production build passed with `NODE_ENV=production` and `BASE_PATH=/app/`.
- Production verifier passed: `8 passed, 0 failed`.
- `git diff --check` passed.
- Local `/app/browse` visual QA passed.
- Vercel `/app/browse` visual QA passed.
- Confirmed card order: `Exam Trends -> Practice -> Worksheets -> Check & Improve`.
- Local `/api/cbse-exam-date?class=10` proxy error remains a non-blocking local backend issue unrelated to PR #85.

Next recommended product stage:
- Pricing visual redesign, no payment gateway yet.

Pricing next-stage doctrine:
- Redesign Pricing so it visually matches the frozen landing, Login, and desktop cockpit grammar.
- Keep pricing honest: manual activation/payment not automated yet.
- Do not add fake checkout.
- Do not add fake premium unlock.
- Do not mark premium from normal client UI.
- Do not implement payment gateway in the visual redesign PR.
- Payment gateway / UPI / manual activation remains a later launch-readiness stage requiring server/admin verification.

Future implementation prompts must start from:
`base/approved-thru-437 @ a0e540a837cebe21ffdb8537b9da241537f42fd9`
