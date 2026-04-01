import type {
  BloomLevel,
  CanonicalQuestion,
  DifficultyLevel,
  QuestionFormat,
  SectionKey,
} from "../../../predictionTypes";

export type TrigSkillFamily =
  | "Definition_Ratios"
  | "Standard_Values"
  | "Identity_Simplify"
  | "Equation_Solve"
  | "Proof_Pattern"
  | "Heights_Distances"
  | "Case_Study";

export type TrigPackQuestion = CanonicalQuestion & {
  questionId: string;
  cbseFormat: SectionKey;
  skillFamily: TrigSkillFamily;
  loIds: readonly string[];
};

type TrigQuestionSpec = {
  questionId: string;
  cbseFormat: SectionKey;
  skillFamily: TrigSkillFamily;
  loIds: readonly string[];
  difficulty: DifficultyLevel;
  questionText: string;
  answer: string;
  working: readonly string[];
  finalAnswer?: string;
  subtopic?: string;
  bloomSkill?: BloomLevel;
  strategyHint?: string;
  options?: readonly string[];
};

type GroupDefaults = Pick<
  TrigQuestionSpec,
  "cbseFormat" | "skillFamily" | "loIds" | "difficulty"
>;

type GroupSpec = Omit<
  TrigQuestionSpec,
  "cbseFormat" | "skillFamily" | "loIds" | "difficulty"
> &
  Partial<
    Pick<
      TrigQuestionSpec,
      "loIds" | "difficulty" | "subtopic" | "bloomSkill" | "strategyHint"
    >
  >;

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

function defaultSubtopic(skillFamily: TrigSkillFamily): string {
  switch (skillFamily) {
    case "Definition_Ratios":
      return "Ratio definitions and setup";
    case "Standard_Values":
      return "Standard values and quick recall";
    case "Identity_Simplify":
      return "Identities and simplification";
    case "Equation_Solve":
      return "Standard trig equations";
    case "Proof_Pattern":
      return "Proof pattern writing";
    case "Heights_Distances":
      return "Heights and distances";
    case "Case_Study":
    default:
      return "Case-study trigonometry";
  }
}

function defaultBloom(skillFamily: TrigSkillFamily): BloomLevel {
  switch (skillFamily) {
    case "Definition_Ratios":
      return "Understanding";
    case "Standard_Values":
      return "Remembering";
    case "Identity_Simplify":
      return "Applying";
    case "Equation_Solve":
      return "Applying";
    case "Proof_Pattern":
      return "Analysing";
    case "Heights_Distances":
      return "Applying";
    case "Case_Study":
    default:
      return "Analysing";
  }
}

function defaultStrategyHint(skillFamily: TrigSkillFamily): string {
  switch (skillFamily) {
    case "Definition_Ratios":
      return "Label the right triangle first, then map opposite, adjacent and hypotenuse.";
    case "Standard_Values":
      return "Recall the standard angle table before substituting.";
    case "Identity_Simplify":
      return "Write the core identity first, then simplify one algebraic move per line.";
    case "Equation_Solve":
      return "Reduce the equation to a standard value and state the acute-angle answer clearly.";
    case "Proof_Pattern":
      return "Start from one side only and end with a clear Hence proved line.";
    case "Heights_Distances":
      return "Draw the diagram, define the angle and apply the correct ratio in order.";
    case "Case_Study":
    default:
      return "Extract the case data part-wise and solve each subpart in order.";
  }
}

