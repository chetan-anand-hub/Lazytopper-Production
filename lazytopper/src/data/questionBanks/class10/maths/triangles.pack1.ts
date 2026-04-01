import type {
  BloomLevel,
  CanonicalQuestion,
  DifficultyLevel,
  QuestionFormat,
  SectionKey,
} from "../../../predictionTypes";

export type TrianglesSkillFamily =
  | "Theorem Choice"
  | "Similarity"
  | "BPT"
  | "Area Ratio"
  | "Proof"
  | "Board Check";

export type TrianglesPackQuestion = CanonicalQuestion & {
  questionId: string;
  cbseFormat: SectionKey;
  skillFamily: TrianglesSkillFamily;
  loIds: readonly string[];
};

type TrianglesQuestionSpec = {
  questionId: string;
  cbseFormat: SectionKey;
  skillFamily: TrianglesSkillFamily;
  loIds: readonly string[];
  difficulty: DifficultyLevel;
  questionText: string;
  answer: string;
  working: readonly string[];
  finalAnswer?: string;
  subtopic?: string;
  bloomSkill?: BloomLevel;
  strategyHint?: string;
  formatOverride?: QuestionFormat;
  options?: readonly string[];
};

type GroupDefaults = Pick<
  TrianglesQuestionSpec,
  "cbseFormat" | "skillFamily" | "loIds" | "difficulty"
>;

type GroupSpec = Omit<
  TrianglesQuestionSpec,
  "cbseFormat" | "skillFamily" | "loIds" | "difficulty"
> &
  Partial<
    Pick<
      TrianglesQuestionSpec,
      "loIds" | "difficulty" | "subtopic" | "bloomSkill" | "strategyHint"
    >
  >;

// Design note for reviewers:
// This chapter pack is guided by official CBSE Class X assessment design
// signals. It is not a full board-paper replica and should not be used to
// claim canonical completeness for the chapter.
export const TRIANGLES_PACK1_SOURCE_BASIS = {
  claimBoundary:
    "Guided by official CBSE Class X assessment design signals, not a full board-paper replica.",
  figureExpectation:
    "Use neat and clean figures wherever the setup genuinely needs a diagram.",
  officialSources: [
    {
      documentTitle: "CBSE Circular No. Acad-30/2024",
      session: "2024-25",
      url: "https://cbseacademic.nic.in/web_material/Circulars/2024/30_Circular_2024.pdf",
      takeaway:
        "Classes IX-X assessment design targets 50% competency-focused questions, 20% select-response questions, and 30% constructed-response questions.",
    },
    {
      documentTitle: "CBSE Notification No. 66_Notification_2025",
      session: "2025-26",
      url: "https://cbseacademic.nic.in/web_material/Notifications/2025/66_Notification_2025.pdf",
      takeaway:
        "There is no change in the 2025-26 assessment scheme from 2024-25.",
    },
    {
      documentTitle: "Class X Mathematics Standard Sample Question Paper",
      session: "2025-26",
      url: "https://cbseacademic.nic.in/web_material/SQP/ClassX_2025_26/MathsStandard-SQP.pdf",
      takeaway:
        "Use the official Section A-E pattern as a design guide and draw neat and clean figures wherever required.",
    },
  ],
} as const;

const MARKS_BY_SECTION: Record<SectionKey, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 5,
  E: 4,
};

const FORMAT_BY_SECTION: Record<SectionKey, QuestionFormat> = {
  A: "MCQ",
  B: "Short",
  C: "Short",
  D: "Long",
  E: "Case-Based",
};

function defaultSubtopic(skillFamily: TrianglesSkillFamily): string {
  switch (skillFamily) {
    case "Theorem Choice":
      return "Theorem recognition and first step";
    case "Similarity":
      return "Similarity criteria and correspondence";
    case "BPT":
      return "BPT and parallel-line relations";
    case "Area Ratio":
      return "Area ratio of similar triangles";
    case "Proof":
      return "Proof structure and CPST";
    case "Board Check":
    default:
      return "Board-style proof checking";
  }
}

function defaultBloom(skillFamily: TrianglesSkillFamily): BloomLevel {
  switch (skillFamily) {
    case "Theorem Choice":
      return "Understanding";
    case "Similarity":
      return "Applying";
    case "BPT":
      return "Applying";
    case "Area Ratio":
      return "Analysing";
    case "Proof":
      return "Analysing";
    case "Board Check":
    default:
      return "Evaluating";
  }
}

function defaultStrategyHint(skillFamily: TrianglesSkillFamily): string {
  switch (skillFamily) {
    case "Theorem Choice":
      return "Read the figure first and name the theorem trigger before any ratio.";
    case "Similarity":
      return "Fix the correct vertex order before writing the criterion or CPST relation.";
    case "BPT":
      return "State the parallel line first, then write the proportional relation.";
    case "Area Ratio":
      return "Prove similarity first and square the corresponding side ratio for areas.";
    case "Proof":
      return "Use a board skeleton: compared triangles, theorem name, justified relation, final conclusion.";
    case "Board Check":
    default:
      return "Audit the first line, theorem line, and final conclusion line like an examiner.";
  }
}

