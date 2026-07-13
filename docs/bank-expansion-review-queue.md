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
