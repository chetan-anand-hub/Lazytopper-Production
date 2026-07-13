import type { CanonicalQuestion } from "../../../predictionTypes";

// Bank-expansion — polynomials Section D (5-mark Long Answer), authored net-new.
// CBSE 2026-27 IN-syllabus ONLY: QUADRATIC zero-coefficient relationship, symmetric
// functions of the two zeros, forming a quadratic from transformed zeros, proving
// symmetric-function identities, and geometric-meaning graph reads. NO cubic
// zero-coefficient relations, NO division algorithm, NO complex zeros.
// Every solutionStep is [N mark]-prefixed and the prefixes sum to exactly 5.

export const POLYNOMIALS_EXPAND_LONG_D: CanonicalQuestion[] = [
  // ===== Find an unknown coefficient k from a symmetric-function condition =====
  { id: "BX-POLY-D-001", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "One condition on the zeroes α and β of p(x) = x² − 6x + k is that the sum of their squares (α² + β²) equals 20. Determine the value of k, then obtain the two zeroes.",
    options: [],
    solutionSteps: [
      "[1 mark] For x² − 6x + k: sum of zeroes α + β = −(−6)/1 = 6 and product αβ = k/1 = k.",
      "[1 mark] Use the identity α² + β² = (α + β)² − 2αβ = 36 − 2k.",
      "[1 mark] Apply the given condition: 36 − 2k = 20.",
      "[1 mark] Solve: 2k = 16 ⇒ k = 8.",
      "[1 mark] Then p(x) = x² − 6x + 8 = (x − 2)(x − 4), zeroes 2 and 4; check 2² + 4² = 4 + 16 = 20. ✓"
    ],
    finalAnswer: "k = 8; zeroes 2 and 4.",
    isCompetencyBased: true },

  { id: "BX-POLY-D-002", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "For p(x) = x² − 8x + k with zeroes α and β, the sum of the reciprocals of the zeroes, 1/α + 1/β, comes to 2/3. Work out k and list both zeroes.",
    options: [],
    solutionSteps: [
      "[1 mark] For x² − 8x + k: α + β = 8 and αβ = k.",
      "[1 mark] Express the condition: 1/α + 1/β = (α + β)/(αβ) = 8/k.",
      "[1 mark] So 8/k = 2/3.",
      "[1 mark] Cross-multiply: 2k = 24 ⇒ k = 12.",
      "[1 mark] Then p(x) = x² − 8x + 12 = (x − 2)(x − 6), zeroes 2 and 6; check 1/2 + 1/6 = 2/3. ✓"
    ],
    finalAnswer: "k = 12; zeroes 2 and 6.",
    isCompetencyBased: true },

  { id: "BX-POLY-D-003", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "The zeroes α, β of p(x) = x² − 5x + k satisfy 1/α² + 1/β² = 13/36 — the sum of the reciprocals of their squares. Calculate k and identify the zeroes.",
    options: [],
    solutionSteps: [
      "[1 mark] For x² − 5x + k: α + β = 5 and αβ = k; and 1/α² + 1/β² = (α² + β²)/(αβ)².",
      "[1 mark] α² + β² = (α + β)² − 2αβ = 25 − 2k, so the expression = (25 − 2k)/k².",
      "[1 mark] Set (25 − 2k)/k² = 13/36 ⇒ 36(25 − 2k) = 13k².",
      "[1 mark] 13k² + 72k − 900 = 0 ⇒ (k − 6)(13k + 150) = 0 ⇒ k = 6 (the value giving real rational zeroes).",
      "[1 mark] Then p(x) = x² − 5x + 6 = (x − 2)(x − 3), zeroes 2 and 3; check 1/4 + 1/9 = 13/36. ✓"
    ],
    finalAnswer: "k = 6; zeroes 2 and 3.",
    isCompetencyBased: true },

  { id: "BX-POLY-D-004", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Given the zeroes α and β of p(x) = x² − 7x + k, the combined ratio expression α/β + β/α evaluates to 25/12. Compute k and the two zeroes.",
    options: [],
    solutionSteps: [
      "[1 mark] For x² − 7x + k: α + β = 7 and αβ = k.",
      "[1 mark] α/β + β/α = (α² + β²)/(αβ) = ((α + β)² − 2αβ)/αβ = (49 − 2k)/k.",
      "[1 mark] Set (49 − 2k)/k = 25/12.",
      "[1 mark] 12(49 − 2k) = 25k ⇒ 588 − 24k = 25k ⇒ 588 = 49k ⇒ k = 12.",
      "[1 mark] Then p(x) = x² − 7x + 12 = (x − 3)(x − 4), zeroes 3 and 4; check 3/4 + 4/3 = 25/12. ✓"
    ],
    finalAnswer: "k = 12; zeroes 3 and 4.",
    isCompetencyBased: true },

  { id: "BX-POLY-D-005", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "The two zeroes of p(x) = x² − 9x + k differ from each other by exactly 3. Find the value of k and identify the individual zeroes.",
    options: [],
    solutionSteps: [
      "[1 mark] For x² − 9x + k: α + β = 9 and αβ = k; let the difference be α − β = 3.",
      "[1 mark] Use the identity (α − β)² = (α + β)² − 4αβ = 81 − 4k.",
      "[1 mark] Since α − β = 3, (α − β)² = 9, so 81 − 4k = 9.",
      "[1 mark] Solve: 4k = 72 ⇒ k = 18.",
      "[1 mark] Then p(x) = x² − 9x + 18 = (x − 3)(x − 6), zeroes 3 and 6; difference 6 − 3 = 3. ✓"
    ],
    finalAnswer: "k = 18; zeroes 3 and 6.",
    isCompetencyBased: true },

  { id: "BX-POLY-D-006", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "For p(x) = x² − 4x + k with zeroes α and β, the sum of the cubes of the zeroes, α³ + β³, is 28. Evaluate k and hence the zeroes.",
    options: [],
    solutionSteps: [
      "[1 mark] For x² − 4x + k: α + β = 4 and αβ = k.",
      "[1 mark] α³ + β³ = (α + β)³ − 3αβ(α + β) = 64 − 3k(4) = 64 − 12k.",
      "[1 mark] Apply the condition: 64 − 12k = 28.",
      "[1 mark] Solve: 12k = 36 ⇒ k = 3.",
      "[1 mark] Then p(x) = x² − 4x + 3 = (x − 1)(x − 3), zeroes 1 and 3; check 1 + 27 = 28. ✓"
    ],
    finalAnswer: "k = 3; zeroes 1 and 3.",
    isCompetencyBased: true },

  { id: "BX-POLY-D-007", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "The two zeroes of the polynomial p(x) = x² − 10x + k occur in the ratio 2 : 3. Find the value of k and the actual zeroes.",
    options: [],
    solutionSteps: [
      "[1 mark] Let the zeroes be 2t and 3t. Their sum = 5t, and by the relationship sum = −b/a = 10.",
      "[1 mark] So 5t = 10 ⇒ t = 2, giving zeroes 4 and 6.",
      "[1 mark] Product of zeroes = (4)(6) = 24, and product = c/a = k.",
      "[1 mark] Therefore k = 24.",
      "[1 mark] Then p(x) = x² − 10x + 24 = (x − 4)(x − 6); zeroes 4 and 6 are in ratio 4 : 6 = 2 : 3. ✓"
    ],
    finalAnswer: "k = 24; zeroes 4 and 6 (ratio 2 : 3).",
    isCompetencyBased: true },

  { id: "BX-POLY-D-008", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "In the polynomial p(x) = 6x² − 13x + k, one zero turns out to be the reciprocal of the other zero. Determine k and then both zeroes.",
    options: [],
    solutionSteps: [
      "[1 mark] If the zeroes are reciprocals of each other, then their product αβ = 1.",
      "[1 mark] By the relationship, product of zeroes = c/a = k/6.",
      "[1 mark] So k/6 = 1 ⇒ k = 6.",
      "[1 mark] Then p(x) = 6x² − 13x + 6; split the middle term: 6x² − 9x − 4x + 6 = 3x(2x − 3) − 2(2x − 3) = (3x − 2)(2x − 3).",
      "[1 mark] Zeroes are 2/3 and 3/2, which are reciprocals; product (2/3)(3/2) = 1. ✓"
    ],
    finalAnswer: "k = 6; zeroes 2/3 and 3/2.",
    isCompetencyBased: true },

  { id: "BX-POLY-D-009", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "In p(x) = x² − (2k + 1)x + (k + 5), the sum of the zeroes coincides with their product. Find k and this shared value of sum and product.",
    options: [],
    solutionSteps: [
      "[1 mark] Sum of zeroes = −b/a = 2k + 1; product of zeroes = c/a = k + 5.",
      "[1 mark] The condition 'sum = product' gives 2k + 1 = k + 5.",
      "[1 mark] Solve: k = 4.",
      "[1 mark] Then sum = 2(4) + 1 = 9 and product = 4 + 5 = 9 — equal, as required. ✓",
      "[1 mark] So p(x) = x² − 9x + 9; sum of zeroes = product of zeroes = 9 (zeroes are real since discriminant 81 − 36 = 45 > 0)."
    ],
    finalAnswer: "k = 4; sum = product = 9.",
    isCompetencyBased: true },

  { id: "BX-POLY-D-010", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "For the zeroes α, β of p(x) = x² − 8x + k, the shifted product (α + 2)(β + 2) works out to 35. Find k and hence the individual zeroes.",
    options: [],
    solutionSteps: [
      "[1 mark] For x² − 8x + k: α + β = 8 and αβ = k.",
      "[1 mark] Expand (α + 2)(β + 2) = αβ + 2(α + β) + 4 = k + 16 + 4 = k + 20.",
      "[1 mark] Apply the condition: k + 20 = 35.",
      "[1 mark] Solve: k = 15.",
      "[1 mark] Then p(x) = x² − 8x + 15 = (x − 3)(x − 5), zeroes 3 and 5; check (5)(7) = 35. ✓"
    ],
    finalAnswer: "k = 15; zeroes 3 and 5.",
    isCompetencyBased: true },

  // ===== Proving symmetric-function / coefficient identities (general ax²+bx+c) =====
  { id: "BX-POLY-D-011", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "Let α and β be the zeroes of the general quadratic p(x) = ax² + bx + c, a ≠ 0. Establish that the sum of the squares of the zeroes satisfies α² + β² = (b² − 2ac)/a².",
    options: [],
    solutionSteps: [
      "[1 mark] By the zero–coefficient relationship, α + β = −b/a and αβ = c/a.",
      "[1 mark] Use the identity α² + β² = (α + β)² − 2αβ.",
      "[1 mark] Substitute: α² + β² = (−b/a)² − 2(c/a).",
      "[1 mark] Simplify: (−b/a)² = b²/a², so α² + β² = b²/a² − 2c/a.",
      "[1 mark] Take LCM a²: = (b² − 2ac)/a². Hence proved."
    ],
    finalAnswer: "α² + β² = (b² − 2ac)/a².",
    isCompetencyBased: false },

  { id: "BX-POLY-D-012", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "For the general quadratic ax² + bx + c with zeroes α and β, show that the squared difference of the zeroes can be written as (α − β)² = (b² − 4ac)/a².",
    options: [],
    solutionSteps: [
      "[1 mark] By the relationship, α + β = −b/a and αβ = c/a.",
      "[1 mark] Use the identity (α − β)² = (α + β)² − 4αβ.",
      "[1 mark] Substitute: (α − β)² = (−b/a)² − 4(c/a).",
      "[1 mark] Simplify: = b²/a² − 4c/a.",
      "[1 mark] Take LCM a²: = (b² − 4ac)/a². Hence proved (note b² − 4ac is the discriminant)."
    ],
    finalAnswer: "(α − β)² = (b² − 4ac)/a².",
    isCompetencyBased: false },

  { id: "BX-POLY-D-013", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "Take α and β as the zeroes of ax² + bx + c (a ≠ 0, c ≠ 0). Demonstrate that the sum of the reciprocals of the zeroes reduces to 1/α + 1/β = −b/c.",
    options: [],
    solutionSteps: [
      "[1 mark] By the relationship, α + β = −b/a and αβ = c/a; since c ≠ 0, neither zero is 0.",
      "[1 mark] Combine the fractions: 1/α + 1/β = (α + β)/(αβ).",
      "[1 mark] Substitute: = (−b/a) ÷ (c/a).",
      "[1 mark] Divide the fractions: = (−b/a) × (a/c) = −ab/(ac).",
      "[1 mark] Cancel a: = −b/c. Hence proved."
    ],
    finalAnswer: "1/α + 1/β = −b/c.",
    isCompetencyBased: false },

  { id: "BX-POLY-D-014", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "With α and β as zeroes of ax² + bx + c, derive an expression for the sum of the cubes of the zeroes in terms of a, b and c, and prove it equals α³ + β³ = (3abc − b³)/a³.",
    options: [],
    solutionSteps: [
      "[1 mark] By the relationship, α + β = −b/a and αβ = c/a.",
      "[1 mark] Use the identity α³ + β³ = (α + β)³ − 3αβ(α + β).",
      "[1 mark] Substitute: = (−b/a)³ − 3(c/a)(−b/a).",
      "[1 mark] Simplify: = −b³/a³ + 3bc/a².",
      "[1 mark] Take LCM a³: = (−b³ + 3abc)/a³ = (3abc − b³)/a³. Hence proved."
    ],
    finalAnswer: "α³ + β³ = (3abc − b³)/a³.",
    isCompetencyBased: false },

  { id: "BX-POLY-D-015", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "For zeroes α and β of ax² + bx + c (c ≠ 0), verify the identity connecting the reciprocals of the squared zeroes to the coefficients: 1/α² + 1/β² = (b² − 2ac)/c².",
    options: [],
    solutionSteps: [
      "[1 mark] By the relationship, α + β = −b/a and αβ = c/a (c ≠ 0 so α, β ≠ 0).",
      "[1 mark] Write 1/α² + 1/β² = (α² + β²)/(αβ)² = ((α + β)² − 2αβ)/(αβ)².",
      "[1 mark] Numerator: (−b/a)² − 2(c/a) = b²/a² − 2c/a = (b² − 2ac)/a².",
      "[1 mark] Denominator: (αβ)² = (c/a)² = c²/a².",
      "[1 mark] Divide: [(b² − 2ac)/a²] ÷ [c²/a²] = (b² − 2ac)/c². Hence proved."
    ],
    finalAnswer: "1/α² + 1/β² = (b² − 2ac)/c².",
    isCompetencyBased: false },

  // ===== Forming a new quadratic from transformed zeros of a given quadratic =====
  { id: "BX-POLY-D-017", subject: "Maths", topicKey: "polynomials", subtopic: "Constructing a Polynomial", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Creating",
    questionText: "The zeroes of x² + 7x + 12 are α and β. Construct a quadratic polynomial whose zeroes are these values each increased by 2, that is α + 2 and β + 2.",
    options: [],
    solutionSteps: [
      "[1 mark] For x² + 7x + 12: α + β = −7 and αβ = 12.",
      "[1 mark] New sum = (α + 2) + (β + 2) = (α + β) + 4 = −7 + 4 = −3.",
      "[1 mark] New product = (α + 2)(β + 2) = αβ + 2(α + β) + 4 = 12 − 14 + 4 = 2.",
      "[1 mark] Required polynomial = x² − (−3)x + 2 = x² + 3x + 2.",
      "[1 mark] Check: zeroes −3, −4 shifted by +2 give −1, −2, and (x + 1)(x + 2) = x² + 3x + 2. ✓"
    ],
    finalAnswer: "x² + 3x + 2.",
    isCompetencyBased: true },

  { id: "BX-POLY-D-019", subject: "Maths", topicKey: "polynomials", subtopic: "Constructing a Polynomial", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Creating",
    questionText: "Starting from the zeroes α and β of x² − 4x + 1, produce a quadratic polynomial whose zeroes are the squares of the originals, α² and β².",
    options: [],
    solutionSteps: [
      "[1 mark] For x² − 4x + 1: α + β = 4 and αβ = 1.",
      "[1 mark] New sum = α² + β² = (α + β)² − 2αβ = 16 − 2 = 14.",
      "[1 mark] New product = α²β² = (αβ)² = 1.",
      "[1 mark] Required polynomial = x² − 14x + 1.",
      "[1 mark] Check: with α + β = 4 and αβ = 1 the values α² + β² = 14 and (αβ)² = 1 are consistent with x² − 14x + 1. ✓"
    ],
    finalAnswer: "x² − 14x + 1.",
    isCompetencyBased: true },

  { id: "BX-POLY-D-020", subject: "Maths", topicKey: "polynomials", subtopic: "Constructing a Polynomial", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Creating",
    questionText: "α and β are the zeroes of x² − 3x − 10. Write down a quadratic polynomial whose zeroes are the negatives of these, that is −α and −β.",
    options: [],
    solutionSteps: [
      "[1 mark] For x² − 3x − 10: α + β = 3 and αβ = −10.",
      "[1 mark] New sum = (−α) + (−β) = −(α + β) = −3.",
      "[1 mark] New product = (−α)(−β) = αβ = −10.",
      "[1 mark] Required polynomial = x² − (−3)x + (−10) = x² + 3x − 10.",
      "[1 mark] Check: zeroes of x² − 3x − 10 are 5 and −2; negated give −5 and 2, and (x + 5)(x − 2) = x² + 3x − 10. ✓"
    ],
    finalAnswer: "x² + 3x − 10.",
    isCompetencyBased: true },

  { id: "BX-POLY-D-021", subject: "Maths", topicKey: "polynomials", subtopic: "Constructing a Polynomial", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Creating",
    questionText: "Let α and β be the zeroes of x² − 5x + 6. Form a fresh quadratic polynomial that takes the two numbers (α + β) and (αβ) — the sum and the product themselves — as its own pair of zeroes.",
    options: [],
    solutionSteps: [
      "[1 mark] For x² − 5x + 6: α + β = 5 and αβ = 6.",
      "[1 mark] So the two new zeroes are the numbers 5 and 6.",
      "[1 mark] New sum = 5 + 6 = 11.",
      "[1 mark] New product = 5 × 6 = 30.",
      "[1 mark] Required polynomial = x² − 11x + 30 = (x − 5)(x − 6). ✓"
    ],
    finalAnswer: "x² − 11x + 30.",
    isCompetencyBased: true },

  { id: "BX-POLY-D-022", subject: "Maths", topicKey: "polynomials", subtopic: "Constructing a Polynomial", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Creating",
    questionText: "For the zeroes α and β of x² − 7x + 6, create a quadratic polynomial whose zeroes are the two reciprocal ratios α/β and β/α.",
    options: [],
    solutionSteps: [
      "[1 mark] For x² − 7x + 6: α + β = 7 and αβ = 6.",
      "[1 mark] New sum = α/β + β/α = (α² + β²)/(αβ) = ((α + β)² − 2αβ)/αβ = (49 − 12)/6 = 37/6.",
      "[1 mark] New product = (α/β)(β/α) = 1.",
      "[1 mark] Polynomial = x² − (37/6)x + 1; multiply through by 6: 6x² − 37x + 6.",
      "[1 mark] Check: zeroes of x² − 7x + 6 are 1 and 6; ratios 1/6 and 6 give (6x − 1)(x − 6) = 6x² − 37x + 6. ✓"
    ],
    finalAnswer: "6x² − 37x + 6.",
    isCompetencyBased: true },

  // ===== Geometric meaning — reading zeros from a graph, forming and verifying =====
  { id: "BX-POLY-D-023", subject: "Maths", topicKey: "polynomials", subtopic: "Graph & Type of Polynomial", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "The graph of a quadratic polynomial y = p(x) cuts the x-axis at (−3, 0) and (2, 0) and passes through the point (0, −12). (i) Name the zeroes. (ii) Write p(x) in factor form with leading coefficient a. (iii) Use the point (0, −12) to find a and hence p(x). (iv) Find the sum and product of the zeroes. (v) Verify the zero–coefficient relationship.",
    options: [],
    solutionSteps: [
      "[1 mark] The x-intercepts are the zeroes of p(x): α = −3 and β = 2.",
      "[1 mark] With these zeroes, p(x) = a(x + 3)(x − 2) for some a ≠ 0.",
      "[1 mark] Use p(0) = −12: a(3)(−2) = −6a = −12 ⇒ a = 2, so p(x) = 2(x + 3)(x − 2) = 2x² + 2x − 12.",
      "[1 mark] Sum of zeroes = −3 + 2 = −1; product = (−3)(2) = −6.",
      "[1 mark] Verify: −b/a = −2/2 = −1 = sum ✓ and c/a = −12/2 = −6 = product ✓."
    ],
    finalAnswer: "p(x) = 2x² + 2x − 12; zeroes −3 and 2; sum −1, product −6, relationship verified.",
    isCompetencyBased: true },

  { id: "BX-POLY-D-024", subject: "Maths", topicKey: "polynomials", subtopic: "Graph & Type of Polynomial", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "The graph of a quadratic polynomial y = p(x) touches the x-axis at exactly one point, (4, 0), and passes through (0, 32). (i) What does 'touches at one point' tell you about the zeroes? (ii) Write p(x) in the form a(x − h)². (iii) Use (0, 32) to find a and hence p(x). (iv) State the sum and product of the zeroes. (v) Verify the relationship.",
    options: [],
    solutionSteps: [
      "[1 mark] Touching the x-axis at exactly one point means the two zeroes are equal (a repeated zero): α = β = 4.",
      "[1 mark] With an equal zero at 4, p(x) = a(x − 4)² for some a ≠ 0.",
      "[1 mark] Use p(0) = 32: a(16) = 32 ⇒ a = 2, so p(x) = 2(x − 4)² = 2x² − 16x + 32.",
      "[1 mark] Sum of zeroes = 4 + 4 = 8; product = 4 × 4 = 16.",
      "[1 mark] Verify: −b/a = 16/2 = 8 = sum ✓ and c/a = 32/2 = 16 = product ✓."
    ],
    finalAnswer: "p(x) = 2x² − 16x + 32; equal zeroes 4 and 4; sum 8, product 16, relationship verified.",
    isCompetencyBased: true },
];