function buildSolutionSteps(spec: TrianglesQuestionSpec): string[] {
  const lines = [...spec.working];
  if (spec.cbseFormat === "C" || spec.cbseFormat === "D") {
    lines.push(`Therefore, boxed final answer: ${spec.finalAnswer ?? spec.answer}`);
    return lines;
  }
  if (spec.cbseFormat === "E") {
    lines.push(`Therefore, final answers: ${spec.finalAnswer ?? spec.answer}`);
    return lines;
  }
  lines.push(`Final answer: ${spec.finalAnswer ?? spec.answer}`);
  return lines;
}

function makeTrianglesQuestion(spec: TrianglesQuestionSpec): TrianglesPackQuestion {
  return {
    id: spec.questionId,
    questionId: spec.questionId,
    subject: "Maths",
    topicKey: "Triangles",
    subtopic: spec.subtopic ?? defaultSubtopic(spec.skillFamily),
    section: spec.cbseFormat,
    cbseFormat: spec.cbseFormat,
    marks: MARKS_BY_SECTION[spec.cbseFormat],
    format: spec.formatOverride ?? FORMAT_BY_SECTION[spec.cbseFormat],
    difficulty: spec.difficulty,
    bloomSkill: spec.bloomSkill ?? defaultBloom(spec.skillFamily),
    questionText: spec.questionText,
    options: spec.options ? [...spec.options] : undefined,
    answer: spec.answer,
    explanation: [...spec.working, `Final answer: ${spec.finalAnswer ?? spec.answer}`].join(" "),
    solutionSteps: buildSolutionSteps(spec),
    finalAnswer: spec.finalAnswer ?? spec.answer,
    strategyHint: spec.strategyHint ?? defaultStrategyHint(spec.skillFamily),
    predictionScore: 4,
    skillFamily: spec.skillFamily,
    loIds: [...spec.loIds],
  };
}

function buildGroup(defaults: GroupDefaults, specs: readonly GroupSpec[]): TrianglesPackQuestion[] {
  return specs.map((spec) =>
    makeTrianglesQuestion({
      ...defaults,
      ...spec,
      loIds: spec.loIds ?? defaults.loIds,
      difficulty: spec.difficulty ?? defaults.difficulty,
    })
  );
}

