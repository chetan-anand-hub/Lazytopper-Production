import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * real-numbers — CBSE Maths Standard Preboard Sample Papers SP1 & SP2 (Class X, Code 041).
 * Source: 776_STD SP1.pdf + 777_STD SP2.pdf (unsolved papers; worked solutions
 * generated in CBSE marking style, Sprint 1 follow-up, 2026-05-29). topicKey "real-numbers".
 * Section D (4-mark) items omitted — 4 marks maps to no valid CBSE section. pyqYear OMITTED.
 */
export const RN_PREBOARD: CanonicalQuestion[] = [
  {
    "id": "PB-M-1-RN-A-001",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "Properties of Integers / Primes",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "If p₁ and p₂ are two odd prime numbers such that p₁ > p₂, then p₁² − p₂² is",
    "options": [
      "(a) an even number",
      "(b) an odd number",
      "(c) an odd prime number",
      "(d) a prime number"
    ],
    "answer": "(a) an even number",
    "solutionSteps": [
      "[1 mark] Every odd number is of the form (2k+1), so its square is odd. The difference of two odd numbers (odd − odd) is even, hence p₁² − p₂² is an even number. Answer: (a)."
    ],
    "finalAnswer": "(a) an even number",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-1-RN-A-002",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "HCF of Numbers",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "H.C.F. of 6, 72 and 120 is __________.",
    "options": [],
    "answer": "6",
    "solutionSteps": [
      "[1 mark] 6 = 2 × 3, 72 = 2³ × 3², 120 = 2³ × 3 × 5. Common factors with least powers = 2 × 3 = 6. H.C.F. = 6."
    ],
    "finalAnswer": "6",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-2-RN-A-001",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "Properties of Integers / Divisibility",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The number 3¹³ − 3¹⁰ is divisible by",
    "options": [
      "(a) 2 and 3",
      "(b) 3 and 10",
      "(c) 2, 3 and 10",
      "(d) 2, 3 and 13"
    ],
    "answer": "(d) 2, 3 and 13",
    "solutionSteps": [
      "[1 mark] 3¹³ − 3¹⁰ = 3¹⁰(3³ − 1) = 3¹⁰(27 − 1) = 3¹⁰ × 26 = 3¹⁰ × 2 × 13. Hence it is divisible by 2, 3 and 13. Answer: (d)."
    ],
    "finalAnswer": "(d) 2, 3 and 13",
    "isCompetencyBased": false
  }
];
