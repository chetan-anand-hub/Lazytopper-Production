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
- Every question ships step-marked `solutionSteps` (`[N mark]` prefixes summing to total). Case-based = full scenario
  + all sub-questions as one set, never split, `format="Case-Based"`.
- **CANONICAL TOPIC REGISTRY.** `topicKey` MUST be a slug in **`src/lib/desktop/topics.ts`** (26 kebab-case slugs) —
  resolved via **`desktopTopicForWeakAreaKey()`** (maps every bank spelling → a topics.ts slug, 0 orphans). BEWARE the
  RIVAL vocabularies that resolve DIFFERENTLY and must NEVER be the migration/guard target: `getTopics()`
  (`worksheetModel.SCIENCE_TOPICS_RAW`), `topicAliasMap`/`resolveCanonicalTopicKey`, `cbse10Canonical.canonicalSlug`
  (these emit doctrine-banned bank keys — `heredity-and-evolution`, `reproduction`, merged light+eye, plural AP).
  Guard A = "topicKey **IS** a topics.ts slug," never "resolves via an alias" (that convention is a re-infection).

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
- **AUTHORITATIVE COUNT = `canonicalQuestionBank.length` at RUNTIME (transpile + import), NEVER a source text-scan.**
  The bank is authored in styles a regex silently misses: JS-literal (`id:`/`topicKey:`), JSON-style quoted keys
  (`"id":`/`"topicKey":`), factory-built (`*.pack1.ts`, e.g. triangles/trigonometry — no literal `id:`), AND ~26
  questions inline in `canonicalQuestionBank.ts` itself. True SERVED total ≈ **7,084** (Maths 3,088 / Science 3,996,
  26 topics; post-`WITHHELD_QUESTION_IDS`). A census/migration/guard on `\bid:` / `topicKey:\s*"` under-counts and
  is the exact silent-convention failure the topic-key P0 cured — count + Guard A read the ASSEMBLED import; regex is
  only for the mechanical file edit and must match BOTH `key:` and `"key":`, its completeness proven by the runtime
  assertion (full count + 0 orphan). Migrating the bank is `topicKey`-VALUE-only (verify 0 non-topicKey changed lines).

## DELEGATION MODEL
- Notes ~90% delegatable (validator-gated + fidelity/conformance checkers + an INDEPENDENT AUDITOR — a separate agent,
  no write access, PASS/REJECT). Extraction ~60-70% (no fully-mechanical correctness gate → owner correctness gate
  stays). Concept-seeding = bounded content, owner pedagogy-reviewed.
- OPUS = well-specified execution. FABLE = hard/ambiguous/interconnected content authoring (weekly cap — reserve for
  semantic/diagram/notes judgment; don't spend it on proven validator-gated pipelines). A long content lane runs as a
  Fable ORCHESTRATOR that delegates heavy PDF reads to file-disjoint subagents + a skeptic, keeps its own context lean,
  and hands off below ~20% via `CONTENT_LANE_STATE.md`.
