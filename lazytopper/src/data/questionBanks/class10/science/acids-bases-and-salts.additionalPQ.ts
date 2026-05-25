import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Science (086)
// Papers: Science-PQ.pdf + Science-PQMS.pdf
// topicKey: "acids-bases-and-salts"
// Extraction date: 2026-05-25

export const ACIDS_BASES_SALTS_APQ: CanonicalQuestion[] = [
  // Science-PQ Q3 (Section A, MCQ, 1 mark)
  { id: "APQ-S-ACID-001", subject: "Science", topicKey: "acids-bases-and-salts", subtopic: "Identifying Acids and Bases", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Neetu has two test tubes containing dilute hydrochloric acid and dilute sodium hydroxide solution, but they are not labeled. Adding which of the following solutions to the test tubes will help her visually identify the acidic and basic solution?",
    options: ["only vinegar", "only baking soda", "only sodium chloride", "either vinegar or sodium chloride"],
    answer: "only baking soda",
    solutionSteps: ["Baking soda (NaHCO3) reacts with acid (HCl) to release CO2 gas (visible effervescence) but does not react visibly with base (NaOH).", "Vinegar (an acid) would only react with the base (no visible cue distinguishing test tubes clearly). NaCl gives no reaction with either."],
    finalAnswer: "(b) only baking soda",
    ncertRef: "APQ Science-PQ Q3", isCompetencyBased: true },

  // Science-PQ Q4 (Section A, MCQ, 1 mark)
  { id: "APQ-S-ACID-002", subject: "Science", topicKey: "acids-bases-and-salts", subtopic: "pH of Salt Solutions", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Sonia has aqueous solutions of three salts — sodium acetate, sodium chloride and ammonium chloride in three test tubes. The test tubes are not labeled. On checking, she finds the pH of the solutions to be 4.6, 7.0 and 8.9. Which of the following correctly matches the salts with their respective pH? (A) pH4.6=NaOAc, pH7=NaCl, pH8.9=NH4Cl  (B) pH4.6=NaCl, pH7=NH4Cl, pH8.9=NaOAc  (C) pH4.6=NH4Cl, pH7=NaOAc, pH8.9=NaCl  (D) pH4.6=NH4Cl, pH7=NaCl, pH8.9=NaOAc",
    options: ["A", "B", "C", "D"],
    answer: "D",
    solutionSteps: ["Salt of strong acid + strong base (NaCl) → pH neutral ≈ 7.", "Salt of weak acid + strong base (sodium acetate, NaOAc) → pH basic > 7 ⟹ 8.9.", "Salt of strong acid + weak base (NH4Cl) → pH acidic < 7 ⟹ 4.6."],
    finalAnswer: "(d) D",
    ncertRef: "APQ Science-PQ Q4", isCompetencyBased: true },
];
