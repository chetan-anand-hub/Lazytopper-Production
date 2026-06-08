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
