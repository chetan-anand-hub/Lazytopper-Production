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
- **STANDING SYLLABUS-ANCHOR PROCESS-FIX (owner, from Batch 8):** anchor EVERY syllabus-boundary call to the OFFICIAL CBSE
  2026-27 syllabus (cbseacademic.nic.in) AND the repo `scripts/src/syllabusGuard.ts` (read/run BOTH live, per chapter) —
  NEVER from memory or a prior year (2025-26). The 2027 board cohort is governed by 2026-27 ONLY. If `syllabusGuard` lacks a
  boundary entry, PROPOSE it for owner confirmation before acting. **Batch-8 miss that drove this:** ~22 sum/product-of-roots
  (zeros–coefficients of quadratic polynomials) items were mislabelled "Class-11" from memory — they are Class-10 2026-27 CORE
  under POLYNOMIALS, so they are IN-SYLLABUS and belong in the polynomials batch, not rejected. Also settled: Class-10 2026-27
  Quadratics is REAL ROOTS ONLY (D<0 ⇒ "no real roots", never complex/imaginary); magnetic-effects is RETAINED, not deleted.

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
- **Batch 7 — chemical-reactions-and-equations +136: MERGED #402 (`85b292f`).** extract-max 36 A/B/C (A29·B3·C4;
  exhaustive per-source sweep; ~15 Class-11/12 Level-III items — oxidation-number/ion-electron balancing, disproportionation,
  oxidation-state calc — rejected wholesale; 1 figure-dependent MCQ dropped + 1 corrupted-key item dropped, NEITHER shipped
  answer-less or silently re-keyed) + scarce **D 39→75 (+36)** (12 construction families) + **E 11→75 (+64)** (9 scenario
  families). **FIRST topic where BOTH scarce bands REACHED the ≥75 distinct floor with NO honest-stop** — a large clean
  reservoir, the counterpoint to the narrow saturated chapters. 3 independent adversarial skeptics: extract 36/36 clean;
  D 35/36 → 6 fixes (a Class-11 electron-transfer redox item reframed to Class-10 O/H basis; a reaction-type relabel; 3
  template/subset overlaps differentiated; a rust-formula consistency fix); E 61/64 → 3 fixes (limescale re-scoped from
  wrong double-displacement to thermal decomposition of Ca(HCO3)2; malachite label dropped to match the CuCO3 equation;
  Fe+CuSO4 colour corrected to pale-green); 1 ambiguous MCQ distractor swapped. Two-direction syllabus CLEAN (no
  deleted-chapter drift; no Class-11/12 leak). **Every MCQ/AR key resolves to exactly one option — NO
  [FU-BANK-UNRESOLVABLE-MCQ-KEYS] regression** (the tightened exact-option-text authoring rule held on its first batch).
  Zero figure-pending — all 136 text-answerable. All ids manifested. Owner byte-review CLEAN + merged. Chapter 319→455.
  Docs handoff = this PR.
