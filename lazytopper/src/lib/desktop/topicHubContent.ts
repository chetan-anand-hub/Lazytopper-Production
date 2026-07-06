import type { DesktopStream, DesktopSubject } from "./navigation";
import { desktopTopicBySlug, desktopTopicsBySubject, type DesktopTopicSummary } from "./topics";

/**
 * Desktop Level 2 — topic hub content adapter.
 *
 * Reference (locked desktop prototype, external to this repo):
 *   chetan-anand-hub/topic-focus-lite — src/lib/topicHubContent.ts
 *
 * Two coexisting view-models are exported:
 *
 *   1. Legacy `DesktopTopicHubContent` (blueprint + resources + highlights).
 *      Still used by `components/desktop/l2/PaperBlueprint.tsx` and
 *      `pages/desktop/DesktopPracticePage.tsx` — kept intact for back-compat.
 *
 *   2. New `ActionableTopicHubContent` aligned with the locked prototype:
 *      topicSnapshot + boardEssentials (concept rows) + formulaUsePreview +
 *      fullFormulaUseMap + commonMistake + examinerWarning + isSamplePreview.
 *      Built from a hand-seeded map for the locked-prototype priority topics
 *      and from an honest sample-preview fallback for unseeded topics.
 *
 * Pure functions. No React, no localStorage, no I/O.
 *
 * Honesty rules respected:
 *   - No fake HPQ counts or board-history claims live in this file. HPQ
 *     availability/counts must come from getHighlyProbableQuestions in the
 *     page. The page also reads getMistakeLogs for personal data.
 *   - Sample-preview fallbacks set `isSamplePreview: true` so the page can
 *     label them clearly.
 */

// ── Legacy shape (kept for back-compat) ───────────────────────────────────
export type DesktopHubSectionId = "A" | "B" | "C" | "D" | "E";

export interface DesktopHubBlueprintSection {
  section: DesktopHubSectionId;
  count: number;
  marksEach: number;
  description: string;
}

export interface DesktopHubResource {
  id: string;
  label: string;
  kind: "concept-note" | "quick-refresher" | "drill" | "video" | "previous-year";
  estimatedMinutes: number;
  blurb: string;
}

export interface DesktopHubHighlight {
  id: string;
  label: string;
  rationale: string;
}

export interface DesktopTopicHubContent {
  topic: DesktopTopicSummary;
  blueprint: DesktopHubBlueprintSection[];
  totalMarks: number;
  resources: DesktopHubResource[];
  highlights: DesktopHubHighlight[];
}

const buildBlueprint = (weight: number): DesktopHubBlueprintSection[] => {
  const tier = weight >= 10 ? "heavy" : weight >= 6 ? "medium" : "small";
  if (tier === "heavy") {
    return [
      { section: "A", count: 4, marksEach: 1, description: "MCQs / one-mark recall" },
      { section: "B", count: 2, marksEach: 2, description: "Very short answers" },
      { section: "C", count: 2, marksEach: 3, description: "Short answers" },
      { section: "D", count: 1, marksEach: 5, description: "Long answer (proof / derivation)" },
      { section: "E", count: 1, marksEach: 4, description: "Case-based / source" },
    ];
  }
  if (tier === "medium") {
    return [
      { section: "A", count: 3, marksEach: 1, description: "MCQs / one-mark recall" },
      { section: "B", count: 2, marksEach: 2, description: "Very short answers" },
      { section: "C", count: 1, marksEach: 3, description: "Short answer" },
      { section: "D", count: 1, marksEach: 5, description: "Long answer" },
    ];
  }
  return [
    { section: "A", count: 2, marksEach: 1, description: "MCQs / one-mark recall" },
    { section: "B", count: 1, marksEach: 2, description: "Very short answer" },
    { section: "C", count: 1, marksEach: 3, description: "Short answer" },
  ];
};

const sumBlueprint = (sections: DesktopHubBlueprintSection[]): number =>
  sections.reduce((acc, s) => acc + s.count * s.marksEach, 0);

const buildResources = (topic: DesktopTopicSummary): DesktopHubResource[] => {
  return [
    {
      id: `${topic.slug}-concept`,
      label: `${topic.name} — concept refresher`,
      kind: "concept-note",
      estimatedMinutes: 12,
      blurb: `Cover the core ideas of ${topic.name} in a focused read. ${topic.blurb}`,
    },
    {
      id: `${topic.slug}-quick`,
      label: `${topic.name} — 6-minute quick refresher`,
      kind: "quick-refresher",
      estimatedMinutes: 6,
      blurb: "Skim the highest-yield formulas and definitions before practice.",
    },
    {
      id: `${topic.slug}-drill`,
      label: `${topic.name} — focused drill set`,
      kind: "drill",
      estimatedMinutes: 25,
      blurb: "Mixed difficulty drill targeting the most common mistake patterns.",
    },
    {
      id: `${topic.slug}-pyq`,
      label: `${topic.name} — previous year board questions`,
      kind: "previous-year",
      estimatedMinutes: 30,
      blurb: "Curated PYQs grouped by section weight and frequency.",
    },
  ];
};

const buildHighlights = (topic: DesktopTopicSummary): DesktopHubHighlight[] => {
  return [
    {
      id: `${topic.slug}-h1`,
      label: `Trend tier: ${topic.trendTier}`,
      rationale:
        topic.trendTier === "high"
          ? "Frequently repeated across recent boards — high return on focused practice."
          : topic.trendTier === "medium"
            ? "Reliable scoring with moderate prep — a steady contributor."
            : "Lower frequency — ensure foundation is intact, then prioritise heavier topics.",
    },
    {
      id: `${topic.slug}-h2`,
      label: `Marks weight: ${topic.marks}`,
      rationale: "Use this to size your practice block budget realistically.",
    },
  ];
};

export const buildDesktopTopicHubContent = (
  topic: DesktopTopicSummary,
): DesktopTopicHubContent => {
  const blueprint = buildBlueprint(topic.weight);
  return {
    topic,
    blueprint,
    totalMarks: sumBlueprint(blueprint),
    resources: buildResources(topic),
    highlights: buildHighlights(topic),
  };
};

export const desktopTopicHubContentBySlug = (
  slug: string,
): DesktopTopicHubContent | undefined => {
  const topic = desktopTopicBySlug(slug);
  if (!topic) return undefined;
  return buildDesktopTopicHubContent(topic);
};

export const desktopTopicHubContentBySubject = (
  subject: DesktopSubject,
  stream: DesktopStream = "All",
): DesktopTopicHubContent[] => {
  return desktopTopicsBySubject(subject, stream).map(buildDesktopTopicHubContent);
};

// ── New actionable shape (locked-prototype contract) ──────────────────────

export interface BoardConcept {
  /** Short concept name shown as the row title. */
  name: string;
  /** One-line use note explaining what the concept buys you in the board paper. */
  oneLineUse: string;
  /** Marks band string ("1–2", "2–3", etc.) — display only, no probability claim. */
  marks: string;
}

export type FormulaUseCardKind =
  | "formula"
  | "identity"
  | "definition"
  | "law"
  | "process";

export interface FormulaUseCard {
  kind: FormulaUseCardKind;
  /** Human-readable title for the card. */
  title: string;
  /** Bullet list of board-style situations the card is the right tool for. */
  whenToUse: string[];
  /** One sentence on the most common board trap connected to this card. */
  commonTrap: string;
  /** Optional: how it shows up directly in a board question. */
  directUse?: string;
  /** Optional: how it shows up indirectly / as a setup step. */
  hiddenUse?: string;
  /** Optional: how it combines with other cards in long-answer questions. */
  combinedUse?: string;
}

export interface TopicSnapshot {
  /** Where this topic typically lands in the paper structure. */
  likelySection: string;
  /** What examiners typically reward / penalise on this topic. */
  examinerNotes: string;
}

export interface ActionableTopicHubContent {
  topic: DesktopTopicSummary;
  topicSnapshot: TopicSnapshot;
  boardEssentials: BoardConcept[];
  formulaUsePreview: FormulaUseCard;
  fullFormulaUseMap: FormulaUseCard[];
  commonMistake: string;
  examinerWarning: string;
  /** True when the content is derived from the topic blurb rather than seeded. */
  isSamplePreview: boolean;
}

// ── Seeded actionable content for locked-prototype priority topics ────────
// Deliberately compact, board-focused reference text. No fabricated HPQ
// counts, no "X% likely" claims, no fake learner data.

interface ActionableSeed {
  topicSnapshot: TopicSnapshot;
  boardEssentials: BoardConcept[];
  formulaUsePreview: FormulaUseCard;
  fullFormulaUseMap: FormulaUseCard[];
  commonMistake: string;
  examinerWarning: string;
}