const sectionAQuestions = [
  ...buildGroup(
    {
      cbseFormat: "A",
      skillFamily: "Theorem Choice",
      loIds: ["LO_TRI_01_READ_FIGURE_FIRST", "LO_TRI_03_BPT_PARALLEL_FLOW"],
      difficulty: "Easy",
    },
    [
      {
        questionId: "2026-TRI-P1-A-001",
        questionText:
          "In Delta ABC, DE is parallel to BC. Which theorem justifies AD/DB = AE/EC?",
        options: ["Basic Proportionality Theorem", "SSS similarity", "Converse BPT", "Pythagoras theorem"],
        answer: "Basic Proportionality Theorem",
        working: ["A line parallel to one side of a triangle divides the other two sides proportionally."],
      },
      {
        questionId: "2026-TRI-P1-A-003",
        questionText:
          "If AD/DB = AE/EC for points D on AB and E on AC, which theorem helps you conclude DE is parallel to BC?",
        options: ["BPT", "Converse of BPT", "AA similarity", "CPST"],
        answer: "Converse of BPT",
        working: ["If a line divides two sides of a triangle in the same ratio, then it is parallel to the third side."],
      },
      {
        questionId: "2026-TRI-P1-A-005",
        questionText:
          "A student sees one pair of equal angles from parallel lines and another common angle. Which criterion should be checked first?",
        options: ["AA similarity", "SSS similarity", "Converse BPT", "Area ratio theorem"],
        answer: "AA similarity",
        working: ["Equal angles are the quickest trigger for AA similarity."],
      },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "A",
      skillFamily: "Similarity",
      loIds: ["LO_TRI_02_SIMILARITY_CORRESPONDENCE", "LO_TRI_01_READ_FIGURE_FIRST"],
      difficulty: "Easy",
    },
    [
      {
        questionId: "2026-TRI-P1-A-002",
        questionText:
          "If two angles of one triangle are equal to two angles of another triangle, the triangles are similar by:",
        options: ["AA", "SAS", "SSS", "RHS"],
        answer: "AA",
        working: ["AA is the similarity criterion based on two equal angles."],
      },
      {
        questionId: "2026-TRI-P1-A-006",
        questionText: "If Delta ABC is similar to Delta PQR, then angle B corresponds to:",
        options: ["angle P", "angle Q", "angle R", "no angle"],
        answer: "angle Q",
        working: ["The similarity statement fixes the order: A to P, B to Q, and C to R."],
      },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "A",
      skillFamily: "Area Ratio",
      loIds: ["LO_TRI_05_AREA_RATIO", "LO_TRI_02_SIMILARITY_CORRESPONDENCE"],
      difficulty: "Easy",
    },
    [
      {
        questionId: "2026-TRI-P1-A-004",
        questionText:
          "If two similar triangles have corresponding sides in the ratio 3:5, then the ratio of their areas is:",
        options: ["3:5", "5:3", "9:25", "25:9"],
        answer: "9:25",
        working: ["Area ratio of similar triangles equals the square of the side ratio."],
      },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "A",
      skillFamily: "Board Check",
      loIds: ["LO_TRI_06_BOARD_AUDIT", "LO_TRI_04_PROOF_FLOW"],
      difficulty: "Easy",
    },
    [
      {
        questionId: "2026-TRI-P1-A-007",
        questionText:
          "A student writes 'Delta ABC is similar to Delta DEF' and directly writes a ratio. Which missing line will cost marks first?",
        options: [
          "The similarity criterion or theorem line",
          "The last answer line only",
          "The unit line",
          "The question number",
        ],
        answer: "The similarity criterion or theorem line",
        working: ["The examiner expects the theorem or criterion before the ratio step."],
      },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "A",
      skillFamily: "Theorem Choice",
      loIds: ["LO_TRI_01_READ_FIGURE_FIRST", "LO_TRI_03_BPT_PARALLEL_FLOW"],
      difficulty: "Easy",
    },
    [
      {
        questionId: "2026-TRI-P1-A-008",
        questionText:
          "If a line segment joins the midpoints of two sides of a triangle, then it is:",
        options: [
          "parallel to the third side",
          "equal to the third side",
          "perpendicular to the third side",
          "a median of the triangle",
        ],
        answer: "parallel to the third side",
        working: ["By the midpoint theorem, the segment joining the midpoints of two sides is parallel to the third side."],
      },
      {
        questionId: "2026-TRI-P1-A-009",
        questionText:
          "If the areas of two similar triangles are in the ratio 16 : 25, then the ratio of their corresponding sides is:",
        options: ["4 : 5", "16 : 25", "8 : 10", "5 : 4"],
        answer: "4 : 5",
        working: ["The ratio of corresponding sides is the square root of the area ratio."],
      },
      {
        questionId: "2026-TRI-P1-A-010",
        questionText:
          "A student notices DE parallel to BC in Delta ABC. Which should be the first written board line?",
        options: [
          "Since DE is parallel to BC, use BPT.",
          "AD/DB = AE/EC directly.",
          "Delta ADE = Delta ABC.",
          "Area ratio is 1:4.",
        ],
        answer: "Since DE is parallel to BC, use BPT.",
        working: ["The parallel-line condition must be stated before the ratio relation."],
      },
      {
        questionId: "2026-TRI-P1-A-011",
        questionText:
          "Assertion (A): If two sides of one triangle are proportional to two sides of another triangle, the triangles are similar.\nReason (R): SAS similarity needs the included angles to be equal along with proportional corresponding sides.",
        answer:
          "Assertion is false but Reason is true.",
        working: [
          "Proportional sides alone are not enough for SAS similarity.",
          "The included angles must also be equal.",
        ],
        formatOverride: "Assertion-Reasoning",
      },
      {
        questionId: "2026-TRI-P1-A-012",
        questionText:
          "At the same time of day, a 1.5 m pole casts a 2 m shadow and a tree casts an 8 m shadow. Which chapter idea helps compare their heights first?",
        options: ["Similarity of triangles", "Converse BPT", "Midpoint theorem", "Pythagoras converse"],
        answer: "Similarity of triangles",
        working: ["Same sun angle gives similar right triangles, so corresponding heights and shadows are proportional."],
      },
      {
        questionId: "2026-TRI-P1-A-013",
        questionText:
          "If Delta ABC is similar to Delta DEF, then AB/DE equals:",
        options: ["BC/EF", "DE/AB", "AC/DF only", "angle B/angle E"],
        answer: "BC/EF",
        working: ["In similar triangles, corresponding sides are in the same ratio."],
      },
      {
        questionId: "2026-TRI-P1-A-014",
        questionText:
          "Assertion (A): If DE is parallel to BC in Delta ABC, then AD/AB = AE/AC.\nReason (R): Triangles ADE and ABC are similar by AA similarity.",
        answer:
          "Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
        working: [
          "Parallel lines create equal corresponding angles.",
          "That proves Delta ADE is similar to Delta ABC, which gives the proportional side relation.",
        ],
        formatOverride: "Assertion-Reasoning",
      },
      {
        questionId: "2026-TRI-P1-A-015",
        questionText:
          "A triangular warning board is enlarged so that each side becomes twice the original length. The new area will be:",
        options: ["twice", "three times", "four times", "eight times"],
        answer: "four times",
        working: ["Area of similar figures changes as the square of the side scale factor, so 2^2 = 4."],
      },
      {
        questionId: "2026-TRI-P1-A-016",
        questionText:
          "Assertion (A): If two triangles are similar, then their perimeters are in the same ratio as their corresponding sides.\nReason (R): The ratio of areas of similar triangles is equal to the ratio of corresponding sides.",
        answer:
          "Assertion is true but Reason is false.",
        working: [
          "Perimeter ratio does equal the ratio of corresponding sides for similar triangles.",
          "But area ratio equals the square of the side ratio, not the side ratio itself.",
        ],
        formatOverride: "Assertion-Reasoning",
      },
    ]
  ),
];