- **Batch 8 — quadratic-equations +110: MERGED #405 (`1b7c7aa`).** FIRST Maths topic since real-numbers (pipeline balance).
  extract-max A/B/C **+19** (9 A · 3 B · 7 C; the whole NCERT Exemplar ch4 was already banked → 0 from it) + scarce
  **D 29→76 (+47)** REACHED ≥75 (~13 application families) + case-based **E 22→66 (+44)** HONEST-STOP (~18 scenario families —
  the Class-10 quadratic case space is combinatorially finite; padding would force twins). 3 independent adversarial skeptics
  re-solved every quadratic: extract 1 distinctness drop (A-006 clone of banked QE2-050); D 2 correctness fixes (D-028 broken
  numbers "5 more pens"→"6 more pens"→x²+6x−720; D-011 rejected-root display −12/11→−6/11) + trimmed 2 of 3 identical
  reciprocal-schema items + added 2 distinct non-reciprocal items to hold ≥75; E 44/44 clean. **The consolidation CROSS-PACK
  gate caught 3 extracted-C vs authored-D twins → 3 authored D dropped** (real extracted content preferred). Owner byte-review
  CLEAN after TWO corrections: (a) the ~22 Vieta sum/product-of-roots items were correctly kept OUT of the quadratic-equations
  chapter, BUT the "Class-11" label was FACTUALLY WRONG — per official CBSE 2026-27, "Relationship between zeros and coefficients
  of quadratic polynomials" (sum/product of roots) is **Class-10 2026-27 CORE under POLYNOMIALS**; those items are IN-SYLLABUS and
  must be EXTRACTED in the upcoming POLYNOMIALS batch. (b) A suspected complex/imaginary-roots leak was a FALSE POSITIVE (an
  exhaustive 110-item scan found only a file-header doctrine comment; zero actual leaks; no √-of-negative anywhere) — #405 shipped
  as-is. Gates all green + CI quality-gate PASS. Chapter 224→334. Docs handoff = this PR.
