import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Science (086)
// Papers: Science-PQ.pdf + Science-PQMS.pdf
// topicKey: "how-do-organisms-reproduce"
// Extraction date: 2026-05-25

export const HOW_DO_ORGANISMS_REPRODUCE_APQ: CanonicalQuestion[] = [
  // Science-PQ Q10 (Section A, MCQ, 1 mark) — Reproductive Health restored 2026-27
  { id: "APQ-S-REPR-001", subject: "Science", topicKey: "how-do-organisms-reproduce", subtopic: "Family Planning", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Which of the following method/s are useful to prevent fertilisation even when ovulation occurs? P) surgical blocking of the fallopian tube; Q) copper-T; R) oral pills; S) condom",
    options: ["only P", "only Q and R", "only P, Q and S", "only Q, R and S"],
    answer: "only P, Q and S",
    solutionSteps: ["P (tubectomy): blocks sperm/egg meeting in fallopian tube → prevents fertilisation even if ovulation occurs ✓.", "Q (copper-T/IUCD): prevents implantation of fertilised egg; but it also creates local conditions hostile to sperm — prevents fertilisation ✓.", "R (oral pills): prevent ovulation in the first place — so this option doesn't apply when ovulation HAS occurred ✗.", "S (condom): blocks sperm from entering vagina → no sperm meets egg → no fertilisation ✓. Hence P, Q, S."],
    finalAnswer: "(c) only P, Q and S",
    ncertRef: "APQ Science-PQ Q10", isCompetencyBased: true },

  // Science-PQ Q22 (Section B, Short, 2 marks)
  { id: "APQ-S-REPR-002", subject: "Science", topicKey: "how-do-organisms-reproduce", subtopic: "Sexual Reproduction — Cross-Pollination", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Ravi cultivated mustard, a plant with bisexual flowers, on his farm. His plants were diseased due to a gene defect and therefore had reduced yield. Ravi removed the stamens from the diseased plants and also planted fresh disease-free mustard plants where he removed the pistils. How will Ravi's strategy help in improving the yield of mustard?",
    answer: "Forces cross-pollination — increases variation and disease-free offspring.",
    solutionSteps: ["By removing stamens from diseased plants and pistils from healthy plants, Ravi turned bisexual flowers into unisexual ones — preventing self-pollination.", "Pollen from disease-free plants (with stamens intact) must now pollinate the diseased plants' pistils. This cross-pollination introduces genetic variation, allowing disease-resistant alleles to enter the next generation — improving yield."],
    finalAnswer: "Forced cross-pollination introduces variation and disease-free traits → better yield.",
    ncertRef: "APQ Science-PQ Q22", isCompetencyBased: true },

  // Science-PQ Q35 first variant (Section D, Long, 5 marks)
  { id: "APQ-S-REPR-003", subject: "Science", topicKey: "how-do-organisms-reproduce", subtopic: "Asexual Reproduction + Functional Anatomy", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "(a) Certain specialised cells in animals called stem cells have the ability to divide and differentiate into different cell types. This helps in the replacement of a damaged organ. Name and explain two methods of asexual reproduction that are similar to stem cells and occur mostly in multicellular organisms. (b) Identify TWO pairs of reproductive organs in males and females that are functionally similar to each other. Justify.",
    answer: "(a) Regeneration and Budding. (b) Testes/Ovaries; Vas deferens/Fallopian tube.",
    solutionSteps: ["(a) Regeneration: cells in a fragment of an organism (e.g., Planaria, Hydra) divide and differentiate to rebuild missing body parts — similar to stem cell action.", "Budding: a small outgrowth (bud) develops on the parent (e.g., Hydra). The bud's cells differentiate into all needed tissues, then detaches as a new individual — also stem-cell-like.", "(b) Testes (male) and Ovaries (female): both produce gametes (sperm/egg) and reproductive hormones (testosterone/oestrogen).", "Vas deferens (male) and Fallopian tube (female): both transport gametes to the site of fertilisation."],
    finalAnswer: "(a) Regeneration + Budding; (b) Testes/Ovaries (gamete + hormone production); Vas deferens/Fallopian tube (gamete transport).",
    ncertRef: "APQ Science-PQ Q35 (first variant)", isCompetencyBased: true },
];
