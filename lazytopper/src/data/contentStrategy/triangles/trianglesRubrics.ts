import type { CbseFormat } from "../types";

type TrianglesRubricMeta = {
  cbseFormat?: CbseFormat;
  skillFamily?: string;
  loIds: string[];
};

export type TrianglesRubric = {
  checklist: string[];
  commonDeductions: string[];
  examinerTips: string[];
};

const PROOF_SHORT: TrianglesRubric = {
  checklist: [
    "Name the compared triangles first.",
    "State the criterion or theorem with reason.",
    "Keep the vertex order consistent in ratios.",
    "Write the final conclusion line clearly.",
  ],
  commonDeductions: [
    "Criterion name missing.",
    "Wrong triangle order in the similarity statement.",
    "No final Hence/Therefore line.",
  ],
  examinerTips: [
    "Write one statement-reason step per line.",
    "Underline the target relation in the last line.",
  ],
};

const PROOF_LONG: TrianglesRubric = {
  checklist: [
    "Write the figure trigger first (parallel line, equal angle, side ratio).",
    "Name the compared triangles in correct order.",
    "State the criterion/theorem with reason.",
    "Use CPST or BPT only after the similarity step is established.",
    "Show one justified relation per line.",
    "Close with the exact target statement.",
  ],
  commonDeductions: [
    "Parallel/equal-angle trigger not stated.",
    "Criterion and conclusion written as one jump.",
    "CPST/BPT used before proving similarity.",
    "Conclusion line too vague for board marking.",
  ],
  examinerTips: [
    "Use Delta notation consistently throughout the proof.",
    "Leave a clear line before the final conclusion.",
    "If ratios are squared for area, show that line separately.",
  ],
};

const BPT_SHORT: TrianglesRubric = {
  checklist: [
    "State the parallel line first.",
    "Write the correct BPT or converse-BPT relation.",
    "Substitute values carefully.",
    "Write the segment answer with units if given.",
  ],
  commonDeductions: [
    "BPT used without a parallel-line condition.",
    "Segments taken in the wrong order.",
    "Answer written without the theorem line.",
  ],
  examinerTips: [
    "Mark the parallel segment on the figure mentally before solving.",
    "Keep segment names on the same side of the ratio as in the theorem.",
  ],
};

const AREA_SHORT: TrianglesRubric = {
  checklist: [
    "Prove or state similarity first.",
    "Write the corresponding side ratio.",
    "Square the ratio for areas.",
    "State the final area ratio clearly.",
  ],
  commonDeductions: [
    "Area ratio written without squaring.",
    "Similarity not stated before area step.",
    "Wrong corresponding sides chosen.",
  ],
  examinerTips: [
    "Write side ratio and area ratio in separate lines.",
    "If a numeric area is asked, substitute only after the squared ratio is shown.",
  ],
};

const GENERIC_LONG: TrianglesRubric = {
  checklist: [
    "Write the figure setup or theorem trigger first.",
    "Show the core relation used.",
    "Substitute values in a separate line.",
    "Simplify without skipping key steps.",
    "Write the final answer or conclusion clearly.",
  ],
  commonDeductions: [
    "Missing setup line before calculation.",
    "Key ratio written without justification.",
    "No closing answer statement.",
  ],
  examinerTips: [
    "Keep reasoning compact but visible for partial credit.",
    "If you use similarity, name the criterion explicitly.",
  ],
};

export function getTrianglesRubric(meta: TrianglesRubricMeta): TrianglesRubric {
  const format = String(meta.cbseFormat || "").trim().toUpperCase() as CbseFormat | "";
  const skillFamily = String(meta.skillFamily || "").trim().toLowerCase();
  const loSet = new Set((meta.loIds || []).map((loId) => String(loId || "").trim()));
  const isLongForm = format === "D" || format === "E";
  const isProof =
    skillFamily === "proof" ||
    skillFamily === "board check" ||
    loSet.has("LO_TRI_04_PROOF_FLOW") ||
    loSet.has("LO_TRI_06_BOARD_AUDIT");
  const isBpt = skillFamily === "bpt" || loSet.has("LO_TRI_03_BPT_PARALLEL_FLOW");
  const isArea = skillFamily === "area ratio" || loSet.has("LO_TRI_05_AREA_RATIO");

  if (isProof) return isLongForm ? PROOF_LONG : PROOF_SHORT;
  if (isBpt) return BPT_SHORT;
  if (isArea) return AREA_SHORT;
  return isLongForm ? GENERIC_LONG : PROOF_SHORT;
}
