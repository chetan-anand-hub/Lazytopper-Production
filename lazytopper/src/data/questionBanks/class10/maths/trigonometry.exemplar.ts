import type { CanonicalQuestion } from '../../../predictionTypes';

// Source: NCERT Class 10 Mathematics Exemplar — Chapter 8 "Introduction to Trigonometry and its Applications"
//         (the Exemplar combines NCERT Ch8 + Ch9 content under one Exemplar chapter).
// topicKey: "trigonometry" (single slug for both Ch8 and Ch9)
// Extraction date: 2026-05-22
// Syllabus: CBSE 2026-27 (12 marks — highest-weight Maths chapter)
// IDs encode chapter based on content:
//   TRIG-N-EXMPLR-8-* = Introduction to Trigonometry items (ratios, identities, complementary angles).
//   TRIG-N-EXMPLR-9-* = Heights & Distances / Applications items.

export const TRIG_EXEMPLAR: CanonicalQuestion[] = [
  // ===================== Ch8 (Intro to Trigonometry) Exemplar items =====================

  // ----- MCQs (Exercise 8.1) -----
  { id: "TRIG-N-EXMPLR-8-MCQ-001", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Ratios", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "If cos A = 4/5, then the value of tan A is:",
    options: ["3/5", "3/4", "4/3", "5/3"],
    answer: "3/4",
    solutionSteps: [
      "cos A = adjacent/hypotenuse = 4/5: let adjacent = 4k, hypotenuse = 5k.",
      "Pythagoras: opposite² = 25k² − 16k² = 9k² ⇒ opposite = 3k.",
      "tan A = opposite/adjacent = 3k/4k = 3/4."
    ],
    finalAnswer: "tan A = 3/4 — option (b).",
    ncertRef: "Exemplar Ch8 MCQ Q1", isCompetencyBased: true,
    strategyHint: "(3, 4, 5) Pythagorean triple — recognise it on sight." },

  { id: "TRIG-N-EXMPLR-8-MCQ-002", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Ratios", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "If sin A = 1/2, then the value of cot A is:",
    options: ["√3", "1/√3", "√3/2", "1"],
    answer: "√3",
    solutionSteps: [
      "sin A = 1/2 ⇒ A = 30°.",
      "cot 30° = √3."
    ],
    finalAnswer: "cot A = √3 — option (a).",
    ncertRef: "Exemplar Ch8 MCQ Q2", isCompetencyBased: false,
    strategyHint: "Recognise sin A = 1/2 ⇒ A = 30° and recall cot 30° = √3." },

  { id: "TRIG-N-EXMPLR-8-MCQ-003", subject: "Maths", topicKey: "trigonometry", subtopic: "Complementary Angles", section: "A", marks: 1, format: "MCQ", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "The value of the expression [cosec(75° + θ) − sec(15° − θ) − tan(55° + θ) + cot(35° − θ)] is:",
    options: ["−1", "0", "1", "3/2"],
    answer: "0",
    solutionSteps: [
      "Pair complementary terms.",
      "cosec(75° + θ) and sec(15° − θ): note (75° + θ) + (15° − θ) = 90°, so sec(15° − θ) = cosec(90° − (15° − θ)) = cosec(75° + θ).",
      "So cosec(75° + θ) − sec(15° − θ) = 0.",
      "Similarly (55° + θ) + (35° − θ) = 90°, so cot(35° − θ) = tan(90° − (35° − θ)) = tan(55° + θ).",
      "So −tan(55° + θ) + cot(35° − θ) = 0.",
      "Total = 0 + 0 = 0."
    ],
    finalAnswer: "0 — option (b).",
    ncertRef: "Exemplar Ch8 MCQ Q3", isCompetencyBased: true,
    strategyHint: "Look for angle pairs summing to 90° — they convert into each other." },

  { id: "TRIG-N-EXMPLR-8-MCQ-004", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Ratios", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Given that sin θ = a/b, then cos θ is equal to:",
    options: ["b/√(b² − a²)", "b/a", "√(b² − a²)/b", "a/√(b² − a²)"],
    answer: "√(b² − a²)/b",
    solutionSteps: [
      "sin²θ + cos²θ = 1 ⇒ cos²θ = 1 − (a/b)² = (b² − a²)/b².",
      "cos θ = √(b² − a²) / b (positive root, since θ is acute)."
    ],
    finalAnswer: "cos θ = √(b² − a²)/b — option (c).",
    ncertRef: "Exemplar Ch8 MCQ Q4", isCompetencyBased: true,
    strategyHint: "Use cos²θ = 1 − sin²θ." },

  { id: "TRIG-N-EXMPLR-8-MCQ-005", subject: "Maths", topicKey: "trigonometry", subtopic: "Complementary Angles", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "The value of (tan 1° · tan 2° · tan 3° · … · tan 89°) is:",
    options: ["0", "1", "2", "1/2"],
    answer: "1",
    solutionSteps: [
      "Pair tan θ with tan(90° − θ): tan θ · tan(90° − θ) = tan θ · cot θ = 1.",
      "Pairs: (tan 1°, tan 89°), (tan 2°, tan 88°), …, (tan 44°, tan 46°). Each pair multiplies to 1.",
      "The middle factor is tan 45° = 1.",
      "Product = 1 × 1 × … × 1 = 1."
    ],
    finalAnswer: "1 — option (b).",
    ncertRef: "Exemplar Ch8 MCQ Q6", isCompetencyBased: true,
    strategyHint: "Pair tan θ with tan(90° − θ): each pair = 1, plus the centre tan 45° = 1." },

  { id: "TRIG-N-EXMPLR-8-MCQ-006", subject: "Maths", topicKey: "trigonometry", subtopic: "Complementary Angles", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If cos 9α = sin α and 9α < 90°, then the value of tan 5α is:",
    options: ["1/√3", "√3", "1", "0"],
    answer: "1",
    solutionSteps: [
      "Use cos 9α = sin(90° − 9α). So sin(90° − 9α) = sin α.",
      "Equate angles (both acute): 90° − 9α = α ⇒ 10α = 90° ⇒ α = 9°.",
      "Then 5α = 45° ⇒ tan 5α = tan 45° = 1."
    ],
    finalAnswer: "tan 5α = 1 — option (c).",
    ncertRef: "Exemplar Ch8 MCQ Q7", isCompetencyBased: true,
    strategyHint: "Convert cos to sin via cos θ = sin(90° − θ); equate." },

  { id: "TRIG-N-EXMPLR-8-MCQ-007", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Ratios", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "If ∆ABC is right-angled at C, then the value of cos(A + B) is:",
    options: ["0", "1", "1/2", "√3/2"],
    answer: "0",
    solutionSteps: [
      "Sum of angles in a triangle = 180°. Since C = 90°, A + B = 90°.",
      "cos(A + B) = cos 90° = 0."
    ],
    finalAnswer: "0 — option (a).",
    ncertRef: "Exemplar Ch8 MCQ Q8", isCompetencyBased: false,
    strategyHint: "A + B + C = 180° and C = 90° ⇒ A + B = 90°." },

  { id: "TRIG-N-EXMPLR-8-MCQ-008", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Identities", section: "A", marks: 1, format: "MCQ", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "If sin A + sin²A = 1, then the value of the expression (cos²A + cos⁴A) is:",
    options: ["1", "1/2", "2", "3"],
    answer: "1",
    solutionSteps: [
      "Given sin A + sin²A = 1 ⇒ sin A = 1 − sin²A = cos²A.",
      "Compute cos²A + cos⁴A = cos²A + (cos²A)² = sin A + sin²A (substituting cos²A = sin A).",
      "= 1 (given)."
    ],
    finalAnswer: "1 — option (a).",
    ncertRef: "Exemplar Ch8 MCQ Q9", isCompetencyBased: true,
    strategyHint: "Spot that 1 − sin²A = cos²A, so sin A = cos²A — then substitute." },

  { id: "TRIG-N-EXMPLR-8-MCQ-009", subject: "Maths", topicKey: "trigonometry", subtopic: "Ratios of Specific Angles", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Given that sin α = 1/2 and cos β = 1/2, then the value of (α + β) is:",
    options: ["0°", "30°", "60°", "90°"],
    answer: "90°",
    solutionSteps: [
      "sin α = 1/2 ⇒ α = 30°.",
      "cos β = 1/2 ⇒ β = 60°.",
      "α + β = 30° + 60° = 90°."
    ],
    finalAnswer: "90° — option (d).",
    ncertRef: "Exemplar Ch8 MCQ Q10", isCompetencyBased: false,
    strategyHint: "Use the standard-angle table." },

  { id: "TRIG-N-EXMPLR-8-MCQ-010", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Identities", section: "A", marks: 1, format: "MCQ", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "If 4 tan θ = 3, then (4 sin θ − cos θ)/(4 sin θ + cos θ) is equal to:",
    options: ["2/3", "1/3", "1/2", "3/4"],
    answer: "1/2",
    solutionSteps: [
      "Divide numerator and denominator by cos θ: numerator → 4 tan θ − 1; denominator → 4 tan θ + 1.",
      "Substitute 4 tan θ = 3: (3 − 1)/(3 + 1) = 2/4 = 1/2."
    ],
    finalAnswer: "1/2 — option (c).",
    ncertRef: "Exemplar Ch8 MCQ Q12", isCompetencyBased: true,
    strategyHint: "Divide top and bottom by cos θ to convert sin/cos into tan." },

  { id: "TRIG-N-EXMPLR-8-MCQ-011", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Identities", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If sin θ − cos θ = 0, then the value of (sin⁴θ + cos⁴θ) is:",
    options: ["1", "3/4", "1/2", "1/4"],
    answer: "1/2",
    solutionSteps: [
      "sin θ = cos θ ⇒ tan θ = 1 ⇒ θ = 45°.",
      "sin 45° = cos 45° = 1/√2.",
      "sin⁴θ + cos⁴θ = (1/√2)⁴ + (1/√2)⁴ = 1/4 + 1/4 = 1/2."
    ],
    finalAnswer: "1/2 — option (c).",
    ncertRef: "Exemplar Ch8 MCQ Q13", isCompetencyBased: true,
    strategyHint: "sin θ = cos θ pins θ = 45°." },

  // ----- True/False (Exercise 8.2) -----
  { id: "TRIG-N-EXMPLR-8-SA-001", subject: "Maths", topicKey: "trigonometry", subtopic: "Complementary Angles", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "State whether the statement is true or false, with justification: tan 47° / cot 43° = 1.",
    solutionSteps: [
      "Use cot 43° = tan(90° − 43°) = tan 47°.",
      "So tan 47° / cot 43° = tan 47° / tan 47° = 1.",
      "The statement is TRUE."
    ],
    finalAnswer: "True — because cot 43° = tan 47°, so the ratio equals 1.",
    ncertRef: "Exemplar Ch8 Ex 8.2 Q1", isCompetencyBased: true,
    strategyHint: "47° and 43° are complementary; convert cot to tan." },

  { id: "TRIG-N-EXMPLR-8-SA-002", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Identities", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "State whether the statement is true or false, with justification: (1 − cos²θ) · sec²θ = tan θ.",
    solutionSteps: [
      "LHS = (1 − cos²θ) · sec²θ = sin²θ · (1/cos²θ) = sin²θ/cos²θ = tan²θ.",
      "So LHS = tan²θ, not tan θ in general.",
      "Hence the statement is FALSE (it should be tan²θ)."
    ],
    finalAnswer: "False — LHS simplifies to tan²θ, not tan θ.",
    ncertRef: "Exemplar Ch8 Ex 8.2 Q4", isCompetencyBased: true,
    strategyHint: "1 − cos²θ = sin²θ, and sec²θ = 1/cos²θ, so the LHS is tan²θ." },

  { id: "TRIG-N-EXMPLR-8-AR-001", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Identities", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Assertion (A): For 0° ≤ A ≤ 90°, sin²A + cos²A = 1.\nReason (R): In any right triangle, the sum of the squares of the legs equals the square of the hypotenuse.\nChoose the correct option.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    solutionSteps: [
      "Assertion: sin²A + cos²A = 1 — true (standard identity).",
      "Reason: Pythagoras' theorem in a right triangle — also true.",
      "Derivation: In a right triangle with legs a, b and hypotenuse c, sin A = a/c, cos A = b/c, so sin²A + cos²A = (a² + b²)/c² = c²/c² = 1 (using a² + b² = c²).",
      "Thus the identity sin²A + cos²A = 1 follows directly from Pythagoras' theorem — Reason explains Assertion."
    ],
    finalAnswer: "Option (A) — both true and Reason explains Assertion.",
    ncertRef: "Exemplar Ch8 (derived)", isCompetencyBased: true,
    strategyHint: "The Pythagorean identity in trig IS Pythagoras' theorem applied to side-ratios." },

  // ----- Short Answer (Exercise 8.3) -----
  { id: "TRIG-N-EXMPLR-8-SA-003", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Identities", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Prove that sin θ/(1 + cos θ) + (1 + cos θ)/sin θ = 2 cosec θ.",
    solutionSteps: [
      "LHS = sin θ/(1 + cos θ) + (1 + cos θ)/sin θ.",
      "Combine over common denominator sin θ · (1 + cos θ): LHS = [sin²θ + (1 + cos θ)²] / [sin θ (1 + cos θ)].",
      "Expand numerator: sin²θ + 1 + 2 cos θ + cos²θ = (sin²θ + cos²θ) + 1 + 2 cos θ = 1 + 1 + 2 cos θ = 2 + 2 cos θ = 2(1 + cos θ).",
      "LHS = 2(1 + cos θ) / [sin θ (1 + cos θ)] = 2/sin θ = 2 cosec θ = RHS.",
      "Hence proved."
    ],
    finalAnswer: "LHS = 2 cosec θ = RHS.",
    ncertRef: "Exemplar Ch8 Ex 8.3 Q1", isCompetencyBased: true,
    strategyHint: "Add fractions, expand the numerator, and use sin² + cos² = 1." },

  { id: "TRIG-N-EXMPLR-8-SA-004", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Ratios", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If tan A = 3/4, show that sin A · cos A = 12/25.",
    solutionSteps: [
      "tan A = 3/4 ⇒ opposite = 3k, adjacent = 4k. Hypotenuse = √((3k)² + (4k)²) = √(25k²) = 5k.",
      "sin A = 3/5, cos A = 4/5.",
      "sin A · cos A = (3/5)(4/5) = 12/25.",
      "Hence proved."
    ],
    finalAnswer: "sin A · cos A = 12/25.",
    ncertRef: "Exemplar Ch8 Ex 8.3 Q3", isCompetencyBased: true,
    strategyHint: "(3, 4, 5) triangle gives sin = 3/5, cos = 4/5." },

  { id: "TRIG-N-EXMPLR-8-SA-005", subject: "Maths", topicKey: "trigonometry", subtopic: "Ratios of Specific Angles", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If √3 tan θ = 1, find the value of sin²θ − cos²θ.",
    solutionSteps: [
      "tan θ = 1/√3 ⇒ θ = 30°.",
      "sin 30° = 1/2, cos 30° = √3/2.",
      "sin²θ − cos²θ = (1/2)² − (√3/2)² = 1/4 − 3/4 = −1/2."
    ],
    finalAnswer: "−1/2.",
    ncertRef: "Exemplar Ch8 Ex 8.3 Q9", isCompetencyBased: true,
    strategyHint: "tan θ = 1/√3 ⇒ θ = 30°; then evaluate from the table." },

  { id: "TRIG-N-EXMPLR-8-SA-006", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Identities", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Simplify (1 + tan²θ)(1 − sin θ)(1 + sin θ).",
    solutionSteps: [
      "(1 − sin θ)(1 + sin θ) = 1 − sin²θ = cos²θ.",
      "1 + tan²θ = sec²θ = 1/cos²θ.",
      "Product = sec²θ · cos²θ = (1/cos²θ) · cos²θ = 1."
    ],
    finalAnswer: "1.",
    ncertRef: "Exemplar Ch8 Ex 8.3 Q11", isCompetencyBased: true,
    strategyHint: "Recognise the difference of squares and the identity 1 + tan² = sec²." },

  { id: "TRIG-N-EXMPLR-8-SA-007", subject: "Maths", topicKey: "trigonometry", subtopic: "Ratios of Specific Angles", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If 2 sin²θ − cos²θ = 2, then find the value of θ (0° ≤ θ ≤ 90°).",
    solutionSteps: [
      "Replace cos²θ with 1 − sin²θ: 2 sin²θ − (1 − sin²θ) = 2.",
      "2 sin²θ − 1 + sin²θ = 2 ⇒ 3 sin²θ = 3 ⇒ sin²θ = 1.",
      "sin θ = 1 (taking positive root, since θ acute) ⇒ θ = 90°."
    ],
    finalAnswer: "θ = 90°.",
    ncertRef: "Exemplar Ch8 Ex 8.3 Q12", isCompetencyBased: true,
    strategyHint: "Use cos² = 1 − sin² to reduce to a single variable." },

  { id: "TRIG-N-EXMPLR-8-LA-001", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Identities", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Prove the identity: sec²θ + cosec²θ · √(... )  ⇒ Prove that sec²θ + cosec²θ ≥ tan θ + cot θ, equivalently establish that sec²θ + cosec²θ = (tan θ + cot θ)² · 1 …  [Actually prove:]  Prove √(sec²θ + cosec²θ) = tan θ + cot θ.",
    solutionSteps: [
      "[1 mark] LHS² = sec²θ + cosec²θ = 1/cos²θ + 1/sin²θ.",
      "[1 mark] Taking LCM: = (sin²θ + cos²θ)/(sin²θ cos²θ) = 1/(sin²θ cos²θ), using the identity sin²θ + cos²θ = 1.",
      "[1 mark] RHS = tan θ + cot θ = sin θ/cos θ + cos θ/sin θ = (sin²θ + cos²θ)/(sin θ cos θ) = 1/(sin θ cos θ).",
      "[1 mark] RHS² = 1/(sin²θ cos²θ) = LHS². Since both sides are positive for 0° < θ < 90°, LHS = RHS.",
      "[1 mark] Hence √(sec²θ + cosec²θ) = tan θ + cot θ, i.e., sec²θ + cosec²θ = (tan θ + cot θ)². Proved."
    ],
    finalAnswer: "sec²θ + cosec²θ = (tan θ + cot θ)² (equivalently their square roots are equal).",
    ncertRef: "Exemplar Ch8 Ex 8.4 Q2", isCompetencyBased: true,
    strategyHint: "Reduce both sides to expressions in sin θ cos θ; everything collapses to 1/(sin θ cos θ)." },

  { id: "TRIG-N-EXMPLR-8-LA-002", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Identities", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "If cosec θ + cot θ = p, prove that cos θ = (p² − 1)/(p² + 1).",
    solutionSteps: [
      "Given: cosec θ + cot θ = p.   …(1)",
      "Use the identity cosec²θ − cot²θ = 1, i.e., (cosec θ + cot θ)(cosec θ − cot θ) = 1.",
      "So cosec θ − cot θ = 1/p.   …(2)",
      "Add (1) and (2): 2 cosec θ = p + 1/p = (p² + 1)/p ⇒ cosec θ = (p² + 1)/(2p) ⇒ sin θ = 2p/(p² + 1).",
      "Subtract (2) from (1): 2 cot θ = p − 1/p = (p² − 1)/p ⇒ cot θ = (p² − 1)/(2p).",
      "cos θ = cot θ · sin θ = [(p² − 1)/(2p)] · [2p/(p² + 1)] = (p² − 1)/(p² + 1). Proved."
    ],
    finalAnswer: "cos θ = (p² − 1)/(p² + 1).",
    ncertRef: "Exemplar Ch8 Ex 8.4 Q1", isCompetencyBased: true,
    strategyHint: "Use the conjugate identity cosec² − cot² = 1 to get a second equation, then solve as a system." },

  { id: "TRIG-N-EXMPLR-8-LA-003", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Identities", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "If tan θ + sec θ = l, prove that sec θ = (l² + 1)/(2l).",
    solutionSteps: [
      "[1 mark] Given: tan θ + sec θ = l.   …(1)",
      "[1 mark] Use the identity sec²θ − tan²θ = 1, i.e., (sec θ + tan θ)(sec θ − tan θ) = 1.",
      "[1 mark] Dividing by (1): sec θ − tan θ = 1/l.   …(2)",
      "[1 mark] Add (1) and (2): 2 sec θ = l + 1/l = (l² + 1)/l.",
      "[1 mark] Therefore sec θ = (l² + 1)/(2l). Proved."
    ],
    finalAnswer: "sec θ = (l² + 1)/(2l).",
    ncertRef: "Exemplar Ch8 Ex 8.4 Q9", isCompetencyBased: true,
    strategyHint: "Same trick: pair with conjugate identity sec² − tan² = 1." },

  // ===================== Ch9 (Applications) Exemplar items =====================

  // ----- MCQs (Exercise 8.1, application items) -----
  { id: "TRIG-N-EXMPLR-9-MCQ-001", subject: "Maths", topicKey: "trigonometry", subtopic: "Angle of Elevation", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A pole 6 m high casts a shadow 2√3 m long on the ground. The Sun's elevation is:",
    options: ["60°", "45°", "30°", "90°"],
    answer: "60°",
    solutionSteps: [
      "Let the Sun's elevation be θ. Then tan θ = height/shadow = 6/(2√3) = 3/√3 = √3.",
      "tan θ = √3 ⇒ θ = 60°."
    ],
    finalAnswer: "60° — option (a).",
    ncertRef: "Exemplar Ch8 MCQ Q15 (Applications)", isCompetencyBased: true,
    strategyHint: "tan(Sun's elevation) = pole / shadow." },

  // ----- True/False (Exercise 8.2) -----
  { id: "TRIG-N-EXMPLR-9-SA-001", subject: "Maths", topicKey: "trigonometry", subtopic: "Angle of Elevation", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "State true or false with justification: 'If the length of the shadow of a tower is increasing, then the angle of elevation of the Sun is also increasing.'",
    solutionSteps: [
      "Let the tower have height h and shadow length s. Then tan(angle of elevation) = h/s.",
      "If s increases (with h fixed), h/s decreases, so tan(elevation) decreases, so the angle decreases.",
      "Hence the statement is FALSE — as the shadow lengthens, the angle of elevation of the Sun DECREASES (think of early morning vs noon)."
    ],
    finalAnswer: "False — longer shadow ⇒ smaller angle of elevation (since tan θ = h/s decreases).",
    ncertRef: "Exemplar Ch8 Ex 8.2 Q7", isCompetencyBased: true,
    strategyHint: "tan(elev) = height/shadow — denominator up ⇒ ratio down ⇒ angle down." },

  { id: "TRIG-N-EXMPLR-9-SA-002", subject: "Maths", topicKey: "trigonometry", subtopic: "Angle of Elevation", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "State true or false with justification: 'The angle of elevation of the top of a tower is 30°. If the height of the tower is doubled, the angle of elevation will also double.'",
    solutionSteps: [
      "If original height is h and distance is d, then tan 30° = h/d ⇒ d = h√3.",
      "After doubling height: new tan(angle) = (2h)/d = 2h/(h√3) = 2/√3.",
      "tan 60° = √3 ≈ 1.732, while 2/√3 ≈ 1.155 ≠ √3.",
      "So the new angle is arctan(2/√3) ≈ 49.1°, not 60°.",
      "Hence the statement is FALSE — doubling the height does NOT double the angle."
    ],
    finalAnswer: "False — doubling h gives tan(new) = 2/√3, not √3 (60°). The angle does not double.",
    ncertRef: "Exemplar Ch8 Ex 8.2 Q11", isCompetencyBased: true,
    strategyHint: "Angle isn't linear in h — verify by computing tan(new angle)." },

  { id: "TRIG-N-EXMPLR-9-SA-003", subject: "Maths", topicKey: "trigonometry", subtopic: "Angle of Elevation", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "State true or false with justification: 'If both the height of a tower and the distance of the observation point from its foot are increased by 10%, then the angle of elevation of its top remains unchanged.'",
    solutionSteps: [
      "Originally: tan θ = h/d.",
      "After 10% increase in both: new tan = (1.1 h)/(1.1 d) = h/d = tan θ.",
      "So the new angle equals the old angle.",
      "Hence the statement is TRUE."
    ],
    finalAnswer: "True — proportional scaling of both legs leaves the ratio (and hence the angle) unchanged.",
    ncertRef: "Exemplar Ch8 Ex 8.2 Q12", isCompetencyBased: true,
    strategyHint: "Multiply both h and d by the same factor — tan θ is invariant." },

  // ----- Short answer Applications -----
  { id: "TRIG-N-EXMPLR-9-SA-004", subject: "Maths", topicKey: "trigonometry", subtopic: "Angle of Elevation", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "Find the angle of elevation of the Sun when the shadow of a pole h metres high is √3 h metres long.",
    solutionSteps: [
      "Let the angle of elevation be θ. tan θ = height/shadow = h/(√3 h) = 1/√3.",
      "tan θ = 1/√3 ⇒ θ = 30°."
    ],
    finalAnswer: "30°.",
    ncertRef: "Exemplar Ch8 Ex 8.3 Q8", isCompetencyBased: true,
    strategyHint: "Form tan(angle) = height/shadow, then read the standard angle." },

  { id: "TRIG-N-EXMPLR-9-SA-005", subject: "Maths", topicKey: "trigonometry", subtopic: "Heights and Distances", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "A ladder 15 m long just reaches the top of a vertical wall. If the ladder makes an angle of 60° with the wall, find the height of the wall.",
    solutionSteps: [
      "Important: the angle is with the WALL, so the angle with the ground is 90° − 60° = 30°.",
      "Alternatively, work directly: cos 60° = adjacent/hypotenuse where 'adjacent to the 60° (measured at the top) is the wall' — equivalently, the wall is adjacent to the angle the ladder makes with the wall.",
      "Let h = height of wall. Then cos 60° = h / 15 ⇒ h = 15 × 1/2 = 7.5.",
      "Wall height = 7.5 m."
    ],
    finalAnswer: "Height of the wall = 7.5 m.",
    ncertRef: "Exemplar Ch8 Ex 8.3 Q10", isCompetencyBased: true,
    strategyHint: "Angle measured FROM the wall: the wall is adjacent to that angle in the right triangle." },

  { id: "TRIG-N-EXMPLR-9-SA-006", subject: "Maths", topicKey: "trigonometry", subtopic: "Angle of Elevation", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "An observer 1.5 m tall is 20.5 m away from a tower 22 m high. Determine the angle of elevation of the top of the tower from the eye of the observer.",
    solutionSteps: [
      "Effective height above the eye level = 22 − 1.5 = 20.5 m.",
      "Horizontal distance = 20.5 m.",
      "tan(angle) = 20.5/20.5 = 1.",
      "Angle = 45°."
    ],
    finalAnswer: "Angle of elevation = 45°.",
    ncertRef: "Exemplar Ch8 Ex 8.3 Q14", isCompetencyBased: true,
    strategyHint: "Subtract observer's height before forming tan(angle) = height/distance." },

  // ----- Long Answer Applications (Exercise 8.4) -----
  { id: "TRIG-N-EXMPLR-9-LA-001", subject: "Maths", topicKey: "trigonometry", subtopic: "Heights and Distances", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "The angle of elevation of the top of a tower from a certain point is 30°. If the observer moves 20 metres towards the tower, the angle of elevation increases by 15°. Find the height of the tower.",
    solutionSteps: [
      "Let the tower be AB with height h, B the foot. Let the first point be P, the second be Q, with QB nearer.",
      "At P: tan 30° = h / PB ⇒ PB = h/tan 30° = h√3.",
      "At Q (after moving 20 m closer): angle is 30° + 15° = 45°. tan 45° = h/QB ⇒ QB = h.",
      "PB − QB = 20 ⇒ h√3 − h = 20 ⇒ h(√3 − 1) = 20.",
      "h = 20/(√3 − 1) = 20(√3 + 1)/[(√3 − 1)(√3 + 1)] = 20(√3 + 1)/(3 − 1) = 20(√3 + 1)/2 = 10(√3 + 1).",
      "Numerically ≈ 10 × 2.732 ≈ 27.32 m."
    ],
    finalAnswer: "Height of the tower = 10(√3 + 1) m ≈ 27.32 m.",
    ncertRef: "Exemplar Ch8 Ex 8.4 Q3", isCompetencyBased: true,
    strategyHint: "Two stations, two right triangles sharing the tower. Difference of distances = 20 m." },

  { id: "TRIG-N-EXMPLR-9-LA-002", subject: "Maths", topicKey: "trigonometry", subtopic: "Heights and Distances", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "The angle of elevation of the top of a tower from two points distant s and t (s > t) from its foot are complementary. Prove that the height of the tower is √(st).",
    solutionSteps: [
      "Let the tower have height h. Let the elevations from the two points be θ and 90° − θ (complementary).",
      "From distance s (farther): tan θ = h/s (assume θ is the smaller angle here).",
      "From distance t (nearer): tan(90° − θ) = cot θ = h/t.",
      "Multiply: tan θ · cot θ = (h/s)(h/t) ⇒ 1 = h²/(st).",
      "Therefore h² = st ⇒ h = √(st). Proved."
    ],
    finalAnswer: "Height = √(st).",
    ncertRef: "Exemplar Ch8 Ex 8.4 Q6", isCompetencyBased: true,
    strategyHint: "Complementary angles ⇒ tan and cot — multiplying gives 1, isolating h² = st." },

  { id: "TRIG-N-EXMPLR-9-LA-003", subject: "Maths", topicKey: "trigonometry", subtopic: "Heights and Distances", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The shadow of a tower standing on level ground is 50 m longer when the Sun's elevation is 30° than when it is 60°. Find the height of the tower.",
    solutionSteps: [
      "Let tower height = h, shadow at 60° = x. Then at 30°, shadow = x + 50.",
      "At 60°: tan 60° = h/x ⇒ √3 = h/x ⇒ h = x√3.   …(1)",
      "At 30°: tan 30° = h/(x + 50) ⇒ 1/√3 = h/(x + 50) ⇒ h = (x + 50)/√3.   …(2)",
      "Equate: x√3 = (x + 50)/√3 ⇒ 3x = x + 50 ⇒ 2x = 50 ⇒ x = 25.",
      "h = 25√3 m ≈ 43.3 m."
    ],
    finalAnswer: "Height of the tower = 25√3 m ≈ 43.3 m.",
    ncertRef: "Exemplar Ch8 Ex 8.4 Q7", isCompetencyBased: true,
    strategyHint: "Same tower, two shadow lengths — write tan at each elevation and eliminate x." },

  { id: "TRIG-N-EXMPLR-9-LA-004", subject: "Maths", topicKey: "trigonometry", subtopic: "Heights and Distances", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "The angle of elevation of the top of a tower 30 m high from the foot of another tower in the same plane is 60°, and the angle of elevation of the top of the second tower from the foot of the first is 30°. Find the distance between the two towers and the height of the second tower.",
    solutionSteps: [
      "[1 mark] Diagram: two towers on the same horizontal plane — Tower 1 of height 30 m, Tower 2 of height h, distance between their feet = d.",
      "[1 mark] From the foot of Tower 2, the elevation of the top of Tower 1 is 60°: tan 60° = 30/d ⇒ √3 = 30/d.",
      "[1 mark] So d = 30/√3 = 10√3 m ≈ 17.32 m.",
      "[1 mark] From the foot of Tower 1, the elevation of the top of Tower 2 is 30°: tan 30° = h/d ⇒ 1/√3 = h/(10√3).",
      "[1 mark] h = 10√3/√3 = 10 m. Hence the distance between the towers is 10√3 m and the height of the second tower is 10 m."
    ],
    finalAnswer: "Distance between towers = 10√3 m ≈ 17.32 m; height of second tower = 10 m.",
    ncertRef: "Exemplar Ch8 Ex 8.4 Q13", isCompetencyBased: true,
    strategyHint: "Two viewing setups give two equations in (d, h) — solve in sequence." },

  { id: "TRIG-N-EXMPLR-9-LA-005", subject: "Maths", topicKey: "trigonometry", subtopic: "Heights and Distances", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "The angle of elevation of the top of a vertical tower from a point on the ground is 60°. From another point 10 m vertically above the first, its angle of elevation is 45°. Find the height of the tower.",
    solutionSteps: [
      "Let the tower be AB with height h, foot at B. Let P be the ground point and Q be the point 10 m vertically above P.",
      "Let horizontal distance from P (and from Q, since Q is directly above P) to B = d.",
      "From P: tan 60° = h/d ⇒ √3 = h/d ⇒ d = h/√3.   …(1)",
      "From Q: the height of the tower as seen from Q is (h − 10) and horizontal distance is still d. tan 45° = (h − 10)/d ⇒ 1 = (h − 10)/d ⇒ d = h − 10.   …(2)",
      "Equate (1) and (2): h/√3 = h − 10 ⇒ h = √3(h − 10) ⇒ h = h√3 − 10√3 ⇒ h(√3 − 1) = 10√3 ⇒ h = 10√3/(√3 − 1).",
      "Rationalise: h = 10√3(√3 + 1)/[(√3 − 1)(√3 + 1)] = 10√3(√3 + 1)/2 = 5√3(√3 + 1) = 5(3 + √3) = 15 + 5√3.",
      "Numerically ≈ 15 + 8.66 ≈ 23.66 m."
    ],
    finalAnswer: "Height of the tower = (15 + 5√3) m ≈ 23.66 m.",
    ncertRef: "Exemplar Ch8 Ex 8.4 Q16", isCompetencyBased: true,
    strategyHint: "Both observation points have the same horizontal distance d to the tower — eliminate d." },

  { id: "TRIG-N-EXMPLR-9-CB-001", subject: "Maths", topicKey: "trigonometry", subtopic: "Heights and Distances", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "From a balloon vertically above a straight road, the angles of depression of two cars at an instant are found to be 45° and 60°. The cars are 100 m apart on the same side of the foot of the balloon.\n(a) Draw a mental picture: balloon at P at height h above point Q on the ground; cars at A and B on the road with B closer.\n(b) Express PQ in two ways using the two right triangles.\n(c) Find h, the height of the balloon.",
    solutionSteps: [
      "Let h = height of balloon. From balloon P at height h, draw vertical PQ to the road. Let car A be the farther car (depression 45°) and B the nearer car (depression 60°).",
      "In ∆PQA: ∠PAQ = 45° (alternate angles ⇒ angle of elevation from A = angle of depression). tan 45° = h/QA ⇒ QA = h.",
      "In ∆PQB: ∠PBQ = 60°. tan 60° = h/QB ⇒ QB = h/√3.",
      "Distance between cars: QA − QB = 100 ⇒ h − h/√3 = 100 ⇒ h(1 − 1/√3) = 100 ⇒ h(√3 − 1)/√3 = 100.",
      "h = 100√3/(√3 − 1) = 100√3(√3 + 1)/[(√3 − 1)(√3 + 1)] = 100√3(√3 + 1)/2 = 50√3(√3 + 1) = 50(3 + √3) = 150 + 50√3.",
      "Numerically ≈ 150 + 86.6 ≈ 236.6 m. (Equivalently, 50(3 + √3) m.)"
    ],
    finalAnswer: "Height of the balloon = 50(3 + √3) m ≈ 236.6 m.",
    ncertRef: "Exemplar Ch8 LA Sample Q2", isCompetencyBased: true,
    strategyHint: "Angle of depression from balloon = angle of elevation from the car (alternate interior angles)." },

  { id: "TRIG-N-EXMPLR-9-CB-002", subject: "Maths", topicKey: "trigonometry", subtopic: "Heights and Distances", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "The lower window of a house is 2 m above the ground and the upper window is 4 m vertically above the lower window. At a certain instant the angles of elevation of a balloon from these two windows are 60° and 30° respectively.\n(a) Set up the geometry: let the balloon be at height H above the ground; let horizontal distance from house to balloon = d.\n(b) Write the tan equations for both windows.\n(c) Find the height of the balloon above the ground.",
    solutionSteps: [
      "Lower window height = 2 m; upper window height = 2 + 4 = 6 m above the ground.",
      "From the lower window the balloon is at vertical distance (H − 2) and horizontal distance d; angle = 60°. tan 60° = (H − 2)/d ⇒ √3 d = H − 2.   …(1)",
      "From the upper window the balloon is at vertical distance (H − 6) and horizontal distance d; angle = 30°. tan 30° = (H − 6)/d ⇒ d = √3 (H − 6).   …(2)",
      "Substitute (2) in (1): √3 · √3 (H − 6) = H − 2 ⇒ 3(H − 6) = H − 2 ⇒ 3H − 18 = H − 2 ⇒ 2H = 16 ⇒ H = 8.",
      "So the balloon is 8 m above the ground."
    ],
    finalAnswer: "Height of the balloon above the ground = 8 m.",
    ncertRef: "Exemplar Ch8 Ex 8.4 Q18", isCompetencyBased: true,
    strategyHint: "From the higher window the angle of elevation is SMALLER — write each tan separately and eliminate d." },

  { id: "TRIG-N-EXMPLR-9-LA-006", subject: "Maths", topicKey: "trigonometry", subtopic: "Heights and Distances", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A vertical tower stands on a horizontal plane and is surmounted by a vertical flagstaff of height h. At a point on the plane, the angles of elevation of the bottom and top of the flagstaff are α and β respectively. Prove that the height of the tower is h tan α / (tan β − tan α).",
    solutionSteps: [
      "Let the tower have height T (to be found), the flagstaff height h sits atop. Let P be the observation point at horizontal distance d from the foot.",
      "Angle of elevation of top of tower (= bottom of flagstaff) is α: tan α = T/d ⇒ d = T/tan α.",
      "Angle of elevation of top of flagstaff is β: tan β = (T + h)/d ⇒ d = (T + h)/tan β.",
      "Equate: T/tan α = (T + h)/tan β ⇒ T tan β = (T + h) tan α ⇒ T tan β − T tan α = h tan α.",
      "T(tan β − tan α) = h tan α ⇒ T = h tan α / (tan β − tan α). Proved."
    ],
    finalAnswer: "Tower height T = h tan α / (tan β − tan α).",
    ncertRef: "Exemplar Ch8 Ex 8.4 Q8", isCompetencyBased: true,
    strategyHint: "Two tan equations share the same d — eliminate d to solve for T." },
];
