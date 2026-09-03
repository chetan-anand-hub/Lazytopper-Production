import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Chemical Reactions and Equations — CBSE Sample Question Paper 2023-24 (Science — Code 086)
 * Source: Science-SQP.pdf (8pp) + Science-MS.pdf (6pp), cbseacademic.nic.in
 * Extracted: 2026-05-24 (P2 SQP-only scope; APQ deferred to follow-up PR)
 * topicKey: "chemical-reactions-and-equations"
 * Section distribution: A=3 (2 MCQ + 1 AR), B=1
 */
export const CHEMICAL_REACTIONS_SQP: CanonicalQuestion[] = [
  {
    "id": "SQP-S-CHEM-001",
    "subject": "Science",
    "topicKey": "chemical-reactions-and-equations",
    "subtopic": "Double Displacement Reaction — Insoluble Product",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "Identify the product which represents the solid state in the reaction between barium chloride and sodium sulphate solutions.",
    "options": [
      "(A) Barium chloride",
      "(B) Barium sulphate",
      "(C) Sodium chloride",
      "(D) Sodium sulphate"
    ],
    "answer": "(B) Barium sulphate",
    "solutionSteps": [
      "[1 mark] BaCl₂(aq) + Na₂SO₄(aq) → BaSO₄(s) ↓ + 2NaCl(aq). Barium sulphate is insoluble and precipitates as a white solid; NaCl remains in solution. Answer: (B)."
    ],
    "finalAnswer": "(B) Barium sulphate",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-S-CHEM-002",
    "subject": "Science",
    "topicKey": "chemical-reactions-and-equations",
    "subtopic": "Displacement Reaction — Zn with CuSO₄",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "The colour of the solution observed after 30 minutes of placing zinc metal to copper sulphate solution is",
    "options": [
      "(A) Blue",
      "(B) Colourless",
      "(C) Dirty green",
      "(D) Reddish Brown"
    ],
    "answer": "(B) Colourless",
    "solutionSteps": [
      "[1 mark] Zn(s) + CuSO₄(aq) → ZnSO₄(aq) + Cu(s). Zinc is more reactive than copper, so it displaces Cu²⁺ from solution. CuSO₄ is blue; ZnSO₄ is colourless. After 30 minutes, the blue colour fades to colourless and reddish-brown Cu deposits on the zinc strip. Answer: (B)."
    ],
    "finalAnswer": "(B) Colourless",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-S-CHEM-003",
    "subject": "Science",
    "topicKey": "chemical-reactions-and-equations",
    "subtopic": "Rusting of Iron — Exothermic vs Endothermic",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Evaluating",
    "questionText": "Assertion: Rusting of Iron is endothermic in nature.\nReason: As the reaction is slow, the release of heat is barely evident.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(D) Assertion is false but Reason is true.",
    "solutionSteps": [
      "[1 mark] Rusting of iron (4Fe + 3O₂ + 6H₂O → 4Fe(OH)₃) is in fact EXOTHERMIC — energy is released. So the Assertion is false. However, the Reason is true: because rusting is very slow, the small heat released is dissipated and barely evident, which is exactly what tempts learners to call it endothermic. A is false, R is true. Answer: (D)."
    ],
    "finalAnswer": "(D)",
    "isCompetencyBased": true
  },
  {
    "id": "SQP-S-CHEM-004",
    "subject": "Science",
    "topicKey": "chemical-reactions-and-equations",
    "subtopic": "Identifying a Chemical Change — Observations",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "Dilute HCl is added to Zn granules. How will you prove that a chemical change has taken place here? Support your response with two arguments.",
    "options": [],
    "answer": "Any two of: evolution of gas (H₂ bubbles); change in colour (Zn silvery-grey → black); change in temperature (exothermic).",
    "solutionSteps": [
      "[1 mark] Reaction: Zn(s) + 2HCl(aq) → ZnCl₂(aq) + H₂(g). Observable evidence of a chemical change (any two of the following arguments):",
      "[1 mark] (1) Bubbles of gas / evolution of gas — H₂ is released as the metal reacts. (2) Change in colour — the silvery-grey Zn surface turns black. (3) Change in temperature — the reaction is exothermic, so the test tube becomes warm to touch."
    ],
    "finalAnswer": "Two arguments: evolution of H₂ gas; colour change of Zn (silvery-grey → black); temperature rise.",
    "isCompetencyBased": false
  }
];
