import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2025-26 board exam
// Question papers + matched marking schemes (MS_X_041_Mathematics_30-x-x_2025-26) from CBSE
// topicKey: "coordinate-geometry"
// Extraction date: 2026-05-25
// PDF tool: pymupdf 1.27.2.3 (0 cid artifacts confirmed via probe)
// Coverage: 7 text-extractable Standard QPs (30/4/x, 30/5/x, 30(B)); 9 scanned QPs (30/1/x, 30/2/x, 30/3/x) skipped — require OCR; all 9 Maths Basic (430-x-x) skipped per scope
// Section A MCQ answers absent on 30/4/x MS (rendered as images by CBSE); kept where 30/5/x or 30(B) MS produced text.

export const COORDINATE_GEOMETRY_PYQ_2026: CanonicalQuestion[] = [
  { id: "PYQ-M-2026-CG-001", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Equidistant Points", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find a relation between x and y such that the point P(x, y) is equidistant from the points A(5, 3) and B(1, 7).",
    answer: "PA2 = PB2 ⟹ ( x – 5)2 + (y – 3)2 = ( x – 1)2 + (y – 7)2 ⟹ x2 + 25 – 10x + y2 + 9 – 6y = x2 + 1 – 2x + y2 + 49 – 14y ⟹ x – y = – 2 or x – y + 2 =",
    solutionSteps: ["Since P (x, y) is equidistant from A(5, 3) and B(1, 7)", "PA = PB", "PA2 = PB2 ⟹ ( x – 5)2 + (y – 3)2 = ( x – 1)2 + (y – 7)2 ⟹ x2 + 25 – 10x + y2 + 9 – 6y = x2 + 1 – 2x + y2 + 49 – 14y ⟹ x – y = – 2 or x – y + 2 ="],
    finalAnswer: "PA2 = PB2 ⟹ ( x – 5)2 + (y – 3)2 = ( x – 1)2 + (y – 7)2 ⟹ x2 + 25 – 10x + y2 + 9 – 6y = x2 + 1 – 2x + y2 + 49 – 14y ⟹ x – y = – 2 or x – y + 2 =",
    ncertRef: "PYQ 30(B) Q28", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
  // RETIRED 2026-07-21 ([FU-BANK-GARBLED-ANSWER-CLASS], owner-approved): "PYQ-M-2026-CG-002".
  // Its questionText welded two unrelated problems — the Latin remnants of 30/5/1 Q35 (a
  // circle/tangent problem, whose Hindi half is in a PUA-mapped font that extracts as nothing)
  // plus the English text of Q33(b) of the same paper (a parallelogram-midpoint proof).
  // Source (QP 1172-1_30-5-1 (Mathematics Standard).pdf, pp.19-20) proves Q35 is the tangent
  // problem, and that question is ALREADY served cleanly by PYQ-M-2026-CIRC-006
  // (circles.pyq2026.ts, ref 30/5/2 Q33) with a correct stem, topicKey and 5-step solution.
  // Re-keying this row to "circles" would only mint a near-duplicate, so it is retired instead.
  { id: "PYQ-M-2026-CG-003", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Section Formula", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Observe the map of Jaipur city placed on a Cartesian plane. Taking Rambagh Palace as origin, the location of some places are given below : Point A : (–4, 2) Rajasthan High Court Point B : (4, –4) Birla Mandir Point C : (4, 3) Heera Bagh Point D : (–5, –2) Amar Jawan Jyoti Based on the above, answer the following questions : (i) Advocate Rehana stays at Heera Bagh. How much distance she has to cover daily to go to the court and coming back home ? 1 (ii) There is a crossing on Xaxis which divides AD in a certain ratio. Find the ratio. 1 (iii) (a) Is Birla Mandir equidistant from Heera Bagh and Amar Jawan Jyoti ? Justify your answer. 2 OR (b) Using section formula, show that points A, O and B are not collinear.",
    answer: "AP : PD = K :",
    solutionSteps: ["(i) Distance travelled = 2 AC = 2√(−4 −4)2 + (2 −3)2 = 2 √64 + 1 = 2 √65", "Hence, required distance is 2 √65 units.", "(ii) Let the point P(𝑥, 0) divides AD in the ratio K : 1", "AP : PD = K :"],
    finalAnswer: "AP : PD = K :",
    ncertRef: "PYQ 30/4/1 Q38", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
];
