import type { CanonicalQuestion } from "../../../predictionTypes";

// Bank-expansion EXTRACT pack — topic: polynomials (CBSE Class-10 Maths, 2026-27)
// EXTRACT-MAX sweep of Foundation worksheets (WS_3), MCQ-with-explanation bank (13),
// Additional Question Bank (14), Meridian 2024 worksheet, gd 2019-20 chapter worksheet.
// Deduped vs the 190 banked polynomials questions (bank already saturates the pure
// symmetric-function / zero-transformation templates — those collide with banked items and
// were DROPPED per honest-stop). IN-syllabus only: quadratic zeros, geometric meaning,
// quadratic zeros<->coefficient relationship, forming quadratics. Cubic zeros-coefficient
// and division-algorithm items DROPPED. solutionSteps carry [N mark] prefixes summing to marks.

export const POLYNOMIALS_EXPAND_EXTRACT: CanonicalQuestion[] = [
  // ===== Section A — MCQ / objective (1 mark) =====
  { id: "BX-POLY-EX-A-001", subject: "Maths", topicKey: "polynomials", subtopic: "Sum and Product of Zeroes", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "The zeroes of the quadratic polynomial x² + kx + k, where k ≠ 0,",
    options: ["cannot both be positive", "cannot both be negative", "are always unequal", "are always equal"],
    answer: "cannot both be positive",
    solutionSteps: ["[0.5 mark] For x² + kx + k: sum of zeroes = −k and product of zeroes = k.", "[0.5 mark] Both zeroes positive would need sum > 0 (so k < 0) and product > 0 (so k > 0) — impossible; hence they cannot both be positive."],
    finalAnswer: "They cannot both be positive.",
    isCompetencyBased: true, strategyHint: "Use signs of sum (−k) and product (k)." },

  { id: "BX-POLY-EX-A-002", subject: "Maths", topicKey: "polynomials", subtopic: "Value of a Polynomial at a Point", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "What must be added to the polynomial x² − 5x + 4 so that 3 becomes a zero of the resulting polynomial?",
    options: ["1", "2", "4", "5"],
    answer: "2",
    solutionSteps: ["[0.5 mark] Value at x = 3: (3)² − 5(3) + 4 = 9 − 15 + 4 = −2.", "[0.5 mark] To make the value 0 we must add 2, since −2 + 2 = 0."],
    finalAnswer: "2 must be added.",
    isCompetencyBased: true },

  { id: "BX-POLY-EX-A-003", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If one zero of the quadratic polynomial (k² + 4)x² + 13x + 4k is the reciprocal of the other, then the value of k is",
    options: ["2", "3", "4", "1"],
    answer: "2",
    solutionSteps: ["[0.5 mark] Reciprocal zeroes ⇒ product of zeroes = 1, i.e. 4k/(k² + 4) = 1.", "[0.5 mark] So k² + 4 = 4k ⇒ k² − 4k + 4 = 0 ⇒ (k − 2)² = 0 ⇒ k = 2."],
    finalAnswer: "k = 2.",
    isCompetencyBased: true },

  { id: "BX-POLY-EX-A-004", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes of Polynomial", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If x + 2 is a factor of x² + ax + 2b and a + b = 4, then",
    options: ["a = 1, b = 3", "a = 3, b = 1", "a = 6, b = −2", "a = 5, b = −1"],
    answer: "a = 3, b = 1",
    solutionSteps: ["[0.5 mark] Since x + 2 is a factor, x = −2 is a zero: (−2)² + a(−2) + 2b = 0 ⇒ 4 − 2a + 2b = 0 ⇒ a − b = 2.", "[0.5 mark] Solve a − b = 2 with a + b = 4 ⇒ a = 3, b = 1."],
    finalAnswer: "a = 3, b = 1.",
    isCompetencyBased: true },

  { id: "BX-POLY-EX-A-005", subject: "Maths", topicKey: "polynomials", subtopic: "Type of Polynomial", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Which of the following is a polynomial?",
    options: ["x² − 5x + 4√x + 3", "2/x + x² + 1", "√x + 1/√x", "√2·x² − 3√3·x + √6"],
    answer: "√2·x² − 3√3·x + √6",
    solutionSteps: ["[0.5 mark] In a polynomial every power of the variable must be a non-negative integer; fractional powers of x or a variable in the denominator are not allowed.", "[0.5 mark] Only √2·x² − 3√3·x + √6 has integer powers of x (the √ are just real coefficients), so it is a polynomial."],
    finalAnswer: "√2·x² − 3√3·x + √6.",
    isCompetencyBased: false },

  { id: "BX-POLY-EX-A-006", subject: "Maths", topicKey: "polynomials", subtopic: "Type of Polynomial", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Which of the following statements is true?",
    options: ["x² + 5x − 3 is a linear polynomial", "x² + 4x − 1 is a binomial", "x + 1 is a monomial", "5x³ is a monomial"],
    answer: "5x³ is a monomial",
    solutionSteps: ["[0.5 mark] A monomial has exactly one term; a binomial two terms; a degree-1 expression is linear.", "[0.5 mark] 5x³ has a single term, so it is a monomial (the other three statements are misclassifications)."],
    finalAnswer: "5x³ is a monomial.",
    isCompetencyBased: false },

  { id: "BX-POLY-EX-A-007", subject: "Maths", topicKey: "polynomials", subtopic: "Constructing a Polynomial", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Let α, β be the zeroes of f(x) = x² + px + q. Which polynomial has the reciprocals 1/α and 1/β as its zeroes?",
    options: ["x² + qx + p", "x² − px + q", "qx² + px + 1", "px² + qx + 1"],
    answer: "qx² + px + 1",
    solutionSteps: ["[0.5 mark] α + β = −p and αβ = q. Reciprocal-zero sum = 1/α + 1/β = (α + β)/αβ = −p/q; reciprocal-zero product = 1/(αβ) = 1/q.", "[0.5 mark] Polynomial: x² − (−p/q)x + 1/q = x² + (p/q)x + 1/q; multiplying by q gives qx² + px + 1."],
    finalAnswer: "qx² + px + 1.",
    isCompetencyBased: true },

  { id: "BX-POLY-EX-A-008", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "A", marks: 1, format: "MCQ", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "If the square of the difference of the zeroes of the quadratic polynomial x² + px + 45 is equal to 144, then the value of p is",
    options: ["±9", "±12", "±15", "±18"],
    answer: "±18",
    solutionSteps: ["[0.5 mark] For x² + px + 45: α + β = −p, αβ = 45. (α − β)² = (α + β)² − 4αβ = p² − 180.", "[0.5 mark] p² − 180 = 144 ⇒ p² = 324 ⇒ p = ±18."],
    finalAnswer: "p = ±18.",
    isCompetencyBased: true },

  // ===== Section B — Short Answer (2 marks) =====
  { id: "BX-POLY-EX-B-001", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "What is the condition on the coefficients of the quadratic polynomial ax² + bx + c so that its zeroes are reciprocals of each other?",
    solutionSteps: ["[1 mark] If the zeroes are reciprocals, their product = 1; but product of zeroes = c/a.", "[1 mark] So c/a = 1, i.e. a = c. The required condition is that the leading coefficient equals the constant term."],
    finalAnswer: "a = c (leading coefficient equals constant term).",
    isCompetencyBased: true },

  // ===== Section C — Short Answer (3 marks) =====
  { id: "BX-POLY-EX-C-001", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "If the product of the zeroes of the polynomial kx² + 41x + 42 is 7, find the value of k and hence find the zeroes of (k − 4)x² + (k + 1)x + 5.",
    solutionSteps: ["[1 mark] Product of zeroes = 42/k = 7 ⇒ k = 6.", "[1 mark] Then (k − 4)x² + (k + 1)x + 5 = 2x² + 7x + 5.", "[1 mark] Factorise: 2x² + 2x + 5x + 5 = 2x(x + 1) + 5(x + 1) = (x + 1)(2x + 5) ⇒ zeroes x = −1 and x = −5/2."],
    finalAnswer: "k = 6; zeroes −1 and −5/2.",
    isCompetencyBased: true },

  { id: "BX-POLY-EX-C-002", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "If the sum of the zeroes of the polynomial 5x² − (3 + k)x + 7 is zero, find the value of k and hence find the zeroes of the polynomial 2x² − 2(k + 11)x + 30.",
    solutionSteps: ["[1 mark] Sum of zeroes = (3 + k)/5 = 0 ⇒ k = −3.", "[1 mark] Then 2x² − 2(k + 11)x + 30 = 2x² − 2(8)x + 30 = 2x² − 16x + 30, i.e. x² − 8x + 15.", "[1 mark] Factorise: x² − 3x − 5x + 15 = (x − 3)(x − 5) ⇒ zeroes 3 and 5."],
    finalAnswer: "k = −3; zeroes 3 and 5.",
    isCompetencyBased: true },

  { id: "BX-POLY-EX-C-003", subject: "Maths", topicKey: "polynomials", subtopic: "Constructing a Polynomial", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "In writing a quadratic polynomial of the form x² + bx + c, one student copies the coefficient of x wrongly and obtains the zeroes as −6 and 7, while another student copies the constant term wrongly and obtains the zeroes as 4 and 11. Find the correct quadratic polynomial.",
    solutionSteps: ["[1 mark] The first student got the constant term right (only the x-coefficient was wrong), so the correct product of zeroes = (−6)(7) = −42.", "[1 mark] The second student got the x-coefficient right (only the constant was wrong), so the correct sum of zeroes = 4 + 11 = 15.", "[1 mark] Correct polynomial = x² − (sum)x + product = x² − 15x − 42."],
    finalAnswer: "x² − 15x − 42.",
    isCompetencyBased: true },

  { id: "BX-POLY-EX-C-004", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "If the quadratic polynomial (a² − b²)x² + (b² − c²)x + (c² − a²) has equal zeroes, show that b² + c² = 2a².",
    solutionSteps: ["[1 mark] The sum of the coefficients is (a² − b²) + (b² − c²) + (c² − a²) = 0, so x = 1 is always a zero of the polynomial.", "[1 mark] For equal zeroes both zeroes must be 1, so the product of zeroes = 1 × 1 = 1; but product = (c² − a²)/(a² − b²).", "[1 mark] Hence (c² − a²)/(a² − b²) = 1 ⇒ c² − a² = a² − b² ⇒ b² + c² = 2a²."],
    finalAnswer: "b² + c² = 2a² (both equal zeroes equal 1).",
    isCompetencyBased: true },
];
