# CFPQ-FIGURES-1 — FIGURE BINDING AUDIT · THE DURABLE RECORD

**2026-09-10 · audited at trunk `c17f35ed` plus the (then unpushed) Electricity chapter.**

★ **WHY THIS FILE EXISTS.** Nothing in the codebase records which figure bindings have been
checked against their question. A binding is `questionId`-keyed, so an exact match **looks
deliberate** and every reviewer assumes someone verified it. For 149 of 171 bindings, nobody
had — and 53 of those were showing students a stock photograph in place of the diagram the
question requires. This table is the only record of what was verified and what was not.

⚠ **`ops/.specs/` is gitignored and has lost documents. This lives in `ops/arcs/`, which is
tracked, deliberately.**

---

## HOW THE AUDIT WAS DONE

Every one of the 171 bindings was **opened as an image and read against its own question
stem and answer**. Not a filename check, not a sample. Where the figure showed a value the
answer depends on, the two were checked for arithmetic agreement.

Inventory parser sanity check (a silent under-parse would have made the whole audit
false-clean): `mathsFigureVisuals.ts` declared 123 / parsed 123; `scienceFigureVisuals.ts`
declared 48 / parsed 48; 0 questionIds unresolved against the assembled bank.

## RESULT

| state | bindings |
|---|---|
| **CORRECT** | **114** |
| **WRONG** — decorative image, no question data, on a `requiresDiagram: true` row | **53** |
| **UNCERTAIN** — could not tell; deliberately left bound | **4** |
| SHARED — one image, several rows, verified legitimate (counted inside CORRECT) | 7 bindings / 2 images |
| **total** | **171** |

### WRONG, by chapter (all Z3 maths)

| chapter | wrong / total |
|---|---|
| Pair of Linear Equations | **11 / 11** |
| Arithmetic Progression | 9 / 10 |
| Quadratic Equations | 7 / 10 |
| Trigonometry | 7 / 20 |
| Triangles | 6 / 10 |
| Probability | 4 / 15 |
| Areas Related to Circles | 3 / 6 |
| Coordinate Geometry | 3 / 14 |
| Surface Areas & Volumes | 2 / 4 |
| Real Numbers (Z3) | 1 / 2 |
| Circles | 0 / 1 |
| **Statistics** | **0 / 10** |
| Science (Light etc.) | 0 / 36 |
| CFPQ maths + Electricity | 0 / 22 |

### The 53 removed by #750

`Z3-PLE-001…010` (PLE-008 twice) · `Z3-AP-001…009` · `Z3-QE-001,002,003,004,005,008,009` ·
`Z3-TG-005,008,009,102,103,105,108` · `Z3-TR-002,003,004,005,008,009` ·
`Z3-PR-003,004,005,009` · `Z3-ARC-002,003,005` · `Z3-CG-001,003,005` · `Z3-SAV-004,006` ·
`Z3-RN-004`

### The 4 UNCERTAIN — still bound, on purpose

| id | why |
|---|---|
| `FND-L-QB-107` | Stem asks which **marked** angles i, r, e are correct. The image carries no letters at all — unlabelled arcs, no arc at the emergence point. Unanswerable as bound. Cannot tell whether the source lacked labels or the crop lost them. |
| `FND-L-QB-175` | Stem: ink mark viewed **normally** through a plano-convex lens. Figure labels faces r₁/r₂ and draws an **oblique** ray — looks like a different plano-convex question's figure. |
| `Z3-QE-006` | Sheep pens: rectangle partitioned as described, but no labels or dimensions. |
| `Z3-ARC-004` | Picture frame with magnified corner join; structurally relevant, no dimensions. |

⛔ **These were NOT resolved by reasoning.** Resolving an unclear binding by argument is
exactly how 149 unverified bindings came to look settled.

### SHARED — the only two images bound to more than one question

| image | rows | evidence |
|---|---|---|
| `cfpq-s-lght-004.webp` | `CFPQ-S-LGHT-004`, `-005` | Both stems describe the same event (concentrating sunrays on paper with a spherical mirror) and their `diagramDescription` strings are **identical**. Opened because it looked like a copy-paste slip; it is correct. |
| `CFPQ-S-ELEC-001.webp` | `CFPQ-S-ELEC-001…005` | The booklet prints one case-study stimulus on pdf page 100 — *"answer four out of five following questions"* — and all five refer to that one circuit. |

