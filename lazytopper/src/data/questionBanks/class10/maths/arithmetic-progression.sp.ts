import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * arithmetic-progression — CBSE Sample Papers (P5): Sample Paper Maths Standard 2022.
 * Extracted 2026-05-29 (Sprint 1). topicKey "arithmetic-progression". pyqYear OMITTED (sample papers, not board PYQ).
 */
export const AP_SP: CanonicalQuestion[] = [
  {
    "id": "SP-M-2022-AP-E-001",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Arithmetic Progression (nth term)",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Veer wants to participate in a 200 m race. He can currently run that distance in 51 seconds and with each day of practice it takes him 2 seconds less. He wants to do it in 31 seconds. (a) Is the given situation an AP? If yes, give reasons. (b) If the nth term of an AP is given by aₙ = 2n + 3, then what is the common difference of the AP? (c) What is the minimum number of days he needs to practice to reach his goal? [OR] If Veer wants to achieve his goal in 9 days, how much time should he reduce each day so that he completes his race in 31 seconds?",
    "options": [],
    "answer": "(a) Yes, it is an AP; (b) d = 2; (c) 11 days [OR (c) reduce 2.5 s each day]",
    "solutionSteps": [
      "[1 mark] (a) The times form the sequence 51, 49, 47, 45, … The difference between consecutive terms is constant (a₂ − a₁ = a₃ − a₂ = −2 = d), so it is an AP.",
      "[1 mark] (b) Given aₙ = 2n + 3: a₁ = 2(1) + 3 = 5 and a₂ = 2(2) + 3 = 7. Common difference d = a₂ − a₁ = 7 − 5 = 2.",
      "[2 marks] (c) Using aₙ = a + (n − 1)d with a = 51, d = −2, aₙ = 31: 31 = 51 + (n − 1)(−2) → −20 = −2n + 2 → −22 = −2n → n = 11. He needs to practice for 11 days.",
      "[2 marks] (OR) Given n = 9, aₙ = 31, a = 51: 31 = 51 + (9 − 1)d → −20 = 8d → d = −2.5. He should reduce 2.5 s each day."
    ],
    "finalAnswer": "(a) Yes, it is an AP; (b) d = 2; (c) 11 days [OR reduce 2.5 s each day]",
    "isCompetencyBased": true
  }
];
