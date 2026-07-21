import type { CanonicalQuestion } from '../../../predictionTypes';

// Source: NCERT Class 10 Mathematics Exemplar — Chapter 5: Arithmetic Progressions
// topicKey: "arithmetic-progression"
// Extraction date: 2026-05-22
// Syllabus: CBSE 2026-27 (full chapter in scope)
// Coverage: Exemplar 5.1 MCQs, 5.2 Reasoning, 5.3 Short Answer, 5.4 Long Answer
//           + selected Sample Questions from the Exemplar book.

export const AP_EXEMPLAR: CanonicalQuestion[] = [
  // ===== Section A — MCQs (1 mark) =====
  { id: "AP-N-EXEM-5-MCQ-001", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term of AP", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "In an AP, if d = −4, n = 7 and aₙ = 4, then a is",
    options: ["6", "7", "20", "28"],
    answer: "28",
    solutionSteps: ["aₙ = a + (n − 1)d ⇒ 4 = a + 6 × (−4) ⇒ 4 = a − 24.", "a = 28."],
    finalAnswer: "28 — option (d).",
    ncertRef: "Exemplar Ex 5.1 Q1", isCompetencyBased: false },

  { id: "AP-N-EXEM-5-MCQ-002", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term of AP", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "In an AP, if a = 3.5, d = 0 and n = 101, then aₙ equals",
    options: ["0", "3.5", "103.5", "104.5"],
    answer: "3.5",
    solutionSteps: ["When d = 0, every term equals the first term.", "Hence a₁₀₁ = 3.5."],
    finalAnswer: "3.5 — option (b).",
    ncertRef: "Exemplar Ex 5.1 Q2", isCompetencyBased: false },

  { id: "AP-N-EXEM-5-MCQ-003", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Common Difference", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "The list of numbers −10, −6, −2, 2, … is",
    options: ["an AP with d = −16", "an AP with d = 4", "an AP with d = −4", "not an AP"],
    answer: "an AP with d = 4",
    solutionSteps: ["a₂ − a₁ = −6 − (−10) = 4. a₃ − a₂ = −2 − (−6) = 4. a₄ − a₃ = 2 − (−2) = 4.", "Common difference is 4 throughout, so it is an AP with d = 4."],
    finalAnswer: "an AP with d = 4 — option (b).",
    ncertRef: "Exemplar Ex 5.1 Q3", isCompetencyBased: false },

  { id: "AP-N-EXEM-5-MCQ-004", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term of AP", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If the 2nd term of an AP is 13 and the 5th term is 25, then the 7th term is",
    options: ["30", "33", "37", "38"],
    answer: "33",
    solutionSteps: ["a + d = 13 and a + 4d = 25. Subtract: 3d = 12 ⇒ d = 4. Hence a = 13 − 4 = 9.", "a₇ = a + 6d = 9 + 24 = 33."],
    finalAnswer: "33 — option (b).",
    ncertRef: "Exemplar Ex 5.1 Q7", isCompetencyBased: true },

  { id: "AP-N-EXEM-5-MCQ-005", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Difference of Terms", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "If the common difference of an AP is 5, then a₁₈ − a₁₃ is",
    options: ["5", "20", "25", "30"],
    answer: "25",
    solutionSteps: ["a₁₈ − a₁₃ = (a + 17d) − (a + 12d) = 5d.", "5d = 5 × 5 = 25."],
    finalAnswer: "25 — option (c).",
    ncertRef: "Exemplar Ex 5.1 Q9", isCompetencyBased: true },

  { id: "AP-N-EXEM-5-MCQ-006", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term of AP", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "If 7 times the 7th term of an AP is equal to 11 times its 11th term, then its 18th term is",
    options: ["7", "11", "18", "0"],
    answer: "0",
    solutionSteps: ["7(a + 6d) = 11(a + 10d) ⇒ 7a + 42d = 11a + 110d ⇒ −4a = 68d ⇒ a = −17d.", "a₁₈ = a + 17d = −17d + 17d = 0."],
    finalAnswer: "0 — option (d).",
    ncertRef: "Exemplar Ex 5.1 Q12", isCompetencyBased: true,
    strategyHint: "Rewrite each statement in (a, d) and set them equal." },

  { id: "AP-N-EXEM-5-MCQ-007", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of n Terms", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "The sum of the first 16 terms of the AP 10, 6, 2, … is",
    options: ["−320", "320", "−352", "−400"],
    answer: "−320",
    solutionSteps: ["a = 10, d = −4, n = 16.", "S₁₆ = 16/2 [2 × 10 + 15 × (−4)] = 8(20 − 60) = 8 × (−40) = −320."],
    finalAnswer: "−320 — option (a).",
    ncertRef: "Exemplar Ex 5.1 Q16", isCompetencyBased: false },

  { id: "AP-N-EXEM-5-MCQ-008", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of n Terms", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If the first term of an AP is −5 and the common difference is 2, then the sum of the first 6 terms is",
    options: ["0", "5", "6", "15"],
    answer: "0",
    solutionSteps: ["S₆ = 6/2 [2 × (−5) + 5 × 2] = 3(−10 + 10) = 3 × 0 = 0."],
    finalAnswer: "0 — option (a).",
    ncertRef: "Exemplar Ex 5.1 Q15", isCompetencyBased: true },

  // ===== Section A — Assertion-Reasoning (1 mark) =====
  { id: "AP-N-EXEM-5-AR-001", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Identification of AP", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Assertion (A): The numbers 2, 5, 10, 17, … form an AP.\nReason (R): If aₙ is a quadratic polynomial in n, then the list a₁, a₂, a₃, … is not an AP because consecutive differences are not constant.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(D) Assertion is false but Reason is true.",
    solutionSteps: ["Differences: 5 − 2 = 3, 10 − 5 = 5, 17 − 10 = 7. Not constant, so the list is NOT an AP. Hence A is false.", "aₙ = n² + 1 here, a quadratic in n; aₙ − aₙ₋₁ = 2n − 1 depends on n, so the list cannot be an AP — R is true.", "Therefore option (D)."],
    finalAnswer: "Option (D).",
    ncertRef: "Exemplar Sample Question 3 (page 48)", isCompetencyBased: true,
    strategyHint: "If aₙ is non-linear in n, the list is not an AP." },

  { id: "AP-N-EXEM-5-AR-002", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Compound Interest vs AP", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "Assertion (A): The amount at the end of every year on a deposit of ₹1000 at 10% per annum compound interest forms an AP.\nReason (R): In compound interest the amount grows by a fixed percentage each year, not by a fixed amount, so successive amounts differ by changing values.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(D) Assertion is false but Reason is true.",
    solutionSteps: ["Amounts: ₹1100, ₹1210, ₹1331, …. Differences: 110, 121, … — not constant.", "So the sequence is NOT an AP. A is false.", "R correctly explains why CI growth is not arithmetic. R is true.", "Hence (D)."],
    finalAnswer: "Option (D).",
    ncertRef: "Exemplar Sample Question 2 (page 47)", isCompetencyBased: true },

  // ===== Section B — Short Answer (2 marks) =====
  { id: "AP-N-EXEM-5-VSA-001", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Identification of AP", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Is 0, 2, 0, 2, … an AP? Justify your answer.",
    solutionSteps: ["a₂ − a₁ = 2 − 0 = 2.", "a₃ − a₂ = 0 − 2 = −2.", "Since a₂ − a₁ ≠ a₃ − a₂, the differences are not constant, so it is NOT an AP."],
    finalAnswer: "Not an AP — successive differences differ.",
    ncertRef: "Exemplar Ex 5.2 Q1(ii)", isCompetencyBased: false },

  { id: "AP-N-EXEM-5-VSA-002", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Recognising an AP", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Is 0 a term of the AP 31, 28, 25, …? Justify your answer.",
    solutionSteps: ["a = 31, d = −3. If aₙ = 0 then 31 + (n − 1)(−3) = 0 ⇒ (n − 1) × 3 = 31 ⇒ n − 1 = 31/3, which is not an integer.", "Since n must be a positive integer, 0 is NOT a term of the AP."],
    finalAnswer: "0 is not a term of the AP.",
    ncertRef: "Exemplar Ex 5.2 Q5", isCompetencyBased: true },

  { id: "AP-N-EXEM-5-VSA-003", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "AP from nth Term", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Is 2n − 3 the nth term of an AP? Justify your answer.",
    solutionSteps: ["aₙ = 2n − 3 ⇒ a₁ = −1, a₂ = 1, a₃ = 3, ….", "Common difference d = aₙ − aₙ₋₁ = 2, a constant.", "Yes, aₙ = 2n − 3 IS the nth term of an AP with a = −1 and d = 2."],
    finalAnswer: "Yes, AP with a = −1, d = 2.",
    ncertRef: "Exemplar Ex 5.2 Q8(i)", isCompetencyBased: true,
    strategyHint: "Linear expression in n always gives an AP." },

  // ===== Section C — Short Answer (3 marks) =====
  { id: "AP-N-EXEM-5-SA-001", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Consecutive Terms in AP", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If n − 2, 4n − 1 and 5n + 2 are in AP, find the value of n.",
    solutionSteps: ["In AP, the middle term × 2 = sum of extremes; equivalently consecutive differences are equal.", "(4n − 1) − (n − 2) = (5n + 2) − (4n − 1).", "3n + 1 = n + 3 ⇒ 2n = 2 ⇒ n = 1."],
    finalAnswer: "n = 1.",
    ncertRef: "Exemplar Sample Question 1 (page 50)", isCompetencyBased: true },

  { id: "AP-N-EXEM-5-SA-002", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Middle Term of AP", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the values of the middle-most terms of the AP −11, −7, −3, …, 49.",
    solutionSteps: ["a = −11, d = 4. aₙ = 49 ⇒ −11 + (n − 1) × 4 = 49 ⇒ (n − 1) × 4 = 60 ⇒ n = 16.", "Since n is even there are two middle terms: a₈ and a₉.", "a₈ = −11 + 7 × 4 = 17 and a₉ = −11 + 8 × 4 = 21."],
    finalAnswer: "Middle terms are 17 and 21.",
    ncertRef: "Exemplar Sample Question 2 (page 50)", isCompetencyBased: true },

  { id: "AP-N-EXEM-5-SA-003", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Three Terms in AP", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "The sum of the first three terms of an AP is 33. If the product of the first and third terms exceeds the second term by 29, find the AP.",
    solutionSteps: ["Let the three terms be a − d, a, a + d. Sum: 3a = 33 ⇒ a = 11.", "(a − d)(a + d) = a + 29 ⇒ a² − d² = a + 29 ⇒ 121 − d² = 40 ⇒ d² = 81 ⇒ d = ±9.", "So the AP is either 2, 11, 20, … (d = 9) or 20, 11, 2, … (d = −9)."],
    finalAnswer: "AP: 2, 11, 20, … or 20, 11, 2, ….",
    ncertRef: "Exemplar Sample Question 3 (page 51)", isCompetencyBased: true,
    strategyHint: "When three terms are in AP, let them be a − d, a, a + d." },

  { id: "AP-N-EXEM-5-SA-004", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term of AP", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Which term of the AP 53, 48, 43, … is the first negative term?",
    solutionSteps: ["a = 53, d = −5. aₙ < 0 ⇒ 53 + (n − 1)(−5) < 0 ⇒ 53 − 5n + 5 < 0 ⇒ 58 < 5n ⇒ n > 11.6.", "Smallest integer n satisfying this is 12.", "Check: a₁₂ = 53 + 11 × (−5) = 53 − 55 = −2 < 0. ✓"],
    finalAnswer: "12th term is the first negative term.",
    ncertRef: "Exemplar Ex 5.3 Q17", isCompetencyBased: true },

  { id: "AP-N-EXEM-5-SA-005", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of n Terms", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If Sₙ = 3n² + 5n is the sum of the first n terms of an AP and aₖ = 164, find k.",
    solutionSteps: ["aₙ = Sₙ − Sₙ₋₁ = (3n² + 5n) − [3(n − 1)² + 5(n − 1)].", "= 3n² + 5n − 3(n² − 2n + 1) − 5(n − 1) = 3n² + 5n − 3n² + 6n − 3 − 5n + 5 = 6n + 2.", "aₖ = 6k + 2 = 164 ⇒ 6k = 162 ⇒ k = 27."],
    finalAnswer: "k = 27.",
    ncertRef: "Exemplar Ex 5.3 Q25", isCompetencyBased: true,
    strategyHint: "Use aₙ = Sₙ − Sₙ₋₁ to extract the nth term from a sum formula." },

  { id: "AP-N-EXEM-5-SA-006", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Angles in AP", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The angles of a triangle are in AP. The greatest angle is twice the least. Find all the angles.",
    solutionSteps: ["Let the angles be a − d, a and a + d.", "Sum = 180° ⇒ 3a = 180° ⇒ a = 60°.", "Greatest = twice the least ⇒ (a + d) = 2(a − d) ⇒ 3d = a ⇒ d = 20°.", "Angles: 40°, 60°, 80°."],
    finalAnswer: "Angles are 40°, 60°, 80°.",
    ncertRef: "Exemplar Ex 5.3 Q13", isCompetencyBased: true },

  // ===== Section D — Long Answer (5 marks) =====
  { id: "AP-N-EXEM-5-LA-001", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Four Terms in AP", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "The sum of four consecutive numbers in an AP is 32 and the ratio of the product of the first and last to the product of the two middle terms is 7 : 15. Find the numbers.",
    solutionSteps: ["Let the four numbers be a − 3d, a − d, a + d, a + 3d.", "Sum: 4a = 32 ⇒ a = 8.", "Ratio: (a² − 9d²) / (a² − d²) = 7/15 ⇒ 15(64 − 9d²) = 7(64 − d²).", "960 − 135d² = 448 − 7d² ⇒ 512 = 128d² ⇒ d² = 4 ⇒ d = ±2.", "Taking d = 2: numbers are 2, 6, 10, 14."],
    finalAnswer: "Numbers are 2, 6, 10, 14 (or in reverse).",
    ncertRef: "Exemplar Sample Question 1 (page 54)", isCompetencyBased: true,
    strategyHint: "When four terms are in AP, let them be a − 3d, a − d, a + d, a + 3d for symmetry." },

  { id: "AP-N-EXEM-5-LA-002", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of n Terms", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Jaspal Singh repays a total loan of ₹1,18,000 by paying every month, starting with the first instalment of ₹1000, increasing by ₹100 every month. What amount will he pay in the 30th instalment? After paying the 30th instalment, how much loan does he still have to pay?",
    solutionSteps: ["[1 mark] The monthly instalments form an AP with first term a = 1000 and common difference d = 100.", "[1 mark] 30th instalment a₃₀ = a + 29d = 1000 + 29 × 100 = 1000 + 2900 = ₹3900.", "[1 mark] Total repaid in 30 instalments S₃₀ = (30/2)[2a + 29d] = 15[2 × 1000 + 29 × 100].", "[1 mark] S₃₀ = 15 × (2000 + 2900) = 15 × 4900 = ₹73,500.", "[1 mark] Loan still to be paid = 1,18,000 − 73,500 = ₹44,500."],
    finalAnswer: "30th instalment = ₹3900; loan still owed = ₹44,500.",
    ncertRef: "Exemplar Ex 5.4 Q9", isCompetencyBased: true },

  // ===== Section E — Case-Based (4 marks) =====
  { id: "AP-N-EXEM-5-CB-001", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of n Terms", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Yasmeen saves ₹32 in the first month, ₹36 in the second month, ₹40 in the third month, and so on, each month saving ₹4 more than the previous month.\n(i) Write the first term and common difference of this AP.\n(ii) Write Yasmeen's savings in the 12th month.\n(iii) In how many months will her total savings be ₹2000?\n(iv) What will be her saving in the 20th month?",
    solutionSteps: ["(i) a = 32, d = 4.", "(ii) a₁₂ = 32 + 11 × 4 = 32 + 44 = ₹76.", "(iii) Sₙ = n/2 [2 × 32 + (n − 1) × 4] = n/2 × (60 + 4n) = n(30 + 2n) = 2000. So 2n² + 30n − 2000 = 0 ⇒ n² + 15n − 1000 = 0. Using the quadratic formula n = [−15 ± √(225 + 4000)] / 2 = [−15 ± 65]/2. Taking n > 0: n = 25 months.", "(iv) a₂₀ = 32 + 19 × 4 = 32 + 76 = ₹108."],
    finalAnswer: "(i) a = 32, d = 4; (ii) ₹76; (iii) 25 months; (iv) ₹108.",
    ncertRef: "Exemplar Ex 5.3 Q35", isCompetencyBased: true },

  // ===== Creating-level question =====
  { id: "AP-N-EXEM-5-CRE-001", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Word Problems on AP", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Creating",
    questionText: "Design an AP modelling savings: the first term must be at least ₹50, the common difference must be a positive multiple of 5, and the sum of the first 10 terms must be exactly ₹1500. Write any one such AP and verify your design.",
    solutionSteps: ["Constraint: a ≥ 50, d is a positive multiple of 5, S₁₀ = 1500.", "S₁₀ = 10/2 [2a + 9d] = 5(2a + 9d) = 1500 ⇒ 2a + 9d = 300.", "Try d = 10: 2a + 90 = 300 ⇒ a = 105. So a = 105, d = 10 satisfies all constraints.", "Verify: S₁₀ = 5(210 + 90) = 5 × 300 = 1500. ✓ AP: 105, 115, 125, 135, 145, 155, 165, 175, 185, 195."],
    finalAnswer: "One valid AP: 105, 115, 125, …, 195 (a = 105, d = 10).",
    ncertRef: "Exemplar-style design task", isCompetencyBased: true,
    strategyHint: "Express S₁₀ formula, then pick d to make a an integer satisfying the bound." },
];
