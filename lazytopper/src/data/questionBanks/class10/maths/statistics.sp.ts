import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * statistics — CBSE Sample Papers (P5): Sample Paper Maths Standard 2022.
 * Extracted 2026-05-29 (Sprint 1). topicKey "statistics". pyqYear OMITTED (sample papers, not board PYQ).
 */
export const STAT_SP: CanonicalQuestion[] = [
  {
    "id": "SP-M-2022-STAT-A-001",
    "subject": "Maths",
    "topicKey": "statistics",
    "subtopic": "Empirical Relationship Between Mean, Median and Mode",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If median is three times mean, mean is 4, then mode is equal to",
    "options": [
      "(a) 28",
      "(b) 13",
      "(c) 20",
      "(d) 4"
    ],
    "answer": "(a) 28",
    "solutionSteps": [
      "[1 mark] Mean = 4, Median = 3 × 4 = 12. Empirical relation: Mode = 3 Median − 2 Mean = 3(12) − 2(4) = 36 − 8 = 28. Answer: (a)."
    ],
    "finalAnswer": "(a) 28",
    "isCompetencyBased": false
  },
  {
    "id": "SP-M-2022-STAT-A-002",
    "subject": "Maths",
    "topicKey": "statistics",
    "subtopic": "Effect of Change of Origin on Median",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "In a continuous frequency distribution, median of data is 21. If each observation is increased by 5, then new median is",
    "options": [
      "(a) 5",
      "(b) 21",
      "(c) 26",
      "(d) 30"
    ],
    "answer": "(c) 26",
    "solutionSteps": [
      "[1 mark] If every observation increases by a constant, the median increases by the same constant. New median = 21 + 5 = 26. Answer: (c)."
    ],
    "finalAnswer": "(c) 26",
    "isCompetencyBased": false
  },
  {
    "id": "SP-M-2022-STAT-D-001",
    "subject": "Maths",
    "topicKey": "statistics",
    "subtopic": "Median of Grouped Data (Missing Frequencies)",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Applying",
    "questionText": "Find values of x and y if the median for the following data is 31 and the total frequency is 40. Class interval: 0–10, 10–20, 20–30, 30–40, 40–50, 50–60 with frequencies 5, x, 6, y, 6, 5 respectively.",
    "options": [],
    "answer": "x = 8, y = 10",
    "solutionSteps": [
      "[1 mark] Cumulative frequencies: 0–10 → 5; 10–20 → 5 + x; 20–30 → 11 + x; 30–40 → 11 + x + y; 40–50 → 17 + x + y; 50–60 → 22 + x + y.",
      "[1 mark] Total frequency = 40: 22 + x + y = 40 → x + y = 18 …(1).",
      "[1 mark] Median = 31 lies in class 30–40, so l = 30, cf = 11 + x, f = y, h = 10, n/2 = 20. Median = l + ((n/2 − cf)/f) × h.",
      "[1 mark] 31 = 30 + ((20 − (11 + x))/y) × 10 → 1 = ((9 − x)/y) × 10 → y = 10(9 − x) = 90 − 10x …(2).",
      "[1 mark] Substitute (2) in (1): x + 90 − 10x = 18 → −9x = −72 → x = 8, so y = 90 − 80 = 10. Hence x = 8 and y = 10."
    ],
    "finalAnswer": "x = 8, y = 10",
    "isCompetencyBased": false
  }
];