function buildSolutionSteps(spec: TrigQuestionSpec): string[] {
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

function makeTrigQuestion(spec: TrigQuestionSpec): TrigPackQuestion {
  return {
    id: spec.questionId,
    questionId: spec.questionId,
    subject: "Maths",
    topicKey: "trigonometry",
    subtopic: spec.subtopic ?? defaultSubtopic(spec.skillFamily),
    section: spec.cbseFormat,
    cbseFormat: spec.cbseFormat,
    marks: MARKS_BY_SECTION[spec.cbseFormat],
    format: FORMAT_BY_SECTION[spec.cbseFormat],
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

function buildGroup(defaults: GroupDefaults, specs: readonly GroupSpec[]): TrigPackQuestion[] {
  return specs.map((spec) =>
    makeTrigQuestion({
      ...defaults,
      ...spec,
      loIds: spec.loIds ?? defaults.loIds,
      difficulty: spec.difficulty ?? defaults.difficulty,
    })
  );
}

const sectionARatioQuestions = buildGroup(
  {
    cbseFormat: "A",
    skillFamily: "Definition_Ratios",
    loIds: ["LO_TRIG_01_RATIOS_SETUP"],
    difficulty: "Easy",
  },
  [
    {
      questionId: "2026-TRIG-P1-A-001",
      questionText: "In right triangle ABC, right-angled at B, write sin A.",
      answer: "sin A = BC/AC.",
      working: ["For angle A, opposite side is BC and hypotenuse is AC."],
    },
    {
      questionId: "2026-TRIG-P1-A-002",
      questionText: "In right triangle ABC, right-angled at B, write cos A.",
      answer: "cos A = AB/AC.",
      working: ["For angle A, adjacent side is AB and hypotenuse is AC."],
    },
    {
      questionId: "2026-TRIG-P1-A-003",
      questionText: "In right triangle PQR, right-angled at Q, write tan P.",
      answer: "tan P = QR/PQ.",
      working: ["For angle P, opposite side is QR and adjacent side is PQ."],
    },
    {
      questionId: "2026-TRIG-P1-A-004",
      questionText: "Name the side opposite the right angle in any right triangle.",
      answer: "The hypotenuse.",
      working: ["The side opposite the right angle is always the hypotenuse."],
    },
    {
      questionId: "2026-TRIG-P1-A-005",
      questionText: "If tan theta = 3/4, write cot theta.",
      answer: "cot theta = 4/3.",
      working: ["cot theta is the reciprocal of tan theta."],
      loIds: ["LO_TRIG_01_RATIOS_SETUP", "LO_TRIG_05_SOLVE_EQUATIONS_STANDARD"],
    },
    {
      questionId: "2026-TRIG-P1-A-006",
      questionText: "If sin theta = 7/25, what is the ratio of opposite side to hypotenuse?",
      answer: "7:25.",
      working: ["sin theta directly gives opposite/hypotenuse."],
    },
    {
      questionId: "2026-TRIG-P1-A-007",
      questionText: "Which trigonometric ratio is adjacent side divided by hypotenuse?",
      answer: "cos theta.",
      working: ["cos theta is defined as adjacent/hypotenuse."],
    },
    {
      questionId: "2026-TRIG-P1-A-008",
      questionText: "If sec theta = hypotenuse/base, which basic ratio is its reciprocal?",
      answer: "cos theta.",
      working: ["sec theta is the reciprocal of cos theta."],
    },
    {
      questionId: "2026-TRIG-P1-A-009",
      questionText: "In a heights-and-distances sketch, which ratio directly links vertical height and horizontal distance?",
      answer: "tan theta.",
      working: ["tan theta = perpendicular/base links height and horizontal distance."],
      loIds: ["LO_TRIG_01_RATIOS_SETUP", "LO_TRIG_07_HEIGHTS_DISTANCES_SINGLE"],
    },
    {
      questionId: "2026-TRIG-P1-A-010",
      questionText: "If angle of elevation is theta, write the ratio for height over line of sight.",
      answer: "sin theta = height/line of sight.",
      working: ["height is opposite side and line of sight is hypotenuse."],
      loIds: ["LO_TRIG_01_RATIOS_SETUP", "LO_TRIG_07_HEIGHTS_DISTANCES_SINGLE"],
    },
  ]
);

const sectionAStandardValueQuestions = buildGroup(
  {
    cbseFormat: "A",
    skillFamily: "Standard_Values",
    loIds: ["LO_TRIG_02_STANDARD_VALUES"],
    difficulty: "Easy",
  },
  [
    { questionId: "2026-TRIG-P1-A-011", questionText: "Write the value of sin 30 deg.", answer: "1/2.", working: ["Recall the standard value table for 30 deg."] },
    { questionId: "2026-TRIG-P1-A-012", questionText: "Write the value of cos 60 deg.", answer: "1/2.", working: ["cos 60 deg is a standard half-value."] },
    { questionId: "2026-TRIG-P1-A-013", questionText: "Write the value of tan 45 deg.", answer: "1.", working: ["At 45 deg, opposite and adjacent are equal."] },
    { questionId: "2026-TRIG-P1-A-014", questionText: "Write the value of sin 0 deg.", answer: "0.", working: ["sin 0 deg is the starting standard value."] },
    { questionId: "2026-TRIG-P1-A-015", questionText: "Write the value of cos 0 deg.", answer: "1.", working: ["cos 0 deg is 1 from the standard table."] },
    { questionId: "2026-TRIG-P1-A-016", questionText: "Write the value of tan 0 deg.", answer: "0.", working: ["tan 0 deg = sin 0 deg / cos 0 deg = 0/1."] },
    { questionId: "2026-TRIG-P1-A-017", questionText: "Write the value of sin 90 deg.", answer: "1.", working: ["sin 90 deg is the maximum standard value."] },
    { questionId: "2026-TRIG-P1-A-018", questionText: "Write the value of cos 90 deg.", answer: "0.", working: ["cos 90 deg is 0 from the standard table."] },
    { questionId: "2026-TRIG-P1-A-019", questionText: "Write the value of tan 60 deg.", answer: "sqrt(3).", working: ["tan 60 deg is a standard value."] },
    { questionId: "2026-TRIG-P1-A-020", questionText: "Write the value of tan 30 deg.", answer: "1/sqrt(3).", working: ["tan 30 deg is the reciprocal partner of tan 60 deg."] },
  ]
);

const sectionAIdentityQuestions = buildGroup(
  {
    cbseFormat: "A",
    skillFamily: "Identity_Simplify",
    loIds: ["LO_TRIG_03_IDENTITY_PYTHAG"],
    difficulty: "Medium",
  },
  [
    { questionId: "2026-TRIG-P1-A-021", questionText: "If sin theta = 3/5 and theta is acute, write cos theta.", answer: "4/5.", working: ["Using sin^2 theta + cos^2 theta = 1, the corresponding triple is 3-4-5."], loIds: ["LO_TRIG_03_IDENTITY_PYTHAG", "LO_TRIG_01_RATIOS_SETUP"] },
    { questionId: "2026-TRIG-P1-A-022", questionText: "If cos theta = 12/13 and theta is acute, write sin theta.", answer: "5/13.", working: ["Use the Pythagorean relation for the right triangle 5-12-13."], loIds: ["LO_TRIG_03_IDENTITY_PYTHAG", "LO_TRIG_01_RATIOS_SETUP"] },
    { questionId: "2026-TRIG-P1-A-023", questionText: "Evaluate sin^2 30 deg + cos^2 30 deg.", answer: "1.", working: ["Use the identity sin^2 theta + cos^2 theta = 1."] },
    { questionId: "2026-TRIG-P1-A-024", questionText: "Simplify sec^2 45 deg - tan^2 45 deg.", answer: "1.", working: ["Use sec^2 theta - tan^2 theta = 1."], loIds: ["LO_TRIG_03_IDENTITY_PYTHAG", "LO_TRIG_04_TRANSFORM_SIMPLIFY"] },
    { questionId: "2026-TRIG-P1-A-025", questionText: "Simplify 1 - sin^2 60 deg.", answer: "1/4.", working: ["1 - sin^2 theta = cos^2 theta, and cos 60 deg = 1/2."], loIds: ["LO_TRIG_03_IDENTITY_PYTHAG", "LO_TRIG_04_TRANSFORM_SIMPLIFY"] },
    { questionId: "2026-TRIG-P1-A-026", questionText: "Simplify sin 45 deg / cos 45 deg.", answer: "1.", working: ["sin 45 deg and cos 45 deg are equal."], loIds: ["LO_TRIG_04_TRANSFORM_SIMPLIFY", "LO_TRIG_02_STANDARD_VALUES"] },
    { questionId: "2026-TRIG-P1-A-027", questionText: "If cot theta = 1, write tan theta.", answer: "1.", working: ["tan theta is the reciprocal of cot theta."], loIds: ["LO_TRIG_04_TRANSFORM_SIMPLIFY", "LO_TRIG_05_SOLVE_EQUATIONS_STANDARD"] },
    { questionId: "2026-TRIG-P1-A-028", questionText: "Fill in the blank: 1 + tan^2 theta = ____.", answer: "sec^2 theta.", working: ["Use the standard trigonometric identity."], loIds: ["LO_TRIG_03_IDENTITY_PYTHAG", "LO_TRIG_04_TRANSFORM_SIMPLIFY"] },
  ]
);

const sectionAEquationQuestions = buildGroup(
  {
    cbseFormat: "A",
    skillFamily: "Equation_Solve",
    loIds: ["LO_TRIG_05_SOLVE_EQUATIONS_STANDARD"],
    difficulty: "Easy",
  },
  [
    { questionId: "2026-TRIG-P1-A-029", questionText: "Find theta if sin theta = 1/2 and theta is acute.", answer: "30 deg.", working: ["From the standard values, sin 30 deg = 1/2."], loIds: ["LO_TRIG_05_SOLVE_EQUATIONS_STANDARD", "LO_TRIG_02_STANDARD_VALUES"] },
    { questionId: "2026-TRIG-P1-A-030", questionText: "Find theta if cos theta = sqrt(3)/2 and theta is acute.", answer: "30 deg.", working: ["cos 30 deg = sqrt(3)/2."], loIds: ["LO_TRIG_05_SOLVE_EQUATIONS_STANDARD", "LO_TRIG_02_STANDARD_VALUES"] },
    { questionId: "2026-TRIG-P1-A-031", questionText: "Find theta if tan theta = sqrt(3) and theta is acute.", answer: "60 deg.", working: ["tan 60 deg = sqrt(3)."], loIds: ["LO_TRIG_05_SOLVE_EQUATIONS_STANDARD", "LO_TRIG_02_STANDARD_VALUES"] },
    { questionId: "2026-TRIG-P1-A-032", questionText: "Find theta if sin theta = 1 and theta lies in [0 deg, 90 deg].", answer: "90 deg.", working: ["sin 90 deg = 1."], loIds: ["LO_TRIG_05_SOLVE_EQUATIONS_STANDARD", "LO_TRIG_02_STANDARD_VALUES"] },
    { questionId: "2026-TRIG-P1-A-033", questionText: "Find theta if sin theta = cos theta and theta is acute.", answer: "45 deg.", working: ["sin theta = cos theta at theta = 45 deg in the acute range."], loIds: ["LO_TRIG_05_SOLVE_EQUATIONS_STANDARD", "LO_TRIG_02_STANDARD_VALUES"] },
    { questionId: "2026-TRIG-P1-A-034", questionText: "Find theta if 2 tan theta = 2 and theta is acute.", answer: "45 deg.", working: ["tan theta = 1, so theta = 45 deg."], loIds: ["LO_TRIG_05_SOLVE_EQUATIONS_STANDARD", "LO_TRIG_02_STANDARD_VALUES"] },
    { questionId: "2026-TRIG-P1-A-035", questionText: "Find theta if sec theta = 2 and theta is acute.", answer: "60 deg.", working: ["sec theta = 2 means cos theta = 1/2, so theta = 60 deg."], loIds: ["LO_TRIG_05_SOLVE_EQUATIONS_STANDARD", "LO_TRIG_02_STANDARD_VALUES"] },
  ]
);

const sectionAApplicationQuestions = buildGroup(
  {
    cbseFormat: "A",
    skillFamily: "Heights_Distances",
    loIds: ["LO_TRIG_07_HEIGHTS_DISTANCES_SINGLE"],
    difficulty: "Medium",
  },
  [
    { questionId: "2026-TRIG-P1-A-036", questionText: "A pole and its shadow are equal in length. What is the angle of elevation of the sun?", answer: "45 deg.", working: ["tan theta = pole/shadow = 1, so theta = 45 deg."] },
    { questionId: "2026-TRIG-P1-A-037", questionText: "The angle of depression from the top of a building to a car is 30 deg. What is the angle of elevation from the car to the top?", answer: "30 deg.", working: ["Angle of depression equals angle of elevation."] },
    { questionId: "2026-TRIG-P1-A-038", questionText: "From a point on the ground, the angle of elevation of a tower is 60 deg and the horizontal distance is 10 m. Write the height of the tower.", answer: "10sqrt(3) m.", working: ["Use tan 60 deg = h/10.", "So sqrt(3) = h/10 and h = 10sqrt(3) m."] },
    { questionId: "2026-TRIG-P1-A-039", questionText: "A ladder makes a 45 deg angle with the ground and its foot is 4 m from the wall. How high does it reach?", answer: "4 m.", working: ["tan 45 deg = height/4 = 1, so height = 4 m."] },
    { questionId: "2026-TRIG-P1-A-040", questionText: "A tower is seen from a point on level ground at 30 deg. Which ratio should be used first to relate height and distance?", answer: "tan 30 deg = height/distance.", working: ["Height is opposite side and distance is adjacent side."], loIds: ["LO_TRIG_08_HEIGHTS_DISTANCES_TWOANGLES"] },
  ]
);

const sectionAProofQuestions = buildGroup(
  {
    cbseFormat: "A",
    skillFamily: "Proof_Pattern",
    loIds: ["LO_TRIG_06_PROOF_PATTERNS", "LO_TRIG_10_ERROR_CHECK_REVIEW"],
    difficulty: "Easy",
  },
  [
    { questionId: "2026-TRIG-P1-A-041", questionText: "In a trigonometric proof, from which side should you usually start?", answer: "Start from the LHS or the more complex side.", working: ["Board proofs normally begin from one side only, preferably the more workable side."] },
    { questionId: "2026-TRIG-P1-A-042", questionText: "Fill in the missing line for a proof: sin^2 theta + ____ = 1.", answer: "cos^2 theta.", working: ["Use the core identity before moving to the next line."] },
    { questionId: "2026-TRIG-P1-A-043", questionText: "What final phrase is expected at the end of a completed trig proof?", answer: "Hence proved.", working: ["CBSE proof writing should end with a clear conclusion line."] },
  ]
);

const sectionACaseProtocolQuestions = buildGroup(
  {
    cbseFormat: "A",
    skillFamily: "Case_Study",
    loIds: ["LO_TRIG_09_CASE_STUDY_PROTOCOL", "LO_TRIG_10_ERROR_CHECK_REVIEW"],
    difficulty: "Easy",
  },
  [
    { questionId: "2026-TRIG-P1-A-044", questionText: "In a trig case-study question, what should you do before solving part (i)?", answer: "Extract the given data and label a quick sketch.", working: ["Part-wise solving starts after identifying the data correctly."] },
    { questionId: "2026-TRIG-P1-A-045", questionText: "A case stem gives angle 60 deg and base 5 m. Which ratio should be used first to find height?", answer: "tan 60 deg = height/5.", working: ["Height over base suggests the tangent ratio."], loIds: ["LO_TRIG_09_CASE_STUDY_PROTOCOL", "LO_TRIG_07_HEIGHTS_DISTANCES_SINGLE"] },
  ]
);

const sectionBQuestions = [
  ...buildGroup(
    {
      cbseFormat: "B",
      skillFamily: "Definition_Ratios",
      loIds: ["LO_TRIG_01_RATIOS_SETUP"],
      difficulty: "Easy",
    },
    [
      { questionId: "2026-TRIG-P1-B-001", questionText: "If tan theta = 5/12 and theta is acute, find sin theta.", answer: "sin theta = 5/13.", working: ["Take opposite = 5k and adjacent = 12k.", "Then hypotenuse = 13k by Pythagoras theorem, so sin theta = 5/13."], loIds: ["LO_TRIG_01_RATIOS_SETUP", "LO_TRIG_03_IDENTITY_PYTHAG"] },
      { questionId: "2026-TRIG-P1-B-002", questionText: "If sin A = 12/13 and A is acute, find cos A.", answer: "cos A = 5/13.", working: ["Take opposite = 12k and hypotenuse = 13k.", "Adjacent side becomes 5k, so cos A = 5/13."], loIds: ["LO_TRIG_01_RATIOS_SETUP", "LO_TRIG_03_IDENTITY_PYTHAG"] },
      { questionId: "2026-TRIG-P1-B-003", questionText: "If sec theta = 13/12 and theta is acute, find tan theta.", answer: "tan theta = 5/12.", working: ["sec theta = 13/12 means hypotenuse/base = 13/12.", "The third side is 5 by Pythagoras theorem, so tan theta = 5/12."], loIds: ["LO_TRIG_01_RATIOS_SETUP", "LO_TRIG_03_IDENTITY_PYTHAG"] },
      { questionId: "2026-TRIG-P1-B-004", questionText: "In right triangle PQR, right-angled at Q, if PQ = 5 cm and PR = 13 cm, find cos P.", answer: "cos P = 5/13.", working: ["For angle P, adjacent side is PQ and hypotenuse is PR.", "So cos P = PQ/PR = 5/13."] },
      { questionId: "2026-TRIG-P1-B-005", questionText: "If tan theta = 3/4, write the values of sin theta and cos theta.", answer: "sin theta = 3/5 and cos theta = 4/5.", working: ["Take opposite = 3k and adjacent = 4k.", "The hypotenuse is 5k, so sin theta = 3/5 and cos theta = 4/5."], loIds: ["LO_TRIG_01_RATIOS_SETUP", "LO_TRIG_03_IDENTITY_PYTHAG"] },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "B",
      skillFamily: "Standard_Values",
      loIds: ["LO_TRIG_02_STANDARD_VALUES"],
      difficulty: "Easy",
    },
    [
      { questionId: "2026-TRIG-P1-B-006", questionText: "Evaluate sin 30 deg cos 60 deg + cos 30 deg sin 60 deg.", answer: "1.", working: ["Substitute values: (1/2)(1/2) + (sqrt(3)/2)(sqrt(3)/2).", "This gives 1/4 + 3/4 = 1."] },
      { questionId: "2026-TRIG-P1-B-007", questionText: "Evaluate 2 sin 45 deg cos 45 deg.", answer: "1.", working: ["sin 45 deg = cos 45 deg = 1/sqrt(2).", "So 2 x (1/sqrt(2)) x (1/sqrt(2)) = 1."] },
      { questionId: "2026-TRIG-P1-B-008", questionText: "Evaluate tan 30 deg x tan 60 deg.", answer: "1.", working: ["tan 30 deg = 1/sqrt(3) and tan 60 deg = sqrt(3).", "Their product is 1."] },
      { questionId: "2026-TRIG-P1-B-009", questionText: "Find theta if cos theta = 1/2 and theta is acute.", answer: "theta = 60 deg.", working: ["Use the standard value cos 60 deg = 1/2.", "Hence theta = 60 deg."], loIds: ["LO_TRIG_02_STANDARD_VALUES", "LO_TRIG_05_SOLVE_EQUATIONS_STANDARD"] },
      { questionId: "2026-TRIG-P1-B-010", questionText: "Find the value of sin 60 deg - cos 30 deg.", answer: "0.", working: ["sin 60 deg = sqrt(3)/2 and cos 30 deg = sqrt(3)/2.", "Subtracting gives 0."] },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "B",
      skillFamily: "Identity_Simplify",
      loIds: ["LO_TRIG_03_IDENTITY_PYTHAG", "LO_TRIG_04_TRANSFORM_SIMPLIFY"],
      difficulty: "Medium",
    },
    [
      { questionId: "2026-TRIG-P1-B-011", questionText: "Verify that if sin theta = 4/5, then sin^2 theta + cos^2 theta = 1.", answer: "Verified.", working: ["If sin theta = 4/5, then cos theta = 3/5 for an acute angle.", "So sin^2 theta + cos^2 theta = 16/25 + 9/25 = 1."] },
      { questionId: "2026-TRIG-P1-B-012", questionText: "Simplify (1 - cos^2 A) / sin A.", answer: "sin A.", working: ["Use 1 - cos^2 A = sin^2 A.", "Then sin^2 A / sin A = sin A."] },
      { questionId: "2026-TRIG-P1-B-013", questionText: "Simplify (sec A + tan A)(sec A - tan A).", answer: "1.", working: ["Use (a + b)(a - b) = a^2 - b^2.", "So sec^2 A - tan^2 A = 1."] },
      { questionId: "2026-TRIG-P1-B-014", questionText: "If sec theta = 5/4, find sin theta.", answer: "sin theta = 3/5.", working: ["sec theta = 5/4 gives cos theta = 4/5.", "Using sin^2 theta = 1 - cos^2 theta, sin theta = 3/5."], loIds: ["LO_TRIG_03_IDENTITY_PYTHAG", "LO_TRIG_04_TRANSFORM_SIMPLIFY"] },
      { questionId: "2026-TRIG-P1-B-015", questionText: "If cot theta = 7/24 and theta is acute, find cos theta.", answer: "cos theta = 7/25.", working: ["Take adjacent = 7k and opposite = 24k.", "Then hypotenuse = 25k, so cos theta = 7/25."] },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "B",
      skillFamily: "Equation_Solve",
      loIds: ["LO_TRIG_05_SOLVE_EQUATIONS_STANDARD"],
      difficulty: "Medium",
    },
    [
      { questionId: "2026-TRIG-P1-B-016", questionText: "Solve 2 sin theta = sqrt(3), where theta is acute.", answer: "theta = 60 deg.", working: ["This gives sin theta = sqrt(3)/2.", "So theta = 60 deg."], loIds: ["LO_TRIG_05_SOLVE_EQUATIONS_STANDARD", "LO_TRIG_02_STANDARD_VALUES"] },
      { questionId: "2026-TRIG-P1-B-017", questionText: "Solve 2 cos theta = 1, where theta is acute.", answer: "theta = 60 deg.", working: ["This gives cos theta = 1/2.", "So theta = 60 deg."], loIds: ["LO_TRIG_05_SOLVE_EQUATIONS_STANDARD", "LO_TRIG_02_STANDARD_VALUES"] },
      { questionId: "2026-TRIG-P1-B-018", questionText: "Solve tan theta = 1/sqrt(3), where theta is acute.", answer: "theta = 30 deg.", working: ["The standard value tan 30 deg is 1/sqrt(3).", "Hence theta = 30 deg."], loIds: ["LO_TRIG_05_SOLVE_EQUATIONS_STANDARD", "LO_TRIG_02_STANDARD_VALUES"] },
      { questionId: "2026-TRIG-P1-B-019", questionText: "Simplify (sin theta / cos theta) x (cos theta / sin theta).", answer: "1.", working: ["Cancel the common factors sin theta and cos theta.", "The expression reduces to 1."], loIds: ["LO_TRIG_05_SOLVE_EQUATIONS_STANDARD", "LO_TRIG_04_TRANSFORM_SIMPLIFY"] },
      { questionId: "2026-TRIG-P1-B-020", questionText: "If sin theta = 3/5 and theta is acute, find sec theta.", answer: "sec theta = 5/4.", working: ["From sin theta = 3/5, cos theta = 4/5.", "sec theta is the reciprocal of cos theta, so sec theta = 5/4."] },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "B",
      skillFamily: "Heights_Distances",
      loIds: ["LO_TRIG_07_HEIGHTS_DISTANCES_SINGLE"],
      difficulty: "Medium",
    },
    [
      { questionId: "2026-TRIG-P1-B-021", questionText: "From a point 15 m away from the foot of a tower, the angle of elevation of its top is 45 deg. Find the height of the tower.", answer: "15 m.", working: ["Use tan 45 deg = height/15.", "Since tan 45 deg = 1, the height is 15 m."] },
      { questionId: "2026-TRIG-P1-B-022", questionText: "A kite string 20 m long makes an angle of 30 deg with the ground. Find the height of the kite above the ground.", answer: "10 m.", working: ["Use sin 30 deg = height/20.", "So 1/2 = height/20 and height = 10 m."] },
      { questionId: "2026-TRIG-P1-B-023", questionText: "From the top of an 18 m lighthouse, the angle of depression of a boat is 45 deg. Find the distance of the boat from the lighthouse.", answer: "18 m.", working: ["Angle of depression equals angle of elevation.", "Use tan 45 deg = 18/distance to get distance = 18 m."] },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "B",
      skillFamily: "Proof_Pattern",
      loIds: ["LO_TRIG_06_PROOF_PATTERNS", "LO_TRIG_10_ERROR_CHECK_REVIEW"],
      difficulty: "Medium",
    },
    [
      { questionId: "2026-TRIG-P1-B-024", questionText: "In proving (1 - sin^2 theta)/cos theta = cos theta, which identity should be used and what is the result after substitution?", answer: "Use 1 - sin^2 theta = cos^2 theta; the result becomes cos theta.", working: ["Replace 1 - sin^2 theta by cos^2 theta.", "Then cos^2 theta / cos theta = cos theta."] },
      { questionId: "2026-TRIG-P1-B-025", questionText: "State the correct opening line for proving sec^2 theta - 1 = tan^2 theta.", answer: "Start from the LHS: sec^2 theta - 1.", working: ["A trig proof should begin from one side only.", "Here the standard opening is the left-hand side."] },
    ]
  ),
] satisfies readonly TrigPackQuestion[];

const sectionCQuestions = [
  ...buildGroup(
    {
      cbseFormat: "C",
      skillFamily: "Identity_Simplify",
      loIds: ["LO_TRIG_03_IDENTITY_PYTHAG", "LO_TRIG_04_TRANSFORM_SIMPLIFY"],
      difficulty: "Medium",
    },
    [
      { questionId: "2026-TRIG-P1-C-001", questionText: "If tan theta = 3/4 and theta is acute, find all the six trigonometric ratios of theta.", answer: "sin theta = 3/5, cos theta = 4/5, tan theta = 3/4, cot theta = 4/3, sec theta = 5/4, cosec theta = 5/3.", working: ["Take opposite = 3k and adjacent = 4k, so hypotenuse = 5k.", "Write each ratio using opposite, adjacent and hypotenuse.", "List the reciprocal ratios at the end."], loIds: ["LO_TRIG_01_RATIOS_SETUP", "LO_TRIG_03_IDENTITY_PYTHAG"] },
      { questionId: "2026-TRIG-P1-C-002", questionText: "If sin theta = 5/13 and theta is acute, find cos theta and sec theta.", answer: "cos theta = 12/13 and sec theta = 13/12.", working: ["Take opposite = 5k and hypotenuse = 13k.", "Using Pythagoras theorem, adjacent side = 12k.", "So cos theta = 12/13 and sec theta = 13/12."] },
      { questionId: "2026-TRIG-P1-C-003", questionText: "Simplify (sin^2 30 deg + cos^2 60 deg) / tan 45 deg.", answer: "1/2.", working: ["sin^2 30 deg = 1/4 and cos^2 60 deg = 1/4.", "The numerator becomes 1/2 and tan 45 deg = 1.", "So the simplified value is 1/2."], loIds: ["LO_TRIG_02_STANDARD_VALUES", "LO_TRIG_04_TRANSFORM_SIMPLIFY"] },
      { questionId: "2026-TRIG-P1-C-004", questionText: "Prove that (1 + tan^2 A) / sec^2 A = 1.", answer: "LHS = 1.", working: ["Start with the LHS and use 1 + tan^2 A = sec^2 A.", "Then sec^2 A / sec^2 A = 1.", "Hence the required result is proved."] },
      { questionId: "2026-TRIG-P1-C-005", questionText: "Simplify ((1 - cos A)(1 + cos A)) / sin^2 A.", answer: "1.", working: ["Use (1 - cos A)(1 + cos A) = 1 - cos^2 A.", "Replace 1 - cos^2 A by sin^2 A.", "So the expression becomes sin^2 A / sin^2 A = 1."] },
      { questionId: "2026-TRIG-P1-C-006", questionText: "If sec theta + tan theta = 2, find sec theta - tan theta.", answer: "1/2.", working: ["Use (sec theta + tan theta)(sec theta - tan theta) = sec^2 theta - tan^2 theta.", "Since sec^2 theta - tan^2 theta = 1, we get 2(sec theta - tan theta) = 1.", "So sec theta - tan theta = 1/2."], loIds: ["LO_TRIG_04_TRANSFORM_SIMPLIFY", "LO_TRIG_06_PROOF_PATTERNS"] },
      { questionId: "2026-TRIG-P1-C-007", questionText: "If sin theta = 12/13 and theta is acute, find (1 - cos theta)/(1 + cos theta).", answer: "4/9.", working: ["From sin theta = 12/13, take cos theta = 5/13.", "Substitute to get (1 - 5/13)/(1 + 5/13) = (8/13)/(18/13).", "This simplifies to 4/9."] },
      { questionId: "2026-TRIG-P1-C-008", questionText: "Simplify (1/sin A - sin A) / cos^2 A.", answer: "cosec A.", working: ["Take the numerator over a common denominator: (1 - sin^2 A)/sin A.", "Replace 1 - sin^2 A by cos^2 A.", "Then cos^2 A / (sin A cos^2 A) = 1/sin A = cosec A."], loIds: ["LO_TRIG_03_IDENTITY_PYTHAG", "LO_TRIG_04_TRANSFORM_SIMPLIFY"] },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "C",
      skillFamily: "Equation_Solve",
      loIds: ["LO_TRIG_05_SOLVE_EQUATIONS_STANDARD"],
      difficulty: "Medium",
    },
    [
      { questionId: "2026-TRIG-P1-C-009", questionText: "Solve 2 sin theta = 1 for acute theta.", answer: "theta = 30 deg.", working: ["The equation gives sin theta = 1/2.", "Using the standard value table, theta = 30 deg.", "State the acute-angle solution clearly."], loIds: ["LO_TRIG_05_SOLVE_EQUATIONS_STANDARD", "LO_TRIG_02_STANDARD_VALUES"] },
      { questionId: "2026-TRIG-P1-C-010", questionText: "Solve cos theta = 1/sqrt(2) for acute theta.", answer: "theta = 45 deg.", working: ["1/sqrt(2) is the standard value of cos 45 deg.", "Hence theta = 45 deg.", "Write the acute-angle answer in the final line."], loIds: ["LO_TRIG_05_SOLVE_EQUATIONS_STANDARD", "LO_TRIG_02_STANDARD_VALUES"] },
      { questionId: "2026-TRIG-P1-C-011", questionText: "Solve tan^2 theta = 3 for acute theta.", answer: "theta = 60 deg.", working: ["tan^2 theta = 3 implies tan theta = sqrt(3) for acute theta.", "Using the standard value table, theta = 60 deg.", "Write the final acute-angle answer."], loIds: ["LO_TRIG_05_SOLVE_EQUATIONS_STANDARD", "LO_TRIG_02_STANDARD_VALUES"] },
      { questionId: "2026-TRIG-P1-C-012", questionText: "Solve sec theta = cosec theta for acute theta.", answer: "theta = 45 deg.", working: ["sec theta = cosec theta gives 1/cos theta = 1/sin theta.", "So sin theta = cos theta.", "Hence theta = 45 deg."], loIds: ["LO_TRIG_05_SOLVE_EQUATIONS_STANDARD", "LO_TRIG_04_TRANSFORM_SIMPLIFY"] },
      { questionId: "2026-TRIG-P1-C-013", questionText: "Solve 2 cos^2 theta = 1 for acute theta.", answer: "theta = 45 deg.", working: ["The equation gives cos^2 theta = 1/2.", "So cos theta = 1/sqrt(2) for acute theta.", "Hence theta = 45 deg."], loIds: ["LO_TRIG_05_SOLVE_EQUATIONS_STANDARD", "LO_TRIG_03_IDENTITY_PYTHAG"] },
      { questionId: "2026-TRIG-P1-C-014", questionText: "Solve 1 - 2 sin^2 theta = 0 for acute theta.", answer: "theta = 45 deg.", working: ["Rearrange to get 2 sin^2 theta = 1, so sin^2 theta = 1/2.", "Thus sin theta = 1/sqrt(2) for an acute angle.", "Hence theta = 45 deg."], loIds: ["LO_TRIG_05_SOLVE_EQUATIONS_STANDARD", "LO_TRIG_03_IDENTITY_PYTHAG"] },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "C",
      skillFamily: "Heights_Distances",
      loIds: ["LO_TRIG_07_HEIGHTS_DISTANCES_SINGLE"],
      difficulty: "Medium",
    },
    [
      { questionId: "2026-TRIG-P1-C-015", questionText: "A tree casts a shadow 10sqrt(3) m long when the angle of elevation of the sun is 30 deg. Find the height of the tree.", answer: "10 m.", working: ["Let the height of the tree be h m.", "Using tan 30 deg = h / 10sqrt(3), we get 1/sqrt(3) = h / 10sqrt(3).", "Hence h = 10 m."] },
      { questionId: "2026-TRIG-P1-C-016", questionText: "From a point 12 m away from the foot of a tower, the angle of elevation of the top is 60 deg. Find the height of the tower.", answer: "12sqrt(3) m.", working: ["Let the height of the tower be h m.", "Use tan 60 deg = h / 12 = sqrt(3).", "Therefore h = 12sqrt(3) m."] },
      { questionId: "2026-TRIG-P1-C-017", questionText: "From the top of a 24 m building, the angle of depression of a car is 30 deg. Find the distance of the car from the foot of the building.", answer: "24sqrt(3) m.", working: ["Angle of elevation from the car is also 30 deg.", "Use tan 30 deg = 24 / distance.", "So distance = 24sqrt(3) m."] },
      { questionId: "2026-TRIG-P1-C-018", questionText: "A kite string 50 m long makes an angle of 60 deg with the ground. Find the height of the kite and the horizontal distance of the flyer from the point vertically below the kite.", answer: "Height = 25sqrt(3) m and horizontal distance = 25 m.", working: ["Use sin 60 deg = height / 50 to get height = 25sqrt(3) m.", "Use cos 60 deg = horizontal distance / 50 to get horizontal distance = 25 m.", "Write both required values clearly."], loIds: ["LO_TRIG_07_HEIGHTS_DISTANCES_SINGLE", "LO_TRIG_08_HEIGHTS_DISTANCES_TWOANGLES"] },
      { questionId: "2026-TRIG-P1-C-019", questionText: "A vertical pole 8 m high casts a shadow 8/sqrt(3) m long. Find the angle of elevation of the sun.", answer: "60 deg.", working: ["Use tan theta = 8 / (8/sqrt(3)).", "This gives tan theta = sqrt(3).", "Hence theta = 60 deg."] },
      { questionId: "2026-TRIG-P1-C-020", questionText: "From a point on level ground, the angle of elevation of the top of a tower is 45 deg. If the height of the tower is 14 m, find the distance of the point from the tower.", answer: "14 m.", working: ["Let the distance from the tower be x m.", "Using tan 45 deg = 14 / x = 1, we get x = 14 m.", "Hence the required distance is 14 m."] },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "C",
      skillFamily: "Proof_Pattern",
      loIds: ["LO_TRIG_06_PROOF_PATTERNS", "LO_TRIG_10_ERROR_CHECK_REVIEW"],
      difficulty: "Medium",
    },
    [
      { questionId: "2026-TRIG-P1-C-021", questionText: "Prove that sin A / (1 + cos A) = (1 - cos A) / sin A.", answer: "LHS = RHS.", working: ["Start with the LHS and multiply numerator and denominator by (1 - cos A).", "Use 1 - cos^2 A = sin^2 A in the denominator.", "The expression reduces to (1 - cos A) / sin A, which is the RHS."] },
      { questionId: "2026-TRIG-P1-C-022", questionText: "Prove that (sec A - cos A) / tan A = sin A.", answer: "LHS = sin A.", working: ["Write sec A as 1/cos A and tan A as sin A/cos A.", "Then the numerator becomes (1 - cos^2 A)/cos A = sin^2 A/cos A.", "Dividing by sin A/cos A leaves sin A."] },
      { questionId: "2026-TRIG-P1-C-023", questionText: "Show that (1 + tan^2 A) sin^2 A = tan^2 A.", answer: "LHS = tan^2 A.", working: ["Use 1 + tan^2 A = sec^2 A.", "Then sec^2 A sin^2 A = (sin^2 A)/(cos^2 A).", "This is tan^2 A."] },
      { questionId: "2026-TRIG-P1-C-024", questionText: "If (sin A + cos A)^2 = 2 and A is acute, find A.", answer: "A = 45 deg.", working: ["Expand to get sin^2 A + cos^2 A + 2 sin A cos A = 2.", "Using sin^2 A + cos^2 A = 1, we get 2 sin A cos A = 1.", "So sin 2A = 1 and for acute A, A = 45 deg."], loIds: ["LO_TRIG_03_IDENTITY_PYTHAG", "LO_TRIG_05_SOLVE_EQUATIONS_STANDARD"] },
      { questionId: "2026-TRIG-P1-C-025", questionText: "A boy observes the top of a tree at an angle of elevation of 45 deg. If the tree is 14 m high, find the distance of the boy from the tree.", answer: "14 m.", working: ["Let the distance from the tree be x m.", "Using tan 45 deg = 14 / x = 1, we get x = 14 m.", "Hence the boy is 14 m away from the tree."], loIds: ["LO_TRIG_07_HEIGHTS_DISTANCES_SINGLE", "LO_TRIG_10_ERROR_CHECK_REVIEW"] },
    ]
  ),
] satisfies readonly TrigPackQuestion[];
const sectionDQuestions = [
  ...buildGroup(
    {
      cbseFormat: "D",
      skillFamily: "Proof_Pattern",
      loIds: ["LO_TRIG_06_PROOF_PATTERNS", "LO_TRIG_10_ERROR_CHECK_REVIEW"],
      difficulty: "Hard",
    },
    [
      { questionId: "2026-TRIG-P1-D-001", questionText: "Prove that (1 - sin A)(1 + sin A) = cos^2 A.", answer: "LHS = cos^2 A.", working: ["Start with the LHS: (1 - sin A)(1 + sin A).", "Use the identity (x - y)(x + y) = x^2 - y^2 to get 1 - sin^2 A.", "Apply the identity 1 - sin^2 A = cos^2 A.", "Thus the LHS equals cos^2 A."] },
      { questionId: "2026-TRIG-P1-D-002", questionText: "Prove that (sec A + tan A)(1 - sin A) = cos A.", answer: "LHS = cos A.", working: ["Start with the LHS and write sec A = 1/cos A and tan A = sin A/cos A.", "Then sec A + tan A = (1 + sin A)/cos A.", "Multiply by (1 - sin A) to get (1 - sin^2 A)/cos A.", "Use 1 - sin^2 A = cos^2 A and simplify to cos A."] },
      { questionId: "2026-TRIG-P1-D-003", questionText: "Prove that (1 - cos A)/sin A = sin A/(1 + cos A).", answer: "LHS = RHS.", working: ["Start with the LHS and multiply numerator and denominator by (1 + cos A).", "The numerator becomes 1 - cos^2 A.", "Replace 1 - cos^2 A by sin^2 A.", "Simplify to get sin A/(1 + cos A), which is the RHS."] },
      { questionId: "2026-TRIG-P1-D-004", questionText: "Prove that (sec A - tan A)^2 = (1 - sin A)/(1 + sin A).", answer: "LHS = RHS.", working: ["Start with the LHS and write sec A - tan A = (1 - sin A)/cos A.", "Square both numerator and denominator to get (1 - sin A)^2/cos^2 A.", "Replace cos^2 A by 1 - sin^2 A = (1 - sin A)(1 + sin A).", "Cancel the common factor (1 - sin A) to get (1 - sin A)/(1 + sin A)."] },
      { questionId: "2026-TRIG-P1-D-005", questionText: "Prove that ((1 + sin A)(1 - sin A))/cos^2 A = 1.", answer: "LHS = 1.", working: ["Start with the LHS and use (1 + sin A)(1 - sin A) = 1 - sin^2 A.", "Replace 1 - sin^2 A by cos^2 A.", "Then cos^2 A/cos^2 A = 1.", "Hence proved."] },
      { questionId: "2026-TRIG-P1-D-006", questionText: "Prove that sec A(1 - sin A) = cos A/(1 + sin A).", answer: "LHS = RHS.", working: ["Start with the LHS: sec A(1 - sin A) = (1 - sin A)/cos A.", "Multiply numerator and denominator by (1 + sin A).", "The numerator becomes 1 - sin^2 A = cos^2 A.", "So the expression simplifies to cos A/(1 + sin A), which is the RHS."] },
      { questionId: "2026-TRIG-P1-D-007", questionText: "Prove that (sin A + tan A)/(1 + cos A) = tan A.", answer: "LHS = tan A.", working: ["Start with the LHS and write tan A = sin A/cos A.", "Then the numerator becomes sin A + sin A/cos A = sin A(1 + cos A)/cos A.", "Cancel (1 + cos A) from numerator and denominator.", "The result is sin A/cos A = tan A."] },
      { questionId: "2026-TRIG-P1-D-008", questionText: "Prove that (sec A - 1)(sec A + 1) = tan^2 A.", answer: "LHS = tan^2 A.", working: ["Use the identity (a - b)(a + b) = a^2 - b^2.", "So the LHS becomes sec^2 A - 1.", "Using sec^2 A - 1 = tan^2 A, the result follows.", "Hence proved."] },
    ]
  ),
  ...buildGroup(
    {
      cbseFormat: "D",
      skillFamily: "Heights_Distances",
      loIds: ["LO_TRIG_07_HEIGHTS_DISTANCES_SINGLE", "LO_TRIG_10_ERROR_CHECK_REVIEW"],
      difficulty: "Hard",
    },
    [
      { questionId: "2026-TRIG-P1-D-009", questionText: "From the top of a 20 m high building, the angle of depression of a car on the road is 30 deg. Find the distance of the car from the foot of the building and the line of sight.", answer: "Distance = 20sqrt(3) m and line of sight = 40 m.", working: ["Let the distance of the car from the foot of the building be x m.", "Angle of elevation from the car is 30 deg, so tan 30 deg = 20/x.", "This gives x = 20sqrt(3) m.", "Using sin 30 deg = 20/line of sight, the line of sight is 40 m."] },
      { questionId: "2026-TRIG-P1-D-010", questionText: "From a point on the ground 15 m from the foot of a tower, the angle of elevation of the top is 60 deg. Find the height of the tower and the line joining the point to the top.", answer: "Height = 15sqrt(3) m and line joining point to top = 30 m.", working: ["Let the height of the tower be h m.", "Using tan 60 deg = h/15, we get h = 15sqrt(3) m.", "Now use cos 60 deg = 15/line joining point to top.", "So the required slant line is 30 m."] },
      { questionId: "2026-TRIG-P1-D-011", questionText: "From the top of a 30 m building, the angles of depression of the top and the foot of a pole are 30 deg and 60 deg respectively. Find the height of the pole and the distance between the building and the pole.", answer: "Height of pole = 20 m and distance = 10sqrt(3) m.", working: ["Let the horizontal distance between the building and the pole be x m and the pole height be h m.", "Using the angle of depression to the foot, tan 60 deg = 30/x, so x = 10sqrt(3) m.", "Using the angle of depression to the top, tan 30 deg = (30 - h)/x.", "Substitute x = 10sqrt(3) to get 1/sqrt(3) = (30 - h)/(10sqrt(3)), hence h = 20 m."], loIds: ["LO_TRIG_08_HEIGHTS_DISTANCES_TWOANGLES", "LO_TRIG_10_ERROR_CHECK_REVIEW"] },
      { questionId: "2026-TRIG-P1-D-012", questionText: "Two poles of heights 8 m and 20 m stand on the same level ground. From a point between them, the angles of elevation of their tops are 45 deg and 60 deg respectively. Find the distances of the point from the two poles.", answer: "Distance from 8 m pole = 8 m and distance from 20 m pole = 20/sqrt(3) m.", working: ["Let the distances from the point to the 8 m pole and 20 m pole be x and y respectively.", "Using tan 45 deg = 8/x, we get x = 8 m.", "Using tan 60 deg = 20/y, we get y = 20/sqrt(3) m.", "Hence the required distances are obtained."], loIds: ["LO_TRIG_08_HEIGHTS_DISTANCES_TWOANGLES", "LO_TRIG_07_HEIGHTS_DISTANCES_SINGLE"] },
      { questionId: "2026-TRIG-P1-D-013", questionText: "From a point on the ground, the angle of elevation of the top of a tower is 30 deg. After moving 50 m towards the tower, the angle becomes 60 deg. Find the height of the tower and the original distance from the tower.", answer: "Height = 25sqrt(3) m and original distance = 75 m.", working: ["Let the distance after moving closer be x m and the tower height be h m.", "From the closer point, tan 60 deg = h/x, so h = xsqrt(3).", "From the original point, tan 30 deg = h/(x + 50).", "Substitute h = xsqrt(3) to get 1/sqrt(3) = xsqrt(3)/(x + 50), so 3x = x + 50 and x = 25.", "Hence h = 25sqrt(3) m and the original distance is x + 50 = 75 m."], loIds: ["LO_TRIG_08_HEIGHTS_DISTANCES_TWOANGLES", "LO_TRIG_10_ERROR_CHECK_REVIEW"] },
      { questionId: "2026-TRIG-P1-D-014", questionText: "A balloon is vertically above a point on the ground. From point A on the ground, the angle of elevation of the balloon is 30 deg. From point B, 20 m nearer to the point vertically below the balloon, the angle of elevation is 60 deg. Find the height of the balloon.", answer: "Height = 10sqrt(3) m.", working: ["Let the distance from B to the point vertically below the balloon be x m and the height be h m.", "Using tan 60 deg = h/x, we get h = xsqrt(3).", "From point A, the horizontal distance is x + 20 and tan 30 deg = h/(x + 20).", "Substitute h = xsqrt(3) to get 1/sqrt(3) = xsqrt(3)/(x + 20), so 3x = x + 20.", "Thus x = 10 and h = 10sqrt(3) m."], loIds: ["LO_TRIG_08_HEIGHTS_DISTANCES_TWOANGLES", "LO_TRIG_10_ERROR_CHECK_REVIEW"] },
      { questionId: "2026-TRIG-P1-D-015", questionText: "An observer standing on the top of a 12 m building sees the top of a tower at an angle of elevation of 45 deg and the foot of the tower at an angle of depression of 30 deg. Find the height of the tower.", answer: "Height of tower = 12(1 + sqrt(3)) m.", working: ["Let the horizontal distance between the building and the tower be x m and the tower height be H m.", "Using the angle of depression to the foot, tan 30 deg = 12/x, so x = 12sqrt(3) m.", "Using the angle of elevation to the top, tan 45 deg = (H - 12)/x = 1.", "Therefore H - 12 = 12sqrt(3), so H = 12(1 + sqrt(3)) m."], loIds: ["LO_TRIG_08_HEIGHTS_DISTANCES_TWOANGLES", "LO_TRIG_07_HEIGHTS_DISTANCES_SINGLE"] },
    ]
  ),
] satisfies readonly TrigPackQuestion[];

const sectionEQuestions = buildGroup(
  {
    cbseFormat: "E",
    skillFamily: "Case_Study",
    loIds: ["LO_TRIG_09_CASE_STUDY_PROTOCOL", "LO_TRIG_10_ERROR_CHECK_REVIEW"],
    difficulty: "Medium",
  },
  [
    { questionId: "2026-TRIG-P1-E-001", questionText: "A survey team is observing a telecom tower from a point 20 m away.\n(i) If the angle of elevation of the top is 45 deg, find the height of the tower.\n(ii) If the team moves 20 m farther away, what will be tan of the new angle using the same tower height?\n(iii) Identify one board-writing step that should be shown before substitution.", answer: "(i) 20 m, (ii) tan new angle = 1/2, (iii) draw the labelled right triangle and write the ratio formula first.", finalAnswer: "(i) Tower height = 20 m, (ii) tan new angle = 1/2, (iii) first write the labelled diagram and tan relation.", working: ["For part (i), use tan 45 deg = h/20 to get h = 20 m.", "For part (ii), the new distance is 40 m, so tan new angle = 20/40 = 1/2.", "For part (iii), CBSE presentation expects a labelled figure and the ratio statement before substitution."], loIds: ["LO_TRIG_09_CASE_STUDY_PROTOCOL", "LO_TRIG_07_HEIGHTS_DISTANCES_SINGLE"] },
    { questionId: "2026-TRIG-P1-E-002", questionText: "A tree casts a shadow of 6sqrt(3) m at a certain time.\n(i) If the angle of elevation of the sun is 30 deg, find the height of the tree.\n(ii) What would be the shadow length if the angle of elevation becomes 45 deg and the height remains the same?\n(iii) State the final unit that should be written in both answers.", answer: "(i) 6 m, (ii) 6 m, (iii) metres.", finalAnswer: "(i) Height = 6 m, (ii) New shadow length = 6 m, (iii) unit = m.", working: ["For part (i), tan 30 deg = h/(6sqrt(3)) gives h = 6 m.", "For part (ii), tan 45 deg = 6/shadow, so shadow = 6 m.", "For part (iii), both measurements are lengths, so the unit is metres."], loIds: ["LO_TRIG_09_CASE_STUDY_PROTOCOL", "LO_TRIG_07_HEIGHTS_DISTANCES_SINGLE"] },
    { questionId: "2026-TRIG-P1-E-003", questionText: "A ladder 10 m long rests against a wall.\n(i) If the foot of the ladder is 6 m from the wall, find the height reached on the wall.\n(ii) What is tan theta, where theta is the angle made by the ladder with the ground?\n(iii) Why should the final answer for part (i) be boxed in the board exam?", answer: "(i) 8 m, (ii) tan theta = 4/3, (iii) boxing the final result helps the examiner award the conclusion mark quickly.", finalAnswer: "(i) Height reached = 8 m, (ii) tan theta = 4/3, (iii) box the final numeric answer.", working: ["For part (i), use Pythagoras theorem: height = sqrt(10^2 - 6^2) = 8 m.", "For part (ii), tan theta = opposite/adjacent = 8/6 = 4/3.", "For part (iii), CBSE marking rewards a clear final conclusion line."], loIds: ["LO_TRIG_09_CASE_STUDY_PROTOCOL", "LO_TRIG_10_ERROR_CHECK_REVIEW"] },
    { questionId: "2026-TRIG-P1-E-004", questionText: "From the top of a 15 m watchtower, a guard observes a boat.\n(i) If the angle of depression is 45 deg, find the distance of the boat from the tower.\n(ii) If the boat moves so that the angle becomes 30 deg, find the new distance.\n(iii) Which pair of angles are equal in this setup?", answer: "(i) 15 m, (ii) 15sqrt(3) m, (iii) angle of depression equals angle of elevation.", finalAnswer: "(i) Distance = 15 m, (ii) New distance = 15sqrt(3) m, (iii) depression angle equals elevation angle.", working: ["For part (i), tan 45 deg = 15/distance gives distance = 15 m.", "For part (ii), tan 30 deg = 15/new distance gives new distance = 15sqrt(3) m.", "For part (iii), the angle of depression from the tower equals the angle of elevation from the boat."], loIds: ["LO_TRIG_09_CASE_STUDY_PROTOCOL", "LO_TRIG_08_HEIGHTS_DISTANCES_TWOANGLES"] },
    { questionId: "2026-TRIG-P1-E-005", questionText: "A drone is flying vertically above a point on the ground.\n(i) From point A, 30 m away, the angle of elevation is 60 deg. Find the height of the drone.\n(ii) From point B, 10 m farther from the same vertical line, write tan of the new angle using the same height.\n(iii) Name the trigonometric ratio used in both parts.", answer: "(i) 30sqrt(3) m, (ii) tan new angle = 30sqrt(3)/40 = 3sqrt(3)/4, (iii) tangent ratio.", finalAnswer: "(i) Drone height = 30sqrt(3) m, (ii) tan new angle = 3sqrt(3)/4, (iii) ratio used = tan.", working: ["For part (i), tan 60 deg = height/30 gives height = 30sqrt(3) m.", "For part (ii), the new horizontal distance is 40 m, so tan new angle = 30sqrt(3)/40 = 3sqrt(3)/4.", "For part (iii), both parts use opposite/adjacent, so the tangent ratio is used."], loIds: ["LO_TRIG_09_CASE_STUDY_PROTOCOL", "LO_TRIG_08_HEIGHTS_DISTANCES_TWOANGLES"] },
    { questionId: "2026-TRIG-P1-E-006", questionText: "A flagpole stands on the roof of a building 12 m high.\n(i) If the angle of elevation of the top of the pole from a point on the ground is 60 deg and the point is 6sqrt(3) m from the building, find the total height.\n(ii) Find the height of the flagpole alone.\n(iii) Write one review check before final submission.", answer: "(i) 18 m, (ii) 6 m, (iii) check units and the final boxed line.", finalAnswer: "(i) Total height = 18 m, (ii) Flagpole height = 6 m, (iii) review units and final answer box.", working: ["For part (i), tan 60 deg = total height/(6sqrt(3)) gives total height = 18 m.", "For part (ii), subtract the building height 12 m from the total height to get pole height 6 m.", "For part (iii), the final review should check units and the concluding answer line."], loIds: ["LO_TRIG_09_CASE_STUDY_PROTOCOL", "LO_TRIG_10_ERROR_CHECK_REVIEW"] },
    { questionId: "2026-TRIG-P1-E-007", questionText: "A student on a terrace 18 m high observes the top of a lamp post.\n(i) If the angle of depression to the foot of the lamp post is 30 deg, find the horizontal distance.\n(ii) If the angle of elevation to the top is 45 deg, find how much taller the lamp post is than the terrace.\n(iii) Find the total height of the lamp post.", answer: "(i) 18sqrt(3) m, (ii) 18sqrt(3) m, (iii) 18 + 18sqrt(3) m.", finalAnswer: "(i) Horizontal distance = 18sqrt(3) m, (ii) extra height = 18sqrt(3) m, (iii) lamp post height = 18 + 18sqrt(3) m.", working: ["For part (i), tan 30 deg = 18/distance gives distance = 18sqrt(3) m.", "For part (ii), tan 45 deg = extra height/distance, so extra height = distance = 18sqrt(3) m.", "For part (iii), add the terrace height and the extra height."], loIds: ["LO_TRIG_09_CASE_STUDY_PROTOCOL", "LO_TRIG_08_HEIGHTS_DISTANCES_TWOANGLES"] },
    { questionId: "2026-TRIG-P1-E-008", questionText: "A surveyor measures a statue using two observations from the same line.\n(i) From the nearer point, 25 m away, the angle of elevation is 45 deg. Find the height of the statue.\n(ii) From a point 25 m farther away, write the ratio equation for the new angle.\n(iii) Why is writing Given and To Find useful here?", answer: "(i) 25 m, (ii) tan new angle = 25/50 = 1/2, (iii) it organizes the data before substitution.", finalAnswer: "(i) Height = 25 m, (ii) tan new angle = 1/2, (iii) Given/To Find improves structure and marking clarity.", working: ["For part (i), tan 45 deg = height/25, so the height is 25 m.", "For part (ii), the new horizontal distance is 50 m, so tan new angle = 25/50 = 1/2.", "For part (iii), Given and To Find help structure the solution before working."] },
    { questionId: "2026-TRIG-P1-E-009", questionText: "A bridge pillar rises vertically from the river bed.\n(i) If the visible height above water is 9 m and the angle of elevation from a point on the bank 9 m away is 45 deg, verify the height above water.\n(ii) If the same point sees the top at 30 deg instead, what height would correspond to that angle?\n(iii) Which standard value is used in part (ii)?", answer: "(i) 9 m, (ii) 3sqrt(3) m, (iii) tan 30 deg = 1/sqrt(3).", finalAnswer: "(i) Verified height = 9 m, (ii) corresponding height = 3sqrt(3) m, (iii) standard value used = tan 30 deg.", working: ["For part (i), tan 45 deg = height/9 gives height = 9 m.", "For part (ii), tan 30 deg = height/9, so height = 9/sqrt(3) = 3sqrt(3) m.", "For part (iii), the standard value used is tan 30 deg = 1/sqrt(3)."], loIds: ["LO_TRIG_09_CASE_STUDY_PROTOCOL", "LO_TRIG_02_STANDARD_VALUES"] },
    { questionId: "2026-TRIG-P1-E-010", questionText: "A monument is viewed from two points on the same straight road.\n(i) At the nearer point, 40 m from the monument, the angle of elevation is 30 deg. Find the height of the monument.\n(ii) At the farther point, 80 m from the monument, find tan of the new angle using the same height.\n(iii) State one mistake to avoid in such questions.", answer: "(i) 40/sqrt(3) m, (ii) tan new angle = 1/(2sqrt(3)), (iii) do not interchange opposite and adjacent sides.", finalAnswer: "(i) Height = 40/sqrt(3) m, (ii) tan new angle = 1/(2sqrt(3)), (iii) avoid swapping the ratio sides.", working: ["For part (i), tan 30 deg = height/40, so height = 40/sqrt(3) m.", "For part (ii), tan new angle = height/80 = (40/sqrt(3))/80 = 1/(2sqrt(3)).", "For part (iii), the most common mistake is swapping the opposite and adjacent sides."], loIds: ["LO_TRIG_09_CASE_STUDY_PROTOCOL", "LO_TRIG_10_ERROR_CHECK_REVIEW"] },
  ]
) satisfies readonly TrigPackQuestion[];

export const TRIG_PACK1_QUESTIONS = [
  ...sectionARatioQuestions,
  ...sectionAStandardValueQuestions,
  ...sectionAIdentityQuestions,
  ...sectionAEquationQuestions,
  ...sectionAApplicationQuestions,
  ...sectionAProofQuestions,
  ...sectionACaseProtocolQuestions,
  ...sectionBQuestions,
  ...sectionCQuestions,
  ...sectionDQuestions,
  ...sectionEQuestions,
] satisfies readonly TrigPackQuestion[];
