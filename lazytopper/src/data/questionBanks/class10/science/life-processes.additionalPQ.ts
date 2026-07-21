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

  // ----- Source: Science-PQ2.pdf + Science-PQMS2.pdf (appended 2026-05-25) -----

  // Science-PQ2 Q8 (Section A, MCQ, 1 mark)
  { id: "APQ-S-LIFE-006", subject: "Science", topicKey: "life-processes", subtopic: "Digestion — Role of HCl in Stomach", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Gastric juice is secreted by gastric glands and contains hydrochloric acid, mucus, and pepsin. Which activity will be affected in the absence of hydrochloric acid?",
    options: ["Digestion of proteins.", "Digestion of carbohydrates", "Digestion of lipids", "Digestion of starch."],
    answer: "Digestion of proteins.",
    solutionSteps: ["HCl creates an acidic medium needed to activate pepsin (the inactive pepsinogen → active pepsin), the enzyme that digests proteins.", "Carbohydrate / starch digestion (salivary amylase) and lipid digestion (pancreatic lipase + bile) occur in mouth and small intestine respectively, and do not depend on stomach HCl."],
    finalAnswer: "(a) Digestion of proteins.",
    ncertRef: "APQ Science-PQ2 Q8", isCompetencyBased: true },

  // Science-PQ2 Q10 (Section A, MCQ, 1 mark)
  { id: "APQ-S-LIFE-007", subject: "Science", topicKey: "life-processes", subtopic: "Peristalsis in Alimentary Canal", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "The lining of the alimentary canal has certain muscles that contract rhythmically in order to push the food forward. This process is called:",
    options: ["Translocation", "Transpiration", "Peristalsis", "Autotrophism"],
    answer: "Peristalsis",
    solutionSteps: ["Peristalsis is the rhythmic, wave-like contraction of smooth muscles lining the alimentary canal that pushes food forward.", "Translocation = movement of food in plants; transpiration = water loss from leaves; autotrophism = self-feeding mode of plants."],
    finalAnswer: "(c) Peristalsis",
    ncertRef: "APQ Science-PQ2 Q10", isCompetencyBased: false },

  // Science-PQ2 Q12 (Section A, MCQ, 1 mark)
  { id: "APQ-S-LIFE-008", subject: "Science", topicKey: "life-processes", subtopic: "Gas Exchange in Lungs — Alveoli and Blood", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "During exhalation, the exchange of gases takes place between:",
    options: [
      "Alveoli of the lungs and blood.",
      "Alveoli of lungs and tissue fluid.",
      "Blood and body tissues",
      "Tissue fluid and blood capillaries"
    ],
    answer: "Alveoli of the lungs and blood.",
    solutionSteps: ["In the lungs, gaseous exchange occurs across the thin alveolar wall: CO2 diffuses from blood (in pulmonary capillaries) into the alveoli; O2 diffuses from alveoli into blood.", "Tissue-fluid–blood exchange occurs at body tissues (systemic capillaries), not in the lungs."],
    finalAnswer: "(a) Alveoli of the lungs and blood.",
    ncertRef: "APQ Science-PQ2 Q12", isCompetencyBased: true },

  // Science-PQ2 Q18 (Section A, Assertion-Reasoning, 1 mark)
  { id: "APQ-S-LIFE-009", subject: "Science", topicKey: "life-processes", subtopic: "Mineral Ion Uptake by Roots — Active Transport", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Assertion (A): A lot of difference in the concentrations of ions was observed by a scientist between the fluid in xylem cells of roots and that of the soil. Reason (R): Xylem cells in the roots of plants which come in contact with the soil actively take up ions.",
    options: [
      "Both A and R are true, and R is the correct explanation of A.",
      "Both A and R are true, but R is not the correct explanation of A.",
      "A is true but R is false.",
      "A is false but R is true."
    ],
    answer: "Both A and R are true, and R is the correct explanation of A.",
    solutionSteps: ["A is true: the ion concentration in xylem (after active uptake) differs significantly from that of surrounding soil.", "R is true and EXPLAINS A: root cells actively transport (against gradient) mineral ions from soil into xylem, creating the concentration difference observed."],
    finalAnswer: "(a) Both A and R are true, and R is the correct explanation of A.",
    ncertRef: "APQ Science-PQ2 Q18", isCompetencyBased: true },

  // Science-PQ2 Q23 first variant (Section B, Short, 2 marks)
  { id: "APQ-S-LIFE-010", subject: "Science", topicKey: "life-processes", subtopic: "Excretion — Water Reabsorption in Summer", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Amount of urine produced generally decreases in summers as compared to other seasons if we don't keep ourselves sufficiently hydrated. Justify.",
    answer: "More reabsorption of water in summer due to sweating loss ⟹ less urine.",
    solutionSteps: ["The amount of urine is regulated by SELECTIVE REABSORPTION in the renal tubule of the nephron, depending on water status of the body.", "In summers, more water is lost through sweating. To maintain osmotic balance, the kidneys reabsorb MORE water from the filtrate, resulting in a smaller volume of more concentrated urine."],
    finalAnswer: "More sweating in summers ⟹ more water reabsorbed ⟹ less urine.",
    ncertRef: "APQ Science-PQ2 Q23 (first variant)", isCompetencyBased: true },

  // Science-PQ2 Q23 OR variant (Section B, Short, 2 marks)
  { id: "APQ-S-LIFE-011", subject: "Science", topicKey: "life-processes", subtopic: "Transportation — Four-Chambered Heart Advantage", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "What is the advantage of having a four-chambered heart in birds and mammals?",
    answer: "Prevents mixing of oxygenated and deoxygenated blood; supports high energy needs.",
    solutionSteps: ["A four-chambered heart keeps oxygenated and deoxygenated blood completely SEPARATE, preventing mixing.", "This enables a highly EFFICIENT supply of oxygen-rich blood to all body parts — essential for animals with high energy demands such as birds and mammals (which must maintain a constant body temperature)."],
    finalAnswer: "Prevents O2/CO2 mixing ⟹ efficient oxygen supply ⟹ supports high-energy lifestyle of birds and mammals.",
    ncertRef: "APQ Science-PQ2 Q23 (OR variant)", isCompetencyBased: true },

  // Science-PQ2 Q38 first variant (Section E, Case-Based, 4 marks)
  { id: "APQ-S-LIFE-012", subject: "Science", topicKey: "life-processes", subtopic: "Heart Anatomy — Chambers and Vessels", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Refer to the heart diagram (chambers numbered 6, 7, 8, 9; structure 12 labelled). (a) Which chamber pumps blood to the lungs for oxygenation? Name the blood vessels that carry this blood to the lungs. (b) Identify the structure at number 12 and state its function. (c) Why do chambers 6 and 7 have thicker muscular walls than chambers 8 and 9? Name each of these chambers.",
    answer: "(a) Chamber 7 = right ventricle; vessels = pulmonary arteries. (b) Valves — prevent backflow. (c) Ventricles pump blood out at high pressure.",
    solutionSteps: ["[1 mark] (a) Chamber 7 = RIGHT VENTRICLE pumps deoxygenated blood to the lungs through the PULMONARY ARTERIES.", "[1 mark] (b) Structure 12 = valve(s); function: ensure that blood does not flow backwards when the atria or ventricles contract.", "[1 mark] (c) Chambers 6 and 7 = LEFT and RIGHT VENTRICLES; chambers 8 and 9 = LEFT and RIGHT ATRIA.", "[1 mark] (c) Ventricles have thicker muscular walls because they pump blood out of the heart at high pressure to reach all parts of the body, whereas the atria only push blood into the ventricles."],
    finalAnswer: "(a) Right ventricle → pulmonary arteries; (b) valves prevent backflow; (c) ventricles (6,7) thicker than atria (8,9) — pump at high pressure.",
    ncertRef: "APQ Science-PQ2 Q38 (first variant)", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: labelled heart diagram with chambers 6-9 and structure 12." },

  // Science-PQ2 Q38 OR variant (Section E, Case-Based, 4 marks)
  { id: "APQ-S-LIFE-013", subject: "Science", topicKey: "life-processes", subtopic: "Heart — Oxygenated Blood Inlet and Septum Significance", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "From the same heart diagram: (i) Identify and name the chamber that receives oxygen-rich blood and name the blood vessels which bring it. (ii) State the significance of the separation of the right and left side of the heart as seen in the figure.",
    answer: "(i) Chamber 8 = left atrium; vessels = pulmonary veins. (ii) Prevents mixing of oxygenated and deoxygenated blood.",
    solutionSteps: ["[1 mark] (i) Oxygen-rich blood from the lungs returns to the heart via the PULMONARY VEINS.", "[1 mark] (i) It enters the LEFT ATRIUM (chamber 8), from where it passes into the left ventricle.", "[1 mark] (ii) The septum (muscular wall) separating the right and left sides of the heart prevents the mixing of oxygenated blood (left side) and deoxygenated blood (right side).", "[1 mark] (ii) This complete separation ensures the body receives fully oxygenated blood, supporting the high metabolic rate of birds and mammals."],
    finalAnswer: "(i) Left atrium → pulmonary veins; (ii) septum prevents mixing of O2-rich and O2-poor blood.",
    ncertRef: "APQ Science-PQ2 Q38 (OR variant)", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: labelled heart diagram." },
];
