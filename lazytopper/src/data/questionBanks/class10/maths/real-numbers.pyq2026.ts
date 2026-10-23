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
    solutionSteps: ["[0.5 marks] Let the numbers be 3x and 5x; HCF = x.", "[1 mark] HCF × LCM = Product of two numbers: x × 180 = 3x × 5x.", "[0.5 marks] x = 12, so the HCF of the numbers is 12."],
    finalAnswer: "HCF = x HCF × LCM = Product of two numbers x × 180 = 3x × 5x x = 12 HCF of numbers is 12.",
    ncertRef: "PYQ 30(B) Q21", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
  { id: "PYQ-M-2026-REALNUM-002", subject: "Maths", topicKey: "real-numbers", subtopic: "Irrationality Proof", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Prove that 2 – 5√3 is an irrational number given that √3 is irrational.",
    answer: "Hence 2 − 5√3 is an irrational number.",
    solutionSteps: ["[0.5 mark] Let 2 − 5√3 be a rational number. ∴ 2 − 5√3 = a/b where a and b are integers and b ≠ 0.", "[0.5 mark] √3 = (2b − a)/5b", "[1 mark] RHS is rational but LHS is an irrational which is a contradiction to our supposition. Hence 2 − 5√3 is an irrational number."],
    finalAnswer: "Hence 2 − 5√3 is an irrational number.",
    ncertRef: "PYQ 30/5/1 Q21", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
  { id: "PYQ-M-2026-REALNUM-003", subject: "Maths", topicKey: "real-numbers", subtopic: "Irrationality Proof", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Prove that 4 – 2√5 is an irrational number given that √5 is irrational.",
    answer: "Hence 4 −2√5 is an irrational number.",
    solutionSteps: ["[0.5 mark] Let 4 − 2√5 be a rational number. ∴ 4 − 2√5 = a/b where a and b are integers and b ≠ 0.", "[0.5 mark] √5 = (4b − a)/2b", "[1 mark] RHS is rational but LHS is an irrational which is a contradiction to our supposition. Hence 4 − 2√5 is an irrational number."],
    finalAnswer: "Hence 4 −2√5 is an irrational number.",
    ncertRef: "PYQ 30/5/2 Q23", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "2" },
  { id: "PYQ-M-2026-REALNUM-004", subject: "Maths", topicKey: "real-numbers", subtopic: "Irrationality Proof", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Prove that 14 – 2√3 is an irrational number, given that √3 is irrational.",
    answer: "Hence 14 −2√3 is an irrational number.",
    solutionSteps: ["[0.5 mark] Let 14 − 2√3 be a rational number. ∴ 14 − 2√3 = a/b where a and b are integers and b ≠ 0.", "[0.5 mark] √3 = (14b − a)/2b", "[1 mark] RHS is rational but LHS is an irrational which is a contradiction to our supposition. Hence 14 − 2√3 is an irrational number."],
    finalAnswer: "Hence 14 −2√3 is an irrational number.",
    ncertRef: "PYQ 30/5/3 Q25", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "3" },
  { id: "PYQ-M-2026-REALNUM-005", subject: "Maths", topicKey: "real-numbers", subtopic: "Irrationality Proof", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Prove that (2 + 3√5)/7 is an irrational number, given that √5 is an irrational number.",
    answer: "Assume (2 + 3√5)/7 = p/q with integers p, q and q ≠ 0. Then √5 = (7p − 2q)/(3q), which is rational. This contradicts the fact that √5 is irrational, so (2 + 3√5)/7 is an irrational number.",
    solutionSteps: ["[1 mark] Assume, to the contrary, that (2 + 3√5)/7 is a rational number. Then (2 + 3√5)/7 = p/q, where p and q are integers and q ≠ 0.","[1 mark] Then 2 + 3√5 = 7p/q ⇒ 3√5 = (7p − 2q)/q ⇒ √5 = (7p − 2q)/(3q). Since p and q are integers, (7p − 2q)/(3q) is rational.","[1 mark] So √5 would be rational. This contradicts the fact that √5 is irrational. Hence (2 + 3√5)/7 is an irrational number."],
    finalAnswer: "(2 + 3√5)/7 is irrational: assuming it is p/q gives √5 = (7p − 2q)/(3q), a rational number, contradicting that √5 is irrational.",
    ncertRef: "PYQ 30(B) Q26", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
];
