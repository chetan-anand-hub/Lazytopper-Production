import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * probability — CBSE Maths Standard Preboard Sample Papers SP1 & SP2 (Class X, Code 041).
 * Source: 776_STD SP1.pdf + 777_STD SP2.pdf (unsolved papers; worked solutions
 * generated in CBSE marking style, Sprint 1 follow-up, 2026-05-29). topicKey "probability".
 * Section D (4-mark) items omitted — 4 marks maps to no valid CBSE section. pyqYear OMITTED.
 */
export const PROB_PREBOARD: CanonicalQuestion[] = [
  {
    "id": "PB-M-1-PROB-A-001",
    "subject": "Maths",
    "topicKey": "probability",
    "subtopic": "Simple Probability",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "A dice is thrown once, the probability of getting a prime number is __________.",
    "options": [],
    "answer": "1/2",
    "solutionSteps": [
      "[1 mark] Sample space = {1, 2, 3, 4, 5, 6}, total = 6. Prime numbers = {2, 3, 5}, favourable = 3. Probability = 3/6 = 1/2."
    ],
    "finalAnswer": "1/2",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-1-PROB-A-002",
    "subject": "Maths",
    "topicKey": "probability",
    "subtopic": "Probability of Compound Events",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "20 tickets, on which numbers 1 to 20 are written, are mixed thoroughly and then a ticket is drawn at random out of them. Find the probability that the number on the drawn ticket is a multiple of 3 or 7.",
    "options": [],
    "answer": "2/5",
    "solutionSteps": [
      "[1 mark] Multiples of 3 in 1–20: {3, 6, 9, 12, 15, 18} = 6. Multiples of 7: {7, 14} = 2. No common element, so favourable = 6 + 2 = 8. Probability = 8/20 = 2/5."
    ],
    "finalAnswer": "2/5",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-2-PROB-A-001",
    "subject": "Maths",
    "topicKey": "probability",
    "subtopic": "Complementary Events",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "If P(E) = 0.05, the probability of 'not E' is __________.",
    "options": [],
    "answer": "0.95",
    "solutionSteps": [
      "[1 mark] P(not E) = 1 − P(E) = 1 − 0.05 = 0.95."
    ],
    "finalAnswer": "0.95",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-2-PROB-A-002",
    "subject": "Maths",
    "topicKey": "probability",
    "subtopic": "Simple Events / Equally Likely Outcomes",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "A game of chance consists of spinning an arrow which comes to rest pointing at one of the numbers 1, 2, 3, 4, 5, 6, 7, 8, and these are equally likely outcomes. Find the probability that the arrow will point at any factor of 8.",
    "options": [],
    "answer": "1/2",
    "solutionSteps": [
      "[1 mark] Factors of 8 among 1–8 are {1, 2, 4, 8} → 4 favourable outcomes out of 8. P = 4/8 = 1/2."
    ],
    "finalAnswer": "1/2",
    "isCompetencyBased": false
  }
];
