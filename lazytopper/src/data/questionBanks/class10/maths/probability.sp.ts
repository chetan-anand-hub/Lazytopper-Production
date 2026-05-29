import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * probability — CBSE Sample Papers (P5): Sample Paper Maths Standard 2022.
 * Extracted 2026-05-29 (Sprint 1). topicKey "probability". pyqYear OMITTED (sample papers, not board PYQ).
 */
export const PROB_SP: CanonicalQuestion[] = [
  {
    "id": "SP-M-2022-PROB-A-001",
    "subject": "Maths",
    "topicKey": "probability",
    "subtopic": "Probability of Simple Events",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "Two coins are tossed simultaneously. What is the probability of getting exactly two heads?",
    "options": [
      "(a) 1/4",
      "(b) 1/2",
      "(c) 1/6",
      "(d) 1/8"
    ],
    "answer": "(a) 1/4",
    "solutionSteps": [
      "[1 mark] Sample space = {HH, HT, TH, TT}, 4 outcomes. Exactly two heads = {HH}, 1 favourable outcome. Probability = 1/4. Answer: (a)."
    ],
    "finalAnswer": "(a) 1/4",
    "isCompetencyBased": false
  },
  {
    "id": "SP-M-2022-PROB-C-001",
    "subject": "Maths",
    "topicKey": "probability",
    "subtopic": "Probability and Equations",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A bag contains 15 white and some black balls. If the probability of drawing a black ball is thrice that of drawing a white ball, find the number of black balls in the bag.",
    "options": [],
    "answer": "45 black balls",
    "solutionSteps": [
      "[1 mark] Let the number of black balls be x. Number of white balls = 15, so total balls = x + 15.",
      "[1 mark] P(black) = x/(x + 15) and P(white) = 15/(x + 15). Given P(black) = 3 × P(white): x/(x + 15) = 3 · 15/(x + 15).",
      "[1 mark] The denominators are equal, so x = 3 × 15 = 45. There are 45 black balls."
    ],
    "finalAnswer": "45 black balls",
    "isCompetencyBased": false
  }
];
