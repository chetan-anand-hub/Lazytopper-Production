import { TRIANGLES_PACK1_QUESTIONS } from "../../questionBanks/class10/maths/triangles.pack1";
import type { QuestionMeta } from "../types";

const legacyTrianglesQuestionTagIndex: Record<string, QuestionMeta> = {
  "2026-TRI-MCQ-03": {
    questionId: "2026-TRI-MCQ-03",
    cbseFormat: "A",
    skillFamily: "Area Ratio",
    loIds: ["LO_TRI_05_AREA_RATIO", "LO_TRI_02_SIMILARITY_CORRESPONDENCE"],
    mistakeTags: ["forgot-square", "side-area-mixup"],
    scopeGuard: ["class10", "maths", "triangles"],
    msAlignment: "final-only",
    reviewTags: ["area-ratio", "legacy"],
  },
  "2026-TRI-SA-04": {
    questionId: "2026-TRI-SA-04",
    cbseFormat: "C",
    skillFamily: "BPT",
    loIds: ["LO_TRI_03_BPT_PARALLEL_FLOW", "LO_TRI_04_PROOF_FLOW"],
    mistakeTags: ["midpoint-theorem-skip", "parallel-conclusion-miss"],
    scopeGuard: ["class10", "maths", "triangles"],
    msAlignment: "partial-credit",
    reviewTags: ["bpt", "midpoint"],
  },
  "2026-TRI-AR-03": {
    questionId: "2026-TRI-AR-03",
    cbseFormat: "B",
    skillFamily: "Similarity",
    loIds: ["LO_TRI_02_SIMILARITY_CORRESPONDENCE", "LO_TRI_01_READ_FIGURE_FIRST"],
    mistakeTags: ["aa-criterion-misread", "reason-mismatch"],
    scopeGuard: ["class10", "maths", "triangles"],
    msAlignment: "template",
    reviewTags: ["similarity", "assertion-reason"],
  },
  "2026-TRI-CASE-04": {
    questionId: "2026-TRI-CASE-04",
    cbseFormat: "E",
    skillFamily: "Board Check",
    loIds: ["LO_TRI_03_BPT_PARALLEL_FLOW", "LO_TRI_05_AREA_RATIO", "LO_TRI_06_BOARD_AUDIT"],
    mistakeTags: ["midpoint-line-miss", "area-ratio-before-similarity"],
    scopeGuard: ["class10", "maths", "triangles"],
    msAlignment: "template",
    reviewTags: ["case-study", "board-check"],
  },
  "2026-TRI-MCQ-05": {
    questionId: "2026-TRI-MCQ-05",
    cbseFormat: "A",
    skillFamily: "Similarity",
    loIds: ["LO_TRI_02_SIMILARITY_CORRESPONDENCE", "LO_TRI_01_READ_FIGURE_FIRST"],
    mistakeTags: ["wrong-correspondence"],
    scopeGuard: ["class10", "maths", "triangles"],
    msAlignment: "final-only",
    reviewTags: ["similarity", "mcq"],
  },
  "2026-TRI-SA-07": {
    questionId: "2026-TRI-SA-07",
    cbseFormat: "C",
    skillFamily: "BPT",
    loIds: ["LO_TRI_03_BPT_PARALLEL_FLOW", "LO_TRI_04_PROOF_FLOW"],
    mistakeTags: ["segment-substitution-slip", "parallel-line-skip"],
    scopeGuard: ["class10", "maths", "triangles"],
    msAlignment: "partial-credit",
    reviewTags: ["bpt", "short-answer"],
  },
  "2026-TRI-AR-09": {
    questionId: "2026-TRI-AR-09",
    cbseFormat: "A",
    skillFamily: "Similarity",
    loIds: ["LO_TRI_02_SIMILARITY_CORRESPONDENCE", "LO_TRI_01_READ_FIGURE_FIRST"],
    mistakeTags: ["sas-criterion-mixup"],
    scopeGuard: ["class10", "maths", "triangles"],
    msAlignment: "final-only",
    reviewTags: ["similarity", "assertion-reason"],
  },
};

function derivePackMistakeTags(skillFamily: string): string[] | undefined {
  switch (skillFamily) {
    case "Theorem Choice":
      return ["wrong-theorem-trigger", "first-line-panic"];
    case "Similarity":
      return ["wrong-correspondence", "criterion-mismatch"];
    case "BPT":
      return ["parallel-line-not-stated", "segment-order-error"];
    case "Area Ratio":
      return ["forgot-square", "similarity-not-stated"];
    case "Proof":
      return ["missing-theorem-line", "missing-conclusion"];
    case "Board Check":
      return ["marking-scheme-gap", "weak-final-statement"];
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
    String(skillFamily || "").toLowerCase().replace(/\s+/g, "-"),
    `cbse-${String(cbseFormat || "").toLowerCase()}`,
    "pack1",
  ].filter(Boolean);
}

const derivedPackQuestionTagIndex: Record<string, QuestionMeta> = Object.fromEntries(
  TRIANGLES_PACK1_QUESTIONS.map((question) => [
    question.questionId,
    {
      questionId: question.questionId,
      cbseFormat: question.cbseFormat,
      skillFamily: question.skillFamily,
      loIds: [...question.loIds],
      mistakeTags: derivePackMistakeTags(question.skillFamily),
      scopeGuard: ["class10", "maths", "triangles", "pack1"],
      msAlignment: derivePackMsAlignment(question.cbseFormat),
      reviewTags: derivePackReviewTags(question.skillFamily, question.cbseFormat),
    } satisfies QuestionMeta,
  ])
);

export const trianglesQuestionTagIndex: Record<string, QuestionMeta> = {
  ...legacyTrianglesQuestionTagIndex,
  ...derivedPackQuestionTagIndex,
};
