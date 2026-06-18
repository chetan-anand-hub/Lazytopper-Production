import type { CanonicalQuestion } from '../../../predictionTypes';

// =============================================================================
// Source: NCERT Class 10 Mathematics Exemplar — Chapter 5 (Arithmetic Progressions)
// PDF file used: jeep205.pdf (Exemplar) · Answer key cross-checked vs jeep2an.pdf
// topicKey: "arithmetic-progression"
// Extraction date: 2026-06-18 · Bank-Expansion Phase 1, Batch 1.
//
// PROVENANCE / THE DECOUPLE:
//   • QUESTION text = AUTHENTIC, extracted verbatim from the Exemplar PDF
//     (pymupdf sort=True + ftfy). Math notation reconstructed ONLY where the
//     PDF flattened it; every reconstructed item is marked `// ⚠ RECON` for the
//     owner's fidelity spot-check (Q3 fidelity guardrail).
//   • SOLUTION = AI-GENERATED, step-marked, PENDING OWNER VERIFICATION.
//     solutionSource: "ai-generated" for EVERY id in this file (all ids are
//     registered in AI_GENERATED_SOLUTION_IDS in canonicalQuestionBank.ts).
//     Each finalAnswer was cross-checked against the official Exemplar answer
//     key (jeep2an.pdf) — but the WORKED STEPS are AI and the owner
//     (examiner-of-record) must verify them before merge.
//
// Net-new only: deduped against repo (existing AP refs Ex5.1 Q1,2,3,7,9,12,15,16;
//   Ex5.2 Q1(ii),Q5,Q8(i); Ex5.3 Q13,17,25,35; Ex5.4 Q9 are NOT repeated here).
// Syllabus: AP is fully in-syllabus (CBSE 2026-27) — no banned subtopics.
// solutionSteps: every step is `[N mark]`-prefixed and the prefixes sum to marks.
// =============================================================================

