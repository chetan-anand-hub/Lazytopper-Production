import { TRIG_PACK1_QUESTIONS } from "../../questionBanks/class10/maths/trigonometry.pack1";
import type { QuestionMeta } from "../types";

const legacyTrigonometryQuestionTagIndex: Record<string, QuestionMeta> = {
  "2026-TRIG-APP-01": {
    questionId: "2026-TRIG-APP-01",
    cbseFormat: "C",
    skillFamily: "Application",
    loIds: ["LO_TRIG_07_HEIGHTS_DISTANCES_SINGLE", "LO_TRIG_08_HEIGHTS_DISTANCES_TWOANGLES"],
    mistakeTags: ["diagram-missing", "wrong-equation-setup"],
    scopeGuard: ["class10", "maths", "applications-of-trigonometry"],
    msAlignment: "partial-credit",
    reviewTags: ["heights-distances", "application"],
  },
  "2026-TRIG-APP-CASE-08": {
    questionId: "2026-TRIG-APP-CASE-08",
    cbseFormat: "E",
    skillFamily: "Case Study",
    loIds: ["LO_TRIG_09_CASE_STUDY_PROTOCOL", "LO_TRIG_08_HEIGHTS_DISTANCES_TWOANGLES"],
    mistakeTags: ["case-data-miss", "unit-error"],
    scopeGuard: ["class10", "maths", "trigonometry"],
    msAlignment: "template",
    reviewTags: ["case-study", "application"],
  },
  "2026-TRIG-SA-01": {
    questionId: "2026-TRIG-SA-01",
    cbseFormat: "B",
    skillFamily: "Definition",
    loIds: ["LO_TRIG_01_RATIOS_SETUP", "LO_TRIG_02_STANDARD_VALUES"],
    mistakeTags: ["side-mapping-error", "ratio-swap"],
    scopeGuard: ["class10", "maths", "trigonometry"],
    msAlignment: "template",
    reviewTags: ["ratios", "definitions"],
  },
  "2026-TRIG-MCQ-03": {
    questionId: "2026-TRIG-MCQ-03",
    cbseFormat: "A",
    skillFamily: "Formula Recall",
    loIds: ["LO_TRIG_02_STANDARD_VALUES", "LO_TRIG_01_RATIOS_SETUP"],
    mistakeTags: ["standard-value-mixup"],
    scopeGuard: ["class10", "maths", "trigonometry"],
    msAlignment: "final-only",
    reviewTags: ["standard-values", "mcq"],
  },
  "2026-TRIG-SA-04": {
    questionId: "2026-TRIG-SA-04",
    cbseFormat: "C",
    skillFamily: "Algebraic Transformation",
    loIds: ["LO_TRIG_03_IDENTITY_PYTHAG", "LO_TRIG_04_TRANSFORM_SIMPLIFY"],
    mistakeTags: ["identity-sign-error", "reciprocal-error"],
    scopeGuard: ["class10", "maths", "trigonometry"],
    msAlignment: "partial-credit",
    reviewTags: ["identity-simplify"],
  },
  "2026-TRIG-LA-05": {
    questionId: "2026-TRIG-LA-05",
    cbseFormat: "D",
    skillFamily: "Proof",
    loIds: ["LO_TRIG_06_PROOF_PATTERNS", "LO_TRIG_10_ERROR_CHECK_REVIEW"],
    mistakeTags: ["no-lhs-flow", "missing-hence-proved"],
    scopeGuard: ["class10", "maths", "trigonometry"],
    msAlignment: "template",
    reviewTags: ["proof", "board-writing"],
  },
  "2026-TRIG-APP-MCQ-06": {
    questionId: "2026-TRIG-APP-MCQ-06",
    cbseFormat: "A",
    skillFamily: "Application",
    loIds: ["LO_TRIG_07_HEIGHTS_DISTANCES_SINGLE", "LO_TRIG_09_CASE_STUDY_PROTOCOL"],
    mistakeTags: ["wrong-angle-selection", "context-read-miss"],
    scopeGuard: ["class10", "maths", "trigonometry", "applications-of-trigonometry"],
    msAlignment: "partial-credit",
    reviewTags: ["heights-distances", "case-study"],
  },
  "2026-TRIG-APP-SA-07": {
    questionId: "2026-TRIG-APP-SA-07",
    cbseFormat: "C",
    skillFamily: "Application",
    loIds: ["LO_TRIG_07_HEIGHTS_DISTANCES_SINGLE", "LO_TRIG_04_TRANSFORM_SIMPLIFY"],
    mistakeTags: ["ratio-selection-error", "algebra-slip"],
    scopeGuard: ["class10", "maths", "trigonometry"],
    msAlignment: "partial-credit",
    reviewTags: ["application", "short-answer"],
  },
  "2026-TRIG-AR-06": {
    questionId: "2026-TRIG-AR-06",
    cbseFormat: "A",
    skillFamily: "Assertion-Reason",
    loIds: ["LO_TRIG_01_RATIOS_SETUP", "LO_TRIG_03_IDENTITY_PYTHAG"],
    mistakeTags: ["reason-without-identity", "statement-mismatch"],
    scopeGuard: ["class10", "maths", "trigonometry"],
    msAlignment: "final-only",
    reviewTags: ["assertion-reason"],
  },
  "2026-TRIG-AR-13": {
    questionId: "2026-TRIG-AR-13",
    cbseFormat: "A",
    skillFamily: "Assertion-Reason",
    loIds: ["LO_TRIG_02_STANDARD_VALUES", "LO_TRIG_03_IDENTITY_PYTHAG"],
    mistakeTags: ["value-recall-error", "identity-link-miss"],
    scopeGuard: ["class10", "maths", "trigonometry"],
    msAlignment: "final-only",
    reviewTags: ["assertion-reason", "standard-values"],
  },
  "2026-TRIG-CASE-14": {
    questionId: "2026-TRIG-CASE-14",
    cbseFormat: "E",
    skillFamily: "Case Study",
    loIds: ["LO_TRIG_09_CASE_STUDY_PROTOCOL", "LO_TRIG_10_ERROR_CHECK_REVIEW"],
    mistakeTags: ["case-logic-miss", "final-statement-missing"],
    scopeGuard: ["class10", "maths", "trigonometry"],
    msAlignment: "template",
    reviewTags: ["case-study", "board-writing"],
  },
  "2026-TRIG-LA-02": {
    questionId: "2026-TRIG-LA-02",
    cbseFormat: "D",
    skillFamily: "Proof",
    loIds: ["LO_TRIG_06_PROOF_PATTERNS", "LO_TRIG_04_TRANSFORM_SIMPLIFY"],
    mistakeTags: ["multi-side-proofing", "skipped-conclusion"],
    scopeGuard: ["class10", "maths", "trigonometry"],
    msAlignment: "template",
    reviewTags: ["proof"],
  },
  "2026-TRIG-LA-13": {
    questionId: "2026-TRIG-LA-13",
    cbseFormat: "D",
    skillFamily: "Mixed Long Answer",
    loIds: ["LO_TRIG_06_PROOF_PATTERNS", "LO_TRIG_07_HEIGHTS_DISTANCES_SINGLE"],
    mistakeTags: ["model-selection-error", "no-final-box"],
    scopeGuard: ["class10", "maths", "trigonometry"],
    msAlignment: "partial-credit",
    reviewTags: ["long-answer", "mixed"],
  },
  "2026-TRIG-MCQ-09": {
    questionId: "2026-TRIG-MCQ-09",
    cbseFormat: "A",
    skillFamily: "Formula Recall",
    loIds: ["LO_TRIG_01_RATIOS_SETUP", "LO_TRIG_05_SOLVE_EQUATIONS_STANDARD"],
    mistakeTags: ["ratio-choice-error", "equation-root-miss"],
    scopeGuard: ["class10", "maths", "trigonometry"],
    msAlignment: "final-only",
    reviewTags: ["mcq", "formula"],
  },
  "2026-TRIG-MCQ-10": {
    questionId: "2026-TRIG-MCQ-10",
    cbseFormat: "A",
    skillFamily: "Formula Recall",
    loIds: ["LO_TRIG_02_STANDARD_VALUES", "LO_TRIG_05_SOLVE_EQUATIONS_STANDARD"],
    mistakeTags: ["standard-value-error", "domain-miss"],
    scopeGuard: ["class10", "maths", "trigonometry"],
    msAlignment: "final-only",
    reviewTags: ["mcq", "equation"],
  },
  "2026-TRIG-SA-11": {
    questionId: "2026-TRIG-SA-11",
    cbseFormat: "B",
    skillFamily: "Identity Simplify",
    loIds: ["LO_TRIG_03_IDENTITY_PYTHAG", "LO_TRIG_05_SOLVE_EQUATIONS_STANDARD"],
    mistakeTags: ["identity-substitution-error", "solution-drop"],
    scopeGuard: ["class10", "maths", "trigonometry"],
    msAlignment: "partial-credit",
    reviewTags: ["short-answer", "identity"],
  },
  "2026-TRIG-SA-12": {
    questionId: "2026-TRIG-SA-12",
    cbseFormat: "C",
    skillFamily: "Transformation",
    loIds: ["LO_TRIG_04_TRANSFORM_SIMPLIFY", "LO_TRIG_06_PROOF_PATTERNS"],
    mistakeTags: ["algebra-order-miss", "final-line-missing"],
    scopeGuard: ["class10", "maths", "trigonometry"],
    msAlignment: "partial-credit",
    reviewTags: ["short-answer", "simplify"],
  },
};