const SEEDED: Record<string, ActionableSeed> = {
  trigonometry: {
    topicSnapshot: {
      likelySection: "Sections B/C/D — identities, evaluations and one heights & distances application.",
      examinerNotes: "Boards reward labelled triangles, identity-driven proofs and clean two-step heights & distances workings.",
    },
    boardEssentials: [
      { name: "Ratios at standard angles (0°, 30°, 45°, 60°, 90°)", oneLineUse: "Plug straight into evaluation and 1-mark MCQs.", marks: "1–2" },
      { name: "Pythagorean identities (sin²θ+cos²θ=1, 1+tan²θ=sec²θ)", oneLineUse: "Replace one ratio with another to simplify or prove.", marks: "2–3" },
      { name: "Heights & distances setup (angle of elevation / depression)", oneLineUse: "Translate the picture into a tan or sin equation in one step.", marks: "3–5" },
    ],
    formulaUsePreview: {
      kind: "identity",
      title: "sin²θ + cos²θ = 1 (and the two derived identities)",
      whenToUse: [
        "Prove a given trigonometric identity in Section C",
        "Rearrange a single-ratio expression into the ratio the question asks for",
        "Simplify before squaring or factoring in a long-answer proof",
      ],
      directUse: "Replace sin²θ with 1 − cos²θ when the question asks for an answer in cosθ only.",
      hiddenUse: "Use the identity backwards: rewrite (1 − cos²θ) as sin²θ to unlock factoring.",
      combinedUse: "Pair with secθ − tanθ = 1/(secθ + tanθ) for stubborn proofs.",
      commonTrap: "Treating the identity as if it only holds for the acute angle in a worked example.",
    },
    fullFormulaUseMap: [
      {
        kind: "identity",
        title: "1 + tan²θ = sec²θ",
        whenToUse: [
          "Convert tan-only expressions into sec-only form",
          "Eliminate a fraction by introducing sec",
        ],
        commonTrap: "Forgetting the +1 when isolating tan²θ.",
      },
      {
        kind: "process",
        title: "Heights & distances diagram protocol",
        whenToUse: [
          "Any 3- or 5-mark question with a tower, building, lighthouse or observer",
          "When the question gives the angle and asks for a length (or vice versa)",
        ],
        directUse: "Draw a labelled right triangle, mark the angle of elevation/depression, then write tanθ = opposite/adjacent.",
        commonTrap: "Mixing up the angle of elevation (looking up) and depression (looking down).",
      },
    ],
    commonMistake: "Swapping opposite and adjacent sides relative to the chosen angle in a right triangle.",
    examinerWarning: "Always label triangle vertices and mark the right angle — unlabelled diagrams lose the diagram mark in heights & distances questions.",
  },

  electricity: {
    topicSnapshot: {
      likelySection: "Sections C/D — Ohm's-law numericals and series–parallel network problems.",
      examinerNotes: "Marks come from clean unit work, the right combination formula and explicit final units.",
    },
    boardEssentials: [
      { name: "Ohm's law V = IR", oneLineUse: "Bridge any two of V, I, R when the third is known.", marks: "1–3" },
      { name: "Resistors in series (R = R₁ + R₂ + …)", oneLineUse: "Collapse a chain into one equivalent resistor before applying Ohm's law.", marks: "2–3" },
      { name: "Resistors in parallel (1/R = 1/R₁ + 1/R₂ + …)", oneLineUse: "Find equivalent resistance and branch currents.", marks: "3–5" },
      { name: "Electrical power (P = VI = I²R = V²/R)", oneLineUse: "Pick the form that matches the two known quantities.", marks: "2–3" },
      { name: "Joule's heating (H = I²Rt)", oneLineUse: "Compute heat produced by a current over time.", marks: "2–3" },
    ],
    formulaUsePreview: {
      kind: "law",
      title: "Ohm's law V = IR",
      whenToUse: [
        "Any 1-mark numerical that gives two of V, I, R",
        "Setup step before applying series or parallel rules",
        "Final substitution step in a multi-stage circuit problem",
      ],
      directUse: "Given V and R, compute I = V/R and state the unit Amperes.",
      hiddenUse: "Used implicitly when computing the voltage drop across each branch in a series circuit.",
      combinedUse: "Combine with P = VI to find power once current is known.",
      commonTrap: "Applying V = IR to the entire network when only one resistor's voltage drop is known.",
    },
    fullFormulaUseMap: [
      {
        kind: "formula",
        title: "Series equivalent resistance",
        whenToUse: [
          "Resistors connected end-to-end with the same current through each",
          "Before computing total current from the supply",
        ],
        directUse: "Add resistances directly: R = R₁ + R₂ + R₃.",
        commonTrap: "Adding voltages rather than resistances when the question asks for equivalent R.",
      },
      {
        kind: "formula",
        title: "Parallel equivalent resistance",
        whenToUse: [
          "Resistors sharing the same two end-points (same voltage)",
          "Before computing total current drawn from a battery",
        ],
        directUse: "Use 1/R = 1/R₁ + 1/R₂ + …, then invert.",
        commonTrap: "Forgetting to invert at the end — answer is the equivalent R, not 1/R.",
      },
      {
        kind: "formula",
        title: "Power and energy (P = V²/R, E = Pt)",
        whenToUse: [
          "Bulb / heater rating questions",
          "Cost-of-electricity numericals using kWh",
        ],
        commonTrap: "Mixing time units — use seconds for joules, hours for kWh.",
      },
    ],
    commonMistake: "Adding parallel resistor values directly instead of taking the reciprocal sum and inverting.",
    examinerWarning: "Always state SI units (V, A, Ω, W, J) — boards routinely deduct for missing units in numericals.",
  },

  "life-processes": {
    topicSnapshot: {
      likelySection: "Sections C/D — labelled diagrams (heart, nephron, alveoli) and process descriptions.",
      examinerNotes: "Marks are awarded for accurate labels, direction arrows and cause-effect language.",
    },
    boardEssentials: [
      { name: "Nutrition in humans (digestion + enzymes)", oneLineUse: "Track which enzyme acts where (mouth → stomach → small intestine).", marks: "2–3" },
      { name: "Respiration (aerobic vs anaerobic + alveoli exchange)", oneLineUse: "Compare end-products and write the gas-exchange equation.", marks: "2–3" },
      { name: "Transportation (heart chambers + double circulation)", oneLineUse: "Label the four chambers and trace blood flow with arrows.", marks: "3–5" },
      { name: "Excretion (nephron + filtration → reabsorption → urine)", oneLineUse: "Describe each step and name the structure responsible.", marks: "3–5" },
      { name: "Transport in plants (xylem vs phloem)", oneLineUse: "State what each transports and the driving force.", marks: "1–2" },
    ],
    formulaUsePreview: {
      kind: "process",
      title: "Double circulation in humans",
      whenToUse: [
        "5-mark long answers asking to describe blood flow",
        "3-mark questions on why mammals need double circulation",
      ],
      directUse: "Trace deoxygenated blood: body → right atrium → right ventricle → lungs → left atrium → left ventricle → body.",
      combinedUse: "Pair with the alveolar gas-exchange diagram for full marks on respiration crossover questions.",
      commonTrap: "Reversing the side: oxygenated blood returns to the LEFT atrium, not the right.",
    },
    fullFormulaUseMap: [
      {
        kind: "process",
        title: "Photosynthesis word equation",
        whenToUse: [
          "1-mark recall + 2-mark explanation questions",
          "Setup for any plant nutrition long answer",
        ],
        directUse: "CO₂ + H₂O → (in light, with chlorophyll) → glucose + O₂.",
        commonTrap: "Omitting the conditions (light + chlorophyll) — examiners mark these explicitly.",
      },
      {
        kind: "process",
        title: "Nephron filtration → reabsorption → urine",
        whenToUse: [
          "3-mark step-by-step description",
          "Diagram-labelled nephron question",
        ],
        commonTrap: "Confusing glomerular filtration with selective reabsorption — they are sequential, not the same step.",
      },
    ],
    commonMistake: "Mixing up oxygenated vs deoxygenated sides of the heart in double-circulation diagrams.",
    examinerWarning: "Use direction arrows on every biology diagram — unmarked arrows lose the diagram mark.",
  },

  triangles: {
    topicSnapshot: {
      likelySection: "Sections C/D — similarity proofs and the basic proportionality theorem application.",
      examinerNotes: "Long-answer marks come from stating the criterion explicitly before using it.",
    },
    boardEssentials: [
      { name: "Similarity criteria (AA, SAS, SSS)", oneLineUse: "Pick the right criterion to prove two triangles similar in one line.", marks: "2–3" },
      { name: "Basic Proportionality Theorem (BPT)", oneLineUse: "Apply when a line is parallel to one side of a triangle.", marks: "3–5" },
      { name: "Areas of similar triangles ∝ (sides)²", oneLineUse: "Convert a side ratio into an area ratio in one step.", marks: "2–3" },
      { name: "Pythagoras theorem (a² + b² = c²)", oneLineUse: "Confirm a right triangle and find the missing side.", marks: "2–3" },
    ],
    formulaUsePreview: {
      kind: "formula",
      title: "Basic Proportionality Theorem",
      whenToUse: [
        "Any 5-mark proof where a line is drawn parallel to one side of a triangle",
        "Side-ratio numericals once parallel lines are confirmed",
      ],
      directUse: "If DE ∥ BC in △ABC, then AD/DB = AE/EC.",
      hiddenUse: "Used implicitly to set up similarity in mid-segment problems.",
      commonTrap: "Forgetting to state that DE is parallel to BC before applying the ratio.",
    },
    fullFormulaUseMap: [
      {
        kind: "formula",
        title: "Areas of similar triangles ∝ (corresponding sides)²",
        whenToUse: [
          "When a side ratio is given and an area ratio is asked",
          "Reverse direction: area ratio is given and a side ratio is asked",
        ],
        commonTrap: "Forgetting to square (or take the square root of) the ratio.",
      },
    ],
    commonMistake: "Writing similarity statements with the vertices in the wrong order, breaking the corresponding-sides ratio.",
    examinerWarning: "State the similarity criterion (AA / SAS / SSS) explicitly — proofs that skip this lose 1 mark.",
  },

  "quadratic-equations": {
    topicSnapshot: {
      likelySection: "Sections B/C/D — root finding, discriminant analysis and word problems.",
      examinerNotes: "Show the discriminant value and a brief 'real / equal / no real' line for the nature-of-roots mark.",
    },
    boardEssentials: [
      { name: "Standard form ax² + bx + c = 0", oneLineUse: "Identify a, b, c before applying any other tool.", marks: "1–2" },
      { name: "Quadratic formula x = [−b ± √(b²−4ac)] / 2a", oneLineUse: "Use when factoring is unclear or asked explicitly.", marks: "3–5" },
      { name: "Discriminant D = b² − 4ac (nature of roots)", oneLineUse: "Decide if roots are real & distinct, equal, or non-real.", marks: "2–3" },
      { name: "Factorisation method", oneLineUse: "Fastest route when a, b, c are small integers.", marks: "2–3" },
    ],
    formulaUsePreview: {
      kind: "formula",
      title: "Quadratic formula",
      whenToUse: [
        "Word problems where factors are not obvious",
        "When the discriminant is asked alongside the roots",
        "Numerical-coefficient questions in Section D",
      ],
      directUse: "Substitute a, b, c and simplify the surd carefully.",
      combinedUse: "Pair with the discriminant check to justify the nature of roots in the same answer.",
      commonTrap: "Sign errors when b is negative — use brackets: −(−5) = +5.",
    },
    fullFormulaUseMap: [
      {
        kind: "formula",
        title: "Sum and product of roots (α + β = −b/a, αβ = c/a)",
        whenToUse: [
          "Form the quadratic when roots (or symmetric functions of roots) are given",
          "Find one root when the other is known",
        ],
        commonTrap: "Forgetting the negative sign in α + β = −b/a.",
      },
    ],
    commonMistake: "Forgetting to set the equation equal to zero before identifying a, b, c.",
    examinerWarning: "When the question asks for nature of roots, you must compute D and write the conclusion sentence — both are needed for full marks.",
  },

  "coordinate-geometry": {
    topicSnapshot: {
      likelySection: "Sections B/C — distance formula, section formula and area-from-coordinates.",
      examinerNotes: "Most questions are 2- or 3-mark substitution problems with one careful sign step.",
    },
    boardEssentials: [
      { name: "Distance formula √[(x₂−x₁)² + (y₂−y₁)²]", oneLineUse: "Find the length between two coordinate points.", marks: "2–3" },
      { name: "Section formula (internal division)", oneLineUse: "Find the point that divides a segment in a given ratio.", marks: "2–3" },
      { name: "Midpoint formula", oneLineUse: "Special case of section formula with ratio 1:1.", marks: "1–2" },
      { name: "Area of a triangle from coordinates", oneLineUse: "Verify collinearity (area = 0) or compute area directly.", marks: "2–3" },
    ],
    formulaUsePreview: {
      kind: "formula",
      title: "Section formula",
      whenToUse: [
        "Find the point dividing a segment in ratio m:n",
        "Verify whether a given point lies on a segment in a specified ratio",
      ],
      directUse: "P = ((mx₂ + nx₁)/(m+n), (my₂ + ny₁)/(m+n)).",
      commonTrap: "Mixing the order of x₁ and x₂ — use the m:n labels carefully.",
    },
    fullFormulaUseMap: [
      {
        kind: "formula",
        title: "Area of triangle from coordinates",
        whenToUse: [
          "When three coordinate points are given and area is asked",
          "When you need to test collinearity of three points",
        ],
        directUse: "Area = ½ |x₁(y₂−y₃) + x₂(y₃−y₁) + x₃(y₁−y₂)|.",
        commonTrap: "Dropping the absolute value and ending with a negative area.",
      },
    ],
    commonMistake: "Sign errors when subtracting coordinates — particularly when one coordinate is negative.",
    examinerWarning: "Always state the unit (units²) for area and (units) for length — boards mark this explicitly.",
  },

  "surface-areas-and-volumes": {
    topicSnapshot: {
      likelySection: "Sections C/D — combinations of solids.",
      examinerNotes: "Marks come from picking the right pair of formulas and keeping units consistent throughout.",
    },
    boardEssentials: [
      { name: "Cylinder, cone and sphere — surface area and volume", oneLineUse: "Memorise the four core formulas; everything else builds on them.", marks: "1–3" },
      { name: "Combinations of solids (cone on cylinder, hemisphere on cube, …)", oneLineUse: "Add the visible surface areas and add the volumes — never both for the joining face.", marks: "3–5" },
    ],
    formulaUsePreview: {
      kind: "formula",
      title: "Combinations of solids — surface area",
      whenToUse: [
        "When two solids are joined and the total exposed surface area is asked",
        "When a solid is mounted on top of another (cone on cylinder, hemisphere on cube)",
      ],
      directUse: "Add only the externally visible surfaces; subtract the joining faces from each solid.",
      commonTrap: "Including the circular face where the cone sits on the cylinder — that face is hidden.",
    },
    fullFormulaUseMap: [],
    commonMistake: "Adding the joining face's area twice when computing the surface area of a combined solid.",
    examinerWarning: "Keep π = 22/7 (or 3.14) consistent throughout the solution and state the unit (cm² / cm³) at every stage.",
  },

  "light-reflection-and-refraction": {
    topicSnapshot: {
      likelySection: "Sections C/D — ray diagrams, mirror/lens formula numericals and image-property tables.",
      examinerNotes: "Diagram marks require labelled object, mirror/lens, principal axis, focus, and image with clear arrows.",
    },
    boardEssentials: [
      { name: "Mirror formula 1/v + 1/u = 1/f and magnification m = −v/u", oneLineUse: "Solve image-position numericals for spherical mirrors.", marks: "2–3" },
      { name: "Lens formula 1/v − 1/u = 1/f and m = v/u", oneLineUse: "Solve image-position numericals for thin lenses.", marks: "2–3" },
      { name: "Sign convention (New Cartesian)", oneLineUse: "Decide signs of u, v, f, h before substituting.", marks: "1–2" },
      { name: "Ray diagrams (concave/convex mirror & lens)", oneLineUse: "Use two of the standard rays through F or C / 2F to locate the image.", marks: "3–5" },
    ],
    formulaUsePreview: {
      kind: "formula",
      title: "Mirror formula and sign convention",
      whenToUse: [
        "Any numerical with a concave or convex mirror",
        "Whenever you must state image nature (real/virtual, erect/inverted, magnified/diminished)",
      ],
      directUse: "Apply the New Cartesian sign convention before substitution: u is negative, f is negative for concave.",
      commonTrap: "Substituting positive u and getting an image in front of the mirror without realising the sign error.",
    },
    fullFormulaUseMap: [
      {
        kind: "formula",
        title: "Lens formula and lens magnification",
        whenToUse: [
          "Convex/concave lens numericals",
          "When magnification is given and you need image height or distance",
        ],
        commonTrap: "Using the mirror formula's sign convention by accident — the lens formula uses 1/v − 1/u.",
      },
      {
        kind: "process",
        title: "Standard ray diagram protocol",
        whenToUse: [
          "Any 5-mark image-formation question",
          "Whenever the question says 'draw a ray diagram'",
        ],
        directUse: "Draw two rays: one parallel to the principal axis (passes through F after reflection/refraction) and one through C (mirror) or O (lens).",
        commonTrap: "Drawing only one ray — examiners want at least two for an unambiguous image location.",
      },
    ],
    commonMistake: "Mixing up the mirror and lens formulas (one uses 1/v + 1/u, the other 1/v − 1/u).",
    examinerWarning: "Mark every ray with an arrowhead and label F, C / 2F clearly — unlabelled diagrams lose the diagram mark.",
  },

  "magnetic-effects-of-electric-current": {
    topicSnapshot: {
      likelySection: "Sections C/D — right-hand rules and solenoid diagrams.",
      examinerNotes: "Direction questions are marked strictly — name the rule before applying it.",
    },
    boardEssentials: [
      { name: "Right-hand thumb rule (field around a straight conductor)", oneLineUse: "Find direction of magnetic field from current direction.", marks: "1–2" },
      { name: "Solenoid as a bar magnet", oneLineUse: "Use the right-hand grip rule to identify N and S poles of a current-carrying solenoid.", marks: "2–3" },
      { name: "Force on a current-carrying conductor (Fleming's left-hand rule)", oneLineUse: "Find direction of force on a conductor in a magnetic field.", marks: "2–3" },
    ],
    formulaUsePreview: {
      kind: "law",
      title: "Fleming's left-hand rule (force on current-carrying conductor)",
      whenToUse: [
        "When direction of force on a conductor is asked",
        "When a current-carrying conductor lies in a magnetic field",
      ],
      directUse: "Forefinger = field, second finger = current, thumb = force — all mutually perpendicular.",
      commonTrap: "Swapping forefinger and second finger.",
    },
    fullFormulaUseMap: [],
    commonMistake: "Mixing up which finger represents field, current and force when applying Fleming's left-hand rule.",
    examinerWarning: "Always name the rule you are applying before stating the direction — examiners mark this explicitly.",
  },

  "chemical-reactions-and-equations": {
    topicSnapshot: {
      likelySection: "Sections B/C — balancing equations, identifying reaction types and one redox example.",
      examinerNotes: "Balanced equations earn the mark only when state symbols and arrows are written correctly.",
    },
    boardEssentials: [
      { name: "Balancing chemical equations", oneLineUse: "Balance atoms one element at a time, then check overall.", marks: "1–2" },
      { name: "Types of reactions (combination, decomposition, displacement, double displacement)", oneLineUse: "Identify the type from the form of reactants and products.", marks: "1–2" },
      { name: "Oxidation and reduction (redox)", oneLineUse: "Mark which species gains/loses oxygen or hydrogen.", marks: "2–3" },
      { name: "Effects of oxidation in daily life (rancidity, corrosion)", oneLineUse: "Quick recall question — name the effect and a prevention method.", marks: "1–2" },
    ],
    formulaUsePreview: {
      kind: "process",
      title: "Balancing equations protocol",
      whenToUse: [
        "Whenever an unbalanced equation appears in the question",
        "Setup step before any stoichiometry calculation",
      ],
      directUse: "Balance metals first, then non-metals, then H, then O.",
      commonTrap: "Changing subscripts inside a formula — only stoichiometric coefficients in front are allowed.",
    },
    fullFormulaUseMap: [
      {
        kind: "definition",
        title: "Oxidation vs reduction (electron transfer view)",
        whenToUse: [
          "Identify the oxidising / reducing agent in a given equation",
          "Justify why a reaction is a redox reaction",
        ],
        commonTrap: "Calling the substance that 'is oxidised' the oxidising agent — it's the reducing agent.",
      },
    ],
    commonMistake: "Changing the chemical formula (subscripts) instead of the stoichiometric coefficient when balancing.",
    examinerWarning: "Always include state symbols (s, l, g, aq) — boards routinely deduct for missing states.",
  },

  "acids-bases-and-salts": {
    topicSnapshot: {
      likelySection: "Sections B/C — pH-based reasoning and reaction equations of common acids/bases.",
      examinerNotes: "pH questions reward the right inequality direction (acidic <7, neutral =7, basic >7) and one example.",
    },
    boardEssentials: [
      { name: "Properties of acids and bases", oneLineUse: "List two distinguishing properties each (taste, indicator, conduction).", marks: "1–2" },
      { name: "pH scale (0–14)", oneLineUse: "Interpret a given pH value as acidic / neutral / basic with strength.", marks: "1–2" },
      { name: "Acid + base → salt + water (neutralisation)", oneLineUse: "Write the balanced equation and identify products.", marks: "2–3" },
      { name: "Common salts (NaCl, NaOH, NaHCO₃, Na₂CO₃, bleaching powder, plaster of Paris)", oneLineUse: "Recall preparation and one industrial use of each.", marks: "2–3" },
    ],
    formulaUsePreview: {
      kind: "process",
      title: "Neutralisation reaction template",
      whenToUse: [
        "Any 'acid + base' equation question",
        "When asked to predict the salt formed from a specific acid–base pair",
      ],
      directUse: "Write: Acid + Base → Salt + Water; balance the equation.",
      commonTrap: "Forgetting that the salt's name depends on the parent acid (sulphate from H₂SO₄, chloride from HCl).",
    },
    fullFormulaUseMap: [
      {
        kind: "definition",
        title: "Strong vs weak acids/bases (extent of dissociation)",
        whenToUse: [
          "Compare HCl with CH₃COOH",
          "Explain why a weak acid has a higher pH than a strong acid at the same concentration",
        ],
        commonTrap: "Confusing concentration with strength — they are independent ideas.",
      },
    ],
    commonMistake: "Reading the pH scale backwards (treating low pH as basic).",
    examinerWarning: "When stating pH, write the value AND say 'acidic / neutral / basic' — both are needed for the mark.",
  },

  "carbon-and-its-compounds": {
    topicSnapshot: {
      likelySection: "Sections C/D — homologous series, functional groups and combustion / substitution reactions.",
      examinerNotes: "Naming and structural formula questions reward exact spelling and correct bond count.",
    },
    boardEssentials: [
      { name: "Tetravalency and catenation of carbon", oneLineUse: "Explain why carbon forms so many compounds.", marks: "1–2" },
      { name: "Homologous series (general formula, e.g. CₙH₂ₙ₊₂)", oneLineUse: "Predict the next member's formula and properties trend.", marks: "2–3" },
      { name: "Functional groups (–OH, –CHO, –COOH, >C=O, –X)", oneLineUse: "Identify and name the group; predict typical reactions.", marks: "2–3" },
      { name: "Reactions of ethanol and ethanoic acid", oneLineUse: "Write esterification and oxidation equations precisely.", marks: "2–3" },
      { name: "Soaps vs detergents (cleansing action)", oneLineUse: "Describe micelle formation and hard-water behaviour.", marks: "2–3" },
    ],
    formulaUsePreview: {
      kind: "process",
      title: "Esterification reaction (ethanol + ethanoic acid)",
      whenToUse: [
        "Reactions-of-ethanoic-acid questions",
        "Whenever 'fruity smell' is mentioned in the prompt",
      ],
      directUse: "CH₃COOH + C₂H₅OH ⇌ CH₃COOC₂H₅ + H₂O (with conc. H₂SO₄ as catalyst).",
      commonTrap: "Forgetting to mention the acid catalyst — examiners want it explicitly.",
    },
    fullFormulaUseMap: [
      {
        kind: "definition",
        title: "Soap micelle formation",
        whenToUse: [
          "Cleansing action long-answer questions",
          "Hard-water vs soft-water comparison",
        ],
        commonTrap: "Saying soaps work in hard water — they form scum and are ineffective.",
      },
    ],
    commonMistake: "Drawing structural formulas with the wrong number of bonds on carbon (carbon must have exactly 4).",
    examinerWarning: "Always show the catalyst and conditions on top/below the arrow in organic equations.",
  },

  heredity: {
    topicSnapshot: {
      likelySection: "Sections B/C — Mendel's experiments and monohybrid / dihybrid Punnett squares.",
      examinerNotes: "Diagram-based answers (Punnett squares with parents, gametes, F₁, F₂) earn step marks.",
    },
    boardEssentials: [
      { name: "Mendel's monohybrid cross (3:1 phenotypic ratio in F₂)", oneLineUse: "Set up parents and gametes, then a 2×2 Punnett square.", marks: "3–5" },
      { name: "Dominant vs recessive traits", oneLineUse: "Identify which trait expresses in the F₁ generation.", marks: "1–2" },
      { name: "Sex determination in humans (XX vs XY)", oneLineUse: "Show that the father determines the sex of the child.", marks: "2–3" },
      { name: "Genotype vs phenotype", oneLineUse: "Distinguish the genetic makeup from the observable trait.", marks: "1–2" },
    ],
    formulaUsePreview: {
      kind: "process",
      title: "Punnett square for a monohybrid cross",
      whenToUse: [
        "Any cross between heterozygous parents (Tt × Tt)",
        "When the F₂ phenotypic ratio is asked",
      ],
      directUse: "Write parental gametes T, t on top and side; fill the four cells with TT, Tt, Tt, tt.",
      commonTrap: "Mixing genotype ratio (1:2:1) with phenotype ratio (3:1).",
    },
    fullFormulaUseMap: [
      {
        kind: "definition",
        title: "Sex determination in humans",
        whenToUse: [
          "Explain why the father determines the child's sex",
          "Punnett square with XX × XY parents",
        ],
        commonTrap: "Stating that the mother determines the sex — she only contributes an X.",
      },
    ],
    commonMistake: "Confusing genotype ratio (1:2:1) with phenotype ratio (3:1) in F₂.",
    examinerWarning: "Always label parents, gametes and generations (P, F₁, F₂) on the cross diagram.",
  },

  "control-and-coordination": {
    topicSnapshot: {
      likelySection: "Sections C/D — reflex arc diagrams, hormones table and tropisms in plants.",
      examinerNotes: "Diagram and table answers earn marks for clear arrows and complete name + function rows.",
    },
    boardEssentials: [
      { name: "Reflex arc (sensory → spinal cord → motor)", oneLineUse: "Trace the pathway with arrows; explain why the brain is bypassed.", marks: "3–5" },
      { name: "Structure of a neuron (dendrite, cell body, axon, synapse)", oneLineUse: "Label the parts and state the direction of impulse flow.", marks: "2–3" },
      { name: "Human endocrine glands and their hormones", oneLineUse: "Match gland → hormone → one function for each major gland.", marks: "2–3" },
      { name: "Tropisms in plants (phototropism, geotropism, hydrotropism, chemotropism)", oneLineUse: "Identify the stimulus and the direction of growth.", marks: "1–2" },
    ],
    formulaUsePreview: {
      kind: "process",
      title: "Reflex arc protocol",
      whenToUse: [
        "5-mark question on involuntary actions",
        "Diagram-based question on knee jerk or hand-on-hot-object",
      ],
      directUse: "Stimulus → receptor → sensory neuron → spinal cord → motor neuron → effector → response.",
      commonTrap: "Routing the impulse through the brain — reflexes go via the spinal cord.",
    },
    fullFormulaUseMap: [
      {
        kind: "definition",
        title: "Endocrine glands quick table",
        whenToUse: [
          "2- or 3-mark recall questions",
          "Match-the-following style questions",
        ],
        commonTrap: "Naming the hormone but skipping its function — both are needed for the mark.",
      },
    ],
    commonMistake: "Routing reflex impulses through the brain instead of the spinal cord.",
    examinerWarning: "Use direction arrows on neuron and reflex-arc diagrams; unmarked arrows lose the diagram mark.",
  },
  "real-numbers": {
    topicSnapshot: {
      likelySection: "Sections A/B/C — a 1-mark FTA or HCF–LCM MCQ/VSA plus one short-answer irrationality proof (≈6 marks in all).",
      examinerNotes: "Examiners reward complete stepwise prime factorisations, the explicit coprime assumption in proofs, and a clearly stated contradiction; marks are lost when irrationality is asserted without actually deriving the contradiction.",
    },
    boardEssentials: [
      { name: "Fundamental Theorem of Arithmetic (every composite = a unique product of primes)", oneLineUse: "Express any composite as primes and justify why its HCF/LCM factorisation is unique.", marks: "1–2" },
      { name: "HCF & LCM by prime factorisation (HCF = product of smallest common prime powers; LCM = greatest powers)", oneLineUse: "Read HCF and LCM straight off the prime factorisations of the numbers.", marks: "2–3" },
      { name: "HCF × LCM = product of the two numbers", oneLineUse: "Recover the fourth quantity when the other three are given.", marks: "1–3" },
      { name: "Irrationality of √2, √3, √5 by contradiction", oneLineUse: "Prove a surd is irrational using the coprime assumption and FTA.", marks: "2–3" },
    ],
    formulaUsePreview: {
      kind: "law",
      title: "Fundamental Theorem of Arithmetic — every composite number factorises into primes uniquely (apart from order)",
      whenToUse: [
        "Writing a composite number as a product of primes for an HCF/LCM question",
        "Justifying that the prime factorisation used is the only possible one",
        "Supplying the backbone step in an irrationality proof (a prime dividing a² divides a)",
      ],
      directUse: "Break the number into a product of primes, e.g. 156 = 2² × 3 × 13, then read off factors as the question needs.",
      hiddenUse: "In the √2 proof, FTA guarantees 2 | a² ⇒ 2 | a — the key deduction that forces the contradiction.",
      combinedUse: "Pair with HCF × LCM = product: factorise both numbers once, extract HCF and LCM, then verify their product equals the product of the numbers.",
      commonTrap: "Treating the factorisation as non-unique, or forgetting it applies only to composite numbers (1 is neither prime nor composite).",
    },
    fullFormulaUseMap: [
      {
        kind: "formula",
        title: "HCF(a, b) × LCM(a, b) = a × b",
        whenToUse: [
          "Finding LCM when the HCF and both numbers are known",
          "Finding one number when HCF, LCM and the other number are given",
        ],
        directUse: "Rearrange to LCM = (a × b) ÷ HCF, or a = (HCF × LCM) ÷ b.",
        commonTrap: "This relation holds for TWO numbers only — it fails for three or more, where HCF × LCM ≠ product.",
      },
      {
        kind: "process",
        title: "Prime-factorisation method for HCF and LCM",
        whenToUse: [
          "Computing the HCF and LCM of two or three numbers",
          "Setting up the HCF × LCM check",
        ],
        directUse: "List each number's prime powers; HCF takes the lowest power of each common prime, LCM takes the highest power of every prime that appears.",
        commonTrap: "Swapping the rule — taking the highest powers for HCF or the lowest powers for LCM.",
      },
    ],
    commonMistake: "Mixing up the prime powers — using the highest powers for HCF and the lowest for LCM instead of the other way round.",
    examinerWarning: "In an irrationality proof, always open with \"assume √2 = a/b where a and b are coprime integers, b ≠ 0\" — the coprime assumption is a marked step, and skipping it costs method marks even when the contradiction is reached.",
  },
  polynomials: {
    topicSnapshot: {
      likelySection: "Sections A/B/C — a 1-mark graph/zero-count MCQ plus a 2–3 mark zeroes-and-coefficients numerical.",
      examinerNotes: "Boards reward stating α+β and αβ explicitly, keeping the correct sign on −b/a, and adding a clean verification step after factorising.",
    },
    boardEssentials: [
      { name: "Geometrical meaning of zeroes (graph cuts the x-axis)", oneLineUse: "Read the number of zeroes straight off a graph in a 1-mark MCQ.", marks: "1–2" },
      { name: "Relationship between zeroes and coefficients (α+β = −b/a, αβ = c/a)", oneLineUse: "Get sum and product of zeroes without solving the quadratic.", marks: "2–3" },
      { name: "Finding zeroes by factorisation and verifying the relationship", oneLineUse: "Split the middle term to get α, β, then confirm against the coefficients.", marks: "2–3" },
      { name: "Forming a quadratic from its zeroes: k[x² − (α+β)x + αβ]", oneLineUse: "Build a quadratic when the two zeroes (or their sum and product) are given.", marks: "1–3" },
    ],
    formulaUsePreview: {
      kind: "formula",
      title: "α + β = −b/a and αβ = c/a (zeroes ↔ coefficients)",
      whenToUse: [
        "Given a quadratic, find the sum and product of its zeroes without solving it.",
        "Find one zero when the other zero and the coefficients are known.",
        "Verify zeroes obtained by factorisation against the coefficients for the last mark.",
      ],
      directUse: "Read a, b, c off ax² + bx + c and substitute: sum = −b/a, product = c/a.",
      hiddenUse: "When only the sum or product of zeroes and one coefficient are given, back-solve for the unknown coefficient.",
      combinedUse: "Pair with factorisation: factor to get α and β, then confirm α+β = −b/a and αβ = c/a for the verification step.",
      commonTrap: "Dropping the negative sign — the sum of zeroes is −b/a, not b/a.",
    },
    fullFormulaUseMap: [
      {
        kind: "formula",
        title: "Quadratic from zeroes: k[x² − (α+β)x + αβ]",
        whenToUse: [
          "Construct a quadratic when its two zeroes are given.",
          "Build a quadratic from a stated sum and product of zeroes.",
        ],
        directUse: "Compute α+β and αβ, then write x² − (α+β)x + αβ.",
        commonTrap: "Writing +(α+β)x instead of −(α+β)x, or forgetting that any non-zero multiple k gives a valid answer.",
      },
      {
        kind: "definition",
        title: "Zeroes as x-intercepts of y = p(x)",
        whenToUse: [
          "Read the number of zeroes from a given graph in an MCQ.",
          "Decide how many times the parabola meets the x-axis from its zeroes.",
        ],
        commonTrap: "Counting where the curve meets the y-axis instead of the x-axis.",
      },
    ],
    commonMistake: "Writing the sum of zeroes as b/a instead of −b/a (sign error on the linear coefficient).",
    examinerWarning: "For ax² + bx + c, identify a, b and c with their signs before substituting into −b/a and c/a — a single sign slip loses the relationship mark.",
  },
  "pair-of-linear-equations": {
    topicSnapshot: {
      likelySection: "Sections B/C/D — one algebraic solve (substitution or elimination), a consistency/number-of-solutions check, and one framed word problem.",
      examinerNotes: "Boards reward clearly chosen and stated method, comparison of the a₁/a₂, b₁/b₂, c₁/c₂ ratios before concluding, and word problems where both equations are framed with defined variables before solving.",
    },
    boardEssentials: [
      { name: "Graphical method (two lines: intersecting → unique, parallel → none, coincident → infinite)", oneLineUse: "Plot both lines and read the solution off the intersection point.", marks: "2–3" },
      { name: "Consistency conditions (a₁/a₂ vs b₁/b₂ vs c₁/c₂)", oneLineUse: "Decide the number of solutions or find k without solving.", marks: "1–3" },
      { name: "Substitution method", oneLineUse: "Express one variable and plug into the other equation.", marks: "2–3" },
      { name: "Elimination method", oneLineUse: "Match coefficients, add/subtract to knock out one variable.", marks: "2–3" },
      { name: "Framing & solving word problems (ages, speed, digits, fractions)", oneLineUse: "Turn a real situation into a solvable pair of equations.", marks: "3–5" },
    ],
    formulaUsePreview: {
      kind: "process",
      title: "Consistency test: compare a₁/a₂, b₁/b₂, c₁/c₂",
      whenToUse: [
        "Decide without solving whether a pair has one, no, or infinitely many solutions.",
        "Find the value of k so the pair is consistent / inconsistent / has a unique solution.",
        "Match a given pair to intersecting, parallel or coincident lines.",
      ],
      directUse: "Compute the three ratios: a₁/a₂ ≠ b₁/b₂ → unique solution; a₁/a₂ = b₁/b₂ ≠ c₁/c₂ → no solution; a₁/a₂ = b₁/b₂ = c₁/c₂ → infinitely many.",
      hiddenUse: "Reverse it — set the required ratio equality/inequality to solve for an unknown coefficient k.",
      combinedUse: "Pair with the graphical picture to justify why the lines intersect, are parallel or coincide.",
      commonTrap: "Forgetting to check c₁/c₂ — the no-solution case (ratios of a and b equal but c different) is wrongly reported as infinitely many.",
    },
    fullFormulaUseMap: [
      {
        kind: "process",
        title: "Elimination method",
        whenToUse: [
          "Both equations are in standard ax + by = c form.",
          "Coefficients can be matched by small multipliers.",
        ],
        directUse: "Multiply the equations to equalise one variable's coefficient, then add or subtract to eliminate it and solve for the other.",
        commonTrap: "Adding when the matched coefficients have the same sign (or subtracting when opposite) — the variable is not eliminated.",
      },
      {
        kind: "process",
        title: "Substitution method",
        whenToUse: [
          "One variable already has coefficient 1 (easy to isolate).",
          "One equation solves cleanly for x or y.",
        ],
        directUse: "Express one variable from one equation and substitute into the other to get a single-variable equation.",
        commonTrap: "Substituting the isolated expression back into the SAME equation, which collapses to 0 = 0 and yields nothing.",
      },
    ],
    commonMistake: "Concluding the number of solutions from a₁/a₂ = b₁/b₂ alone without checking c₁/c₂, so no-solution (parallel) pairs are mislabelled as infinitely many (coincident).",
    examinerWarning: "In word problems, define both variables and write both equations before solving — an answer with no framed equations loses the setup marks even if the final numbers are right.",
  },
  "arithmetic-progression": {
    topicSnapshot: {
      likelySection: "Sections A/B/C/D — a 1-mark nth-term or common-difference MCQ, plus a 3–5 mark sum or word problem.",
      examinerNotes: "Boards reward correctly identifying a, d and n before substituting, showing the formula first, and stating the final answer cleanly; marks are lost for silent arithmetic and for muddling term number n with the term value aₙ.",
    },
    boardEssentials: [
      { name: "Common difference d = aₙ − aₙ₋₁ (test for an AP)", oneLineUse: "Confirm a list is an AP and read off a and d before anything else.", marks: "1–2" },
      { name: "nth term aₙ = a + (n−1)d", oneLineUse: "Find any term, the number of terms, or set up an equation from a given term.", marks: "1–3" },
      { name: "Sum of first n terms Sₙ = n/2[2a + (n−1)d]", oneLineUse: "Total the first n terms straight from a, d and n.", marks: "2–5" },
      { name: "Sum with last term Sₙ = n/2(a + l)", oneLineUse: "Add terms quickly when the last term l is known instead of d.", marks: "2–3" },
    ],
    formulaUsePreview: {
      kind: "formula",
      title: "nth term of an AP: aₙ = a + (n−1)d",
      whenToUse: [
        "Find a specific term such as the 20th term of a given AP.",
        "Find how many terms an AP has, or which term equals a given value.",
        "Form an equation from a stated term (e.g. \"the 7th term is 34\") to solve for a or d.",
      ],
      directUse: "Substitute a, d and n to output the term value in one step.",
      hiddenUse: "Rearrange to n = (aₙ − a)/d + 1 to count terms or check whether a number belongs to the AP (n must be a positive integer).",
      combinedUse: "Pair two term-equations (e.g. a₄ and a₉ given) to solve simultaneously for a and d, then feed them into Sₙ.",
      commonTrap: "Using n instead of (n−1): writing a + nd. The multiplier of d is always one less than the term number.",
    },
    fullFormulaUseMap: [
      {
        kind: "formula",
        title: "Sum of first n terms: Sₙ = n/2[2a + (n−1)d]",
        whenToUse: [
          "Add a fixed number of terms of an AP from a, d and n.",
          "Given Sₙ, solve back for n (a quadratic in n) or for d.",
          "Recover a single term via aₙ = Sₙ − Sₙ₋₁.",
        ],
        directUse: "Substitute a, d and n to get the running total directly.",
        hiddenUse: "Setting Sₙ equal to a target value gives a quadratic in n — reject any negative or non-integer root.",
        combinedUse: "Combine with aₙ = a + (n−1)d when both a term and a sum are stated in the same word problem.",
        commonTrap: "Splitting n/2 wrongly or forgetting the bracket multiplies the whole [2a + (n−1)d]; keep the factor n/2 outside the full bracket.",
      },
      {
        kind: "formula",
        title: "Sum when the last term is known: Sₙ = n/2(a + l)",
        whenToUse: [
          "Sum an AP whose first term a and last term l are both given.",
          "Find the number of terms n when the sum, first and last terms are known.",
          "Word problems phrased as \"from the first to the last\" (e.g. logs, seats, instalments).",
        ],
        directUse: "Average the first and last terms and multiply by n to get the sum in one line.",
        hiddenUse: "Here l is just aₙ = a + (n−1)d, so find n first when it is not given before summing.",
        commonTrap: "Using this form when the last term l is not actually known — you must compute l or switch to Sₙ = n/2[2a + (n−1)d].",
      },
    ],
    commonMistake: "Taking the multiplier of d as n instead of (n−1) in the nth-term formula, so every term and sum comes out one step off.",
    examinerWarning: "State the values of a, d and n explicitly and write the formula before substituting — boards award method marks for the correct formula even when the final arithmetic slips.",
  },
  circles: {
    topicSnapshot: {
      likelySection: "Sections B/C/D — a tangent-property proof plus one length-of-tangent numerical, often set inside a triangle or quadrilateral.",
      examinerNotes: "Boards reward stating the theorem/criterion before using it, a clean labelled figure, and marking the right angle at the point of contact; missing the ⟂ justification loses the reasoning mark.",
    },
    boardEssentials: [
      { name: "Tangent ⟂ radius at the point of contact (∠ between radius and tangent = 90°)", oneLineUse: "Introduce a right angle so Pythagoras or angle-chasing can start.", marks: "1–3" },
      { name: "Two tangents from an external point are equal (PA = PB)", oneLineUse: "Equate the two tangent lengths to set up or close a proof.", marks: "2–3" },
      { name: "Length of tangent from external point: ℓ = √(d² − r²)", oneLineUse: "Compute the tangent length once the radius and centre-distance are known.", marks: "2–3" },
      { name: "Number of tangents from a point (0 inside, 1 on, 2 outside the circle)", oneLineUse: "Decide how many tangents exist from a given point in 1-mark MCQs.", marks: "1" },
    ],
    formulaUsePreview: {
      kind: "law",
      title: "Tangent ⟂ radius at the point of contact",
      whenToUse: [
        "A tangent meets the circle and the radius is drawn to the contact point — mark 90° there.",
        "A numerical gives centre-distance d and radius r and asks for the tangent length.",
        "A proof needs a right angle to invoke Pythagoras or an angle sum.",
      ],
      directUse: "Mark the 90° angle between the radius and the tangent, then apply Pythagoras in the right triangle formed with the centre.",
      hiddenUse: "In tangent-length problems the right angle silently converts d (= OP), r and the tangent length into a Pythagorean relation: ℓ = √(d² − r²).",
      combinedUse: "Combined with the equal-tangents property, the right angle makes triangles OPA and OPB congruent by RHS (equal radii OA = OB, common hypotenuse OP), which is exactly how the equal-length-of-tangents theorem is proved.",
      commonTrap: "Assuming the radius is perpendicular to the chord of contact rather than to the tangent line itself — the 90° is between the radius and the tangent at the contact point.",
    },
    fullFormulaUseMap: [
      {
        kind: "law",
        title: "Two tangents from an external point are equal in length (PA = PB)",
        whenToUse: [
          "Two tangents are drawn from one outside point to the same circle.",
          "A circle is inscribed in a triangle or quadrilateral and you must relate side segments.",
        ],
        directUse: "State PA = PB to equate the two tangent segments from the external point.",
        combinedUse: "With the tangent-radius right angle it forces the two triangles OPA and OPB to be congruent (RHS), which is the standard way the equality is proved.",
        commonTrap: "Quoting PA = PB as a given fact in a proof-of-the-theorem question — when the theorem itself is being proved you must derive it via RHS congruence, not assume it.",
      },
    ],
    commonMistake: "Treating the tangent like a secant/chord — drawing the radius to a nearby point instead of the exact point of contact, so the crucial 90° angle is placed wrongly.",
    examinerWarning: "Always draw and label the radius to the point of contact and mark the right angle before writing any working — the 90° is where the reasoning mark is awarded, and an unmarked figure loses it.",
  },
  "areas-related-to-circles": {
    topicSnapshot: {
      likelySection: "Sections A/C/D — a 1-mark arc-or-sector recall, a sector/segment numerical, and a combination-of-figures application.",
      examinerNotes: "Boards reward the correct θ/360 fraction, keeping π symbolic until the last step (then substituting 22/7 or 3.14 exactly as told), subtracting the triangle for a minor segment, and clean cm² units.",
    },
    boardEssentials: [
      { name: "Circumference & area recap (C = 2πr, A = πr²)", oneLineUse: "Convert a given circumference, diameter or area into the radius you actually need.", marks: "1–2" },
      { name: "Length of an arc of a sector (l = (θ/360)×2πr)", oneLineUse: "Find arc length or the sector's perimeter (arc + two radii) in one step.", marks: "1–3" },
      { name: "Area of a sector (A = (θ/360)×πr²)", oneLineUse: "Turn a central angle and radius straight into the sector's area.", marks: "2–3" },
      { name: "Area of a segment (sector area − area of triangle)", oneLineUse: "Subtract the triangle from the sector to get a minor segment; add for the major.", marks: "3–5" },
      { name: "Area of combinations of plane figures (add/subtract circle ± triangle/square/rectangle)", oneLineUse: "Split a shaded design into standard pieces, then add or subtract their areas.", marks: "3–5" },
    ],
    formulaUsePreview: {
      kind: "formula",
      title: "Area of a sector = (θ/360) × πr²",
      whenToUse: [
        "A slice of a circle is cut by a central angle θ and you need its area (e.g. a fan, pizza slice or wiper sweep).",
        "You must find the area of a minor segment — compute the sector first, then subtract the triangle.",
        "A combination figure contains a quarter or half circle (θ = 90° or 180°) hidden inside it.",
      ],
      directUse: "Read off θ and r, put them in as the fraction θ/360 of the full πr².",
      hiddenUse: "The same θ/360 fraction gives the arc length when you multiply the whole circumference 2πr instead of the area.",
      combinedUse: "Pair it with the area of the triangle (½r²sinθ, or ½ × base × height for 60°/90°) to reach any segment.",
      commonTrap: "Using θ/180 or writing πr² without the θ/360 fraction — the sector is only a fraction of the whole circle, not the whole circle.",
    },
    fullFormulaUseMap: [
      {
        kind: "formula",
        title: "Area of a segment = (θ/360)×πr² − area of the triangle",
        whenToUse: [
          "The question asks for a minor segment cut off by a chord.",
          "A shaded region is the part of a sector left after removing the triangle.",
        ],
        directUse: "Compute the sector area, then subtract the enclosed triangle's area.",
        combinedUse: "For a major segment, take the whole circle πr² and subtract the minor-segment area you just found.",
        commonTrap: "Forgetting to subtract the triangle, so the segment gets reported as the full sector.",
      },
      {
        kind: "formula",
        title: "Length of an arc = (θ/360) × 2πr",
        whenToUse: [
          "You need the curved edge of a sector, or the running/fencing length along a circular boundary.",
          "The perimeter of a sector is asked — remember it is arc length PLUS the two radii.",
        ],
        directUse: "Take the fraction θ/360 of the full circumference 2πr.",
        commonTrap: "Reporting only the arc as the sector's perimeter and leaving out the two bounding radii (+2r).",
      },
    ],
    commonMistake: "Forgetting to subtract the triangle from the sector when finding a minor segment, so the segment answer wrongly equals the full sector area.",
    examinerWarning: "Always state area in square units (cm²/m²) and use the exact value of π the question specifies (22/7 or 3.14) — boards deduct for a missing unit and for silently switching π.",
  },
  statistics: {
    topicSnapshot: {
      likelySection: "Sections B/C/D — one full mean/median/mode computation from a frequency table, plus a short modal-class or empirical-relationship item.",
      examinerNotes: "Boards reward a correctly-built frequency / cumulative-frequency table, correct continuous class boundaries, explicit identification of the median or modal class, and clean substitution with the final measure stated.",
    },
    boardEssentials: [
      { name: "Mean of grouped data — direct, assumed-mean & step-deviation (x̄ = Σfᵢxᵢ/Σfᵢ)", oneLineUse: "Compute the average from a frequency table — pick the method that keeps the arithmetic lightest.", marks: "2–3" },
      { name: "Median of grouped data: Median = l + ((n/2 − cf)/f)×h", oneLineUse: "Find the middle value from the cumulative-frequency table in one substitution.", marks: "3–5" },
      { name: "Mode of grouped data: Mode = l + ((f₁ − f₀)/(2f₁ − f₀ − f₂))×h", oneLineUse: "Locate the most frequent value using the modal (highest-frequency) class.", marks: "2–3" },
      { name: "Empirical relationship: Mode = 3 Median − 2 Mean", oneLineUse: "Recover the third measure when two are already known, with no fresh table.", marks: "1–2" },
    ],
    formulaUsePreview: {
      kind: "formula",
      title: "Median of grouped data: Median = l + ((n/2 − cf)/f) × h",
      whenToUse: [
        "A grouped frequency table asks directly for the median.",
        "You must first build the cumulative-frequency column to locate n/2 and its class.",
        "The empirical relationship needs the median value from raw grouped data.",
      ],
      directUse: "Build the cumulative-frequency column, compute n/2, identify the median class, then substitute l (lower boundary), cf (of the class above), f (median-class frequency) and h (class width).",
      hiddenUse: "Supplies the median that the empirical relationship Mode = 3 Median − 2 Mean requires.",
      combinedUse: "Pair with the mean and the empirical relationship to get the mode without a separate modal-class calculation.",
      commonTrap: "Taking cf as the median class's OWN frequency instead of the cumulative frequency of the class just ABOVE it, or locating n/2 in the wrong class.",
    },
    fullFormulaUseMap: [
      {
        kind: "formula",
        title: "Mode of grouped data: Mode = l + ((f₁ − f₀)/(2f₁ − f₀ − f₂)) × h",
        whenToUse: [
          "Asked for the most frequent value of a grouped distribution.",
          "The modal class (highest-frequency class) can be identified from the table.",
        ],
        directUse: "Identify the modal class, then substitute l, f₁ (modal-class frequency), f₀ (class before), f₂ (class after) and h.",
        commonTrap: "Swapping f₀ and f₂ — f₀ is the class BEFORE the modal class and f₂ the class AFTER; interchanging them flips the answer.",
      },
      {
        kind: "formula",
        title: "Step-deviation mean: x̄ = a + h × (Σfᵢuᵢ / Σfᵢ), where uᵢ = (xᵢ − a)/h",
        whenToUse: [
          "Class marks are large or equally spaced and direct multiplication is heavy.",
          "An assumed mean a and a common class width h simplify the arithmetic.",
        ],
        directUse: "Choose an assumed mean a, form uᵢ = (xᵢ − a)/h, tabulate fᵢuᵢ, then substitute into x̄ = a + h(Σfᵢuᵢ/Σfᵢ).",
        commonTrap: "Forgetting to multiply the deviation term by h, or dropping the assumed mean a when writing the final answer.",
      },
    ],
    commonMistake: "Using class limits instead of continuous class boundaries — not converting an inclusive (discontinuous) table before reading l, cf and the modal/median class.",
    examinerWarning: "Show the cumulative-frequency (or fᵢxᵢ / fᵢuᵢ) column explicitly and state which class is the median/modal class before substituting — the table and class-identification each carry their own marks, and a final answer without them loses working marks.",
  },
  probability: {
    topicSnapshot: {
      likelySection: "Sections A/B/C — a 1-mark MCQ on an event's probability, a 2-mark complement/range item, and one 3-mark problem enumerating outcomes for two coins, two dice or a card draw.",
      examinerNotes: "Boards reward writing the total number of outcomes and the favourable count explicitly before dividing, keeping probabilities as reduced fractions, and stating P(not E) = 1 − P(E) rather than recounting.",
    },
    boardEssentials: [
      { name: "Theoretical probability P(E) = number of favourable outcomes / total number of outcomes", oneLineUse: "The default engine for every coin, die, card or marble question — count both totals and divide.", marks: "1–3" },
      { name: "Complement rule P(not E) = 1 − P(E)", oneLineUse: "Get the 'at least / not' probability without recounting outcomes.", marks: "1–2" },
      { name: "Range and event types: sure event = 1, impossible event = 0, 0 ≤ P(E) ≤ 1", oneLineUse: "Sanity-check any answer and settle 1-mark true/false or fill-in items.", marks: "1–2" },
      { name: "Equally likely outcomes on standard experiments (coins, dice, cards, marbles)", oneLineUse: "Justify why each outcome carries the same weight before you count.", marks: "1–2" },
      { name: "Sample space of compound experiments (two coins, two dice, drawing a card)", oneLineUse: "List all 4, 36 or 52 outcomes to fix the denominator for 3-mark problems.", marks: "3–5" },
    ],
    formulaUsePreview: {
      kind: "formula",
      title: "P(E) = number of favourable outcomes / total number of outcomes",
      whenToUse: [
        "A single die or coin is tossed and you need P(a prime), P(an even number) or P(a head).",
        "One card is drawn from a well-shuffled deck of 52 and you need P(a king), P(a red card) or P(a face card).",
        "A marble is drawn at random from a bag of known colours and you need the probability of a stated colour.",
      ],
      directUse: "Count the favourable outcomes, divide by the total number of equally likely outcomes, and reduce the fraction (e.g. P(even on a die) = 3/6 = 1/2).",
      hiddenUse: "In a 'two dice' problem the real work is fixing the denominator as 36 first; once the sample space size is right, the favourable count follows.",
      combinedUse: "Pair it with P(not E) = 1 − P(E) when the favourable count is large — count the small complement, then subtract from 1.",
      commonTrap: "Forgetting that outcomes must be equally likely — students count 'sum = 2' and 'sum = 7' on two dice as one outcome each, but 7 has six ordered outcomes and 2 has only one.",
    },
    fullFormulaUseMap: [
      {
        kind: "formula",
        title: "Complement rule: P(not E) = 1 − P(E)",
        whenToUse: [
          "'At least one' or 'not a …' questions where the complement is far quicker to count.",
          "Given P(E), asked for the probability the event does not happen.",
        ],
        directUse: "Compute P(E), then subtract from 1 (e.g. if P(defective) = 3/20 then P(not defective) = 17/20).",
        commonTrap: "Writing P(not E) = 1 − E or subtracting counts instead of probabilities — it is 1 minus the probability, always a value in [0, 1].",
      },
      {
        kind: "definition",
        title: "Sure event = 1, impossible event = 0, and 0 ≤ P(E) ≤ 1",
        whenToUse: [
          "A 1-mark item asks whether a stated number can be a probability (e.g. is −0.3 or 1.5 valid?).",
          "Checking that P(E) and P(not E) sum to 1 before writing the final answer.",
        ],
        directUse: "Reject any probability outside [0, 1]; assign 1 to a certain event (a die shows a number ≤ 6) and 0 to an impossible one (a die shows 7).",
        commonTrap: "Treating a very likely event as having probability greater than 1, or writing a probability as a number bigger than 1 after mis-counting the denominator.",
      },
    ],
    commonMistake: "Miscounting the total number of outcomes — using 6 instead of 36 for two dice, or 6 instead of 52 for a card draw — so every probability comes out wrong even when the favourable count is right.",
    examinerWarning: "Always write the total number of outcomes and the number of favourable outcomes explicitly before dividing, and give the answer as a reduced fraction (or exact decimal) in [0, 1] — bald answers with no outcome count lose the method mark.",
  },
  "metals-and-non-metals": {
    topicSnapshot: {
      likelySection: "Sections A/B/C — reactivity-series MCQs, displacement and equation writing, and a metallurgy or ionic-bonding short answer.",
      examinerNotes: "Boards reward balanced equations with state symbols, a correctly ordered reactivity series, and a clean roasting-vs-calcination distinction; marks are lost for unbalanced equations and missing conditions (heat, catalyst, state symbols).",
    },
    boardEssentials: [
      { name: "Reactivity series (K > Na > Ca > Mg > Al > Zn > Fe > Pb > H > Cu > Ag > Au)", oneLineUse: "Predict displacement and decide reaction with water/acids and extraction route.", marks: "1–3" },
      { name: "Reactions of metals — with O₂, water, acids & salt solutions (displacement)", oneLineUse: "Write balanced equations and predict products in reaction-based questions.", marks: "2–3" },
      { name: "Ionic (electrovalent) bond & properties of ionic compounds (e.g. Na → Na⁺ + e⁻)", oneLineUse: "Explain electron transfer and justify high melting point / conductivity in molten state.", marks: "2–3" },
      { name: "Extraction of metals — roasting, calcination, reduction, electrolytic refining", oneLineUse: "Sequence the metallurgy steps for a given ore and its reactivity.", marks: "3–5" },
      { name: "Corrosion & its prevention (rusting needs both air and moisture)", oneLineUse: "State rusting conditions and prevention methods (galvanisation, painting, oiling).", marks: "1–3" },
    ],
    formulaUsePreview: {
      kind: "process",
      title: "Reactivity series: K > Na > Ca > Mg > Al > Zn > Fe > Pb > (H) > Cu > Ag > Au",
      whenToUse: [
        "Deciding whether one metal displaces another from its salt solution",
        "Predicting which metals react with cold water, steam or dilute acids",
        "Choosing the extraction method (electrolysis vs carbon reduction) from a metal's position",
      ],
      directUse: "A more reactive metal displaces a less reactive one from its salt solution, e.g. Fe(s) + CuSO₄(aq) → FeSO₄(aq) + Cu(s).",
      hiddenUse: "Position dictates extraction — very reactive metals (K, Na, Ca, Mg, Al) are obtained by electrolysis, middle ones (Zn, Fe, Pb) by reduction of their oxide with carbon, and the least reactive (Ag, Au) occur free.",
      combinedUse: "Combine with reactions: K/Na/Ca react with cold water, Mg reacts with hot water/steam, Al/Zn/Fe react only with steam, and metals below hydrogen do not displace H₂ from dilute acids.",
      commonTrap: "Copper, silver and gold lie below hydrogen, so they do NOT react with dilute HCl or H₂SO₄ to release H₂ — students wrongly write a hydrogen-evolving reaction.",
    },
    fullFormulaUseMap: [
      {
        kind: "definition",
        title: "Ionic bond — transfer of electrons from a metal to a non-metal (e.g. Na⁺Cl⁻)",
        whenToUse: [
          "Explaining formation of NaCl or MgCl₂ by electron transfer",
          "Justifying high melting/boiling points and electrical conductivity of ionic compounds",
          "Distinguishing ionic from covalent compounds in a compare question",
        ],
        directUse: "The metal loses electron(s) to form a cation and the non-metal gains them to form an anion; strong electrostatic attraction holds the lattice together.",
        commonTrap: "Ionic compounds conduct electricity only in the molten or aqueous state (free-moving ions), NOT as solids — students wrongly say they conduct while solid.",
      },
      {
        kind: "process",
        title: "Metallurgy: roasting / calcination → reduction → electrolytic refining",
        whenToUse: [
          "Extracting a metal from its sulphide or carbonate ore",
          "Converting a concentrated ore to its oxide before reduction",
          "Purifying an impure metal after extraction",
        ],
        directUse: "Roast a sulphide ore (or calcine a carbonate ore) to the metal oxide, reduce the oxide to metal (carbon for moderately reactive metals, electrolysis for reactive ones), then refine electrolytically.",
        commonTrap: "Assuming carbon reduction works for every metal — highly reactive metals (Na, Mg, Al) must be extracted by electrolysis of the molten ore, not by carbon.",
      },
    ],
    commonMistake: "Confusing roasting with calcination — roasting heats a sulphide ore strongly in excess air, while calcination heats a carbonate ore in limited air; students routinely swap the two ore types.",
    examinerWarning: "Always balance chemical equations and include state symbols — (s), (l), (g), (aq) — boards routinely deduct half a mark for a missing state symbol or an unbalanced equation.",
  },
  "human-eye-and-colourful-world": {
    topicSnapshot: {
      likelySection: "Sections C/D — one defect-correction numerical plus reason-based questions on dispersion, scattering and atmospheric refraction.",
      examinerNotes: "Boards reward the correct lens type stated WITH the sign of its power, labelled ray diagrams, and cause-based reasoning (why the sky is blue, why the sun looks red) rather than one-word answers.",
    },
    boardEssentials: [
      { name: "Power of accommodation (ciliary muscles vary focal length; near point 25 cm, far point ∞)", oneLineUse: "Explain how a normal eye focuses near and distant objects on the retina.", marks: "1–3" },
      { name: "Defects of vision and correction — myopia (concave, −P), hypermetropia (convex, +P), presbyopia", oneLineUse: "Name the defect, pick the corrective lens and justify its sign of power.", marks: "3–5" },
      { name: "Lens power P = 1/f (dioptre) for the corrective lens", oneLineUse: "Compute the lens needed once the required focal length is fixed.", marks: "2–3" },
      { name: "Refraction through a prism and dispersion of white light (VIBGYOR spectrum)", oneLineUse: "Explain the spectrum and angle of deviation on a prism diagram.", marks: "2–3" },
      { name: "Atmospheric refraction (twinkling of stars, advance sunrise, delayed sunset)", oneLineUse: "Give the refraction-based cause for everyday sky phenomena.", marks: "2–3" },
      { name: "Scattering of light (Tyndall effect, blue sky, reddening of the sun)", oneLineUse: "Use wavelength-dependent scattering to explain sky and sun colours.", marks: "2–3" },
    ],
    formulaUsePreview: {
      kind: "formula",
      title: "Lens power P = 1/f (P in dioptre D, f in metre)",
      whenToUse: [
        "Finding the power of the spectacle lens a myopic or hypermetropic eye needs",
        "Converting a required focal length into dioptres for the answer",
        "Fixing the sign of power: concave lens gives P negative, convex lens gives P positive",
      ],
      directUse: "Given the corrective focal length f, substitute in metres to get P directly, e.g. f = −0.5 m → P = −2 D.",
      hiddenUse: "For myopia, f equals the (negative) far-point distance; for hypermetropia, f is fixed by making the near point image form at 25 cm.",
      combinedUse: "Pair with the lens formula 1/f = 1/v − 1/u to first solve for f from the defective eye's near/far point, then feed f into P = 1/f.",
      commonTrap: "Leaving f in centimetres — P must use f in metres, so a 50 cm lens is ±2 D, not ±0.02 D; also dropping the negative sign for a concave lens.",
    },
    fullFormulaUseMap: [
      {
        kind: "process",
        title: "Matching the defect to its corrective lens",
        whenToUse: [
          "Deciding concave vs convex when only the defect is named",
          "Explaining why the image shifts back onto the retina after correction",
        ],
        directUse: "Myopia (image forms before the retina, far point < ∞) → diverging concave lens; hypermetropia (image forms behind the retina, near point > 25 cm) → converging convex lens; presbyopia (age-related, near point recedes) → convex reading lens, and a bifocal lens only when a distance-vision defect (e.g. myopia) is also present.",
        hiddenUse: "Presbyopia is age-related loss of accommodation (weak ciliary muscles / inelastic lens), so the near point recedes and near vision fails — reading needs a convex lens; a bifocal is used when the same person also has a distance defect, not for presbyopia alone.",
        commonTrap: "Swapping the lenses — putting a convex lens on a myopic eye — or claiming presbyopia is corrected by a single concave lens.",
      },
      {
        kind: "law",
        title: "Wavelength-dependent scattering (shorter wavelengths scatter more)",
        whenToUse: [
          "Explaining the blue colour of the clear sky",
          "Explaining why the sun looks red at sunrise and sunset",
        ],
        directUse: "Blue light (shorter λ) scatters far more than red by fine air molecules, so the scattered sky looks blue.",
        hiddenUse: "At sunrise/sunset light travels a longer air path, so most blue is scattered away and mainly red reaches the eye — the same law explains both facts.",
        commonTrap: "Saying the sky is blue because it reflects the sea, or that large dust particles (not molecular scattering) cause the blue colour.",
      },
    ],
    commonMistake: "Assigning the wrong corrective lens — using a convex lens for myopia and a concave lens for hypermetropia — because the direction of the image shift relative to the retina is reversed.",
    examinerWarning: "In correction numericals always state the lens type AND the sign of the power with its unit (concave = negative D, convex = positive D) — a bare magnitude without the sign or the dioptre unit loses marks.",
  },
  "how-do-organisms-reproduce": {
    topicSnapshot: {
      likelySection: "Sections A/C/D — a 1-mark MCQ/AR on modes or flower parts, plus a 3–5 mark labelled-diagram answer on the flower or the human reproductive system.",
      examinerNotes: "Boards reward correctly labelled diagrams (flower L.S., male & female systems), exact technical terms (stamen, carpel, oviduct, vas deferens), and one-function-per-organ answers; vague wording and unlabelled diagrams forfeit the separately-marked label credit.",
    },
    boardEssentials: [
      { name: "Asexual reproduction modes (fission, budding, fragmentation, regeneration, spore formation, vegetative propagation)", oneLineUse: "Match each organism to its mode and justify why offspring are near-identical.", marks: "1–3" },
      { name: "Sexual reproduction in a flower — parts of a flower, pollination, fertilisation", oneLineUse: "Label the L.S. of a flower and trace pollen → pollen tube → zygote.", marks: "3–5" },
      { name: "Human reproductive system (male & female) and its functions", oneLineUse: "Name each organ and state its one function in a labelled-diagram answer.", marks: "3–5" },
      { name: "Reproductive health — contraception / family planning and STD (HIV/AIDS) prevention", oneLineUse: "Classify contraceptive methods and link barrier methods to STD prevention.", marks: "2–3" },
      { name: "Variation and the role of DNA copying in reproduction", oneLineUse: "Explain why DNA copying with slight variation helps a species survive.", marks: "1–3" },
    ],
    formulaUsePreview: {
      kind: "process",
      title: "Fertilisation in a flower: pollination → pollen tube → male gamete fuses with egg → zygote → seed",
      whenToUse: [
        "A 5-mark question asking you to describe fertilisation in flowering plants with a labelled diagram.",
        "A question tracing what happens after a pollen grain lands on the stigma.",
        "Distinguishing self- from cross-pollination before the fertilisation step.",
      ],
      directUse: "Write the sequence: pollen germinates on the stigma → pollen tube grows through the style to the ovule → male gamete fuses with the egg (fertilisation) → zygote → embryo; the ovule becomes the seed and the ovary becomes the fruit.",
      hiddenUse: "Explains why the ovary ripens into a fruit and the ovules become seeds — the 'after fertilisation' extension examiners tack on.",
      combinedUse: "Pairs with a labelled flower L.S. diagram so each process step maps onto stigma, style, ovary and ovule.",
      commonTrap: "Confusing pollination (transfer of pollen to the stigma) with fertilisation (fusion of male gamete and egg) — they are two distinct steps and boards test the distinction.",
    },
    fullFormulaUseMap: [
      {
        kind: "process",
        title: "Matching an organism to its asexual mode (Amoeba–fission, Hydra–budding, Planaria–regeneration, Spirogyra–fragmentation, Rhizopus–spores, potato/Bryophyllum–vegetative)",
        whenToUse: [
          "A 1-mark MCQ naming the mode for a given organism.",
          "A 3-mark 'name the mode and explain with an example' question.",
        ],
        directUse: "State the mode, its example organism, and one line on how the offspring form.",
        commonTrap: "Calling regeneration a normal mode of reproduction — it is a special repair ability; a whole organism reproducing by breaking into pieces is fragmentation, not regeneration.",
      },
      {
        kind: "definition",
        title: "Functions of the key reproductive organs (testis–sperm + testosterone, ovary–egg + hormones, oviduct–site of fertilisation, uterus–development of the embryo)",
        whenToUse: [
          "A 2–3 mark 'state the function' question.",
          "Labelling a diagram of the human reproductive system.",
        ],
        directUse: "Give one precise function per organ; note that fertilisation occurs in the oviduct (fallopian tube) and the embryo develops in the uterus, nourished through the placenta.",
        commonTrap: "Writing that fertilisation happens in the uterus — it occurs in the oviduct; the uterus is only where the fertilised egg implants and develops.",
      },
    ],
    commonMistake: "Confusing pollination with fertilisation, and asexual with sexual reproduction — students blur the terms instead of tying each to whether one parent or two gametes are involved.",
    examinerWarning: "Use exact CBSE terms and label every part of the flower and reproductive-system diagrams — loose wording and unlabelled diagrams lose the separately-marked label credit.",
  },
  "our-environment": {
    topicSnapshot: {
      likelySection: "Sections A/B/C — a 1-mark MCQ or assertion-reason on trophic levels, the 10% law or ozone, plus a 2–3 mark question on food chains, biological magnification or biodegradable-vs-non-biodegradable waste.",
      examinerNotes: "Boards reward correctly directed food-chain arrows (energy flow), a clean statement of the 10% law with a worked energy figure, and exact examples for each waste category; vague 'harmful chemicals' answers on biomagnification and ozone lose marks.",
    },
    boardEssentials: [
      { name: "Ecosystem components — biotic (producers, consumers, decomposers) & abiotic", oneLineUse: "Classify any given organism/factor and define an ecosystem in short-answer questions.", marks: "1–3" },
      { name: "Food chains, food webs and trophic levels", oneLineUse: "Build or read a chain, assign trophic levels, and tell a chain from a web.", marks: "1–3" },
      { name: "Ten percent law of energy flow (only ~10% passes to the next level)", oneLineUse: "Calculate energy available up a chain and explain why chains are short (3–4 levels).", marks: "1–3" },
      { name: "Biological magnification", oneLineUse: "Explain why non-biodegradable toxins concentrate most in top consumers.", marks: "2–3" },
      { name: "Biodegradable vs non-biodegradable waste & its disposal", oneLineUse: "Sort given wastes into the two classes and justify the environmental impact.", marks: "1–3" },
      { name: "Ozone-layer depletion and its cause (CFCs)", oneLineUse: "State ozone's protective role and how CFCs break it down.", marks: "1–2" },
    ],
    formulaUsePreview: {
      kind: "law",
      title: "Ten percent law of energy flow (only ~10% of energy at one trophic level reaches the next)",
      whenToUse: [
        "Given the energy at producers, find the energy available to a secondary or tertiary consumer.",
        "Explain why a food chain rarely has more than three or four trophic levels.",
        "Justify why the number/biomass of organisms falls as you move up the chain.",
      ],
      directUse: "If producers hold 10,000 J, herbivores get ~1,000 J, primary carnivores ~100 J, and the next level ~10 J.",
      hiddenUse: "The steep energy loss is the reason top consumers are few and food chains stay short.",
      combinedUse: "Pairs with biological magnification — energy shrinks up the chain while non-biodegradable toxins concentrate up it.",
      commonTrap: "Applying the 10% gain (not loss) — energy DECREASES as you go up, and the flow is one-way (Sun → producer → consumer), never reversible.",
    },
    fullFormulaUseMap: [
      {
        kind: "definition",
        title: "Biological magnification (progressive toxin build-up up the chain)",
        whenToUse: [
          "Explain why pesticide/heavy-metal levels are highest in humans or large fish.",
          "Link it to non-biodegradable substances that the body cannot break down or excrete.",
        ],
        directUse: "A pesticide entering producers becomes more concentrated at each successive trophic level.",
        combinedUse: "Combine with the food-chain diagram to show the toxin rising level by level to the top consumer.",
        commonTrap: "Writing that only harmful chemicals magnify — magnification happens because the substance is NON-biodegradable and persists, not merely because it is toxic.",
      },
      {
        kind: "definition",
        title: "Biodegradable vs non-biodegradable waste",
        whenToUse: [
          "Sort a given list of wastes (e.g. paper, DDT, plastic, vegetable peels) into the two classes.",
          "Explain why non-biodegradable waste is a long-term environmental problem.",
        ],
        directUse: "Biodegradable: decomposed by microbes (kitchen waste, paper); non-biodegradable: not broken down (plastics, DDT, glass).",
        commonTrap: "Calling all plastics or all 'man-made' items non-biodegradable by rule — classify by whether decomposers can break it down, and give correct paired examples.",
      },
    ],
    commonMistake: "Reversing the 10% law — treating energy as if it increases up the chain, or applying it backwards — when energy actually decreases at each higher trophic level and flows in one direction only.",
    examinerWarning: "In every food chain, draw the arrow pointing TOWARD the organism that eats (→ shows the direction of energy flow, Sun → producer → consumer); a reversed or missing arrow loses the mark even if the organisms are correct.",
  },
};

