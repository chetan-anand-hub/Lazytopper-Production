import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Probability — CBSE Sample Question Paper 2023-24 (MATHEMATICS STANDARD — Code 041)
 * Source: MathsStandard-SQP.pdf (10pp) + MathsStandard-MS.pdf (9pp), cbseacademic.nic.in
 * Extracted: 2026-05-24 (P2 SQP-only scope; APQ deferred to follow-up PR)
 * topicKey: "probability"
 * Section distribution: A=2
 */
export const PROBABILITY_SQP: CanonicalQuestion[] = [
  {
    "id": "SQP-M-PROB-001",
    "subject": "Maths",
    "topicKey": "probability",
    "subtopic": "Geometric Probability",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "There is a square board of side '2a' units circumscribing a red circle. Jayadev is asked to keep a dot on the above said board. The probability that he keeps the dot on the shaded region is",
    "options": [
      "(A) π/4",
      "(B) (4 − π)/4",
      "(C) (π − 4)/4",
      "(D) 4/π"
    ],
    "answer": "(B) (4 − π)/4",
    "solutionSteps": [
      "Area of square = (2a)² = 4a². Area of inscribed circle (radius a) = πa². Shaded area (outside circle, inside square) = 4a² − πa². P(dot on shaded) = (4a² − πa²)/(4a²) = (4 − π)/4. Answer: (B)."
    ],
    "finalAnswer": "(B) (4 − π)/4",
    "isCompetencyBased": true
  },
  {
    "id": "SQP-M-PROB-002",
    "subject": "Maths",
    "topicKey": "probability",
    "subtopic": "Probability with Playing Cards",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "2 cards of hearts and 4 cards of spades are missing from a pack of 52 cards. A card is drawn at random from the remaining pack. What is the probability of getting a black card?",
    "options": [
      "(A) 22/52",
      "(B) 22/46",
      "(C) 24/52",
      "(D) 24/46"
    ],
    "answer": "(B) 22/46",
    "solutionSteps": [
      "Total cards remaining = 52 − 2 − 4 = 46. Spades remaining = 13 − 4 = 9; clubs remaining = 13 (no clubs missing). Black cards remaining = 9 + 13 = 22. P(black card) = 22/46. Answer: (B)."
    ],
    "finalAnswer": "(B) 22/46",
    "isCompetencyBased": false
  }
];
