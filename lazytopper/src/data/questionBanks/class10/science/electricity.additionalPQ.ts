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
];