// ── Sample-preview fallback for unseeded topics ───────────────────────────

const splitBlurbSentences = (blurb: string): string[] => {
  return blurb
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
};

const buildSampleActionable = (topic: DesktopTopicSummary): ActionableSeed => {
  const sentences = splitBlurbSentences(topic.blurb);
  const conceptSeeds = sentences.length > 0 ? sentences : [topic.blurb];
  const boardEssentials: BoardConcept[] = conceptSeeds.slice(0, 3).map((sentence, idx) => ({
    name:
      idx === 0
        ? `${topic.name} — core ideas`
        : idx === 1
          ? `${topic.name} — key applications`
          : `${topic.name} — supporting ideas`,
    oneLineUse: sentence.replace(/\.$/, ""),
    marks: idx === 0 ? "1–2" : idx === 1 ? "2–3" : "3–5",
  }));
  if (boardEssentials.length === 0) {
    boardEssentials.push({
      name: `${topic.name} — key ideas`,
      oneLineUse: topic.blurb,
      marks: "1–3",
    });
  }
  const subjectKind: FormulaUseCardKind = topic.subject === "Maths" ? "formula" : "process";
  return {
    topicSnapshot: {
      likelySection: `Mixed sections — typical ${topic.marks} contribution.`,
      examinerNotes: `Reference outline only. Use board guidelines and your textbook for ${topic.name}-specific exam expectations.`,
    },
    boardEssentials,
    formulaUsePreview: {
      kind: subjectKind,
      title: `${topic.name} — quick reference`,
      whenToUse: conceptSeeds.slice(0, 3).map((s) => s.replace(/\.$/, "")),
      commonTrap: "Sample preview — confirm the specific traps from your textbook before relying on this card.",
    },
    fullFormulaUseMap: [],
    commonMistake: `Sample preview based on the topic blurb. Open practice or worksheet for real ${topic.name} questions and verified mistake patterns.`,
    examinerWarning: "Sample preview — this topic does not have a hand-curated examiner warning yet.",
  };
};

// ── Public adapter ────────────────────────────────────────────────────────

export const buildActionableDesktopTopicHubContent = (
  topicOrSlug: DesktopTopicSummary | string,
): ActionableTopicHubContent | undefined => {
  const topic =
    typeof topicOrSlug === "string" ? desktopTopicBySlug(topicOrSlug) : topicOrSlug;
  if (!topic) return undefined;
  const seed = SEEDED[topic.slug];
  if (seed) {
    return {
      topic,
      ...seed,
      isSamplePreview: false,
    };
  }
  const sample = buildSampleActionable(topic);
  return {
    topic,
    ...sample,
    isSamplePreview: true,
  };
};