export const AP_EXEMPLAR2: CanonicalQuestion[] = [
  // ===== Section A — MCQs (Exercise 5.1, 1 mark) =====
  // ⚠ RECON: terms −5, −5/2, 0, 5/2 — fractions reconstructed from flattened PDF text.
  { id: "AP-N-EXEM2-5-MCQ-001", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term of an AP", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The 11th term of the AP: −5, −5/2, 0, 5/2, ... is",
    options: ["−20", "20", "−30", "30"],
    answer: "20",
    solutionSteps: ["[1 mark] Here a = −5 and d = −5/2 − (−5) = 5/2; so a₁₁ = a + 10d = −5 + 10 × (5/2) = −5 + 25 = 20 — option (B)."],
    finalAnswer: "20 — option (B).",
    ncertRef: "Exemplar Ex 5.1 Q4", isCompetencyBased: false },

  { id: "AP-N-EXEM2-5-MCQ-002", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "First Few Terms of an AP", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "The first four terms of an AP, whose first term is −2 and the common difference is −2, are",
    options: ["−2, 0, 2, 4", "−2, 4, −8, 16", "−2, −4, −6, −8", "−2, −4, −8, −16"],
    answer: "−2, −4, −6, −8",
    solutionSteps: ["[1 mark] Adding d = −2 successively to a = −2 gives −2, −4, −6, −8 — option (C)."],
    finalAnswer: "−2, −4, −6, −8 — option (C).",
    ncertRef: "Exemplar Ex 5.1 Q5", isCompetencyBased: false },

  { id: "AP-N-EXEM2-5-MCQ-003", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term of an AP", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The 21st term of the AP whose first two terms are −3 and 4 is",
    options: ["17", "137", "143", "−143"],
    answer: "137",
    solutionSteps: ["[1 mark] a = −3, d = 4 − (−3) = 7, so a₂₁ = a + 20d = −3 + 20 × 7 = 137 — option (B)."],
    finalAnswer: "137 — option (B).",
    ncertRef: "Exemplar Ex 5.1 Q6", isCompetencyBased: false },

  { id: "AP-N-EXEM2-5-MCQ-004", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Finding the Term Number", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Which term of the AP: 21, 42, 63, 84, ... is 210?",
    options: ["9th", "10th", "11th", "12th"],
    answer: "10th",
    solutionSteps: ["[1 mark] a = 21, d = 21, so aₙ = 21n; setting 21n = 210 gives n = 10, i.e. the 10th term — option (B)."],
    finalAnswer: "10th term — option (B).",
    ncertRef: "Exemplar Ex 5.1 Q8", isCompetencyBased: false },

  { id: "AP-N-EXEM2-5-MCQ-005", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Common Difference", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "What is the common difference of an AP in which a₁₈ − a₁₄ = 32?",
    options: ["8", "−8", "−4", "4"],
    answer: "8",
    solutionSteps: ["[1 mark] a₁₈ − a₁₄ = (18 − 14)d = 4d = 32, so d = 8 — option (A)."],
    finalAnswer: "8 — option (A).",
    ncertRef: "Exemplar Ex 5.1 Q10", isCompetencyBased: false },

  { id: "AP-N-EXEM2-5-MCQ-006", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Difference of Corresponding Terms", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Two APs have the same common difference. The first term of one of these is −1 and that of the other is −8. Then the difference between their 4th terms is",
    options: ["−1", "−8", "7", "−9"],
    answer: "7",
    solutionSteps: ["[1 mark] The 4th terms are (−1 + 3d) and (−8 + 3d); their difference is (−1 + 3d) − (−8 + 3d) = −1 + 8 = 7 — option (C)."],
    finalAnswer: "7 — option (C).",
    ncertRef: "Exemplar Ex 5.1 Q11", isCompetencyBased: true },

  { id: "AP-N-EXEM2-5-MCQ-007", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term from the End", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The 4th term from the end of the AP: −11, −8, −5, ..., 49 is",
    options: ["37", "40", "43", "58"],
    answer: "40",
    solutionSteps: ["[1 mark] With last term l = 49 and d = 3, the kth term from the end is l − (k − 1)d; the 4th from the end = 49 − 3 × 3 = 40 — option (B)."],
    finalAnswer: "40 — option (B).",
    ncertRef: "Exemplar Ex 5.1 Q13", isCompetencyBased: false },

  { id: "AP-N-EXEM2-5-MCQ-008", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "AP in History of Mathematics", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "The famous mathematician associated with finding the sum of the first 100 natural numbers is",
    options: ["Pythagoras", "Newton", "Gauss", "Euclid"],
    answer: "Gauss",
    solutionSteps: ["[1 mark] Carl Friedrich Gauss is credited with quickly summing 1 + 2 + ... + 100 = 5050 by pairing terms — option (C)."],
    finalAnswer: "Gauss — option (C).",
    ncertRef: "Exemplar Ex 5.1 Q14", isCompetencyBased: false },

  { id: "AP-N-EXEM2-5-MCQ-009", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Number of Terms from Sum", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "In an AP if a = 1, aₙ = 20 and Sₙ = 399, then n is",
    options: ["19", "21", "38", "42"],
    answer: "38",
    solutionSteps: ["[1 mark] Sₙ = (n/2)(a + aₙ) ⇒ 399 = (n/2)(1 + 20) = 21n/2, so n = 798/21 = 38 — option (C)."],
    finalAnswer: "38 — option (C).",
    ncertRef: "Exemplar Ex 5.1 Q17", isCompetencyBased: false },

  { id: "AP-N-EXEM2-5-MCQ-010", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of an AP", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "The sum of first five multiples of 3 is",
    options: ["45", "55", "65", "75"],
    answer: "45",
    solutionSteps: ["[1 mark] The first five multiples of 3 are 3, 6, 9, 12, 15; their sum = (5/2)(3 + 15) = 45 — option (A)."],
    finalAnswer: "45 — option (A).",
    ncertRef: "Exemplar Ex 5.1 Q18", isCompetencyBased: false },

  // ===== Section B — Short Answer with Reasoning (Exercise 5.2, 2 marks) =====
  // ⚠ RECON: terms −1, −3/2, −2, 5/2 — signs/fractions reconstructed (the published
  //          answer "False, a₄−a₃ ≠ a₃−a₂" confirms the 4th term is +5/2, not −5/2).
  { id: "AP-N-EXEM2-5-VSA-001", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Test for an AP", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "Justify whether it is true to say that −1, −3/2, −2, 5/2, ... forms an AP as a₂ − a₁ = a₃ − a₂.",
    solutionSteps: ["[1 mark] a₂ − a₁ = −3/2 − (−1) = −1/2 and a₃ − a₂ = −2 − (−3/2) = −1/2, so the first two differences are equal — but equality of only these does not make a list an AP.", "[1 mark] a₄ − a₃ = 5/2 − (−2) = 9/2 ≠ −1/2, so the differences are not all equal; hence the statement is false."],
    finalAnswer: "False — a₄ − a₃ = 9/2 ≠ a₃ − a₂, so it is not an AP.",
    ncertRef: "Exemplar Ex 5.2 Q2", isCompetencyBased: true },

  { id: "AP-N-EXEM2-5-VSA-002", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Difference of Terms without Computing Them", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "For the AP: −3, −7, −11, ..., can we find directly a₃₀ − a₂₀ without actually finding a₃₀ and a₂₀? Give reasons for your answer.",
    solutionSteps: ["[1 mark] Yes. For any AP, aₘ − aₙ = (m − n)d, which uses only the common difference.", "[1 mark] Here d = −7 − (−3) = −4, so a₃₀ − a₂₀ = (30 − 20)(−4) = 10 × (−4) = −40."],
    finalAnswer: "Yes; a₃₀ − a₂₀ = 10d = −40.",
    ncertRef: "Exemplar Ex 5.2 Q3", isCompetencyBased: true },

  { id: "AP-N-EXEM2-5-VSA-003", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Difference of Corresponding Terms", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Two APs have the same common difference. The first term of one AP is 2 and that of the other is 7. The difference between their 10th terms is the same as the difference between their 21st terms, which is the same as the difference between any two corresponding terms. Why?",
    solutionSteps: ["[1 mark] The nth terms are (2 + (n − 1)d) and (7 + (n − 1)d); their difference is (7 + (n − 1)d) − (2 + (n − 1)d) = 7 − 2 = 5, independent of n.", "[1 mark] So every pair of corresponding terms differs by 5 — exactly the difference of the first terms — which is why the 10th, 21st and all corresponding differences are equal."],
    finalAnswer: "Because the difference of corresponding terms equals the difference of first terms (7 − 2 = 5) for every n.",
    ncertRef: "Exemplar Ex 5.2 Q4", isCompetencyBased: true },

  // ===== Section C — Short Answer (Exercise 5.3, 3 marks) =====
  { id: "AP-N-EXEM2-5-SA-001", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Unknowns in an AP", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find a, b and c such that the following numbers are in AP: a, 7, b, 23, c.",
    solutionSteps: ["[1 mark] Since 7, b, 23 are consecutive AP terms, b is their average: b = (7 + 23)/2 = 15, and the common difference d = 23 − b = 8.", "[1 mark] a = 7 − d = 7 − 8 = −1.", "[1 mark] c = 23 + d = 23 + 8 = 31."],
    finalAnswer: "a = −1, b = 15, c = 31.",
    ncertRef: "Exemplar Ex 5.3 Q4", isCompetencyBased: true },

  // ⚠ RECON: last term −1/5 reconstructed from flattened PDF text (answer key d = −1/5, n = 27 confirms).
  { id: "AP-N-EXEM2-5-SA-002", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Common Difference and Number of Terms", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "The 26th, 11th and the last term of an AP are 0, 3 and −1/5, respectively. Find the common difference and the number of terms.",
    solutionSteps: ["[1 mark] a₂₆ − a₁₁ = 15d = 0 − 3 = −3, so d = −1/5.", "[1 mark] a₁₁ = a + 10d = 3 ⇒ a = 3 − 10(−1/5) = 3 + 2 = 5.", "[1 mark] Last term = a + (n − 1)d = −1/5 ⇒ 5 + (n − 1)(−1/5) = −1/5 ⇒ (n − 1)(−1/5) = −26/5 ⇒ n − 1 = 26 ⇒ n = 27."],
    finalAnswer: "d = −1/5 and n = 27.",
    ncertRef: "Exemplar Ex 5.3 Q6", isCompetencyBased: true },

  { id: "AP-N-EXEM2-5-SA-003", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Splitting a Number into AP", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Split 207 into three parts such that these are in AP and the product of the two smaller parts is 4623.",
    solutionSteps: ["[1 mark] Let the three parts be a − d, a, a + d; their sum is 3a = 207, so a = 69.", "[1 mark] The two smaller parts are a − d and a, with product a(a − d) = 4623 ⇒ 69(69 − d) = 4623 ⇒ 69 − d = 67 ⇒ d = 2.", "[1 mark] So the three parts are 67, 69, 71 (check: 67 × 69 = 4623)."],
    finalAnswer: "67, 69, 71.",
    ncertRef: "Exemplar Ex 5.3 Q12", isCompetencyBased: true },

  { id: "AP-N-EXEM2-5-SA-004", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Equal Terms of Two APs", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If the nth terms of the two APs: 9, 7, 5, ... and 24, 21, 18, ... are the same, find the value of n. Also find that term.",
    solutionSteps: ["[1 mark] First AP: a = 9, d = −2 ⇒ aₙ = 9 − 2(n − 1) = 11 − 2n.", "[1 mark] Second AP: a = 24, d = −3 ⇒ aₙ = 24 − 3(n − 1) = 27 − 3n.", "[1 mark] Equate: 11 − 2n = 27 − 3n ⇒ n = 16; the term = 11 − 2(16) = −21."],
    finalAnswer: "n = 16; the common term is −21.",
    ncertRef: "Exemplar Ex 5.3 Q14", isCompetencyBased: true },

  { id: "AP-N-EXEM2-5-SA-005", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Term from the End", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the 12th term from the end of the AP: −2, −4, −6, ..., −100.",
    solutionSteps: ["[1 mark] Reading from the end, the terms are −100, −98, −96, ... increasing by 2 (i.e. common difference −d = 2).", "[1 mark] The kth term from the end is l + (k − 1)(−d) = −100 + (k − 1)(2).", "[1 mark] For k = 12: −100 + 11 × 2 = −100 + 22 = −78."],
    finalAnswer: "−78.",
    ncertRef: "Exemplar Ex 5.3 Q16", isCompetencyBased: true },

  { id: "AP-N-EXEM2-5-SA-006", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Number of Terms and Common Difference", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The first term of an AP is −5 and the last term is 45. If the sum of the terms of the AP is 120, then find the number of terms and the common difference.",
    solutionSteps: ["[1 mark] Sₙ = (n/2)(a + l) ⇒ 120 = (n/2)(−5 + 45) = 20n, so n = 6.", "[1 mark] l = a + (n − 1)d ⇒ 45 = −5 + 5d ⇒ 5d = 50.", "[1 mark] d = 10."],
    finalAnswer: "n = 6 and d = 10.",
    ncertRef: "Exemplar Ex 5.3 Q20", isCompetencyBased: true },

  { id: "AP-N-EXEM2-5-SA-007", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "AP from Sum Formula", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "In an AP, if Sₙ = n(4n + 1), find the AP.",
    solutionSteps: ["[1 mark] aₙ = Sₙ − Sₙ₋₁ = n(4n + 1) − (n − 1)(4(n − 1) + 1) = (4n² + n) − (4n² − 7n + 3).", "[1 mark] Simplify: aₙ = 8n − 3.", "[1 mark] So a₁ = 5, a₂ = 13, a₃ = 21; the AP is 5, 13, 21, ..."],
    finalAnswer: "5, 13, 21, ... (aₙ = 8n − 3).",
    ncertRef: "Exemplar Ex 5.3 Q24", isCompetencyBased: true },

  { id: "AP-N-EXEM2-5-SA-008", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of Last Terms", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Find the sum of last ten terms of the AP: 8, 10, 12, ..., 126.",
    solutionSteps: ["[1 mark] Reading from the end, the last ten terms are 126, 124, 122, ... with common difference −2.", "[1 mark] The tenth of these is 126 − 9 × 2 = 108.", "[1 mark] Sum = (10/2)(126 + 108) = 5 × 234 = 1170."],
    finalAnswer: "1170.",
    ncertRef: "Exemplar Ex 5.3 Q30", isCompetencyBased: true },

  // ===== Section D — Long Answer (Exercise 5.4, 5 marks) =====
  { id: "AP-N-EXEM2-5-LA-001", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of an AP", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "The sum of the first five terms of an AP and the sum of the first seven terms of the same AP is 167. If the sum of the first ten terms of this AP is 235, find the sum of its first twenty terms.",
    solutionSteps: ["[1 mark] S₅ = (5/2)(2a + 4d) = 5(a + 2d) and S₇ = (7/2)(2a + 6d) = 7(a + 3d).", "[1 mark] S₅ + S₇ = (5a + 10d) + (7a + 21d) = 12a + 31d = 167.", "[1 mark] S₁₀ = (10/2)(2a + 9d) = 10a + 45d = 235, i.e. 2a + 9d = 47.", "[1 mark] Solve 12a + 31d = 167 with 2a + 9d = 47 (×6 ⇒ 12a + 54d = 282): subtract to get 23d = 115 ⇒ d = 5, then a = 1.", "[1 mark] S₂₀ = (20/2)(2a + 19d) = 10(2 + 95) = 970."],
    finalAnswer: "S₂₀ = 970.",
    ncertRef: "Exemplar Ex 5.4 Q1", isCompetencyBased: true },

  { id: "AP-N-EXEM2-5-LA-002", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Middle and Last Terms", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "An AP consists of 37 terms. The sum of the three middle most terms is 225 and the sum of the last three is 429. Find the AP.",
    solutionSteps: ["[1 mark] With 37 terms the middle term is the 19th; the three middle terms are a₁₈, a₁₉, a₂₀ with sum 3a₁₉ = 225, so a₁₉ = 75, i.e. a + 18d = 75.", "[1 mark] The last three terms a₃₅, a₃₆, a₃₇ have sum 3a₃₆ = 429, so a₃₆ = 143, i.e. a + 35d = 143.", "[1 mark] Subtract the two equations: 17d = 68.", "[1 mark] d = 4, and a = 75 − 18 × 4 = 3.", "[1 mark] The AP is 3, 7, 11, 15, ..."],
    finalAnswer: "3, 7, 11, 15, ... (a = 3, d = 4).",
    ncertRef: "Exemplar Ex 5.4 Q4", isCompetencyBased: true },

  { id: "AP-N-EXEM2-5-LA-003", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Solving an AP Equation", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Solve the equation: −4 + (−1) + 2 + ... + x = 437.",
    solutionSteps: ["[1 mark] The left side is an AP with a = −4 and d = 3, with last term x = aₙ.", "[1 mark] Sₙ = (n/2)(2a + (n − 1)d) = (n/2)(−8 + 3(n − 1)) = (n/2)(3n − 11) = 437.", "[1 mark] So n(3n − 11) = 874, i.e. 3n² − 11n − 874 = 0.", "[1 mark] n = (11 + √(121 + 10488))/6 = (11 + √10609)/6 = (11 + 103)/6 = 19 (reject the negative root).", "[1 mark] x = a + (n − 1)d = −4 + 18 × 3 = 50."],
    finalAnswer: "x = 50 (with n = 19 terms).",
    ncertRef: "Exemplar Ex 5.4 Q8", isCompetencyBased: true },
];
