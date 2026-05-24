import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Areas Related to Circles — CBSE Sample Question Paper 2023-24 (MATHEMATICS STANDARD — Code 041)
 * Source: MathsStandard-SQP.pdf (10pp) + MathsStandard-MS.pdf (9pp), cbseacademic.nic.in
 * Extracted: 2026-05-24 (P2 SQP-only scope; APQ deferred to follow-up PR)
 * topicKey: "areas-related-to-circles"
 * Section distribution: A=2, B=1
 */
export const AREAS_RELATED_TO_CIRCLES_SQP: CanonicalQuestion[] = [
  {
    "id": "SQP-M-ARC-001",
    "subject": "Maths",
    "topicKey": "areas-related-to-circles",
    "subtopic": "Circumference = Area Numerically",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "If the perimeter and the area of a circle are numerically equal, then the radius of the circle is",
    "options": [
      "(A) 2 units",
      "(B) π units",
      "(C) 4 units",
      "(D) 7 units"
    ],
    "answer": "(A) 2 units",
    "solutionSteps": [
      "Perimeter (circumference) = 2πr; Area = πr². Numerically equal: 2πr = πr² ⇒ 2 = r ⇒ r = 2 units. Answer: (A)."
    ],
    "finalAnswer": "(A) 2 units",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-M-ARC-002",
    "subject": "Maths",
    "topicKey": "areas-related-to-circles",
    "subtopic": "Combining Areas of Circles",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "It is proposed to build a new circular park equal in area to the sum of areas of two circular parks of diameters 16 m and 12 m in a locality. The radius of the new park is",
    "options": [
      "(A) 10 m",
      "(B) 15 m",
      "(C) 20 m",
      "(D) 24 m"
    ],
    "answer": "(A) 10 m",
    "solutionSteps": [
      "Radii r₁ = 8 m, r₂ = 6 m. πR² = πr₁² + πr₂² ⇒ R² = 64 + 36 = 100 ⇒ R = 10 m. Answer: (A)."
    ],
    "finalAnswer": "(A) 10 m",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-M-ARC-003",
    "subject": "Maths",
    "topicKey": "areas-related-to-circles",
    "subtopic": "Area of Sector — Sum of Angles in Triangle",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "With vertices A, B and C of Δ ABC as centres, arcs are drawn with radii 14 cm and the three portions of the triangle so obtained are removed. Find the total area removed from the triangle.\n\n[OR]\n\nFind the area of the unshaded region shown in the given figure (a 14 cm × 14 cm region built from semicircles of diameter 4 cm and a central square).",
    "options": [],
    "answer": "Main: 308 cm². OR Alt: (16 + 8π) cm².",
    "solutionSteps": [
      "Total area removed = sum of three circular sectors at A, B, C with same radius r = 14 cm. Total sector area = (∠A + ∠B + ∠C)/360° × πr² = 180°/360° × πr² = (1/2)π(14)² = (1/2)·(22/7)·196 = 308 cm². Sum of angles in a triangle is 180°.",
      "Therefore total area removed = 308 cm².",
      "OR (alternative): Side of square = diameter of semi-circle = a. Horizontal extent: 14 − 3 − 3 = 8 cm = 2r + a ⇒ 2r + r = 3r and a + 2r = 8. Since side of square equals diameter, a = 2r ⇒ 2r + 2r = 8 ⇒ r = 2, a = 4. Area = a² + 4·(½πr²) = 16 + 4·(½·π·4) = 16 + 8π cm²."
    ],
    "finalAnswer": "Main: 308 cm². OR Alt: (16 + 8π) cm².",
    "isCompetencyBased": true
  }
];
