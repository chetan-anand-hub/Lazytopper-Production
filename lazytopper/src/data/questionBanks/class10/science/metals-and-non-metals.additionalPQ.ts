import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Science (086)
// Papers: Science-PQ.pdf + Science-PQMS.pdf
// topicKey: "metals-and-non-metals"
// Extraction date: 2026-05-25
// PDF tool: pymupdf 1.27.2.3 (0 cid artifacts)

export const METALS_NON_METALS_APQ: CanonicalQuestion[] = [
  // Science-PQ Q5 (Section A, MCQ, 1 mark)
  { id: "APQ-S-METAL-001", subject: "Science", topicKey: "metals-and-non-metals", subtopic: "Corrosion — Galvanisation", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Galvanisation is a process of coating iron articles with a layer of zinc to prevent the iron from rusting. The iron is protected even if the zinc coating is scratched and iron is exposed. Which of the following is true about how zinc prevents the rusting of iron? P) A galvanised iron article does not undergo oxidation. Q) The zinc coating prevents contact of iron with air. R) Zinc undergoes corrosion more easily than iron.",
    options: ["only P", "only Q", "only P and Q", "only Q and R"],
    answer: "only Q and R",
    solutionSteps: ["Q correct: zinc coating blocks air/moisture from iron surface.", "R correct: zinc is more reactive than iron (sacrificial anode), so it corrodes preferentially. P false: oxidation still occurs but on zinc, not iron."],
    finalAnswer: "(d) only Q and R",
    ncertRef: "APQ Science-PQ Q5", isCompetencyBased: true },

  // Science-PQ Q6 (Section A, MCQ, 1 mark)
  { id: "APQ-S-METAL-002", subject: "Science", topicKey: "metals-and-non-metals", subtopic: "Electrolytic Refining", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "During purification of a metal by electrolysis, what happens at the negative electrode?",
    options: [
      "Metal ions lose electrons to become neutral atoms.",
      "Neutral metal atoms gain electrons to become ions.",
      "Neutral metal atoms lose electrons to become ions.",
      "Metal ions gain electrons to become neutral metal atoms"
    ],
    answer: "Metal ions gain electrons to become neutral metal atoms",
    solutionSteps: ["At cathode (negative electrode): reduction occurs. Metal ions (Mn+) accept electrons from the electrode to deposit as neutral metal atoms (M)."],
    finalAnswer: "(d) Metal ions gain electrons to become neutral metal atoms",
    ncertRef: "APQ Science-PQ Q6", isCompetencyBased: false },

  // Science-PQ Q7 (Section A, MCQ, 1 mark)
  { id: "APQ-S-METAL-003", subject: "Science", topicKey: "metals-and-non-metals", subtopic: "Reactivity Series — Tarnishing", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Metals are lustrous and shine especially when their freshly cut surfaces are exposed. Salma cut pieces and compared the lustre of the freshly cut surfaces of: aluminium, sodium, copper, iron. The freshly cut surface of which of these metals is likely to lose its lustre first on exposure to air?",
    options: ["aluminium", "sodium", "copper", "iron"],
    answer: "sodium",
    solutionSteps: ["Sodium is the most reactive among the four (highest in reactivity series). It rapidly reacts with O2 and moisture in air, forming a dull oxide layer fastest. (Sodium is stored under kerosene to prevent this.)"],
    finalAnswer: "(b) sodium",
    ncertRef: "APQ Science-PQ Q7", isCompetencyBased: true },

  // Science-PQ Q17 (Section A, Assertion-Reasoning, 1 mark)
  { id: "APQ-S-METAL-004", subject: "Science", topicKey: "metals-and-non-metals", subtopic: "Reduction of Zinc Oxide", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Assertion (A): Zinc oxide can be reduced to zinc metal on heating with carbon. Reason (R): Carbon is less reactive than zinc.",
    options: [
      "Both A and R are true, and R is the correct explanation of A.",
      "Both A and R are true, and R is not the correct explanation of A.",
      "A is true but R is false.",
      "A is false but R is true."
    ],
    answer: "A is true but R is false.",
    solutionSteps: ["A is true: ZnO + C → Zn + CO (carbon reduces ZnO to Zn at high temperature).", "R is false: carbon is MORE reactive than zinc in the reactivity context — that's why it can reduce ZnO."],
    finalAnswer: "(c) A is true but R is false.",
    ncertRef: "APQ Science-PQ Q17", isCompetencyBased: true },

  // Science-PQ Q21 (Section B, Short, 2 marks)
  { id: "APQ-S-METAL-005", subject: "Science", topicKey: "metals-and-non-metals", subtopic: "Reactive Metal Storage", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "(a) Write the balanced chemical equation for the reaction that is prevented by storing potassium metal under kerosene. (b) Identify the type of chemical reaction that is prevented.",
    answer: "(a) 4 K + O2 → 2 K2O. (b) Combination (oxidation) reaction.",
    solutionSteps: ["(a) Balanced equation: 4 K + O2 → 2 K2O. Storing under kerosene blocks contact with air.", "(b) The prevented reaction is a combination reaction (also classified as oxidation)."],
    finalAnswer: "(a) 4 K + O2 → 2 K2O; (b) combination/oxidation.",
    ncertRef: "APQ Science-PQ Q21", isCompetencyBased: true },

  // Science-PQ Q27 (Section C, Short, 3 marks)
  { id: "APQ-S-METAL-006", subject: "Science", topicKey: "metals-and-non-metals", subtopic: "Corrosion — Iron vs Aluminium", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Equal sized bars of aluminium and iron are exposed to the environment. Which of them is likely to corrode till the level marked by the line FIRST? Justify your answer.",
    answer: "Iron corrodes first.",
    solutionSteps: ["Iron oxidises on exposure to air and moisture, forming rust (Fe2O3·xH2O). The rust layer is porous and allows air/moisture to penetrate to fresh metal beneath, so corrosion continues progressively.", "Aluminium also oxidises but forms a thin, IMPERMEABLE Al2O3 layer on the surface that PROTECTS the metal beneath. Further corrosion is blocked.", "Hence iron corrodes till the marked level FIRST while aluminium remains intact."],
    finalAnswer: "Iron corrodes first (rust is porous; Al2O3 is protective).",
    ncertRef: "APQ Science-PQ Q27", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: two bars (Al + Fe) exposed to environment with marked line." },

  // Science-PQ Q28 first variant (Section C, Short, 3 marks)
  { id: "APQ-S-METAL-007", subject: "Science", topicKey: "metals-and-non-metals", subtopic: "Electronic Configuration — Ionic Compounds", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The electronic configuration of some elements: P (2, 8, 8), Q (2, 8, 8, 1), R (2, 6), S (2, 5), T (2, 8, 2), U (2, 8, 7). (a) Identify any two pairs of elements that will react to form compounds by a transfer of electrons. (b) Write the molecular formula of the compounds formed.",
    answer: "(a) e.g. Q (metal) + R (non-metal); T (metal) + U (non-metal). (b) Q2R; TU2.",
    solutionSteps: ["Ionic compounds form between metals (low valence electrons: Q has 1, T has 2) and non-metals (high valence electrons: R has 6, U has 7).", "(a) Valid pairs: Q & R, Q & U, T & R, T & U.", "(b) Formulas: Q loses 1 e- → Q+; R gains 2 e- → R^2- ⟹ Q2R. T loses 2 e- → T^2+; U gains 1 e- → U- ⟹ TU2."],
    finalAnswer: "Pairs Q&R, T&U etc.; Q2R and TU2.",
    ncertRef: "APQ Science-PQ Q28 (first variant)", isCompetencyBased: true },

  // Science-PQ Q28 OR variant (Section C, Short, 3 marks)
  { id: "APQ-S-METAL-008", subject: "Science", topicKey: "metals-and-non-metals", subtopic: "Reactivity Series — Photolytic Decomposition", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A metal X is obtained from its chloride salt by exposure to sunlight. (a) In which section of the reactivity series of metals — top, middle or bottom — is it likely to be placed? Justify your answer. (b) Identify the type of reaction the chloride salt of metal X undergoes on exposure to sunlight.",
    answer: "(a) Bottom of the reactivity series. (b) Photolytic decomposition.",
    solutionSteps: ["(a) Bottom section. Metals at the bottom (e.g., Ag) are least reactive — their compounds are unstable and decompose easily even by sunlight, releasing the free metal.", "(b) Photolytic decomposition: e.g., 2 AgCl → 2 Ag + Cl2 (in sunlight)."],
    finalAnswer: "(a) Bottom; (b) photolytic decomposition.",
    ncertRef: "APQ Science-PQ Q28 (OR variant)", isCompetencyBased: true },

  // ----- Source: Science-PQ2.pdf + Science-PQMS2.pdf (appended 2026-05-25) -----

  // Science-PQ2 Q4 (Section A, MCQ, 1 mark)
  { id: "APQ-S-METAL-009", subject: "Science", topicKey: "metals-and-non-metals", subtopic: "Reactivity with Water — Hot vs Cold", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "The metal X does not react with cold water but floats on hot water with the formation of colourless bubbles. Which of the following represents metal X?",
    options: ["Aluminium", "Copper", "Magnesium", "Lead"],
    answer: "Magnesium",
    solutionSteps: ["Aluminium does not react with cold or hot water under normal conditions (Al2O3 protective layer).", "Copper and lead do not react with cold or hot water (below H in reactivity series).", "Magnesium does not react with cold water but reacts with hot water to liberate H2 bubbles (Mg + 2 H2O → Mg(OH)2 + H2). The H2 bubbles cling to Mg, making it float."],
    finalAnswer: "(c) Magnesium",
    ncertRef: "APQ Science-PQ2 Q4", isCompetencyBased: true },

  // Science-PQ2 Q7 (Section A, MCQ, 1 mark)
  { id: "APQ-S-METAL-010", subject: "Science", topicKey: "metals-and-non-metals", subtopic: "Reaction of Metal with Acid — Hydrogen Test", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "In the set-up shown, a metal reacts with dilute acid releasing gas 'X'. Which of the following tests is given by the gas 'X' produced in the set-up?",
    options: [
      "Lime water turns milky white",
      "Puts off a burning matchstick",
      "Burning matchstick produces a pop sound and the flame puts off",
      "Choking smell with the smell of burning sulphur"
    ],
    answer: "Burning matchstick produces a pop sound and the flame puts off",
    solutionSteps: ["Metals (above H in reactivity series) react with dilute acid to release hydrogen gas: M + 2 HCl → MCl2 + H2↑.", "H2 gas is identified by the 'pop' sound test: when a burning matchstick is brought near the gas, it burns rapidly with a characteristic pop and the flame is then extinguished."],
    finalAnswer: "(c) Burning matchstick produces a pop sound and the flame puts off",
    ncertRef: "APQ Science-PQ2 Q7", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: set-up of metal + dilute acid in a test tube with gas X collected/tested." },

  // Science-PQ2 Q17 (Section A, Assertion-Reasoning, 1 mark)
  { id: "APQ-S-METAL-011", subject: "Science", topicKey: "metals-and-non-metals", subtopic: "Electrorefining of Copper", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Assertion (A): Copper ions migrate from the anode to the cathode during electrorefining of copper. Reason (R): In the electrorefining process, metal ions accept electrons at the anode and are deposited as pure metal.",
    options: [
      "Both A and R are true, and R is the correct explanation of A.",
      "Both A and R are true, but R is not the correct explanation of A.",
      "A is true but R is false.",
      "A is false but R is true."
    ],
    answer: "A is true but R is false.",
    solutionSteps: ["A is true: In electrorefining, the impure copper anode dissolves into solution as Cu^2+ ions, which then migrate to and deposit on the pure copper cathode.", "R is false: Reduction (gain of electrons) occurs at the CATHODE, not the anode. At the anode oxidation occurs (Cu → Cu^2+ + 2 e-). So R is incorrect."],
    finalAnswer: "(c) A is true but R is false.",
    ncertRef: "APQ Science-PQ2 Q17", isCompetencyBased: true },

  // Science-PQ2 Q27 (Section C, Short, 3 marks)
  { id: "APQ-S-METAL-012", subject: "Science", topicKey: "metals-and-non-metals", subtopic: "Reactivity Series — Displacement Reactions", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Sakshi added iron filings to four test tubes A, B, C, D containing aqueous solutions of ZnSO4, CuSO4, FeSO4 and Al2(SO4)3 respectively. (a) In which test tube will she observe the reaction to be most vigorous? (b) What is the reason for her observation? (c) Write a well-balanced equation of the reaction in (b).",
    answer: "(a) Test tube B. (b) Cu is below Fe in reactivity series. (c) Fe + CuSO4 → FeSO4 + Cu.",
    solutionSteps: ["(a) Most vigorous reaction is in TEST TUBE B (CuSO4 solution).", "(b) Iron (Fe) is more reactive than copper (Cu) — Cu lies BELOW Fe in the reactivity series. Hence Fe displaces Cu from CuSO4. Fe cannot displace Zn or Al (more reactive than Fe), and FeSO4 has no displacement.", "(c) Balanced equation: Fe(s) + CuSO4(aq) → FeSO4(aq) + Cu(s). Blue colour of CuSO4 fades; reddish Cu deposits on iron filings."],
    finalAnswer: "(a) Test tube B; (b) Cu < Fe in reactivity; (c) Fe + CuSO4 → FeSO4 + Cu.",
    ncertRef: "APQ Science-PQ2 Q27", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: four labelled test tubes A, B, C, D with iron filings added." },

  // Science-PQ2 Q28 first variant (Section C, Short, 3 marks)
  { id: "APQ-S-METAL-013", subject: "Science", topicKey: "metals-and-non-metals", subtopic: "Amphoteric Oxides — Aluminium and Thermite", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Metal 'A' is used in the thermite process as a reducing agent. When 'A' is heated with oxygen it gives an oxide 'B' which is amphoteric in nature. Identify A and B. Illustrate with the help of chemical equations the reaction of B with HCl and NaOH respectively.",
    answer: "A = Aluminium (Al); B = Al2O3 (alumina, amphoteric).",
    solutionSteps: ["A = Aluminium (used as reducing agent in thermite reaction). On heating with O2: 4 Al + 3 O2 → 2 Al2O3, so B = Al2O3 — an amphoteric oxide.", "Reaction of Al2O3 (basic side) with acid HCl: Al2O3 + 6 HCl → 2 AlCl3 + 3 H2O.", "Reaction of Al2O3 (acidic side) with base NaOH: Al2O3 + 2 NaOH → 2 NaAlO2 + H2O (sodium aluminate)."],
    finalAnswer: "A = Al, B = Al2O3; reacts with both HCl (Al2O3 + 6 HCl → 2 AlCl3 + 3 H2O) and NaOH (Al2O3 + 2 NaOH → 2 NaAlO2 + H2O).",
    ncertRef: "APQ Science-PQ2 Q28 (first variant)", isCompetencyBased: true },

  // Science-PQ2 Q28 OR variant (Section C, Short, 3 marks)
  { id: "APQ-S-METAL-014", subject: "Science", topicKey: "metals-and-non-metals", subtopic: "Electrolytic Reduction of Sodium Chloride; Thermite", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "(a) \"Carbon cannot be used to reduce metal oxides of sodium, magnesium, calcium and aluminium to respective metals.\" Comment. (b) These metals are obtained by electrolytic reduction of their molten chloride. Write the reactions that occur at the anode and cathode during the electrolytic reduction of molten sodium chloride. (c) Illustrate with the help of a chemical equation reduction of manganese dioxide with aluminium powder.",
    answer: "(a) Na, Mg, Ca, Al have greater affinity for O than C. (b) Cathode: Na+ + e- → Na; Anode: 2 Cl- → Cl2 + 2 e-. (c) 3 MnO2 + 4 Al → 3 Mn + 2 Al2O3 + Heat.",
    solutionSteps: ["(a) Carbon cannot reduce oxides of highly reactive metals (Na, Mg, Ca, Al) because these metals have greater affinity for oxygen than carbon does. So carbon cannot strip oxygen away from their oxides.", "(b) Electrolytic reduction of molten NaCl: at CATHODE (reduction): Na+ + e- → Na (sodium deposited). At ANODE (oxidation): 2 Cl- → Cl2 + 2 e- (chlorine gas evolved).", "(c) Reduction of manganese dioxide with aluminium powder (thermite-type reaction): 3 MnO2(s) + 4 Al(s) → 3 Mn(l) + 2 Al2O3(s) + Heat (highly exothermic)."],
    finalAnswer: "(a) high O-affinity of Na/Mg/Ca/Al; (b) cathode Na+ + e- → Na, anode 2 Cl- → Cl2 + 2 e-; (c) 3 MnO2 + 4 Al → 3 Mn + 2 Al2O3.",
    ncertRef: "APQ Science-PQ2 Q28 (OR variant)", isCompetencyBased: true },
];
