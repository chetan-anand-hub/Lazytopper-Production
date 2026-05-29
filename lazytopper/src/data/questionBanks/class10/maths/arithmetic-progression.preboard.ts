import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * arithmetic-progression — CBSE Maths Standard Preboard Sample Papers SP1 & SP2 (Class X, Code 041).
 * Source: 776_STD SP1.pdf + 777_STD SP2.pdf (unsolved papers; worked solutions
 * generated in CBSE marking style, Sprint 1 follow-up, 2026-05-29). topicKey "arithmetic-progression".
 * Section D (4-mark) items omitted — 4 marks maps to no valid CBSE section. pyqYear OMITTED.
 */
export const AP_PREBOARD: CanonicalQuestion[] = [
  {
    "id": "PB-M-1-AP-A-001",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms of an A.P.",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "If the nth term of an A.P. is given by aₙ = 5n − 3, then the sum of first 10 terms is",
    "options": [
      "(a) 225",
      "(b) 245",
      "(c) 255",
      "(d) 270"
    ],
    "answer": "(b) 245",
    "solutionSteps": [
      "[1 mark] a₁ = 5(1) − 3 = 2 and a₁₀ = 5(10) − 3 = 47. S₁₀ = (10/2)(a₁ + a₁₀) = 5(2 + 47) = 5 × 49 = 245. Answer: (b)."
    ],
    "finalAnswer": "(b) 245",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-1-AP-C-001",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "nth Term of an A.P.",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Find the 20th term of an A.P. whose 3rd term is 7 and the seventh term exceeds three times the 3rd term by 2. Also find its nth term (aₙ).",
    "options": [],
    "answer": "a₂₀ = 75, aₙ = 4n − 5",
    "solutionSteps": [
      "[1 mark] a₃ = a + 2d = 7. Also a₇ = 3(a₃) + 2 = 3(7) + 2 = 23, so a + 6d = 23.",
      "[1 mark] Subtracting: 4d = 16 → d = 4, then a = 7 − 2(4) = −1.",
      "[1 mark] aₙ = a + (n−1)d = −1 + (n−1)4 = 4n − 5. a₂₀ = 4(20) − 5 = 75."
    ],
    "finalAnswer": "a₂₀ = 75 and aₙ = 4n − 5",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-2-AP-A-001",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms of an AP",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "An AP starts with a positive fraction and every alternate term is an integer. If the sum of the first 11 terms is 33, then the fourth term is",
    "options": [
      "(a) 2",
      "(b) 3",
      "(c) 5",
      "(d) 6"
    ],
    "answer": "(a) 2",
    "solutionSteps": [
      "[1 mark] S₁₁ = (11/2)(2a + 10d) = 33 → 2a + 10d = 6 → a + 5d = 3, i.e. the 6th term a₆ = 3. Since the first term is a positive fraction and alternate terms are integers, d = ½; then a = 3 − 5(½) = ½ (a positive fraction). Fourth term t₄ = a + 3d = ½ + 3(½) = 2. Answer: (a)."
    ],
    "finalAnswer": "(a) 2",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-2-AP-C-001",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Dividing a Number into AP Parts",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Divide 56 into four parts in A.P. such that the ratio of the product of the extremes (1st and 4th) to the product of the means (2nd and 3rd) is 5 : 6.",
    "options": [],
    "answer": "The four parts are 8, 12, 16, 20.",
    "solutionSteps": [
      "[1 mark] Let the four parts be (a − 3d), (a − d), (a + d), (a + 3d). Their sum = 4a = 56 → a = 14.",
      "[1 mark] Product of extremes = (a − 3d)(a + 3d) = a² − 9d²; product of means = (a − d)(a + d) = a² − d². Given (a² − 9d²)/(a² − d²) = 5/6 → 6(196 − 9d²) = 5(196 − d²) → 1176 − 54d² = 980 − 5d² → 49d² = 196 → d² = 4 → d = 2.",
      "[1 mark] With a = 14, d = 2: parts are 14 − 6 = 8, 14 − 2 = 12, 14 + 2 = 16, 14 + 6 = 20. (Check: 8×20 : 12×16 = 160 : 192 = 5 : 6.)"
    ],
    "finalAnswer": "8, 12, 16, 20",
    "isCompetencyBased": false
  }
];
