import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Science (086) Previous Year Question Papers — 2023-24 board exam
// Question papers (31/4/x, 31/5/x) + matched English marking schemes
// topicKey: "electricity"
// Extraction date: 2026-05-25
// PDF tool: pymupdf (0 cid artifacts confirmed via probe)
// Coverage: 6 text-extractable QPs (31/4/x, 31/5/x); 9 scanned QPs (31/1/x, 31/2/x, 31/3/x) skipped — require OCR
// 2026-27 banned topics filtered (Ch 5/9-Evolution/14/16/Motor/EMI)

export const electricityPYQ2024: CanonicalQuestion[] = [
  { id: "PYQ-S-2024-ELEC-001", subject: "Science", topicKey: "electricity", subtopic: "General", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A rectangular loop ABCD carrying a current I is situated near a straight conductor XY, such that the conductor is parallel to the side AB of the loop and is in the plane of the loop. If a steady current I is established in the conductor as shown, the conductor XY will",
    options: ["remain stationary.", "move towards the side AB of the loop.", "move away from the side AB of the loop.", "rotate about its axis."],
    answer: "Any unassessed portion, non-carrying over of marks to the title page, or totaling error detected by the candidate shall damage the prestige of all the personnel engaged in the evaluation work as also of the Board. Hence, in order to uphold the prestige of all concerned, it is again reiterated that the instructions be followed meticulously and judiciously.",
    solutionSteps: ["Any unassessed portion, non-carrying over of marks to the title page, or totaling error detected by the candidate shall damage the prestige of all the personnel engaged in the evaluation work as also of the Board. Hence, in order to uphold the prestige of all concerned, it is again reiterated that the instructions be followed meticulously and judiciously."],
    finalAnswer: "Any unassessed portion, non-carrying over of marks to the title page, or totaling error detected by the candidate shall damage the prestige of all the personnel engaged in the evaluation work as also of the Board. Hence, in order to uphold the prestige of all concerned, it is again reiterated that the instructions be followed meticulously and judiciously.",
    ncertRef: "PYQ 31/4/1 Q15", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "1" },
  { id: "PYQ-S-2024-ELEC-002", subject: "Science", topicKey: "electricity", subtopic: "Combination of Resistors", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Study the following circuit: between points A and B, resistors of 4 Ω, 6 Ω and 16 Ω are connected in series; between points B and C, two 8 Ω resistors are connected in parallel. A 6 V battery and a key are connected across A and C. On the basis of this circuit, answer the following questions: (a) Find the value of the total resistance between the points A and B. (b) Find the resistance between the points B and C. (c) (i) Calculate the current drawn from the battery when the key is closed. OR (c) (ii) In the above circuit, which of the two — the 16 Ω resistor or the parallel combination of the two 8 Ω resistors — will have more potential difference across its two ends? Justify your answer.",
    answer: "(a) 26 Ω (b) 4 Ω (c)(i) I = 6 V/30 Ω = 0.2 A. OR (c)(ii) The 16 Ω resistor: the same current (0.2 A) flows through both, and by Ohm's law (V = IR) the larger resistance has the larger potential difference — 0.2 × 16 = 3.2 V across 16 Ω versus 0.2 × 4 = 0.8 V across the parallel pair.",
    solutionSteps: ["[1 mark] (a) Series: R_AB = 4 Ω + 6 Ω + 16 Ω = 26 Ω.", "[1 mark] (b) Parallel: 1/R_BC = 1/8 + 1/8 = 1/4 ⇒ R_BC = 4 Ω.", "[2 marks] (c)(i) Total resistance R = 26 Ω + 4 Ω = 30 Ω; I = V/R = 6 V / 30 Ω = 0.2 A. OR (c)(ii) The 16 Ω resistor. The 16 Ω resistor and the parallel pair are in series, so the same current 0.2 A flows through both; by Ohm's law V = IR, V(16 Ω) = 0.2 × 16 = 3.2 V while V(parallel pair) = 0.2 × 4 = 0.8 V."],
    finalAnswer: "(a) 26 Ω (b) 4 Ω (c)(i) I = 6 V/30 Ω = 0.2 A. OR (c)(ii) The 16 Ω resistor: the same current (0.2 A) flows through both, and by Ohm's law (V = IR) the larger resistance has the larger potential difference — 0.2 × 16 = 3.2 V across 16 Ω versus 0.2 × 4 = 0.8 V across the parallel pair.",
    ncertRef: "PYQ 31/4/1 Q39", isCompetencyBased: true,
    sourceOverride: "others",
  },
];
