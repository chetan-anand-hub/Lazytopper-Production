# Bank-Expansion Lane — State

**Lane:** deepen the canonical question bank to a rotation-healthy floor of **≥50 questions per
{topic × section-band}** for BOTH subjects, all 26 canonical topics, bands A–E.
**Mode:** EXTRACT real net-new first (where the reservoir has the target band), then AUTHOR to fill the
remainder. Review-FREE: mechanical gates + an adversarial skeptic carry it; TRUSTED-STUDENT QA is the human
quality gate (surfaces stay GATED until then). Never self-merge (`src/data/**` is CODEOWNERS).
**Write surface (file-disjoint from CT + notes lanes):** `lazytopper/src/data/questionBanks/class10/**` +
the `canonicalQuestionBank.ts` import/spread lines + `docs/bank-expansion-review-queue.md` (manifest).
**Base:** branched from origin trunk `ebc95d7` (real tip; bank unchanged since `f2934e6` — the 7,084 census
holds; only notes/chapter-test surfaces moved between them).

## Ground truth
Assembled bank = **7,084** (Maths 3,088 / Science 3,996; 26 topics). Census by {topic × section} taken from
the import-based `assembled_bank_dump.json` (7,084 rows). Floors target **≥50 per A/B/C/D/E per topic**.

## FLOOR POLICY (AUTHORITATIVE — REVISED 2026-07-12, supersedes the earlier ≥50 wording)
- **Sections A, B, C (1-mark MCQ/AR · 2-mark VSA · 3-mark SA, non-proof): NO forced floor. EXTRACT-MAX.**
  Exhaustively sweep ALL sources; extract every GENUINELY net-new. MANDATORY per-source table every batch.
  Do NOT author or pad A/B/C.
- **SCARCE, high-value categories — 4-mark CASE-BASED (E), 5-mark LONG-ANSWER (D), and PROOF-type:
  floor ≥ 75 per topic, GENUINELY DISTINCT** (raised from 50). Extract what exists, then AUTHOR the remainder.
- **ANTI-REDUNDANCY (hard):** reject number-swapped OR structural variants — of each other AND of the banked
  questions. "Distinct" = differs in MORE THAN numbers/surface-context (different method or a real sub-part
  twist). The skeptic enforces this.
- **HONEST STOP:** if a scarce category cannot reach 75 genuinely-distinct even with authoring, stop at the
  honest count and REPORT the distinct-method inventory — NEVER pad. Most topics will honest-stop below 75 on
  D/E (e.g. real-numbers D≈21/E≈25, our-environment D=16/E=32, life-processes D=53/E=54). That is expected.
- **SYLLABUS = HARD GATE, TWO DIRECTIONS, EVERY BATCH:** (1) deleted chapters/subtopics (run `syllabusGuard.ts`
  live + as a gate), AND (2) the **Class-11/12 adjacency boundary** — concepts sharing vocabulary with the
  Class-10 chapter but taught in Class-12. Skeptic scans for the CONCEPT, not just the literal phrase.
  Known trap (our-environment): "energy pyramid"/"pyramid of biomass"/"ecological efficiency"/"productivity"/
  "succession"/detritus-vs-grazing-chain = Class-12 OUT; 10% energy-flow law + trophic levels = Class-10 IN.
  If a chapter has no Class-12 exclusion entries yet, PROPOSE them for owner (NCERT-verifier) confirmation
  BEFORE committing, then add entries + a test case. See the C12 scan snippet in the scratchpad tooling.

## Prior flat-floor gap table (now SUPERSEDED — kept for reference only)
The earlier flat-≥50 gap (A 0 · B 137 · C 77 · D 544 · E 890 = 1,648) drove the wrong strategy: it treated
A/B/C as needing fills and counted variant-level items. Under the band-scarcity policy the A/B/C "gaps"
are irrelevant (extract-max, not fill) and the D/E floors are re-scoped to genuinely-distinct-with-honest-stop.