function derivePackMistakeTags(skillFamily: string): string[] | undefined {
  switch (skillFamily) {
    case "Definition_Ratios":
      return ["side-mapping-error", "ratio-swap"];
    case "Standard_Values":
      return ["standard-value-mixup", "sign-swap"];
    case "Identity_Simplify":
      return ["identity-sign-error", "algebra-slip"];
    case "Equation_Solve":
      return ["wrong-standard-angle", "domain-miss"];
    case "Proof_Pattern":
      return ["two-side-proofing", "missing-conclusion"];
    case "Heights_Distances":
      return ["diagram-missing", "wrong-equation-setup"];
    case "Case_Study":
      return ["case-data-miss", "unit-error"];
    default:
      return undefined;
  }
}

function derivePackMsAlignment(cbseFormat: string): QuestionMeta["msAlignment"] {
  if (cbseFormat === "A") return "final-only";
  if (cbseFormat === "C") return "partial-credit";
  return "template";
}

function derivePackReviewTags(skillFamily: string, cbseFormat: string): string[] {
  return [
    String(skillFamily || "").toLowerCase(),
    `cbse-${String(cbseFormat || "").toLowerCase()}`,
    "pack1",
  ].filter(Boolean);
}

const derivedPackQuestionTagIndex: Record<string, QuestionMeta> = Object.fromEntries(
  TRIG_PACK1_QUESTIONS.map((question) => [
    question.questionId,
    {
      questionId: question.questionId,
      cbseFormat: question.cbseFormat,
      skillFamily: question.skillFamily,
      loIds: [...question.loIds],
      mistakeTags: derivePackMistakeTags(question.skillFamily),
      scopeGuard: ["class10", "maths", "trigonometry", "pack1"],
      msAlignment: derivePackMsAlignment(question.cbseFormat),
      reviewTags: derivePackReviewTags(question.skillFamily, question.cbseFormat),
    } satisfies QuestionMeta,
  ])
);

export const trigonometryQuestionTagIndex: Record<string, QuestionMeta> = {
  ...legacyTrigonometryQuestionTagIndex,
  ...derivedPackQuestionTagIndex,
};
