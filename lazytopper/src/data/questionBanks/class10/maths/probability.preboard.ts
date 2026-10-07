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
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "A die is thrown once. The probability of getting a prime number is",
    "options": ["1/2", "1/3", "2/3", "1/6"],
    "answer": "1/2",
    "solutionSteps": [
      "[1 mark] 1/2 — primes on a die are 2, 3, 5: P = 3/6 = 1/2."
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
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "20 tickets, on which numbers 1 to 20 are written, are mixed thoroughly and a ticket is drawn at random. The probability that the number on the drawn ticket is a multiple of 3 or 7 is",
    "options": ["3/10", "2/5", "1/10", "9/20"],
    "answer": "2/5",
    "solutionSteps": [
      "[1 mark] 2/5 — multiples of 3: 6, multiples of 7: 2, none common; P = 8/20 = 2/5."
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
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "If P(E) = 0.05, the probability of 'not E' is",
    "options": ["0.05", "0.5", "0.95", "1.05"],
    "answer": "0.95",
    "solutionSteps": [
      "[1 mark] 0.95 — P(not E) = 1 − P(E) = 1 − 0.05 = 0.95."
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
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "A game of chance consists of spinning an arrow which comes to rest pointing at one of the numbers 1, 2, 3, 4, 5, 6, 7, 8, and these are equally likely outcomes. The probability that the arrow points at a factor of 8 is",
    "options": ["3/8", "1/4", "5/8", "1/2"],
    "answer": "1/2",
    "solutionSteps": [
      "[1 mark] 1/2 — factors of 8 are 1, 2, 4, 8: P = 4/8 = 1/2."
    ],
    "finalAnswer": "1/2",
    "isCompetencyBased": false
  }
];
