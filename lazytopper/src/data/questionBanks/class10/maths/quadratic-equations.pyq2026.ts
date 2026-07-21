import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2025-26 board exam
// Question papers + matched marking schemes (MS_X_041_Mathematics_30-x-x_2025-26) from CBSE
// topicKey: "quadratic-equations"
// Extraction date: 2026-05-25
// PDF tool: pymupdf 1.27.2.3 (0 cid artifacts confirmed via probe)
// Coverage: 7 text-extractable Standard QPs (30/4/x, 30/5/x, 30(B)); 9 scanned QPs (30/1/x, 30/2/x, 30/3/x) skipped — require OCR; all 9 Maths Basic (430-x-x) skipped per scope
// Section A MCQ answers absent on 30/4/x MS (rendered as images by CBSE); kept where 30/5/x or 30(B) MS produced text.

export const QUADRATIC_EQUATIONS_PYQ_2026: CanonicalQuestion[] = [
  { id: "PYQ-M-2026-QE-001", subject: "Maths", topicKey: "quadratic-equations", subtopic: "General", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    // Recovered from MS_X_041_Mathematics_30-4-1_2025-26, pp.8-9; the stored text stopped at the page break, dropping 'D = 0' and the conclusion.
    questionText: "Verify that roots of the quadratic equation (p – q)x2 + (q – r)x + (r – p) = 0 are equal when q + r = 2p.",
    answer: "Discriminant (D) = (q − r)2 – 4 (p − q) (r − p) = (q + r – 2p)2. Substituting q + r = 2p: (2p – 2p)2 = 0 ⇒ D = 0. ∴ Roots of the given equation are equal.",
    solutionSteps: ["Discriminant (D) = (q − r)2 – 4 (p − q) (r − p) = (q + r – 2p)2.", "Substituting q + r = 2p gives (2p – 2p)2 = 0, so D = 0.", "∴ Roots of the given equation are equal."],
    finalAnswer: "D = 0, so the roots of the given equation are equal.",
    ncertRef: "PYQ 30/4/1 Q21", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
];