- **Batch 9 — polynomials +62: MERGED #411 (`9749fc9`).** FIRST topic to ABSORB the sum/product-of-roots (zeros↔coefficients
  of QUADRATIC polynomials) items as Class-10 2026-27 CORE — exactly what Batch 8 correctly filed OUT of quadratic-equations, and
  proof the Batch-8 "Class-11" label was wrong. extract-max A/B/C **+13** (saturated chapter → honest-stop) + authored scarce
  **D 12→34** + **E 10→37** — BOTH honest-stop (a low-weight, narrow Class-10 chapter). Scope held to QUADRATIC zeros-coefficient
  ONLY: cubic zeros↔coefficient relations, the division algorithm at higher degree, and complex zeros are all EXCLUDED
  (Class-11/12 adjacency). Owner byte-review CLEAN. Chapter 190→252. Docs handoff = this PR (#411).
- **Batch 10 — pair-of-linear-equations + arithmetic-progression + acids-bases-and-salts +440: MERGED #415 (`ae2b447`).**
  FIRST **3-topics-per-PR** batch (owner SPEED directive — see the 3-PER-PR CADENCE note below). Per-topic discipline UNCHANGED
  (own source table, own syllabusGuard boundary, own skeptic, ≥75-distinct-or-honest-stop); the three were bundled onto ONE branch /
  ONE `canonicalQuestionBank.ts` wire / ONE PR.
  - **pair-of-linear-equations +163** (223→386): extract 42 A/B/C + authored D 39 + E 52 + a **reducible-to-linear follow-on
    pack** (+30: 8 A/B/C, 9 D, 13 E — see the boundary correction). Final PLE scarce **D 29→77 · E 16→81**.
  - **arithmetic-progression +114** (235→349): extract 20 A/B/C + **D 20→72** + **E 28→70**. AP ONLY (no GP — geometric
    progression is Class-11).
  - **acids-bases-and-salts +163** (302→465): extract 67 A/B/C + **D 27→63** + **E 12→72**. Qualitative Class-10 only.
  - **BOUNDARY CORRECTION (owner) — "equations reducible to a pair of linear equations"** (the 1/x=p, 1/y=q substitution family)
    is IN the official CBSE 2026-27 syllabus and board-important; the main sweep WRONGLY excluded it (shipped 0). Added on the same
    branch as `pairOfLinearEquations.expand.reducible.ts`. A backwards proposal to add reducible-to-linear to `syllabusGuard.ts`
    was **WITHDRAWN** — **syllabusGuard UNTOUCHED**; the Cross-Multiplication Method stays OUT (correct). This MIRRORS the Batch-8
    sum/product-of-roots lesson: never REJECT real in-syllabus content, and flag any guard change — never auto-commit it.
  - **Skeptics dropped 16 twins in the main batch (PLE 5, AP 11) + 3 in the reducible pack; fixed a chem MCQ collision
    (ABS EX-A-015) + 1 reducible coeff-clone (C-003).** Owner byte-review CLEAN; two-direction syllabus clean; all ids manifested.
    Docs handoff = this PR (#415).
- **Bank now = 8,282. 11 DISTINCT topics done across 10 batches** (real-numbers has 2 batches — original + corrective; Batch 10
  shipped 3 topics on one PR): **real-numbers, life-processes, our-environment, how-do-organisms-reproduce, heredity,
  chemical-reactions-and-equations, quadratic-equations, polynomials, pair-of-linear-equations, arithmetic-progression,
  acids-bases-and-salts.** (Count reconciliation: 7 through Batch 8 + polynomials (Batch 9) + PLE/AP/ABS (Batch 10) = 11.)
  **15 topics remain (8 Maths + 7 Science).**

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

## TOPICS REMAINING (15 = 8 Maths + 7 Science) — extract-max A/B/C + scarce D/E/proof ≥75-distinct-or-honest-stop
(Ground truth vs `topics.ts`: 26 canonical slugs = 13 Maths + 13 Science; 11 DONE = real-numbers + quadratic-equations +
polynomials + pair-of-linear-equations + arithmetic-progression [5 Maths] + life-processes + our-environment +
how-do-organisms-reproduce + heredity + chemical-reactions-and-equations + acids-bases-and-salts [6 Science] → 15 remain.)
Maths (8): triangles · coordinate-geometry · trigonometry · circles · areas-related-to-circles ·
surface-areas-and-volumes · statistics · probability. Science (7): metals-and-non-metals · carbon-and-its-compounds ·
light-reflection-and-refraction · human-eye-and-colourful-world · electricity · magnetic-effects-of-electric-current ·
control-and-coordination.
**NEXT batch (3-per-PR, continuous run) = triangles + coordinate-geometry + ONE Science (metals-and-non-metals OR
carbon-and-its-compounds).** Owner/next window may re-pick the trio; keep to the per-topic discipline within the bundle.
READ + RUN `syllabusGuard.ts` live for EACH chosen chapter before authoring (per-topic, per the standing anchor process-fix).
**READ + RUN syllabusGuard live for whichever chapter is chosen** (the Science bannedSubtopics list is chapter-wide;
Sources of Energy / Periodic Classification / Management of Natural Resources / Evolution are the deleted ones).
NARROW-CHAPTER NOTE: several remaining topics are saturated/narrow (like real-numbers, our-environment, heredity) —
expect scarce-band HONEST-STOPS well below 75; that is correct, not a shortfall (chemical-reactions was the FIRST topic
where BOTH scarce bands reached ≥75 with no honest-stop — a large-reservoir exception, not the norm). Regenerate the
census per topic from the fresh dump (do NOT trust a written per-topic count — the bank grew to 8,282). Batch 9
(polynomials D→34/E→37) is a fresh reminder that low-weight/narrow chapters honest-stop well below 75 — expected, not a shortfall.

## CONSOLIDATION CROSS-PACK GATE (standing lesson, from Batch 8)
Before wiring, ALWAYS run a COMBINED cross-pack gate over ALL packs of the batch together (extract + authored-D + authored-E),
not just each pack in isolation. Batch 8 caught 3 extracted-C vs authored-D twins only because the combined gate compared the
extract pack against the authored packs — real extracted content is preferred, so the 3 authored D were dropped. A per-pack-only
gate would have shipped the twins. Run the combined cross-pack gate every batch.

## 3-PER-PR CADENCE (standing, owner SPEED directive — from Batch 10)
From Batch 10 on, BUNDLE 3 topics per PR: one branch, one `canonicalQuestionBank.ts` wire, one PR, one docs handoff.
The per-topic discipline is UNCHANGED inside the bundle — each topic keeps its OWN exhaustive source table, its OWN
two-direction syllabusGuard boundary call (read/run live per chapter), its OWN independent skeptic pass, and its OWN
≥75-distinct-or-honest-stop scarce-band target. Run the COMBINED cross-pack gate over ALL packs of ALL 3 topics before
wiring (Batch 10 dropped 16+3 twins and fixed a cross-topic MCQ collision only because the combined gate saw every pack).

## SYLLABUS-BOUNDARY PRECEDENTS (standing — never reject real in-syllabus content)
Two owner corrections now anchor the rule "flag guard changes, never auto-commit; never reject IN-syllabus content":
- **Batch 8 → sum/product-of-roots (zeros↔coefficients of quadratic polynomials) is Class-10 2026-27 CORE under POLYNOMIALS**
  (the "Class-11" label was wrong); absorbed in Batch 9.
- **Batch 10 → "equations reducible to a pair of linear equations" (1/x=p, 1/y=q substitution) is IN the official CBSE 2026-27
  syllabus** and board-important; the main sweep wrongly excluded it, so it was added on the same branch as
  `pairOfLinearEquations.expand.reducible.ts`. A backwards proposal to add reducible-to-linear to `syllabusGuard.ts` was
  **WITHDRAWN — syllabusGuard was left UNTOUCHED**; the Cross-Multiplication Method correctly stays OUT.
Both: when a boundary call is uncertain, anchor to the OFFICIAL CBSE 2026-27 PDF + live `syllabusGuard.ts`, propose (never
silently commit) any guard edit, and prefer INCLUDING genuine in-syllabus content over a memory-driven exclusion.

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
- **Tooling gotcha (Windows, from Batch 7):** `gate.mjs`'s transpile+import must reference the questionBank BARREL
  with a RELATIVE specifier and NO `.ts` extension (Node ESM resolves the barrel's re-exports); an absolute path or a
  `.ts` suffix fails to resolve on Windows. Keep the barrel-relative-no-`.ts` form when re-pointing LAZY/DUMP consts.

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
- 2026-07-13: Batch 10 (pair-of-linear-equations + arithmetic-progression + acids-bases-and-salts) MERGED #415 (`ae2b447`) +440 —
  FIRST 3-topics-per-PR batch (owner SPEED directive: from now bundle 3 topics on ONE branch / ONE canonicalQuestionBank.ts wire /
  ONE PR; per-topic discipline unchanged — own source table, own syllabusGuard boundary, own skeptic, ≥75-or-honest-stop).
  PLE +163 (223→386: extract 42 A/B/C + D 39 + E 52 + a reducible-to-linear follow-on pack +30 [8 A/B/C·9 D·13 E]; final scarce
  D 29→77 · E 16→81) · AP +114 (235→349: extract 20 A/B/C + D 20→72 + E 28→70; AP only, no GP) · ABS +163 (302→465: extract
  67 A/B/C + D 27→63 + E 12→72; qualitative Class-10 only). BOUNDARY CORRECTION (owner): "equations reducible to a pair of
  linear equations" (1/x=p, 1/y=q substitution) is IN the official CBSE 2026-27 syllabus + board-important — the main sweep wrongly
  excluded it (shipped 0), added on the same branch (`pairOfLinearEquations.expand.reducible.ts`); a backwards proposal to add it
  to syllabusGuard.ts was WITHDRAWN → syllabusGuard UNTOUCHED, Cross-Multiplication Method stays OUT. Mirrors the Batch-8
  sum/product-of-roots lesson (never reject real in-syllabus content; flag guard changes, never auto-commit). Skeptics dropped 16
  twins in the main batch (PLE 5, AP 11) + 3 in reducible; fixed a chem MCQ collision (ABS EX-A-015) + 1 reducible coeff-clone
  (C-003). Owner byte-review CLEAN. Bank → 8,282. NEXT = triangles + coordinate-geometry + one Science (metals-and-non-metals OR
  carbon-and-its-compounds), 3-per-PR continuous run. Docs handoff = #<this PR>.
- 2026-07-13: Batch 9 (polynomials) MERGED #411 (`9749fc9`) +62 — FIRST topic to ABSORB the sum/product-of-roots (zeros↔coefficients
  of QUADRATIC polynomials) items as Class-10 2026-27 CORE, exactly what Batch 8 filed OUT of quadratics (proving the "Class-11"
  label wrong). extract-max A/B/C +13 (saturated → honest-stop) + authored D 12→34 + E 10→37, BOTH honest-stop (low-weight narrow
  chapter). Scope held to QUADRATIC zeros-coefficient ONLY (cubic zeros↔coefficient relations, higher-degree division algorithm,
  and complex zeros all EXCLUDED). Owner byte-review CLEAN. Bank → 7,842. Chapter 190→252. Docs handoff = #<this PR>.
- 2026-07-13: Batch 8 (quadratic-equations) MERGED #405 (`1b7c7aa`) +110 — FIRST Maths topic since real-numbers (pipeline
  balance). extract-max A/B/C +19 (9A·3B·7C; whole NCERT Exemplar ch4 already banked = 0) + scarce D 29→76 (+47) REACHED ≥75
  (~13 application families) + case-based E 22→66 (+44) HONEST-STOP (~18 scenario families; Class-10 quadratic case space
  combinatorially finite). 3 skeptics re-solved every quadratic: extract 1 distinctness drop (A-006≈QE2-050); D 2 correctness
  fixes (D-028 "5→6 more pens" → x²+6x−720; D-011 rejected-root −12/11→−6/11) + trimmed 2 of 3 reciprocal-schema twins + added
  2 distinct non-reciprocal to hold ≥75; E 44/44 clean. Consolidation CROSS-PACK gate caught 3 extracted-C vs authored-D twins
  → 3 authored D dropped (real extracted preferred). Owner byte-review CLEAN after two corrections: (a) the ~22 sum/product-of-
  roots items were rightly kept OUT of quadratics but MISLABELLED "Class-11" — they are Class-10 2026-27 CORE under POLYNOMIALS
  (must be extracted in the polynomials batch); (b) a suspected complex/imaginary-roots leak was a FALSE POSITIVE (110-item scan
  = only a header comment; zero leaks). STANDING process-fix adopted: anchor every syllabus call to official CBSE 2026-27 +
  live syllabusGuard, NEVER memory/prior-year. Gates all green + CI PASS. Bank → 7,780. Chapter 224→334. NEXT = polynomials
  (INCLUDE sum/product-of-roots as core). Docs handoff = #<this PR>.
- 2026-07-13: Batch 7 (chemical-reactions-and-equations) MERGED #402 (`85b292f`) +136 — LARGE clean reservoir; the
  FIRST topic where BOTH scarce bands reached the ≥75 floor with NO honest-stop (D 39→75 via 12 construction families,
  E 11→75 via 9 scenario families) + extract-max 36 A/B/C (A29·B3·C4; ~15 Class-11/12 Level-III redox items rejected
  wholesale, 1 figure-dependent MCQ + 1 corrupted-key item dropped not shipped). 3 skeptics: extract 36/36 clean, D
  35/36→6 fixes, E 61/64→3 fixes (limescale→thermal decomposition of Ca(HCO3)2, malachite label dropped, Fe+CuSO4
  colour→pale-green) + 1 MCQ distractor swap. Two-direction syllabus CLEAN; every MCQ/AR key resolves to one option
  (NO [FU-BANK-UNRESOLVABLE-MCQ-KEYS] regression — the exact-option-text rule held on its first batch); zero
  figure-pending. Owner byte-review CLEAN. Bank → 7,670. Chapter 319→455. NEXT = quadratic-equations (Maths, pipeline
  balance). Docs handoff = #<this PR>.
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
