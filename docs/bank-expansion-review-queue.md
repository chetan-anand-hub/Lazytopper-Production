# Bank-Expansion — Trusted-Student QA Review Queue

Every id below is a bank-expansion addition awaiting **trusted-student QA** (the human correctness gate).
Passed the mechanical gate stack + an adversarial skeptic (re-solve + distinctness), but review-FREE means
**no owner content review** — so the surfaces that serve these stay GATED until a student clears them.
Provenance is honest: `extracted` = real published question (solution reconstructed into the CBSE step
scheme from an unverified compilation → `AI_GENERATED_SOLUTION_IDS`); `authored` = AI question + solution
(`AI_GENERATED_QUESTION_IDS`).

## Batch 1 — real-numbers (2026-07-12) · 30 items

Before → after (served real-numbers count 195 → 225):

| Band | Section | Before | +Extracted | +Authored | After | Floor status |
|---|---|--:|--:|--:|--:|---|
| A | 1-mark | 71 | +4 | 0 | 75 | extract-max (no floor) |
| B | 2-mark | 52 | +4 | 0 | 56 | extract-max (no floor) |
| C | 3-mark | 45 | +2 | +1 proof | 48 | extract-max (C); proofs floored |
| D | 5-mark long | 14 | 0 | +7 | 21 | **HONEST STOP** — scarce, distinct ceiling |
| E | 4-mark case | 13 | 0 | +12 | 25 | **HONEST STOP** — scarce, distinct ceiling |

**Honest-stop note (per §4 band-scarcity policy):** real-numbers is a saturated thin chapter. The scarce
categories cannot reach 50 genuinely-distinct without number-swap padding — the chapter's real case/long/proof
methods are a small closed set already largely banked. Skeptic + dedup dropped 3 items (RNSD-001 out-of-syllabus
3-number gcd-lcm identity; RNSE-002 & RNSE-006 redundant seeds). Extract-max for A/B/C yielded only 10 net-new
(5 dups + 5 borderline + ~40 banned Euclid/decimal items correctly dropped). These are the genuine ceilings, not
a shortfall to backfill. Content-folder "Question Bank" (folder 13) real-numbers file was NOT swept — a possible
small extra A/B/C extract-max source [FU-EXTRACT-CONTENT-F13].

| id | section | marks | mode | subtopic |
|---|---|--:|---|---|
| RNX-A-001 | A | 1 | extracted | Fundamental Theorem of Arithmetic |
| RNX-A-002 | A | 1 | extracted | HCF and LCM by Prime Factorisation |
| RNX-A-003 | A | 1 | extracted | HCF and LCM by Prime Factorisation |
| RNX-A-004 | A | 1 | extracted | Irrational Numbers |
| RNX-B-001 | B | 2 | extracted | Fundamental Theorem of Arithmetic |
| RNX-B-002 | B | 2 | extracted | Fundamental Theorem of Arithmetic |
| RNX-B-003 | B | 2 | extracted | HCF and LCM by Prime Factorisation |
| RNX-B-004 | B | 2 | extracted | HCF and LCM by Prime Factorisation |
| RNX-C-001 | C | 3 | extracted | Fundamental Theorem of Arithmetic |
| RNX-C-002 | C | 3 | extracted | HCF and LCM by Prime Factorisation |
| RNSD-002 | D | 5 | authored | HCF and LCM by Prime Factorisation |
| RNSD-003 | D | 5 | authored | HCF and LCM by Prime Factorisation |
| RNSD-004 | D | 5 | authored | HCF and LCM by Prime Factorisation |
| RNSD-005 | D | 5 | authored | Real-World HCF and LCM Application |
| RNSD-006 | D | 5 | authored | Fundamental Theorem of Arithmetic |
| RNSD-007 | D | 5 | authored | HCF and LCM by Prime Factorisation |
| RNSP-001 | D | 5 | authored | Irrationality Proofs |
| RNSP-002 | C | 3 | authored | Irrationality Proofs |
| RNSE-001 | E | 4 | authored | Real-World HCF and LCM Application |
| RNSE-003 | E | 4 | authored | HCF and LCM by Prime Factorisation |
| RNSE-004 | E | 4 | authored | Real-World HCF and LCM Application |
| RNSE-005 | E | 4 | authored | Real-World HCF and LCM Application |
| RNSE-007 | E | 4 | authored | HCF and LCM by Prime Factorisation |
| RNSE-008 | E | 4 | authored | HCF and LCM by Prime Factorisation |
| RNSE-009 | E | 4 | authored | Real-World HCF and LCM Application |
| RNSE-010 | E | 4 | authored | Real-World HCF and LCM Application |
| RNSE-011 | E | 4 | authored | Real-World HCF and LCM Application |
| RNSE-012 | E | 4 | authored | Fundamental Theorem of Arithmetic |
| RNSE-013 | E | 4 | authored | Fundamental Theorem of Arithmetic |
| RNSE-014 | E | 4 | authored | Fundamental Theorem of Arithmetic |

## Batch 2 — real-numbers CORRECTIVE (2026-07-12) · 12 items