const sectionBQuestions = [
  ...buildGroup(
    {
      cbseFormat: "B",
      skillFamily: "Theorem Choice",
      loIds: ["LO_TRI_01_READ_FIGURE_FIRST", "LO_TRI_02_SIMILARITY_CORRESPONDENCE"],
      difficulty: "Easy",
    },
    [
      {
        questionId: "2026-TRI-P1-B-001",
        questionText:
          "In two triangles, one angle is common and another pair of angles is equal because of parallel lines. Which similarity criterion should you write?",
        answer: "AA similarity criterion.",
        working: [
          "Parallel lines create equal corresponding or alternate interior angles.",
          "One more equal angle is already available, so AA proves similarity.",
        ],
      },
      {
        questionId: "2026-TRI-P1-B-002",
        questionText:
          "If AB/DE = AC/DF = 5/7 and angle A = angle D, which theorem should be written before concluding the triangles are similar?",
        answer: "SAS similarity criterion.",
        working: [
          "Two pairs of corresponding sides are proportional and the included angles are equal.",
          "Therefore SAS similarity applies.",
        ],
      },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "B",
      skillFamily: "Similarity",
      loIds: ["LO_TRI_02_SIMILARITY_CORRESPONDENCE", "LO_TRI_04_PROOF_FLOW"],
      difficulty: "Medium",
    },
    [
      {
        questionId: "2026-TRI-P1-B-003",
        questionText:
          "Sides of two triangles are 6 cm, 9 cm, 12 cm and 4 cm, 6 cm, 8 cm. Show that the triangles are similar.",
        answer: "Yes. The triangles are similar by SSS similarity.",
        working: [
          "Write 6/4 = 9/6 = 12/8 = 3/2.",
          "Since all three pairs of corresponding sides are proportional, the triangles are similar by SSS.",
        ],
      },
      {
        questionId: "2026-TRI-P1-B-004",
        questionText:
          "If Delta ABC is similar to Delta DEF and AB = 8 cm, DE = 12 cm, AC = 10 cm, find DF.",
        answer: "DF = 15 cm.",
        working: [
          "Use corresponding side ratio AB/DE = AC/DF.",
          "Substitute 8/12 = 10/DF and solve to get DF = 15.",
        ],
      },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "B",
      skillFamily: "BPT",
      loIds: ["LO_TRI_03_BPT_PARALLEL_FLOW", "LO_TRI_04_PROOF_FLOW"],
      difficulty: "Medium",
    },
    [
      {
        questionId: "2026-TRI-P1-B-005",
        questionText:
          "In Delta ABC, DE is parallel to BC. If AD = 4 cm, DB = 6 cm and AE = 5 cm, find EC.",
        answer: "EC = 7.5 cm.",
        working: [
          "By BPT, AD/DB = AE/EC.",
          "Substitute 4/6 = 5/EC and solve to get EC = 7.5.",
        ],
      },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "B",
      skillFamily: "Area Ratio",
      loIds: ["LO_TRI_05_AREA_RATIO", "LO_TRI_02_SIMILARITY_CORRESPONDENCE"],
      difficulty: "Medium",
    },
    [
      {
        questionId: "2026-TRI-P1-B-006",
        questionText:
          "Two similar triangles have corresponding sides in the ratio 2:3. If the area of the smaller triangle is 16 cm^2, find the area of the larger triangle.",
        answer: "36 cm^2",
        working: [
          "Area ratio = (2/3)^2 = 4/9.",
          "So 16/Area of larger triangle = 4/9.",
          "Hence area of larger triangle = 16 x 9/4 = 36 cm^2.",
        ],
      },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "B",
      skillFamily: "Similarity",
      loIds: ["LO_TRI_02_SIMILARITY_CORRESPONDENCE", "LO_TRI_04_PROOF_FLOW"],
      difficulty: "Medium",
    },
    [
      {
        questionId: "2026-TRI-P1-B-007",
        questionText:
          "A school model uses a triangular frame with side scale 3 : 5 compared to the real frame. If a side of the real frame is 20 cm, find the corresponding side in the model.",
        answer: "12 cm",
        working: [
          "Model : real = 3 : 5.",
          "So corresponding side in model = 20 x 3/5 = 12 cm.",
        ],
      },
      {
        questionId: "2026-TRI-P1-B-008",
        questionText:
          "In Delta ABC, DE is parallel to BC. If AB = 15 cm, AD = 9 cm and AC = 20 cm, find AE.",
        answer: "AE = 12 cm.",
        working: [
          "By similarity, AD/AB = AE/AC.",
          "Substitute 9/15 = AE/20.",
          "Therefore AE = 12 cm.",
        ],
      },
      {
        questionId: "2026-TRI-P1-B-009",
        questionText:
          "A student writes Delta ABC ~ Delta DFE when the corresponding sides used are AB/DF = AC/DE. What should the student fix first?",
        answer: "The order of vertices in the similarity statement.",
        working: [
          "The correspondence in the similarity statement must match the side pairs used.",
          "Wrong order gives wrong CPST relations and loses marks.",
        ],
      },
    ]
  ),
];

