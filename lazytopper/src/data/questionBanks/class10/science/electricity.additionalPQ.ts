import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Science (086)
// Papers: Science-PQ.pdf + Science-PQMS.pdf
// topicKey: "electricity"
// Extraction date: 2026-05-25

export const ELECTRICITY_APQ: CanonicalQuestion[] = [
  // Science-PQ Q25 first variant (Section B, Short, 2 marks)
  { id: "APQ-S-ELEC-001", subject: "Science", topicKey: "electricity", subtopic: "Ohm's Law and Ammeter Selection", section: "B", marks: 2, format: "Short", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Ramya wants to measure the current flowing through the circuit (R1=2Ω, R2=8Ω, R3=4Ω, V=12V). Which among the four ammeters can she use? Ammeter P: 0-1 mA; Q: 0-10 mA; R: 0-1 A; S: 0-10 A. Show your calculations.",
    answer: "Ammeter S (0-10 A range) can measure the ~2.58 A current.",
    solutionSteps: ["R2 and R3 in parallel: (8 × 4)/(8 + 4) = 32/12 = 2.67 Ω.", "Net R = R1 + parallel = 2 + 2.67 = 4.66 Ω. Current I = V/R = 12/4.66 ≈ 2.58 A.", "P, Q, R have max < 2.58 A. Only ammeter S (range 0-10 A) covers this current."],
    finalAnswer: "Ammeter S.",
    ncertRef: "APQ Science-PQ Q25 (first variant)", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: circuit diagram showing R1 in series with R2||R3 across 12 V." },

  // Science-PQ Q32 (Section C, Short, 3 marks)
  { id: "APQ-S-ELEC-002", subject: "Science", topicKey: "electricity", subtopic: "Power, Energy, Series Circuits", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Kaveri connected a bulb A (100 Ω) to a 240 V supply. (a) How much energy will be consumed if it is kept ON for 4 hours each day for a week? Express in kJ. (b) She then connects another similar bulb B in series with A across 240 V. Will the brightness of A change? Explain mathematically.",
    answer: "(a) ~58,060.8 kJ. (b) Brightness DECREASES (PA' = 144 W vs PA = 576 W).",
    solutionSteps: ["(a) Power P = V^2/R = 240^2/100 = 576 W. Energy = P × t = 576 W × (4 h × 7 days × 3600 s) = 576 × 100800 = 58,060,800 J = 58,060.8 kJ.", "(b) Series: Rnet = 100 + 100 = 200 Ω. Total power Ptot = V^2/Rnet = 240^2/200 = 288 W. Each bulb gets half: PA' = 144 W (since identical bulbs share equally).", "Compare: PA' = 144 W < PA = 576 W ⟹ bulb A glows DIMMER in series."],
    finalAnswer: "(a) 58,060.8 kJ; (b) brightness decreases (576 → 144 W).",
    ncertRef: "APQ Science-PQ Q32", isCompetencyBased: true },

  // Science-PQ Q33 (Section C, Short, 3 marks)
  { id: "APQ-S-ELEC-003", subject: "Science", topicKey: "electricity", subtopic: "Short Circuit and Combined Resistance", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "(a) Vijaya connects three bulbs P, Q, R in series with a battery in two ways. In case I all three glow; in case II only P and R glow. What could be the reason for Q not glowing in case II? (b) Two resistances when connected in parallel give 10/3 Ω. When connected in series, they give 15 Ω. Calculate the individual resistances.",
    answer: "(a) Short circuit (low-resistance wire) bypassing Q. (b) 5 Ω and 10 Ω.",
    solutionSteps: ["(a) In case II, the connecting wire between points across Q offers a much lower resistance path than bulb Q itself. Current bypasses Q through this short circuit ⟹ Q doesn't glow.", "(b) Let resistances be R1, R2. Series: R1 + R2 = 15. Parallel: (R1·R2)/(R1+R2) = 10/3 ⟹ R1·R2 = 50.", "From these: R1 and R2 are roots of x^2 − 15x + 50 = 0 ⟹ (x − 5)(x − 10) = 0 ⟹ R1 = 5 Ω, R2 = 10 Ω."],
    finalAnswer: "(a) Short-circuit wire bypasses Q; (b) 5 Ω and 10 Ω.",
    ncertRef: "APQ Science-PQ Q33", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: two circuit diagrams (case I + case II)." },

  // Science-PQ Q39 (Section E, Case-Based, 4 marks)
  { id: "APQ-S-ELEC-004", subject: "Science", topicKey: "electricity", subtopic: "Resistor Networks — Mixed Series and Parallel", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Four resistors (R1=15Ω, R2=30Ω, R3=15Ω, R4=15Ω), a voltmeter across R4, and a 20 V battery in a circuit. R2 and R3 in parallel; R1 and R4 in series with the parallel block. (a) Net resistance? (b) Voltmeter reading across R4? OR (b) Power dissipated by R1? (c) If R3 is removed, will net current increase, decrease, or remain same? Justify.",
    answer: "(a) 40 Ω. (b) 7.5 V. [OR] 3.75 W. (c) Decreases.",
    solutionSteps: ["(a) R2 || R3 = (30 × 15)/(30 + 15) = 450/45 = 10 Ω. Net R = R1 + 10 + R4 = 15 + 10 + 15 = 40 Ω.", "(b) Total I = V/R = 20/40 = 0.5 A. Voltmeter across R4: V4 = I × R4 = 0.5 × 15 = 7.5 V.", "[OR] Power dissipated by R1 = I^2 × R1 = (0.5)^2 × 15 = 0.25 × 15 = 3.75 W.", "(c) Removing R3: the parallel block becomes just R2 = 30 Ω (instead of 10 Ω). Net R goes UP (15 + 30 + 15 = 60 Ω). Since I = V/R and R increased, net current DECREASES."],
    finalAnswer: "(a) 40 Ω; (b) 7.5 V [or] 3.75 W; (c) decreases.",
    ncertRef: "APQ Science-PQ Q39", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: 4-resistor circuit." },

  // ----- Source: Science-PQ2.pdf + Science-PQMS2.pdf (appended 2026-05-25) -----

  // Science-PQ2 Q32 (Section C, Short, 3 marks)
  { id: "APQ-S-ELEC-005", subject: "Science", topicKey: "electricity", subtopic: "Electric Charge, Electron Count, Ohm's Law from V-I", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "(a) A current of 10 A flows through a conductor for two minutes. (i) Calculate the amount of charge passing through the conductor. (ii) If the charge of an electron is 1.6 × 10^-19 C, calculate the total number of electrons flowing through the conductor. (b) The V-I graph for a conductor is a straight line through the origin. What do you infer from this graph?",
    answer: "(a)(i) Q = 1200 C; (ii) n ≈ 7.5 × 10^21 electrons. (b) V ∝ I ⟹ R is constant (Ohm's law).",
    solutionSteps: ["(a)(i) Given I = 10 A, t = 2 min = 120 s. Charge Q = I × t = 10 × 120 = 1200 C.", "(a)(ii) Number of electrons n = Q / e = 1200 / (1.6 × 10^-19) = 7.5 × 10^21 electrons.", "(b) A straight-line V-I graph passing through the origin shows V ∝ I — confirming Ohm's law. The slope V/I = R is constant, so the conductor has a constant resistance (ohmic conductor)."],
    finalAnswer: "(a)(i) 1200 C; (ii) 7.5 × 10^21 electrons; (b) V ∝ I ⟹ constant R (Ohm's law verified).",
    ncertRef: "APQ Science-PQ2 Q32", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: V-I straight-line graph through origin." },

  // Science-PQ2 Q39 first variant (Section E, Case-Based, 4 marks)
  { id: "APQ-S-ELEC-006", subject: "Science", topicKey: "electricity", subtopic: "Resistance and Length — Parallel Resistors and Ammeters", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Rahima built a circuit with two resistors A and B (same metal, same thickness) in parallel; A is twice as long as B. The total current is 6 A and the battery voltage is 12 V. (a) What will be the resistance in the circuit? (b) Determine the values of 'RA' and 'RB'. (c) Determine the current in both the ammeters A1 and A2. Will they be the same? Justify.",
    answer: "(a) R = 2 Ω. (b) RA = 6 Ω, RB = 3 Ω. (c) IA = 2 A, IB = 4 A — NOT same (length ratio 2:1 ⟹ current ratio 1:2).",
    solutionSteps: ["(a) Net resistance from V = IR: R = V/I = 12 / 6 = 2 Ω.", "(b) For two resistors of the same material and thickness, R ∝ length. So RA = 2 × RB. In parallel: 1/R = 1/RA + 1/RB ⟹ 1/2 = 1/(2RB) + 1/RB = 3/(2 RB) ⟹ RB = 3 Ω, RA = 6 Ω. (Check via V/I: RA = 12/2 = 6, RB = 12/4 = 3.)", "(c) Current through A (RA = 6 Ω): IA = V/RA = 12/6 = 2 A. Current through B (RB = 3 Ω): IB = V/RB = 12/3 = 4 A.", "(c) The currents are NOT the same — current is inversely proportional to resistance (V common in parallel). Length-ratio 2:1 produces resistance-ratio 2:1, hence current-ratio 1:2 (IA : IB = 1 : 2)."],
    finalAnswer: "(a) 2 Ω; (b) RA = 6 Ω, RB = 3 Ω; (c) IA = 2 A, IB = 4 A — not equal (current ∝ 1/R).",
    ncertRef: "APQ Science-PQ2 Q39 (first variant)", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: parallel-resistor circuit with two ammeters A1 (in A's branch) and A2 (in B's branch) + 12 V battery." },

  // Science-PQ2 Q39 OR variant (Section E, Case-Based, 4 marks)
  { id: "APQ-S-ELEC-007", subject: "Science", topicKey: "electricity", subtopic: "Resistivity — Definition and Affecting Factors", section: "E", marks: 4, format: "Case-Based", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "(c) Define resistivity. What are the factors affecting the resistivity of a conductor?",
    answer: "Resistivity = R × A / L; a material property — depends on nature of material and temperature.",
    solutionSteps: ["Resistivity (ρ) is defined as the electrical resistance of a conductor of UNIT cross-sectional area and UNIT length. Mathematically ρ = R × A / L; SI unit ohm-metre (Ω·m).", "Resistivity is a CHARACTERISTIC PROPERTY of the material — it depends on the NATURE of the material (atomic structure, free electron density).", "It also depends on TEMPERATURE: for metals, resistivity INCREASES with temperature; for semiconductors/insulators, resistivity DECREASES with temperature.", "Resistivity does NOT depend on the dimensions (length or cross-sectional area) of the conductor."],
    finalAnswer: "ρ = R·A/L (Ω·m); depends on material nature and temperature.",
    ncertRef: "APQ Science-PQ2 Q39 (OR variant)", isCompetencyBased: false },
];
