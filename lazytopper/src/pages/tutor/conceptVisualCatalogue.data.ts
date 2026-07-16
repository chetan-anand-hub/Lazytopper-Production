// conceptVisualCatalogue.data.ts
// =============================================================================
// CONCEPT -> BEST-FIGURE catalogue for the tutor explanation panel (Stage 3, D-TUT-14).
//
// This is the WIRED, app-bundled copy. It is a byte-faithful copy of the Fable curation
// lane's artefact of record, handoff/curation/conceptFigureCatalogue.curated.ts (which
// stays parked as the provenance record). It lives under src/ because the app's tsconfig
// only includes "src" — handoff/ cannot be imported. Keep the two in sync;
// conceptVisualCatalogue.test.ts is the drift guard (every row's (topicKey, conceptLabel)
// must resolve against LIVE boardEssentials, and every asset ref must exist).
//
// ★ LOOKUP CONTRACT (confirmed in handoff/TUTOR_VISUAL_CATALOGUE_HANDOFF.md, ruling C):
//   The lookup key is (canonical topicKey, EXACT conceptLabel) — NOT conceptKey.
//   conceptKey is an editorial abbreviation and does NOT round-trip from conceptLabel by
//   slugification for 46 of 54 rows (e.g. "Pythagoras theorem (a^2 + b^2 = c^2)" -> key
//   "pythagoras-theorem"). Resolving on a slugified label would silently blank most panels
//   (the [FU-PROG-TOPIC-KEY-MISMATCH] two-canonicalizer trap). conceptLabel is verbatim-equal
//   to the live boardEssentials `name` (verified 54/54) — so it is the safe, exact key.
//   conceptKey is retained as a stable human id ONLY; never resolve on it.
//
// SOURCES (all READ-ONLY, resolved at runtime by conceptVisualCatalogue.ts — never re-globbed):
//   - notes-figure : ref = "<chapter>/fig_*.webp"; resolve via getNoteAssetUrl() (null if absent)
//   - bank-figure  : ref = questionId; resolve via getFiguresForQuestion() -> read entry.filePath
//                    (OFF the entry — one asset can legitimately serve two questionIds)
//   - interactive  : ref = registry id; resolve id -> filePath via a Map over getAllConceptsList()
//   - none         : gap:true; the panel shows an honest gap state (never a stretched figure)
// =============================================================================

export type FigureKind = "notes-figure" | "bank-figure" | "interactive" | "none";

export interface FigureRef {
  kind: FigureKind;
  ref: string; // notes asset path | questionId | interactive id | "" (none)
  why: string;
}

/** An exact NCERT page reference (D-TUT-14 priority #1). Curated, never guessed: matching
 *  a boardEssentials label to a note-spec page needs a fuzzy matcher, which D-TUT-15 forbids.
 *  `page` is the PRINTED NCERT page; NcertPageModal applies the per-chapter offset. Absent →
 *  no NCERT affordance shown (honest, not a gap). Populated later by the curation lane; the
 *  panel lights it up per-row with no redeploy. No row carries it today. */
export interface NcertPageRefData {
  subject: "physics" | "chemistry" | "biology" | "maths";
  chapter: number;
  page: number;
}

export interface ConceptFigureRow {
  conceptKey: string; // editorial id ONLY — never a lookup key (see LOOKUP CONTRACT above)
  topicKey: string; // canonical topics.ts slug
  subject: "maths" | "science";
  conceptLabel: string; // boardEssentials `name`, verbatim — THE lookup key
  best: FigureRef;
  alternates?: FigureRef[];
  gap: boolean; // true iff best.kind === "none"
  vocabSource: "boardEssentials";
  scopeCaveat?: string;
  ncertPage?: NcertPageRefData;
}