const sectionCQuestions = [
  ...buildGroup(
    {
      cbseFormat: "C",
      skillFamily: "Similarity",
      loIds: ["LO_TRI_02_SIMILARITY_CORRESPONDENCE", "LO_TRI_04_PROOF_FLOW"],
      difficulty: "Medium",
    },
    [
      {
        questionId: "2026-TRI-P1-C-001",
        questionText:
          "In Delta ABC, D lies on AB and E lies on AC such that DE is parallel to BC. If AD = 6 cm, AB = 9 cm and AE = 8 cm, find AC.",
        answer: "AC = 12 cm.",
        finalAnswer: "AC = 12 cm.",
        working: [
          "Since DE is parallel to BC, Delta ADE is similar to Delta ABC by AA.",
          "Therefore AD/AB = AE/AC.",
          "Substitute 6/9 = 8/AC.",
          "Solve to get AC = 12 cm.",
        ],
      },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "C",
      skillFamily: "BPT",
      loIds: ["LO_TRI_03_BPT_PARALLEL_FLOW", "LO_TRI_04_PROOF_FLOW"],
      difficulty: "Medium",
    },
    [
      {
        questionId: "2026-TRI-P1-C-002",
        questionText:
          "In Delta ABC, D and E are the midpoints of AB and AC respectively. Prove that DE is parallel to BC and DE = 1/2 BC.",
        answer: "DE is parallel to BC and DE = 1/2 BC.",
        finalAnswer: "DE is parallel to BC and DE = 1/2 BC.",
        working: [
          "Since D and E are midpoints, AD = DB and AE = EC.",
          "So AD/DB = AE/EC.",
          "By converse BPT, DE is parallel to BC.",
          "Now Delta ADE is similar to Delta ABC, so DE/BC = AD/AB = 1/2.",
          "Hence DE = 1/2 BC.",
        ],
      },
      {
        questionId: "2026-TRI-P1-C-005",
        questionText:
          "In Delta ABC, D lies on AB and E lies on AC. If AD/DB = AE/EC, prove that DE is parallel to BC.",
        answer: "DE is parallel to BC.",
        finalAnswer: "DE is parallel to BC.",
        working: [
          "Given AD/DB = AE/EC.",
          "Points D and E divide AB and AC in the same ratio.",
          "By the converse of the Basic Proportionality Theorem, DE is parallel to BC.",
        ],
      },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "C",
      skillFamily: "Area Ratio",
      loIds: ["LO_TRI_05_AREA_RATIO", "LO_TRI_04_PROOF_FLOW"],
      difficulty: "Medium",
    },
    [
      {
        questionId: "2026-TRI-P1-C-003",
        questionText:
          "Two similar triangles have corresponding sides in the ratio 4:7. Find the ratio of their areas. If the area of the smaller triangle is 48 cm^2, find the area of the larger triangle.",
        answer: "Area ratio = 16:49 and the larger area is 147 cm^2.",
        finalAnswer: "Area ratio = 16:49 and the larger area is 147 cm^2.",
        working: [
          "For similar triangles, area ratio equals the square of the side ratio.",
          "So area ratio = (4/7)^2 = 16/49.",
          "Hence 48/Area of larger triangle = 16/49.",
          "Area of larger triangle = 48 x 49/16 = 147 cm^2.",
        ],
      },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "C",
      skillFamily: "Proof",
      loIds: ["LO_TRI_04_PROOF_FLOW", "LO_TRI_06_BOARD_AUDIT"],
      difficulty: "Medium",
    },
    [
      {
        questionId: "2026-TRI-P1-C-004",
        questionText:
          "In Delta ABC, DE is parallel to BC with D on AB and E on AC. Prove that AD/AB = AE/AC.",
        answer: "AD/AB = AE/AC",
        finalAnswer: "AD/AB = AE/AC",
        working: [
          "Since DE is parallel to BC, Delta ADE is similar to Delta ABC by AA similarity.",
          "Therefore corresponding sides are proportional.",
          "So AD/AB = AE/AC.",
        ],
      },
      {
        questionId: "2026-TRI-P1-C-006",
        questionText:
          "A student writes 'By BPT, AD/DB = AE/EC' but does not mention any condition. Rewrite the first two correct board lines.",
        answer:
          "Since DE is parallel to BC, by the Basic Proportionality Theorem, AD/DB = AE/EC.",
        finalAnswer:
          "Since DE is parallel to BC, by the Basic Proportionality Theorem, AD/DB = AE/EC.",
        working: [
          "The missing condition is DE parallel to BC.",
          "The correct theorem line must state the parallel condition before the ratio.",
          "So the corrected opening is: Since DE is parallel to BC, by BPT, AD/DB = AE/EC.",
        ],
      },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "C",
      skillFamily: "Similarity",
      loIds: ["LO_TRI_02_SIMILARITY_CORRESPONDENCE", "LO_TRI_04_PROOF_FLOW"],
      difficulty: "Medium",
    },
    [
      {
        questionId: "2026-TRI-P1-C-007",
        questionText:
          "In Delta ABC and Delta PQR, angle A = angle P, angle B = angle Q and AB = 6 cm, BC = 8 cm, PQ = 9 cm. Find QR.",
        answer: "QR = 12 cm.",
        finalAnswer: "QR = 12 cm.",
        working: [
          "Since two corresponding angles are equal, Delta ABC is similar to Delta PQR by AA similarity.",
          "Therefore AB/PQ = BC/QR.",
          "Substitute 6/9 = 8/QR.",
          "Hence QR = 12 cm.",
        ],
      },
      {
        questionId: "2026-TRI-P1-C-008",
        questionText:
          "A triangular warning sign and its enlarged highway sign are similar. If their corresponding sides are in the ratio 3 : 7, find the ratio of their perimeters and the ratio of their areas.",
        answer: "Perimeter ratio = 3 : 7 and area ratio = 9 : 49.",
        finalAnswer: "Perimeter ratio = 3 : 7 and area ratio = 9 : 49.",
        working: [
          "For similar triangles, perimeter ratio equals the ratio of corresponding sides.",
          "So perimeter ratio = 3 : 7.",
          "Area ratio equals the square of the side ratio.",
          "Hence area ratio = 9 : 49.",
        ],
      },
      {
        questionId: "2026-TRI-P1-C-009",
        questionText:
          "In Delta ABC, a line through D on AB and E on AC satisfies AD/DB = AE/EC = 2/3. Prove that the line through D and E is parallel to BC and state the theorem used.",
        answer: "DE is parallel to BC by the converse of the Basic Proportionality Theorem.",
        finalAnswer: "DE is parallel to BC by converse BPT.",
        working: [
          "Given AD/DB = AE/EC.",
          "The two sides AB and AC are divided in the same ratio.",
          "By the converse of the Basic Proportionality Theorem, the line through D and E is parallel to BC.",
        ],
      },
    ]
  ),
];

