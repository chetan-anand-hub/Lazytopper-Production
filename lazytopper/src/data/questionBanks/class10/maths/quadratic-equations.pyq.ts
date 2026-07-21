import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2022-23 board exam
// Question papers + matched marking schemes (MS 041_30-x-x Mathematics 2022-23) from CBSE
// topicKey: "quadratic-equations"
// Extraction date: 2026-05-25
// PDF tool: pymupdf 1.27.2.3 (0 cid artifacts confirmed via probe)
// Coverage: 9 text-extractable QPs (30/2/x, 30/4/x, 30/5/x); 6 scanned QPs (30/1/x, 30/6/x) and 30-B-5 skipped — require OCR

export const QUADRATIC_EQUATIONS_PYQ: CanonicalQuestion[] = [
  { id: "PYQ-M-QE-001", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Sum and Product of Roots", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Which of the following quadratic equations has sum of its roots as 4 ?",
    options: ["2x2 4x + 8 =", "x2 + 4x + 4 =", "2 x2 2 4 x + 1 =", "4x2 4x + 4 ="],
    answer: "– x2 + 4x + 4 = 0",
    solutionSteps: ["Correct option: (b) – x2 + 4x + 4 = 0."],
    finalAnswer: "(b) – x2 + 4x + 4 = 0",
    ncertRef: "PYQ 30/2/1 Q1", isCompetencyBased: true,
    pyqYear: "2023", pyqSet: "1" },
  { id: "PYQ-M-QE-002", subject: "Maths", topicKey: "quadratic-equations", subtopic: "General", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The roots of the equation x2 + 3x – 10 = 0 are :",
    options: ["2, –5", "–2,", "2,", "–2, –5"],
    answer: "2, –5",
    solutionSteps: ["Correct option: (a) 2, – 5."],
    finalAnswer: "(a) 2, – 5",
    ncertRef: "PYQ 30/4/1 Q2", isCompetencyBased: true,
    pyqYear: "2023", pyqSet: "1" },
  { id: "PYQ-M-QE-003", subject: "Maths", topicKey: "quadratic-equations", subtopic: "General", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A quadratic equation whose roots are (2 + √3 ) and (2 – √3 ) is :",
    // options + answer recovered verbatim from QP 30_5_1_Maths Standard.pdf Q5 (2023); each
    // option had lost its minus sign and its trailing "= 0". Correct option per MS 30-5-1 p.4.
    options: ["x2 – 4x + 1 = 0", "x2 + 4x + 1 = 0", "4x2 – 3 = 0", "x2 – 1 = 0"],
    answer: "x2 – 4x + 1 = 0",
    solutionSteps: ["Correct option: (a) x2 – 4x + 1 = 0."],
    finalAnswer: "(a) x2 – 4x + 1 = 0",
    ncertRef: "PYQ 30/5/1 Q5", isCompetencyBased: true,
    pyqYear: "2023", pyqSet: "1" },
  { id: "PYQ-M-QE-004", subject: "Maths", topicKey: "quadratic-equations", subtopic: "General", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A quadratic equation whose roots are (3 – √2 ) and (3 + √2 ) is :",
    // options + answer recovered verbatim from QP 30_5_3_Maths Standard.pdf Q10 (2023).
    options: ["x2 – 6x + 7 = 0", "x2 + 6x + 7 = 0", "9x2 – 2 = 0", "x2 – 7 = 0"],
    answer: "x2 – 6x + 7 = 0",
    solutionSteps: ["Correct option: (a) x2 – 6x + 7 = 0."],
    finalAnswer: "(a) x2 – 6x + 7 = 0",
    ncertRef: "PYQ 30/5/3 Q10", isCompetencyBased: true,
    pyqYear: "2023", pyqSet: "3" },
  { id: "PYQ-M-QE-005", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Nature of Roots", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    // Recovered from MS 041_30-4-1 Mathematics 2022-23, p.8 (both 23(A) and 23(B)). The stored answer covered only option (B); the stem offers (A) OR (B), so (A) is restored.
    questionText: "(A) Find the sum and product of the roots of the quadratic equation 2x2 – 9x + 4 = 0. 2 OR (B) Find the discriminant of the quadratic equation 4x2 – 5 = 0 and hence comment on the nature of roots of the equation.",
    answer: "(A) 2x2 – 9x + 4 = 0, a = 2, b = – 9, c = 4. Let α, β be roots of 2x2 – 9x + 4 = 0. Sum = α + β = – b/a = 9/2. Product of roots = αβ = c/a = 4/2 = 2. OR (B) 4x2 – 5 = 0, a = 4, b = 0, c = – 5. Discriminant = b2 – 4ac = 0 – 4 (4) (– 5) = 80 > 0 ⇒ roots are real and distinct.",
    solutionSteps: ["(A) 2x2 – 9x + 4 = 0, so a = 2, b = – 9, c = 4. Let α, β be its roots.", "Sum = α + β = – b/a = 9/2 and Product = αβ = c/a = 4/2 = 2.", "OR (B) 4x2 – 5 = 0, so a = 4, b = 0, c = – 5.", "Discriminant = b2 – 4ac = 0 – 4 (4) (– 5) = 80 > 0 ⇒ roots are real and distinct."],
    finalAnswer: "(A) Sum = 9/2, Product = 2 OR (B) Discriminant = 80 > 0, so the roots are real and distinct.",
    ncertRef: "PYQ 30/4/1 Q23", isCompetencyBased: true,
    pyqYear: "2023", pyqSet: "1" },
  { id: "PYQ-M-QE-006", subject: "Maths", topicKey: "quadratic-equations", subtopic: "General", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    // Recovered from MS 041_30-4-1 Mathematics 2022-23, p.13 (final value p = 6). questionText also had scraped Section-D boilerplate appended, removed here.
    questionText: "Find the value of 'p' for which the quadratic equation px(x – 2) + 6 = 0 has two equal real roots.",
    answer: "px(x – 2) + 6 = 0 ⇒ px2 – 2px + 6 = 0, a = p, b = – 2p, c = 6. Quadratic equation has equal roots, so D = 0. b2 – 4ac = 0 ⇒ 4p2 – 24p = 0, 4p (p – 6) = 0, p = 0, p = 6. p = 0 rejected ⇒ p = 6.",
    solutionSteps: ["px(x – 2) + 6 = 0 ⇒ px2 – 2px + 6 = 0, so a = p, b = – 2p, c = 6.", "The equation has equal roots, so D = b2 – 4ac = 0 ⇒ 4p2 – 24p = 0.", "4p (p – 6) = 0 ⇒ p = 0 or p = 6; p = 0 is rejected (it is not a quadratic), so p = 6."],
    finalAnswer: "p = 6",
    ncertRef: "PYQ 30/4/1 Q31", isCompetencyBased: true,
    pyqYear: "2023", pyqSet: "1" },
  { id: "PYQ-M-QE-007", subject: "Maths", topicKey: "quadratic-equations", subtopic: "General", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    // Recovered from MS 041_30-4-2 Mathematics 2022-23, p.10 (final value p = 6).
    questionText: "Find the value of 'p' for which the quadratic equation px(x – 2) + 6 = 0 has two equal real roots.",
    answer: "px(x – 2) + 6 = 0 ⇒ px2 – 2px + 6 = 0, a = p, b = – 2p, c = 6. Quadratic equation has equal roots, so D = 0. b2 – 4ac = 0 ⇒ 4p2 – 24p = 0, 4p (p – 6) = 0, p = 0, p = 6. p = 0 rejected ⇒ p = 6.",
    solutionSteps: ["px(x – 2) + 6 = 0 ⇒ px2 – 2px + 6 = 0, so a = p, b = – 2p, c = 6.", "The equation has equal roots, so D = b2 – 4ac = 0 ⇒ 4p2 – 24p = 0.", "4p (p – 6) = 0 ⇒ p = 0 or p = 6; p = 0 is rejected, so p = 6."],
    finalAnswer: "p = 6",
    ncertRef: "PYQ 30/4/2 Q28", isCompetencyBased: true,
    pyqYear: "2023", pyqSet: "2" },
  { id: "PYQ-M-QE-008", subject: "Maths", topicKey: "quadratic-equations", subtopic: "General", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    // Recovered from MS 041_30-4-3 Mathematics 2022-23, p.9. Stacked fractions restored (14/p, 2/p, 8/p, 4/p2) and the trailing mark-column bleed '1 1+' dropped.
    questionText: "Find the value of 'p' for which one root of the quadratic equation px2 – 14x + 8 = 0 is 6 times the other.",
    answer: "Let roots of the quadratic equation be α, 6α. px2 – 14x + 8 = 0. ∴ α + 6α = 14/p ⇒ 7α = 14/p ⇒ α = 2/p. And α · 6α = 8/p ⇒ 6α2 = 8/p ⇒ 6 · 4/p2 = 8/p ⇒ p = 3.",
    solutionSteps: ["Let the roots of px2 – 14x + 8 = 0 be α and 6α.", "Sum of roots: α + 6α = 14/p ⇒ 7α = 14/p ⇒ α = 2/p.", "Product of roots: α · 6α = 8/p ⇒ 6α2 = 8/p.", "Substituting α = 2/p: 6 · 4/p2 = 8/p ⇒ p = 3."],
    finalAnswer: "p = 3",
    ncertRef: "PYQ 30/4/3 Q26", isCompetencyBased: true,
    pyqYear: "2023", pyqSet: "3" },
];