**Batch-1 evidence for the policy change:** authored 90 real-numbers items to the flat floor → the dedup gate
caught **15 outright bank-duplicates** (e.g. "HCF/LCM of 6,72,120"; "Three bells at 9,12,15 min"; "prove √5
irrational" ≈ banked "prove √2 irrational") + many trivial number-variants. Real-numbers is a saturated thin
chapter; a flat ≥50 C/D floor is unreachable without redundancy. This drove the band-scarcity floor.

## Per-topic gaps (sections; 0 = already ≥50). Order = batch queue.
Maths: real-numbers C5 D36 E37 · polynomials B9 D38 E40 · pair-linear B14 D21 E34 · quadratic B9 D21 E28 ·
AP B9 D30 E22 · triangles D10 E27 · coordinate-geom B4 D35 E26 · trigonometry E14 · circles B3 D27 E40 ·
areas-circles B3 D30 E33 · surface-vol B26 C14 D5 E31 · statistics B24 D22 E30 · probability B15 D34 E28.
Science: chem-reactions D11 E39 · acids-bases D23 E38 · metals D18 E40 · carbon D11 E39 · light E34 ·
human-eye B3 C8 D26 E39 · electricity E32 · magnetic C4 D23 E42 · life-processes D19 E35 ·
control-coord C11 D21 E40 · reproduce C13 D13 E42 · heredity B5 D29 E40 · our-environment B13 C22 D41 E40.

## Batch plan (one {topic} = one batch = one PR; owner merges on green + skeptic-clean)
Serialized. Per batch: [extract where band-eligible] → author gaps → skeptic re-solve every Q → mechanical
gate stack → manifest ids → PR. Handoff update after each merge.
Pipeline order: real-numbers (proof batch) → rest of Maths → Science (Science E-heavy).

## Mechanical gate stack (scratchpad `gate.mjs` — transpile+import based, not a source scan)
unique ids (vs 7,084 + within set) · topicKey ∈ topics.ts slugs · subtopic present + not syllabus-banned ·
marks match section (A1 B2 C3 D5 E4) · every step has a `[N mark]` prefix, prefixes sum to marks ·
MCQ answer = exact option · Case-Based ⇒ section E · dedup vs 7,084 (norm+Jaccard, NET-NEW <0.45) + within set.
Plus repo gates: `npx tsc -p tsconfig.app.json --noEmit`, `scope:guard --mode product`, root+ops matrices,
mojibake, `git diff --check`, and the assembled-bank runtime proof (count = 7,084 + N, 0 dup, 0 orphan).

## Skeptic (automated correctness — the review-free substitute, NOT human review)
A fresh subagent independently re-solves every question, checks answer-consistency + step validity + mark-sum
+ in-syllabus + not-a-near-dup + (figure matches, if any). Any failure → reject (re-do or drop). Log reasons.

## Open follow-ups
- **[FU-DBAND-PEDAGOGICAL-FLOOR]** — a uniform Section-D (5-mark) floor of 50 is pedagogically unnatural for
  thin chapters (Real Numbers, Probability, Human-Eye) that CBSE rarely sets 5-mark items on. Authored D-band
  items for these are multi-part-constructed to earn 5 marks honestly, but the owner may prefer a lower D
  floor for such chapters. Flagged for ratification; not blocking.
- Case-based (E) is the highest fabrication-risk category (authored scenarios, no owner content review) —
  student QA is load-bearing here; every id is manifested.

## EXHAUSTIVE-SWEEP DISCIPLINE (standing, per owner — [FU-BANK-EXPANSION-SOURCE-SWEEP])
Before concluding a net-new count for ANY topic, sweep ALL sources: the whole `Content\` folder (14 study-package
folders; docx incl. TABLES, pdf) + all `diff\cbse-papers\` (Practise Papers, PYQ+MS pairs, Exemplar, chapter-wise
online). Fingerprint every candidate vs the CURRENT bank; produce a MANDATORY per-source table
(candidates / DUP / borderline / NET-NEW). Prove a low yield by exhaustion, never by sampling. Confirmed working:
life-processes 75 A/B/C vs real-numbers 23 = real reservoir depth.

## FIGURE-PENDING SAFEGUARD (standing, per owner — [FU-FIGURE-PENDING-SAFEGUARD])
- Un-answerable-without-a-PROVIDED-figure ("identify structure X") ⇒ ship the real figure (Bucket A extraction
  preferred; B/C only if skeptic-verified to match) OR add id to `WITHHELD_QUESTION_IDS`. Never ship answer-less.
- Text-answerable + figure-enriched ⇒ may ship now; figure is a later enhancement.
### Running figure-pending list (classify each; none silently forgotten)
| id | topic | question | bucket | action |
|---|---|---|---|---|
| LPSD-009 | life-processes | describe air passage + alveolar adaptation | ENRICHMENT (text-answerable) | reference figure later |
| LPSD-018 | life-processes | "draw a labelled diagram of the heart" + describe | ENRICHMENT (student-produced diagram) | reference figure later |
| OESD-001 | our-environment | food chain vs food web + why chains short | ENRICHMENT (text-answerable) | reference food-web figure later |
| OESD-005 | our-environment | 10%-law trophic energy calc (diagram = horizontal food-chain energy-flow, NOT a pyramid) | ENRICHMENT (numeric-answerable) | reference figure later |

## Batch queue status
- **Batch 1 — real-numbers +30: MERGED #381 (`3866a94`), docs #383 (`c4c7032`).** extract 10 + authored 20.
- **Batch 2 — real-numbers corrective +12: MERGED #384 (`63c6b04`).** Exhaustive re-sweep 11 + perfect-cube D 1.
  Real-numbers A/B/C reservoir proven ≈23 net-new by exhaustion; scarce ceiling ≈24 distinct methods (audit).
- **Batch 3 — life-processes +136: MERGED #385 (`ce34b3e`).** extract-max 75 A/B/C + scarce D×22 (→53) + case×39 (→54).
- **Batch 4 — our-environment +80: MERGED #388 (`99b1d2a`).** extract 51 A/B/C + scarce D×7 (→16) + case×22 (→32);
  both scarce bands honest-stop (Ch15 narrow). Owner byte-review → 4 Class-12 "pyramid" items reframed to 10%
  energy-flow; two-direction syllabus boundary now standard.
- **Batch 5 — how-do-organisms-reproduce +148: MERGED #393 (`820d013`).** extract-max 54 A/B/C (A28 B13 C13,
  exhaustive per-source sweep) + scarce D×30 (37→67, honest-stop) + case×64 (E1 plant/asexual ×34 + E2
  human/health ×30; 8→72, honest-stop at 72 DISTINCT — 3 structural twins dropped in preference to padding to 75).
  3 independent skeptics cleared all 151 (54/54·30/30·67/67); 1 factual FIX (E1-004 Plasmodium schizogony not cyst)
  + 3 twins dropped → 148 kept. Owner byte-review CLEAN (both syllabus directions clean, all 148 have solutions,
  correctOption 0, topicKey canonical). Chapter 265→413. Docs handoff = this PR.
- **Batch 6 — heredity +44: MERGED #396 (`ae5e671`).** extract-max 21 A/B/C (A15 B4 C2) + scarce D×11 (21→32,
  honest-stop) + case×12 (E1 Mendelian ×7 + E2 human-genetics ×5; 10→22, honest-stop). NARROW saturated chapter
  (219 banked) + every source is the pre-2026 "Heredity AND Evolution" chapter → ~75+ evolution items rejected at
  extraction (the pre-existing bank evolution leak NOT used as license). 3 skeptics re-solved every Punnett/pedigree
  (D 11/11, E 12/12, extract 23/24); skeptic caught a roan-cattle CODOMINANCE-mislabelled-as-incomplete-dominance
  (Class-12) → dropped, + 2 quality drops (a "why 1:2:1" near-twin, an acquired-traits Lamarckian-adjacent item).
  Net 44 kept. Owner byte-review CLEAN (read every boundary grep hit: "homologous" = homologous CHROMOSOMES [IN],
  ABO/linkage/codominance = substring false positives; 162 in-syllabus Mendel refs, correctOption 0). Chapter 219→263.
  Docs handoff = this PR.
- **Bank now = 7,534. 5 DISTINCT topics done across 6 batches** (real-numbers has 2 batches — original + corrective):
  **real-numbers, life-processes, our-environment, how-do-organisms-reproduce, heredity.** (Verified against the
  `*.expand.*`/`*.extract.*`/`*.scarce*` pack files on trunk — those five slugs are the only ones with expansion packs;
  NO probability/polynomials/etc. pack exists yet. Do NOT read "6 batches" as "6 distinct topics.")

## BEFORE-LAUNCH CORRECTIVE (tracked, SEPARATE from topic expansion — do NOT bury under Batch 7)
### [FU-BANK-UNRESOLVABLE-MCQ-KEYS] — 34 bank MCQs whose `answer` matches NO option
A full-bank scan (CT-balanced-mix task, 2026-07-13) found **34 MCQs whose `answer` string resolves to no option**
under the grader's exact-norm (trim+lowercase) contract → a student who picks the CORRECT option is scored WRONG.
Any drawn into CT/FT Section A can never be scored correct. This is PRE-EXISTING bank data (distinct from the
already-repaired [FU-BANK-CORRUPT-KEYS] population in `docs/objective-answer-key-review-queue.md`).
**Full 34-ID list + failure-class breakdown: `C:\Users\Chetan\OneDrive\Desktop\diff\report-ct-balanced-mix-2026-07-13.md` (§FINDING).**
Failure classes + fix rule:
- **AR letter-code answers** (`"A"` / `"D. A is false, R is true."`) vs the four full-text AR statements → set
  `answer` to the exact full OPTION TEXT. 6 of the 34 are `REP2-*` AR items (REP2-014,018,019,040,042,043) — these
  are PRE-EXISTING `reproduction.pack2` rows, NOT the Batch-5 expansion (my Batch-5 used `BX-REP-*` ids with the gate
  enforcing `answer`=exact option text; the report's "from Batch 5" is a misattribution). The expansion authoring
  template already enforces this rule — the fix is to the legacy REP2 pack.
- **PYQ extraction artifacts** — trailing marks digit / MS reference swept into the key (`"30-40 1"`, `"96° 1"`,
  `"8.4 cm 1 MS_X_..."`), spacing/format (`"1 : 2"` vs `"1:2"`, `"2:7 1"` vs `"2 : 7"`) → normalize the key to
  match an option.
- **Marking-scheme boilerplate / malformed questions** (PYQ-S-2024-ELEC-001, -MAG-002, -LIGHT-001, -METAL-002 whose
  options are question parts) + **mangled-glyph / duplicate-junk options** (PYQ-M-PROB-002/003/005/006/008/010,
  PYQ-M-ARC-003, PYQ-M-QE-001, PYQ-M-TRI-001/003, …) → normalize where recoverable; **WITHHELD_QUESTION_IDS** any
  genuinely unresolvable.
- **HOLD for owner adjudication (2 of 34):** CBE-S-MAGN-A-001 + PYQ-S-2024-MAG-002 sit under
  `magnetic-effects-of-electric-current` — CLAUDE.md §5 calls magnetic-effects deleted/banned yet the guard matrix
  passes with them present (spec §5 vs syllabusGuard policy). Owner decides; do NOT act unilaterally.
- **Latent CI landmine:** `fullMockBlueprint.test.ts` carries a strict key-resolves assertion that passes only
  because the seeded draw misses the bad keys — fixing the 34 (or relaxing that assertion) is part of this FU.
This is a data-quality corrective (same spirit as [FU-BANK-EXACTNORM-DUPS] and the SCQ-S-HERED-041 evolution leak),
run as its OWN small PR before launch — NOT folded into a topic-expansion batch.

## TOPICS REMAINING (~20) — one topic-batch each, extract-max A/B/C + scarce D/E/proof ≥75-distinct-or-honest-stop
Maths (12): polynomials · pair-of-linear-equations · quadratic-equations · arithmetic-progression · triangles ·
coordinate-geometry · trigonometry · circles · areas-related-to-circles · surface-areas-and-volumes · statistics ·
probability. Science (8): chemical-reactions-and-equations · acids-bases-and-salts · metals-and-non-metals ·
carbon-and-its-compounds · light-reflection-and-refraction · human-eye-and-colourful-world · electricity ·
magnetic-effects-of-electric-current · control-and-coordination.
**NEXT = chemical-reactions-and-equations** (Science, large reservoir; recommended — owner/next window may pick any
remaining topic, incl. pivoting to Maths for pipeline balance). Two-direction boundary for chemical-reactions:
no deleted-chapter overlap; Class-12 traps to reject = electrochemistry / electrode-potential / electrolysis detail,
thermochemistry / enthalpy, reaction-rate/equilibrium kinetics, detailed redox half-equations — Class-10 stays at
combination/decomposition/displacement/double-displacement + oxidation-reduction (basic) + corrosion + rancidity.
**READ + RUN syllabusGuard live for whichever chapter is chosen** (the Science bannedSubtopics list is chapter-wide;
Sources of Energy / Periodic Classification / Management of Natural Resources / Evolution are the deleted ones).
NARROW-CHAPTER NOTE: several remaining topics are saturated/narrow (like real-numbers, our-environment, heredity) —
expect scarce-band HONEST-STOPS well below 75; that is correct, not a shortfall. Regenerate the census per topic
from the fresh dump (do NOT trust a written per-topic count — the bank grew to 7,534).

## RESUME (for a fresh Fable window — this file + the task file are the source of truth)
1. Re-derive trunk; `corepack pnpm@10.32.1 install --no-frozen-lockfile` in a fresh worktree from CURRENT trunk;
   `git checkout -- pnpm-lock.yaml`; run tsc via `./node_modules/.bin/tsc`.
2. Regenerate the bank dump vs the CURRENT bank (scratchpad `dump_batch*.mjs` → `assembled_bank_dump_v*.json`);
   dedup MUST be vs the latest bank. Repoint `gate.mjs`/`rewrite.mjs` LAZY + DUMP consts to the new worktree/dump.
3. Per topic: dispatch (a) an EXTRACT-MAX A/B/C subagent (all sources, per-source table, dedup, syllabus TWO-way),
   (b) scarce D + E (+ proof) distinct-authoring subagents to ≥75 or honest-stop, (c) skeptics (independent
   re-solve + syllabus Class-12 scan + distinctness). Subagents return COMPACT (counts/table/reject-ids), NOT text.
4. Drop rejects (`rewrite.mjs`), my gate, wire imports+spread+provenance, run FULL gate stack (§F), manifest,
   PR from current trunk (never self-merge — `src/data` CODEOWNERS). Docs handoff after each merge (bundle if
   several merge together). Owner byte-reviews each batch.
- **Tooling (scratchpad, reusable):** `gate.mjs` (dedup + mechanical), `rewrite.mjs` (drop ids), `AUTHORING_SPEC.md`
  (schema + step-marking + TWO-direction syllabus rule), `dump_batch*.mjs`, the runtime-proof one-liner, the C12
  boundary scan snippet. Regenerate the dump before each new topic.
- **Tooling (scratchpad, reusable):** gate.mjs (dedup + mechanical), rewrite.mjs (drop rejected ids),
  AUTHORING_SPEC.md, dump_batch*.mjs (regenerate the bank dump vs CURRENT bank after each merge — dedup must be
  vs the latest), the assembled-bank runtime proof one-liner. **Regenerate the dump before each new topic.**

## Follow-ups (standing)
- [FU-EXTRACT-CONTENT-F13] — Content-folder "Question Bank" (folder 13) real-numbers file not swept; small
  extra A/B/C extract-max source. (Note: folder 13 WAS swept for reproduce in Batch 5 — richest A-band source.)
- [FU-BANK-EXACTNORM-DUPS] — the assembled bank already has ~114 exact-normalized-questionText duplicate
  groups PRE-EXISTING (not from these batches). Data-quality cleanup candidate, separate lane.
- [FU-D-BAND-HONEST-CEILING] — mature/narrow chapters honest-ceiling below 75 on scarce bands; do NOT pad.
  Evidence: life-processes D→53, our-environment D→16, reproduce D→67, heredity D→32 & E→22 (a very narrow chapter).
  Better an honest low count with a distinct-principle/method inventory than trait-swap/number-swap padding.
- **SKEPTIC = load-bearing on subtle syllabus mislabels** — Batch 6 the skeptic caught a roan-cattle item that
  described CODOMINANCE (red+white mosaic) but labelled it "incomplete dominance" (blended pink); codominance is
  Class-12. A concept-scoped skeptic (not just a phrase grep) is what catches these. Keep the independent re-solve.
- **Tooling note:** the batch gate (`gate*.mjs`) now carries BOTH the Maths and Science bannedSubtopic sets (added
  Batch 5). Recreate the reusable tooling (gate/rewrite/dump/runtime-proof/`AUTHORING_SPEC.md`) in the fresh window's
  scratchpad from the "Mechanical gate stack" spec above + the AUTHORING_SPEC (schema + step-marking + TWO-direction
  rule); re-point LAZY→new worktree and DUMP→new v-dump. A prior session's scratchpad may be inaccessible.

## Progress log (newest first)
- 2026-07-13: Batch 6 (heredity) MERGED #396 (`ae5e671`) +44 — narrow saturated chapter; extract-max 21 A/B/C
  (every source is the pre-2026 "Heredity AND Evolution" chapter → ~75+ evolution items rejected at extraction) +
  authored D×11 (honest-stop 32) + case×12 (honest-stop 22). 3 skeptics re-solved every Punnett/pedigree; caught a
  codominance-mislabel (Class-12) → dropped, +2 quality drops. Owner byte-review CLEAN (read every boundary grep hit).
  Bank → 7,534. NEXT = chemical-reactions-and-equations (recommended). Docs handoff = #<this PR>.
- 2026-07-13: Batch 5 (how-do-organisms-reproduce) MERGED #393 (`820d013`) +148 — largest batch yet; extract-max
  54 A/B/C + authored D×30 (honest-stop 67) + case×64 (honest-stop 72 distinct, 3 twins dropped not padded).
  3 skeptics + owner byte-review CLEAN on both syllabus directions. Orchestrator stayed lean (all heavy
  read/author/re-solve in subagents; compact returns). Bank → 7,490. NEXT = heredity.
- 2026-07-12: Batch 4 (our-environment) MERGED #388 +80 — both scarce bands honest-stop; owner byte-review caught
  Class-12 pyramid content → 4 reframed; two-direction syllabus boundary + ≥75 floor now standard. Bank → 7,342.
- 2026-07-12: Batch 3 (life-processes) MERGED #385 — first Science batch, +136, exhaustive-sweep fix confirmed
  (75 A/B/C vs 23). Batch 2 (real-numbers corrective) MERGED #384 — exhaustive re-sweep + D/E exhaustion audit.
  Bundled docs handoff (#384+#385) done. Figure-pending safeguard doctrine adopted.
- 2026-07-12: Batch 1 (real-numbers) COMPLETE → PR #381. Floor policy corrected mid-batch to band-scarcity
  (owner). Authored-to-flat-floor packs discarded; re-did as extract-max A/B/C + distinct-author scarce D/E/proofs.
- 2026-07-12: Lane opened. Worktree `LT-worktrees/bank-expansion`. Census + gap table + gate tooling built.
