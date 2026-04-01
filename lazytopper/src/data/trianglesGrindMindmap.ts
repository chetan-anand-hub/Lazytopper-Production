// src/data/trianglesGrindMindmap.ts
// Triangles Grind Mindmap (Golden Slice v1)
// Mindmap = Marks Roadmap (patterns + rubrics + skeletons + mistake tags)

export type GrindHighwayId =
  | "SIMILARITY_PROOF"
  | "BPT"
  | "AREAS_SIMILAR"
  | "MIXED_APPLICATIONS"
  | "PRESENTATION_MARKING";

export type GrindDifficulty = "EASY" | "MEDIUM" | "HARD";

export type MistakeTag =
  | "REASON_MISSING"
  | "WRONG_CRITERION"
  | "RATIO_ORDER_WRONG"
  | "CORRESPONDENCE_WRONG"
  | "MISSING_GIVEN_TP"
  | "SKIPPED_CONCLUSION"
  | "BAD_PRESENTATION"
  | "ARITHMETIC_ERROR"
  | "UNJUSTIFIED_STEP";

export type RubricCheckpoint = {
  id: string;
  label: string; // examiner language
  marks: number;
  mustMention?: string[];
  commonFailTags?: MistakeTag[];
};

export type SolutionSkeletonStep = {
  id: string;
  heading: string;
  expectedForm: "STATEMENT_REASON" | "FORMULA_SUBSTITUTE" | "CALCULATION" | "CONCLUSION";
};

export type MicroDrill = {
  id: string;
  prompt: string;
  expectedAnswerHints?: string[];
};

export type GrindNode = {
  nodeId: string;
  highwayId: GrindHighwayId;

  title: string;
  examWeight: 1 | 2 | 3 | 4 | 5;
  difficulty: GrindDifficulty;

  prereqNodeIds: string[];

  questionTypes: Array<"PROOF" | "NUMERICAL" | "ASSERTION_REASON" | "CASE_BASED">;

  rubric: {
    totalMarksTypical: number;
    checkpoints: RubricCheckpoint[];
  };

  solutionSkeleton: SolutionSkeletonStep[];

  commonMistakes: Array<{
    tag: MistakeTag;
    studentFriendly: string;
    examinerNote: string;
    fixTip: string;
  }>;

  microDrills: MicroDrill[];

  exampleQuestionIds: string[]; // hook for future bank wiring
};

export type GrindMindmap = {
  chapterId: "triangles";
  highways: Array<{
    id: GrindHighwayId;
    title: string;
    intent: string;
    recommendedNodeOrder: string[];
  }>;
  nodesById: Record<string, GrindNode>;
};

