import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Pair of Linear Equations — CBSE Sample Question Paper 2023-24 (MATHEMATICS STANDARD — Code 041)
 * Source: MathsStandard-SQP.pdf (10pp) + MathsStandard-MS.pdf (9pp), cbseacademic.nic.in
 * Extracted: 2026-05-24 (P2 SQP-only scope; APQ deferred to follow-up PR)
 * topicKey: "pair-of-linear-equations"
 * Section distribution: A=1, C=1
 */
export const PAIR_OF_LINEAR_EQUATIONS_SQP: CanonicalQuestion[] = [
  {
    "id": "SQP-M-PLE-001",
    "subject": "Maths",
    "topicKey": "pair-of-linear-equations",
    "subtopic": "Conditions for Consistency",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "The lines representing the given pair of linear equations are non-intersecting. Which of the following statements is true?",
    "options": [
      "(A) a₁/a₂ = b₁/b₂ = c₁/c₂",
      "(B) a₁/a₂ = b₁/b₂ ≠ c₁/c₂",
      "(C) a₁/a₂ ≠ b₁/b₂ = c₁/c₂",
      "(D) a₁/a₂ ≠ b₁/b₂ ≠ c₁/c₂"
    ],
    "answer": "(B) a₁/a₂ = b₁/b₂ ≠ c₁/c₂",
    "solutionSteps": [
      "Non-intersecting (parallel) lines have no solution: condition is a₁/a₂ = b₁/b₂ ≠ c₁/c₂. (Intersecting lines: a₁/a₂ ≠ b₁/b₂; coincident lines: all three ratios equal.) Answer: (B)."
    ],
    "finalAnswer": "(B) a₁/a₂ = b₁/b₂ ≠ c₁/c₂",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-M-PLE-002",
    "subject": "Maths",
    "topicKey": "pair-of-linear-equations",
    "subtopic": "Word Problems on Two-Digit Numbers",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The sum of a two digit number and the number obtained by reversing the digits is 66. If the digits of the number differ by 2, find the number. How many such numbers are there?\n\n[OR]\n\nSolve: 2/√x − 3/√y = 2 ; 4/√x − 9/√y = −1, x, y > 0.",
    "options": [],
    "answer": "Main: The numbers are 42 and 24 (two such numbers). OR Alt: x = 4, y = 9.",
    "solutionSteps": [
      "Let tens digit = x, units digit = y. Original number = 10x + y; reversed number = 10y + x. Sum: (10x + y) + (10y + x) = 66 ⇒ 11(x + y) = 66 ⇒ x + y = 6.",
      "Digits differ by 2: either x − y = 2 or y − x = 2.",
      "Case 1: x + y = 6 and x − y = 2 ⇒ x = 4, y = 2 → number = 42. Case 2: x + y = 6 and y − x = 2 ⇒ x = 2, y = 4 → number = 24. Two such numbers: 42 and 24.",
      "OR (alternative): Let 1/√x = m, 1/√y = n. Equations become 2m + 3n = 2 and 4m − 9n = −1. Multiply first by −2: −4m − 6n = −4. Add to second: −15n = −5 ⇒ n = 1/3. Substitute: 2m + 1 = 2 ⇒ m = 1/2.",
      "Back-substitute: 1/√x = 1/2 ⇒ √x = 2 ⇒ x = 4; 1/√y = 1/3 ⇒ √y = 3 ⇒ y = 9."
    ],
    "finalAnswer": "Main: 42 and 24 (two numbers). OR Alt: x = 4, y = 9.",
    "isCompetencyBased": true
  }
];
