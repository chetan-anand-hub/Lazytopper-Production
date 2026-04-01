import type { QuestionTypeTile } from "../types";

export const trigonometryQuestionTypeTiles: QuestionTypeTile[] = [
  {
    qtypeId: "TRIG_QTYPE_01_DEFINITIONS_RATIOS",
    title: "Definitions and Ratio Setup",
    cbseFormat: "A",
    skillFamily: "Definition",
    typicalMarks: [1, 2],
    loIds: ["LO_TRIG_01_RATIOS_SETUP"],
  },
  {
    qtypeId: "TRIG_QTYPE_02_STANDARD_VALUES",
    title: "Standard Values Recall and Use",
    cbseFormat: "B",
    skillFamily: "Formula Recall",
    typicalMarks: [1, 2],
    loIds: ["LO_TRIG_02_STANDARD_VALUES", "LO_TRIG_05_SOLVE_EQUATIONS_STANDARD"],
  },
  {
    qtypeId: "TRIG_QTYPE_03_IDENTITY_SIMPLIFY",
    title: "Identity Based Simplification",
    cbseFormat: "C",
    skillFamily: "Algebraic Transformation",
    typicalMarks: [2, 3],
    loIds: ["LO_TRIG_03_IDENTITY_PYTHAG", "LO_TRIG_04_TRANSFORM_SIMPLIFY"],
  },
  {
    qtypeId: "TRIG_QTYPE_04_PROOF",
    title: "Trig Proof Pattern",
    cbseFormat: "D",
    skillFamily: "Proof",
    typicalMarks: [3, 5],
    loIds: ["LO_TRIG_06_PROOF_PATTERNS", "LO_TRIG_10_ERROR_CHECK_REVIEW"],
  },
  {
    qtypeId: "TRIG_QTYPE_05_HEIGHTS_DISTANCES",
    title: "Heights and Distances",
    cbseFormat: "D",
    skillFamily: "Application",
    typicalMarks: [3, 4, 5],
    loIds: ["LO_TRIG_07_HEIGHTS_DISTANCES_SINGLE", "LO_TRIG_08_HEIGHTS_DISTANCES_TWOANGLES"],
  },
  {
    qtypeId: "TRIG_QTYPE_06_CASE_STUDY",
    title: "Case Study Trigonometry",
    cbseFormat: "E",
    skillFamily: "Case Study",
    typicalMarks: [4],
    loIds: ["LO_TRIG_09_CASE_STUDY_PROTOCOL", "LO_TRIG_10_ERROR_CHECK_REVIEW"],
  },
];
