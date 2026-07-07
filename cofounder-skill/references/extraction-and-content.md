# Extraction · Content doctrine · Syllabus guard · Bank composition
# Read this before ANY question extraction, note generation, or concept-seeding.

## SYLLABUS GUARD (before ANY extraction/generation)
- Re-read `scripts/src/syllabusGuard.ts` LIVE per chapter; copy the exact banned keywords + SURFACE_BANNED_PHRASES
  into the agent instruction. Filter at the QUESTION level.
- Traps: homologous SERIES (chemistry, IN) ≠ homologous ORGANS (evolution, OUT); sum/product-of-roots IN but under
  Polynomials; verify per chapter — the banned list is chapter-specific.

## CONTENT / DATA DOCTRINE (source rule relaxed 2026-07-04)
- ANTI-FABRICATION ABSOLUTE: NEVER invent a question, scenario, sub-question, or datum. Honest empty beats fake.
- SOURCE RULE RELAXED: real, PUBLISHED questions allowed, TAGGED BY PROVENANCE — no longer CBSE-official-only.
  PRIORITY: (1) CBSE-origin (PYQ, sample papers, practice papers — public, board-accurate, no IP risk — mine first);
  (2) third-party publishers as a TAGGED supplement (fine for trusted-student QC; IP-aware for public launch; prefer
  their CBSE-compilations; publisher-original = tagged). NEVER mislabel a third-party item as CBSE/PYQ.
- Authoring a CORRECT model solution to a REAL question is allowed: verify correct, flag authored, track in a review
  queue (owner verifies via student feedback — e.g. docs/light-extraction-review-queue.md, the 230+52 list).
- Every question ships step-marked `solutionSteps` (`[N mark]` prefixes summing to total). `topicKey` matches
  `topics.ts`. Case-based = full scenario + all sub-questions as one set, never split, `format="Case-Based"`.

## EXTRACTION MECHANICS
- pymupdf 1.27.2.3 ONLY (pdfplumber produces `(cid:NNNN)` on CBSE subset fonts). `ftfy.fix_text` on extracted text.
- Semantic detection (no Q1/Q2 marker dependence). Diagrams: bind only REAL source figures, eye-confirmed; EMF-only
  → flag authored-SVG-later; never fabricate a diagram.
- De-dupe against the CURRENT bank (not a stale snapshot). Cross-check agent per-file counts against a real sample
  before trusting any aggregate. Correctness > speed > cost.
- Checkpoint tests (run ALL or no PR): cid/glyph, mojibake, banned-syllabus, topicKey valid, mark-sum, step-marking
  present, answer/schema, diagram-binding integrity, de-dupe, unique-ids.

## BANK COMPOSITION — three sources, DON'T conflate
- `canonicalQuestionBank` → Worksheet / Quick Practice / Chapter Test.
- `predictedQuestions*` → Full Mock (separate dataset; re-source needed for new questions to reach mocks).
- `highlyProbableQuestions.ts` → HPQ (human-curated; must NOT auto-refresh from bank growth).

## DELEGATION MODEL
- Notes ~90% delegatable (validator-gated). Extraction ~60-70% (no fully-mechanical correctness gate → owner
  correctness gate stays). Concept-seeding = bounded content, owner pedagogy-reviewed.
- OPUS = well-specified execution. FABLE = hard/ambiguous/interconnected (weekly cap — reserve for semantic/diagram
  extraction judgment; don't spend it on proven validator-gated pipelines).
