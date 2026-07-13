import type { CanonicalQuestion } from "../../../predictionTypes";

// Section E — Case-Based (4-mark) polynomials, authored 2026-27.
// Each item: real-world passage + sub-parts (i)-(iv); one [1 mark] solutionStep per sub-part.
// Distinctness is by MATHEMATICAL ask-mix (not scenario skin). Syllabus: quadratic (parabola)
// only — zeros, geometric meaning, quadratic sum/product relationship, symmetric functions of the
// two zeros, forming/transforming a quadratic. No cubic zeros-coefficient relation, no division
// algorithm, no complex zeros (stop at "no real zeros").
export const POLYNOMIALS_EXPAND_CASE_E: CanonicalQuestion[] = [
  // 001 — recover a MISSING coefficient from one given zero
  { id: "BX-POLY-E-001", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes & Coefficient Relationship", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A suspension cable over a footbridge sags in the shape of the parabola p(x) = x² − 7x + k, where a zero of p(x) is a point at which the cable meets the deck. Surveyors confirm the cable meets the deck at x = 2.\n(i) Use the fact that x = 2 is a zero to find k.\n(ii) Find the second point where the cable meets the deck (the other zero).\n(iii) State the product of the two zeros for your polynomial.\n(iv) Verify the sum-of-zeros relationship for your polynomial.",
    solutionSteps: [
      "[1 mark] (i) x = 2 is a zero ⇒ p(2) = 4 − 14 + k = 0 ⇒ k = 10.",
      "[1 mark] (ii) Sum of zeros = −b/a = 7, so the other zero = 7 − 2 = 5.",
      "[1 mark] (iii) Product of zeros = c/a = k/1 = 10 (and 2 × 5 = 10).",
      "[1 mark] (iv) For x² − 7x + 10: −b/a = 7 and the zeros 2, 5 give 2 + 5 = 7 ✓.",
    ],
    finalAnswer: "(i) k = 10; (ii) other zero = 5; (iii) product = 10; (iv) 2 + 5 = 7 = −b/a ✓.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 002 — symmetric function alpha^2 + beta^2 in context
  { id: "BX-POLY-E-002", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Two resistors in a circuit have resistances (in ohms) equal to the two zeros of R(x) = x² − 9x + 18. For a power calculation the engineer needs the sum of the squares of the two resistances.\n(i) Write the sum and product of the zeros from the coefficients.\n(ii) Find α² + β² without first finding the zeros.\n(iii) Now find the actual resistances (the zeros).\n(iv) Verify your value of α² + β².",
    solutionSteps: [
      "[1 mark] (i) Sum α + β = −(−9)/1 = 9; product αβ = 18/1 = 18.",
      "[1 mark] (ii) α² + β² = (α + β)² − 2αβ = 81 − 36 = 45.",
      "[1 mark] (iii) x² − 9x + 18 = (x − 3)(x − 6) ⇒ zeros 3 Ω and 6 Ω.",
      "[1 mark] (iv) 3² + 6² = 9 + 36 = 45 ✓.",
    ],
    finalAnswer: "(i) sum 9, product 18; (ii) α² + β² = 45; (iii) 3 Ω and 6 Ω; (iv) 9 + 36 = 45 ✓.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 003 — compare TWO parabolas, find a shared zero
  { id: "BX-POLY-E-003", subject: "Maths", topicKey: "polynomials", subtopic: "Geometrical Meaning", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "In a musical fountain, jet A follows y = −x² + 6x − 5 and jet B follows y = −x² + 4x − 3, where y is height and the water meets the pool when y = 0.\n(i) Do both jets open upward or downward? Justify from the leading coefficient.\n(ii) Find the two points where jet A meets the pool.\n(iii) Find the two points where jet B meets the pool.\n(iv) At what x do BOTH jets meet the pool at the same point?",
    solutionSteps: [
      "[1 mark] (i) Both have leading coefficient −1 < 0, so both parabolas open downward.",
      "[1 mark] (ii) −x² + 6x − 5 = 0 ⇒ x² − 6x + 5 = 0 ⇒ (x − 1)(x − 5) = 0 ⇒ x = 1, 5.",
      "[1 mark] (iii) −x² + 4x − 3 = 0 ⇒ x² − 4x + 3 = 0 ⇒ (x − 1)(x − 3) = 0 ⇒ x = 1, 3.",
      "[1 mark] (iv) The common zero is x = 1 (shared by both A and B).",
    ],
    finalAnswer: "(i) both open downward; (ii) x = 1, 5; (iii) x = 1, 3; (iv) common at x = 1.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 004 — sign / positivity intervals as the core ask + a value
  { id: "BX-POLY-E-004", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes of Polynomial", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "A stall's daily profit (in thousand rupees) is P(x) = −x² + 10x − 16, where x is the number of units (in hundreds) sold.\n(i) Find the zeros of P(x) — the break-even sales.\n(ii) For what values of x does the stall make a profit (P > 0)?\n(iii) For what values of x does the stall make a loss (P < 0)?\n(iv) Find the profit when x = 5.",
    solutionSteps: [
      "[1 mark] (i) −x² + 10x − 16 = 0 ⇒ x² − 10x + 16 = 0 ⇒ (x − 2)(x − 8) = 0 ⇒ x = 2, 8.",
      "[1 mark] (ii) Downward parabola is positive BETWEEN its zeros: profit for 2 < x < 8.",
      "[1 mark] (iii) Loss (P < 0) outside the zeros: x < 2 or x > 8.",
      "[1 mark] (iv) P(5) = −25 + 50 − 16 = 9, i.e. ₹9 thousand.",
    ],
    finalAnswer: "(i) x = 2, 8; (ii) 2 < x < 8; (iii) x < 2 or x > 8; (iv) ₹9 thousand.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 005 — pin the leading coefficient from the y-intercept, then form
  { id: "BX-POLY-E-005", subject: "Maths", topicKey: "polynomials", subtopic: "Constructing a Polynomial", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The graph of a company's yearly result p(x) is an upward parabola that crosses the x-axis at (−1, 0) and (3, 0) and cuts the y-axis at (0, −6).\n(i) What type of polynomial is p(x), and how many zeros does it have?\n(ii) Name its zeros from the x-intercepts.\n(iii) State p(0) and explain what the y-intercept represents.\n(iv) Find the exact expression for p(x) using the zeros and the y-intercept.",
    solutionSteps: [
      "[1 mark] (i) Two x-intercepts and a single turn ⇒ quadratic, with 2 zeros.",
      "[1 mark] (ii) Zeros are the x-intercepts: x = −1 and x = 3.",
      "[1 mark] (iii) p(0) = −6; the y-intercept is the result at x = 0 (the starting value).",
      "[1 mark] (iv) p(x) = a(x + 1)(x − 3); p(0) = a(1)(−3) = −6 ⇒ a = 2 ⇒ p(x) = 2x² − 4x − 6.",
    ],
    finalAnswer: "(i) quadratic, 2 zeros; (ii) −1 and 3; (iii) p(0) = −6; (iv) p(x) = 2x² − 4x − 6.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 006 — form from given sum & product, then a FEASIBILITY (no real zeros) twist
  { id: "BX-POLY-E-006", subject: "Maths", topicKey: "polynomials", subtopic: "Constructing a Polynomial", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "A gardener divides land into two rectangular strips whose lengths (in metres) have sum 15 and product 54. The two lengths are the zeros of a quadratic.\n(i) Write a quadratic polynomial whose zeros are the two lengths.\n(ii) Find the two lengths.\n(iii) State the product of the zeros of your polynomial as a check.\n(iv) Could two lengths instead have sum 15 and product 60? Justify using the discriminant.",
    solutionSteps: [
      "[1 mark] (i) Polynomial = x² − (sum)x + product = x² − 15x + 54.",
      "[1 mark] (ii) x² − 15x + 54 = (x − 6)(x − 9) = 0 ⇒ lengths 6 m and 9 m.",
      "[1 mark] (iii) Product of zeros = c/a = 54, and 6 × 9 = 54 ✓.",
      "[1 mark] (iv) For x² − 15x + 60, discriminant = 225 − 240 = −15 < 0 ⇒ no real zeros ⇒ impossible.",
    ],
    finalAnswer: "(i) x² − 15x + 54; (ii) 6 m and 9 m; (iii) 54; (iv) no — discriminant < 0, no real lengths.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 007 — TRANSFORM zeros by scaling (2α, 2β)
  { id: "BX-POLY-E-007", subject: "Maths", topicKey: "polynomials", subtopic: "Constructing a Polynomial", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A photograph is enlarged to exactly double its size. The original width and height (in cm) are the zeros of x² − 7x + 12, and the enlarged dimensions are double each.\n(i) Find the original dimensions (the zeros).\n(ii) Write the two enlarged (doubled) dimensions.\n(iii) Form a quadratic whose zeros are the enlarged dimensions.\n(iv) Describe how the sum and product of zeros changed under doubling.",
    solutionSteps: [
      "[1 mark] (i) x² − 7x + 12 = (x − 3)(x − 4) ⇒ original dimensions 3 cm and 4 cm.",
      "[1 mark] (ii) Doubled: 2 × 3 = 6 cm and 2 × 4 = 8 cm.",
      "[1 mark] (iii) Zeros 6, 8: sum 14, product 48 ⇒ polynomial x² − 14x + 48.",
      "[1 mark] (iv) Sum doubled (7 → 14); product became 2² = 4 times larger (12 → 48).",
    ],
    finalAnswer: "(i) 3, 4; (ii) 6, 8; (iii) x² − 14x + 48; (iv) sum ×2, product ×4.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 008 — TRANSFORM zeros to reciprocals (1/α, 1/β)
  { id: "BX-POLY-E-008", subject: "Maths", topicKey: "polynomials", subtopic: "Constructing a Polynomial", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "In a gear system the two gear speeds (in suitable units) are the zeros of 3x² − 16x + 5. A reversing linkage uses gears whose speeds are the RECIPROCALS of these.\n(i) Find the two original speeds (the zeros).\n(ii) Write the reciprocal speeds.\n(iii) Form a quadratic whose zeros are these reciprocals.\n(iv) Verify by computing 1/α + 1/β from the original coefficients.",
    solutionSteps: [
      "[1 mark] (i) 3x² − 16x + 5 = 0 ⇒ (3x − 1)(x − 5) = 0 ⇒ speeds 5 and 1/3.",
      "[1 mark] (ii) Reciprocals: 1/5 and 3.",
      "[1 mark] (iii) Reversing coefficients of ax² + bx + c gives cx² + bx + a = 5x² − 16x + 3.",
      "[1 mark] (iv) 1/α + 1/β = (α + β)/(αβ) = (16/3)/(5/3) = 16/5, matching sum of zeros of 5x² − 16x + 3 ✓.",
    ],
    finalAnswer: "(i) 5 and 1/3; (ii) 1/5 and 3; (iii) 5x² − 16x + 3; (iv) 1/α + 1/β = 16/5 ✓.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 009 — TRANSFORM zeros by a shift (α+2, β+2)
  { id: "BX-POLY-E-009", subject: "Maths", topicKey: "polynomials", subtopic: "Constructing a Polynomial", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A chemical process has two break-even temperatures (in °C) equal to the zeros of x² − 8x + 15. After recalibration every temperature reading rises by 2 °C, so each break-even temperature increases by 2.\n(i) Find the original break-even temperatures.\n(ii) Write the two new break-even temperatures.\n(iii) State the new sum and product of zeros.\n(iv) Form a quadratic whose zeros are the new temperatures.",
    solutionSteps: [
      "[1 mark] (i) x² − 8x + 15 = (x − 3)(x − 5) ⇒ 3 °C and 5 °C.",
      "[1 mark] (ii) Each +2: 5 °C and 7 °C.",
      "[1 mark] (iii) New sum = 5 + 7 = 12; new product = 5 × 7 = 35.",
      "[1 mark] (iv) Polynomial = x² − 12x + 35.",
    ],
    finalAnswer: "(i) 3, 5; (ii) 5, 7; (iii) sum 12, product 35; (iv) x² − 12x + 35.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 010 — axis of symmetry as MIDPOINT of zeros + max value (descriptive vertex)
  { id: "BX-POLY-E-010", subject: "Maths", topicKey: "polynomials", subtopic: "Geometrical Meaning", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "A model rocket's height (in metres) after x seconds is h(x) = −2x² + 12x.\n(i) Find the zeros of h(x) and state what they mean physically.\n(ii) The greatest height occurs on the axis of symmetry, midway between the zeros. Find that time.\n(iii) Find the maximum height.\n(iv) Does the parabola open upward or downward, and what does its vertex represent?",
    solutionSteps: [
      "[1 mark] (i) −2x² + 12x = −2x(x − 6) = 0 ⇒ x = 0, 6: launch (t = 0) and landing (t = 6 s).",
      "[1 mark] (ii) Axis of symmetry = midpoint of zeros = (0 + 6)/2 = 3 s.",
      "[1 mark] (iii) h(3) = −2(9) + 36 = 18 m (maximum height).",
      "[1 mark] (iv) Leading coefficient −2 < 0 ⇒ opens downward; the vertex is the highest point (max height).",
    ],
    finalAnswer: "(i) 0 and 6 s (launch, landing); (ii) 3 s; (iii) 18 m; (iv) downward, vertex = maximum height.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 011 — read TYPE and number of zeros from described graph shapes (repeated root)
  { id: "BX-POLY-E-011", subject: "Maths", topicKey: "polynomials", subtopic: "Graph & Type of Polynomial", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Three signal traces are printed on a graph. Trace G1 is a straight line crossing the x-axis once. Trace G2 is a U-shaped curve that just TOUCHES the x-axis at a single point. Trace G3 is a U-shaped curve that CROSSES the x-axis at two distinct points.\n(i) How many zeros does G1 have and what is its polynomial type?\n(ii) How many distinct zeros does G2 have and what is its type?\n(iii) How many zeros does G3 have and what is its type?\n(iv) Which trace corresponds to a quadratic with two equal zeros? Justify.",
    solutionSteps: [
      "[1 mark] (i) G1 crosses once ⇒ 1 zero; a straight line is a linear polynomial.",
      "[1 mark] (ii) G2 touches once ⇒ 1 distinct (repeated) zero; the U-shape is a quadratic.",
      "[1 mark] (iii) G3 crosses twice ⇒ 2 distinct zeros; also a quadratic.",
      "[1 mark] (iv) G2 — a curve that only touches the x-axis has two EQUAL zeros (discriminant = 0).",
    ],
    finalAnswer: "(i) 1 zero, linear; (ii) 1 repeated zero, quadratic; (iii) 2 zeros, quadratic; (iv) G2 (equal zeros).",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 012 — symmetry: equal values at points equidistant from the axis
  { id: "BX-POLY-E-012", subject: "Maths", topicKey: "polynomials", subtopic: "Geometrical Meaning", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "A tunnel's cross-section follows p(x) = x² − 6x + 8, where x is the horizontal distance across the base.\n(i) Evaluate p(1) and p(5).\n(ii) Explain why these two values are equal.\n(iii) Find the zeros of p(x).\n(iv) State the axis of symmetry using the zeros, and confirm it lies midway between x = 1 and x = 5.",
    solutionSteps: [
      "[1 mark] (i) p(1) = 1 − 6 + 8 = 3; p(5) = 25 − 30 + 8 = 3.",
      "[1 mark] (ii) A parabola is symmetric about its axis; x = 1 and x = 5 are equidistant from it, so the values match.",
      "[1 mark] (iii) x² − 6x + 8 = (x − 2)(x − 4) ⇒ zeros 2 and 4.",
      "[1 mark] (iv) Axis = midpoint of zeros = (2 + 4)/2 = 3, which is also the midpoint of 1 and 5 ✓.",
    ],
    finalAnswer: "(i) both 3; (ii) equidistant from axis; (iii) 2 and 4; (iv) axis x = 3 = midpoint of 1 and 5.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 013 — symmetric function 1/α + 1/β
  { id: "BX-POLY-E-013", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Two taps fill a tank; their individual filling times (in hours) are the zeros of x² − 12x + 27. The combined hourly rate depends on 1/α + 1/β.\n(i) State the sum and product of the zeros from the coefficients.\n(ii) Find 1/α + 1/β without finding the zeros individually.\n(iii) Find the actual filling times (the zeros).\n(iv) Verify your value of 1/α + 1/β.",
    solutionSteps: [
      "[1 mark] (i) Sum = 12, product = 27.",
      "[1 mark] (ii) 1/α + 1/β = (α + β)/(αβ) = 12/27 = 4/9.",
      "[1 mark] (iii) x² − 12x + 27 = (x − 3)(x − 9) ⇒ 3 h and 9 h.",
      "[1 mark] (iv) 1/3 + 1/9 = 3/9 + 1/9 = 4/9 ✓.",
    ],
    finalAnswer: "(i) sum 12, product 27; (ii) 1/α + 1/β = 4/9; (iii) 3 h, 9 h; (iv) 1/3 + 1/9 = 4/9 ✓.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 014 — difference of zeros via (α−β)^2 identity
  { id: "BX-POLY-E-014", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Two flag-poles have heights (in metres) equal to the zeros of x² − 10x + 21. A designer needs the DIFFERENCE of the two heights.\n(i) State the sum and product of the zeros.\n(ii) Compute (α − β)² using (α + β)² − 4αβ.\n(iii) Hence find |α − β|, the height difference.\n(iv) Find the actual heights and check the difference.",
    solutionSteps: [
      "[1 mark] (i) Sum = 10, product = 21.",
      "[1 mark] (ii) (α − β)² = (α + β)² − 4αβ = 100 − 84 = 16.",
      "[1 mark] (iii) |α − β| = √16 = 4 m.",
      "[1 mark] (iv) x² − 10x + 21 = (x − 3)(x − 7) ⇒ 3 m and 7 m; 7 − 3 = 4 m ✓.",
    ],
    finalAnswer: "(i) sum 10, product 21; (ii) (α − β)² = 16; (iii) 4 m; (iv) 3 m, 7 m, difference 4 m ✓.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 015 — find unknown k from a symmetric CONDITION (α²+β² given)
  { id: "BX-POLY-E-015", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "A designer models two support lengths as the zeros of x² − 12x + k and requires that the sum of the squares of the two lengths equals 80.\n(i) Express α² + β² in terms of k using the coefficients.\n(ii) Set it equal to 80 and solve for k.\n(iii) Find the two lengths (zeros) for your value of k.\n(iv) Verify that α² + β² = 80.",
    solutionSteps: [
      "[1 mark] (i) α + β = 12, αβ = k ⇒ α² + β² = (α + β)² − 2αβ = 144 − 2k.",
      "[1 mark] (ii) 144 − 2k = 80 ⇒ 2k = 64 ⇒ k = 32.",
      "[1 mark] (iii) x² − 12x + 32 = (x − 4)(x − 8) ⇒ lengths 4 and 8.",
      "[1 mark] (iv) 4² + 8² = 16 + 64 = 80 ✓.",
    ],
    finalAnswer: "(i) 144 − 2k; (ii) k = 32; (iii) 4 and 8; (iv) 16 + 64 = 80 ✓.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 016 — expand a product-form area, zeros, positivity, relationship
  { id: "BX-POLY-E-016", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes of Polynomial", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A rectangular pen is built against a wall using 20 m of fencing for the three open sides. If one side is x metres, the enclosed area is A(x) = x(20 − x).\n(i) Expand A(x) into standard quadratic form.\n(ii) Find the zeros of A(x).\n(iii) For which values of x is the area positive (a real pen)?\n(iv) Verify the sum-of-zeros relationship for A(x).",
    solutionSteps: [
      "[1 mark] (i) A(x) = x(20 − x) = 20x − x² = −x² + 20x.",
      "[1 mark] (ii) −x² + 20x = −x(x − 20) = 0 ⇒ x = 0 and x = 20.",
      "[1 mark] (iii) Downward parabola is positive between its zeros: 0 < x < 20.",
      "[1 mark] (iv) −b/a = −20/(−1) = 20 = sum of zeros (0 + 20) ✓.",
    ],
    finalAnswer: "(i) −x² + 20x; (ii) x = 0, 20; (iii) 0 < x < 20; (iv) sum = 20 = −b/a ✓.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 017 — symmetric function alpha^3 + beta^3
  { id: "BX-POLY-E-017", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Two cubical storage bins have edge lengths (in metres) equal to the zeros of x² − 5x + 6. The total volume needs α³ + β³ (the sum of the two cubes).\n(i) State the sum and product of the zeros.\n(ii) Find α³ + β³ using α³ + β³ = (α + β)³ − 3αβ(α + β).\n(iii) Find the actual edge lengths (the zeros).\n(iv) Verify the value of α³ + β³.",
    solutionSteps: [
      "[1 mark] (i) Sum = 5, product = 6.",
      "[1 mark] (ii) α³ + β³ = 5³ − 3(6)(5) = 125 − 90 = 35.",
      "[1 mark] (iii) x² − 5x + 6 = (x − 2)(x − 3) ⇒ edges 2 m and 3 m.",
      "[1 mark] (iv) 2³ + 3³ = 8 + 27 = 35 ✓ (total volume 35 m³).",
    ],
    finalAnswer: "(i) sum 5, product 6; (ii) α³ + β³ = 35; (iii) 2 m, 3 m; (iv) 8 + 27 = 35 ✓.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 018 — discriminant feasibility + parabola lies entirely above axis
  { id: "BX-POLY-E-018", subject: "Maths", topicKey: "polynomials", subtopic: "Geometrical Meaning", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "An architect proposes an arch whose height is modelled by p(x) = x² − 4x + 7, hoping it will touch the ground (the x-axis) at two points.\n(i) Determine whether p(x) has real zeros using the discriminant.\n(ii) What does your answer mean for the arch touching the ground?\n(iii) Does the parabola open upward or downward, and does it lie above or below the x-axis?\n(iv) Find the lowest point (on the axis of symmetry x = 2) and confirm your conclusion.",
    solutionSteps: [
      "[1 mark] (i) Discriminant = b² − 4ac = 16 − 28 = −12 < 0 ⇒ no real zeros.",
      "[1 mark] (ii) With no real zeros the curve never meets the x-axis, so the arch never touches the ground.",
      "[1 mark] (iii) Leading coefficient +1 > 0 ⇒ opens upward; with no real zeros it lies entirely ABOVE the x-axis.",
      "[1 mark] (iv) At x = 2: p(2) = 4 − 8 + 7 = 3 > 0, the minimum, confirming the curve stays above the axis.",
    ],
    finalAnswer: "(i) D = −12 < 0, no real zeros; (ii) never touches ground; (iii) opens up, lies above axis; (iv) min p(2) = 3 > 0.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 019 — read zeros/axis/max from a DATA TABLE, then form the polynomial
  { id: "BX-POLY-E-019", subject: "Maths", topicKey: "polynomials", subtopic: "Graph & Type of Polynomial", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "A long-jumper's height h (in metres) is recorded against time t (in seconds):\nt = 0, 1, 2, 3, 4 → h = 0, 3, 4, 3, 0.\n(i) From the table, at which times is the height 0 (the zeros)?\n(ii) The heights rise then fall symmetrically — what type of polynomial is h(t)?\n(iii) Read the axis of symmetry and the maximum height from the table.\n(iv) Form h(t) using the zeros and the maximum point.",
    solutionSteps: [
      "[1 mark] (i) h = 0 at t = 0 and t = 4, so the zeros are 0 and 4.",
      "[1 mark] (ii) A single symmetric rise-and-fall with two zeros ⇒ quadratic.",
      "[1 mark] (iii) The table is symmetric about t = 2, where h is greatest (4 m); axis t = 2, max 4 m.",
      "[1 mark] (iv) h(t) = a·t(t − 4); at t = 2: a(2)(−2) = −4a = 4 ⇒ a = −1 ⇒ h(t) = −t² + 4t.",
    ],
    finalAnswer: "(i) t = 0, 4; (ii) quadratic; (iii) axis t = 2, max 4 m; (iv) h(t) = −t² + 4t.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 020 — symmetric function alpha/beta + beta/alpha
  { id: "BX-POLY-E-020", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Two mutual funds' annual returns (in %) are the zeros of x² − 7x + 12. An analyst compares them through the ratio measure α/β + β/α.\n(i) State the sum and product of the zeros.\n(ii) Find α² + β² using the identity.\n(iii) Hence find α/β + β/α = (α² + β²)/(αβ).\n(iv) Find the actual returns and verify the ratio measure.",
    solutionSteps: [
      "[1 mark] (i) Sum = 7, product = 12.",
      "[1 mark] (ii) α² + β² = (α + β)² − 2αβ = 49 − 24 = 25.",
      "[1 mark] (iii) α/β + β/α = (α² + β²)/(αβ) = 25/12.",
      "[1 mark] (iv) Zeros are 3 and 4; 3/4 + 4/3 = (9 + 16)/12 = 25/12 ✓.",
    ],
    finalAnswer: "(i) sum 7, product 12; (ii) 25; (iii) 25/12; (iv) 3 and 4, 3/4 + 4/3 = 25/12 ✓.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 021 — TRANSFORM zeros by reflection (−α, −β): sum flips, product unchanged
  { id: "BX-POLY-E-021", subject: "Maths", topicKey: "polynomials", subtopic: "Constructing a Polynomial", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "On a number line a shape crosses at the zeros of x² − 5x − 14. The shape is then REFLECTED across the origin, so each zero is replaced by its negative.\n(i) Find the original zeros.\n(ii) Write the reflected zeros (their negatives).\n(iii) State the new sum and product of zeros and compare with the originals.\n(iv) Form a quadratic whose zeros are the reflected zeros.",
    solutionSteps: [
      "[1 mark] (i) x² − 5x − 14 = (x − 7)(x + 2) ⇒ zeros 7 and −2.",
      "[1 mark] (ii) Negatives: −7 and 2.",
      "[1 mark] (iii) New sum = −7 + 2 = −5 (sign of old sum 5 flipped); new product = (−7)(2) = −14 (unchanged).",
      "[1 mark] (iv) Polynomial = x² − (−5)x + (−14) = x² + 5x − 14.",
    ],
    finalAnswer: "(i) 7, −2; (ii) −7, 2; (iii) sum −5 (flipped), product −14 (same); (iv) x² + 5x − 14.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 022 — derive sum from PERIMETER, product from AREA, then form and solve
  { id: "BX-POLY-E-022", subject: "Maths", topicKey: "polynomials", subtopic: "Constructing a Polynomial", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A rectangular park has perimeter 28 m and area 45 m². Its length and width are the two zeros of a quadratic.\n(i) Find the sum and the product of the length and width.\n(ii) Form a quadratic polynomial whose zeros are the two sides.\n(iii) Find the length and the width.\n(iv) Verify the area using your dimensions.",
    solutionSteps: [
      "[1 mark] (i) Perimeter 28 ⇒ length + width = 14; area ⇒ product = 45.",
      "[1 mark] (ii) Polynomial = x² − 14x + 45.",
      "[1 mark] (iii) x² − 14x + 45 = (x − 5)(x − 9) ⇒ sides 5 m and 9 m.",
      "[1 mark] (iv) Area = 5 × 9 = 45 m² ✓.",
    ],
    finalAnswer: "(i) sum 14, product 45; (ii) x² − 14x + 45; (iii) 5 m and 9 m; (iv) 45 m² ✓.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 023 — DEGREE vs number of zeros from graphs (cubic count is geometric, IN)
  { id: "BX-POLY-E-023", subject: "Maths", topicKey: "polynomials", subtopic: "Graph & Type of Polynomial", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Two roller-coaster profiles are graphed. Track A's curve crosses the x-axis at 3 distinct points; Track B's curve crosses the x-axis at 2 distinct points.\n(i) How many zeros does Track A have?\n(ii) What is the minimum possible degree of A's polynomial?\n(iii) How many zeros does Track B have, and what is its minimum degree?\n(iv) Can a quadratic polynomial ever cross the x-axis at 3 points? Justify.",
    solutionSteps: [
      "[1 mark] (i) Track A crosses at 3 points, so it has 3 zeros.",
      "[1 mark] (ii) A polynomial of degree n has at most n zeros, so A is at least degree 3 (cubic).",
      "[1 mark] (iii) Track B has 2 zeros; its minimum degree is 2 (quadratic).",
      "[1 mark] (iv) No — a quadratic has at most 2 zeros, so it can cross the x-axis at most twice.",
    ],
    finalAnswer: "(i) 3 zeros; (ii) degree ≥ 3 (cubic); (iii) 2 zeros, quadratic; (iv) no, a quadratic has at most 2 zeros.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 024 — factorise, reject the non-physical zero, then evaluate
  { id: "BX-POLY-E-024", subject: "Maths", topicKey: "polynomials", subtopic: "Zeros & Factorisation", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "A small workshop's net revenue is modelled by A(x) = 2x² + 5x − 3, where x ≥ 0 is the number of items produced (in dozens).\n(i) Factorise A(x).\n(ii) Find the zeros of A(x).\n(iii) Which zero is physically meaningful given that x ≥ 0, and why?\n(iv) Find the net revenue when x = 2.",
    solutionSteps: [
      "[1 mark] (i) A(x) = 2x² + 5x − 3 = (2x − 1)(x + 3).",
      "[1 mark] (ii) Zeros: 2x − 1 = 0 ⇒ x = 1/2; x + 3 = 0 ⇒ x = −3.",
      "[1 mark] (iii) Only x = 1/2 is meaningful; x = −3 is rejected because production x ≥ 0 cannot be negative.",
      "[1 mark] (iv) A(2) = 2(4) + 5(2) − 3 = 8 + 10 − 3 = 15.",
    ],
    finalAnswer: "(i) (2x − 1)(x + 3); (ii) 1/2 and −3; (iii) x = 1/2 (x ≥ 0); (iv) 15.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 025 — TRANSFORM zeros to their squares (α², β²)
  { id: "BX-POLY-E-025", subject: "Maths", topicKey: "polynomials", subtopic: "Constructing a Polynomial", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Two square tiles have side lengths (in cm) equal to the zeros of x² − 7x + 10. A new pattern uses tiles whose sides equal the AREAS of the original tiles (i.e. the squares of the original zeros).\n(i) Find the original side lengths (the zeros).\n(ii) Write the new side lengths (the squares of the zeros).\n(iii) State the sum and product of the new zeros.\n(iv) Form a quadratic whose zeros are the squared values.",
    solutionSteps: [
      "[1 mark] (i) x² − 7x + 10 = (x − 2)(x − 5) ⇒ sides 2 cm and 5 cm.",
      "[1 mark] (ii) Squares: 2² = 4 and 5² = 25.",
      "[1 mark] (iii) New sum = 4 + 25 = 29; new product = 4 × 25 = 100.",
      "[1 mark] (iv) Polynomial = x² − 29x + 100.",
    ],
    finalAnswer: "(i) 2, 5; (ii) 4, 25; (iii) sum 29, product 100; (iv) x² − 29x + 100.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 026 — recover coefficient from a DIFFERENCE + product condition
  { id: "BX-POLY-E-026", subject: "Maths", topicKey: "polynomials", subtopic: "Relationship between Zeroes and Coefficients", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "A carpenter cuts a board into two positive lengths that are the zeros of x² − bx + 8. The two lengths differ by exactly 2 units.\n(i) Using product = 8 and difference = 2, find the two lengths.\n(ii) Find b (the sum of the lengths).\n(iii) Write the polynomial explicitly.\n(iv) Verify both the product and the difference for your zeros.",
    solutionSteps: [
      "[1 mark] (i) Two positive numbers with product 8 differing by 2 are 2 and 4 (2 × 4 = 8, 4 − 2 = 2).",
      "[1 mark] (ii) b = sum of zeros = 2 + 4 = 6.",
      "[1 mark] (iii) Polynomial = x² − 6x + 8.",
      "[1 mark] (iv) Product 2 × 4 = 8 ✓; difference 4 − 2 = 2 ✓.",
    ],
    finalAnswer: "(i) 2 and 4; (ii) b = 6; (iii) x² − 6x + 8; (iv) product 8, difference 2 ✓.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },

  // 027 — recover coefficient from a RATIO condition (one zero double the other)
  { id: "BX-POLY-E-027", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes & Coefficient Relationship", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "A recipe uses two ingredients whose quantities (in grams) are the zeros of x² − 9x + k, and one quantity is exactly TWICE the other.\n(i) Let the zeros be α and 2α; use the sum of zeros to find α.\n(ii) State the two quantities (the zeros).\n(iii) Find k using the product of zeros.\n(iv) Verify the sum and product relationships for your polynomial.",
    solutionSteps: [
      "[1 mark] (i) Sum α + 2α = 3α = 9 ⇒ α = 3.",
      "[1 mark] (ii) Zeros are 3 g and 2α = 6 g.",
      "[1 mark] (iii) k = product = 3 × 6 = 18.",
      "[1 mark] (iv) For x² − 9x + 18: −b/a = 9 = 3 + 6 ✓; c/a = 18 = 3 × 6 ✓.",
    ],
    finalAnswer: "(i) α = 3; (ii) 3 g and 6 g; (iii) k = 18; (iv) sum 9, product 18 ✓.",
    ncertRef: "CBSE 2026-27 case-based (application)", isCompetencyBased: true },
];
