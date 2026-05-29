import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * statistics — CBSE Maths Standard Preboard Sample Papers SP1 & SP2 (Class X, Code 041).
 * Source: 776_STD SP1.pdf + 777_STD SP2.pdf (unsolved papers; worked solutions
 * generated in CBSE marking style, Sprint 1 follow-up, 2026-05-29). topicKey "statistics".
 * Section D (4-mark) items omitted — 4 marks maps to no valid CBSE section. pyqYear OMITTED.
 */
export const STAT_PREBOARD: CanonicalQuestion[] = [
  {
    "id": "PB-M-1-STAT-A-001",
    "subject": "Maths",
    "topicKey": "statistics",
    "subtopic": "Empirical Relation between Mean, Median and Mode",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "If the median of a series exceeds the mean by 3, find by what number the mode exceeds its mean.",
    "options": [],
    "answer": "9",
    "solutionSteps": [
      "[1 mark] Empirical relation: Mode = 3 Median − 2 Mean. So Mode − Mean = 3 Median − 3 Mean = 3(Median − Mean) = 3 × 3 = 9. The mode exceeds the mean by 9."
    ],
    "finalAnswer": "9",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-1-STAT-B-001",
    "subject": "Maths",
    "topicKey": "statistics",
    "subtopic": "Empirical Relation between Mean, Median and Mode",
    "section": "B",
    "marks": 2,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "Find the mean of the data using an empirical formula when it is given that mode is 50.5 and median is 45.5.",
    "options": [],
    "answer": "Mean = 43",
    "solutionSteps": [
      "[1 mark] Empirical formula: Mode = 3 Median − 2 Mean → 50.5 = 3(45.5) − 2 Mean → 50.5 = 136.5 − 2 Mean.",
      "[1 mark] 2 Mean = 136.5 − 50.5 = 86 → Mean = 43."
    ],
    "finalAnswer": "Mean = 43",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-2-STAT-A-001",
    "subject": "Maths",
    "topicKey": "statistics",
    "subtopic": "Empirical Relation (Mean, Median, Mode)",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Find the median of the data, using an empirical relation, given that Mode = 12.4 and Mean = 10.5.",
    "options": [],
    "answer": "Median = 11.13 (approx.)",
    "solutionSteps": [
      "[1 mark] Empirical relation: Mode = 3·Median − 2·Mean → 12.4 = 3·Median − 2(10.5) → 3·Median = 12.4 + 21 = 33.4 → Median = 33.4/3 = 11.13 (approx.)."
    ],
    "finalAnswer": "Median ≈ 11.13",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-2-STAT-B-001",
    "subject": "Maths",
    "topicKey": "statistics",
    "subtopic": "Effect of Correcting an Observation on Mean & Median",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "The mean and median of 100 observations are 50 and 52 respectively. The value of the largest observation is 100. It was later found that it is 110. Find the true mean and median.",
    "options": [],
    "answer": "True mean = 50.1, true median = 52.",
    "solutionSteps": [
      "[1 mark] Incorrect sum = mean × n = 50 × 100 = 5000. Correct sum = 5000 − 100 + 110 = 5010. True mean = 5010/100 = 50.1.",
      "[1 mark] The largest observation is at the top end of the ordered data, so increasing it from 100 to 110 does not change the middle values. Hence the median remains unchanged at 52."
    ],
    "finalAnswer": "True mean = 50.1; true median = 52.",
    "isCompetencyBased": false
  }
];
