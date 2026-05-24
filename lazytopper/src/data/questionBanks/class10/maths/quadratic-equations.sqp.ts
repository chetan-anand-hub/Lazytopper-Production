import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Quadratic Equations — CBSE Sample Question Paper 2023-24 (MATHEMATICS STANDARD — Code 041)
 * Source: MathsStandard-SQP.pdf (10pp) + MathsStandard-MS.pdf (9pp), cbseacademic.nic.in
 * Extracted: 2026-05-24 (P2 SQP-only scope; APQ deferred to follow-up PR)
 * topicKey: "quadratic-equations"
 * Section distribution: A=1, D=1
 */
export const QUADRATIC_EQUATIONS_SQP: CanonicalQuestion[] = [
  {
    "id": "SQP-M-QE-001",
    "subject": "Maths",
    "topicKey": "quadratic-equations",
    "subtopic": "Nature of Roots — Discriminant",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "The nature of roots of the quadratic equation 9x² − 6x − 2 = 0 is:",
    "options": [
      "(A) No real roots",
      "(B) 2 equal real roots",
      "(C) 2 distinct real roots",
      "(D) More than 2 real roots"
    ],
    "answer": "(C) 2 distinct real roots",
    "solutionSteps": [
      "Discriminant D = b² − 4ac = (−6)² − 4(9)(−2) = 36 + 72 = 108 > 0. D > 0 ⇒ two distinct real roots. Answer: (C)."
    ],
    "finalAnswer": "(C) 2 distinct real roots",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-M-QE-002",
    "subject": "Maths",
    "topicKey": "quadratic-equations",
    "subtopic": "Word Problems Reducible to Quadratics",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Applying",
    "questionText": "A motor boat whose speed is 18 km/h in still water takes 1 hour more to go 24 km upstream than to return downstream to the same spot. Find the speed of stream.\n\n[OR]\n\nTwo water taps together can fill a tank in 9⅜ hours. The tap of larger diameter takes 10 hours less than the smaller one to fill the tank separately. Find the time in which each tap can separately fill the tank.",
    "options": [],
    "answer": "Main: Speed of stream = 6 km/h. OR Alt: Smaller tap = 25 h; larger tap = 15 h.",
    "solutionSteps": [
      "Let speed of stream = x km/h. Speed upstream = (18 − x) km/h; speed downstream = (18 + x) km/h. Time upstream = 24/(18 − x) h; time downstream = 24/(18 + x) h.",
      "Given: time upstream − time downstream = 1 ⇒ 24/(18 − x) − 24/(18 + x) = 1.",
      "Simplify: 24(18 + x) − 24(18 − x) = (18 − x)(18 + x) ⇒ 48x = 324 − x² ⇒ x² + 48x − 324 = 0.",
      "Solve: x = (−48 ± √(2304 + 1296))/2 = (−48 ± 60)/2 ⇒ x = 6 or x = −54. Reject negative.",
      "Therefore speed of stream = 6 km/h.",
      "OR (alternative): Let smaller tap fill tank in x hours; larger tap in (x − 10) hours. Combined rate = 8/75 per hour (since 9⅜ = 75/8). Equation: 1/x + 1/(x − 10) = 8/75 ⇒ 8x² − 230x + 750 = 0 ⇒ x = 25 or x = 30/8. Reject 30/8 (gives negative time for larger tap). Therefore smaller tap = 25 h, larger tap = 15 h."
    ],
    "finalAnswer": "Main: 6 km/h. OR Alt: 25 h and 15 h.",
    "isCompetencyBased": true
  }
];
