import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Mathematics (Standard 041)
// Papers: Mathematics-PQ1.pdf (+ MS Mathematics-PQ1_MS.pdf), Mathematics-PQ2.pdf (+ MS Mathematics-PQ2MS2.pdf)
// topicKey: "real-numbers"
// Extraction date: 2026-05-24
// PDF tool: pymupdf 1.27.2.3 (0 cid artifacts confirmed)

export const REAL_NUMBERS_APQ: CanonicalQuestion[] = [
  // PQ1 Q19 (Section A, Assertion-Reasoning, 1 mark)
  { id: "APQ-M-RN-001", subject: "Maths", topicKey: "real-numbers", subtopic: "Prime Factorisation", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "A number q is prime factorised as 3^2 × 7^2 × b, where b is a prime number other than 3 and 7. Assertion (A): q is definitely an odd number. Reason (R): 3^2 × 7^2 is an odd number.",
    options: [
      "Both (A) and (R) are true and (R) is the correct explanation for (A).",
      "Both (A) and (R) are true but (R) is not the correct explanation for (A).",
      "(A) is true but (R) is false.",
      "(A) is false but (R) is true."
    ],
    answer: "(A) is false but (R) is true.",
    solutionSteps: ["R is true: 3^2 × 7^2 = 441 is odd (product of odd numbers).", "A is false: if b = 2 (the only even prime), then q = 441 × 2 = 882 is even. So q is NOT definitely odd."],
    finalAnswer: "(d) (A) is false but (R) is true.",
    ncertRef: "APQ PQ1 Q19", isCompetencyBased: true },

  // PQ1 Q21 (Section B, Short, 2 marks)
  { id: "APQ-M-RN-002", subject: "Maths", topicKey: "real-numbers", subtopic: "Irrationality Proof", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Check whether the statement below is true or false. \"The square root of every composite number is rational.\" Justify your answer by proving rationality or irrationality as applicable.",
    answer: "False. Counter-example: 6 is composite but √6 is irrational.",
    solutionSteps: ["Take a composite number that is not a perfect square — e.g. 6. Assume √6 = a/b with a, b co-prime, b ≠ 0.", "Then 6b² = a² ⟹ 2 and 3 divide a², so 2 and 3 divide a ⟹ a = 6c. Substitute: 6b² = 36c² ⟹ b² = 6c², so 2 and 3 divide b. This contradicts co-prime assumption — √6 is irrational. Statement is false."],
    finalAnswer: "False — √6 is irrational, so the square root of every composite number is NOT rational.",
    ncertRef: "APQ PQ1 Q21", isCompetencyBased: true },

  // PQ2 Q2 (Section A, MCQ, 1 mark)
  { id: "APQ-M-RN-003", subject: "Maths", topicKey: "real-numbers", subtopic: "HCF and LCM Applications", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "In a formula racing competition, the time taken by two racing cars A and B to complete 1 round of the track is 30 minutes and p minutes respectively. If the cars meet again at the starting point for the first time after 90 minutes and the HCF (30, p) = 15, then the value of p is",
    options: ["45 minutes", "60 minutes", "75 minutes", "180 minutes"],
    answer: "45 minutes",
    solutionSteps: ["LCM(30, p) = 90 (cars meet first at 90 min). Using HCF × LCM = product: 15 × 90 = 30 × p ⟹ p = 45 minutes."],
    finalAnswer: "(a) 45 minutes",
    ncertRef: "APQ PQ2 Q2", isCompetencyBased: true },

  // PQ2 Q21 (Section B, Short, 2 marks)
  { id: "APQ-M-RN-004", subject: "Maths", topicKey: "real-numbers", subtopic: "HCF Application — Word Problem", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "A forester wants to plant 66 apple trees, 88 banana trees and 110 mango trees in equal rows (in terms of number of trees). Also, he wants to make distinct rows of the trees (only one type of tree in one row). Find the minimum number of rows required.",
    answer: "12 rows.",
    solutionSteps: ["Prime factorisations: 66 = 2 × 3 × 11; 88 = 2^3 × 11; 110 = 2 × 5 × 11. HCF = 2 × 11 = 22 (trees per row).", "Total trees = 66 + 88 + 110 = 264. Minimum rows = 264 / 22 = 12."],
    finalAnswer: "12 rows.",
    ncertRef: "APQ PQ2 Q21", isCompetencyBased: true },

  // PQ1 Q26 (Section C, Short, 3 marks)
  { id: "APQ-M-RN-005", subject: "Maths", topicKey: "real-numbers", subtopic: "HCF and LCM via Prime Factorisation", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Prime factorisation of three numbers A, B and C is given below: A = (2^r × 3^p × 5^q), B = (2^p × 3^r × 5^p), C = (2^q × 3^q × 5^p) such that p < q < r and p, q, r are natural numbers. The largest number that divides A, B and C without leaving a remainder is 30. The smallest number that leaves a remainder of 2 when divided by each of A, B and C is 5402. Find A, B and C.",
    answer: "A = 600, B = 270, C = 180.",
    solutionSteps: ["HCF takes the minimum power of each prime: HCF = 2^p × 3^p × 5^p = (2×3×5)^p = 30^p. HCF = 30 ⟹ p = 1.", "LCM takes the maximum power: LCM = 2^r × 3^r × 5^q. Smallest number that leaves remainder 2 is LCM + 2 = 5402 ⟹ LCM = 5400 = 2^3 × 3^3 × 5^2. So r = 3 and q = 2.", "Substitute p=1, q=2, r=3: A = 2^3 × 3^1 × 5^2 = 600; B = 2^1 × 3^3 × 5^1 = 270; C = 2^2 × 3^2 × 5^1 = 180."],
    finalAnswer: "A = 600, B = 270, C = 180.",
    ncertRef: "APQ PQ1 Q26", isCompetencyBased: true },

  // PQ2 Q26 (Section C, Short, 3 marks)
  { id: "APQ-M-RN-006", subject: "Maths", topicKey: "real-numbers", subtopic: "Irrationality Proof", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Prove that 5 + 6√7 is irrational.",
    answer: "5 + 6√7 is irrational (by contradiction, using √7 irrational).",
    solutionSteps: ["Assume 5 + 6√7 is rational. Let 5 + 6√7 = p/q where q ≠ 0 and p, q are integers.", "Rearranging: √7 = (p − 5q) / (6q).", "Since p and q are integers, (p − 5q)/(6q) is rational, so √7 would be rational — contradiction (√7 is irrational).", "Hence our assumption is wrong, so 5 + 6√7 is irrational."],
    finalAnswer: "5 + 6√7 is irrational.",
    ncertRef: "APQ PQ2 Q26", isCompetencyBased: false },

  // ===== Mathematics-PQ_2022.pdf (2022-23 set, appended 2026-05-25) =====

  // PQ_2022 Q19 (Section A, Assertion-Reasoning, 1 mark)
  { id: "APQ-M-RN-007", subject: "Maths", topicKey: "real-numbers", subtopic: "Prime Numbers and Irrationality", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Easy", bloomSkill: "Analysing",
    questionText: "Assertion (A): 2 is a prime number. Reason (R): The square of an irrational number is always a prime number.",
    options: [
      "Both (A) and (R) are true and (R) is the correct explanation of (A).",
      "Both (A) and (R) are true and (R) is not the correct explanation of (A).",
      "(A) is true but (R) is false.",
      "(A) is false but (R) is true."
    ],
    answer: "(A) is true but (R) is false.",
    solutionSteps: ["A is true: 2 is the smallest prime number.", "R is false: (√2)^2 = 2 is prime, but (√3)^2 = 3 is also prime, while (√4)^2 = 4 is not prime. The square of an irrational number is not always prime — counter-example (√6)^2 = 6 (composite)."],
    finalAnswer: "(c) (A) is true but (R) is false.",
    ncertRef: "APQ PQ_2022 Q19", isCompetencyBased: true },

  // PQ_2022 Q23 (Section B, Short, 2 marks)
  { id: "APQ-M-RN-008", subject: "Maths", topicKey: "real-numbers", subtopic: "HCF — Word Problem", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the smallest pair of 4-digit numbers such that the difference between them is 303 and their HCF is 101. Show your steps.",
    answer: "Numbers are 1010 and 1313.",
    solutionSteps: ["Let the two numbers be 101p and 101q where p > q and gcd(p, q) = 1 (since HCF = 101).", "Difference: 101p − 101q = 303 ⟹ 101(p − q) = 303 ⟹ p − q = 3, so p = q + 3.", "Smallest 4-digit number = 1000 ⟹ 101q ≥ 1000 ⟹ q ≥ 10. Take q = 10 ⟹ p = 13. Numbers: 101·10 = 1010 and 101·13 = 1313 (gcd(10, 13) = 1 ✓)."],
    finalAnswer: "1010 and 1313.",
    ncertRef: "APQ PQ_2022 Q23", isCompetencyBased: true },

  // PQ_2022 Q26 (Section C, Short, 3 marks)
  { id: "APQ-M-RN-009", subject: "Maths", topicKey: "real-numbers", subtopic: "LCM via Prime Factorisation", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The LCM of 6^4, 8^2 and k is 12^4 where k is a positive integer. Find the smallest value of k. Show your steps.",
    answer: "Smallest k = 256 (or 2^8).",
    solutionSteps: ["Prime factorisations: 6^4 = (2·3)^4 = 2^4 × 3^4; 8^2 = 2^6; 12^4 = (4·3)^4 = 2^8 × 3^4.", "LCM(6^4, 8^2, k) takes maximum power of each prime: max(4, 6, e2(k)) = 8 and max(4, 0, e3(k)) = 4.", "So e2(k) must be 8 (since 6 < 8 from 8^2). e3(k) ≤ 4 (smallest k → e3(k) = 0). Smallest k = 2^8 = 256."],
    finalAnswer: "k = 256.",
    ncertRef: "APQ PQ_2022 Q26", isCompetencyBased: true },
];