**Nothing else in 171 is shared.** So "the same diagram on several questions" was never
caused by the binder.

---

## ★ THE STATISTICS CONTROL — WHY THIS IS AN OMISSION, NOT A HOUSE STYLE

All four Statistics questions carry a **real frequency table**, and its five decorative
images sit **beside** those tables. Same authoring lane, same period, both patterns present.

⇒ Decorative imagery was **never intended to be the figure**. On the 53 rows the working
diagram is simply **absent**. That is what makes this a diagnosis rather than an opinion.

## ★ AND THE 114 CORRECT BINDINGS WERE BOUND BY EYE — TWO SWAP-TRAPS PROVE IT

- `FND-L-QB-030` / `-043`: near-identical "Box" figures differing **only** in converging vs
  diverging output. Each matches its own answer (convex / concave lens).
- `FND-L-QB-150` / `-160` / `-171`: three near-identical prism figures with **three different
  answers**. Each marking arrangement matches its own.

A rule-based binder would very likely have mixed both sets. It did not. Verification tells
you what to **trust**, not only what to fix.

## SELF-CHECKS — 31 rows carried an arithmetic or geometric identity, all passing

| row | identity |
|---|---|
| `Z3-CG-008` | figure prints A(2,8), B(7,7), C(5,3) — the stem's three coordinates verbatim |
| `SQP-S-2025-LGHT-033` | labelled 20 cm and 10 cm ⇒ 1/f = −1/10 + 1/20 ⇒ **f = −20 cm** |
| `CFPQ-S-LGHT-014` | labelled 5 cm with f = 3 ⇒ **v = 7.5 cm** |
| `FND-L-QB-004` | object rotated 180° reproduces option **(C)** cell for cell |
| `FND-L-QB-157` | rays **through** X at 20 cm, **reflected** from Y at 25 cm ⇒ all four facts of the answer |
| `FND-L-QB-057` / `-106` | two near-twin slab figures yielding their **two different** answers digit by digit |
| `Z3-ST-003` / `-005` | 5+10+20+9+6+2 = **52**; 4+10+14+20+24+8 = **80**, matching printed totals |
| `CFPQ-S-ELEC-011` / `-014` | 6/0.3 = 20 Ω totalling 2.1 A; 0.5 A × 200 V = 100 W |

No self-check exists on a decorative image — by definition it shows no value to check.

---

## ⚠ WHAT IS KNOWN ABOUT WHETHER REAL Z3 DIAGRAMS EXIST

**A successor must not assume the 52 diagrams can simply be cropped from a source.**

I never opened the Z3 source document. What the in-repo data says, measured in
`competency.z3.ts`:

| Z3 rows | carry a prose `diagramDescription` | do not |
|---|---|---|
| kept (a real figure was bound) | 27 | 23 |
| **the 52 unbound** | **1** | **51** |

**51 of the 52 have no recorded description of what their diagram should show.** Nobody ever
wrote down what was meant to be there. Most are word problems — cost and revenue, mixtures,
salary progressions, probability from given percentages — where a diagram would have to be
**authored from scratch, not extracted**.

⇒ The successor lane's first question is therefore not "where do we crop these from" but
**"is `requiresDiagram: true` correct on these rows at all?"** For a linear-pair cost problem
it very likely is not, and the flag may be the defect rather than the missing figure. That is
a content ruling, deliberately left open here.

---

## THE LESSON

★ **"ALREADY DONE BY AN EARLIER LANE" IS NOT EVIDENCE.**

The spec for this arc required eye-confirmation of **new** bindings and treated existing ones
as settled. That one assumption kept 53 wrong figures live until the owner opened the app and
looked. No gate in this repo can catch it: `tsc` cannot see that a lawnmower is not a
linear-pair diagram, and the binding compiles, ships, and renders perfectly.

⇒ **Any lane inheriting prior work must state whether that work was ever verified. If nobody
knows, verifying it is part of the lane.** A count of existing bindings is not a count of
checked bindings.

**Corollary, now demonstrated:** Light's "already bound, no work needed" was an inherited
assumption when this arc began. It is now a **verified statement** — all 36 of its bindings
were opened, 34 correct and 2 uncertain. That difference is the whole point.
