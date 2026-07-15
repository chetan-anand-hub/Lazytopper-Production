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
- **★ [FU-BANK-SCARCE-BAND-MISBANDING] (NEW 2026-07-15 — pre-launch; the owner's live QP bug)** — the bank itself
  carries mis-banded scarce-band rows. **Trigger:** the owner saw a 5-mark "Section D / Easy" question that was just
  *"Find the value of cosec 60°"*. **Diagnosis: `trigonometry.pack3.ts:1478` (`TG3-056`) is a CANONICAL BANK ROW**
  (`section:"D", marks:5, difficulty:"Easy"`, 3 steps) — **QP is serving the bank faithfully; the BANK is wrong.**
  (The initial hypothesis "QP serves a legacy AI-generated set" was disproven — see the REACHABILITY section.)
  Quantified over the 8,597 bank vs CBSE step-marking (CLAUDE.md §13: A=1 B=2 C=3 D=5 E=4 steps):
  - `section`/`marks` NEVER disagree (0 mismatches) ⇒ this is content-vs-band, not a structural bug.
  - **254 of 2,211** D+E rows have FEWER `solutionSteps` than their section requires (11.5%); **106** D rows have ≤2.
  - **CLASS (a) — 76 rows UNAMBIGUOUSLY WRONG-BAND (do FIRST, it is a scoring defect):** `format: MCQ` or
    `Assertion-Reasoning` with **4 populated options**, at **section D / 5 marks**. An MCQ is by definition a 1-mark
    Section-A item. `isObjectiveType` sees `format:"MCQ"` ⇒ the grader **clamps 0-or-5 marks**, and they reach CT/FM
    Section D. Examples: `MNM2-012` (5-mark "long answer" = 4-option MCQ *"What is corrosion?"*), `PL2-021/022`
    (Assertion-Reasoning at 5 marks), `TG3-057`, `ABS2-045`. Spread over **16 topics** (trigonometry 13, metals 8,
    life-processes 7, real-numbers 7, carbon 6 …).
  - **CLASS (b) — ~178 under-stepped D/E solutions (separate, later):** legitimately 5-mark multi-part questions
    (e.g. `SCQ-S-CHEM-035` "Write balanced chemical equations for… a… b… c…") whose `solutionSteps` were never broken
    out. Right band, incomplete solution. **A different defect — do not conflate with (a).**
  **Own PR(s), data-only, NOT folded into a topic-expansion batch** (it touches 8 already-done topics and would wreck
  the byte-review of an additive expansion). **Owner-endorsed baseline rule:** report expansion before/after on the
  RAW census (consistent with prior batches) and flag the step-compliant subset SEPARATELY — **never silently restate
  a baseline** (e.g. trigonometry D 61 → ~51 compliant; statistics D 28 → ~11 is exactly the kind of quiet number
  change that corrupts the lane's history).
- **★ [FU-TOPICMATCHES-SUBSTRING-CONFLATION] (NEW 2026-07-15 — hits the Maths batch)** — `predictionCore.ts:259`
  `topicMatches` is `q.includes(r) || r.includes(q)` — a SUBSTRING match over `normaliseTopic` (which strips
  hyphens). Swept all 26 `topics.ts` slugs: **exactly ONE colliding pair — `circles` ↔ `areas-related-to-circles`**
  ("areasrelatedtocircles".includes("circles")). Both return **456 = 229 + 227**, i.e. each topic serves the other's
  questions in **QP / Worksheet / TopicHub / dailyMission**. **CT/FM are IMMUNE** (`bankQuery.ts:41-45` uses exact
  `resolveCanonicalSlugSet`). **Does NOT block the expansion** (the bank is the source of truth), **but BOTH halves
  are in the remaining 6 Maths topics** — expect this while QA'ing Circles / Areas-Related-to-Circles. Engine file ⇒
  another lane's fix.
- **★ [FU-REACHABILITY-TEST-SCOPE] (NEW 2026-07-15 — standing validation hole)** —
  `lazytopper/scripts/ops/topickey_runtime_proof.mjs` (this lane's MANDATORY step 6) asserts only: count > 5000 ·
  0 duplicate ids · every `topicKey` ∈ `topics.ts` slugs · registry coverage. **It imports `canonicalQuestionBank`
  DIRECTLY and never touches a surface.** "Reachable" there means *"this topicKey is a canonical slug"* — **bank
  INTEGRITY, not surface sourcing.** It would pass identically if a surface stopped sourcing the bank, so it cannot
  catch the regression class its name implies (it did NOT hide a bug — all four surfaces are verified reachable).
  Fix = assert each live surface's sourcing fn returns canonical rows. Engine-adjacent test code ⇒ another lane.
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
- **Batch 11 — triangles + coordinate-geometry + metals-and-non-metals +315: MERGED #419 (`69e319d`).** SECOND 3-topics-per-PR
  batch. Bank 8,282→8,597.
  - **triangles +127** (294→421): extract 18 A/B/C + authored D 44 + PROOF 20 (7 D-weight + 13 C-weight) + case-E 45. Scarce
    **D 40→91 · E 23→68**.
  - **coordinate-geometry +67** (232→299): extract 7 + D 13 + E 47. Thin chapter — **D honest-stop at 28**.
  - **metals-and-non-metals +121** (299→420): extract 45 + D 28 + E 48. **D 32→60 · E 10→58**.
  - **BOUNDARY PRECEDENTS (owner-verified 2026-27):** (a) the internal ANGLE-BISECTOR THEOREM (BD/DC=AB/AC) is OUT of 2026-27
    ("proof of various theorems" trimmed from Triangles) — 2 D items asserting it were dropped; BUT PF-015 (corresponding bisectors
    of SIMILAR triangles are proportional, via AA) was KEPT — it is in-syllabus similarity, NOT the deleted standalone theorem (a
    precise both-directions call). (b) coordinate-geometry AREA-FROM-COORDINATES stays OUT (guard-banned; ~28 source items dropped).
    (c) metals Periodic Classification (Ch5) OUT.
  - Three per-topic skeptics dropped 9 (triangles 3, coord 4, metals 2); tsc caught 8 invalid `format` strings (fixed). Owner
    byte-review CLEAN; two-direction syllabus clean; all ids manifested. Docs handoff = this PR (#419).
- **Bank now = 8,597. 14 DISTINCT topics done across 11 batches** (real-numbers has 2 batches — original + corrective; Batches 10 &
  11 each shipped 3 topics on one PR): **real-numbers, life-processes, our-environment, how-do-organisms-reproduce, heredity,
  chemical-reactions-and-equations, quadratic-equations, polynomials, pair-of-linear-equations, arithmetic-progression,
  acids-bases-and-salts, triangles, coordinate-geometry, metals-and-non-metals.** (Count reconciliation: 11 distinct through
  Batch 10 + triangles/coordinate-geometry/metals (Batch 11) = 14 distinct.) **12 topics remain — exactly half the bank left =
  4 more 3-topic batches (6 Maths + 6 Science).**

## BEFORE-LAUNCH CORRECTIVE (tracked, SEPARATE from topic expansion)
### [FU-BANK-UNRESOLVABLE-MCQ-KEYS] — **CLOSED 2026-07-15 by PR #438** (13 rows withheld, not 34)
**RESOLVED. The prior text on this line was wrong twice over; both errors are recorded below deliberately.**

**COUNT CORRECTION — 13, not 34.** The "34" came from an **exact trim+lowercase** scan. That is NOT the grader's
contract. The real contract (`server/routes/objectiveScoring.cjs`) is `normaliseOption` (punctuation→space,
whitespace squeeze) **+ letter↔text bridging + ≥3-char partial match**, which forgives **21** of the 34. A live
re-derivation over the 8,597 bank **through the real module** found **13**.
**STANDING LESSON: derive against the REAL consuming module, never a re-implementation of its rules.**

**SEVERITY CORRECTION — the old claim was FALSE** (a wrong recorded claim is worse than a known bug). The retired
wording said *"a student who picks the CORRECT option is scored WRONG."* **That never happens:**
- **Server** `scoreObjective` → unresolvable key ⇒ `resolved:false` ⇒ defers to the model's BINARY verdict (still
  clamped 0/full). It never forces a wrong 0.
- **Client** `PracticeQuestionCard` → `correctIdx < 0` ⇒ the entire scoring branch is skipped (no `onMcqResult`, no
  `recordAttempt`).
**True symptom: the item renders with garbled options and SILENTLY NEVER SCORES — a dead question, not a mis-scored
one.** Still fix-before-launch, but it was never a correctness lie.

**FIX SHIPPED (PR #438): all 13 WITHHELD; ZERO were key-fixes.** An interim estimate of "~4 true key-fixes" was made
from 160-char previews and was WRONG — at full fidelity **every one has destroyed OPTIONS too** (duplicated / bare
single-token remnants / all four identical). Repairing the key alone leaves the item unanswerable, and authoring the
distractors would **FABRICATE a PYQ**. 2 are figure-dependent (`PYQ-S-2024-ELEC-001` "as shown" — attract-vs-repel is
undecidable without the figure; `CTRL-EXMPLR-6-MCQ-025` — options are "Option (a) as in figure" placeholders); 1
(`PYQ-S-2024-MAG-002`, positron) fails the syllabus gate outright. Bank 8,597 → **8,584**. All 13 are **pre-pymupdf
extraction damage** (mangled fractions `"9 2"`=9/2, `"𝟏 𝟗"`=1/9 in mathematical-bold unicode; MS boilerplate swept
into the key). Bodies kept INTACT in their packs per the WITHHELD lifecycle.
**Withheld ids:** CTRL-EXMPLR-6-MCQ-025 · PYQ-M-TRI-001 · PYQ-M-ARC-002 · PYQ-M-ARC-003 · PYQ-M-PROB-002 ·
PYQ-M-PROB-003 · PYQ-M-PROB-005 · PYQ-M-PROB-006 · PYQ-M-PROB-008 · PYQ-M-PROB-010 · PYQ-S-2024-LIGHT-001 ·
PYQ-S-2024-ELEC-001 · PYQ-S-2024-MAG-002.

- **CI landmine CLEARED:** `fullMockBlueprint.test.ts`'s strict key-resolves assertion passed only by seed luck.
  **0 unresolvable keys now remain**, so the draw can no longer surface one.
- **HOLD CLOSED — `CBE-S-MAGN-A-001` was NEVER a real defect.** It resolves fine under the real contract; it only
  ever appeared via the bad exact-norm scan. Its CLAUDE.md §5 conflict is moot (see the magnetic-effects ruling).
- **CLOSED — the "168 objective rows with no `options[]`" are NOT defects.** `isObjectiveType` returns true for **any**
  `section === "A"`, so 1-mark free-text VSA items (e.g. `2026-TRIG-P1-A-001` *"write sin A"* → *"sin A = BC/AC."*)
  are classified objective. With no options they defer to the model's binary verdict — correct for a 1-mark
  all-or-nothing item. **No action; do not "fix" these.**
- **Superseded:** the retired per-class fix rules and the "6 REP2-* AR items" list — those ids resolve under the real
  contract. The "~86 broken `.pyq` rows" figure in `objectiveScoring.cjs`'s own comment is likewise an over-count
  from the same exact-norm method.

### [FU-BANK-MCQ-REEXTRACT] — recover the 13 withheld rows from source (own PR, owner-split)
Recoverable ONLY by re-extracting from the source papers with **pymupdf** (`pdfplumber` is BANNED — it cannot decode
CBSE subset fonts and produced this damage). Sources confirmed present: `Desktop/diff/cbse-papers/PYQ/X question
papers/` (22/23/24/25/26 × math+sci); pymupdf 1.27.2 verified importable, extracts these PDFs with **0 `(cid:`
artifacts**. Recovered ⇒ real options + real key, delete the id from `WITHHELD_QUESTION_IDS`. Not recoverable ⇒ stays
withheld. **Never guess a distractor.** Exception: `PYQ-S-2024-MAG-002` stays withheld regardless — positron is out of
syllabus, not an extraction problem.

## ★ SURFACE REACHABILITY — VERIFIED 2026-07-15. ALL FOUR SURFACES SOURCE THE CANONICAL BANK.
**[FU-QP-WORKSHEET-BANK-SOURCING] is WITHDRAWN — its premise was disproven. Do NOT re-file it.**
A prior investigation concluded Quick Practice and the Worksheet Generator were NOT reachable from
`canonicalQuestionBank` (i.e. the expansion would be invisible on the two surfaces students use most). **That is
FALSE.** Verified EMPIRICALLY by importing the real modules and CALLING them:
```
canonicalQuestionBank            = 8597
PredictionCore.getAllQuestions() = 8838   (= 8597 canonical ∪ 241 predicted-only)
  of which are canonical ids     = 8597   ← every bank row is in the engine pool
generatePracticeSet(...)         → maths/trigonometry 10/10 canonical · science/electricity 10/10 canonical
generatePracticeQuestions(...)   → Maths/trigonometry 8/8 · Science/electricity 8/8 canonical
```
**THE TRANSITIVE-HOP TRACE — read this before concluding anything from a direct-import grep:**
```
Quick Practice   practiceQuestionBuilder.ts:3,168  generatePracticeSet(...)
  → practiceSetGenerator.ts:14   import { PredictionCore } from "./predictionCore"
  → practiceSetGenerator.ts:248  PredictionCore.getLikelyQuestionsForConcept(...)
  → predictionCore.ts:345        returns unifiedQuestionBank
  → predictionCore.ts:193        unifiedQuestionBank = dedupeById([...stampedCanonical, ...predicted])
  → predictionCore.ts:185        stampedCanonical = canonicalQuestionBank.map(...)     ← THE BANK
Worksheet Gen    pages/app/Worksheets.tsx:5        generatePracticeQuestions(...)
  → predictionDataService.ts:9   import { PredictionCore } from "./predictionCore"
  → predictionDataService.ts:53  pool = PredictionCore.getLikelyQuestionsForConcept(topicKey)   ← THE BANK
Chapter Test     bankQuery.ts:41-45 selectBankQuestions → canonicalQuestionBank (exact resolveCanonicalSlugSet)
Full Mock        fullMockBlueprint.ts:6-9 DUAL-SOURCE UNION (canonical + predicted)
```
**TWO TRAPS that produced the wrong conclusion — do not fall into them again:**
1. `practiceQuestionBuilder.ts:455` declares a local named **`bankQuestions`** — it is fed by
   `engineQuestions`/`packQuestions`, **NOT** the canonical bank. A variable's NAME is not evidence of its SOURCE.
2. `practiceSetGenerator.ts:6` contains the string `canonicalQuestionBank` **in a COMMENT ONLY**. A `grep -l` for the
   bank matches this file and implies an import that does not exist. `predictionDataService.ts` imports exactly two
   things (lines 8–9): a type, and `PredictionCore`. It imports **no** `predictedQuestions`.
**Conclusion: the expansion lands in QP + Worksheet + CT + FM. Reachability is NOT a launch blocker.**

## TOPICS REMAINING (12 = 6 Maths + 6 Science) — extract-max A/B/C + scarce D/E/proof ≥75-distinct-or-honest-stop
(Ground truth vs `topics.ts`: 26 canonical slugs = 13 Maths + 13 Science; 14 DONE = real-numbers + quadratic-equations +
polynomials + pair-of-linear-equations + arithmetic-progression + triangles + coordinate-geometry [7 Maths] + life-processes +
our-environment + how-do-organisms-reproduce + heredity + chemical-reactions-and-equations + acids-bases-and-salts +
metals-and-non-metals [7 Science] → 12 remain.)
Maths (6): trigonometry · circles · areas-related-to-circles · surface-areas-and-volumes · statistics · probability.
Science (6): carbon-and-its-compounds · light-reflection-and-refraction · human-eye-and-colourful-world · electricity ·
magnetic-effects-of-electric-current · control-and-coordination.
**NEXT batch (Batch 12, 3-per-PR, continuous run) = trigonometry + circles + carbon-and-its-compounds** (2 Maths + 1 Science,
interleaved for subject balance). Owner/next window may re-pick the trio; keep to the per-topic discipline within the bundle.

### ★ LIVE CENSUS of the 12 remaining — emitted 2026-07-15 from `topickey_runtime_proof.mjs --emit` over the 8,597
bank (i.e. PRE-#438; #438 withholds 13 → 8,584, none of which are D/E rows, so the D/E columns below stand).
**RAW counts — the honest baseline. Do NOT restate them with the step-compliant numbers** (see
[FU-BANK-SCARCE-BAND-MISBANDING]; the compliant subset is shown SEPARATELY, never as the baseline).

| topic | Total | A | B | C | **D** | **E** | D compliant | E compliant |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| trigonometry | 419 | 137 | 90 | 95 | **61** | **36** | 51 | 35 |
| circles | 229 | 81 | 47 | 68 | **23** | **10** | 21 | 10 |
| areas-related-to-circles | 227 | 89 | 47 | 54 | **20** | **17** | 12 | 14 |
| surface-areas-and-volumes | 197 | 73 | 24 | 36 | **45** | **19** | 30 | 14 |
| statistics | 202 | 70 | 26 | 58 | **28** | **20** | 11 | 16 |
| probability | 221 | 95 | 35 | 53 | **16** | **22** | 10 | 19 |
| carbon-and-its-compounds | 273 | 112 | 54 | 57 | **39** | **11** | 29 | 9 |
| light-reflection-and-refraction | 767 | 340 | 155 | 176 | **80** | **16** | 66 | 15 |
| human-eye-and-colourful-world | 210 | 86 | 47 | 42 | **24** | **11** | 12 | 11 |
| electricity | 309 | 97 | 74 | 68 | **52** | **18** | 39 | 18 |
| magnetic-effects-of-electric-current | 238 | 97 | 60 | 46 | **27** | **8** | 21 | 7 |
| control-and-coordination | 272 | 122 | 72 | 39 | **29** | **10** | 21 | 10 |

Remaining topics hold **3,564** of 8,597 (41%); the 14 done hold 5,033. Nominal scarce-band gap to ≥75 = **1,163**
(Maths 583 + Science 580) BEFORE honest-stops — **expect far less**. Notes: `light-reflection-and-refraction` needs
**NO D work** (80 ≥ 75) — extract-max + E only. Circles / areas-related-to-circles / statistics / probability are
narrow-or-saturated ⇒ expect honest-stops ~40–65. `magnetic-effects` narrows further under the Motor/EMI/Generator
ruling ⇒ expect a HARD low stop on both bands. **Regenerate the census from a fresh dump before each batch.**
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

## ★ PACKAGING — 3 TOPICS PER PR (4 PRs for the remaining 12). RATIFIED 2026-07-15.
A proposal to bundle **6 topics per PR** (one all-Maths PR + one all-Science PR) was **considered and REJECTED** by
the owner on evidence. Recording the reasoning so it is not re-proposed:
- **OWNER BYTE-REVIEW catches what the skeptics + the full mechanical gate stack pass.** This lane's own batch log:
  Batch 4 — *"owner byte-review caught Class-12 pyramid content → 4 reframed"*; Batch 8 — the "Class-11" mislabel of
  sum/product-of-roots, which drove the standing syllabus-anchor process-fix. **2 of 11 batches.**
- **Student QA CANNOT catch this class** — a 15-year-old cannot know an energy-pyramid item is Class-12.
- **[FU-BANK-SCARCE-BAND-MISBANDING] proves it again:** 76 mis-banded rows sit in topics that ALREADY passed
  skeptics + gates + review. The controls are good but not sufficient; **diff size is the remaining variable.**
- 3-per-PR is this lane's own proven cadence (Batches 10 & 11). 6-per-PR would be **double the largest ever tried**,
  on the two subjects with the hardest syllabus boundaries.
**Per-topic RIGOR is unchanged either way** (live syllabusGuard read per chapter, engine-reachability step 6,
independent skeptics, full gate stack, canonical slugs, pymupdf-only, `isPYQ` omitted). Keep the Maths/Science
pipeline balance the lane already follows.

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
- **Batch 11 → the internal ANGLE-BISECTOR THEOREM (BD/DC = AB/AC) is OUT of Triangles for 2026-27** ("proof of various theorems"
  was trimmed) — 2 D items asserting it were dropped. BUT the CLOSE nuance (a precise both-directions call): PF-015 (corresponding
  angle bisectors of SIMILAR triangles are proportional, proved via AA similarity) was KEPT — it is in-syllabus similarity, NOT
  the deleted standalone angle-bisector theorem. Also confirmed OUT (already guard-banned): coordinate-geometry AREA-FROM-COORDINATES
  (~28 source items dropped) and metals Periodic Classification (Ch5). This adjudication is CLOSED (an in-syllabus determination was
  made per topic); syllabusGuard was NOT edited.
Both: when a boundary call is uncertain, anchor to the OFFICIAL CBSE 2026-27 PDF + live `syllabusGuard.ts`, propose (never
silently commit) any guard edit, and prefer INCLUDING genuine in-syllabus content over a memory-driven exclusion.

- **★ 2026-07-15 → MAGNETIC-EFFECTS: the chapter is RETAINED and EXAMINED; Motor / Electromagnetic Induction /
  Electric Generator are OUT of board-prep authoring.** Owner-ruled + confirmed against the OFFICIAL 2026-27 PDF
  (`cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Science_SecP1_2026-27.pdf`, the exact URL
  `syllabusGuard.ts` cites; located via the official curriculum index `curriculum_2027.html`; extracted with
  **pymupdf**, 0 `(cid:` artifacts — WebFetch could not decode it at all).
  - **Unit IV "Effects of Current" = 13 marks in the Annual Examination** (course-structure table: I 25 · II 25 ·
    III 12 · **IV 13** · V 05 = 80). The chapter is examined.
  - **Examinable magnetic content (verbatim):** *"Magnetic effects of current: Magnetic field, field lines, field due
    to a current carrying conductor, field due to current carrying coil or solenoid; Force on current carrying
    conductor, Fleming's Left Hand Rule, Direct current. Alternating current: frequency of AC. Advantage of AC over
    DC. Domestic electric circuits."*
  - **Formative-only carve-out (verbatim, immediately following):** *"The following topics are included in the
    syllabus but will be assessed **only formatively** … **without adding to summative assessments** … **Motor,
    Electromagnetic Induction, Electric Generator**"*. Board-prep = board-EXAM prep ⇒ formative-only content is by
    definition not board-examined ⇒ **do not author board-prep D/E on it**. syllabusGuard's silence at bank level is
    an ABSENCE OF ENFORCEMENT, not a licence. Take the honest low stop; report the distinct-method inventory.
- **★ THE "NOTE FOR TEACHERS" TRAP — why magnetic-effects was wrongly dropped, and why it must not happen a 3rd time.**
  The same official PDF says (verbatim): *"1. The topics Periodic Classification of Elements; **Heredity and
  Evolution**; and **Electric Effects of Electric Current** will not be assessed in the year-end examination."*
  Read LITERALLY that drops the whole magnetic chapter — **this sentence is almost certainly what caused the wrongful
  drop and what `CLAUDE.md` §5 still encodes.** **It cannot mean that**, on the document's own evidence: Unit IV is
  worth 13 marks, Unit IV explicitly LISTS the magnetic content above as syllabus, and Unit IV's carve-out names
  PRECISELY THREE items — Motor, EMI, Generator — not the chapter.
  **THE PATTERN (the decisive proof):** the Note names **CHAPTER TITLES loosely**, while each Unit's carve-out names
  **PRECISE SUBTOPICS**. The Heredity pair proves it — Note 1 also says "Heredity and Evolution", yet Unit II's
  carve-out lists only the *Evolution* subtopics ("Acquired and Inherited Traits, Speciation, … Human Evolution"),
  which is exactly why **`syllabusGuard` correctly bans only Evolution while KEEPING Heredity/Mendel/sex-determination**
  — a call the owner independently verified. **Same logic ⇒ only Motor/EMI/Generator are formative-only; the rest of
  magnetic effects is examinable.** ("Electric Effects of Electric Current" is itself an apparent typo.)
  **RULE: when the Note for Teachers and a Unit carve-out disagree, the Unit's PRECISE SUBTOPIC list governs.**
  **`CLAUDE.md` §5 (calling magnetic-effects deleted/banned) is STALE — FLAGGED for the owner, deliberately NOT
  edited (outside content scope; owner's call). syllabusGuard was NOT edited.**

## RESUME (for a fresh Fable window — this file + the task file are the source of truth)
0. **State @ 2026-07-15:** bank **8,584** (post-#438; 8,597 − 13 withheld). **14 topics done, 12 remain.**
   **NEXT = Batch 12 = trigonometry + circles + carbon-and-its-compounds** (3-per-PR × 4 PRs; see PACKAGING).
   Live per-topic census for all 12 is in TOPICS REMAINING. Open: #438 (awaiting owner byte-review + merge).
1. Re-derive trunk; `corepack pnpm@10.32.1 install --no-frozen-lockfile` in a fresh worktree from CURRENT trunk;
   `git checkout -- pnpm-lock.yaml`; run tsc via `./node_modules/.bin/tsc`.
   **Gotcha (2026-07-15):** a fresh worktree has NO `node_modules` — `tsc` then emits phantom
   `TS2688 Cannot find type definition file for 'node'/'vite/client'` errors that are NOT your change. Install first,
   or point tsc at the main checkout's binary for a quick data-only compile.
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
- 2026-07-15: **[FU-BANK-UNRESOLVABLE-MCQ-KEYS] CLOSED → PR #438** (branched from live trunk `a5691a7`; origin had
  advanced from `2864be9` mid-session — bank verified UNTOUCHED across those 8 tutor/equation commits, so the census
  held). **13 rows WITHHELD, not 34, and ZERO were key-fixes.** Bank 8,597 → **8,584**. Two corrections to the record:
  (a) the "34" was an exact trim+lowercase scan — the REAL grader contract forgives 21 (derive against the real
  module, never a re-implementation); (b) the "correct option scored WRONG" claim was FALSE — server defers to the
  model's binary verdict, client skips scoring entirely ⇒ true symptom = garbled + SILENTLY NEVER SCORES. An interim
  "~4 key-fixes" estimate (from 160-char previews) was WRONG — at full fidelity every one has destroyed OPTIONS too,
  so a key-only repair leaves it unanswerable and authoring distractors would fabricate a PYQ. CI landmine cleared
  (0 unresolvable keys remain). `CBE-S-MAGN-A-001` HOLD CLOSED (never a real defect — a scan artefact); the 168
  no-options rows CLOSED (legitimate 1-mark VSA under `isObjectiveType`'s `section==="A"`). Gates all green
  (tsc · mojibake · scope:guard · root **181/181** · ops matrix · step-6 runtime proof 8,584/0/0/26-of-26).
  Recovery split to **[FU-BANK-MCQ-REEXTRACT]** (pymupdf, own PR).
- 2026-07-15: **★ REACHABILITY VERIFIED — all four surfaces source the canonical bank; [FU-QP-WORKSHEET-BANK-SOURCING]
  WITHDRAWN (premise disproven).** QP and Worksheet reach the bank one transitive hop below their direct imports
  (`practiceSetGenerator`/`predictionDataService` → `PredictionCore` → `unifiedQuestionBank` ⊇ `canonicalQuestionBank`).
  Proven empirically by calling the real fns (10/10 and 8/8 canonical). Two traps recorded in the REACHABILITY
  section: a local named `bankQuestions` that is NOT the bank, and a `canonicalQuestionBank` mention in a COMMENT that
  makes `grep -l` imply a non-existent import. **The expansion IS visible to students.**
- 2026-07-15: **★ owner's live "cosec 60°" bug ROOT-CAUSED → [FU-BANK-SCARCE-BAND-MISBANDING] filed.** `TG3-056` is a
  CANONICAL BANK ROW (D/5mk/Easy, 3 steps) — the bank is served faithfully; the BANK is wrong. Systemic: **76
  objective-format rows (MCQ/AR, 4 options) at section D / 5 marks** (grader clamps 0-or-5; reaches CT/FM Section D)
  + ~178 under-stepped D/E solutions, across 16 topics. Own PR(s), class (a) first. Also filed
  **[FU-TOPICMATCHES-SUBSTRING-CONFLATION]** (`circles` ↔ `areas-related-to-circles`, the ONLY colliding pair of 26 —
  both in the remaining Maths set) and **[FU-REACHABILITY-TEST-SCOPE]** (step 6 asserts bank integrity, never surface
  sourcing). **Owner ratified 3-TOPICS-PER-PR (4 PRs) over a proposed 6-per-PR** — byte-review caught real syllabus
  errors in 2 of 11 batches that skeptics+gates passed, and diff size is the remaining variable.
- 2026-07-15: **★ RULING — magnetic-effects is RETAINED & EXAMINED (Unit IV, 13 marks); Motor / Electromagnetic
  Induction / Electric Generator are OUT of board-prep authoring** (official 2026-27 PDF: assessed *"only
  formatively… without adding to summative assessments"*). The "Note for Teachers" trap that caused the original
  wrongful drop — and that `CLAUDE.md` §5 still encodes — is documented under SYLLABUS-BOUNDARY PRECEDENTS with the
  Heredity/Evolution pattern proof. §5 FLAGGED, not edited (owner's call). syllabusGuard NOT edited.
- 2026-07-13: Batch 11 (triangles + coordinate-geometry + metals-and-non-metals) MERGED #419 (`69e319d`) +315 — SECOND 3-topics-per-PR
  batch. triangles +127 (294→421: extract 18 A/B/C + authored D 44 + PROOF 20 [7 D-weight + 13 C-weight] + case-E 45; scarce D 40→91 ·
  E 23→68) · coordinate-geometry +67 (232→299: extract 7 + D 13 + E 47; thin chapter, D honest-stop at 28) · metals-and-non-metals +121
  (299→420: extract 45 + D 28 + E 48; D 32→60 · E 10→58). BOUNDARY PRECEDENTS (owner-verified 2026-27): (a) internal ANGLE-BISECTOR
  THEOREM (BD/DC=AB/AC) is OUT ("proof of various theorems" trimmed from Triangles) → 2 D items dropped; BUT PF-015 (corresponding
  bisectors of SIMILAR triangles proportional via AA) KEPT — in-syllabus similarity, NOT the deleted standalone theorem; (b)
  coordinate-geometry AREA-FROM-COORDINATES stays OUT (guard-banned; ~28 source items dropped); (c) metals Periodic Classification
  (Ch5) OUT. Three per-topic skeptics dropped 9 (triangles 3, coord 4, metals 2); tsc caught 8 invalid `format` strings (fixed).
  Owner byte-review CLEAN; two-direction syllabus clean; all ids manifested. Bank → 8,597. 14 distinct topics done, 12 remain
  (exactly half — 4 more 3-topic batches). NEXT = Batch 12 = trigonometry + circles + carbon-and-its-compounds (2 Maths + 1 Science,
  interleave). Docs handoff = #<this PR>.
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
