import type { CanonicalQuestion } from '../../../predictionTypes';

// Source: NCERT Class 10 Mathematics Exemplar — Chapter 2: Polynomials
// PDF file used: jeep202.pdf — verified Page 1 = "CHAPTER 2 POLYNOMIALS"
// topicKey: "polynomials"
// Extraction date: 2026-05-22
// Syllabus: CBSE 2026-27 (Division Algorithm formal proof/derivation excluded per syllabusGuard)
// Coverage: Exemplar 2.1 MCQs, 2.2 reasoning, 2.3 short answer, 2.4 long answer
//           (formal long-division items omitted; factorisation-using-known-zero is included).

export const POLY_EXEMPLAR: CanonicalQuestion[] = [
  // ===== Section A — MCQs (1 mark) =====
  { id: "POLY-N-EXEM-2-MCQ-001", subject: "Maths", topicKey: "polynomials", subtopic: "Finding Unknown Coefficient", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If one of the zeroes of the quadratic polynomial (k – 1)x² + kx + 1 is −3, then the value of k is",
    options: ["4/3", "−4/3", "2/3", "−2/3"],
    answer: "4/3",
    solutionSteps: ["Substitute x = −3 into (k − 1)x² + kx + 1: (k − 1)(9) + k(−3) + 1 = 0.", "9k − 9 − 3k + 1 = 0 ⇒ 6k − 8 = 0 ⇒ k = 8/6 = 4/3."],
    finalAnswer: "4/3 — option (a).",
    ncertRef: "Exemplar Ex 2.1 Q1", isCompetencyBased: true },

  { id: "POLY-N-EXEM-2-MCQ-002", subject: "Maths", topicKey: "polynomials", subtopic: "Constructing a Polynomial", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "A quadratic polynomial whose zeroes are −3 and 4 is",
    options: ["x² – x + 12", "x² + x + 12", "x²/2 − x/2 − 6", "2x² + 2x − 24"],
    answer: "x²/2 − x/2 − 6",
    solutionSteps: ["Sum of zeroes = −3 + 4 = 1; product = −12.", "Polynomial of the form x² − (sum)x + product = x² − x − 12.", "Dividing by 2 gives x²/2 − x/2 − 6, which is option (c) and matches the NCERT key.", "Option (d) 2x² + 2x − 24 ≠ x² − x − 12 (sign of linear term differs)."],
    finalAnswer: "x²/2 − x/2 − 6 — option (c).",
    ncertRef: "Exemplar Ex 2.1 Q2", isCompetencyBased: true },

  { id: "POLY-N-EXEM-2-MCQ-003", subject: "Maths", topicKey: "polynomials", subtopic: "Finding Unknown Coefficient", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If the zeroes of the quadratic polynomial x² + (a + 1)x + b are 2 and −3, then",
    options: ["a = −7, b = −1", "a = 5, b = −1", "a = 2, b = −6", "a = 0, b = −6"],
    answer: "a = 0, b = −6",
    solutionSteps: ["Sum of zeroes: 2 + (−3) = −1 = −(a + 1) ⇒ a + 1 = 1 ⇒ a = 0.", "Product of zeroes: 2 × (−3) = −6 = b ⇒ b = −6."],
    finalAnswer: "a = 0, b = −6 — option (d).",
    ncertRef: "Exemplar Ex 2.1 Q3", isCompetencyBased: true },

  { id: "POLY-N-EXEM-2-MCQ-004", subject: "Maths", topicKey: "polynomials", subtopic: "Counting Polynomials with Given Zeroes", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "The number of polynomials having zeroes as −2 and 5 is",
    options: ["1", "2", "3", "more than 3"],
    answer: "more than 3",
    solutionSteps: ["Any polynomial of the form k(x + 2)(x − 5), where k ≠ 0 is real, has these zeroes.", "k can take infinitely many real values, so infinitely many such polynomials exist."],
    finalAnswer: "More than 3 — option (d).",
    ncertRef: "Exemplar Ex 2.1 Q4", isCompetencyBased: true,
    strategyHint: "The set of polynomials with given roots is {k·(x−α)(x−β) : k ≠ 0}." },

  { id: "POLY-N-EXEM-2-MCQ-005", subject: "Maths", topicKey: "polynomials", subtopic: "Product of Two Other Zeroes", section: "A", marks: 1, format: "MCQ", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "If one of the zeroes of the cubic polynomial x³ + ax² + bx + c is −1, then the product of the other two zeroes is",
    options: ["b − a + 1", "b − a − 1", "a − b + 1", "a − b − 1"],
    answer: "b − a + 1",
    solutionSteps: ["For a cubic x³ + ax² + bx + c, sum of zeroes = −a, sum of pairwise products = b, product of zeroes = −c.", "Let α, β be the other two zeroes (besides −1). Then α + β + (−1) = −a ⇒ α + β = 1 − a.", "Pairwise products: αβ + α(−1) + β(−1) = b ⇒ αβ − (α + β) = b ⇒ αβ = b + (1 − a) = b − a + 1."],
    finalAnswer: "b − a + 1 — option (a).",
    ncertRef: "Exemplar Ex 2.1 Q6", isCompetencyBased: true },

  { id: "POLY-N-EXEM-2-MCQ-006", subject: "Maths", topicKey: "polynomials", subtopic: "Signs of Zeroes", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "The zeroes of the quadratic polynomial x² + 99x + 127 are",
    options: ["both positive", "both negative", "one positive and one negative", "both equal"],
    answer: "both negative",
    solutionSteps: ["Sum of zeroes = −99 (negative) and product = 127 (positive).", "Two numbers with negative sum and positive product are both negative."],
    finalAnswer: "Both negative — option (b).",
    ncertRef: "Exemplar Ex 2.1 Q7", isCompetencyBased: true },

  { id: "POLY-N-EXEM-2-MCQ-007", subject: "Maths", topicKey: "polynomials", subtopic: "Symmetry of Zeroes", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "If one of the zeroes of a quadratic polynomial of the form x² + ax + b is the negative of the other, then it",
    options: ["has no linear term and the constant term is negative", "has no linear term and the constant term is positive", "can have a linear term but the constant term is negative", "can have a linear term but the constant term is positive"],
    answer: "has no linear term and the constant term is negative",
    solutionSteps: ["If zeroes are α and −α, sum = 0 ⇒ −a/1 = 0 ⇒ a = 0 (no linear term).", "Product = α × (−α) = −α² ≤ 0, and < 0 if α ≠ 0. So constant term b = −α² < 0."],
    finalAnswer: "Option (a).",
    ncertRef: "Exemplar Ex 2.1 Q10", isCompetencyBased: true },

  // ===== Section A — Assertion-Reasoning (1 mark) =====
  { id: "POLY-N-EXEM-2-AR-001", subject: "Maths", topicKey: "polynomials", subtopic: "Signs of Zeroes", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "Assertion (A): If both zeroes of a quadratic polynomial ax² + bx + c are negative, then a, b and c all have the same sign.\nReason (R): For ax² + bx + c with zeroes α, β: α + β = −b/a and αβ = c/a.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    solutionSteps: ["α, β < 0 ⇒ α + β < 0 and αβ > 0. So −b/a < 0 (i.e., b/a > 0) and c/a > 0.", "b/a > 0 ⇒ b and a have the same sign; c/a > 0 ⇒ c and a have the same sign. Hence all three same sign. A true.", "R is the standard identity — true.", "R is the route used to derive A."],
    finalAnswer: "Option (A).",
    ncertRef: "Exemplar Sample Question 2 / Ex 2.2 Q2(i)", isCompetencyBased: true },

  { id: "POLY-N-EXEM-2-AR-002", subject: "Maths", topicKey: "polynomials", subtopic: "Equal Zeroes", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "Assertion (A): If the zeroes of ax² + bx + c (with c ≠ 0) are equal, then c and a have the same sign.\nReason (R): For real, equal zeroes the discriminant b² − 4ac = 0 and the common root is −b/(2a), whose square equals c/a.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    solutionSteps: ["Equal zeroes α = β ⇒ αβ = α² ≥ 0, and > 0 if α ≠ 0. αβ = c/a > 0 ⇒ c and a have same sign. A true.", "R is the standard discriminant relation — true.", "R justifies why c/a is positive (= α²), which directly gives A."],
    finalAnswer: "Option (A).",
    ncertRef: "Exemplar Ex 2.1 Q9", isCompetencyBased: true },

  // ===== Section B — Short Answer (2 marks) =====
  { id: "POLY-N-EXEM-2-VSA-001", subject: "Maths", topicKey: "polynomials", subtopic: "Number of Zeroes from Graph", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Is it true that 'If the graph of a polynomial intersects the x-axis at only one point, it cannot be a quadratic polynomial'? Justify briefly.",
    solutionSteps: ["A quadratic polynomial CAN touch the x-axis at exactly one point — this is the equal-root (repeated zero) case (NCERT Case ii).", "Example: y = (x − 3)² has only one x-intercept x = 3 yet is quadratic.", "Hence the statement is FALSE."],
    finalAnswer: "False; counter-example y = (x − 3)².",
    ncertRef: "Exemplar Ex 2.2 Q2(ii)", isCompetencyBased: true },

  { id: "POLY-N-EXEM-2-VSA-002", subject: "Maths", topicKey: "polynomials", subtopic: "Equal Zeroes", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Can the quadratic polynomial x² + kx + k have equal zeroes for some odd integer k > 1? Justify.",
    solutionSteps: ["Equal zeroes ⇒ discriminant = k² − 4k = k(k − 4) = 0 ⇒ k = 0 or k = 4.", "Neither value is an odd integer > 1.", "Hence NO odd integer k > 1 makes the zeroes equal."],
    finalAnswer: "No; only k = 0 or 4 give equal zeroes, neither is odd > 1.",
    ncertRef: "Exemplar Ex 2.2 Q1(v)", isCompetencyBased: true },

  { id: "POLY-N-EXEM-2-VSA-003", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes of Cubic Polynomial", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Is it true that 'If two of the zeroes of a cubic polynomial are zero, then it does not have linear and constant terms'? Justify.",
    solutionSteps: ["If two zeroes are 0, the cubic factorises as x · x · (x − α) = x²(x − α) = x³ − αx².", "This has no linear term (no x term) and no constant term (no x⁰ term).", "Hence the statement is TRUE."],
    finalAnswer: "True; cubic becomes x³ − αx², missing linear and constant terms.",
    ncertRef: "Exemplar Ex 2.2 Q2(iv)", isCompetencyBased: true },

  // ===== Section C — Short Answer (3 marks) =====
  { id: "POLY-N-EXEM-2-SA-001", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes by Factorisation", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the zeroes of 4x² – 3x – 1 by factorisation and verify the relationship between zeroes and coefficients.",
    solutionSteps: ["Split the middle term: 4x² − 4x + x − 1 = 4x(x − 1) + 1(x − 1) = (4x + 1)(x − 1).", "Zeroes: x = −1/4 and x = 1.", "Sum: −1/4 + 1 = 3/4 = −(−3)/4 = −b/a. ✓", "Product: (−1/4)(1) = −1/4 = c/a. ✓"],
    finalAnswer: "Zeroes: −1/4 and 1; relationships verified.",
    ncertRef: "Exemplar Ex 2.3 Q1", isCompetencyBased: true },

  { id: "POLY-N-EXEM-2-SA-002", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes by Factorisation", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the zeroes of 3x² + 4x – 4 by factorisation and verify the relationship between zeroes and coefficients.",
    solutionSteps: ["Split the middle term: 3x² + 6x − 2x − 4 = 3x(x + 2) − 2(x + 2) = (3x − 2)(x + 2).", "Zeroes: x = 2/3 and x = −2.", "Sum: 2/3 − 2 = −4/3 = −(4)/3 = −b/a. ✓", "Product: (2/3)(−2) = −4/3 = c/a. ✓"],
    finalAnswer: "Zeroes: 2/3 and −2; relationships verified.",
    ncertRef: "Exemplar Ex 2.3 Q2", isCompetencyBased: true },

  { id: "POLY-N-EXEM-2-SA-003", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes by Factorisation", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the zeroes of v² + 4√3·v – 15 and verify the relationship between zeroes and coefficients.",
    solutionSteps: ["Split the middle term: v² + 5√3·v − √3·v − 15 = v(v + 5√3) − √3(v + 5√3) = (v − √3)(v + 5√3).", "Zeroes: v = √3 and v = −5√3.", "Sum: √3 + (−5√3) = −4√3 = −(4√3)/1 = −b/a. ✓", "Product: (√3)(−5√3) = −15 = c/a. ✓"],
    finalAnswer: "Zeroes: √3 and −5√3; relationships verified.",
    ncertRef: "Exemplar Ex 2.3 Q8", isCompetencyBased: true },

  { id: "POLY-N-EXEM-2-SA-004", subject: "Maths", topicKey: "polynomials", subtopic: "Constructing a Polynomial", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find a quadratic polynomial with sum −8/3 and product 4/3 as its zeroes, and find the zeroes.",
    solutionSteps: ["Polynomial: x² − (−8/3)x + 4/3 = x² + (8/3)x + 4/3. Multiply by 3: 3x² + 8x + 4.", "Factorise: 3x² + 8x + 4 = 3x² + 6x + 2x + 4 = 3x(x + 2) + 2(x + 2) = (3x + 2)(x + 2).", "Zeroes: x = −2/3 and x = −2."],
    finalAnswer: "Polynomial: 3x² + 8x + 4. Zeroes: −2/3 and −2.",
    ncertRef: "Exemplar Ex 2.4 Q1(i)", isCompetencyBased: true },

  { id: "POLY-N-EXEM-2-SA-005", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes of Cubic Polynomial", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Find the zeroes of t³ – 2t² – 15t and verify the relationship between zeroes and coefficients.",
    solutionSteps: ["Take t common: t³ − 2t² − 15t = t(t² − 2t − 15) = t(t − 5)(t + 3).", "Zeroes: t = 0, t = 5, t = −3.", "Coefficients of t³ + 0·t² is a = 1, b = −2, c = −15, d = 0.", "Sum α + β + γ = 0 + 5 − 3 = 2 = −b/a = 2. ✓", "αβ + βγ + γα = 0 + (5)(−3) + 0 = −15 = c/a. ✓", "αβγ = 0 = −d/a. ✓"],
    finalAnswer: "Zeroes: 0, 5, −3; all three relationships verified.",
    ncertRef: "Exemplar Ex 2.3 Q4", isCompetencyBased: true },

  // ===== Section D — Long Answer (5 marks) =====
  { id: "POLY-N-EXEM-2-LA-001", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes of Cubic Polynomial", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Given that the zeroes of the cubic polynomial x³ – 6x² + 3x + 10 are of the form a, a + b, a + 2b for some real numbers a and b, find the values of a and b as well as the zeroes of the polynomial.",
    solutionSteps: ["Sum of zeroes: a + (a + b) + (a + 2b) = 3a + 3b = 6 ⇒ a + b = 2 …(1).", "Product of zeroes: a(a + b)(a + 2b) = −10 (since −d/a = −10/1 = −10). Use (1): a + b = 2 ⇒ (a)(2)(a + 2b) = −10 ⇒ a(a + 2b) = −5. Also a + 2b = (a + b) + b = 2 + b.", "Substitute: a(2 + b) = −5 …(2). From (1): a = 2 − b. Substitute into (2): (2 − b)(2 + b) = −5 ⇒ 4 − b² = −5 ⇒ b² = 9 ⇒ b = ±3.", "Case b = 3: a = −1. Zeroes: −1, 2, 5.", "Case b = −3: a = 5. Zeroes: 5, 2, −1 (same set).", "So a = −1, b = 3; zeroes are −1, 2, 5."],
    finalAnswer: "a = −1, b = 3; zeroes are −1, 2, 5.",
    ncertRef: "Exemplar Ex 2.4 Q2", isCompetencyBased: true,
    strategyHint: "Use sum of zeroes to get one equation; product to get the second." },

  { id: "POLY-N-EXEM-2-LA-002", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes by Factorisation", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Given that √2 is a zero of the cubic polynomial 6x³ + √2·x² – 10x – 4√2, find its other two zeroes.",
    solutionSteps: ["Since √2 is a zero, (x − √2) is a factor. Divide 6x³ + √2·x² − 10x − 4√2 by (x − √2):", "First term: 6x² (since 6x³ / x = 6x²). Multiply: 6x²(x − √2) = 6x³ − 6√2·x². Subtract: (√2 + 6√2)x² − 10x − 4√2 = 7√2·x² − 10x − 4√2.", "Next: 7√2·x² / x = 7√2·x. Multiply: 7√2·x(x − √2) = 7√2·x² − 14x. Subtract: (−10 + 14)x − 4√2 = 4x − 4√2.", "Next: 4x / x = 4. Multiply: 4(x − √2) = 4x − 4√2. Subtract: 0. Quotient = 6x² + 7√2·x + 4.", "Solve 6x² + 7√2·x + 4 = 0 by factorisation: 6x² + 3√2·x + 4√2·x + 4. Group: 3x(2x + √2) + 2√2(2x + √2) wait — try 6x² + 4√2·x + 3√2·x + 4 = 2x(3x + 2√2) + √2(3x + 2√2) = (2x + √2)(3x + 2√2).", "Zeroes: x = −√2/2 = −1/√2 and x = −2√2/3."],
    finalAnswer: "Other zeroes: −1/√2 (i.e., −√2/2) and −2√2/3.",
    ncertRef: "Exemplar Ex 2.4 Q3", isCompetencyBased: true },

  // ===== Section E — Case-Based (4 marks) =====
  { id: "POLY-N-EXEM-2-CB-001", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes by Factorisation", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A bridge’s arch is modelled by p(x) = x² + (k + 1)x + b. Surveyors find that the arch lands on the x-axis at x = 2 and x = −3.\n(i) Find b using the product of zeroes.\n(ii) Find k using the sum of zeroes.\n(iii) Write the polynomial explicitly.\n(iv) Verify that x = 2 is indeed a zero of your polynomial.",
    solutionSteps: ["(i) Product of zeroes 2 × (−3) = −6 = b ⇒ b = −6.", "(ii) Sum of zeroes 2 + (−3) = −1 = −(k + 1) ⇒ k + 1 = 1 ⇒ k = 0.", "(iii) p(x) = x² + (0 + 1)x − 6 = x² + x − 6.", "(iv) p(2) = 4 + 2 − 6 = 0 ✓."],
    finalAnswer: "(i) b = −6; (ii) k = 0; (iii) p(x) = x² + x − 6; (iv) verified.",
    ncertRef: "Exemplar Ex 2.1 Q3 (applied)", isCompetencyBased: true },

  // ===== Creating-level question =====
  { id: "POLY-N-EXEM-2-CRE-001", subject: "Maths", topicKey: "polynomials", subtopic: "Constructing a Polynomial", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Creating",
    questionText: "Design a cubic polynomial with integer coefficients whose zeroes are 1, 2 and 3. Then verify the standard relationships between zeroes and coefficients.",
    solutionSteps: ["Polynomial: p(x) = (x − 1)(x − 2)(x − 3) = (x² − 3x + 2)(x − 3) = x³ − 3x² + 2x − 3x² + 9x − 6 = x³ − 6x² + 11x − 6.", "So design: p(x) = x³ − 6x² + 11x − 6 (a = 1, b = −6, c = 11, d = −6).", "Sum: 1 + 2 + 3 = 6 = −(−6)/1 = −b/a ✓.", "Pairwise sum: (1)(2) + (2)(3) + (3)(1) = 2 + 6 + 3 = 11 = c/a ✓.", "Product: 1·2·3 = 6 = −(−6)/1 = −d/a ✓."],
    finalAnswer: "x³ − 6x² + 11x − 6; all three relationships verified.",
    ncertRef: "NCERT-style design task", isCompetencyBased: true,
    strategyHint: "Expand (x − α)(x − β)(x − γ) to read off the coefficients." },
];
