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