const sectionDQuestions = [
  ...buildGroup(
    {
      cbseFormat: "D",
      skillFamily: "BPT",
      loIds: ["LO_TRI_03_BPT_PARALLEL_FLOW", "LO_TRI_04_PROOF_FLOW", "LO_TRI_05_AREA_RATIO"],
      difficulty: "Hard",
    },
    [
      {
        questionId: "2026-TRI-P1-D-001",
        questionText:
          "In Delta ABC, D lies on AB and E lies on AC such that DE is parallel to BC. If AD = 4 cm, DB = 6 cm and BC = 15 cm, find DE. Hence find the ratio of the areas of Delta ADE and Delta ABC.",
        answer: "DE = 6 cm and Area(Delta ADE) : Area(Delta ABC) = 4 : 25.",
        finalAnswer: "DE = 6 cm and Area(Delta ADE) : Area(Delta ABC) = 4 : 25.",
        working: [
          "Since DE is parallel to BC, Delta ADE is similar to Delta ABC.",
          "So DE/BC = AD/AB = 4/10 = 2/5.",
          "Therefore DE = 15 x 2/5 = 6 cm.",
          "Also for similar triangles, area ratio equals the square of the corresponding side ratio.",
          "Hence Area(Delta ADE) : Area(Delta ABC) = (2/5)^2 = 4 : 25.",
        ],
      },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "D",
      skillFamily: "Area Ratio",
      loIds: ["LO_TRI_05_AREA_RATIO", "LO_TRI_02_SIMILARITY_CORRESPONDENCE", "LO_TRI_06_BOARD_AUDIT"],
      difficulty: "Hard",
    },
    [
      {
        questionId: "2026-TRI-P1-D-002",
        questionText:
          "The ratio of the areas of two similar triangles is 25 : 36. If one corresponding side of the smaller triangle is 10 cm, find the corresponding side of the larger triangle. Also find the ratio of their perimeters.",
        answer: "The corresponding side of the larger triangle is 12 cm and the perimeter ratio is 5 : 6.",
        finalAnswer: "The corresponding side of the larger triangle is 12 cm and the perimeter ratio is 5 : 6.",
        working: [
          "For similar triangles, area ratio equals the square of the side ratio.",
          "So side ratio = sqrt(25/36) = 5/6.",
          "If the smaller corresponding side is 10 cm, then the larger corresponding side = 10 x 6/5 = 12 cm.",
          "The ratio of perimeters of similar triangles equals the ratio of corresponding sides.",
          "Hence perimeter ratio = 5 : 6.",
        ],
      },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "D",
      skillFamily: "Proof",
      loIds: ["LO_TRI_04_PROOF_FLOW", "LO_TRI_02_SIMILARITY_CORRESPONDENCE", "LO_TRI_06_BOARD_AUDIT"],
      difficulty: "Hard",
    },
    [
      {
        questionId: "2026-TRI-P1-D-003",
        questionText:
          "In Delta ABC, DE is parallel to BC with D on AB and E on AC. Prove that AD x AC = AE x AB.",
        answer: "AD x AC = AE x AB.",
        finalAnswer: "AD x AC = AE x AB.",
        working: [
          "Since DE is parallel to BC, Delta ADE is similar to Delta ABC by AA similarity.",
          "Therefore AD/AB = AE/AC.",
          "Cross-multiply the proportional relation.",
          "So AD x AC = AE x AB.",
        ],
      },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "D",
      skillFamily: "Board Check",
      loIds: ["LO_TRI_06_BOARD_AUDIT", "LO_TRI_04_PROOF_FLOW", "LO_TRI_02_SIMILARITY_CORRESPONDENCE"],
      difficulty: "Hard",
    },
    [
      {
        questionId: "2026-TRI-P1-D-004",
        questionText:
          "A student writes: 'AB/DE = AC/DF, so Delta ABC is similar to Delta DEF and therefore angle B = angle E.' Check this board solution. Write the correct theorem name, the correct similarity statement, and one valid conclusion.",
        answer:
          "Correct theorem: SAS similarity. Correct statement: Delta ABC is similar to Delta DEF only after matching vertices in the same order; then one valid conclusion is angle B = angle E or BC/EF = AB/DE, depending on the established correspondence.",
        finalAnswer:
          "Use SAS similarity with correct correspondence. Then write one valid CPST conclusion using the same order.",
        working: [
          "The student must first name the theorem: SAS similarity applies if the included angle is equal and two pairs of corresponding sides are proportional.",
          "The similarity statement must preserve the same vertex order as the side ratios.",
          "Only after the correct similarity statement can a CPST conclusion be written.",
          "A valid final line is any angle or side relation consistent with the chosen order.",
        ],
      },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "D",
      skillFamily: "Proof",
      loIds: ["LO_TRI_04_PROOF_FLOW", "LO_TRI_05_AREA_RATIO", "LO_TRI_06_BOARD_AUDIT"],
      difficulty: "Hard",
    },
    [
      {
        questionId: "2026-TRI-P1-D-005",
        questionText:
          "In Delta ABC, D lies on BC such that AD bisects angle A. If AB/AC = BD/DC, prove that Delta ABD is similar to Delta ACD and hence show that AD^2 = BD x DC.",
        answer:
          "Delta ABD is similar to Delta ACD and therefore AD^2 = BD x DC.",
        finalAnswer:
          "Delta ABD is similar to Delta ACD and hence AD^2 = BD x DC.",
        working: [
          "Given AB/AC = BD/DC and angle BAD = angle DAC because AD bisects angle A.",
          "Thus the two pairs of corresponding sides are proportional and the included angles are equal.",
          "Therefore Delta ABD is similar to Delta ACD by SAS similarity.",
          "From similarity, AD/DC = BD/AD.",
          "Cross-multiplying gives AD^2 = BD x DC.",
        ],
      },
    ]
  ),
];

