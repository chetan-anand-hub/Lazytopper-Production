import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Science (086)
// Papers: Science-PQ.pdf + Science-PQMS.pdf
// topicKey: "chemical-reactions-and-equations"
// Extraction date: 2026-05-25

export const CHEMICAL_REACTIONS_APQ: CanonicalQuestion[] = [
  // Science-PQ Q1 (Section A, MCQ, 1 mark)
  { id: "APQ-S-CHEM-001", subject: "Science", topicKey: "chemical-reactions-and-equations", subtopic: "Single Displacement Reactions", section: "A", marks: 1, format: "MCQ", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "A single displacement reaction is represented below: PQ + R → PR + Q. Which of the following is true about the reactants and products? Option A: R = cation in product, PR more stable than PQ. Option B: R = cation in product, PR less stable. Option C: R = anion in product, PR more stable. Option D: R = anion in product, PR less stable.",
    options: ["A", "B", "C", "D"],
    answer: "C",
    solutionSteps: ["Single displacement: R displaces Q from PQ ⟹ R bonds with P. For R to displace Q, R must form a more stable compound (PR) than PQ.", "R in original was free element; after reaction in PR, P is the cation (metal) and R becomes the anion (gained electrons from displacement). So R = anion, PR more stable."],
    finalAnswer: "(c) C",
    ncertRef: "APQ Science-PQ Q1", isCompetencyBased: true },

  // Science-PQ Q2 (Section A, MCQ, 1 mark)
  { id: "APQ-S-CHEM-002", subject: "Science", topicKey: "chemical-reactions-and-equations", subtopic: "Types of Chemical Reactions", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Some types of chemical reactions: decomposition, combination, displacement, double displacement. Which two of the following reactions are of the SAME type? P) AgNO3 + NaCl → AgCl + NaNO3; Q) Mg + 2 HCl → MgCl2 + H2; R) CH4 + 2 O2 → CO2 + 2 H2O; S) 2 KOH + H2SO4 → K2SO4 + H2O",
    options: ["P and Q", "Q and R", "R and S", "P and S"],
    answer: "P and S",
    solutionSteps: ["P (AgNO3 + NaCl → AgCl + NaNO3): two compounds swap ions ⟹ double displacement.", "Q: single displacement (Mg displaces H). R: combustion (combination). S: KOH + H2SO4 → K2SO4 + H2O is acid-base neutralisation = double displacement.", "P and S are both double-displacement reactions."],
    finalAnswer: "(d) P and S",
    ncertRef: "APQ Science-PQ Q2", isCompetencyBased: true },
];
