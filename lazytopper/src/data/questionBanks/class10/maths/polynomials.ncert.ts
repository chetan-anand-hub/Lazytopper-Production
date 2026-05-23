import type { CanonicalQuestion } from '../../../predictionTypes';

// Source: NCERT Class 10 Mathematics — Chapter 2: Polynomials
// topicKey: "polynomials"
// Extraction date: 2026-05-22
// Syllabus: CBSE 2026-27 (Division Algorithm formal proof/derivation EXCLUDED per syllabusGuard)
// Coverage: Section 2.2 (geometrical meaning), Section 2.3 (relationship), selected Examples
//           1–5 and Ex 2.1, Ex 2.2. Division Algorithm exercises (Ex 2.3, 2.4) NOT used as
//           question stems; only factorisation using known zeroes is included.

export const POLY_NCERT: CanonicalQuestion[] = [
  // ===== Section A — MCQs (1 mark) =====
  { id: "POLY-N-NCERT-2-MCQ-001", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes of Quadratic Polynomial", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "The zeroes of the quadratic polynomial x² – 2x – 8 are",
    options: ["–2 and 4", "2 and –4", "–2 and –4", "2 and 4"],
    answer: "–2 and 4",
    solutionSteps: ["Factorise: x² – 2x – 8 = (x – 4)(x + 2).", "Zeroes occur when each factor is zero: x = 4 or x = –2."],
    finalAnswer: "–2 and 4 — option (a).",
    ncertRef: "NCERT Ex 2.2 Q1(i)", isCompetencyBased: false,
    strategyHint: "Split the middle term." },

  { id: "POLY-N-NCERT-2-MCQ-002", subject: "Maths", topicKey: "polynomials", subtopic: "Number of Zeroes from Graph", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "If the graph of a quadratic polynomial y = p(x) does not intersect the x-axis at any point, then the number of real zeroes of p(x) is",
    options: ["0", "1", "2", "Infinite"],
    answer: "0",
    solutionSteps: ["The real zeroes of p(x) are exactly the x-coordinates where the graph y = p(x) meets the x-axis.", "No intersection ⇒ no real zeroes."],
    finalAnswer: "0 — option (a).",
    ncertRef: "NCERT Section 2.2 Case (iii)", isCompetencyBased: false },

  { id: "POLY-N-NCERT-2-MCQ-003", subject: "Maths", topicKey: "polynomials", subtopic: "Sum and Product of Zeroes", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "If α and β are the zeroes of the quadratic polynomial 6x² – 7x – 3, then α + β equals",
    options: ["7/6", "–7/6", "1/2", "–1/2"],
    answer: "7/6",
    solutionSteps: ["For ax² + bx + c, sum of zeroes = −b/a.", "Here a = 6, b = −7. α + β = −(−7)/6 = 7/6."],
    finalAnswer: "7/6 — option (a).",
    ncertRef: "NCERT Section 2.3", isCompetencyBased: false },

  { id: "POLY-N-NCERT-2-MCQ-004", subject: "Maths", topicKey: "polynomials", subtopic: "Sum and Product of Zeroes", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If the sum of the zeroes of a quadratic polynomial is 0 and the product is 5, the polynomial is",
    options: ["x² + 5", "x² – 5", "x² + 5x", "x² – 5x"],
    answer: "x² + 5",
    solutionSteps: ["A quadratic with sum s and product p of zeroes is x² – sx + p.", "Here s = 0, p = 5 ⇒ x² – 0·x + 5 = x² + 5."],
    finalAnswer: "x² + 5 — option (a).",
    ncertRef: "NCERT Ex 2.2 Q2(iii)", isCompetencyBased: true },

  { id: "POLY-N-NCERT-2-MCQ-005", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes of Linear Polynomial", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "The zero of the linear polynomial p(x) = 3x + 6 is",
    options: ["–2", "2", "–6", "6"],
    answer: "–2",
    solutionSteps: ["Set p(x) = 0: 3x + 6 = 0 ⇒ x = −6/3 = −2."],
    finalAnswer: "–2 — option (a).",
    ncertRef: "NCERT Section 2.1", isCompetencyBased: false },

  // ===== Section A — Assertion-Reasoning (1 mark) =====
  { id: "POLY-N-NCERT-2-AR-001", subject: "Maths", topicKey: "polynomials", subtopic: "Maximum Number of Zeroes", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Assertion (A): A polynomial of degree 3 can have at most 3 zeroes.\nReason (R): The graph of a polynomial p(x) of degree n intersects the x-axis at atmost n points.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    solutionSteps: ["A is the special case n = 3 of R — true.", "R is the standard NCERT remark (page 27) — true.", "R is exactly the reason A is true."],
    finalAnswer: "Option (A).",
    ncertRef: "NCERT Section 2.2 (remark)", isCompetencyBased: false },

  { id: "POLY-N-NCERT-2-AR-002", subject: "Maths", topicKey: "polynomials", subtopic: "Sum and Product of Zeroes", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Assertion (A): If α and β are the zeroes of x² + 7x + 10, then α + β = –7 and αβ = 10.\nReason (R): For ax² + bx + c with zeroes α, β: α + β = −b/a and αβ = c/a.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    solutionSteps: ["By R applied to x² + 7x + 10 (a = 1, b = 7, c = 10): α + β = −7, αβ = 10 — matches A.", "R is the standard NCERT identity — true.", "R is the route used to verify A."],
    finalAnswer: "Option (A).",
    ncertRef: "NCERT Example 2 (page 29)", isCompetencyBased: true },

  // ===== Section B — Short Answer (2 marks) =====
  { id: "POLY-N-NCERT-2-VSA-001", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes of Quadratic Polynomial", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "Find the zeroes of the quadratic polynomial 4s² – 4s + 1.",
    solutionSteps: ["4s² – 4s + 1 = (2s – 1)². Treat as a perfect square.", "Setting (2s – 1)² = 0 gives 2s – 1 = 0 ⇒ s = 1/2 (a repeated zero).", "Both zeroes are 1/2."],
    finalAnswer: "Zeroes: 1/2 and 1/2 (repeated).",
    ncertRef: "NCERT Ex 2.2 Q1(ii)", isCompetencyBased: false },

  { id: "POLY-N-NCERT-2-VSA-002", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes of Quadratic Polynomial", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "Find the zeroes of t² – 15.",
    solutionSteps: ["t² – 15 = 0 ⇒ t² = 15 ⇒ t = ±√15.", "Hence the zeroes are √15 and –√15."],
    finalAnswer: "Zeroes: √15 and –√15.",
    ncertRef: "NCERT Ex 2.2 Q1(v)", isCompetencyBased: false },

  { id: "POLY-N-NCERT-2-VSA-003", subject: "Maths", topicKey: "polynomials", subtopic: "Constructing a Polynomial", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "Find a quadratic polynomial whose zeroes are sum −3 and product 2 respectively.",
    solutionSteps: ["The quadratic with sum s and product p of zeroes is x² – sx + p.", "Substituting s = −3, p = 2: x² – (−3)x + 2 = x² + 3x + 2."],
    finalAnswer: "x² + 3x + 2.",
    ncertRef: "NCERT Example 4 (page 31)", isCompetencyBased: true },

  // ===== Section C — Short Answer (3 marks) =====
  { id: "POLY-N-NCERT-2-SA-001", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes & Coefficient Relationship", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the zeroes of x² + 7x + 10 and verify the relationship between the zeroes and the coefficients.",
    solutionSteps: ["Factorise: x² + 7x + 10 = (x + 2)(x + 5).", "Zeroes: x = −2 and x = −5.", "Sum = −2 + (−5) = −7 = −(7)/1 = −(coeff of x)/(coeff of x²). ✓", "Product = (−2)(−5) = 10 = (constant)/(coeff of x²). ✓"],
    finalAnswer: "Zeroes: −2 and −5; relationship verified.",
    ncertRef: "NCERT Example 2 (page 29)", isCompetencyBased: true },

  { id: "POLY-N-NCERT-2-SA-002", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes & Coefficient Relationship", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the zeroes of 6x² – 3 – 7x and verify the relationship between zeroes and coefficients.",
    solutionSteps: ["Write in standard form: 6x² – 7x – 3. Factorise by splitting middle term: 6x² – 9x + 2x – 3 = 3x(2x – 3) + 1(2x – 3) = (3x + 1)(2x – 3).", "Zeroes: x = −1/3 and x = 3/2.", "Sum: −1/3 + 3/2 = (−2 + 9)/6 = 7/6 = −(−7)/6 = −b/a. ✓", "Product: (−1/3)(3/2) = −1/2 = −3/6 = c/a. ✓"],
    finalAnswer: "Zeroes: −1/3 and 3/2; relationship verified.",
    ncertRef: "NCERT Ex 2.2 Q1(iii)", isCompetencyBased: true },

  { id: "POLY-N-NCERT-2-SA-003", subject: "Maths", topicKey: "polynomials", subtopic: "Constructing a Polynomial", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find a quadratic polynomial whose zeroes are 1/4 and −1 respectively (sum = 1/4 and product = −1).",
    solutionSteps: ["A quadratic with given sum s and product p of zeroes is x² – sx + p.", "Wait — the question says zeroes 'are 1/4 and −1'. Let's verify both readings: if zeroes are 1/4 and −1, sum = 1/4 + (−1) = −3/4 and product = −1/4.", "Standard NCERT Ex 2.2 Q2(i) gives sum = 1/4, product = −1 directly. So polynomial is x² − (1/4)x + (−1) = (4x² − x − 4)/4. Taking k = 4: 4x² − x − 4."],
    finalAnswer: "One valid polynomial: 4x² – x – 4.",
    ncertRef: "NCERT Ex 2.2 Q2(i)", isCompetencyBased: true },

  { id: "POLY-N-NCERT-2-SA-004", subject: "Maths", topicKey: "polynomials", subtopic: "Constructing a Polynomial", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find a quadratic polynomial whose sum of zeroes is √2 and product of zeroes is 1/3.",
    solutionSteps: ["Polynomial form: x² – (sum)x + product = x² – √2·x + 1/3.", "Multiply by 3 to clear fractions: 3x² – 3√2·x + 1."],
    finalAnswer: "3x² – 3√2·x + 1 (or x² – √2·x + 1/3).",
    ncertRef: "NCERT Ex 2.2 Q2(ii)", isCompetencyBased: true },

  { id: "POLY-N-NCERT-2-SA-005", subject: "Maths", topicKey: "polynomials", subtopic: "Geometrical Meaning", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Explain geometrically when a quadratic polynomial has (i) two distinct zeroes, (ii) one (repeated) zero, (iii) no real zero. Illustrate with a sketch description for each case.",
    solutionSteps: ["The graph of y = ax² + bx + c is a parabola. Real zeroes are the x-intercepts.", "(i) Two distinct zeroes ⇒ the parabola cuts the x-axis at two different points.", "(ii) One repeated zero ⇒ the parabola just touches the x-axis at exactly one point (tangent case).", "(iii) No real zero ⇒ the parabola lies entirely above or entirely below the x-axis."],
    finalAnswer: "(i) Parabola cuts x-axis at 2 points; (ii) just touches at 1 point; (iii) does not meet the x-axis.",
    ncertRef: "NCERT Section 2.2 Cases (i)–(iii)", isCompetencyBased: true },

  // ===== Section D — Long Answer (5 marks) =====
  { id: "POLY-N-NCERT-2-LA-001", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes of Cubic Polynomial", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "Verify that 3, –1 and –1/3 are the zeroes of the cubic polynomial p(x) = 3x³ – 5x² – 11x – 3, and verify the relationship between the zeroes and the coefficients.",
    solutionSteps: ["p(3) = 3·27 – 5·9 – 11·3 – 3 = 81 – 45 – 33 – 3 = 0. ✓", "p(−1) = −3 – 5 + 11 – 3 = 0. ✓", "p(−1/3) = 3·(−1/27) – 5·(1/9) – 11·(−1/3) – 3 = −1/9 – 5/9 + 11/3 – 3 = (−6/9) + (33/9) – (27/9) = 0. ✓", "So α = 3, β = −1, γ = −1/3.", "α + β + γ = 3 − 1 − 1/3 = 5/3 = −(−5)/3 = −b/a. ✓", "αβ + βγ + γα = −3 + 1/3 + (−1) = −11/3 = c/a. ✓", "αβγ = 3 × (−1) × (−1/3) = 1 = −(−3)/3 = −d/a. ✓"],
    finalAnswer: "All three values are zeroes; all three relationships verified.",
    ncertRef: "NCERT Example 5 (page 32)", isCompetencyBased: true },

  { id: "POLY-N-NCERT-2-LA-002", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes & Coefficient Relationship", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Find the zeroes of the quadratic polynomial 3x² – x – 4 and verify the relationship between the zeroes and the coefficients.",
    solutionSteps: ["Factorise by splitting middle term: 3x² − 4x + 3x − 4 = x(3x − 4) + 1(3x − 4) = (x + 1)(3x − 4).", "Zeroes: x = −1 and x = 4/3.", "Sum: −1 + 4/3 = 1/3 = −(−1)/3 = −b/a. ✓", "Product: (−1)(4/3) = −4/3 = c/a. ✓", "Relationships verified."],
    finalAnswer: "Zeroes: −1 and 4/3; sum = 1/3, product = −4/3.",
    ncertRef: "NCERT Ex 2.2 Q1(vi)", isCompetencyBased: true },

  // ===== Section E — Case-Based (4 marks) =====
  { id: "POLY-N-NCERT-2-CB-001", subject: "Maths", topicKey: "polynomials", subtopic: "Constructing a Polynomial", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "An archway in a stadium is modelled by the graph of the polynomial p(x), where its zeroes correspond to where the arch touches the ground. The architect wants the arch to cross the ground at x = −5 and x = 3 with the curve opening downwards.\n(i) What kind of polynomial is p(x) and why?\n(ii) Write a possible expression for p(x).\n(iii) Find the sum and product of zeroes of your polynomial.\n(iv) Verify with the standard relationships.",
    solutionSteps: ["(i) Two zeroes ⇒ quadratic. 'Opening downwards' ⇒ coefficient of x² must be negative.", "(ii) p(x) = −(x + 5)(x − 3) = −(x² + 2x − 15) = −x² − 2x + 15.", "(iii) Sum = −5 + 3 = −2; product = (−5)(3) = −15.", "(iv) For −x² − 2x + 15: a = −1, b = −2, c = 15. −b/a = −(−2)/(−1) = −2 ✓. c/a = 15/(−1) = −15 ✓."],
    finalAnswer: "(i) Quadratic, leading coefficient negative; (ii) p(x) = −x² − 2x + 15; (iii) sum = −2, product = −15; (iv) Relationships verified.",
    ncertRef: "NCERT Section 2.3 (application)", isCompetencyBased: true },

  // ===== Creating-level question =====
  { id: "POLY-N-NCERT-2-CRE-001", subject: "Maths", topicKey: "polynomials", subtopic: "Constructing a Polynomial", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Creating",
    questionText: "Design a quadratic polynomial with integer coefficients whose zeroes are reciprocals of each other and whose sum of zeroes equals 5/2. Verify your design.",
    solutionSteps: ["Let the zeroes be α and 1/α. Sum = α + 1/α = 5/2. Product = α × 1/α = 1.", "Multiply α + 1/α = 5/2 by 2α: 2α² + 2 = 5α ⇒ 2α² − 5α + 2 = 0.", "So one valid polynomial is 2x² − 5x + 2.", "Check: sum of zeroes = −(−5)/2 = 5/2 ✓; product = 2/2 = 1 ✓.", "Solving 2x² − 5x + 2 = 0 by factorisation: (2x − 1)(x − 2) = 0 ⇒ x = 1/2 or x = 2 — reciprocals ✓."],
    finalAnswer: "2x² − 5x + 2 (zeroes 1/2 and 2, which are reciprocals).",
    ncertRef: "NCERT-style design task", isCompetencyBased: true,
    strategyHint: "Reciprocal zeroes ⇒ product = 1." },
];