export const conceptFigureCatalogue: ConceptFigureRow[] = [
  // ===========================================================================
  // MATHS — visual-heavy topics
  // ===========================================================================

  // --- triangles ---
  {
    conceptKey: "similarity-criteria-aa-sas-sss",
    topicKey: "triangles",
    subject: "maths",
    conceptLabel: "Similarity criteria (AA, SAS, SSS)",
    best: { kind: "notes-figure", ref: "triangles/fig_similar_622.webp", why: "NCERT Fig 6.22 — the canonical triangle-ABC ~ DEF picture with angle-arc marks; exactly what the criteria describe." },
    alternates: [
      { kind: "interactive", ref: "maths-triangles-similar-triangles-and-criteria", why: "Manipulable criteria explainer." },
      { kind: "bank-figure", ref: "Z3-TR-010", why: "Part (v) explicitly asks which similarity criterion; clean two-right-triangle AA diagram." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "maths", chapter: 6, page: 85 },
  },
  {
    conceptKey: "basic-proportionality-theorem-bpt",
    topicKey: "triangles",
    subject: "maths",
    conceptLabel: "Basic Proportionality Theorem (BPT)",
    best: { kind: "interactive", ref: "maths-triangles-basic-proportionality-theorem", why: "Only asset that shows DE parallel to BC dividing the two sides in ratio." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "No STATIC figure depicts the BPT DE||BC configuration (notes Fig 6.10 was not extracted; bank TR items are applications, not BPT). Interactive-only. Candidate for AI gap-fill.",
    ncertPage: { subject: "maths", chapter: 6, page: 80 },
  },
  {
    conceptKey: "areas-of-similar-triangles",
    topicKey: "triangles",
    subject: "maths",
    conceptLabel: "Areas of similar triangles ∝ (sides)²",
    best: { kind: "interactive", ref: "maths-triangles-areas-of-similar-triangles", why: "Exact-match interactive for the area-ratio relationship." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "notes/specs/triangles.json board_asks states the 2026-27 chapter STOPS at SAS — areas of similar triangles is outside current chapter scope (bank still carries application items under this topicKey). No static figure exists.",
  },
  {
    conceptKey: "pythagoras-theorem",
    topicKey: "triangles",
    subject: "maths",
    conceptLabel: "Pythagoras theorem (a² + b² = c²)",
    best: { kind: "interactive", ref: "maths-triangles-pythagoras-theorem-visual-proof", why: "The theorem itself as a visual proof." },
    alternates: [
      { kind: "bank-figure", ref: "Z3-TR-004", why: "Windmill + two guy wires — cleanest pure a²+b²=c² application picture." },
      { kind: "bank-figure", ref: "Z3-TR-003", why: "Ladder against a wall — the classic right-triangle Pythagoras setup." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "notes/specs/triangles.json board_asks marks Pythagoras proofs as no longer in this chapter (application items remain). Treat as application-level.",
  },

  // --- circles ---
  {
    conceptKey: "tangent-perp-radius-at-point-of-contact",
    topicKey: "circles",
    subject: "maths",
    conceptLabel: "Tangent ⟂ radius at the point of contact (∠ between radius and tangent = 90°)",
    best: { kind: "interactive", ref: "maths-circles-tangent-to-a-circle", why: "Keywords are precisely perpendicular/radius/contact; notes concept c2 has no figure." },
    alternates: [
      { kind: "interactive", ref: "maths-circles-tangent-properties", why: "Same theorem framing (keyword 'theorem'); overlaps the primary." },
      { kind: "notes-figure", ref: "circles/fig_equal_tangents_107.webp", why: "Contains the radius-to-contact-point right angle, but as part of the equal-tangents proof, not isolated." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "No notes figure isolates the lone 90° at a single contact point (notes c2 figure_ref: null). Interactive-primary.",
    ncertPage: { subject: "maths", chapter: 10, page: 146 },
  },
  {
    conceptKey: "two-tangents-from-external-point-equal",
    topicKey: "circles",
    subject: "maths",
    conceptLabel: "Two tangents from an external point are equal (PA = PB)",
    best: { kind: "notes-figure", ref: "circles/fig_equal_tangents_107.webp", why: "NCERT Fig 10.7 — the exact Theorem 10.2 RHS proof set-up (PQ = PR); caption and figure are precisely this theorem." },
    alternates: [
      { kind: "bank-figure", ref: "Z3-CI-001", why: "Incircle of a triangle — equal tangent segments from each vertex; a real application flavour." },
      { kind: "interactive", ref: "maths-circles-number-of-tangents-from-external-point", why: "Equal-length tangents, dynamic." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "maths", chapter: 10, page: 149 },
  },
  {
    conceptKey: "length-of-tangent-from-external-point",
    topicKey: "circles",
    subject: "maths",
    conceptLabel: "Length of tangent from external point: ℓ = √(d² − r²)",
    // Gap-filled 2026-07-16 (owner-approved). ADAPTED from NCERT Maths ch.10 Fig. 10.7 (p149):
    // the single right triangle OQP isolated from that figure, with the r/l/d labels added.
    // NCERT states the relation as PQ^2 = OP^2 - OQ^2 (Remark, p149) and never writes the sqrt
    // form — the figure shows both so they read as one fact.
    best: { kind: "notes-figure", ref: "circles/fig_tangent_length.svg", why: "The right triangle OQP — radius r to the point of contact, tangent length l, distance d — which is exactly what the formula describes." },
    alternates: [
      { kind: "notes-figure", ref: "circles/fig_equal_tangents_107.webp", why: "Contains the radius-tangent right triangle OQP but is not labelled for the length formula — weak." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "maths", chapter: 10, page: 148 },
  },
  {
    conceptKey: "number-of-tangents-from-a-point",
    topicKey: "circles",
    subject: "maths",
    conceptLabel: "Number of tangents from a point (0 inside, 1 on, 2 outside the circle)",
    best: { kind: "notes-figure", ref: "circles/fig_num_tangents_106.webp", why: "NCERT Fig 10.6 — shows all three cases (inside→0 / on→1 / outside→2) side by side; one-to-one with the row." },
    alternates: [
      { kind: "interactive", ref: "maths-circles-number-of-tangents-from-external-point", why: "Covers only the outside-point case — weaker for the 0/1/2 taxonomy." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "maths", chapter: 10, page: 147 },
  },

  // --- areas-related-to-circles ---
  {
    conceptKey: "circumference-and-area-recap",
    topicKey: "areas-related-to-circles",
    subject: "maths",
    // Renamed 2026-07-16 (owner ruling, lockstep with boardEssentials): the old name
    // "Circumference & area recap (C = 2πr, A = πr²)" pointed at the "Perimeter and Area of a
    // Circle — A Review" section, which the 2026-27 reprint DELETED (ch.11 now opens at 11.1
    // Sector/Segment; "circumference" survives only in Exercise 11.1 Q2, p158). The SKILL is
    // still taught and tested — it's what Ex 11.1 Q2 asks — so the row stays and is renamed to
    // the skill. conceptKey is intentionally NOT renamed: it is persisted as the figure signal
    // in durable tutor sessions, so changing it would silently blank the panel on old threads.
    conceptLabel: "Radius from a given circumference, diameter or area",
    best: { kind: "none", ref: "", why: "No notes/interactive figure targets bare C=2πr / A=πr²; bank ARC images are decorative context photos." },
    alternates: [],
    gap: true,
    vocabSource: "boardEssentials",
  },
  {
    conceptKey: "length-of-an-arc-of-a-sector",
    topicKey: "areas-related-to-circles",
    subject: "maths",
    conceptLabel: "Length of an arc of a sector (l = (θ/360)×2πr)",
    best: { kind: "notes-figure", ref: "areas-related-to-circles/fig_sector_111.webp", why: "NCERT Fig 11.1 — shows the arc bounding a labelled minor/major sector with the angle at O." },
    alternates: [
      { kind: "interactive", ref: "maths-areas-circles-sector-and-segment", why: "Covers arc/angle directly (notes c3 has no figure)." },
      { kind: "bank-figure", ref: "Z3-ARC-001", why: "Folding fan as an annular sector with labelled radii + arcs + angles; Q part computes a perimeter from arc lengths." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "maths", chapter: 11, page: 155 },
  },
  {
    conceptKey: "area-of-a-sector",
    topicKey: "areas-related-to-circles",
    subject: "maths",
    conceptLabel: "Area of a sector (A = (θ/360)×πr²)",
    best: { kind: "interactive", ref: "maths-areas-circles-area-of-sector-formula", why: "Purpose-built θ/360×πr² explainer; notes c4 figure_ref: null." },
    alternates: [
      { kind: "notes-figure", ref: "areas-related-to-circles/fig_sector_111.webp", why: "The exact labelled sector-definition figure (shaded minor sector, angle at O)." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "maths", chapter: 11, page: 156 },
  },
  {
    conceptKey: "area-of-a-segment",
    topicKey: "areas-related-to-circles",
    subject: "maths",
    conceptLabel: "Area of a segment (sector area − area of triangle)",
    best: { kind: "notes-figure", ref: "areas-related-to-circles/fig_segment_112.webp", why: "NCERT Fig 11.2 — the only asset that cleanly labels minor/major segment about chord AB, the exact 'segment = sector − triangle' mental model." },
    alternates: [
      { kind: "interactive", ref: "maths-areas-circles-sector-and-segment", why: "Contrasts sector vs segment (the subtraction idea)." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "maths", chapter: 11, page: 157 },
  },
  {
    conceptKey: "area-of-combinations-of-plane-figures",
    topicKey: "areas-related-to-circles",
    subject: "maths",
    conceptLabel: "Area of combinations of plane figures (add/subtract circle ± triangle/square/rectangle)",
    best: { kind: "interactive", ref: "maths-areas-circles-combined-figures-area", why: "Only asset addressing add/subtract shaded regions." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "notes/specs board_asks states combinations of plane figures are OUT of the trimmed 2026-27 chapter (no notes figure exists). This row is interactive-only and arguably retired — flag for owner.",
  },

  // --- surface-areas-and-volumes ---
  {
    conceptKey: "cylinder-cone-sphere-sa-and-volume",
    topicKey: "surface-areas-and-volumes",
    subject: "maths",
    conceptLabel: "Cylinder, cone and sphere — surface area and volume",
    best: { kind: "interactive", ref: "maths-surface-areas-volumes-surface-area-formulas", why: "Directly enumerates CSA/TSA/V of all four basic solids — exactly 'memorise the four core formulas'. Notes has no figure for basic-solid formulas." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "Individual-solid SA & V is Class-IX recall groundwork; the 2026-27 board ask is the COMBINATION (row 2).",
  },
  {
    conceptKey: "combinations-of-solids",
    topicKey: "surface-areas-and-volumes",
    subject: "maths",
    conceptLabel: "Combinations of solids (cone on cylinder, hemisphere on cube, …)",
    best: { kind: "notes-figure", ref: "surface-areas-and-volumes/fig_capsule_1210.webp", why: "NCERT Fig 12.10 — capsule = cylinder + two hemispheres; literally 'break a combination into basic solids' and the exposed-surface rule." },
    alternates: [
      { kind: "interactive", ref: "maths-surface-areas-volumes-combination-of-solids", why: "Dynamic join; matches cone/cylinder/hemisphere keywords." },
      { kind: "bank-figure", ref: "Z3-SAV-004", why: "Ice-cream cone + spherical scoop — a concrete combination worked example." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "maths", chapter: 12, page: 162 },
  },

  // --- trigonometry ---
  {
    conceptKey: "ratios-at-standard-angles",
    topicKey: "trigonometry",
    subject: "maths",
    conceptLabel: "Ratios at standard angles (0°, 30°, 45°, 60°, 90°)",
    best: { kind: "interactive", ref: "maths-trigonometry-trigonometric-ratios-of-standard-angles", why: "Purpose-built for the 0/30/45/60/90 value table; no static figure captures the table." },
    alternates: [
      { kind: "interactive", ref: "maths-trigonometry-trigonometric-ratios", why: "The underlying opp/adj/hyp definition the table derives from." },
      { kind: "notes-figure", ref: "trigonometry/fig_ratio_triangle_84.webp", why: "NCERT Fig 8.4 labelled right triangle grounding all ratio work (enrichment, not the table)." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "maths", chapter: 8, page: 121 },
  },
  {
    conceptKey: "pythagorean-identities",
    topicKey: "trigonometry",
    subject: "maths",
    conceptLabel: "Pythagorean identities (sin²θ+cos²θ=1, 1+tan²θ=sec²θ)",
    best: { kind: "interactive", ref: "maths-trigonometry-trigonometric-identities", why: "Identities are proven algebraically from Pythagoras; the notes spec carries no figure here, so the interactive is the only fitting visual." },
    alternates: [
      { kind: "notes-figure", ref: "trigonometry/fig_ratio_triangle_84.webp", why: "The right triangle the identity derives from — weak enrichment; does not depict the identity." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "maths", chapter: 8, page: 128 },
  },
  {
    conceptKey: "heights-and-distances-setup",
    topicKey: "trigonometry",
    subject: "maths",
    conceptLabel: "Heights & distances setup (angle of elevation / depression)",
    best: { kind: "bank-figure", ref: "Z3-TG-101", why: "Cleanest single diagram showing BOTH elevation (60°) and depression (30°) from one observation point — exactly the 'setup' this row teaches." },
    alternates: [
      { kind: "interactive", ref: "maths-trigonometry-height-and-distance-problems", why: "General elevation/depression explainer." },
      { kind: "bank-figure", ref: "Z3-TG-110", why: "Generic elevation-θ/depression-φ two-building derivation, symbol-labelled (translate picture → equation)." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "notes/specs/trigonometry.json covers only Ch 8 (Introduction) — no notes figure exists for heights & distances (Ch 9); this row is served exclusively by bank figures + the interactive.",
  },

  // --- coordinate-geometry ---
  // NOTE: both note-spec figure assets (fig_distance_plane, fig_section_divide) are
  // GENERATED specs that DO NOT EXIST on disk (notes/assets/coordinate-geometry/ has
  // no folder). They are therefore NOT referenced as available assets below.
  {
    conceptKey: "distance-formula",
    topicKey: "coordinate-geometry",
    subject: "maths",
    conceptLabel: "Distance formula √[(x₂−x₁)² + (y₂−y₁)²]",
    best: { kind: "interactive", ref: "maths-coordinate-geometry-distance-formula", why: "Purpose-built; already used as the explainer on packs 1/2." },
    alternates: [
      { kind: "bank-figure", ref: "Z3-CG-004", why: "Clean S/H/P first-quadrant plot with computable distances (the second figure z3-cg-004-2 is the math one)." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "The spec's own figure asset fig_distance_plane is a generator spec that does not exist on disk — not referenced.",
    ncertPage: { subject: "maths", chapter: 7, page: 100 },
  },
  {
    conceptKey: "section-formula-internal-division",
    topicKey: "coordinate-geometry",
    subject: "maths",
    conceptLabel: "Section formula (internal division)",
    best: { kind: "interactive", ref: "maths-coordinate-geometry-section-formula", why: "Purpose-built section-formula explainer." },
    alternates: [
      { kind: "bank-figure", ref: "Z3-CG-002", why: "Grid used for the parallelogram / section-midpoint part (math figure is z3-cg-002-2)." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "The spec's fig_section_divide is a generator spec that does not exist on disk — not referenced.",
    ncertPage: { subject: "maths", chapter: 7, page: 106 },
  },
  {
    conceptKey: "midpoint-formula",
    topicKey: "coordinate-geometry",
    subject: "maths",
    conceptLabel: "Midpoint formula",
    best: { kind: "bank-figure", ref: "Z3-CG-009", why: "The classic CBSE flags figure; the question's part (iv) is exactly a midpoint computation." },
    alternates: [
      { kind: "interactive", ref: "maths-coordinate-geometry-section-formula", why: "Midpoint is the section formula at ratio 1:1." },
      { kind: "bank-figure", ref: "Z3-CG-002", why: "Parallelogram missing-vertex via equal midpoints (math figure z3-cg-002-2)." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "maths", chapter: 7, page: 107 },
  },
  {
    conceptKey: "area-of-a-triangle-from-coordinates",
    topicKey: "coordinate-geometry",
    subject: "maths",
    conceptLabel: "Area of a triangle from coordinates",
    best: { kind: "interactive", ref: "maths-coordinate-geometry-collinearity-condition", why: "Directly the collinearity (area = 0) test the row's oneLineUse names." },
    alternates: [
      { kind: "bank-figure", ref: "Z3-CG-010", why: "Garden grid with a shaded triangle P-R-Q inside — an area-from-coordinates scene." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "notes board_asks states area-of-a-triangle was REMOVED from the 2026-27 syllabus, yet boardEssentials/topics.ts still cite it. Flag for owner — this row may be retired.",
  },

  // ===========================================================================
  // SCIENCE — visual-heavy topics
  // ===========================================================================

  // --- light-reflection-and-refraction ---
  {
    conceptKey: "mirror-formula-and-magnification",
    topicKey: "light-reflection-and-refraction",
    subject: "science",
    conceptLabel: "Mirror formula 1/v + 1/u = 1/f and magnification m = −v/u",
    best: { kind: "interactive", ref: "science-light-mirror-formula-and-magnification", why: "Directly the formula + magnification, manipulable." },
    alternates: [
      { kind: "bank-figure", ref: "SQP-S-2025-LGHT-033", why: "Numeric u/v schematic — a real formula-application figure (convex mirror, upright diminished image)." },
      { kind: "bank-figure", ref: "CFPQ-S-LGHT-009", why: "Real image of a candle via concave mirror on screen — grounds m = h'/h." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "physics", chapter: 9, page: 143 },
  },
  {
    conceptKey: "lens-formula-and-magnification",
    topicKey: "light-reflection-and-refraction",
    subject: "science",
    conceptLabel: "Lens formula 1/v − 1/u = 1/f and m = v/u",
    best: { kind: "interactive", ref: "science-light-lens-formula-and-ray-diagrams", why: "Directly the lens formula + ray diagrams." },
    alternates: [
      { kind: "bank-figure", ref: "FND-L-BD-06", why: "Concave-lens numerical + draw-rays — the exact exam form." },
      { kind: "bank-figure", ref: "CFPQ-S-LGHT-003", why: "Two conjugate lens positions forming sharp images — competency formula reasoning." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "physics", chapter: 9, page: 155 },
  },
  {
    conceptKey: "sign-convention-new-cartesian",
    topicKey: "light-reflection-and-refraction",
    subject: "science",
    conceptLabel: "Sign convention (New Cartesian)",
    best: { kind: "notes-figure", ref: "light/fig_99.webp", why: "NCERT Fig 9.9 — literally 'The New Cartesian Sign Convention for spherical mirrors'." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "No bank figure depicts the convention itself — notes figure is the sole fit.",
    ncertPage: { subject: "physics", chapter: 9, page: 142 },
  },
  {
    conceptKey: "ray-diagrams-mirror-and-lens",
    topicKey: "light-reflection-and-refraction",
    subject: "science",
    conceptLabel: "Ray diagrams (concave/convex mirror & lens)",
    best: { kind: "notes-figure", ref: "light/fig_97b.webp", why: "Canonical NCERT concave-mirror case (object beyond C → real, inverted, diminished)." },
    alternates: [
      { kind: "bank-figure", ref: "FND-L-BD-01", why: "Incident rays to a concave mirror — where do reflected rays meet (pure ray construction)." },
      { kind: "bank-figure", ref: "CFPQ-S-LGHT-006", why: "Pick the correct ray diagram among four — examiner-style discrimination." },
      { kind: "interactive", ref: "science-light-reflection-of-light", why: "Interactive ray-diagram builder if an interactive is preferred." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "physics", chapter: 9, page: 140 },
  },

  // --- human-eye-and-colourful-world ---
  {
    conceptKey: "power-of-accommodation",
    topicKey: "human-eye-and-colourful-world",
    subject: "science",
    conceptLabel: "Power of accommodation (ciliary muscles vary focal length; near point 25 cm, far point ∞)",
    best: { kind: "interactive", ref: "science-human-eye-structure-of-human-eye", why: "Accommodation is the ciliary-muscle/lens action; no NCERT figure depicts accommodation itself (spec c2 figure_ref: null)." },
    alternates: [
      { kind: "notes-figure", ref: "human-eye-and-colourful-world/fig_eye.webp", why: "Shows the lens + ciliary muscles — the anatomy accommodation acts on." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "physics", chapter: 10, page: 162 },
  },
  {
    conceptKey: "defects-of-vision-and-correction",
    topicKey: "human-eye-and-colourful-world",
    subject: "science",
    conceptLabel: "Defects of vision and correction — myopia (concave, −P), hypermetropia (convex, +P), presbyopia",
    best: { kind: "notes-figure", ref: "human-eye-and-colourful-world/fig_myopia.webp", why: "NCERT Fig 10.2 — 3-panel myopia + concave-lens correction, the spec's own c3 anchor." },
    alternates: [
      { kind: "notes-figure", ref: "human-eye-and-colourful-world/fig_hypermetropia.webp", why: "NCERT Fig 10.3 — the convex-lens counterpart." },
      { kind: "interactive", ref: "science-human-eye-defects-of-vision-and-correction", why: "Covers all three defects dynamically." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "physics", chapter: 10, page: 162 },
  },
  {
    conceptKey: "lens-power-dioptre",
    topicKey: "human-eye-and-colourful-world",
    subject: "science",
    conceptLabel: "Lens power P = 1/f (dioptre) for the corrective lens",
    // Gap-filled 2026-07-16 (owner-approved). ORIGINAL diagram — NCERT defines power in
    // running text with no figure (Light ch.9, p157-158: "P = 1/f" eq 9.11; "1 dioptre is the
    // power of a lens whose focal length is 1 metre. 1D = 1m^-1"). Draws only what that names.
    best: { kind: "notes-figure", ref: "human-eye-and-colourful-world/fig_lens_power.svg", why: "A converging lens with its focal length f marked, the reciprocal P = 1/f, and the dioptre unit — the quantities the definition names." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "physics", chapter: 9, page: 157 },
  },
  {
    conceptKey: "prism-refraction-and-dispersion",
    topicKey: "human-eye-and-colourful-world",
    subject: "science",
    conceptLabel: "Refraction through a prism and dispersion of white light (VIBGYOR spectrum)",
    best: { kind: "notes-figure", ref: "human-eye-and-colourful-world/fig_dispersion.webp", why: "NCERT Fig 10.5 — dispersion of white light by a glass prism into VIBGYOR, exactly this concept." },
    alternates: [
      { kind: "interactive", ref: "science-human-eye-dispersion-of-light-and-rainbow", why: "Adds the rainbow extension." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "physics", chapter: 10, page: 166 },
  },
  {
    conceptKey: "atmospheric-refraction",
    topicKey: "human-eye-and-colourful-world",
    subject: "science",
    conceptLabel: "Atmospheric refraction (twinkling of stars, advance sunrise, delayed sunset)",
    // Gap-filled 2026-07-16 (owner-approved). TRACED from NCERT Science ch.10 Fig. 10.9
    // ("Apparent star position due to atmospheric refraction") + Fig. 10.10 ("Atmospheric
    // refraction effects at sunrise and sunset"), both p168 — a two-panel figure, because the
    // concept names all three effects and NCERT splits them across those two figures.
    // NB the previous `why` here asserted "No NCERT figure" — that was a claim about OUR
    // catalogue, not about NCERT; both figures exist in the textbook and are now traced.
    best: { kind: "notes-figure", ref: "human-eye-and-colourful-world/fig_atmospheric_refraction.svg", why: "NCERT's own two figures traced: the raised apparent star (twinkling) and the Earth-and-atmosphere construction that puts the Sun above the horizon while it is really below it." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "physics", chapter: 10, page: 168 },
  },
  {
    conceptKey: "scattering-of-light",
    topicKey: "human-eye-and-colourful-world",
    subject: "science",
    conceptLabel: "Scattering of light (Tyndall effect, blue sky, reddening of the sun)",
    // Gap-filled 2026-07-16 (owner-approved). ORIGINAL diagram — NCERT ch.10 §10.6 (p169) has
    // NO scattering figure (the chapter's last figure is 10.10). It draws only NCERT's own
    // sentence: "Very fine particles scatter mainly blue light while particles of larger size
    // scatter light of longer wavelengths." NB NCERT's rule is particle-SIZE based, and
    // reddening of the Sun has no subsection and no figure — so it is not featured here.
    best: { kind: "notes-figure", ref: "human-eye-and-colourful-world/fig_scattering.svg", why: "Fine particles scattering blue (why the clear sky is blue) versus larger particles scattering longer wavelengths — NCERT's size-based rule, drawn." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "physics", chapter: 10, page: 169 },
  },

  // --- electricity ---
  {
    conceptKey: "ohms-law",
    topicKey: "electricity",
    subject: "science",
    conceptLabel: "Ohm's law V = IR",
    best: { kind: "interactive", ref: "science-electricity-ohms-law", why: "The V–I relation lives only in the interactive; notes c2 figure_ref: null (fig_11_1 is a generic circuit, not a V–I graph)." },
    alternates: [
      { kind: "notes-figure", ref: "electricity/fig_11_1.webp", why: "Simple circuit with in-series ammeter — the measurement setup Ohm's-law questions describe (no V–I relation shown)." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "physics", chapter: 11, page: 175 },
  },
  {
    conceptKey: "resistors-in-series",
    topicKey: "electricity",
    subject: "science",
    conceptLabel: "Resistors in series (R = R₁ + R₂ + …)",
    best: { kind: "notes-figure", ref: "electricity/fig_11_6.webp", why: "NCERT Fig 11.6 — the exact series diagram (R1,R2,R3 end-to-end between X and Y) with meters." },
    alternates: [
      { kind: "interactive", ref: "science-electricity-series-and-parallel-circuits", why: "Dynamic series/parallel explainer." },
      { kind: "interactive", ref: "science-electricity-circuit-diagram-builder", why: "Student constructs the combination." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "physics", chapter: 11, page: 182 },
  },
  {
    conceptKey: "resistors-in-parallel",
    topicKey: "electricity",
    subject: "science",
    conceptLabel: "Resistors in parallel (1/R = 1/R₁ + 1/R₂ + …)",
    best: { kind: "notes-figure", ref: "electricity/fig_11_7.webp", why: "NCERT Fig 11.7 — the exact parallel diagram (R1,R2,R3 between common points X and Y)." },
    alternates: [
      { kind: "interactive", ref: "science-electricity-series-and-parallel-circuits", why: "Dynamic series/parallel explainer." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "physics", chapter: 11, page: 185 },
  },
  {
    conceptKey: "electrical-power",
    topicKey: "electricity",
    subject: "science",
    conceptLabel: "Electrical power (P = VI = I²R = V²/R)",
    best: { kind: "interactive", ref: "science-electricity-electric-power-and-energy", why: "No notes/bank figure for power (formula-only concept); the interactive covers power + energy." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "No static figure exists for the power concept — interactive-only.",
    ncertPage: { subject: "physics", chapter: 11, page: 191 },
  },
  {
    conceptKey: "joules-heating",
    topicKey: "electricity",
    subject: "science",
    conceptLabel: "Joule's heating (H = I²Rt)",
    best: { kind: "interactive", ref: "science-electricity-electric-power-and-energy", why: "Covers energy dissipation/heating; no dedicated heating-element figure exists (notes c5 nominally binds the parallel diagram, a poor fit)." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "No static heating figure exists — interactive-only; candidate for AI gap-fill (heating element / fuse).",
    ncertPage: { subject: "physics", chapter: 11, page: 189 },
  },

  // --- magnetic-effects-of-electric-current ---
  {
    conceptKey: "right-hand-thumb-rule",
    topicKey: "magnetic-effects-of-electric-current",
    subject: "science",
    conceptLabel: "Right-hand thumb rule (field around a straight conductor)",
    best: { kind: "notes-figure", ref: "magnetic-effects-of-electric-current/fig_right_hand_thumb_127.webp", why: "NCERT Fig 12.7 — 1:1 depiction of the rule + circular field; also the chapter's Rules-tab figure." },
    alternates: [
      { kind: "interactive", ref: "science-magnetic-effects-magnetic-field-lines", why: "Broader field-lines context, less rule-specific." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "physics", chapter: 12, page: 199 },
  },
  {
    conceptKey: "solenoid-as-a-bar-magnet",
    topicKey: "magnetic-effects-of-electric-current",
    subject: "science",
    conceptLabel: "Solenoid as a bar magnet",
    best: { kind: "notes-figure", ref: "magnetic-effects-of-electric-current/fig_solenoid_field_1210.webp", why: "NCERT Fig 12.10 — solenoid field identical to a bar magnet, uniform inside; matches the N/S-pole ask." },
    alternates: [
      { kind: "interactive", ref: "science-magnetic-effects-electromagnet-and-solenoid", why: "Covers the same block plus the electromagnet." },
      { kind: "notes-figure", ref: "magnetic-effects-of-electric-current/fig_field_lines_bar_magnet_124.webp", why: "The bar-magnet half of the comparison (supporting)." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "physics", chapter: 12, page: 201 },
  },
  {
    conceptKey: "force-on-a-conductor-flemings-left-hand-rule",
    topicKey: "magnetic-effects-of-electric-current",
    subject: "science",
    conceptLabel: "Force on a current-carrying conductor (Fleming's left-hand rule)",
    best: { kind: "notes-figure", ref: "magnetic-effects-of-electric-current/fig_flemings_left_hand_1213.webp", why: "NCERT Fig 12.13 — labels forefinger=field / second=current / thumb=force, mirroring the formulaUsePreview." },
    alternates: [
      { kind: "interactive", ref: "science-magnetic-effects-flemings-left-hand-rule", why: "Same concept, interactive form." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "The 'Electric Motor and Generator' interactive matches NO boardEssentials row and is OUT of the trimmed 2026-27 chapter — do not attach it to any concept.",
    ncertPage: { subject: "physics", chapter: 12, page: 202 },
  },

  // --- carbon-and-its-compounds ---
  {
    conceptKey: "tetravalency-and-catenation",
    topicKey: "carbon-and-its-compounds",
    subject: "science",
    conceptLabel: "Tetravalency and catenation of carbon",
    best: { kind: "notes-figure", ref: "carbon-and-its-compounds/fig_methane_electron_dot.webp", why: "Methane electron-dot literally shows carbon forming four covalent bonds (tetravalency)." },
    alternates: [
      { kind: "notes-figure", ref: "carbon-and-its-compounds/fig_saturated_hydrocarbons_table.webp", why: "The alkane chains illustrate catenation." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "No dedicated catenation/chain figure; methane electron-dot covers tetravalency, the table covers catenation — no single asset covers both.",
    ncertPage: { subject: "chemistry", chapter: 4, page: 62 },
  },
  {
    conceptKey: "homologous-series",
    topicKey: "carbon-and-its-compounds",
    subject: "science",
    conceptLabel: "Homologous series (general formula, e.g. CₙH₂ₙ₊₂)",
    best: { kind: "notes-figure", ref: "carbon-and-its-compounds/fig_saturated_hydrocarbons_table.webp", why: "Shows CH4→C6H14, each member differing by CH₂ — the exact homologous-series visual." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "chemistry", chapter: 4, page: 66 },
  },
  {
    conceptKey: "functional-groups",
    topicKey: "carbon-and-its-compounds",
    subject: "science",
    // Renamed 2026-07-16 (owner ruling, lockstep with boardEssentials): "–X" was a lone
    // over-reach — NCERT Table 4.3 (p66) lists only —Cl and —Br (never a generic –X, never F/I),
    // and the bank already writes the concrete "–Cl, haloalkane". ">C=O" is deliberately KEPT:
    // it is standard carbonyl shorthand and is shared vocabulary with student-facing bank
    // answers, so narrowing it here alone would desync the hub from what students read.
    conceptLabel: "Functional groups (–OH, –CHO, –COOH, >C=O, –Cl, –Br)",
    best: { kind: "none", ref: "", why: "No notes figure and no bank figure for functional groups (only a keyword-heuristic concept stub)." },
    alternates: [],
    gap: true,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "chemistry", chapter: 4, page: 66 },
  },
  {
    conceptKey: "reactions-of-ethanol-and-ethanoic-acid",
    topicKey: "carbon-and-its-compounds",
    subject: "science",
    conceptLabel: "Reactions of ethanol and ethanoic acid",
    // Gap-filled 2026-07-16 (owner-approved). ORIGINAL diagram setting NCERT's VERBATIM
    // equations (ch.4: oxidation p71, esterification p73). Two fidelity points the trace fixed:
    // NCERT's esterification arrow reads "Acid" (an acid catalyst) — conc. H2SO4 appears only
    // in Activity 4.8's reagent list, never in the equation — and the reaction is REVERSIBLE.
    // (Fig. 4.11 "Formation of ester" is the Activity apparatus, not a reaction diagram.)
    best: { kind: "notes-figure", ref: "carbon-and-its-compounds/fig_ethanol_ethanoic_reactions.svg", why: "Both named reactions as NCERT writes them: oxidation of ethanol over alkaline KMnO4/acidified K2Cr2O7, and the reversible acid-catalysed esterification." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "chemistry", chapter: 4, page: 71 },
  },
  {
    conceptKey: "soaps-vs-detergents",
    topicKey: "carbon-and-its-compounds",
    subject: "science",
    conceptLabel: "Soaps vs detergents (cleansing action)",
    best: { kind: "notes-figure", ref: "carbon-and-its-compounds/fig_soap_micelle.webp", why: "Micelle diagram — the canonical cleansing-action visual (hydrophilic heads out, hydrophobic tails in)." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "chemistry", chapter: 4, page: 74 },
  },

  // --- life-processes ---
  {
    conceptKey: "nutrition-in-humans",
    topicKey: "life-processes",
    subject: "science",
    conceptLabel: "Nutrition in humans (digestion + enzymes)",
    best: { kind: "notes-figure", ref: "life-processes/fig_digestive_system.webp", why: "'Human alimentary canal' — the labelled canal the row demands (enzyme-per-organ), NCERT-exact labels." },
    alternates: [
      { kind: "interactive", ref: "science-life-processes-nutrition-in-humans", why: "Dynamic digestion explainer." },
      { kind: "notes-figure", ref: "life-processes/fig_amoeba_nutrition.webp", why: "Unicellular nutrition sub-point." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "biology", chapter: 5, page: 84 },
  },
  {
    conceptKey: "respiration",
    topicKey: "life-processes",
    subject: "science",
    conceptLabel: "Respiration (aerobic vs anaerobic + alveoli exchange)",
    best: { kind: "notes-figure", ref: "life-processes/fig_respiratory.webp", why: "'Human respiratory system' (alveoli inset) — covers the alveolar gas-exchange half of the row." },
    alternates: [
      { kind: "interactive", ref: "science-life-processes-respiration-and-excretion", why: "Covers respiration + excretion." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "No figure for the aerobic-vs-anaerobic pathway comparison (notes c4 figure_ref: null) — that half is table-only.",
    ncertPage: { subject: "biology", chapter: 5, page: 87 },
  },
  {
    conceptKey: "transportation-heart-and-double-circulation",
    topicKey: "life-processes",
    subject: "science",
    conceptLabel: "Transportation (heart chambers + double circulation)",
    best: { kind: "notes-figure", ref: "life-processes/fig_heart.webp", why: "'Schematic sectional view of the human heart' — four-chamber labelled section = exact double-circulation ask." },
    alternates: [
      { kind: "interactive", ref: "science-life-processes-human-heart-and-blood-circulation", why: "Dynamic heart/circulation explainer." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "biology", chapter: 5, page: 91 },
  },
  {
    conceptKey: "excretion-nephron",
    topicKey: "life-processes",
    subject: "science",
    conceptLabel: "Excretion (nephron + filtration → reabsorption → urine)",
    best: { kind: "notes-figure", ref: "life-processes/fig_nephron.webp", why: "'Structure of a nephron' — the filtration-unit diagram the row's step-list needs." },
    alternates: [
      { kind: "notes-figure", ref: "life-processes/fig_excretory_system.webp", why: "Whole kidney/ureter/bladder path — system-level alternate." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "biology", chapter: 5, page: 96 },
  },
  {
    conceptKey: "transport-in-plants-xylem-phloem",
    topicKey: "life-processes",
    subject: "science",
    conceptLabel: "Transport in plants (xylem vs phloem)",
    best: { kind: "notes-figure", ref: "life-processes/fig_leaf_cross_section.webp", why: "Shows the xylem/phloem bundle in the leaf vein — partial fit (leaf section, not a stem/root transport schematic)." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "No dedicated xylem-vs-phloem transport figure exists (notes c6 figure_ref: null); best served by the two-column comparison table. Leaf-section fit is partial — flag for owner.",
    ncertPage: { subject: "biology", chapter: 5, page: 94 },
  },

  // --- control-and-coordination ---
  {
    conceptKey: "reflex-arc",
    topicKey: "control-and-coordination",
    subject: "science",
    conceptLabel: "Reflex arc (sensory → spinal cord → motor)",
    best: { kind: "notes-figure", ref: "control-and-coordination/fig_reflex_arc.webp", why: "NCERT Fig 6.2 pathway diagram — the highest-value labelled figure for this 3–5 mark row." },
    alternates: [
      { kind: "interactive", ref: "science-control-coordination-reflex-arc", why: "Interactive reflex-arc explainer." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "biology", chapter: 6, page: 102 },
  },
  {
    conceptKey: "structure-of-a-neuron",
    topicKey: "control-and-coordination",
    subject: "science",
    conceptLabel: "Structure of a neuron (dendrite, cell body, axon, synapse)",
    best: { kind: "notes-figure", ref: "control-and-coordination/fig_neuron.webp", why: "NCERT Fig 6.1a 'Structure of a neuron' — labels the four parts the row names; direction-of-impulse legend matches." },
    alternates: [
      { kind: "interactive", ref: "science-control-coordination-nervous-system", why: "Broader nervous-system explainer." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "biology", chapter: 6, page: 101 },
  },
  {
    conceptKey: "endocrine-glands-and-hormones",
    topicKey: "control-and-coordination",
    subject: "science",
    conceptLabel: "Human endocrine glands and their hormones",
    best: { kind: "notes-figure", ref: "control-and-coordination/fig_endocrine.webp", why: "NCERT Fig 6.7 'Endocrine glands (a) male, (b) female' — shows every gland position for the gland→hormone→function match." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "No interactive covers endocrine glands; the notes formula_strip (Table 6.1) is the text alternate.",
    ncertPage: { subject: "biology", chapter: 6, page: 109 },
  },
  {
    conceptKey: "tropisms-in-plants",
    topicKey: "control-and-coordination",
    subject: "science",
    conceptLabel: "Tropisms in plants (phototropism, geotropism, hydrotropism, chemotropism)",
    best: { kind: "interactive", ref: "science-control-coordination-plant-hormones-and-tropisms", why: "The row spans four tropisms; the interactive aggregates auxin + the named tropisms, whereas notes split into two figures." },
    alternates: [
      { kind: "notes-figure", ref: "control-and-coordination/fig_phototropism.webp", why: "Static phototropism figure (pair with geotropism)." },
      { kind: "notes-figure", ref: "control-and-coordination/fig_geotropism.webp", why: "Static geotropism figure (pair with phototropism)." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "No figure exists for hydrotropism/chemotropism (text-only in the formula_strip) — the two static figures cover only photo/geo.",
    ncertPage: { subject: "biology", chapter: 6, page: 107 },
  },

  // ===========================================================================
  // COVERAGE EXPANSION 2026-07-16 — topics whose shipped notes already carry a real
  // NCERT figure but which had no catalogue row, so the tutor showed nothing.
  // Same discipline as the original 54: exact boardEssentials label, precision over
  // coverage (a concept with no genuinely fitting figure gets NO row — see GAPS.md).
  // ===========================================================================

  // --- heredity ---
  {
    conceptKey: "monohybrid-cross",
    topicKey: "heredity",
    subject: "science",
    conceptLabel: "Mendel's monohybrid cross (3:1 phenotypic ratio in F₂)",
    best: { kind: "notes-figure", ref: "heredity/fig_monohybrid_cross.webp", why: "NCERT Fig 8.3 — the canonical monohybrid cross: TT × tt gives an all-tall F₁ (Tt), and the F₁ × F₁ Punnett gives the 3 tall : 1 short F₂ this row names." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "biology", chapter: 8, page: 130 },
  },
  {
    conceptKey: "dominant-vs-recessive",
    topicKey: "heredity",
    subject: "science",
    conceptLabel: "Dominant vs recessive traits",
    best: { kind: "notes-figure", ref: "heredity/fig_monohybrid_cross.webp", why: "NCERT Fig 8.3 — dominance IS what this figure demonstrates: the F₁ is uniformly tall (Tt), so T is dominant and t recessive; the recessive short reappears only in the F₂ tt." },
    alternates: [
      { kind: "notes-figure", ref: "heredity/fig_earlobes.webp", why: "NCERT Fig 8.2 — free vs attached earlobes; an inherited-trait contrast, but it does not itself show dominance." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "biology", chapter: 8, page: 130 },
  },
  {
    conceptKey: "genotype-vs-phenotype",
    topicKey: "heredity",
    subject: "science",
    conceptLabel: "Genotype vs phenotype",
    best: { kind: "notes-figure", ref: "heredity/fig_monohybrid_cross.webp", why: "NCERT Fig 8.3 — the F₂ Punnett prints the genotypes (TT, Tt, Tt, tt) directly above their phenotypes (Tall, Tall, Tall, Short): the 1:2:1 genotypic vs 3:1 phenotypic contrast this row is about." },
    alternates: [
      { kind: "notes-figure", ref: "heredity/fig_dihybrid_cross.webp", why: "NCERT Fig 8.5 — the dihybrid F₂ makes the same genotype/phenotype split over two traits (9:3:3:1)." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "The words 'genotype' and 'phenotype' do not appear anywhere in the rationalised 2026-27 Ch8 — the concept row is editorial vocabulary. The figure shows the distinction, so no NCERT page is offered (an honest absence rather than a page that never uses the terms).",
  },
  {
    conceptKey: "sex-determination",
    topicKey: "heredity",
    subject: "science",
    conceptLabel: "Sex determination in humans (XX vs XY)",
    best: { kind: "notes-figure", ref: "heredity/fig_sex_determination.webp", why: "NCERT Fig 8.6 — exactly this row: the mother contributes only X, the father X or Y, so the zygote is XX (girl) or XY (boy)." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "biology", chapter: 8, page: 132 },
  },

  // --- how-do-organisms-reproduce ---
  {
    conceptKey: "asexual-reproduction-modes",
    topicKey: "how-do-organisms-reproduce",
    subject: "science",
    conceptLabel: "Asexual reproduction modes (fission, budding, fragmentation, regeneration, spore formation, vegetative propagation)",
    best: { kind: "notes-figure", ref: "how-do-organisms-reproduce/fig_binary_fission_amoeba.webp", why: "NCERT Fig 7.1(a) — binary fission in Amoeba, the first and most-drawn of the modes this row lists." },
    alternates: [
      { kind: "notes-figure", ref: "how-do-organisms-reproduce/fig_budding_hydra.webp", why: "NCERT Fig 7.4 — budding in Hydra." },
      { kind: "notes-figure", ref: "how-do-organisms-reproduce/fig_multiple_fission_plasmodium.webp", why: "NCERT Fig 7.2 — multiple fission in Plasmodium." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "No single NCERT figure covers all six modes — the best shows fission only; budding and multiple fission are offered as alternates, and fragmentation / regeneration / spore formation / vegetative propagation have no extracted figure.",
    ncertPage: { subject: "biology", chapter: 7, page: 115 },
  },
  {
    conceptKey: "sexual-reproduction-in-a-flower",
    topicKey: "how-do-organisms-reproduce",
    subject: "science",
    conceptLabel: "Sexual reproduction in a flower — parts of a flower, pollination, fertilisation",
    best: { kind: "notes-figure", ref: "how-do-organisms-reproduce/fig_flower_ls.webp", why: "NCERT Fig 7.7 — the longitudinal section labelling exactly the parts this row names: pistil (stigma, style, ovary) and stamen (anther, filament), with petal and sepal." },
    alternates: [
      { kind: "notes-figure", ref: "how-do-organisms-reproduce/fig_pollen_germination.webp", why: "NCERT Fig 7.8 — pollen germinating on the stigma and the tube carrying the male germ-cell to the ovary: the pollination→fertilisation half of the row." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "biology", chapter: 7, page: 120 },
  },
  {
    conceptKey: "human-reproductive-system",
    topicKey: "how-do-organisms-reproduce",
    subject: "science",
    conceptLabel: "Human reproductive system (male & female) and its functions",
    best: { kind: "notes-figure", ref: "how-do-organisms-reproduce/fig_male_repro.webp", why: "NCERT Fig 7.10 — the labelled male system (testis, vas deferens, seminal vesicle, prostate, urethra)." },
    alternates: [
      { kind: "notes-figure", ref: "how-do-organisms-reproduce/fig_female_repro.webp", why: "NCERT Fig 7.11 — the labelled female system (ovary, oviduct, uterus, cervix, vagina)." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "NCERT draws the male and female systems as two separate figures (7.10 and 7.11, both on p.123); the best shows the male, the female rides as the alternate.",
    ncertPage: { subject: "biology", chapter: 7, page: 123 },
  },

  // --- our-environment ---
  {
    conceptKey: "food-chains-webs-trophic-levels",
    topicKey: "our-environment",
    subject: "science",
    conceptLabel: "Food chains, food webs and trophic levels",
    best: { kind: "notes-figure", ref: "our-environment/fig_food_chain.webp", why: "NCERT Fig 13.1 — three food chains (forest, grassland, pond), each read from its producer: the chain half of this row." },
    alternates: [
      { kind: "notes-figure", ref: "our-environment/fig_food_web.webp", why: "NCERT Fig 13.3 — many chains interlinked into a web." },
      { kind: "notes-figure", ref: "our-environment/fig_trophic_pyramid.webp", why: "NCERT Fig 13.2 — the four trophic levels stacked as a pyramid." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "biology", chapter: 13, page: 210 },
  },
  {
    conceptKey: "ten-percent-law",
    topicKey: "our-environment",
    subject: "science",
    conceptLabel: "Ten percent law of energy flow (only ~10% passes to the next level)",
    best: { kind: "notes-figure", ref: "our-environment/fig_energy_flow.webp", why: "NCERT Fig 13.4 — each bar shorter than the one below it (Sunlight → Producers → Herbivores → Carnivores), which is the 10%-per-level loss this row states." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "biology", chapter: 13, page: 211 },
  },

  // --- metals-and-non-metals ---
  {
    conceptKey: "extraction-of-metals",
    topicKey: "metals-and-non-metals",
    subject: "science",
    conceptLabel: "Extraction of metals — roasting, calcination, reduction, electrolytic refining",
    best: { kind: "notes-figure", ref: "metals-and-non-metals/fig_extraction_steps.webp", why: "NCERT Fig 3.10 — the extraction flowchart branching on the activity series, which is the route this row summarises." },
    alternates: [
      { kind: "notes-figure", ref: "metals-and-non-metals/fig_electrolytic_refining.webp", why: "NCERT Fig 3.12 — electrolytic refining of copper (impure anode → pure cathode), the row's last step." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "chemistry", chapter: 3, page: 51 },
  },
  {
    conceptKey: "corrosion-and-prevention",
    topicKey: "metals-and-non-metals",
    subject: "science",
    conceptLabel: "Corrosion & its prevention (rusting needs both air and moisture)",
    best: { kind: "notes-figure", ref: "metals-and-non-metals/fig_iron_rusting.webp", why: "NCERT Fig 3.13 (Activity 3.14) — the three-test-tube control that proves the row's exact claim: only the nail with BOTH air and water rusts." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "chemistry", chapter: 3, page: 53 },
  },
  {
    conceptKey: "ionic-bond-and-properties",
    topicKey: "metals-and-non-metals",
    subject: "science",
    conceptLabel: "Ionic (electrovalent) bond & properties of ionic compounds (e.g. Na → Na⁺ + e⁻)",
    best: { kind: "notes-figure", ref: "metals-and-non-metals/fig_nacl_formation.webp", why: "NCERT Fig 3.5 — sodium (2,8,1) loses an electron to chlorine (2,8,7) giving Na⁺ and Cl⁻: literally the Na → Na⁺ + e⁻ this row cites." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "chemistry", chapter: 3, page: 46 },
  },

  // --- chemical-reactions-and-equations ---
  {
    conceptKey: "types-of-reactions",
    topicKey: "chemical-reactions-and-equations",
    subject: "science",
    conceptLabel: "Types of reactions (combination, decomposition, displacement, double displacement)",
    best: { kind: "notes-figure", ref: "chemical-reactions-and-equations/fig_electrolysis_water.webp", why: "NCERT Fig 1.6 — electrolysis of water, NCERT's worked decomposition example (H₂:O₂ = 2:1)." },
    alternates: [
      { kind: "notes-figure", ref: "chemical-reactions-and-equations/fig_precipitation_baso4.webp", why: "NCERT Fig 1.9 — the BaSO₄ precipitate: the double-displacement type." },
      { kind: "notes-figure", ref: "chemical-reactions-and-equations/fig_mg_ribbon_burning.webp", why: "NCERT Fig 1.1 — burning magnesium ribbon: the combination type." },
    ],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "No single NCERT figure covers all four types — the best shows decomposition, with combination and double displacement as alternates; displacement has no extracted figure.",
    ncertPage: { subject: "chemistry", chapter: 1, page: 6 },
  },
  {
    conceptKey: "oxidation-and-reduction",
    topicKey: "chemical-reactions-and-equations",
    subject: "science",
    conceptLabel: "Oxidation and reduction (redox)",
    best: { kind: "notes-figure", ref: "chemical-reactions-and-equations/fig_mg_ribbon_burning.webp", why: "NCERT Fig 1.1 — Mg + O₂ → MgO, the chapter's own redox example: magnesium is oxidised as it burns." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "chemistry", chapter: 1, page: 12 },
  },

  // --- acids-bases-and-salts ---
  {
    conceptKey: "ph-scale",
    topicKey: "acids-bases-and-salts",
    subject: "science",
    conceptLabel: "pH scale (0–14)",
    best: { kind: "notes-figure", ref: "acids-bases-and-salts/fig_ph_scale.webp", why: "NCERT Fig 2.6 — the 0–14 scale itself: acidic toward 0 (rising H⁺), basic toward 14 (rising OH⁻), 7 neutral." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "chemistry", chapter: 2, page: 25 },
  },
  {
    conceptKey: "properties-of-acids-and-bases",
    topicKey: "acids-bases-and-salts",
    subject: "science",
    conceptLabel: "Properties of acids and bases",
    best: { kind: "notes-figure", ref: "acids-bases-and-salts/fig_zinc_acid_h2.webp", why: "NCERT Fig 2.1 — zinc + dilute H₂SO₄ giving hydrogen that burns with a pop: the acid-with-metal property and its standard test." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "Shows the acid-with-metal property only; NCERT has no single extracted figure covering the bases' properties, so the panel is honest about the half it depicts.",
    ncertPage: { subject: "chemistry", chapter: 2, page: 18 },
  },

  // --- polynomials ---
  {
    conceptKey: "geometrical-meaning-of-zeroes",
    topicKey: "polynomials",
    subject: "maths",
    conceptLabel: "Geometrical meaning of zeroes (graph cuts the x-axis)",
    best: { kind: "notes-figure", ref: "polynomials/fig_parabola_zeroes.webp", why: "NCERT Fig 2.2 — y = x² − 3x − 4 cutting the x-axis at −1 and 4: the two crossings ARE the zeroes, which is exactly this row." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    ncertPage: { subject: "maths", chapter: 2, page: 11 },
  },

  // --- pair-of-linear-equations ---
  {
    conceptKey: "graphical-method",
    topicKey: "pair-of-linear-equations",
    subject: "maths",
    conceptLabel: "Graphical method (two lines: intersecting → unique, parallel → none, coincident → infinite)",
    best: { kind: "notes-figure", ref: "pair-of-linear-equations/fig_graph_31.webp", why: "NCERT Fig 3.1 — x + 3y = 6 and 2x − 3y = 12 meeting at B(6, 0): the intersecting / unique-solution case of this row." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "Depicts the intersecting (unique-solution) case only — the parallel and coincident cases have no extracted figure (the spec's fig_line_pair_cases is a generator spec that does not exist on disk).",
    ncertPage: { subject: "maths", chapter: 3, page: 25 },
  },

  // --- statistics ---
  {
    conceptKey: "mean-of-grouped-data",
    topicKey: "statistics",
    subject: "maths",
    conceptLabel: "Mean of grouped data — direct, assumed-mean & step-deviation (x̄ = Σfᵢxᵢ/Σfᵢ)",
    best: { kind: "notes-figure", ref: "statistics/fig_mean_table_133.webp", why: "NCERT Table 13.3 — the class-mark xᵢ and fᵢxᵢ columns summing to Σfᵢxᵢ = 1860 over Σfᵢ = 30, i.e. the x̄ = Σfᵢxᵢ/Σfᵢ this row states." },
    alternates: [],
    gap: false,
    vocabSource: "boardEssentials",
    scopeCaveat: "Table 13.3 works the DIRECT method only; the assumed-mean and step-deviation variants this row also names have no extracted figure.",
    ncertPage: { subject: "maths", chapter: 13, page: 171 },
  },
];

export default conceptFigureCatalogue;
