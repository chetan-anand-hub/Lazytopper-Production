import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2024-25 board exam
// Question papers + matched marking schemes (X_MS_041_Mathematics Standard_30-x-x_2024-25) from CBSE
// topicKey: "arithmetic-progression"
// Extraction date: 2026-05-25
// PDF tool: pymupdf 1.27.2.3 (0 cid artifacts confirmed via probe)
// Coverage: 9 text-extractable Standard QPs (30/1/x, 30/2/x, 30/3/x); 10 scanned QPs (30/4/x, 30/5/x, 30/6/x, 30(B)) skipped — require OCR; Maths Basic (241) not in scope

export const ARITHMETIC_PROGRESSION_PYQ_2025: CanonicalQuestion[] = [
  { id: "PYQ-M-2025-AP-001", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Common Difference", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Assertion (A): Common difference of the AP 5, 1, −3, −7, … is 4.\nReason (R): Common difference of the AP a₁, a₂, a₃, …, aₙ is obtained by d = aₙ − aₙ₋₁.",
    options: ["Both Assertion (A) and Reason (R) are true and Reason (R) is the correct explanation of Assertion (A).", "Both Assertion (A) and Reason (R) are true but Reason (R) is not the correct explanation of Assertion (A).", "Assertion (A) is true but Reason (R) is false.", "Assertion (A) is false but Reason (R) is true."],
    answer: "Assertion (A) is false but Reason (R) is true.",
    solutionSteps: ["[1 mark] d = 1 − 5 = −4 (not 4), so A is false; R is the correct definition d = aₙ − aₙ₋₁, so R is true. Option (d)."],
    finalAnswer: "(d) Assertion (A) is false, but Reason (R) is true.",
    ncertRef: "PYQ 30/2/1 Q19", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2025-AP-002", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "General", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A school is organizing a charity run to raise funds for a local hospital. The run is planned as a series of rounds around a track, with each round being 300 metres. To make the event more challenging and engaging, the organizers decide to increase the distance of each subsequent round by 50 metres. For example, the second round will be 350 metres, the third round will be 400 metres and so on. The total number of rounds planned is 10. Based on the information given above, answer the following questions:\n(i) Write the fourth, fifth and sixth terms of the Arithmetic Progression so formed.\n(ii) Determine the distance of the 8th round.\n(iii) (a) Find the total distance run after completing all 10 rounds.\nOR\n(iii) (b) If a runner completes only the first 6 rounds, what is the total distance run by the runner?",
    answer: "AP formed is 300, 350, 400, … (i) a₄ = 450 m, a₅ = 500 m, a₆ = 550 m (ii) a₈ = 300 + 7 × 50 = 650 m (iii)(a) S₁₀ = (10/2) × (2 × 300 + 9 × 50) = 5250 m OR (iii)(b) S₆ = (6/2) × (2 × 300 + 5 × 50) = 2550 m",
    solutionSteps: ["[1 mark] The round distances form the AP 300, 350, 400, … with first term a = 300 m and common difference d = 50 m. (i) a₄ = 450 m, a₅ = 500 m, a₆ = 550 m.", "[1 mark] (ii) a₈ = a + 7d = 300 + 7 × 50 = 650 m.", "[1 mark] (iii)(a) S₁₀ = (10/2) × (2 × 300 + 9 × 50) = 5 × 1050. [OR (b) S₆ = (6/2) × (2 × 300 + 5 × 50) = 3 × 850.]", "[1 mark] S₁₀ = 5250 m. [OR (b) S₆ = 2550 m.]"],
    finalAnswer: "(i) 450 m, 500 m, 550 m; (ii) 650 m; (iii)(a) S₁₀ = 5250 m OR (b) S₆ = 2550 m.",
    ncertRef: "PYQ 30/1/1 Q36", isCompetencyBased: true,
    sourceOverride: "others",
  },
];
