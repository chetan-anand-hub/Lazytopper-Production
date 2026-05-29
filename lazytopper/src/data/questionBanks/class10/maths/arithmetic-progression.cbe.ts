import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Arithmetic Progression — CBSE CBE Item Bank (Competency-based education for CBSE), Maths Class 10.
 * Source: Item-Bank--Maths---Class-10.pdf (British Council / CBSE, September 2021),
 *   items Maths10AS6, Maths10SK1, Maths10SK11, Maths10RM2, Maths10GS5, Maths10AR9,
 *   Maths10RK4, Maths10RM9, Maths10RM1.
 * Content References 10A4a (nth term and sum of first n terms of an AP) and
 *   10A4b (identify and use Arithmetic Progressions) mapped to CBSE chapter
 *   topicKey "arithmetic-progression".
 * Extracted: 2026-05-29 (Sprint 1 — CBSE Official). pyqYear OMITTED (item-bank, not PYQ).
 * Section distribution: A=7, B=3, C=2 (total 12).
 */
export const AP_CBE: CanonicalQuestion[] = [
  {
    "id": "CBE-M-AP-A-001",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms (Real-Life Application)",
    "section": "A",
    "marks": 1,
    "format": "Case-Based",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "Amrya's school organised a tree fest in the month of August. The authorities got 5 feet of area cleared up all along the school boundary. It was decided that every section of each class would plant twice as many as the class standard. There were 3 sections of each standard from 1 to 12. So, if there are three sections in class 1, say 1A, 1B, and 1C, then each section would plant 2 trees. Similarly, each section of class 2 would plant 4 trees and so on.\n\n(a) How many trees were planted by the students of all sections of class 8?",
    "options": [],
    "answer": "48 trees",
    "solutionSteps": [
      "[1 mark] One section of Class 8 plants 2 × 8 = 16 trees. There are 3 sections, so 16 × 3 = 48 trees."
    ],
    "finalAnswer": "48 trees",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-AP-A-002",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "nth Term of an AP",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "The 6th term of the A.P. −11, −8, −5… is",
    "options": [
      "A. −7",
      "B. 4",
      "C. 7",
      "D. 16"
    ],
    "answer": "B. 4",
    "solutionSteps": [
      "[1 mark] a₆ = a + 5d = −11 + 5(3) = −11 + 15 = 4. Answer: B."
    ],
    "finalAnswer": "B. 4",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-AP-A-003",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "nth Term of an AP",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "If the common difference of an AP is 7, then find the value of a₇ − a₄.",
    "options": [
      "A. 7",
      "B. 14",
      "C. 21",
      "D. 24"
    ],
    "answer": "C. 21",
    "solutionSteps": [
      "[1 mark] a₇ − a₄ = (a + 6d) − (a + 3d) = 3d = 3 × 7 = 21. Answer: C."
    ],
    "finalAnswer": "C. 21",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-AP-A-004",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms (Real-Life Application)",
    "section": "A",
    "marks": 1,
    "format": "Case-Based",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "My friend wants to buy a car and plans to take a loan from a bank for his car. He repays his loan starting with the first installment of Rs. 1000. If he increases his installment by Rs. 200 every month, then answer the following:\n\n(a) What is the amount paid by him in the 30th installment?",
    "options": [],
    "answer": "Rs. 6800",
    "solutionSteps": [
      "[1 mark] aₙ = a + (n−1)d; a₃₀ = 1000 + (30−1)(200) = 1000 + 29 × 200 = 6800."
    ],
    "finalAnswer": "Rs. 6800",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-AP-A-005",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "nth Term of an AP (Real-Life Application)",
    "section": "A",
    "marks": 1,
    "format": "Case-Based",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "My friend wants to buy a car and plans to take a loan from a bank for his car. He repays his loan starting with the first installment of Rs. 1000. If he increases his installment by Rs. 200 every month, then answer the following:\n\n(c) If there are 40 installments in total, then what is the amount paid in the last installment?",
    "options": [],
    "answer": "Rs. 8800",
    "solutionSteps": [
      "[1 mark] a₄₀ = 1000 + (40−1)(200) = 1000 + 39 × 200 = 8800."
    ],
    "finalAnswer": "Rs. 8800",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-AP-A-006",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Identifying an Arithmetic Progression",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The next term of the AP √3, √12, √27, …… is:",
    "options": [
      "A. √9",
      "B. √15",
      "C. √48",
      "D. √12"
    ],
    "answer": "C. √48",
    "solutionSteps": [
      "[1 mark] The AP is √3, 2√3, 3√3, 4√3, … so the next term is 4√3 = √48. Answer: C."
    ],
    "finalAnswer": "C. √48",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-AP-B-001",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "nth Term of an AP",
    "section": "B",
    "marks": 2,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Which term of the AP 3, 12, 21, 30, ...... will be 90 more than its 50th term?",
    "options": [],
    "answer": "60th term",
    "solutionSteps": [
      "[1 mark] The common difference is d = 9. To increase by 90, we need 90 ÷ 9 = 10 further terms.",
      "[1 mark] So the required term is the 50 + 10 = 60th term."
    ],
    "finalAnswer": "60th term",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-AP-B-002",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms of an AP",
    "section": "B",
    "marks": 2,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If the first three terms of an A.P. are 15, 13.5, 12, find the sum of the first 10 terms.",
    "options": [],
    "answer": "82.5",
    "solutionSteps": [
      "[1 mark] a = 15, d = −1.5. a₁₀ = a + (10−1)d = 15 + 9(−1.5) = 1.5.",
      "[1 mark] Sum of 10 terms = 15 + 13.5 + 12 + … + 1.5 = (10/2)(15 + 1.5) = 82.5."
    ],
    "finalAnswer": "82.5",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-AP-B-003",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms (Real-Life Application)",
    "section": "B",
    "marks": 2,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "My friend wants to buy a car and plans to take a loan from a bank for his car. He repays his loan starting with the first installment of Rs. 1000. If he increases his installment by Rs. 200 every month, then answer the following:\n\n(b) Find the total amount paid by him in the 30 installments.",
    "options": [],
    "answer": "Rs. 117000",
    "solutionSteps": [
      "[1 mark] Sₙ = (n/2)[2a + (n−1)d]; S₃₀ = (30/2)[2(1000) + (30−1)(200)] = 15(2000 + 29 × 200).",
      "[1 mark] = 15(2000 + 5800) = 15 × 7800 = 117000."
    ],
    "finalAnswer": "Rs. 117000",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-AP-A-007",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Consecutive Terms of an AP",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If m−2, 2m−3 and m+3 are three consecutive terms of an A.P., then the value of m is:",
    "options": [
      "A. 2.5",
      "B. 3",
      "C. 1.5",
      "D. 3.5"
    ],
    "answer": "D. 3.5",
    "solutionSteps": [
      "[1 mark] For consecutive AP terms the common difference is equal: (2m−3) − (m−2) = (m+3) − (2m−3) → m−1 = −m+6 → 2m = 7 → m = 3.5. Answer: D."
    ],
    "finalAnswer": "D. 3.5",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-AP-C-001",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms (Real-Life Application)",
    "section": "C",
    "marks": 3,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Amrya's school organised a tree fest in the month of August. The authorities got 5 feet of area cleared up all along the school boundary. It was decided that every section of each class would plant twice as many as the class standard. There were 3 sections of each standard from 1 to 12. So, if there are three sections in class 1, say 1A, 1B, and 1C, then each section would plant 2 trees. Similarly, each section of class 2 would plant 4 trees and so on.\n\n(b) Find the total number of trees planted by students.",
    "options": [],
    "answer": "468",
    "solutionSteps": [
      "[1 mark] The number of trees planted by different classes form the A.P. 6, 12, 18, 24, … with a = 6, d = 6, n = 12.",
      "[1 mark] Sₙ = (n/2)[2a + (n−1)d] = (12/2)[2(6) + (12−1)(6)].",
      "[1 mark] = 6[12 + 66] = 6 × 78 = 468 trees."
    ],
    "finalAnswer": "468",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-AP-C-002",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms of an AP (Real-Life Application)",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The nth term of an AP is 18. Its first term and common difference are 50 and −4, respectively. Find the sum of first n terms of the AP.",
    "options": [],
    "answer": "Sₙ = 306",
    "solutionSteps": [
      "[1 mark] a = 50, d = −4, aₙ = 18. Using aₙ = a + (n−1)d: 18 = 50 + (n−1)(−4) = 54 − 4n.",
      "[1 mark] 4n = 54 − 18 = 36 → n = 9.",
      "[1 mark] Sₙ = (n/2)[2a + (n−1)d] = (9/2)[100 + (8 × −4)] = (9/2)(68) = 9 × 34 = 306."
    ],
    "finalAnswer": "Sₙ = 306",
    "isCompetencyBased": true
  }
];