export const trianglesGrindMindmap: GrindMindmap = {
  chapterId: "triangles",
  highways: [
    {
      id: "SIMILARITY_PROOF",
      title: "Similarity Proof Highway",
      intent: "Score in similarity-based proofs and length-finding using correct criteria + correspondence.",
      recommendedNodeOrder: ["S1", "S2", "S3", "S4"],
    },
    {
      id: "BPT",
      title: "BPT Highway",
      intent: "Master Basic Proportionality Theorem patterns (direct + converse) with correct ratio writing.",
      recommendedNodeOrder: ["B1", "B2", "B3"],
    },
    {
      id: "AREAS_SIMILAR",
      title: "Areas of Similar Triangles Highway",
      intent: "Use area ratio = (side ratio)^2 patterns confidently (including reverse conversion).",
      recommendedNodeOrder: ["A1", "A2"],
    },
    {
      id: "MIXED_APPLICATIONS",
      title: "Mixed Applications Highway",
      intent: "Combine similarity + BPT + area in one question (v1: reserved).",
      recommendedNodeOrder: [],
    },
    {
      id: "PRESENTATION_MARKING",
      title: "Presentation & Marking Highway",
      intent: "Write solutions in board-friendly structure and secure free marks via theorem naming + conclusion lines.",
      recommendedNodeOrder: ["P1", "P2"],
    },
  ],
  nodesById: {
    S1: {
      nodeId: "S1",
      highwayId: "SIMILARITY_PROOF",
      title: "Identify similar triangles (trigger step: pick the two triangles + why)",
      examWeight: 5,
      difficulty: "EASY",
      prereqNodeIds: [],
      questionTypes: ["PROOF", "NUMERICAL"],
      rubric: {
        totalMarksTypical: 2,
        checkpoints: [
          { id: "S1-C1", label: "Correctly identifies the pair of triangles to compare", marks: 1, mustMention: ["Δ", "and"] },
          { id: "S1-C2", label: "States at least one correct relation (angle equality / side link) with reason", marks: 1, commonFailTags: ["REASON_MISSING", "CORRESPONDENCE_WRONG"] },
        ],
      },
      solutionSkeleton: [
        { id: "S1-SS1", heading: "Name the two triangles", expectedForm: "STATEMENT_REASON" },
        { id: "S1-SS2", heading: "Write angle equalities / side relations (with reason)", expectedForm: "STATEMENT_REASON" },
        { id: "S1-SS3", heading: "State likely similarity criterion to use", expectedForm: "STATEMENT_REASON" },
      ],
      commonMistakes: [
        { tag: "CORRESPONDENCE_WRONG", studentFriendly: "Triangle order mismatch (wrong matching of vertices).", examinerNote: "Wrong correspondence makes the rest of ratios/angles invalid.", fixTip: "Match equal angles first, then align vertices accordingly." },
        { tag: "REASON_MISSING", studentFriendly: "You wrote an equality but didn’t write the reason.", examinerNote: "Missing reasons often lose marks in proofs.", fixTip: "Add reason: ‘alternate interior angles (parallel lines)’ / ‘common angle’ / ‘given’." },
      ],
      microDrills: [
        { id: "S1-M1", prompt: "If AB ∥ DE, which angles become equal in ΔABC and ΔADE?", expectedAnswerHints: ["alternate interior angles", "corresponding angles", "parallel"] },
        { id: "S1-M2", prompt: "If ∠A = ∠D and ∠B = ∠E, write the correct matching order of vertices.", expectedAnswerHints: ["A↔D", "B↔E", "C↔F (or remaining vertex)"] },
      ],
      exampleQuestionIds: [],
    },

    S2: {
      nodeId: "S2",
      highwayId: "SIMILARITY_PROOF",
      title: "Prove similarity using AAA / SAS / SSS (template: show conditions → name criterion → conclude)",
      examWeight: 5,
      difficulty: "MEDIUM",
      prereqNodeIds: ["S1"],
      questionTypes: ["PROOF"],
      rubric: {
        totalMarksTypical: 3,
        checkpoints: [
          { id: "S2-C1", label: "States the intended pair of triangles clearly", marks: 1, mustMention: ["Δ"] },
          { id: "S2-C2", label: "Shows required conditions correctly (angles/ratios as per criterion)", marks: 1, commonFailTags: ["WRONG_CRITERION", "REASON_MISSING"] },
          { id: "S2-C3", label: "Names the correct similarity criterion and concludes Δ… ~ Δ…", marks: 1, commonFailTags: ["WRONG_CRITERION", "SKIPPED_CONCLUSION"] },
        ],
      },
      solutionSkeleton: [
        { id: "S2-SS1", heading: "State triangles to compare", expectedForm: "STATEMENT_REASON" },
        { id: "S2-SS2", heading: "Write equal angles / side ratios (with reasons)", expectedForm: "STATEMENT_REASON" },
        { id: "S2-SS3", heading: "Name criterion and conclude similarity", expectedForm: "CONCLUSION" },
      ],
      commonMistakes: [
        { tag: "WRONG_CRITERION", studentFriendly: "You used the wrong similarity criterion.", examinerNote: "Criterion mismatch makes the proof invalid.", fixTip: "AAA needs 2 angles; SAS needs 2 side ratios + included angle; SSS needs 3 side ratios." },
        { tag: "SKIPPED_CONCLUSION", studentFriendly: "You didn’t write the final similarity line (Δ… ~ Δ…).", examinerNote: "Examiners expect the explicit conclusion statement.", fixTip: "Always write: ‘Therefore, Δ… ~ Δ… (by ___ criterion)’" },
      ],
      microDrills: [
        { id: "S2-M1", prompt: "You know ∠A = ∠D and ∠B = ∠E. Which criterion applies?", expectedAnswerHints: ["AAA", "two angles"] },
        { id: "S2-M2", prompt: "If AB/DE = AC/DF and ∠A = ∠D, which criterion applies?", expectedAnswerHints: ["SAS", "included angle"] },
      ],
      exampleQuestionIds: [],
    },

    S3: {
      nodeId: "S3",
      highwayId: "SIMILARITY_PROOF",
      title: "Write correspondence + ratio order correctly (the mark-losing step)",
      examWeight: 5,
      difficulty: "MEDIUM",
      prereqNodeIds: ["S2"],
      questionTypes: ["PROOF", "NUMERICAL"],
      rubric: {
        totalMarksTypical: 4,
        checkpoints: [
          { id: "S3-C1", label: "Correct correspondence mapping (A↔D, B↔E, C↔F)", marks: 1, commonFailTags: ["CORRESPONDENCE_WRONG"] },
          { id: "S3-C2", label: "Correct proportionality statement with consistent ratio order", marks: 1, mustMention: ["=", "/"], commonFailTags: ["RATIO_ORDER_WRONG", "CORRESPONDENCE_WRONG"] },
          { id: "S3-C3", label: "Uses ratio correctly to reach the required result (length/relation)", marks: 2, commonFailTags: ["UNJUSTIFIED_STEP", "RATIO_ORDER_WRONG"] },
        ],
      },
      solutionSkeleton: [
        { id: "S3-SS1", heading: "State the correspondence order", expectedForm: "STATEMENT_REASON" },
        { id: "S3-SS2", heading: "Write the proportionality relations in correct order", expectedForm: "FORMULA_SUBSTITUTE" },
        { id: "S3-SS3", heading: "Use ratio to compute/prove the required statement", expectedForm: "CALCULATION" },
        { id: "S3-SS4", heading: "Final conclusion line", expectedForm: "CONCLUSION" },
      ],
      commonMistakes: [
        { tag: "RATIO_ORDER_WRONG", studentFriendly: "You flipped ratios mid-solution (order not consistent).", examinerNote: "Inconsistent ratio order is a common reason for losing marks.", fixTip: "Pick one direction and keep it throughout (AB/DE, BC/EF, AC/DF)." },
        { tag: "CORRESPONDENCE_WRONG", studentFriendly: "You matched wrong sides as corresponding.", examinerNote: "Corresponding sides must be opposite equal angles.", fixTip: "First match equal angles, then the side opposite those angles corresponds." },
        { tag: "UNJUSTIFIED_STEP", studentFriendly: "You jumped from similarity to the final result without writing proportionality.", examinerNote: "Key linking step missing.", fixTip: "Always write the proportionality line before using it." },
      ],
      microDrills: [
        { id: "S3-M1", prompt: "If ΔABC ~ ΔPQR, write three proportionality relations.", expectedAnswerHints: ["AB/PQ = BC/QR = AC/PR"] },
        { id: "S3-M2", prompt: "If ∠A ↔ ∠P, which side corresponds to BC?", expectedAnswerHints: ["depends on full mapping; match vertices first"] },
      ],
      exampleQuestionIds: [],
    },

    S4: {
      nodeId: "S4",
      highwayId: "SIMILARITY_PROOF",
      title: "Use similarity to find unknown lengths (numerical pattern)",
      examWeight: 4,
      difficulty: "MEDIUM",
      prereqNodeIds: ["S3"],
      questionTypes: ["NUMERICAL"],
      rubric: {
        totalMarksTypical: 4,
        checkpoints: [
          { id: "S4-C1", label: "Correct similarity conclusion stated", marks: 1, commonFailTags: ["SKIPPED_CONCLUSION"] },
          { id: "S4-C2", label: "Correct ratio equation for the unknown", marks: 1, commonFailTags: ["RATIO_ORDER_WRONG"] },
          { id: "S4-C3", label: "Correct substitution in ratio equation", marks: 1 },
          { id: "S4-C4", label: "Correct calculation + final answer", marks: 1, commonFailTags: ["ARITHMETIC_ERROR"] },
        ],
      },
      solutionSkeleton: [
        { id: "S4-SS1", heading: "Establish similarity (criterion) — short", expectedForm: "STATEMENT_REASON" },
        { id: "S4-SS2", heading: "Write ratio equation to involve x", expectedForm: "FORMULA_SUBSTITUTE" },
        { id: "S4-SS3", heading: "Substitute values and solve", expectedForm: "CALCULATION" },
        { id: "S4-SS4", heading: "Final answer (with units if any)", expectedForm: "CONCLUSION" },
      ],
      commonMistakes: [
        { tag: "ARITHMETIC_ERROR", studentFriendly: "Your equation was correct but arithmetic went wrong.", examinerNote: "Marks often cut at the final step due to calculation errors.", fixTip: "Cross-multiply carefully and show intermediate steps." },
        { tag: "RATIO_ORDER_WRONG", studentFriendly: "You used the inverse ratio and got wrong x.", examinerNote: "Wrong ratio direction causes wrong final value.", fixTip: "Check: bigger side ↔ bigger side, then set up ratio accordingly." },
      ],
      microDrills: [
        { id: "S4-M1", prompt: "If AB/DE = 3/5 and AB = 6, find DE.", expectedAnswerHints: ["DE = 10"] },
        { id: "S4-M2", prompt: "Set up the ratio equation to find x using corresponding sides.", expectedAnswerHints: ["write x in a ratio", "cross-multiply"] },
      ],
      exampleQuestionIds: [],
    },

    B1: {
      nodeId: "B1",
      highwayId: "BPT",
      title: "Set up BPT: identify proportional segments correctly",
      examWeight: 5,
      difficulty: "EASY",
      prereqNodeIds: ["S1"],
      questionTypes: ["PROOF", "NUMERICAL"],
      rubric: {
        totalMarksTypical: 2,
        checkpoints: [
          { id: "B1-C1", label: "States the parallel condition correctly (e.g., DE ∥ BC)", marks: 1, commonFailTags: ["MISSING_GIVEN_TP"] },
          { id: "B1-C2", label: "Identifies correct segments involved in BPT ratios (e.g., AD/DB and AE/EC)", marks: 1, commonFailTags: ["CORRESPONDENCE_WRONG"] },
        ],
      },
      solutionSkeleton: [
        { id: "B1-SS1", heading: "Write the given parallel line condition", expectedForm: "STATEMENT_REASON" },
        { id: "B1-SS2", heading: "Name the sides cut and the segments formed", expectedForm: "STATEMENT_REASON" },
        { id: "B1-SS3", heading: "Decide: apply BPT or Converse BPT", expectedForm: "STATEMENT_REASON" },
      ],
      commonMistakes: [
        { tag: "MISSING_GIVEN_TP", studentFriendly: "You applied BPT without writing the parallel line condition.", examinerNote: "Without parallel condition, BPT is not justified.", fixTip: "Write: ‘Since DE ∥ BC in ΔABC…’ before the ratio." },
        { tag: "CORRESPONDENCE_WRONG", studentFriendly: "You chose the wrong segments for the ratio.", examinerNote: "BPT relates the two segments on each side cut by the parallel line.", fixTip: "Use AD/DB = AE/EC (or equivalent), not AD/AE." },
      ],
      microDrills: [
        { id: "B1-M1", prompt: "If DE ∥ BC in ΔABC, which ratios are equal by BPT?", expectedAnswerHints: ["AD/DB = AE/EC"] },
        { id: "B1-M2", prompt: "Which segments are formed on AB and AC when DE ∥ BC?", expectedAnswerHints: ["AD, DB", "AE, EC"] },
      ],
      exampleQuestionIds: [],
    },

    B2: {
      nodeId: "B2",
      highwayId: "BPT",
      title: "Apply BPT to derive a ratio / prove a relation (direct application)",
      examWeight: 5,
      difficulty: "MEDIUM",
      prereqNodeIds: ["B1"],
      questionTypes: ["PROOF", "NUMERICAL"],
      rubric: {
        totalMarksTypical: 3,
        checkpoints: [
          { id: "B2-C1", label: "Writes the correct BPT equation (with parallel condition implied/stated)", marks: 1, commonFailTags: ["RATIO_ORDER_WRONG", "MISSING_GIVEN_TP"] },
          { id: "B2-C2", label: "Correct substitution/manipulation", marks: 1, commonFailTags: ["ARITHMETIC_ERROR"] },
          { id: "B2-C3", label: "Clear conclusion statement", marks: 1, commonFailTags: ["SKIPPED_CONCLUSION"] },
        ],
      },
      solutionSkeleton: [
        { id: "B2-SS1", heading: "Write BPT ratio", expectedForm: "FORMULA_SUBSTITUTE" },
        { id: "B2-SS2", heading: "Substitute values / rearrange", expectedForm: "CALCULATION" },
        { id: "B2-SS3", heading: "Conclude the required ratio/value", expectedForm: "CONCLUSION" },
      ],
      commonMistakes: [
        { tag: "RATIO_ORDER_WRONG", studentFriendly: "Your ratio order is inconsistent (flipped).", examinerNote: "Wrong direction breaks the relation.", fixTip: "Keep the same order on both sides: AD/DB = AE/EC." },
        { tag: "UNJUSTIFIED_STEP", studentFriendly: "You used BPT but didn’t justify the parallel line condition.", examinerNote: "Justification line is required for marks.", fixTip: "Write the parallel condition explicitly before applying BPT." },
      ],
      microDrills: [
        { id: "B2-M1", prompt: "Given AD=2, DB=3, find AE:EC (using BPT).", expectedAnswerHints: ["2:3"] },
        { id: "B2-M2", prompt: "Write the BPT equation for ΔABC with DE ∥ BC.", expectedAnswerHints: ["AD/DB = AE/EC"] },
      ],
      exampleQuestionIds: [],
    },

    B3: {
      nodeId: "B3",
      highwayId: "BPT",
      title: "Converse of BPT: prove lines are parallel using segment ratio",
      examWeight: 4,
      difficulty: "MEDIUM",
      prereqNodeIds: ["B2"],
      questionTypes: ["PROOF"],
      rubric: {
        totalMarksTypical: 3,
        checkpoints: [
          { id: "B3-C1", label: "Correctly states the given segment ratio equality", marks: 1, commonFailTags: ["RATIO_ORDER_WRONG"] },
          { id: "B3-C2", label: "Mentions Converse of BPT explicitly", marks: 1, commonFailTags: ["REASON_MISSING"] },
          { id: "B3-C3", label: "Concludes parallelism (e.g., DE ∥ BC)", marks: 1, commonFailTags: ["SKIPPED_CONCLUSION"] },
        ],
      },
      solutionSkeleton: [
        { id: "B3-SS1", heading: "Write ratio equality", expectedForm: "FORMULA_SUBSTITUTE" },
        { id: "B3-SS2", heading: "State: By Converse of BPT", expectedForm: "STATEMENT_REASON" },
        { id: "B3-SS3", heading: "Conclude the lines are parallel", expectedForm: "CONCLUSION" },
      ],
      commonMistakes: [
        { tag: "WRONG_CRITERION", studentFriendly: "You used similarity when Converse BPT was required.", examinerNote: "Converse BPT directly gives parallelism.", fixTip: "Write: ‘By Converse of BPT, DE ∥ BC.’" },
        { tag: "REASON_MISSING", studentFriendly: "You concluded parallelism without naming the theorem.", examinerNote: "Missing theorem name often costs marks.", fixTip: "Include: ‘By Converse of BPT…’ in the proof." },
      ],
      microDrills: [
        { id: "B3-M1", prompt: "If AD/DB = AE/EC, what can you conclude?", expectedAnswerHints: ["DE ∥ BC", "Converse of BPT"] },
        { id: "B3-M2", prompt: "Write the exact final line to prove parallelism.", expectedAnswerHints: ["Therefore DE ∥ BC."] },
      ],
      exampleQuestionIds: [],
    },

    A1: {
      nodeId: "A1",
      highwayId: "AREAS_SIMILAR",
      title: "Area ratio of similar triangles: ar ratio = (side ratio)^2",
      examWeight: 4,
      difficulty: "MEDIUM",
      prereqNodeIds: ["S2"],
      questionTypes: ["PROOF", "NUMERICAL"],
      rubric: {
        totalMarksTypical: 4,
        checkpoints: [
          { id: "A1-C1", label: "Establishes similarity before using area theorem", marks: 1, commonFailTags: ["UNJUSTIFIED_STEP"] },
          { id: "A1-C2", label: "Writes correct theorem: ar ratio = (corresponding side ratio)^2", marks: 1, commonFailTags: ["RATIO_ORDER_WRONG"] },
          { id: "A1-C3", label: "Correct substitution/manipulation", marks: 1, commonFailTags: ["ARITHMETIC_ERROR"] },
          { id: "A1-C4", label: "Correct conclusion", marks: 1, commonFailTags: ["SKIPPED_CONCLUSION"] },
        ],
      },
      solutionSkeleton: [
        { id: "A1-SS1", heading: "State triangles are similar (criterion)", expectedForm: "STATEMENT_REASON" },
        { id: "A1-SS2", heading: "Write area ratio theorem for similar triangles", expectedForm: "FORMULA_SUBSTITUTE" },
        { id: "A1-SS3", heading: "Substitute and simplify", expectedForm: "CALCULATION" },
        { id: "A1-SS4", heading: "Final conclusion", expectedForm: "CONCLUSION" },
      ],
      commonMistakes: [
        { tag: "UNJUSTIFIED_STEP", studentFriendly: "You used the area ratio theorem without proving similarity first.", examinerNote: "Similarity is required for this theorem.", fixTip: "First prove Δ… ~ Δ…, then apply ar ratio = (side ratio)^2." },
        { tag: "RATIO_ORDER_WRONG", studentFriendly: "You squared the wrong ratio or used inverse.", examinerNote: "Wrong ratio direction changes the result.", fixTip: "Write the side ratio clearly first, then square it." },
      ],
      microDrills: [
        { id: "A1-M1", prompt: "If AB/DE = 2/3, what is ar(ΔABC)/ar(ΔDEF)?", expectedAnswerHints: ["4/9"] },
        { id: "A1-M2", prompt: "Given area ratio 9/16, what is side ratio?", expectedAnswerHints: ["3/4"] },
      ],
      exampleQuestionIds: [],
    },

    A2: {
      nodeId: "A2",
      highwayId: "AREAS_SIMILAR",
      title: "Convert area ratio ↔ side ratio (take square root carefully)",
      examWeight: 4,
      difficulty: "HARD",
      prereqNodeIds: ["A1"],
      questionTypes: ["NUMERICAL", "PROOF"],
      rubric: {
        totalMarksTypical: 4,
        checkpoints: [
          { id: "A2-C1", label: "Starts from correct area ratio relation", marks: 1 },
          { id: "A2-C2", label: "Takes square root correctly to get side ratio", marks: 1, commonFailTags: ["ARITHMETIC_ERROR"] },
          { id: "A2-C3", label: "Sets up correct side ratio equation for the unknown", marks: 1, commonFailTags: ["RATIO_ORDER_WRONG"] },
          { id: "A2-C4", label: "Final answer and conclusion", marks: 1, commonFailTags: ["SKIPPED_CONCLUSION"] },
        ],
      },
      solutionSkeleton: [
        { id: "A2-SS1", heading: "Write area ratio equation", expectedForm: "FORMULA_SUBSTITUTE" },
        { id: "A2-SS2", heading: "Take square root to get side ratio", expectedForm: "CALCULATION" },
        { id: "A2-SS3", heading: "Use side ratio to solve required part", expectedForm: "CALCULATION" },
        { id: "A2-SS4", heading: "Final conclusion", expectedForm: "CONCLUSION" },
      ],
      commonMistakes: [
        { tag: "ARITHMETIC_ERROR", studentFriendly: "Square root step is wrong (common error).", examinerNote: "This step often decides the final answer.", fixTip: "√(a/b) = √a / √b. Example: √(9/16) = 3/4." },
        { tag: "RATIO_ORDER_WRONG", studentFriendly: "You used inverse ratio after taking square root.", examinerNote: "Direction mismatch leads to wrong unknown value.", fixTip: "Check which triangle is numerator before taking √ and keep direction consistent." },
      ],
      microDrills: [
        { id: "A2-M1", prompt: "Area ratio 25/49 → side ratio?", expectedAnswerHints: ["5/7"] },
        { id: "A2-M2", prompt: "If ar ratio is 1:4, what is side ratio?", expectedAnswerHints: ["1:2"] },
      ],
      exampleQuestionIds: [],
    },

    P1: {
      nodeId: "P1",
      highwayId: "PRESENTATION_MARKING",
      title: "Proof writing format: Given / To Prove / Steps with reasons / Conclusion",
      examWeight: 5,
      difficulty: "EASY",
      prereqNodeIds: [],
      questionTypes: ["PROOF"],
      rubric: {
        totalMarksTypical: 2,
        checkpoints: [
          { id: "P1-C1", label: "Uses proper structure (Given, To Prove, Proof, Conclusion)", marks: 1, commonFailTags: ["BAD_PRESENTATION"] },
          { id: "P1-C2", label: "Writes reasons for key steps (no reasonless jumps)", marks: 1, commonFailTags: ["REASON_MISSING"] },
        ],
      },
      solutionSkeleton: [
        { id: "P1-SS1", heading: "Write GIVEN", expectedForm: "STATEMENT_REASON" },
        { id: "P1-SS2", heading: "Write TO PROVE", expectedForm: "STATEMENT_REASON" },
        { id: "P1-SS3", heading: "Write PROOF steps with reasons", expectedForm: "STATEMENT_REASON" },
        { id: "P1-SS4", heading: "Write CONCLUSION line", expectedForm: "CONCLUSION" },
      ],
      commonMistakes: [
        { tag: "BAD_PRESENTATION", studentFriendly: "Your solution has no clear structure.", examinerNote: "Poor structure makes it hard to award marks.", fixTip: "Write headings: GIVEN, TO PROVE, PROOF, CONCLUSION." },
        { tag: "REASON_MISSING", studentFriendly: "You wrote steps without reasons.", examinerNote: "Reasons are required in proofs to secure marks.", fixTip: "Add reasons like ‘given’, ‘alternate interior angles’, ‘common angle’, ‘BPT’, ‘AAA’." },
      ],
      microDrills: [
        { id: "P1-M1", prompt: "Rewrite this with a reason: ∠A = ∠D.", expectedAnswerHints: ["given", "alternate interior angles", "common angle"] },
        { id: "P1-M2", prompt: "Write a correct TO PROVE line for: prove DE ∥ BC.", expectedAnswerHints: ["To prove: DE ∥ BC"] },
      ],
      exampleQuestionIds: [],
    },

    P2: {
      nodeId: "P2",
      highwayId: "PRESENTATION_MARKING",
      title: "Marks hygiene: theorem naming + final conclusion line (free marks)",
      examWeight: 5,
      difficulty: "MEDIUM",
      prereqNodeIds: ["P1"],
      questionTypes: ["PROOF", "ASSERTION_REASON"],
      rubric: {
        totalMarksTypical: 2,
        checkpoints: [
          { id: "P2-C1", label: "Names theorem/criterion explicitly (AAA/SAS/SSS/BPT/Converse BPT)", marks: 1, commonFailTags: ["WRONG_CRITERION"] },
          { id: "P2-C2", label: "Writes the final conclusion statement explicitly (Hence proved / Therefore ...)", marks: 1, commonFailTags: ["SKIPPED_CONCLUSION"] },
        ],
      },
      solutionSkeleton: [
        { id: "P2-SS1", heading: "Name theorem/criterion used", expectedForm: "STATEMENT_REASON" },
        { id: "P2-SS2", heading: "Link to result using theorem line", expectedForm: "STATEMENT_REASON" },
        { id: "P2-SS3", heading: "Write final conclusion line exactly as asked", expectedForm: "CONCLUSION" },
      ],
      commonMistakes: [
        { tag: "SKIPPED_CONCLUSION", studentFriendly: "You did the work but forgot the final line.", examinerNote: "Examiners award marks for the explicit final statement.", fixTip: "Always end with: ‘Therefore …’ / ‘Hence proved.’" },
        { tag: "WRONG_CRITERION", studentFriendly: "You named the wrong criterion/theorem.", examinerNote: "Wrong naming can reduce marks even if idea is correct.", fixTip: "AAA needs 2 angles; SAS needs 2 side ratios + included angle; SSS needs 3 side ratios; BPT needs parallel line." },
      ],
      microDrills: [
        { id: "P2-M1", prompt: "Two angles equal → which similarity criterion?", expectedAnswerHints: ["AAA"] },
        { id: "P2-M2", prompt: "Write the final concluding line for proving parallelism.", expectedAnswerHints: ["Therefore DE ∥ BC."] },
      ],
      exampleQuestionIds: [],
    },
  },
};