Corrective exhaustive re-sweep after Batch 1 under-extracted A/B/C (per [FU-BANK-EXPANSION-SOURCE-SWEEP]).
real-numbers 225 → 237. **Per-source sweep table** (candidates / DUP / banned-dropped / net-new kept):
QB_MCQ 2 · WS_2 3 · ADDQB 2 · cbjemacq01 4 · Maths-Std-practice 2 · jeep201 (shared) — total 13 kept, skeptic
dropped 2 structural twins (RNX2-C-003/-005) → **11 extracted A/B/C**. Plus a **D/E distinct-scenario
exhaustion audit** (owner item #4): inventoried 27 distinct real-numbers scarce methods, found ALL covered
except **perfect-cube FTA** → authored 1 (RN2SD-001). **Ceiling proven:** real-numbers supports only ~24
distinct D+E method-classes total (syllabus bars Euclid/decimal/CRT-staggered-start), so the scarce bands cap
far below 50 — this is the honest ceiling, not a shortfall. Two source items with WRONG printed answers were
dropped (anti-fabrication), not banked.

| id | section | marks | mode | subtopic |
|---|---|--:|---|---|
| RNX2-A-001 | A | 1 | extracted | HCF and LCM by Prime Factorisation |
| RNX2-A-002 | A | 1 | extracted | Fundamental Theorem of Arithmetic |
| RNX2-A-003 | A | 1 | extracted | Fundamental Theorem of Arithmetic |
| RNX2-A-004 | A | 1 | extracted | Fundamental Theorem of Arithmetic |
| RNX2-B-001 | B | 2 | extracted | HCF and LCM by Prime Factorisation |
| RNX2-B-002 | B | 2 | extracted | HCF and LCM by Prime Factorisation |
| RNX2-B-003 | B | 2 | extracted | Fundamental Theorem of Arithmetic |
| RNX2-C-001 | C | 3 | extracted | Fundamental Theorem of Arithmetic |
| RNX2-C-002 | C | 3 | extracted | HCF and LCM by Prime Factorisation |
| RNX2-C-004 | C | 3 | extracted | HCF and LCM by Prime Factorisation |
| RNX2-C-006 | C | 3 | extracted | HCF and LCM by Prime Factorisation |
| RN2SD-001 | D | 5 | authored | Fundamental Theorem of Arithmetic |

## Batch 3 — life-processes (2026-07-12) · 136 items

First SCIENCE batch — confirms the exhaustive-sweep fix (extract-max yielded 75 A/B/C vs saturated
real-numbers' ~23; the difference is real reservoir depth). life-processes **354 → 490**.

| Band | Section | Before | +Extracted | +Authored | After | Floor status |
|---|---|--:|--:|--:|--:|---|
| A | 1-mark | 146 | +55 | 0 | 201 | extract-max (no floor) |
| B | 2-mark | 79 | +10 | 0 | 89 | extract-max (no floor) |
| C | 3-mark | 83 | +10 | 0 | 93 | extract-max (no floor) |
| D | 5-mark long | 31 | 0 | +22 | 53 | **≥50 reached** — distinct |
| E | 4-mark case | 15 | 0 | +39 | 54 | **≥50 reached** — distinct |

**Exhaustive sweep (extract-max, 75 kept):** per-source table — cbjescco06 28 · cbjesccq06 21 · foundation
Q-bank 21 · foundation WS1 5 · CBSE Practise-Science 2 (candidates 100 / 10 DUP / 13 borderline / 77 net-new;
skeptic dropped LPX-A-015 bad MCQ key + LPX-C-013 redundant → 75). 20 carry a real `pyqYear`; 55 third-party
(honestly unlabelled). Solutions reconstructed → `AI_GENERATED_SOLUTION_IDS`.
**Scarce authoring (distinct, 61 kept):** Section-D ×22 (2 diagram-flagged: heart, respiratory system) +
case-based ×39 (skeptic dropped LPSE-004 out-of-scope). Both bands clear ≥50 with genuine distinctness —
life-processes has the rich reservoir real-numbers lacked. Provenance → `AI_GENERATED_PACK_SOURCES`.
3 skeptics re-solved all 139; 137 pass, 3 dropped.

**Extracted A/B/C (75):** LPX-A-003,005–014,016–020,022,023,025–027,029–061(excl 062),063 · LPX-B-003,005–011,015,021 · LPX-C-002,003,005,007–009,011,012,014,015.
**Authored Section-D (22):** LPSD-001…022.
**Authored case-based (39):** LPSE-001…040 (excl LPSE-004).
**Diagram-pass needed (2):** LPSD-009 (respiratory system), LPSD-018 (human heart) — `requiresDiagram:true`, described, figure deferred.

## Batch 4 — our-environment (2026-07-12) · 80 items

Ch15 (ecology). Demonstrates HONEST-STOP on both scarce bands (narrow chapter) vs life-processes clearing the
floor. our-environment **169 → 249**.

| Band | Section | Before | +Extracted | +Authored | After | Floor status |
|---|---|--:|--:|--:|--:|---|
| A | 1-mark | 85 | +35 | 0 | 120 | extract-max (no floor) |
| B | 2-mark | 37 | +13 | 0 | 50 | extract-max (no floor) |
| C | 3-mark | 28 | +3 | 0 | 31 | extract-max (no floor) |
| D | 5-mark long | 9 | 0 | +7 | 16 | **HONEST STOP** — 11 distinct methods, 4 pre-saturated |
| E | 4-mark case | 10 | 0 | +22 | 32 | **HONEST STOP** — 9 concept clusters exhausted |

**Exhaustive sweep (extract-max, 51 kept):** per-source — cbjesccq15 25 · cbjescco15 14 · QB_MCQ 16 (some
pruned in dedup); ~10 Ch16/Ch14 drift items dropped (forests/Chipko/fossil-fuel/energy-sources — the boundary
held); 1 source with a WRONG key corrected (OEX-A-006 "greatest biomass = Producers", not the source's
"herbivores"). Skeptic dropped 4 (2 ambiguous/beyond-depth A, 2 near-dup B). A×35 B×13 C×3.
**Scarce authoring (distinct, 29 kept):** Section-D ×7 (honest ceiling — 11 distinct 5-mark methods, 4 already
saturated in the 9 banked) + case-based ×22. Skeptic dropped 4 (3 "ecological pyramid" items = Class-12 scope,
1 near-dup). Both scarce bands honest-stop well below 50 — Ch15 is intrinsically narrow (correct, not a shortfall).
3 skeptics/2 passes over all 88 → 80 kept, 8 dropped (all syllabus-scope or redundancy; no factual errors).

**Extracted (51):** OEX-A-001,003–026,028–037 · OEX-B-001–009,012–015 · OEX-C-001–003.
**Authored Section-D (7):** OESD-001…007.  **Authored case-based (22):** OESE-001–005,007–014,017–024,026.
**Diagram-pass needed (2, ENRICHMENT — text/numeric-answerable):** OESD-001 (food web), OESD-005 (energy-flow pyramid).

## Batch 5 — how-do-organisms-reproduce (2026-07-13) · 148 items

Ch8 (large reservoir). E-band lifted off its floor of 8; D honest-stops (chapter already deeply covered on
5-mark items). how-do-organisms-reproduce **265 → 413**.

| Band | Section | Before | +Extracted | +Authored | After | Floor status |
|---|---|--:|--:|--:|--:|---|
| A | 1-mark | 112 | +28 | 0 | 140 | extract-max (no floor) |
| B | 2-mark | 71 | +13 | 0 | 84 | extract-max (no floor) |
| C | 3-mark | 37 | +13 | 0 | 50 | extract-max (no floor) |
| D | 5-mark long | 37 | 0 | +30 | 67 | **HONEST STOP** — chapter already deeply covered; distinct methods exhausted below 75 |
| E | 4-mark case | 8 | 0 | +64 | 72 | **HONEST STOP at 72 distinct** — 3 structural twins dropped in preference to padding to 75 |

**Exhaustive sweep (extract-max, 54 kept):** per-source — `03_Biology.pdf` module (repro section) primary A/B/C ·
NCERT Solutions Ch8 (3 exact-text DUP dropped) · `13. Question Bank MCQ` REPRODUCTION (147 MCQs, richest A-band;
1 DUP + 4 near-twin dropped) · `11. Chapter-Wise` WS_2 heavily Class-12/wrong-chapter contaminated → minimal ·
`14. Additional QB` has NO reproduction chapter (proven by full listing) · gdrive PYQ/MS/Class-X = thin slice,
overlaps the 26 banked PYQ rows → 0 unique. Candidate pool 62 → 4 mechanical DUP + 4 near-twin borderline dropped
= 54 (A×28 B×13 C×13). Rejected as Class-12/deleted: triple fusion/double fertilisation/endosperm ploidy,
embryo-sac cells, micro/megasporogenesis, detailed FSH/LH/estrogen/progesterone cycle timing, ART/IVF,
geitonogamy, figure-dependent diagram-MCQs, life-processes contamination in WS_2. No evolution content.
**Scarce authoring (distinct):** Section-D ×30 (honest ceiling — 37 banked D already span plant + human
reproduction; ~8 more would have been number-swaps) + case-based ×64 (E1 plant/asexual ×34 + E2 human/health ×30).
3 skeptics independently re-solved all 151 → 54/54 + 30/30 + 67/67 PASS on correctness/syllabus/format; then
1 factual FIX (E1-004 Plasmodium "cyst" → schizogony) + 3 structural twins dropped (E1-022 Planaria≈E1-003,
E2-023 contraception≈E2-007, E2-019 undescended-testis≈E2-006 & a banked D item). Net 148 kept.

**Extracted (54):** BX-REP-EX-A-001–011,013–024,028–032 · BX-REP-EX-B-001–004,006,007,009,010,012–016 ·
BX-REP-EX-C-001–006,008–014.
**Authored Section-D (30):** BX-REP-D-001…030.
**Authored case-based (64):** BX-REP-E1-001–021,023–035 (plant/asexual, excl E1-022) ·
BX-REP-E2-001–018,020–022,024–032 (human/health, excl E2-019,E2-023).
**Diagram-pass needed: none** — all "draw & label" items are student-produced (text-answerable); no
question depends on a figure the student must be shown.

## Batch 6 — heredity (2026-07-13) · 44 items

Ch9-heredity portion (Ch9 evolution section is board-deleted). A NARROW, already-saturated chapter (219 banked) —
modest yield by design; BOTH scarce bands honest-stop far below 75 (Punnett crosses and pedigrees are structurally
repetitive, so distinct *principles* are finite). heredity **219 → 263**.

| Band | Section | Before | +Extracted | +Authored | After | Floor status |
|---|---|--:|--:|--:|--:|---|
| A | 1-mark | 91 | +15 | 0 | 106 | extract-max (no floor) |
| B | 2-mark | 45 | +4 | 0 | 49 | extract-max (no floor) |
| C | 3-mark | 52 | +2 | 0 | 54 | extract-max (no floor) |
| D | 5-mark long | 21 | 0 | +11 | 32 | **HONEST STOP** — 11 distinct genetic principles; the rest twin existing/authored crosses |
| E | 4-mark case | 10 | 0 | +12 | 22 | **HONEST STOP** — 7 Mendelian + 5 human-genetics distinct patterns; sex-det/pedigree bands saturated |

**Exhaustive sweep (extract-max, 21 kept):** every local source is the pre-2026 "Heredity AND Evolution" chapter,
so ~50% of each was BANNED evolution — Bio module `03_Biology.pdf` (pp.28–53) · `13. Question Bank MCQ` (101 MCQ) ·
NCERT Ch9 solutions (all already banked) · `11.` WS_4 · Meridian chapter set · gdrive PYQ (all already banked).
Candidate pool 24 → skeptic dropped 3 (BX-HER-EX-C-002 roan-cattle CODOMINANCE mislabelled as incomplete-dominance
= Class-12 concept; BX-HER-EX-B-002 near-twin of A-009 "why 1:2:1"; BX-HER-EX-C-004 acquired-traits Lamarckian
boundary-adjacency) = 21 (A×15 B×4 C×2). Rejected at extraction (~75+ items): homologous/analogous/vestigial organs,
fossils, Darwin/Lamarck/natural selection, speciation + geographical/reproductive isolation, human evolution/origin
of life/Miller-Urey, Archaeopteryx/connecting links, atavism (all board-deleted evolution) + ABO codominance / Rh /
linkage (Class-12 depth). The pre-existing bank evolution leak was NOT used as license.
**Scarce authoring (distinct principles, honest-stop):** Section-D ×11 (law of dominance/segregation/independent-
assortment, incomplete dominance, test cross, genotype-vs-phenotype, carrier-skip pedigree, X-linked, variation
[Class-10 framing], Mendel's method, carrier×carrier probability) + case-based ×12 (E1 Mendelian crosses ×7 + E2
human-genetics ×5). 3 skeptics independently re-solved all 47 (every Punnett ratio + pedigree re-computed) →
D 11/11, E 12/12 PASS; extract 23/24 (1 hard reject applied) + 2 quality drops. Net 44 kept.

**Extracted (21):** BX-HER-EX-A-001…015 · BX-HER-EX-B-001,003,004,005 · BX-HER-EX-C-001,003.
**Authored Section-D (11):** BX-HER-D-001…011.
**Authored case-based (12):** BX-HER-E1-001…007 (Mendelian crosses/laws) · BX-HER-E2-001…005 (human genetics: pedigrees, X-linked, sex determination, hereditary material, heritable-vs-non-heritable variation).
**Diagram-pass needed: none** — all Punnett squares / pedigrees are student-produced from text (text-answerable);
no question depends on a figure the student must be shown.

## Batch 7 — chemical-reactions-and-equations (2026-07-13) · 136 items

Before → after (served chemical-reactions count 319 → 455). Large, clean reservoir; both scarce bands reached the ≥75 distinct floor.

| Band | Section | Before | +Extracted | +Authored | After | Floor status |
|---|---|--:|--:|--:|--:|---|
| A | 1-mark | 122 | +29 | 0 | 151 | extract-max (no floor) |
| B | 2-mark | 59 | +3 | 0 | 62 | extract-max (no floor) |
| C | 3-mark | 88 | +4 | 0 | 92 | extract-max (no floor) |
| D | 5-mark long | 39 | 0 | +36 | 75 | **≥75 REACHED** — 12 distinct construction families, no padding |
| E | 4-mark case | 11 | 0 | +64 | 75 | **≥75 REACHED** — 9 distinct real-world scenario families, no padding |

**Exhaustive sweep (extract-max, 36 kept):** per-source table —
Content folder-13 MCQ bank (`CHEMICAL REACTIONS AND EQUATIONS.docx`): 63 chem blocks → 31 dup + 5 off-topic bio
misfiles dropped → **29 A**. Content folder-11 worksheets (WS_1/Extra/Advance-redox): ~35 → 12 banked-classic dups +
**~15 Level-III Class-11/12 dropped wholesale (oxidation-number method, ion-electron/half-reaction balancing,
disproportionation, oxidation-state calc, redox coefficient balancing)** → **7 (3 B + 4 C)**. NCERT Exemplar Ch-1
(30 items): all already banked as `CHEM-EXMPLR-1-*` → 0. Content f14/f2/f12 + gdrive QB/Exemplar PDFs: 0 (theory-only /
image-only, no text layer). One figure-dependent MCQ (four coloured tubes → identify ZnSO₄) DROPPED not shipped
answer-less; one corrupted-key "Rabidity" item dropped not silently re-keyed.
**Scarce authoring (distinct methods/scenarios, ≥75 reached):** Section-D ×36 across 12 construction families
(balance+classify sets, word→symbol balancing, comparative pairs, O/H-redox identification, corrosion mechanism/
prevention, rancidity, thermal/electrolytic/photolytic decomposition contrasts, observe+explain+balance,
precipitation sub-types, conservation-of-mass/state-symbols, evidence-of-reaction/reactivity-series prediction,
lime/oxidation chains) + case-based ×64 across 9 scenario families (corrosion/rusting ×12, rancidity ×5, exo/
endothermic ×5, decomposition ×11, displacement ×6, double-displacement/precipitation ×9, combination ×5,
oxidation-in-daily-life ×6, redox-definition/type-classification ×5).
**Skeptic pass (3 independent adversarial re-solves):** extract 36/36 clean (3 sub-threshold near-dups adjudicated
DISTINCT + kept; A-006 ambiguous "Dehydrogenation" distractor swapped to "Hydrogenation"). D 35/36 clean → 6 fixes
applied (D-016(iv) electron-transfer redox → O/H-based `2Mg+O2→2MgO`; D-028(v) Ca(OH)₂+CO₂ relabelled precipitation
not double-displacement; D-003(i) rust aligned to hydrated form; D-003/D-008/D-027 differentiated off template/subset
overlaps). E 61/64 clean → 3 fixes applied (E-039 limescale re-scoped from wrong double-displacement to thermal
decomposition of Ca(HCO₃)₂; E-055 "basic malachite" label dropped to match CuCO₃ equation; E-063 Fe+CuSO₄ colour
corrected to pale-green). **Two-direction syllabus clean:** no Direction-1 deleted-chapter drift; no Direction-2
Class-11/12 concept (oxidation numbers, EMF/electrode potential, thermodynamics/ΔH, kinetics/rate law, Kc/Kp
equilibrium constants, molar-mass stoichiometry). **Diagram-pass needed: none** — all 136 text-answerable
(`requiresDiagram:false`); zero figure-pending.

**Extracted A/B/C (36):** BX-CHEM-EX-A-001…019, A-022…031 (29; A-020/021/032 removed as gate near-dups) · BX-CHEM-EX-B-001…003 · BX-CHEM-EX-C-001…004.
**Authored Section-D (36):** BX-CHEM-D-001…036.
**Authored case-based E (64):** BX-CHEM-E-001…064.

## Batch 8 — quadratic-equations (2026-07-13) · 110 items

Before → after (served quadratic-equations count 224 → 334). First Maths topic since real-numbers (pipeline balance). D cleared ≥75; E honest-stopped (Class-10 quadratic case families are combinatorially finite).

| Band | Section | Before | +Extracted | +Authored | After | Floor status |
|---|---|--:|--:|--:|--:|---|
| A | 1-mark | 78 | +9 | 0 | 87 | extract-max (no floor) |
| B | 2-mark | 41 | +3 | 0 | 44 | extract-max (no floor) |
| C | 3-mark | 54 | +7 | 0 | 61 | extract-max (no floor) |
| D | 5-mark long | 29 | 0 | +47 | 76 | **≥75 REACHED** — ~13 distinct application families |
| E | 4-mark case | 22 | 0 | +44 | 66 | **HONEST STOP** — ~18 distinct scenario families; finite case space |

**Exhaustive sweep (extract-max, 19 kept):** per-source table —
Content folder-13 "Question Bank … MCQ" Quadratic Equations.docx (Q1–75): 75 cand → ~43 banked-dup + **~22 Vieta
sum/product-of-roots rejected (that's Polynomials Ch2 / Class-11)** → 10 A + 2 B. Content Classroom MODULE Unit-1
solved examples/exercises: ~20 → ~10 banked-dup + ~2 common-roots/formation-from-roots theory → 7 C + 1 B. NCERT
Exemplar ch4 (44 items): **entire chapter already banked** as `QE-N-EXMPLR-4-*` → 0. NCERT solutions docx: all
banked → 0. PYQ `_text` 2023 + gdrive 2024–26: all banked/Section-E → 0. The quadratic MCQ reservoir is
Vieta-heavy and largely saturated; net-new concentrated in specific-stem QB items + module application word-problems.
**Scarce authoring:** Section-D ×47 across ~13 application families (numbers/consecutive/multiples, ages,
price-quantity/shared-cost, rectangle area, triangle/Pythagoras area, speed–stream, work–pipes, digits, fractions,
nature-of-roots-via-discriminant, plot-subdivision area-difference, two-squares sum-of-areas). Section-E ×44 across
~18 scenario families (rectangle-with-path, perimeter+area, border/frame, projectile height=H-at-time [NOT vertex],
speed/stream/work, sharing, 3-side fencing, Pythagoras, tournament n(n−1)/2, AP-sum-as-quadratic, revenue=price×qty
target, numbers/fractions, ages, two-squares, profit%=CP).
**Skeptic pass (3 independent adversarial re-solves):** every quadratic re-formed, solved, root-rejection and
back-substitution verified. Extract 18/20 → 1 distinctness drop (A-006 = cosmetic clone of banked QE2-050, k²=36→±6;
A-008 defensible keep). D 45/47 → 2 correctness fixes (D-028 broken numbers: "5 more pens"→"6 more pens" so
x²+6x−720=(x+30)(x−24)→24; D-011 rejected-root display −12/11→−6/11) + trimmed 2 of 3 identical reciprocal-schema
items (dropped D-017/019, kept D-018) + added 2 genuinely-distinct non-reciprocal items (D-051 plot-subdivision,
D-052 two-squares) to hold ≥75. E 44/44 clean. **Cross-pack gate** (unique to consolidation) caught 3 extracted-C
vs authored-D twins → 3 authored D dropped (D-006/029/048), extracted versions kept (real content preferred).
**Syllabus CLEAN:** no Vieta sum/product-of-roots, no complex/imaginary roots, no inequalities, no cubic, no
vertex optimisation — all rejected at extraction/authoring/skeptic. Every MCQ key resolves to exactly one option.
**Diagram-pass needed: none** — all 110 text-answerable (`requiresDiagram:false`); zero figure-pending.

**Extracted A/B/C (19):** BX-QUAD-EX-A-001…010 (A-006 dropped → 9) · BX-QUAD-EX-B-001…003 · BX-QUAD-EX-C-001…007.
**Authored Section-D (47):** BX-QUAD-D-001…052 (gaps at 006/017/019/029/048 — dropped twins/cross-pack dups).
**Authored case-based E (44):** BX-QUAD-E-001…044.

## Batch 9 — polynomials (2026-07-13) · 62 items

Before → after (served polynomials count 190 → 252):

| Band | Section | Before | +Extracted | +Authored | After | Floor status |
|---|---|--:|--:|--:|--:|---|
| A | 1-mark | 77 | +8 | 0 | 85 | extract-max (no floor) |
| B | 2-mark | 41 | +1 | 0 | 42 | extract-max (no floor) |
| C | 3-mark | 50 | +4 | 0 | 54 | extract-max (no floor) |
| D | 5-mark long | 12 | 0 | +22 | 34 | **HONEST STOP** — low-weight chapter; distinct-method ceiling |
| E | 4-mark case | 10 | 0 | +27 | 37 | **HONEST STOP** — quadratic-parabola ask-mixes are finite |

**Syllabus anchor (CBSE 2026-27, verified vs live `syllabusGuard.ts` + official PDF):** Polynomials is restricted
to the **QUADRATIC** zeroes–coefficient relationship (sum = −b/a, product = c/a), symmetric functions of the two
zeros reducible to sum & product, forming a quadratic from its zeros, and the geometric meaning of zeros. The
~22 sum/product-of-roots (Vieta) items correctly filed OUT of the quadratic-equations batch (Batch 8) belong to
THIS chapter as core content — the bank already banks ~98 quadratic zeroes–coefficient items in A/B/C, and this
batch's D/E lean on that relationship. **OUT (rejected at extraction/authoring/skeptic, scanned as CONCEPT):**
cubic (or higher) zeroes–coefficient relationship (α+β+γ etc.), Division Algorithm for polynomials / finding all
zeros of a cubic/quartic by dividing a known factor (removed in 2026-27), complex/imaginary zeros (discriminant<0
stops at "no real zeros"). Reading the *number* of zeros of a cubic from a graph is IN (geometric meaning) — used
in E-023 only. Live syllabus guard: PASS both directions.

**Exhaustive sweep (extract-max, 13 kept — chapter saturated):** per-source table (candidates / banked-dup /
out-of-2026-27 / NET-NEW) —
folder-13 MCQ-with-explanation bank (78 Q): ~40 / ~14 / ~20 cubic+division / **6**; folder-14 Additional QB
(02_FINAL_Polynomials): ~30 / ~8 / ~18 / **2**; Meridian worksheets 2024: ~25 / ~16 / ~3 / **3**; gdrive
Chapter-wise MCQ (cbjemaco02): ~21 / ~8 / ~11 / **1**; NCERT Exemplar ch-2: ~25 / ~18 / ~5 / **1**; folder-11
WS_3_Polynomial: ~20 / ~9 / ~7+figure-only / **0**; gdrive 2298 Ch-2 2019-20: ~30 / ~14 / ~10 / **0**; gdrive
Previous-year (cbjemacq02): ~20 / ~6 / ~14 / **0**; folder-7 NCERT solutions: ~20 / ~15 / ~5 / **0**. The 190-item
bank already saturates the symmetric-function / zero-transformation / find-k / form-from-zeroes templates; net-new
A/B/C are the lexically-distinctive items (type/definition MCQs, factor-condition, "what must be added", squared-
difference, wrong-coefficient reconstruction, equal-zeroes). Un-readable source: gdrive Exampler `cbjemace02.pdf`
(scanned, no text layer — OCR needed) [noted, small].

**Scarce authoring — Section-D ×22** across the genuine distinct-method inventory: find-k from a symmetric
condition (α²+β², 1/α+1/β, 1/α²+1/β², α/β+β/α, α−β, α³+β³, zeros-in-ratio, reciprocal-zeros, sum=product,
shifted-product (α+2)(β+2)); prove an identity relating a symmetric function to coefficients (α²+β², (α−β)²,
1/α+1/β, α³+β³, 1/α²+1/β²); form a new quadratic from transformed zeros (scale 2α,2β; shift α+2,β+2; squares
α²,β²; negate −α,−β; sum-and-product as new zeros; ratio α/β,β/α); graph-read → form+verify (two intercepts;
repeated/tangent zero). **Section-E ×27** across distinct ask-mixes: recover coefficient from one zero / from a
condition; symmetric-function evaluation; transform-zeros→new quadratic; form-from-data (sum&product+feasibility,
perimeter→sum/area→product, table-read); pin leading coeff from y-intercept; compare two parabolas / common zero;
sign-positivity intervals; vertex=midpoint max (descriptive); symmetry equidistant from axis; graph-read type/count;
discriminant feasibility→no real zeros; factorise+reject non-physical zero.

**Skeptic pass (independent adversarial re-solve of all 63 candidates):** every item re-solved from scratch —
0 math errors, 0 bad MCQ keys (all resolve to exactly one option under grader normalization), 0 step-mark errors,
0 syllabus violations. Redundancy: **dropped D-016** (exact dup of a banked 2α,2β transform of 2x²−5x−3);
**renumbered E-015** (was numerically identical to D-001 → x²−12x+k, α²+β²=80, k=32, zeros 4,8) and **E-021** (was
identical to D-020 → zeros 7,−2 → x²+5x−14). Author self-dropped D-018 (reciprocal twin of a banked item) and 3
E structural twins during authoring. Cross-pack consolidation gate: 0 extract-vs-author twins, 0 id collisions.
**Diagram-pass needed: none** — all 62 text-answerable (`requiresDiagram:false`); zero figure-pending.

**Honest-stop note:** polynomials is a low-weight chapter — CBSE rarely sets 5-mark (Section D) items on it, so a
75-floor D band is pedagogically unnatural ([FU-DBAND-PEDAGOGICAL-FLOOR]). D=22 and E=27 are the genuine distinct
ceilings; every further variant would be a number-swap. Stopped rather than pad.

**Extracted A/B/C (13):** BX-POLY-EX-A-001…008 · BX-POLY-EX-B-001 · BX-POLY-EX-C-001…004.
**Authored Section-D (22):** BX-POLY-D-001…024 (gaps at 016 dropped-dup, 018 author-dropped twin).
**Authored case-based E (27):** BX-POLY-E-001…027.

## Batch 10 — pair-of-linear-equations + arithmetic-progression + acids-bases-and-salts (2026-07-13) · 410 items

First 3-topics-per-PR batch (owner speed directive). One branch, one `canonicalQuestionBank.ts` wire, one PR;
discipline unchanged per topic (own source table, own syllabusGuard boundary, own skeptic, ≥75-or-honest-stop).
Served bank 7,842 → 8,252.

### Per-topic before → after
**pair-of-linear-equations (223 → 356):**
| Band | Before | +Extract | +Author | After | Floor |
|---|--:|--:|--:|--:|---|
| A | 79 | +21 | 0 | 100 | extract-max |
| B | 36 | +4 | 0 | 40 | extract-max |
| C | 63 | +17 | 0 | 80 | extract-max |
| D 5-mk | 29 | 0 | +39 | 68 | **honest stop** |
| E 4-mk | 16 | 0 | +52 | 68 | **honest stop** |

**arithmetic-progression (235 → 349):**
| Band | Before | +Extract | +Author | After | Floor |
|---|--:|--:|--:|--:|---|
| A | 82 | +5 | 0 | 87 | extract-max |
| B | 41 | +4 | 0 | 45 | extract-max |
| C | 64 | +11 | 0 | 75 | extract-max |
| D 5-mk | 20 | 0 | +52 | 72 | **honest stop** (near 75) |
| E 4-mk | 28 | 0 | +42 | 70 | **honest stop** |

**acids-bases-and-salts (302 → 465):**
| Band | Before | +Extract | +Author | After | Floor |
|---|--:|--:|--:|--:|---|
| A | 144 | +42 | 0 | 186 | extract-max |
| B | 63 | +14 | 0 | 77 | extract-max |
| C | 56 | +11 | 0 | 67 | extract-max |
| D 5-mk | 27 | 0 | +36 | 63 | **honest stop** |
| E 4-mk | 12 | 0 | +60 | 72 | **honest stop** |

### Per-topic syllabus boundary (each verified separately vs live syllabusGuard.ts + 2026-27 rationalized NCERT)
- **PLE:** IN = graphical + substitution + elimination + consistency-by-ratios + linear word problems. OUT (rejected):
  Cross-Multiplication Method (guard-banned) AND **Equations-Reducible-to-a-Pair-of-Linear** (1/x,1/y type — removed
  in rationalized NCERT Ch3). Skeptic dropped EX-C-004 (reducible 1/u,1/v) on this basis.
  **[FU-SYLLABUS-GUARD-PLE-REDUCIBLE] — PROPOSAL for owner:** the guard bans only "Cross-Multiplication Method";
  add "Equations Reducible to a Pair of Linear Equations" (+ a test) to `syllabusGuard.ts`. Treated as OUT here
  (conservative); not committed to the guard pending owner (NCERT-verifier) confirmation.
- **AP:** IN = nth term + sum of n terms + applications. OUT (rejected): Geometric Progression / geometric mean /
  sum-to-infinity / Σn²–Σn³ / harmonic progression. Skeptic confirmed every scenario is genuinely arithmetic.
  **[FU-AP-BANKED-GP-ITEM]** (pre-existing, NOT this batch): a banked AP case item uses an 80%-rebound ball-bounce
  which is geometric, not arithmetic — flagged for a later cleanup lane (out of this add-only batch's scope).
- **ABS:** IN = qualitative pH + everyday pH, indicators, acid/base reactions, salts, chlor-alkali, baking/washing
  soda, bleaching powder, POP, water of crystallisation. OUT (rejected): quantitative pH=−log[H⁺], molarity/
  normality/titration calc, Ka/Kb/pKa, buffers, Bronsted-Lowry/Lewis, conjugate pairs, basicity classification.
  Softened E-005 wording ("titration"→"neutralisation experiment"; no calculation was present). Owner-awareness
  note (exam-conventional, unchanged): a few items use the persistent textbook "wasp sting is alkaline" claim.

### Verification
- **Cross-pack consolidation gate across ALL 3 topics** (multi-slug): 410 questions, 0 errors (also catches
  cross-topic twins). Local gate stack all PASS: tsc · runtime proof (8,252; 0 dup; 0 orphan; 26/26) · syllabusGuard
  (all 3 boundaries) · mojibake · scope:guard --mode product · root matrix (181) · ops matrix · git diff --check.
- **Three per-topic adversarial skeptics** independently re-solved every item (PLE 138, AP 125, ABS 163):
  - PLE: DROP 3 (EX-C-004 reducible; EX-C-015 single-equation-not-a-pair; D-004 banked twin) + 2 D twins of E items
    dropped (D-005≡E-007, D-039≡E-026). 133 clean.
  - AP: DROP 9 Section-D banked twins (D-002/003/004/008/014/022/037/043/066 — Jaccard flagged sub-threshold, skeptic
    confirmed genuine twins) + 2 E dropped for parameter-collision with kept D items (E-001, E-014). 114 clean.
  - ABS: 0 drop; FIX EX-A-015 MCQ option-normalization collision (MgO/MgO₂→"mgo"; swapped MgO₂→MgSO₄). 163 clean.
  - Every MCQ/AR key verified to resolve to exactly one option under grader normalization (incl. chemistry-subscript
    collisions — the [FU-BANK-UNRESOLVABLE-MCQ-KEYS] failure mode). Zero figure-pending — all text-answerable.

### Manifest — id ranges (gaps = skeptic/consolidation drops)
**pair-of-linear-equations (133):** BX-PLE-EX-A-001…021 · EX-B-001…004 · EX-C-001…020 (gaps 004,013,015) ·
BX-PLE-D-001…042 (gaps 004,005,039) · BX-PLE-E-001…052.
**arithmetic-progression (114):** BX-AP-EX-A-001…005 · EX-B-001…004 · EX-C-001…011 · BX-AP-D-001…074 (52 items,
non-contiguous — author + skeptic drops incl. 002,003,004,008,014,022,037,043,066) · BX-AP-E-002…044 (gap 014).
**acids-bases-and-salts (163):** BX-ABS-EX-A-001…042 · EX-B-001…014 · EX-C-001…011 · BX-ABS-D-001…036 ·
BX-ABS-E-001…060.

### Batch 10 follow-on — pair-of-linear-equations reducible-to-linear (+30; PLE 356 → 386)
**Owner correction:** "equations reducible to a pair of linear equations" (the 1/x=p, 1/y=q substitution family +
work-rate/boat-reciprocal word problems) is **IN-SYLLABUS** and board-important for CBSE 2026-27 (verified vs the
official NCERT Reprint). The main Batch-10 sweep wrongly treated it as OUT and shipped 0 such items; this follow-on
adds it on the same branch. **The earlier [FU-SYLLABUS-GUARD-PLE-REDUCIBLE] guard proposal is WITHDRAWN** — do NOT
add reducible-to-linear to `syllabusGuard.ts`. Cross-Multiplication Method stays OUT (correct).
- Subtopic: "Equations Reducible to a Pair of Linear Equations". Bands: A +3, B +2, C +3, D +9, E +13 = **30**.
- Pack: `pairOfLinearEquations.expand.reducible.ts` (`PLE_EXPAND_REDUCIBLE`). ids `BX-PLE-RED-EX-A/B/C-*`,
  `BX-PLE-RED-D-*`, `BX-PLE-RED-E-*`.
- Extract 8 (re-sweep of the previously-rejected reducible items — NCERT Ex 3.6 type + MCQ bank); D 9 + E 13
  authored, honest-stop (the reducible sub-space = 4 mechanisms: additive-rate 1/x+1/y, reciprocal-speed 1/(u±v),
  two-speed 1/u,1/v, pure/shifted/sum-diff substitution — all covered).
- Skeptic re-solved all 33 candidates: all math-correct + all genuinely reducible-to-linear (0 cross-multiplication,
  0 non-reducible-quadratic, 0 single-equation-fakes). Dropped 3 cross-pack twins (D-003≡C-002, C-004≡E-003,
  D-006≡E-010); fixed 1 banked coefficient-clone (C-003 → distinct 3/√x,2/√y coefficients). 30 clean.
- Gates re-run after add: tsc · runtime proof (8,282; 0 dup; 0 orphan) · syllabusGuard · mojibake · scope · both
  matrices · git diff --check — all PASS.

## Batch 11 — triangles + coordinate-geometry + metals-and-non-metals (2026-07-13) · 315 items

Second 3-topics-per-PR batch. One branch, one canonicalQuestionBank.ts wire, one PR; per-topic discipline
(own source table, own syllabusGuard boundary, own adversarial skeptic, ≥75-or-honest-stop). Served bank 8,282 → 8,597.

### Per-topic before → after
**triangles (294 → 421):** A 112→122 (+10), B 62→65 (+3), C 57→75 (+18: 5 extract + 13 proof-C), **D 40→91**
(+44 non-proof + 7 proof-D), **E 23→68** (+45). PROOF band = 20 items (7 D-weight + 13 C-weight).
**coordinate-geometry (232 → 299):** A 80→82 (+2), B 46→47 (+1), C 67→71 (+4), **D 15→28** (+13, honest-stop —
thin chapter), **E 24→71** (+47).
**metals-and-non-metals (299 → 420):** A 123→152 (+29), B 60→72 (+12), C 74→78 (+4), **D 32→60** (+28), **E 10→58** (+48).

### Per-topic syllabus boundary (each verified vs live syllabusGuard.ts + owner-verified 2026-27 encoding)
- **triangles:** IN = similarity/BPT+converse, AAA/SSS/SAS criteria, **areas-of-similar-triangles (ratio = squares
  of sides — guard permits it, so IN)**, Pythagoras+converse, and PROOFS of these. OUT = Constructions.
  **Skeptic adjudication (owner-anchored):** the internal **angle-bisector theorem (BD/DC = AB/AC) is OUT of 2026-27**
  (not in the prescribed list) — 2 authored D items asserting it were DROPPED (D-007, D-025). Kept PF-015 (proves
  corresponding angle-bisectors of SIMILAR triangles proportional via AA — that is in-syllabus similarity, NOT the
  banned theorem) and D-032 (Apollonius/median relation given in-stem as a competency application). All 20 proofs
  verified logically complete.
- **coordinate-geometry:** IN = distance + section formula (internal, incl. midpoint/centroid-by-average) ONLY.
  **OUT = area-of-triangle-from-coordinates (guard-banned), collinearity-via-area=0, external division, slope/line.**
  Extract dropped ~28 area-from-vertices/collinearity-via-area items across sources; skeptic caught + trimmed one
  residual area-leak (EX-C-003, then dropped as it collided with a banked item). Thin chapter → D honest-stop at 28.
- **metals-and-non-metals:** IN = properties/reactivity-series/ionic-bonding(qualitative)/extraction-enrichment/
  corrosion/alloys. OUT = Periodic Classification (Ch5), covalent-carbon bonding, Class-11/12 metallurgy detail
  (Mond/zone-refining/Ellingham/quantitative electrode-potential). Skeptic verified all balanced equations + formulae.

### Verification
- **Cross-pack consolidation gate across all 3 topics** (multi-slug — also catches cross-topic twins): 315, 0 errors.
- Local stack: tsc · runtime proof (8,597; 0 dup; 0 orphan; 26/26) · syllabusGuard (all 3 boundaries) · mojibake ·
  scope:guard --mode product · root matrix (181) · ops matrix · git diff --check — all PASS. (tsc caught 8 invalid
  `format` strings from subagents — `AssertionReason`/`Assertion-Reason`→`Assertion-Reasoning`, `SA`→`Short` — fixed.)
- **Three per-topic adversarial skeptics** re-solved all 324 candidates: dropped 9 (triangles 3, coord 4 incl. the
  area-leak, metals 2). Every MCQ/AR key resolves to exactly one option (incl. chemistry-subscript checks); all 20
  triangle proofs logically complete; zero figure-pending — all text-answerable.

### Manifest — id ranges (gaps = skeptic/consolidation drops)
**triangles (127):** BX-TRI-EX-A-001…010 · EX-B-001…003 · EX-C-002…006 (EX-C-001 dropped) · BX-TRI-D-001…046
(gaps 007,025 — angle-bisector-theorem) · BX-TRI-PF-001…020 · BX-TRI-E-001…045.
**coordinate-geometry (67):** BX-COORD-EX-A-001…002 · EX-B-001 · EX-C-001…005 (EX-C-003 dropped) · BX-COORD-D-001…013 ·
BX-COORD-E-001…050 (gaps 006,022,049).
**metals-and-non-metals (121):** BX-MNM-EX-A-001…029 · EX-B-001…012 · EX-C-001…004 · BX-MNM-D-001…028 ·
BX-MNM-E-002…050 (gaps 001,032).
