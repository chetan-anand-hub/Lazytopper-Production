import type { LearningObject } from "../types";

export const trianglesLearningObjects: LearningObject[] = [
  {
    loId: "LO_TRI_01_READ_FIGURE_FIRST",
    title: "Read the figure before solving",
    description:
      "Spot the trigger first: parallel line, equal angles, corresponding sides, or a right-angle cue.",
    commonMistakes: ["Starting ratios before naming the trigger", "Comparing the wrong pair of triangles"],
    boardWritingTip: "Mark the trigger on the figure before writing the first theorem line.",
    masteryRule: { attempts: 3, accuracy: 0.8 },
  },
  {
    loId: "LO_TRI_02_SIMILARITY_CORRESPONDENCE",
    title: "Choose the correct similarity criterion",
    description:
      "Use AA, SAS, or SSS only after fixing the correct vertex order and correspondence.",
    prerequisites: ["LO_TRI_01_READ_FIGURE_FIRST"],
    commonMistakes: ["Wrong triangle order", "Using SAS with a non-included angle"],
    boardWritingTip: "Write the similarity statement in the same vertex order you will use for ratios.",
    masteryRule: { attempts: 4, accuracy: 0.75 },
  },
  {
    loId: "LO_TRI_03_BPT_PARALLEL_FLOW",
    title: "Use BPT and converse BPT cleanly",
    description:
      "Treat the parallel line as the non-negotiable trigger before writing proportional segments.",
    prerequisites: ["LO_TRI_01_READ_FIGURE_FIRST"],
    commonMistakes: ["Writing BPT without a parallel line", "Forgetting converse BPT proves parallelism"],
    boardWritingTip: "State the parallel condition first, then write the proportional relation on the next line.",
    masteryRule: { attempts: 4, accuracy: 0.75 },
  },
  {
    loId: "LO_TRI_04_PROOF_FLOW",
    title: "Write theorem-first board proofs",
    description:
      "Structure the answer as figure -> theorem/criterion -> justified relation -> conclusion.",
    prerequisites: ["LO_TRI_02_SIMILARITY_CORRESPONDENCE", "LO_TRI_03_BPT_PARALLEL_FLOW"],
    commonMistakes: ["Jumping straight to the answer", "Missing the final conclusion line"],
    boardWritingTip: "Use one reason-backed statement per line and end with the exact target relation.",
    masteryRule: { attempts: 4, accuracy: 0.72 },
  },
  {
    loId: "LO_TRI_05_AREA_RATIO",
    title: "Use area ratio only after similarity",
    description:
      "Move from corresponding side ratio to squared area ratio only after similarity is established.",
    prerequisites: ["LO_TRI_02_SIMILARITY_CORRESPONDENCE", "LO_TRI_04_PROOF_FLOW"],
    commonMistakes: ["Forgetting to square the side ratio", "Applying area ratio before proving similarity"],
    boardWritingTip: "Write the similarity step first and square the side ratio explicitly.",
    masteryRule: { attempts: 3, accuracy: 0.78 },
  },
  {
    loId: "LO_TRI_06_BOARD_AUDIT",
    title: "Check the proof like an examiner",
    description:
      "Audit theorem choice, triangle order, missing reasons, and final presentation before submission.",
    prerequisites: ["LO_TRI_04_PROOF_FLOW", "LO_TRI_05_AREA_RATIO"],
    commonMistakes: ["No theorem name", "No CPST/BPT reason", "Weak final statement"],
    boardWritingTip: "Before submission, re-read the first line, the theorem line, and the final conclusion line.",
    masteryRule: { attempts: 2, accuracy: 0.9 },
  },
];
