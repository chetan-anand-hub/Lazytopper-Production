# GAPS — concepts the tutor's explanation panel cannot show a figure for

Fable curation lane. Companion to `conceptFigureCatalogue.curated.ts` (and its wired twin
`lazytopper/src/pages/tutor/conceptVisualCatalogue.data.ts` — the two carry byte-identical rows).

**Precision-over-coverage rule:** a wrong figure is a wrong explanation. Nothing here was
stretched to fill a row. A concept with no genuinely fitting figure gets **no row at all**
(the panel simply doesn't open) or a `best.kind:"none"` gap row — never a near-miss picture.

**Status 2026-07-16 (catalogue: 73 rows / 112 boardEssentials concepts).**
Rewritten after the coverage-expansion pass. The previous version of this file was badly
stale: 5 of its 7 "hard gaps" were filled by the AI gap-fill lane in **#448**, and it still
listed pre-rename labels. Do not trust an old copy of this list — regenerate against the
live catalogue.

---

## 1. HARD GAPS — rows that exist but have NO figure (`best.kind:"none"`, `gap:true`)

Only **two** remain (down from seven).

| Topic | Concept | Why nothing fits | A figure that would help |
|-------|---------|------------------|--------------------------|
| areas-related-to-circles | Radius from a given circumference, diameter or area | The 2026-27 reprint DELETED the "Perimeter and Area of a Circle — A Review" section; ch.11 now opens at 11.1 Sector/Segment. No notes/interactive targets bare C=2πr / A=πr²; the bank's ARC images are decorative context photos. The skill is still tested (Ex 11.1 Q2). | Circle with radius r marked, C = 2πr and A = πr² annotated, rearranged to r |
| carbon-and-its-compounds | Functional groups (–OH, –CHO, –COOH, >C=O, –Cl, –Br) | No notes figure and no bank figure; only a keyword-heuristic concept stub. NCERT Table 4.3 (p.66) is a table, not an extracted asset. | Panel of the groups with one representative structure each (match Table 4.3 exactly — no generic –X, no F/I) |

**Filled since the last version (by #448, owner-approved — do NOT re-file these):**
circles · length of tangent ℓ=√(d²−r²) → `fig_tangent_length.svg`; human-eye · lens power
P=1/f → `fig_lens_power.svg`; human-eye · atmospheric refraction →
`fig_atmospheric_refraction.svg`; human-eye · scattering → `fig_scattering.svg`;
carbon · reactions of ethanol & ethanoic acid → `fig_ethanol_ethanoic_reactions.svg`.

> ★ The old entry for atmospheric refraction claimed "no NCERT figure exists". That was false —
> NCERT has **two** (Figs 10.9 and 10.10, both p.168). The claim was about *our catalogue*, not
> about NCERT. When writing a gap, say which is true: "we have no asset" ≠ "NCERT has no figure".

---

## 2. CONCEPTS WITH NO ROW — checked this pass, deliberately not added (39)

These are live boardEssentials rows whose topic has **no fitting extracted figure**. Adding a
row would either blank the panel or show a near-miss, so they stay absent.

**No extracted figure anywhere in the topic (17):** `real-numbers` (4), `quadratic-equations`
(4), `probability` (5) and `arithmetic-progression` (4). Their note-specs declare
`fig_factor_tree`, `fig_disc_triptych`, `fig_dice_sample_space` and `fig_ap_number_line`, but
all four are generator specs that **do not exist on disk**.
⇒ If the notes pipeline ever renders them, they become the natural `best` for those rows.

**Topic has figures, but none fits these concepts (22):**

| Topic | Concepts left without a row | Why |
|-------|------------------------------|-----|
| polynomials | zeroes↔coefficients, factorisation, forming a quadratic | The one figure (Fig 2.2 parabola) is the *geometrical meaning* only — it says nothing about α+β = −b/a |
| pair-of-linear-equations | consistency conditions, substitution, elimination, word problems | Fig 3.1 is one worked graph; the algebraic methods are text/steps, not pictures |
| statistics | median, mode, empirical relation | Table 13.3 is the *direct-method mean* table only |
| our-environment | ecosystem components, biological magnification, biodegradable waste, ozone depletion | The 4 figures are all food-chain/energy-flow; the trophic pyramid shows feeding levels, **not** "components" (no decomposers, no abiotic) — that would be the stretch |
| metals-and-non-metals | reactivity series, reactions of metals | Fig 3.10 *branches on* the activity series but does not present it; no figure for metal+O₂/water/acid |
| chemical-reactions | balancing equations, effects of oxidation (rancidity/corrosion) | Fig 1.1 is the burning experiment, not the balancing procedure |
| acids-bases-and-salts | neutralisation, common salts | No neutralisation figure. Fig 2.8 (chlor-alkali) yields NaOH/Cl₂/H₂ — only 1 of the 6 salts the row names; too partial to claim the row |
| how-do-organisms-reproduce | reproductive health, variation & DNA copying | No figure for either |

---

## 3. REAL FIGURES ON DISK WITH NO CONCEPT TO ATTACH TO

Good NCERT figures that stay unused because **no boardEssentials row names them**. Attaching
them would fail the CI label-drift guard. Listed so the vocabulary owner can decide whether the
missing thing is actually the concept row.

| Figure | Page | Note |
|--------|------|------|
| `control-and-coordination/fig_brain.webp` | p.104 (Fig 6.3) | Human brain — a heavily-tested diagram with **no** boardEssentials row |
| `circles/fig_positions_101.webp` | p.144 (Fig 10.1) | Line-and-circle positions (non-intersecting/secant/tangent) — no row |
| `light/fig_910.webp` | p.147 (Fig 9.10) | Refraction through a glass slab — no row |
| `heredity/fig_dihybrid_cross.webp` | p.131 (Fig 8.5) | Used as an *alternate* only; no dihybrid row exists |

---

## 4. SOFT GAPS — a row resolves, but the figure is partial (see each row's `scopeCaveat`)

- **triangles · BPT** — interactive only; no static DE∥BC figure (notes Fig 6.10 not extracted).
- **triangles · areas of similar triangles** — interactive only; **also flagged OUT** of the
  2026-27 chapter (notes `board_asks`: the chapter stops at SAS).
- **electricity · power / Joule's heating** — interactive only; formula-only concepts.
- **life-processes · transport in plants** — the leaf cross-section (p.82) shows the bundle but
  is not a xylem-vs-phloem transport schematic. (Its `ncertPage` correctly points at p.94,
  §5.4.2, where the concept is actually taught.)
- **control-and-coordination · tropisms** — static figures cover photo/geo only; no
  hydrotropism/chemotropism figure.
- **how-do-organisms-reproduce · asexual modes** — best shows fission; 3 of 6 modes have no figure.
- **chemical-reactions · types of reactions** — no single figure covers all four types.
- **acids-bases · properties of acids and bases** — acid-with-metal only; bases not depicted.
- **pair-of-linear-equations · graphical method** — intersecting case only.
- **statistics · mean of grouped data** — direct method only.

---

## 5. ROWS WITH NO NCERT PAGE (honest absence)

`ncertPage` is populated on **65 of 73** rows. The 8 without one, and why — in each case the
affordance simply hides rather than pointing somewhere wrong:

| Topic | Concept | Why no page |
|-------|---------|-------------|
| triangles | Areas of similar triangles ∝ (sides)² | Out of the 2026-27 chapter (stops at SAS) |
| triangles | Pythagoras theorem (a²+b²=c²) | Proofs no longer in the chapter; applications only |
| areas-related-to-circles | Radius from a given circumference… | Its source section was deleted in the reprint |
| areas-related-to-circles | Area of combinations of plane figures | Combinations are out of the trimmed chapter |
| surface-areas-and-volumes | Cylinder, cone and sphere — SA & volume | ch.12 (2026-27) teaches *combinations*; the individual-solid formulae are Class 9 |
| trigonometry | Heights & distances setup | Lives in Maths **ch.9** "Some Applications of Trigonometry" — which has **no note-spec and no entry in `ncertPdfOffsets.ts`**, so no PDF can be opened. See §7. |
| coordinate-geometry | Area of a triangle from coordinates | Removed from Class-10 2026-27 |
| heredity | Genotype vs phenotype | The words "genotype"/"phenotype" appear **nowhere** in the rationalised ch.8 — the row is editorial vocabulary. Fig 8.3 does show the distinction, so the row exists; the page does not. |

---

## 6. DATA-QUALITY FLAGS surfaced during this pass (not figure gaps)

- ★ **A note-spec's `page_pdf` index is NOT a reliable page source.** Its 0-based/1-based
  convention **varies per spec** (25 of 62 figures are off by one against `ncertPdfOffsets.ts`),
  and for Light it is simply wrong: `fig_99` records `page_pdf: 10`, which would derive p.144,
  but Fig 9.9's caption is on **p.143**. Every `ncertPage` here was instead verified by opening
  the real chapter PDF and confirming the printed folio **and** the section/caption on the page.
  Never derive a page from the index.
- ★ **The spec `source_ledger` is not uniformly reliable either.** electricity's ledger cites
  "Equivalent resistance in series → p.192" and "Electric current → p.192", but §11.6.1
  *Resistors in Series* opens on **p.182** (and "Ampere" is correctly p.172). Parallel is cited
  p.186; §11.6.2 opens **p.185**. Treat ledger pages as candidates to verify, not as truth.
- The figure page and the concept page are often **not** the same (e.g. §5.4.2 Transportation in
  Plants opens p.94; its leaf figure sits on p.82). `ncertPage` points at the concept.
- NCERT defines **lens power / the dioptre in Light ch.9 §9.3.8 (p.157)** — *not* in the human-eye
  chapter, which only applies it. That row's `ncertPage` is deliberately cross-chapter.
- Several bank figures still carry PENDING-OWNER-VERIFICATION comments in `competency.z3.ts` and
  were NOT proposed as primary: Z3-TG-104, Z3-ARC-004, Z3-SAV-005, Z3-SAV-006.
- Many ARC/SAV/CG bank "figures" are decorative context photos, not teaching diagrams; only the
  geometry-panel variants (…-2 second figures) were used.
- Both coordinate-geometry note-spec assets (`fig_distance_plane`, `fig_section_divide`) are
  generator specs that **do not exist on disk** — not referenced by the catalogue.

---

## 7. FOLLOW-UPS this pass surfaced

- **[FU-NCERT-OFFSETS-MATHS-CH9]** — `ncertPdfOffsets.ts` has no `maths/ch9` entry and there is
  no note-spec for "Some Applications of Trigonometry", so the trigonometry · heights-&-distances
  row can never offer a page. The chapter PDF (`jemh109.pdf`) exists locally.
- **[FU-SCOPE-GUARD-HANDOFF-LANE]** — `repo_boundary_policy.json` lanes are all relative to
  `lazytopper/`; repo-root `handoff/` matches no lane, so any change here reports
  `[unclassified]` and fails `scope:guard`. A classification blind spot, not a violation.
- **[FU-CATALOGUE-SYNC-GUARD]** — nothing enforces the "keep the two in sync" contract between
  the curated record and the wired copy; they had silently drifted (#448's gap-fill rows and the
  2026-07-16 label corrections existed only in `data.ts`). A ~10-line CI check comparing the two
  row arrays would make the contract real.
- **[FU-TUTOR-VOCAB-BRAIN-ROW]** — the human-brain figure (Fig 6.3) is board-heavy and extracted,
  but no boardEssentials row names it (see §3).