const sectionEQuestions = [
  ...buildGroup(
    {
      cbseFormat: "E",
      skillFamily: "Area Ratio",
      loIds: ["LO_TRI_05_AREA_RATIO", "LO_TRI_02_SIMILARITY_CORRESPONDENCE", "LO_TRI_04_PROOF_FLOW"],
      difficulty: "Hard",
    },
    [
      {
        questionId: "2026-TRI-P1-E-001",
        questionText:
          "Case Study: Two triangular design panels are similar. The side of the smaller panel is 12 cm and the corresponding side of the larger panel is 18 cm. The area of the smaller panel is 80 cm^2.\n(i) Write the ratio of corresponding sides.\n(ii) Find the ratio of their areas.\n(iii) Find the area of the larger panel.",
        answer:
          "(i) Side ratio = 2 : 3. (ii) Area ratio = 4 : 9. (iii) Area of the larger panel = 180 cm^2.",
        finalAnswer:
          "(i) 2 : 3 (ii) 4 : 9 (iii) 180 cm^2",
        working: [
          "The side ratio is 12 : 18 = 2 : 3.",
          "For similar triangles, area ratio is the square of the side ratio, so 4 : 9.",
          "Thus 80 / Area of larger panel = 4 / 9.",
          "Area of larger panel = 80 x 9/4 = 180 cm^2.",
        ],
      },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "E",
      skillFamily: "Board Check",
      loIds: ["LO_TRI_06_BOARD_AUDIT", "LO_TRI_03_BPT_PARALLEL_FLOW", "LO_TRI_04_PROOF_FLOW"],
      difficulty: "Hard",
    },
    [
      {
        questionId: "2026-TRI-P1-E-002",
        questionText:
          "Case Study: In Delta ABC, D lies on AB and E lies on AC such that DE is parallel to BC. A student writes only 'AD/DB = AE/EC'. The given values are AD = 3 cm, DB = 2 cm and AE = 4.5 cm.\n(i) Write the missing board line before the ratio.\n(ii) Find EC.\n(iii) State one common mark-cut risk in this answer.",
        answer:
          "(i) Since DE is parallel to BC, by BPT, AD/DB = AE/EC. (ii) EC = 3 cm. (iii) Missing the parallel-line condition or writing the ratio without the theorem line cuts marks.",
        finalAnswer:
          "(i) Since DE is parallel to BC, by BPT, AD/DB = AE/EC. (ii) EC = 3 cm. (iii) Missing theorem justification causes mark loss.",
        working: [
          "The missing board line is the parallel-line condition followed by the theorem name.",
          "Now apply 3/2 = 4.5/EC.",
          "So EC = (4.5 x 2)/3 = 3 cm.",
          "A common deduction is writing the ratio without first stating that DE is parallel to BC.",
        ],
      },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "E",
      skillFamily: "Similarity",
      loIds: ["LO_TRI_02_SIMILARITY_CORRESPONDENCE", "LO_TRI_04_PROOF_FLOW", "LO_TRI_01_READ_FIGURE_FIRST"],
      difficulty: "Hard",
    },
    [
      {
        questionId: "2026-TRI-P1-E-003",
        questionText:
          "Case Study: A 1.8 m student and a school flagpole cast shadows of 2.4 m and 12 m respectively at the same time.\n(i) Which Triangles idea lets you compare the heights first?\n(ii) Find the height of the flagpole.\n(iii) State one reason why the comparison is valid.",
        answer:
          "(i) Similarity of triangles. (ii) Height of the flagpole = 9 m. (iii) The sun's rays are effectively parallel at the same time, so the right triangles are similar.",
        finalAnswer:
          "(i) Similarity of triangles (ii) 9 m (iii) Same sun angle gives similar triangles.",
        working: [
          "The student and the flagpole form similar right triangles with their shadows.",
          "So height/shadow ratio is equal: 1.8/2.4 = h/12.",
          "Hence h = 12 x 1.8/2.4 = 9 m.",
          "The comparison is valid because the sun's rays are taken as parallel at the same time.",
        ],
      },
      {
        questionId: "2026-TRI-P1-E-004",
        questionText:
          "Case Study: A triangular banner is enlarged for the annual day stage. The side ratio of the small banner to the large banner is 4 : 7 and the area of the small banner is 96 cm^2.\n(i) Find the ratio of their perimeters.\n(ii) Find the ratio of their areas.\n(iii) Find the area of the large banner.",
        answer:
          "(i) 4 : 7 (ii) 16 : 49 (iii) 294 cm^2",
        finalAnswer:
          "(i) 4 : 7 (ii) 16 : 49 (iii) 294 cm^2",
        working: [
          "For similar triangles, the ratio of perimeters equals the ratio of corresponding sides.",
          "So perimeter ratio = 4 : 7.",
          "Area ratio = (4/7)^2 = 16 : 49.",
          "Thus 96 / Area of large banner = 16 / 49, so the area of the large banner is 294 cm^2.",
        ],
      },
      {
        questionId: "2026-TRI-P1-E-005",
        questionText:
          "Case Study: In a triangular park Delta ABC, a walking path DE is marked parallel to BC, where D lies on AB and E lies on AC. A survey note says AD = 5 m, DB = 3 m and AE = 7.5 m.\n(i) Name the theorem used to connect the side segments.\n(ii) Find EC.\n(iii) Write the first board line that should appear before the ratio step.",
        answer:
          "(i) Basic Proportionality Theorem. (ii) EC = 4.5 m. (iii) Since DE is parallel to BC, by BPT, AD/DB = AE/EC.",
        finalAnswer:
          "(i) BPT (ii) EC = 4.5 m (iii) Since DE is parallel to BC, by BPT, AD/DB = AE/EC.",
        working: [
          "Because DE is parallel to BC, the Basic Proportionality Theorem applies.",
          "Use 5/3 = 7.5/EC.",
          "So EC = 7.5 x 3/5 = 4.5 m.",
          "The theorem line must start with the parallel-line condition before the ratio is written.",
        ],
      },
      {
        questionId: "2026-TRI-P1-E-006",
        questionText:
          "Case Study: A drone camera captures two triangular roof sections that are similar. The side ratio of the smaller roof to the larger roof is 5 : 8 and the perimeter of the smaller roof triangle is 45 m.\n(i) Find the perimeter of the larger roof triangle.\n(ii) Find the ratio of their areas.\n(iii) If the area of the smaller roof triangle is 125 m^2, find the area of the larger roof triangle.",
        answer:
          "(i) 72 m (ii) 25 : 64 (iii) 320 m^2",
        finalAnswer:
          "(i) 72 m (ii) 25 : 64 (iii) 320 m^2",
        working: [
          "For similar triangles, perimeter ratio equals the ratio of corresponding sides.",
          "So larger perimeter = 45 x 8/5 = 72 m.",
          "Area ratio = (5/8)^2 = 25 : 64.",
          "Thus 125 / Area of larger roof triangle = 25 / 64, so the larger area is 320 m^2.",
        ],
      },
      {
        questionId: "2026-TRI-P1-E-007",
        questionText:
          "Case Study: A student draws Delta ABC with DE parallel to BC and claims Delta ADE is similar to Delta ABC. The measured lengths are AD = 6 cm, AB = 10 cm and BC = 15 cm.\n(i) State the reason why the two triangles are similar.\n(ii) Find DE.\n(iii) Write one board-check point that the student must not skip while presenting the proof.",
        answer:
          "(i) AA similarity because DE is parallel to BC. (ii) DE = 9 cm. (iii) The student must not skip the theorem/criterion line or the final conclusion line.",
        finalAnswer:
          "(i) AA similarity (ii) DE = 9 cm (iii) Do not skip the criterion line or final conclusion.",
        working: [
          "Since DE is parallel to BC, corresponding angles are equal, so Delta ADE is similar to Delta ABC by AA.",
          "Then DE/BC = AD/AB = 6/10.",
          "Hence DE = 15 x 6/10 = 9 cm.",
          "For board presentation, the criterion line and the conclusion line are both essential.",
        ],
      },
    ]
  ),
];

export const TRIANGLES_PACK1_QUESTIONS = [
  ...sectionAQuestions,
  ...sectionBQuestions,
  ...sectionCQuestions,
  ...sectionDQuestions,
  ...sectionEQuestions,
] as const;
