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
    solutionSteps: ["[0.5 mark] Single displacement: R displaces Q from PQ ⟹ R bonds with P. For R to displace Q, R must form a more stable compound (PR) than PQ.", "[0.5 mark] R in original was free element; after reaction in PR, P is the cation (metal) and R becomes the anion (gained electrons from displacement). So R = anion, PR more stable."],
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

  // ----- Source: Science-PQ2.pdf + Science-PQMS2.pdf (appended 2026-05-25) -----

  // Science-PQ2 Q1 (Section A, MCQ, 1 mark)
  { id: "APQ-S-CHEM-003", subject: "Science", topicKey: "chemical-reactions-and-equations", subtopic: "Oxidation Reactions", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Which of the following observations is correct for the experimental diagram in which copper metal is heated strongly in air?",
    options: [
      "Red-coloured copper is reduced to black-coloured copper(I) oxide",
      "Red-coloured copper is oxidized to red-coloured copper(I) oxide",
      "Red-coloured copper is reduced to black-coloured copper(II) oxide",
      "Red-coloured copper is oxidized to black-coloured copper(II) oxide"
    ],
    answer: "Red-coloured copper is oxidized to black-coloured copper(II) oxide",
    solutionSteps: ["[0.5 mark] When copper is heated strongly in air, it combines with atmospheric oxygen — this is an oxidation reaction: 2 Cu + O2 → 2 CuO.", "[0.5 mark] The product CuO (copper(II) oxide) is BLACK in colour. Reddish-brown copper is converted to black CuO; the metal undergoes oxidation (gain of oxygen)."],
    finalAnswer: "(d) Red-coloured copper is oxidized to black-coloured copper(II) oxide",
    ncertRef: "APQ Science-PQ2 Q1", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: experimental set-up of copper being heated in air over a flame." },

  // Science-PQ2 Q2 (Section A, MCQ, 1 mark)
  { id: "APQ-S-CHEM-004", subject: "Science", topicKey: "chemical-reactions-and-equations", subtopic: "Balancing Chemical Equations", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The ratio (x:y) of reactants Fe and H2O in the given balanced chemical equation is: xFe(s) + yH2O(g) → Fe3O4(s) + 4H2(g)",
    options: ["x:y = 2:3", "x:y = 3:4", "x:y = 1:4", "x:y = 4:1"],
    answer: "x:y = 3:4",
    solutionSteps: ["Balance Fe atoms: RHS has 3 Fe (in Fe3O4) ⟹ x = 3.", "Balance O atoms: RHS has 4 O (in Fe3O4) ⟹ y = 4 (each H2O carries 1 O).", "Check H: LHS 4 × H2O = 8 H; RHS 4 × H2 = 8 H ✓. Balanced equation: 3 Fe + 4 H2O → Fe3O4 + 4 H2. So x:y = 3:4."],
    finalAnswer: "(b) x:y = 3:4",
    ncertRef: "APQ Science-PQ2 Q2", isCompetencyBased: true },
];
