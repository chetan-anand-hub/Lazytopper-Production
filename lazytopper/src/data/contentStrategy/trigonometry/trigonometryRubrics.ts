import type { CbseFormat } from "../types";

type TrigRubricMeta = {
  cbseFormat?: CbseFormat;
  skillFamily?: string;
  loIds: string[];
};

export type TrigRubric = {
  checklist: string[];
  commonDeductions: string[];
  examinerTips: string[];
};

const PROOF_SHORT: TrigRubric = {
  checklist: [
    "Start from one side only (usually LHS).",
    "Write identity used at each transformation.",
    "Keep one algebra step per line.",
    "Match RHS and end with 'Hence proved'.",
  ],
  commonDeductions: [
    "Working both sides together.",
    "Skipping identity mention.",
    "No final conclusion line.",
  ],
  examinerTips: [
    "Leave clear line breaks between transformations.",
    "Underline the final equality statement.",
  ],
};

const PROOF_LONG: TrigRubric = {
  checklist: [
    "Write target statement and start from LHS only.",
    "Apply identities in a labeled sequence.",
    "Show denominator/domain-safe steps clearly.",
    "Simplify systematically without jumps.",
    "Reach RHS exactly as stated.",
    "Close with 'Hence proved'.",
  ],
  commonDeductions: [
    "Identity chain not justified.",
    "Algebra jumps without intermediate steps.",
    "Incorrect sign while transposing.",
    "Missing final proof statement.",
  ],
  examinerTips: [
    "Write identity names in brackets for partial-credit safety.",
    "Avoid cancelling terms across addition/subtraction lines.",
    "Keep the final line boxed only if asked.",
  ],
};

const HEIGHTS_SHORT: TrigRubric = {
  checklist: [
    "Draw and label the diagram first.",
    "Define angle(s) of elevation/depression correctly.",
    "Write the correct trig ratio equation.",
    "Substitute values and solve with units.",
  ],
  commonDeductions: [
    "Wrong angle reference in the diagram.",
    "Using incorrect ratio (sin/cos/tan mix-up).",
    "Final answer without unit.",
  ],
  examinerTips: [
    "Mark known and unknown quantities on the figure.",
    "Write one clean final statement with units.",
  ],
};

const HEIGHTS_LONG: TrigRubric = {
  checklist: [
    "Draw a neat labeled diagram with all given data.",
    "Define variables before equation setup.",
    "Form trig equation(s) from the correct angle reference.",
    "For two-angle cases, write both equations separately.",
    "Solve algebra stepwise with substitutions shown.",
    "Report final value with correct unit/context.",
  ],
  commonDeductions: [
    "Diagram labels missing or inconsistent.",
    "Wrong angle-of-depression/elevation conversion.",
    "Skipping intermediate algebra line.",
    "Unit/context omitted in final line.",
  ],
  examinerTips: [
    "Use (i), (ii) labels for multi-step solving.",
    "Keep variable definitions in the first two lines.",
    "Box the final answer only after unit check.",
  ],
};

const GENERIC_SHORT: TrigRubric = {
  checklist: [
    "Write the given relation/data clearly.",
    "Apply the correct identity/ratio.",
    "Show substitution and simplification steps.",
    "Write final answer in the required form.",
  ],
  commonDeductions: [
    "Direct answer with no working.",
    "Identity/ratio used incorrectly.",
    "Arithmetic/sign slip in simplification.",
  ],
  examinerTips: [
    "Keep one operation per line for partial credit.",
    "Mention final value clearly (with unit if needed).",
  ],
};

const GENERIC_LONG: TrigRubric = {
  checklist: [
    "Start with 'Given' and required quantity.",
    "Write the formula/identity before substitution.",
    "Substitute values in a separate line.",
    "Simplify in logically separated steps.",
    "Show intermediate result checks (sign/domain).",
    "Write and box final answer with context.",
  ],
  commonDeductions: [
    "Missing formula line before substitution.",
    "Skipping intermediate simplification steps.",
    "Domain/sign ignored in final expression.",
    "No concluding final-answer statement.",
  ],
  examinerTips: [
    "Keep equations aligned vertically for readability.",
    "Use short reason tags (identity, reciprocal, etc.) where helpful.",
    "In case-study parts, answer each subpart separately.",
  ],
};

export function getTrigRubric(meta: TrigRubricMeta): TrigRubric {
  const format = String(meta.cbseFormat || "").trim().toUpperCase() as CbseFormat | "";
  const skillFamily = String(meta.skillFamily || "").trim();
  const loSet = new Set((meta.loIds || []).map((loId) => String(loId || "").trim()));

  const isLongForm = format === "D" || format === "E";
  const isProof = skillFamily === "Proof_Pattern" || /proof/i.test(skillFamily);
  const isHeights =
    skillFamily === "Heights_Distances" ||
    /heights?_distances/i.test(skillFamily) ||
    loSet.has("LO_TRIG_07_HEIGHTS_DISTANCES_SINGLE") ||
    loSet.has("LO_TRIG_08_HEIGHTS_DISTANCES_TWOANGLES");

  if (isProof) return isLongForm ? PROOF_LONG : PROOF_SHORT;
  if (isHeights) return isLongForm ? HEIGHTS_LONG : HEIGHTS_SHORT;
  return isLongForm ? GENERIC_LONG : GENERIC_SHORT;
}
