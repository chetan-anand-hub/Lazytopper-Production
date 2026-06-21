# LazyTopper — Worksheet Generator Spec (LOCKED 2026-06-20)
**By:** Claude (cofounder) + Chetan (owner). **Status:** LOCKED — binding reference for PR-E2.
**Binding visual:** `worksheet_generator_optimized_2026-06-20.html` (desktop + 360px, real grammar). To be committed to `docs/design/` alongside this spec.
**Repo truth:** the desktop worksheet (`pages/desktop/DesktopWorksheetsPage.tsx`, 2278ln) ALREADY implements ~80% of this (scope, presets, MI-enrichment, multi-topic, upload-route). PR-E2 is a presentation-layer + correctness rebuild, NOT greenfield.

## 1. DESIGN PRINCIPLE — reduce decision load via progressive disclosure
The current design is GOOD (kept). The only problem was information overload (every control + a full right-rail restatement visible at once). Fix = progressive disclosure:
- **Default view ≈ one screen:** Subject → Scope → Topic → Build mode (presets) → compact preview → Generate.
- **Presets are PRIMARY; Custom is tucked.** Picking a preset (Board mix / Quick drill / High-marks) HIDES the sections/difficulty/count controls entirely — they only appear behind a quiet "⚙ Custom filters" link.
- **Scope stays first-class** (single + multi-topic are BOTH common — owner-confirmed): Subject/Scope/Topic are the visible top card.
- **Right rail collapses** from the full restatement (5 Section A–E cards + 8 Format chips + 8 detail rows) to: one compact chip line ("Trigonometry · A–E · all difficulty · 25 Q") + a small section breakdown (A 8 · B 5 · C 6 · D 4 · E 2). Owner chose "compact line + small breakdown."
- **MI-enrich + Learner-loop are tucked** (MI-enrich = quiet toggle under build mode; Learner-loop moves to AFTER generation).
- **Topic = dropdown/search**, not the current scroll-within-scroll box.

## 2. ONE RESPONSIVE GRAMMAR COMPONENT (solves parity + grammar together)
Rebuild as ONE responsive component (the ConceptSpine pattern), pure-CSS @media reflow, 360px-safe, grammar primitives + tokens, NO inline styles. This simultaneously (a) brings MOBILE to full feature parity (mobile currently has only 2/8 features) and (b) clears the grammar debt (desktop = 84 inline styles, 0 tokens). Mobile = same structure, sticky bottom Generate bar, full feature set.

## 3. BUILD MODES (already in repo — keep exactly)
- Board exam mix: A–E · all difficulty · 25 Q
- Quick drill: A–B · all difficulty · 15 Q
- High-marks focus: C–E · hard · 20 Q
- Custom: student sets sections + difficulty + count (TUCKED behind "Custom filters")

## 4. ★ QUESTION DISTRIBUTION (multi-topic / full-subject) — was accidentally random; now explicit
Current code = "pool per topic up to full count, dedupe, shuffle, truncate" → NO balanced representation (lopsided, skewed to bank size). FIX:
- **Multi-topic** (student picked N topics) → EVEN split (count ÷ N per topic).
- **Full subject** → BOARD-WEIGHTAGE split (allocate by each topic's real CBSE marks-weightage — LazyTopper has this from Exam Trends).
- **MI-enrich toggle** → re-weights the distribution toward the student's weak topics.
- Show the distribution LIVE in the preview (e.g. Trigonometry 15 · Statistics 10) so the student sees the split before generating.

## 5. ★ CONTENT CORRECTNESS (the teacher-POV gates — non-negotiable)
- **Deleted-topics bug (MUST FIX):** the topic list includes `heredity-and-evolution` and `magnetic-effects` — OUT of the 2026-27 syllabus. Filter the list through syllabusGuard. A teacher seeing banned topics offered = instant trust loss.
- **Typology / source:** worksheet pulls from AI packs (soft-demoted ai×0.3 but present) and doesn't enforce CBSE 2026-27 competency (50% competency / 20% MCQ / 30% descriptive). Prefer real PYQ/NCERT-sourced questions; represent competency questions; be HONEST when the bank is thin (fewer real questions beats padded AI). Anti-fabrication absolute.
- **Answer-key quality:** step-by-step solutions in the answer key must be real + mark-annotated + correct (the teacher's reputation rides on it). Same anti-fabrication rigor.
- **Honest counts:** show the REAL available count, not just "up to 25" (a student expecting 25 and getting 12 feels short-changed).

## 6. ★ DOWNLOAD = TWO SEPARATE FILES (owner-confirmed)
On Generate, the student can download:
1. **Worksheet (questions only)** — clearly numbered Q1…QN with section markers (A–E). Includes a one-line instruction: *"Label each answer with its question number."*
2. **Answer key + step-by-step solutions** — SEPARATE file (so the student attempts honestly before revealing). Never bundled into the questions PDF.

## 7. ★ UPLOAD-AND-GRADE LOOP (the structure — owner-confirmed: ONE PDF)
**Flow:** student downloads worksheet → solves on paper → uploads ONE PDF of all solved answers → grader grades it → per-question breakdown + worksheet total + correct solutions → feeds Mistake Intelligence.
**Why one PDF (not per-question upload):** 25 separate image uploads is a UX killer students would abandon. One PDF is what they'll actually use.
**How one-PDF grading stays accurate (the key design):** because LazyTopper GENERATED the worksheet, it knows the exact questions, their numbers, order, and marking schemes. So:
- Persist the worksheet's question set + schemes by `worksheetId` (code already mints worksheetId at line 893) so grading works later, not just same-session.
- The grader processes the PDF as a STRUCTURED SET keyed to the known question numbers (Q1…QN) — the numbering is the matching key, far more reliable than segmenting an unlabeled blob.
- EXTEND the existing per-question grader (`checkSolution.cjs` — already grades one answer against its scheme with annotated steps); the new part is "loop over the known questions, locate each numbered answer in the PDF, grade against its scheme." Do NOT build a separate blob-grader.
- **Honest failure handling:** if it can't confidently read/find a question's answer (blurry, skipped, illegible), it SAYS SO ("Q12: couldn't read your answer clearly") — never guesses/fabricates a mark.
**No re-upload of the worksheet needed** — the system has the questions; the student uploads only their answers.

## 8. MISTAKE INTELLIGENCE WIRING (closes the under-fed gap for this surface)
Wire `recordMistake` (+ `recordAttempt` score-twin) through the single MI front door (`services/mistakeIntelligence.ts`) when a worksheet is graded — so worksheet mistakes flow into weak-areas (conceptual/calculation) and careless-insight (silly/presentation). Worksheet currently shows recordMistake=0.

## 9. ★ VERIFICATION (the non-negotiable rule)
The upload-grade loop is an AI round-trip with real failure modes (PDF read, multi-page, answer-matching). Static gates are NOT sufficient. REQUIRE one real live owner test before "done": generate a worksheet, solve a few questions on paper, scan to PDF, upload, confirm the grading matches reality. START SMALL (a 5-question quick drill, not 25) to validate matching before trusting at scale.

## 10. PR-E2 SCOPE SUMMARY
Rebuild worksheet as ONE responsive grammar component to the optimized layout + fix deleted-topics + fix distribution (even/weightage/MI) + two-download split + persist question-set-by-worksheetId + one-PDF structured grading (extend existing grader, honest failures) + wire recordMistake + the source/typology decision. Big PR — owner live-verifies the grade loop. (Note: the practise-filter bug fix + chapter-test wiring is the SEPARATE smaller PR-E1, done first.)
