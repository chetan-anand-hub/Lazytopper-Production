import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * areas-related-to-circles — CBSE Sample Papers (P5): Sample Paper Maths Standard 2022.
 * Extracted 2026-05-29 (Sprint 1). topicKey "areas-related-to-circles". pyqYear OMITTED (sample papers, not board PYQ).
 */
export const ARC_SP: CanonicalQuestion[] = [
  {
    "id": "SP-M-2022-ARC-A-001",
    "subject": "Maths",
    "topicKey": "areas-related-to-circles",
    "subtopic": "Area of Inscribed Circle",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "The area of a circle that can be inscribed in a square of 4 cm is",
    "options": [
      "(a) 4π cm²",
      "(b) 2π cm²",
      "(c) 16π cm²",
      "(d) 8π cm²"
    ],
    "answer": "(a) 4π cm²",
    "solutionSteps": [
      "[1 mark] A circle inscribed in a square of side 4 cm has diameter = side = 4 cm, so radius = 2 cm. Area = πr² = π(2)² = 4π cm². Answer: (a)."
    ],
    "finalAnswer": "(a) 4π cm²",
    "isCompetencyBased": false
  },
  {
    "id": "SP-M-2022-ARC-E-001",
    "subject": "Maths",
    "topicKey": "areas-related-to-circles",
    "subtopic": "Circumference, Sector Area and Revolutions",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A brooch is a small piece of jewellery with a pin at the back so it can be fastened on a dress. Design A: Brooch A, made of silver wire, is in the form of a circle with diameter 28 mm; the wire used for making four diameters divides the circle into 8 equal parts. Design B: Brooch B is made of gold (outer) and silver; the circumference of the silver part is 44 mm and the gold part is 3 mm wide everywhere. (a) What is the total length of silver wire required (Brooch A)? (b) What is the area of each sector of Brooch A? (c) A girl plays with Brooch A, making revolutions along its edge. How many complete revolutions must it take to cover a distance of 112π mm? [OR] A boy plays with Brooch B, making revolutions along its edge. How many complete revolutions must it take to cover a distance of 80π mm?",
    "options": [],
    "answer": "(a) 200 mm; (b) 77 mm²; (c) 4 revolutions [OR (c) 4 revolutions for Brooch B]",
    "solutionSteps": [
      "[1 mark] (a) Radius of Brooch A = 28/2 = 14 mm. Total silver wire = circumference + 4 diameters = 2πr + 4d = 2 × (22/7) × 14 + 4 × 28 = 88 + 112 = 200 mm.",
      "[1 mark] (b) Eight equal sectors → each sector angle θ = 360°/8 = 45°. Area of each sector = (θ/360°) × πr² = (45/360) × (22/7) × 14 × 14 = 77 mm².",
      "[2 marks] (c) Let the number of revolutions = x. Then x × circumference = distance: x × 2πr = 112π → x = 112π/(2π × 14) = 112/28 = 4. Number of complete revolutions = 4.",
      "[2 marks] (OR, Brooch B) Circumference of silver part = 44 mm → 2πr₁ = 44 → r₁ = 44 × 7/(2 × 22) = 7 mm. Radius of Brooch B = 7 + 3 = 10 mm. Then x × 2πr = 80π → x = 80π/(2π × 10) = 4. Number of complete revolutions = 4."
    ],
    "finalAnswer": "(a) 200 mm; (b) 77 mm²; (c) 4 complete revolutions",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "Two circular brooch designs. Design A: a circle of diameter 28 mm with four diameters drawn through the centre, dividing it into 8 equal sectors. Design B: a circular brooch with an outer gold ring 3 mm wide surrounding an inner silver circle whose circumference is 44 mm."
  }
];
