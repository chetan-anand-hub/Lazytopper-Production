import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2023-24 board exam
// Question papers + matched marking schemes (MS 041_30-x-x Mathematics 2023-24) from CBSE
// topicKey: "quadratic-equations"
// Extraction date: 2026-05-25
// PDF tool: pymupdf (0 cid artifacts confirmed via probe)
// Coverage: 13 text-extractable Standard QPs (30(B), 30/2/x, 30/3/x, 30/4/x, 30/5/x); 3 scanned QPs (30/1/x) skipped — require OCR; Maths Basic (241) not in scope
// OR-question handling: Section B/C/D internal-choice (a)/(b) alternates extracted as separate questions with -a/-b ID suffix

export const QUADRATIC_EQUATIONS_PYQ_2024: CanonicalQuestion[] = [
  { id: "PYQ-M-2024-QE-001", subject: "Maths", topicKey: "quadratic-equations", subtopic: "General", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The roots of the quadratic equation x2 + x – p (p + 1) = 0 are :",
    options: ["p, p + 1", "– p, p + 1", "– p, – (p + 1)", "p, – ( p + 1)"],
    answer: "p, – (p + 1) 1",
    solutionSteps: ["Correct option: (d) p, – (p + 1) 1."],
    finalAnswer: "(d) p, – (p + 1) 1",
    ncertRef: "PYQ 30(B) Q4", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "1" },
  { id: "PYQ-M-2024-QE-002", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Sum and Product of Roots", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The ratio of the sum and product of the roots of the quadratic equation 5x2 – 6x + 21 = 0 is :",
    options: ["5 : 21", "2 : 7", "21 : 5", "7 : 2"],
    answer: "2:7 1",
    solutionSteps: ["Correct option: (b) 2:7 1."],
    finalAnswer: "(b) 2:7 1",
    ncertRef: "PYQ 30/5/1 Q5", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "1" },
  { id: "PYQ-M-2024-QE-003", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Nature of Roots", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If the quadratic equation ax2 + bx + c = 0 has real and equal roots, then the value of c is :",
    options: ["a 2 b", "– a 2 b", "a 4 b2", "– a 4 b2 1530/5/2"],
    answer: "a 4 b2",
    solutionSteps: ["Correct option: (c) 𝑏2 4𝑎."],
    finalAnswer: "(c) 𝑏2 4𝑎",
    ncertRef: "PYQ 30/5/2 Q6", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "2" },
  { id: "PYQ-M-2024-QE-004b", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Nature of Roots", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "Find the value of 'c' for which the quadratic equation (c + 1) x2 – 6 (c + 1) x + 3 (c + 9) = 0; c ¹ –1 has real and equal roots.",
    answer: "So, c =",
    solutionSteps: ["[1 mark] For real and equal roots, discriminant D = b² – 4ac = 0.", "[1 mark] Here a = (c + 1), b = –6(c + 1), c-term = 3(c + 9). So {–6(c + 1)}² – 4(c + 1) × 3(c + 9) = 0.", "[1 mark] 36(c + 1)² – 12(c + 1)(c + 9) = 0 → 12(c + 1)[3(c + 1) – (c + 9)] = 0 → 12(c + 1)(2c – 6) = 0.", "[1 mark] So c = –1 or c = 3; since c ≠ –1 (given), c = 3.", "[1 mark] Verification: for c = 3 the equation becomes 4x² – 24x + 36 = 0, i.e. x² – 6x + 9 = (x – 3)² = 0, giving equal roots x = 3, 3. Hence c = 3."],
    finalAnswer: "c = 3 (rejecting c = –1); the equal roots are x = 3, 3.",
    ncertRef: "PYQ 30/4/1 Q34(b)", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "1" },
  { id: "PYQ-M-2024-QE-005a", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Nature of Roots", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "Find the value of 'k' for which the quadratic equation (k + 1) x2 – 2 (3k + 1) x + (8k + 1) = 0 has real and equal roots.",
    answer: "k = 0, k =",
    solutionSteps: ["[1 mark] For real and equal roots, discriminant D = b² – 4ac = 0.", "[1 mark] Here a = (k + 1), b = –2(3k + 1), c = (8k + 1). So [–2(3k + 1)]² – 4(k + 1)(8k + 1) = 0.", "[1 mark] 4(9k² + 6k + 1) – 4(8k² + 9k + 1) = 0 → 4(k² – 3k) = 0 → k² – 3k = 0.", "[1 mark] k(k – 3) = 0, so k = 0 or k = 3 (both valid, since k + 1 ≠ 0 in each case).", "[1 mark] Verification: k = 0 gives x² – 2x + 1 = (x – 1)² = 0 (equal roots x = 1); k = 3 gives 4x² – 20x + 25 = (2x – 5)² = 0 (equal roots x = 5/2). Hence k = 0 or k = 3."],
    finalAnswer: "k = 0 or k = 3.",
    ncertRef: "PYQ 30/4/2 Q32(a)", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "2" },
  { id: "PYQ-M-2024-QE-006a", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Nature of Roots", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "Find the value of 'k' for which the quadratic equation (k + 1)x2 – 6(k + 1)x + 3(k + 9) = 0, k ¹ – 1 has real and equal roots.",
    answer: "(k – 3) (k + 1) = 0 k ≠ – 1 So, k =",
    solutionSteps: ["[1 mark] For real and equal roots, discriminant D = b² – 4ac = 0.", "[1 mark] Here a = (k + 1), b = –6(k + 1), c-term = 3(k + 9). So 36(k + 1)² – 4(k + 1) × 3(k + 9) = 0.", "[1 mark] Dividing by 12: 3(k + 1)² – (k + 1)(k + 9) = 0 → (k + 1)(2k – 6) = 0, i.e. k² – 2k – 3 = 0.", "[1 mark] (k – 3)(k + 1) = 0; since k ≠ –1, k = 3.", "[1 mark] Verification: for k = 3 the equation becomes 4x² – 24x + 36 = 0, i.e. (x – 3)² = 0, equal roots x = 3, 3. Hence k = 3."],
    finalAnswer: "k = 3 (rejecting k = –1); the equal roots are x = 3, 3.",
    ncertRef: "PYQ 30/5/1 Q32(a)", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "1" },
];
