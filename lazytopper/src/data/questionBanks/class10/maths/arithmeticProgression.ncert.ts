import type { CanonicalQuestion } from '../../../predictionTypes';

// Source: NCERT Class 10 Mathematics — Chapter 5: Arithmetic Progressions
// topicKey: "arithmetic-progression"
// Extraction date: 2026-05-22
// Syllabus: CBSE 2026-27 (full chapter in scope)
// Coverage: Ex 5.1 (definition/CD), Ex 5.2 (nth term), Ex 5.3 (sum), Ex 5.4 (optional),
//           selected NCERT Examples 1–16.

export const AP_NCERT: CanonicalQuestion[] = [
  // ===== Section A — MCQs (1 mark) =====
  { id: "AP-N-NCERT-5-MCQ-001", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term of AP", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "The 30th term of the AP 10, 7, 4, … is",
    options: ["97", "77", "−77", "−87"],
    answer: "−77",
    solutionSteps: ["Here a = 10, d = 7 − 10 = −3.", "a₃₀ = a + 29d = 10 + 29 × (−3) = 10 − 87 = −77."],
    finalAnswer: "−77 — option (c).",
    ncertRef: "NCERT Ex 5.2 Q2(i)", isCompetencyBased: false,
    strategyHint: "Use aₙ = a + (n − 1)d." },

  { id: "AP-N-NCERT-5-MCQ-002", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term of AP", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "The 10th term of the AP 2, 7, 12, … is",
    options: ["47", "52", "42", "37"],
    answer: "47",
    solutionSteps: ["a = 2, d = 7 − 2 = 5, n = 10.", "a₁₀ = 2 + 9 × 5 = 2 + 45 = 47."],
    finalAnswer: "47 — option (a).",
    ncertRef: "NCERT Example 3 (page 102)", isCompetencyBased: false },

  { id: "AP-N-NCERT-5-MCQ-003", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Identification of AP", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Which of the following is NOT an AP?",
    options: ["2, 4, 8, 16, …", "−1.2, −3.2, −5.2, −7.2, …", "−10, −6, −2, 2, …", "0, −4, −8, −12, …"],
    answer: "2, 4, 8, 16, …",
    solutionSteps: ["Find consecutive differences for option (a): 4 − 2 = 2, 8 − 4 = 4, 16 − 8 = 8 — not constant.", "Hence 2, 4, 8, 16, … is a GP, not an AP.", "The remaining three options have constant common differences (−2, 4 and −4 respectively)."],
    finalAnswer: "2, 4, 8, 16, … — option (a).",
    ncertRef: "NCERT Ex 5.1 Q4", isCompetencyBased: false },

  { id: "AP-N-NCERT-5-MCQ-004", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of n Terms", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The sum of the first 22 terms of the AP 8, 3, −2, … is",
    options: ["−979", "979", "−769", "−1078"],
    answer: "−979",
    solutionSteps: ["a = 8, d = 3 − 8 = −5, n = 22.", "Sₙ = n/2 [2a + (n − 1)d] = 22/2 [16 + 21 × (−5)] = 11 × (16 − 105).", "S₂₂ = 11 × (−89) = −979."],
    finalAnswer: "−979 — option (a).",
    ncertRef: "NCERT Example 11 (page 109)", isCompetencyBased: false,
    strategyHint: "Use Sₙ = n/2[2a + (n − 1)d]." },

  { id: "AP-N-NCERT-5-MCQ-005", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term of AP", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Which term of the AP 3, 8, 13, 18, … is 78?",
    options: ["14th", "15th", "16th", "17th"],
    answer: "16th",
    solutionSteps: ["a = 3, d = 5.", "aₙ = 78 ⇒ 3 + (n − 1) × 5 = 78 ⇒ (n − 1) × 5 = 75 ⇒ n − 1 = 15.", "n = 16."],
    finalAnswer: "16th term — option (c).",
    ncertRef: "NCERT Ex 5.2 Q4", isCompetencyBased: true },

  // ===== Section A — Assertion-Reasoning (1 mark) =====
  { id: "AP-N-NCERT-5-AR-001", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Identification of AP", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Assertion (A): The list of numbers −10, −6, −2, 2, … is an AP with common difference 4.\nReason (R): A list of numbers is an AP if aₖ₊₁ − aₖ is the same constant for every k.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    solutionSteps: ["Check differences: −6 − (−10) = 4, −2 − (−6) = 4, 2 − (−2) = 4. All equal, so A is true.", "R is the standard definition of an AP — true.", "We used R to verify A, so R is the correct explanation."],
    finalAnswer: "Option (A).",
    ncertRef: "NCERT Section 5.2 / Ex 5.1", isCompetencyBased: true },

  { id: "AP-N-NCERT-5-AR-002", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of n Terms", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Assertion (A): The sum of the first n positive integers is n(n + 1)/2.\nReason (R): The sum of first n terms of an AP with first term a and last term l is Sₙ = n/2 (a + l).",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    solutionSteps: ["1, 2, 3, …, n forms an AP with a = 1, d = 1, l = n.", "By R, Sₙ = n/2 (1 + n) = n(n + 1)/2 — matches A.", "R is the standard NCERT formula and is the direct route to A."],
    finalAnswer: "Option (A).",
    ncertRef: "NCERT Example 14 (page 110)", isCompetencyBased: true },

  // ===== Section B — Short Answer (2 marks, VSA) =====
  { id: "AP-N-NCERT-5-VSA-001", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Common Difference", section: "B", marks: 2, format: "VSA", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "For the AP 3, 1, −1, −3, …, write the first term and the common difference.",
    solutionSteps: ["First term a = 3.", "Common difference d = a₂ − a₁ = 1 − 3 = −2.", "Therefore a = 3 and d = −2."],
    finalAnswer: "a = 3, d = −2.",
    ncertRef: "NCERT Ex 5.1 Q3(i)", isCompetencyBased: false },

  { id: "AP-N-NCERT-5-VSA-002", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term of AP", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "Write the first four terms of the AP with first term a = 10 and common difference d = 10.",
    solutionSteps: ["a₁ = a = 10.", "a₂ = a + d = 20, a₃ = a + 2d = 30, a₄ = a + 3d = 40.", "So the first four terms are 10, 20, 30, 40."],
    finalAnswer: "10, 20, 30, 40.",
    ncertRef: "NCERT Ex 5.1 Q2(i)", isCompetencyBased: false },

  { id: "AP-N-NCERT-5-VSA-003", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Number of Terms", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "How many two-digit numbers are divisible by 3?",
    solutionSteps: ["Two-digit multiples of 3 form the AP 12, 15, 18, …, 99 with a = 12, d = 3.", "aₙ = 99 ⇒ 12 + (n − 1) × 3 = 99 ⇒ (n − 1) × 3 = 87 ⇒ n − 1 = 29.", "n = 30 — there are 30 such numbers."],
    finalAnswer: "30 two-digit numbers are divisible by 3.",
    ncertRef: "NCERT Example 7 (page 103)", isCompetencyBased: true,
    strategyHint: "List the AP of multiples in the given range, then solve aₙ = a + (n − 1)d." },

  { id: "AP-N-NCERT-5-VSA-004", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term of AP", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Which term of the AP 21, 18, 15, … is −81?",
    solutionSteps: ["a = 21, d = 18 − 21 = −3.", "aₙ = −81 ⇒ 21 + (n − 1) × (−3) = −81.", "(n − 1) × (−3) = −102 ⇒ n − 1 = 34 ⇒ n = 35."],
    finalAnswer: "The 35th term of the AP is −81.",
    ncertRef: "NCERT Example 4 (page 102)", isCompetencyBased: true },

  // ===== Section C — Short Answer (3 marks) =====
  { id: "AP-N-NCERT-5-SA-001", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term of AP", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Determine the AP whose 3rd term is 5 and the 7th term is 9.",
    solutionSteps: ["a + 2d = 5 …(1) and a + 6d = 9 …(2).", "Subtract (1) from (2): 4d = 4 ⇒ d = 1.", "Substitute in (1): a = 5 − 2 = 3.", "So the AP is 3, 4, 5, 6, 7, ……"],
    finalAnswer: "AP: 3, 4, 5, 6, 7, ….",
    ncertRef: "NCERT Example 5 (page 102)", isCompetencyBased: true },

  { id: "AP-N-NCERT-5-SA-002", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term of AP", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the 31st term of an AP whose 11th term is 38 and the 16th term is 73.",
    solutionSteps: ["a + 10d = 38 …(1) and a + 15d = 73 …(2).", "Subtract (1) from (2): 5d = 35 ⇒ d = 7.", "From (1): a = 38 − 70 = −32.", "a₃₁ = a + 30d = −32 + 30 × 7 = −32 + 210 = 178."],
    finalAnswer: "31st term = 178.",
    ncertRef: "NCERT Ex 5.2 Q7", isCompetencyBased: true },

  { id: "AP-N-NCERT-5-SA-003", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of n Terms", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the sum of the first 22 terms of an AP in which d = 7 and the 22nd term is 149.",
    solutionSteps: ["a₂₂ = a + 21d = 149 ⇒ a + 21 × 7 = 149 ⇒ a = 149 − 147 = 2.", "S₂₂ = n/2 (a + l) = 22/2 × (2 + 149).", "S₂₂ = 11 × 151 = 1661."],
    finalAnswer: "Sum = 1661.",
    ncertRef: "NCERT Ex 5.3 Q7", isCompetencyBased: true },

  { id: "AP-N-NCERT-5-SA-004", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Number of Terms", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "How many terms of the AP 24, 21, 18, … must be taken so that their sum is 78?",
    solutionSteps: ["a = 24, d = −3, Sₙ = 78.", "Sₙ = n/2 [2a + (n − 1)d] = n/2 [48 + (n − 1)(−3)] = n/2 [51 − 3n].", "Equate: n(51 − 3n)/2 = 78 ⇒ 51n − 3n² = 156 ⇒ n² − 17n + 52 = 0.", "(n − 4)(n − 13) = 0 ⇒ n = 4 or n = 13. Both are valid because terms 5 to 13 sum to zero (terms cross from positive to negative)."],
    finalAnswer: "n = 4 or n = 13.",
    ncertRef: "NCERT Example 13 (page 110)", isCompetencyBased: true,
    strategyHint: "Two answers can occur when the AP changes sign — both are valid." },

  { id: "AP-N-NCERT-5-SA-005", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of n Terms", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the sum of the first 15 multiples of 8.",
    solutionSteps: ["The 15 multiples form the AP 8, 16, 24, …, with a = 8 and d = 8.", "a₁₅ = 8 + 14 × 8 = 120.", "S₁₅ = 15/2 (8 + 120) = 15/2 × 128 = 15 × 64 = 960."],
    finalAnswer: "Sum = 960.",
    ncertRef: "NCERT Ex 5.3 Q13", isCompetencyBased: true },

  { id: "AP-N-NCERT-5-SA-006", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of n Terms", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "If the sum of the first 14 terms of an AP is 1050 and its first term is 10, find the 20th term.",
    solutionSteps: ["S₁₄ = 14/2 [2 × 10 + 13d] = 7 (20 + 13d) = 140 + 91d.", "Equate: 140 + 91d = 1050 ⇒ 91d = 910 ⇒ d = 10.", "a₂₀ = a + 19d = 10 + 19 × 10 = 200."],
    finalAnswer: "20th term = 200.",
    ncertRef: "NCERT Example 12 (page 109)", isCompetencyBased: true },

  // ===== Section D — Long Answer (5 marks) =====
  { id: "AP-N-NCERT-5-LA-001", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term of AP", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "The sum of the 4th and 8th terms of an AP is 24 and the sum of the 6th and 10th terms is 44. Find the first three terms of the AP.",
    solutionSteps: ["a₄ + a₈ = 24 ⇒ (a + 3d) + (a + 7d) = 24 ⇒ 2a + 10d = 24 ⇒ a + 5d = 12 …(1).", "a₆ + a₁₀ = 44 ⇒ (a + 5d) + (a + 9d) = 44 ⇒ 2a + 14d = 44 ⇒ a + 7d = 22 …(2).", "Subtract (1) from (2): 2d = 10 ⇒ d = 5.", "Substitute in (1): a + 25 = 12 ⇒ a = −13.", "First three terms: a, a + d, a + 2d = −13, −8, −3."],
    finalAnswer: "First three terms: −13, −8, −3.",
    ncertRef: "NCERT Ex 5.2 Q18", isCompetencyBased: true,
    strategyHint: "Translate each statement into a + something·d, then solve simultaneously." },

  { id: "AP-N-NCERT-5-LA-002", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of n Terms", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A manufacturer of TV sets produced 600 sets in the third year and 700 sets in the seventh year. Assuming that the production increases uniformly by a fixed number every year, find (i) the production in the 1st year, (ii) the production in the 10th year, (iii) the total production in the first 7 years.",
    solutionSteps: ["Let aₙ denote production in the nth year. a₃ = 600 and a₇ = 700.", "a + 2d = 600 and a + 6d = 700. Subtract: 4d = 100 ⇒ d = 25.", "(i) a = 600 − 2 × 25 = 550. Production in year 1 = 550 sets.", "(ii) a₁₀ = a + 9d = 550 + 225 = 775 sets.", "(iii) S₇ = 7/2 [2 × 550 + 6 × 25] = 7/2 × 1250 = 4375 sets."],
    finalAnswer: "(i) 550 sets, (ii) 775 sets, (iii) 4375 sets in first 7 years.",
    ncertRef: "NCERT Example 16 (page 111)", isCompetencyBased: true },

  { id: "AP-N-NCERT-5-LA-003", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of n Terms", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A contract on a construction job specifies a penalty for delay of completion as ₹200 for the first day, ₹250 for the second day, ₹300 for the third day, etc., the penalty for each succeeding day being ₹50 more than for the preceding day. How much money must the contractor pay as penalty if the work is delayed by 30 days?",
    solutionSteps: ["Daily penalties form an AP: 200, 250, 300, …, with a = 200 and d = 50.", "Number of days n = 30.", "S₃₀ = 30/2 [2 × 200 + 29 × 50] = 15 [400 + 1450] = 15 × 1850.", "S₃₀ = 27750.", "Contractor pays ₹27,750 as penalty."],
    finalAnswer: "Total penalty = ₹27,750.",
    ncertRef: "NCERT Ex 5.3 Q15", isCompetencyBased: true },

  // ===== Section E — Case-Based (4 marks) =====
  { id: "AP-N-NCERT-5-CB-001", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of n Terms", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Shakila puts ₹100 into her daughter's money box on her 1st birthday and increases the deposit by ₹50 every birthday. So she deposits ₹100, ₹150, ₹200, …\n(i) Write the common difference of this AP.\n(ii) What does she deposit on the 21st birthday?\n(iii) Find the total money in the box after the 21st birthday.\n(iv) Is this AP finite or infinite in the context of the question?",
    solutionSteps: ["(i) d = 150 − 100 = 50.", "(ii) a₂₁ = a + 20d = 100 + 20 × 50 = 1100. She deposits ₹1100 on the 21st birthday.", "(iii) S₂₁ = 21/2 [2 × 100 + 20 × 50] = 21/2 × 1200 = 21 × 600 = ₹12,600.", "(iv) The AP is finite because deposits are made only up to the 21st birthday in this scenario."],
    finalAnswer: "(i) d = 50; (ii) ₹1100; (iii) ₹12,600; (iv) Finite.",
    ncertRef: "NCERT Section 5.4 (Shakila example)", isCompetencyBased: true,
    strategyHint: "Identify a and d, then apply the appropriate formula for each sub-part." },

  { id: "AP-N-NCERT-5-CB-002", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of n Terms", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "200 logs are stacked so that 20 logs are in the bottom row, 19 in the next row, 18 in the next, and so on.\n(i) Write the AP formed by the number of logs in successive rows.\n(ii) How many rows are needed to stack 200 logs?\n(iii) How many logs are in the top row?\n(iv) What is the common difference?",
    solutionSteps: ["(i) AP: 20, 19, 18, … with a = 20, d = −1.", "(ii) Sₙ = n/2 [2a + (n − 1)d] = n/2 [40 − (n − 1)] = n(41 − n)/2 = 200.", "⇒ n² − 41n + 400 = 0 ⇒ (n − 16)(n − 25) = 0. n = 16 (n = 25 makes the 25th term negative, so reject).", "(iii) a₁₆ = 20 + 15 × (−1) = 5 logs in the top row.", "(iv) d = −1."],
    finalAnswer: "(i) 20, 19, 18, …; (ii) 16 rows; (iii) 5 logs; (iv) d = −1.",
    ncertRef: "NCERT Ex 5.3 Q19", isCompetencyBased: true,
    strategyHint: "Use the smaller root of the quadratic in n; the larger root would force later terms to be negative." },

  // ===== Section A — Creating-level MCQ (real-world generalisation) =====
  { id: "AP-N-NCERT-5-CRE-001", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Word Problems on AP", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Creating",
    questionText: "Create an AP in which the 4th term is 15 and the sum of the first 8 terms is 100. List the first 8 terms.",
    solutionSteps: ["Let the AP have first term a and common difference d.", "a₄ = a + 3d = 15 …(1).", "S₈ = 8/2 [2a + 7d] = 4(2a + 7d) = 100 ⇒ 2a + 7d = 25 …(2).", "Solve (1) and (2): from (1) a = 15 − 3d; substitute: 2(15 − 3d) + 7d = 25 ⇒ 30 + d = 25 ⇒ d = −5; a = 30.", "The first 8 terms are 30, 25, 20, 15, 10, 5, 0, −5."],
    finalAnswer: "AP: 30, 25, 20, 15, 10, 5, 0, −5.",
    ncertRef: "NCERT-based design task", isCompetencyBased: true,
    strategyHint: "Translate each given constraint into an equation in a and d." },
];
