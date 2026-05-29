import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * areas-related-to-circles — CBSE Maths Standard Preboard Sample Papers SP1 & SP2 (Class X, Code 041).
 * Source: 776_STD SP1.pdf + 777_STD SP2.pdf (unsolved papers; worked solutions
 * generated in CBSE marking style, Sprint 1 follow-up, 2026-05-29). topicKey "areas-related-to-circles".
 * Section D (4-mark) items omitted — 4 marks maps to no valid CBSE section. pyqYear OMITTED.
 */
export const ARC_PREBOARD: CanonicalQuestion[] = [
  {
    "id": "PB-M-1-ARC-A-001",
    "subject": "Maths",
    "topicKey": "areas-related-to-circles",
    "subtopic": "Length of an Arc of a Sector",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "Length of arc of a sector of angle 45° of a circle of radius 14 cm is __________.",
    "options": [],
    "answer": "11 cm",
    "solutionSteps": [
      "[1 mark] Arc length = (θ/360°) × 2πr = (45/360) × 2 × (22/7) × 14 = (1/8) × 88 = 11 cm."
    ],
    "finalAnswer": "11 cm",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-1-ARC-A-002",
    "subject": "Maths",
    "topicKey": "areas-related-to-circles",
    "subtopic": "Distance Covered by a Wheel",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "The diameter of a wheel is 1.26 m. What is the distance covered in 500 revolutions?",
    "options": [],
    "answer": "1980 m",
    "solutionSteps": [
      "[1 mark] Distance in one revolution = circumference = πd = (22/7) × 1.26 = 3.96 m. Distance in 500 revolutions = 500 × 3.96 = 1980 m."
    ],
    "finalAnswer": "1980 m",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-2-ARC-A-001",
    "subject": "Maths",
    "topicKey": "areas-related-to-circles",
    "subtopic": "Regular Polygon Inscribed in a Circle",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "If a regular hexagon is inscribed in a circle of radius r, then its perimeter is",
    "options": [
      "(a) 3r",
      "(b) 6r",
      "(c) 9r",
      "(d) 12r"
    ],
    "answer": "(b) 6r",
    "solutionSteps": [
      "[1 mark] A regular hexagon inscribed in a circle splits into 6 equilateral triangles, each with two sides equal to the radius r; hence each side of the hexagon equals r. Perimeter = 6 × side = 6r. Answer: (b)."
    ],
    "finalAnswer": "(b) 6r",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-2-ARC-A-002",
    "subject": "Maths",
    "topicKey": "areas-related-to-circles",
    "subtopic": "Area of a Circle",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "If the radius of a circle is 14 cm, the area of the circle is __________.",
    "options": [],
    "answer": "616 cm²",
    "solutionSteps": [
      "[1 mark] Area = πr² = (22/7) × 14 × 14 = 22 × 28 = 616 cm²."
    ],
    "finalAnswer": "616 cm²",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-2-ARC-A-003",
    "subject": "Maths",
    "topicKey": "areas-related-to-circles",
    "subtopic": "Area Between Two Concentric Circles (Ring)",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Two coins of diameter 2 cm and 4 cm respectively are kept one over the other (concentrically) as shown in the figure. Find the area of the shaded ring-shaped region (in square cm).",
    "options": [],
    "answer": "3π cm² (≈ 9.43 cm²)",
    "solutionSteps": [
      "[1 mark] The larger coin has radius 2 cm and the smaller has radius 1 cm. Area of ring = π(R² − r²) = π(2² − 1²) = π(4 − 1) = 3π ≈ 9.43 cm²."
    ],
    "finalAnswer": "3π cm² ≈ 9.43 cm²",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Two concentric circles: an outer circle of diameter 4 cm (radius 2 cm) and an inner circle of diameter 2 cm (radius 1 cm) placed centrally over it. The annular region between the two circles is shaded."
  }
];
