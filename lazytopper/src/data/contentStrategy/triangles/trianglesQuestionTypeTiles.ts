import type { QuestionTypeTile } from "../types";

export const trianglesQuestionTypeTiles: QuestionTypeTile[] = [
  {
    qtypeId: "TRI_QTYPE_01_THEOREM_CHOICE",
    title: "Which theorem fits first?",
    cbseFormat: "A",
    skillFamily: "Theorem Choice",
    typicalMarks: [1, 2],
    loIds: [
      "LO_TRI_01_READ_FIGURE_FIRST",
      "LO_TRI_02_SIMILARITY_CORRESPONDENCE",
      "LO_TRI_03_BPT_PARALLEL_FLOW",
    ],
  },
  {
    qtypeId: "TRI_QTYPE_02_SIMILARITY",
    title: "Similarity criteria and correspondence",
    cbseFormat: "B",
    skillFamily: "Similarity",
    typicalMarks: [2, 3],
    loIds: [
      "LO_TRI_01_READ_FIGURE_FIRST",
      "LO_TRI_02_SIMILARITY_CORRESPONDENCE",
      "LO_TRI_04_PROOF_FLOW",
    ],
  },
  {
    qtypeId: "TRI_QTYPE_03_BPT",
    title: "BPT and parallel-line ratios",
    cbseFormat: "C",
    skillFamily: "BPT",
    typicalMarks: [2, 3, 5],
    loIds: [
      "LO_TRI_01_READ_FIGURE_FIRST",
      "LO_TRI_03_BPT_PARALLEL_FLOW",
      "LO_TRI_04_PROOF_FLOW",
    ],
  },
  {
    qtypeId: "TRI_QTYPE_04_AREA_RATIO",
    title: "Area ratio after similarity",
    cbseFormat: "C",
    skillFamily: "Area Ratio",
    typicalMarks: [1, 3, 5],
    loIds: [
      "LO_TRI_02_SIMILARITY_CORRESPONDENCE",
      "LO_TRI_04_PROOF_FLOW",
      "LO_TRI_05_AREA_RATIO",
    ],
  },
  {
    qtypeId: "TRI_QTYPE_05_PROOF",
    title: "Proof writing and CPST",
    cbseFormat: "D",
    skillFamily: "Proof",
    typicalMarks: [3, 5],
    loIds: [
      "LO_TRI_02_SIMILARITY_CORRESPONDENCE",
      "LO_TRI_04_PROOF_FLOW",
      "LO_TRI_06_BOARD_AUDIT",
    ],
  },
  {
    qtypeId: "TRI_QTYPE_06_BOARD_CHECK",
    title: "Board-check my proof",
    cbseFormat: "E",
    skillFamily: "Board Check",
    typicalMarks: [4, 5],
    loIds: [
      "LO_TRI_04_PROOF_FLOW",
      "LO_TRI_05_AREA_RATIO",
      "LO_TRI_06_BOARD_AUDIT",
    ],
  },
];
