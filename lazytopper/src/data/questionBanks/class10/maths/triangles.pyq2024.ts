import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2023-24 board exam
// Question papers + matched marking schemes (MS 041_30-x-x Mathematics 2023-24) from CBSE
// topicKey: "triangles"
// Extraction date: 2026-05-25
// PDF tool: pymupdf (0 cid artifacts confirmed via probe)
// Coverage: 13 text-extractable Standard QPs (30(B), 30/2/x, 30/3/x, 30/4/x, 30/5/x); 3 scanned QPs (30/1/x) skipped — require OCR; Maths Basic (241) not in scope
// OR-question handling: Section B/C/D internal-choice (a)/(b) alternates extracted as separate questions with -a/-b ID suffix

export const TRIANGLES_PYQ_2024: CanonicalQuestion[] = [
  { id: "PYQ-M-2024-TRI-001", subject: "Maths", topicKey: "triangles", subtopic: "General", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "In ∆ ABC, DE || BC (as shown in the figure). If AD = 4 cm, AB = 9 cm and AC = 13.5 cm, then the length of EC is :",
    options: ["6 cm", "7.5 cm", "9 cm", "5.7 cm"],
    answer: "7.5 cm",
    solutionSteps: ["Correct option: (b) 7.5 cm."],
    finalAnswer: "(b) 7.5 cm",
    ncertRef: "PYQ 30/4/1 Q13", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "1" },
  { id: "PYQ-M-2024-TRI-002", subject: "Maths", topicKey: "triangles", subtopic: "Basic Proportionality Theorem", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "In ΔABC, DE ∥ BC, where D lies on AB and E lies on AC. If AD = 2.4 cm, DB = 4 cm and AE = 2 cm, then the length of AC is :",
    options: ["10/3 cm", "3/10 cm", "16/3 cm", "1.2 cm"],
    answer: "16/3 cm",
    solutionSteps: ["By BPT, AD/DB = AE/EC ⟹ 2.4/4 = 2/EC ⟹ EC = 10/3 cm.", "AC = AE + EC = 2 + 10/3 = 16/3 cm. Correct option: (c) 16/3 cm."],
    finalAnswer: "(c) 16/3 cm",
    ncertRef: "PYQ 30/5/1 Q17", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2024-TRI-003b", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Section Formula and Distance Formula", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A(3, 0), B(6, 4) and C(–1, 3) are vertices of a triangle ABC. Find the length of its median BE.",
    answer: "Midpoint of AC is E(1, 3/2). Length of median BE = √[(6 − 1)² + (4 − 3/2)²] = √(125/4) = 5√5/2 units.",
    solutionSteps: ["Median BE joins B to the midpoint E of AC: E = ((3 + (–1))/2, (0 + 3)/2) = (1, 3/2).", "BE = √[(6 − 1)² + (4 − 3/2)²] = √(25 + 25/4) = √(125/4) = 5√5/2 units."],
    finalAnswer: "BE = √(125/4) = 5√5/2 units (≈ 5.59 units).",
    ncertRef: "PYQ 30/2/1 Q25(b)", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2024-TRI-004a", subject: "Maths", topicKey: "circles", subtopic: "Tangents from an External Point", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A circle is inscribed in a right-angled triangle ABC, right-angled at B. If BC = 7 cm and AB = 24 cm, find the radius of the circle.",
    answer: "Radius of the circle = 3 cm.",
    solutionSteps: ["[1 mark] AC = √(24² + 7²) = √625 = 25 cm. Let the radius be r cm.", "[1 mark] Tangents from B are equal and the radii to the points of contact on AB and BC form a square with B, so the tangent lengths from B are r; tangent lengths from A = 24 − r and from C = 7 − r.", "[1 mark] AC = (24 − r) + (7 − r) = 25 ⇒ 31 − 2r = 25 ⇒ r = 3 cm."],
    finalAnswer: "r = 3 cm",
    ncertRef: "PYQ 30(B) Q29(a)", isCompetencyBased: true,
    sourceOverride: "others",
  },
];
