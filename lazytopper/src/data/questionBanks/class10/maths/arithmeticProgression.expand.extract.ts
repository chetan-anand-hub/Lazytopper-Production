import type { CanonicalQuestion } from "../../../predictionTypes";

// Bank-Expansion Batch 10 — EXTRACT-MAX, topic arithmetic-progression, Sections A/B/C only.
// Sources (pymupdf): Content "13. Question Bank ... MCQ" Arithmetic Progressions.pdf;
//   gdrive "Chapter wise cbse online" Mcq/cbjemaco05.pdf + Previous year/cbjemacq05.pdf.
// Net-new only: deduped vs the 235 banked AP questions + within-set. GP/Sigma-n^2/AM-insertion
// out-of-syllabus items dropped. Every item genuinely distinct METHOD (not number-swap of a banked twin).

export const AP_EXPAND_EXTRACT: CanonicalQuestion[] = [
  // ===== Section A — MCQ / Assertion-Reasoning (1 mark) =====
  { id: "BX-AP-EX-A-001", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term of AP", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "If a, b, c, d, e, f are in AP, then e − c is equal to",
    options: ["2(d − c)", "2(c − a)", "(d − c)", "2(f − d)"],
    answer: "2(d − c)",
    solutionSteps: ["[1 mark] Consecutive terms differ by the common difference, so d − c = one common difference; e and c are two positions apart, hence e − c = 2(d − c)."],
    finalAnswer: "2(d − c).",
    isCompetencyBased: true },

  { id: "BX-AP-EX-A-002", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term of AP", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The first term of an AP is p and its common difference is q. Its 10th term is",
    options: ["p + 9q", "q + 9p", "9q − p", "2p + 9q"],
    answer: "p + 9q",
    solutionSteps: ["[1 mark] a₁₀ = a + 9d = p + 9q."],
    finalAnswer: "p + 9q.",
    isCompetencyBased: false },

  { id: "BX-AP-EX-A-003", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term of AP", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The 7th term of an AP is −1 and its 16th term is 17. The nth term of the AP is",
    options: ["2n − 15", "4n − 7", "15 − 2n", "3n + 8"],
    answer: "2n − 15",
    solutionSteps: ["[1 mark] a₁₆ − a₇ = 9d = 18 ⇒ d = 2, a = a₇ − 6d = −1 − 12 = −13, so aₙ = −13 + (n − 1)·2 = 2n − 15."],
    finalAnswer: "aₙ = 2n − 15.",
    isCompetencyBased: true },

  { id: "BX-AP-EX-A-004", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of n Terms", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The sum of 11 terms of an AP whose middle term is 30 is",
    options: ["330", "320", "340", "350"],
    answer: "330",
    solutionSteps: ["[1 mark] For an odd number of terms, Sₙ = n × (middle term) = 11 × 30 = 330."],
    finalAnswer: "330.",
    isCompetencyBased: true },

  { id: "BX-AP-EX-A-005", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Properties of AP", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Assertion (A): If the positive numbers a, b, c are in AP, then 1/(bc), 1/(ca), 1/(ab) are also in AP.\nReason (R): If each term of an AP is divided by the same non-zero constant, the resulting sequence is also an AP.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    solutionSteps: ["[1 mark] Dividing the AP a, b, c by abc gives 1/(bc), 1/(ca), 1/(ab), which is therefore an AP — so A is true and R (dividing an AP by a constant keeps it an AP) is the correct explanation."],
    finalAnswer: "Option (A).",
    isCompetencyBased: true },

  // ===== Section B — Short answer (2 marks) =====
  { id: "BX-AP-EX-B-001", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term of AP", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the 37th term of the AP: x, 3x, 5x, ...",
    answer: "73x",
    solutionSteps: ["[1 mark] a = x, d = 3x − x = 2x.", "[1 mark] a₃₇ = a + 36d = x + 36(2x) = x + 72x = 73x."],
    finalAnswer: "a₃₇ = 73x.",
    isCompetencyBased: false },

  { id: "BX-AP-EX-B-002", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term of AP", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The 5th term of an AP is 20 and the sum of its 7th and 11th terms is 64. Find the common difference.",
    answer: "d = 3",
    solutionSteps: ["[1 mark] a + 4d = 20; (a + 6d) + (a + 10d) = 64 ⇒ 2a + 16d = 64 ⇒ a + 8d = 32.", "[1 mark] Subtracting, 4d = 12 ⇒ d = 3."],
    finalAnswer: "d = 3.",
    isCompetencyBased: false },

  { id: "BX-AP-EX-B-006", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Consecutive Terms in AP", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "For what value of k are 2k + 1, 3k + 3 and 5k − 1 consecutive terms of an AP?",
    answer: "k = 6",
    solutionSteps: ["[1 mark] For an AP the middle term is the mean: 2(3k + 3) = (2k + 1) + (5k − 1).", "[1 mark] 6k + 6 = 7k ⇒ k = 6."],
    finalAnswer: "k = 6.",
    isCompetencyBased: true },

  { id: "BX-AP-EX-B-007", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term of AP", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Determine the AP whose 3rd term is 9 and in which the 5th term subtracted from the 8th term gives 6.",
    answer: "5, 7, 9, 11, ...",
    solutionSteps: ["[1 mark] a₈ − a₅ = 3d = 6 ⇒ d = 2; and a + 2d = 9.", "[1 mark] a + 4 = 9 ⇒ a = 5, so the AP is 5, 7, 9, 11, ..."],
    finalAnswer: "AP: 5, 7, 9, 11, ...",
    isCompetencyBased: false },

  // ===== Section C — Short answer (3 marks) =====
  { id: "BX-AP-EX-C-001", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term of AP", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "If five times the 5th term of an AP is equal to eight times its 8th term, show that its 13th term is zero.",
    answer: "a₁₃ = 0 (proved)",
    solutionSteps: ["[1 mark] 5a₅ = 8a₈ ⇒ 5(a + 4d) = 8(a + 7d).", "[1 mark] 5a + 20d = 8a + 56d ⇒ 3a + 36d = 0 ⇒ a + 12d = 0.", "[1 mark] a₁₃ = a + 12d = 0. Hence proved."],
    finalAnswer: "a₁₃ = 0.",
    isCompetencyBased: false },

  { id: "BX-AP-EX-C-002", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term of AP", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "The 8th term of an AP is zero. Prove that its 38th term is triple its 18th term.",
    answer: "a₃₈ = 3·a₁₈ (proved)",
    solutionSteps: ["[1 mark] a₈ = 0 ⇒ a + 7d = 0 ⇒ a = −7d.", "[1 mark] a₃₈ = a + 37d = −7d + 37d = 30d; a₁₈ = a + 17d = −7d + 17d = 10d.", "[1 mark] a₃₈ = 30d = 3(10d) = 3·a₁₈. Hence proved."],
    finalAnswer: "a₃₈ = 3·a₁₈.",
    isCompetencyBased: false },

  { id: "BX-AP-EX-C-003", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term of AP", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "The 9th term of an AP is equal to seven times its 2nd term, and its 12th term exceeds five times its 3rd term by 2. Find the first term and the common difference.",
    answer: "a = 1, d = 6",
    solutionSteps: ["[1 mark] a₉ = 7a₂ ⇒ a + 8d = 7(a + d) ⇒ 6a − d = 0.", "[1 mark] a₁₂ = 5a₃ + 2 ⇒ a + 11d = 5(a + 2d) + 2 ⇒ 4a − d = −2.", "[1 mark] Subtracting, 2a = 2 ⇒ a = 1, and d = 6a = 6."],
    finalAnswer: "a = 1, d = 6.",
    isCompetencyBased: false },

  { id: "BX-AP-EX-C-004", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Consecutive Terms in AP", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "The sum of three numbers in AP is 12 and the sum of their cubes is 288. Find the numbers.",
    answer: "2, 4, 6 (or 6, 4, 2)",
    solutionSteps: ["[1 mark] Take the numbers as a − d, a, a + d; their sum 3a = 12 ⇒ a = 4.", "[1 mark] (4 − d)³ + 4³ + (4 + d)³ = 288 ⇒ 192 + 24d² = 288 ⇒ d² = 4 ⇒ d = ±2.", "[1 mark] The numbers are 2, 4, 6 (or 6, 4, 2)."],
    finalAnswer: "2, 4, 6.",
    isCompetencyBased: true },

  { id: "BX-AP-EX-C-005", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Application Problems", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "The digits of a three-digit positive number are in AP and their sum is 15. The number obtained by reversing the digits is 594 less than the original number. Find the number.",
    answer: "852",
    solutionSteps: ["[1 mark] Let the digits be a − d, a, a + d; their sum 3a = 15 ⇒ a = 5, so the middle (tens) digit is 5.", "[1 mark] For a 3-digit number, original − reversed = 99 × (hundreds digit − units digit). Since the original is larger, hundreds = a + d and units = a − d, so 99[(a + d) − (a − d)] = 99·2d = 594 ⇒ d = 3.", "[1 mark] Hundreds = a + d = 8, tens = 5, units = a − d = 2, giving 852 (check: 852 − 258 = 594)."],
    finalAnswer: "852.",
    isCompetencyBased: true },

  { id: "BX-AP-EX-C-006", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Common Terms of two APs", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "How many terms are common to the two APs 17, 21, 25, ..., 417 and 16, 21, 26, ..., 466?",
    answer: "20 common terms",
    solutionSteps: ["[1 mark] Common terms recur at the LCM of the two common differences (4 and 5), i.e. every 20; the first common term is 21, so common terms are 21, 41, 61, ...", "[1 mark] The common terms must not exceed the smaller last term 417: aₙ = 21 + (n − 1)20 ≤ 417.", "[1 mark] (n − 1)20 ≤ 396 ⇒ n − 1 ≤ 19.8 ⇒ n = 20 common terms."],
    finalAnswer: "20 common terms.",
    isCompetencyBased: true },

  { id: "BX-AP-EX-C-007", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of n Terms", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The sum of the first 7 terms of an AP is 63 and the sum of its next 7 terms is 161. Find the 28th term of the AP.",
    answer: "a₂₈ = 57",
    solutionSteps: ["[1 mark] S₇ = 63 ⇒ (7/2)(2a + 6d) = 63 ⇒ a + 3d = 9.", "[1 mark] S₁₄ = 63 + 161 = 224 ⇒ (14/2)(2a + 13d) = 224 ⇒ 2a + 13d = 32; solving with a + 3d = 9 gives d = 2, a = 3.", "[1 mark] a₂₈ = a + 27d = 3 + 54 = 57."],
    finalAnswer: "a₂₈ = 57.",
    isCompetencyBased: false },

  { id: "BX-AP-EX-C-008", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of n Terms", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "In an AP of 50 terms, the sum of the first 10 terms is 210 and the sum of its last 15 terms is 2565. Find the AP.",
    answer: "3, 7, 11, ...",
    solutionSteps: ["[1 mark] S₁₀ = 210 ⇒ (10/2)(2a + 9d) = 210 ⇒ 2a + 9d = 42.", "[1 mark] Last 15 terms = S₅₀ − S₃₅ = (25)(2a + 49d) − (35/2)(2a + 34d) = 2565, which simplifies to a + 42d = 171.", "[1 mark] Solving 2a + 9d = 42 and a + 42d = 171 gives a = 3, d = 4, so the AP is 3, 7, 11, ..."],
    finalAnswer: "AP: 3, 7, 11, ...",
    isCompetencyBased: false },

  { id: "BX-AP-EX-C-009", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Consecutive Terms in AP", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Four numbers are in AP. Their sum is 50 and the greatest number is 4 times the least. Find the numbers.",
    answer: "5, 10, 15, 20",
    solutionSteps: ["[1 mark] Take the four terms as a − 3d, a − d, a + d, a + 3d; their sum 4a = 50 ⇒ a = 25/2.", "[1 mark] Greatest = 4 × least ⇒ (a + 3d) = 4(a − 3d) ⇒ 15d = 3a ⇒ d = a/5 = 5/2.", "[1 mark] The numbers are 25/2 − 15/2, 25/2 − 5/2, 25/2 + 5/2, 25/2 + 15/2 = 5, 10, 15, 20."],
    finalAnswer: "5, 10, 15, 20.",
    isCompetencyBased: true },

  { id: "BX-AP-EX-C-010", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of n Terms", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "The 14th term of an AP is twice its 8th term and its 6th term is −8. Find the sum of its first 20 terms.",
    answer: "S₂₀ = −340",
    solutionSteps: ["[1 mark] a₁₄ = 2a₈ ⇒ a + 13d = 2(a + 7d) ⇒ a + d = 0 ⇒ a = −d.", "[1 mark] a₆ = −8 ⇒ a + 5d = −8 ⇒ 4d = −8 ⇒ d = −2, a = 2.", "[1 mark] S₂₀ = (20/2)[2(2) + 19(−2)] = 10(4 − 38) = −340."],
    finalAnswer: "S₂₀ = −340.",
    isCompetencyBased: false },

  { id: "BX-AP-EX-C-011", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of n Terms", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "The 16th term of an AP is five times its 3rd term. If its 10th term is 41, find the sum of its first 15 terms.",
    answer: "S₁₅ = 495",
    solutionSteps: ["[1 mark] a₁₆ = 5a₃ ⇒ a + 15d = 5(a + 2d) ⇒ 4a = 5d.", "[1 mark] a₁₀ = 41 ⇒ a + 9d = 41; with a = 5d/4 gives (41d)/4 = 41 ⇒ d = 4, a = 5.", "[1 mark] S₁₅ = (15/2)[2(5) + 14(4)] = (15/2)(66) = 495."],
    finalAnswer: "S₁₅ = 495.",
    isCompetencyBased: false },
];
