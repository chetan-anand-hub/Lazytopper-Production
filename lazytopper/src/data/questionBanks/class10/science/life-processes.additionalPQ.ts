import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Science (086)
// Papers: Science-PQ.pdf + Science-PQMS.pdf
// topicKey: "life-processes"
// Extraction date: 2026-05-25

export const LIFE_PROCESSES_APQ: CanonicalQuestion[] = [
  // Science-PQ Q8 (Section A, MCQ, 1 mark)
  { id: "APQ-S-LIFE-001", subject: "Science", topicKey: "life-processes", subtopic: "Water Uptake in Plants — Osmosis", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Which of the following statements is TRUE about the uptake of water in plants?",
    options: [
      "It occurs all the time due to diffusion.",
      "Water enters the roots due to osmosis.",
      "At night when transpiration is low, roots do not take up water.",
      "The movement of water from roots to leaves is bidirectional."
    ],
    answer: "Water enters the roots due to osmosis.",
    solutionSteps: ["Water moves from soil (lower solute concentration) to root cell sap (higher solute) across selectively permeable membranes — this is osmosis, not diffusion.", "Roots take up water even at night (via root pressure), and water flow is unidirectional (root → leaves)."],
    finalAnswer: "(b) Water enters the roots due to osmosis.",
    ncertRef: "APQ Science-PQ Q8", isCompetencyBased: false },

  // Science-PQ Q9 (Section A, MCQ, 1 mark)
  { id: "APQ-S-LIFE-002", subject: "Science", topicKey: "life-processes", subtopic: "Oxygen Saturation vs Altitude", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Oxygen saturation levels refer to the extent haemoglobin is bound to oxygen. As altitude increases, the atmospheric pressure decreases. Which of the following graphs correctly represents the oxygen saturation levels as altitude increases?",
    options: ["P", "Q", "R", "S"],
    answer: "Q",
    solutionSteps: ["At higher altitude, atmospheric pressure (and pO2) is lower ⟹ less O2 binds to haemoglobin ⟹ O2 saturation decreases as altitude increases. Graph Q shows a decreasing trend matching this physiology."],
    finalAnswer: "(b) Q",
    ncertRef: "APQ Science-PQ Q9", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: four graphs P, Q, R, S of saturation vs altitude." },

  // Science-PQ Q12 (Section A, MCQ, 1 mark)
  { id: "APQ-S-LIFE-003", subject: "Science", topicKey: "life-processes", subtopic: "Digestion — Pancreas Function", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Patient X was suffering from a pancreatic condition due to which the pancreas was not functioning adequately. Which of the following is a doctor likely to suggest to such an individual?",
    options: [
      "including a large amount of protein in the diet",
      "eating a diet with low-fat content",
      "eating only carbohydrates",
      "including only liquid foods"
    ],
    answer: "eating a diet with low-fat content",
    solutionSteps: ["Pancreas secretes lipase (digests fats) along with amylase, trypsin. If pancreas malfunctions, fat digestion is impaired ⟹ low-fat diet recommended."],
    finalAnswer: "(b) eating a diet with low-fat content",
    ncertRef: "APQ Science-PQ Q12", isCompetencyBased: true },

  // Science-PQ Q23 first variant (Section B, Short, 2 marks)
  { id: "APQ-S-LIFE-004", subject: "Science", topicKey: "life-processes", subtopic: "Photosynthesis and Respiration Coupling", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "A plant X was enclosed in a glass jar with some lizards. A similar plant Y was enclosed in another glass jar but without lizards. Both jars are kept under the same light conditions for a few hours. Which plant is likely to photosynthesize more and why?",
    answer: "Plant X (with lizards) photosynthesises more.",
    solutionSteps: ["Lizards respire and release CO2 inside the jar, increasing CO2 concentration around plant X.", "Higher CO2 availability + adequate light ⟹ higher rate of photosynthesis in X compared to Y (which has limited CO2 in the closed jar)."],
    finalAnswer: "Plant X — higher CO2 from lizard respiration boosts photosynthesis.",
    ncertRef: "APQ Science-PQ Q23 (first variant)", isCompetencyBased: true },

  // Science-PQ Q23 OR variant (Section B, Short, 2 marks)
  { id: "APQ-S-LIFE-005", subject: "Science", topicKey: "life-processes", subtopic: "Excretion — Nephron Function", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Proteinuria is a condition in which significant amounts of protein can be detected in urine. Which process in the nephron is likely to be affected causing proteinuria? Justify.",
    answer: "Filtration (glomerular) OR selective reabsorption affected.",
    solutionSteps: ["Filtration: normally large proteins are too big to pass through the glomerular filter. If filtration becomes leaky, proteins enter the filtrate.", "Selective reabsorption: even if small amounts pass through, they're normally reabsorbed back into blood. If reabsorption fails, proteins remain in urine ⟹ proteinuria."],
    finalAnswer: "Glomerular filtration OR selective reabsorption — defect lets proteins escape into urine.",
    ncertRef: "APQ Science-PQ Q23 (OR variant)", isCompetencyBased: true },
];
