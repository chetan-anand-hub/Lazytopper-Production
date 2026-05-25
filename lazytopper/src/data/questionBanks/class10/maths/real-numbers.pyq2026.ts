import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2025-26 board exam
// Question papers + matched marking schemes (MS_X_041_Mathematics_30-x-x_2025-26) from CBSE
// topicKey: "real-numbers"
// Extraction date: 2026-05-25
// PDF tool: pymupdf 1.27.2.3 (0 cid artifacts confirmed via probe)
// Coverage: 7 text-extractable Standard QPs (30/4/x, 30/5/x, 30(B)); 9 scanned QPs (30/1/x, 30/2/x, 30/3/x) skipped — require OCR; all 9 Maths Basic (430-x-x) skipped per scope
// Section A MCQ answers absent on 30/4/x MS (rendered as images by CBSE); kept where 30/5/x or 30(B) MS produced text.

export const REAL_NUMBERS_PYQ_2026: CanonicalQuestion[] = [
  { id: "PYQ-M-2026-REALNUM-001", subject: "Maths", topicKey: "real-numbers", subtopic: "HCF and LCM", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Two numbers are in the ratio 3 : 5 and their LCM is 180. Find the HCF of these two numbers.",
    answer: "HCF = x HCF × LCM = Product of two numbers x × 180 = 3x × 5x x = 12 HCF of numbers is 12.",
    solutionSteps: ["Let the numbers be 3x and 5x.", "HCF = x HCF × LCM = Product of two numbers x × 180 = 3x × 5x x = 12 HCF of numbers is 12."],
    finalAnswer: "HCF = x HCF × LCM = Product of two numbers x × 180 = 3x × 5x x = 12 HCF of numbers is 12.",
    ncertRef: "PYQ 30(B) Q21", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
  { id: "PYQ-M-2026-REALNUM-002", subject: "Maths", topicKey: "real-numbers", subtopic: "Irrationality Proof", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Prove that 2 – 5 3 is an irrational number given that 3 is irrational.",
    answer: "Let 2 −5√3 be a rational number. ∴2 −5√3 =   where a and b are integers and b ≠0. √3 = 2b −a 5b",
    solutionSteps: ["Let 2 −5√3 be a rational number. ∴2 −5√3 =   where a and b are integers and b ≠0. √3 = 2b −a 5b"],
    finalAnswer: "Let 2 −5√3 be a rational number. ∴2 −5√3 =   where a and b are integers and b ≠0. √3 = 2b −a 5b",
    ncertRef: "PYQ 30/5/1 Q21", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
  { id: "PYQ-M-2026-REALNUM-003", subject: "Maths", topicKey: "real-numbers", subtopic: "Irrationality Proof", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Prove that 4 – 2 5 is an irrational number given that 5 is irrational.",
    answer: "Hence 4 −2√5 is an irrational number.",
    solutionSteps: ["Let 4 −2√5 be a rational number. ∴4 −2√5 =   where a and b are integers and b ≠0. √5 = 4b −a 2b RHS is rational but LHS is an irrational which is a contradiction to our supposition.", "Hence 4 −2√5 is an irrational number."],
    finalAnswer: "Hence 4 −2√5 is an irrational number.",
    ncertRef: "PYQ 30/5/2 Q23", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "2" },
  { id: "PYQ-M-2026-REALNUM-004", subject: "Maths", topicKey: "real-numbers", subtopic: "Irrationality Proof", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Prove that 14 – 2 3 is an irrational number, given that 3 is irrational.",
    answer: "Hence 14 −2√3 is an irrational number.",
    solutionSteps: ["Let 14 −2√3 be a rational number. ∴14 −2√3 =   where a and b are integers and b ≠0. √3 = 14b −a 2b RHS is rational but LHS is an irrational which is a contradiction to our supposition.", "Hence 14 −2√3 is an irrational number."],
    finalAnswer: "Hence 14 −2√3 is an irrational number.",
    ncertRef: "PYQ 30/5/3 Q25", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "3" },
  { id: "PYQ-M-2026-REALNUM-005", subject: "Maths", topicKey: "real-numbers", subtopic: "Irrationality Proof", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Prove that 2 + 3 5 7 is an irrational number, given that 5 is an irrational number.",
    answer: "Hence, 2 + 3√5 7 is an irrational number.",
    solutionSteps: ["Let 2 + 3√5 7 be a rational number.", "Then 2 + 3√5 7 = p q , where q ≠ 0 and p and q are integers. ⇒ 2 + 3√5 = 7 p q ⇒ √5 = 7p − 2q 3q Since 'p' and 'q' are integers. ∴ 7p − 2q 3q is rational.", "But this contradicts the fact that √5 is irrational.", "Hence, 2 + 3√5 7 is an irrational number."],
    finalAnswer: "Hence, 2 + 3√5 7 is an irrational number.",
    ncertRef: "PYQ 30(B) Q26", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
];
