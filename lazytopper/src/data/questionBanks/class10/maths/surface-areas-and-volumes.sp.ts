import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * surface-areas-and-volumes — CBSE Sample Papers (P5): Sample Paper Maths Standard 2022.
 * Extracted 2026-05-29 (Sprint 1). topicKey "surface-areas-and-volumes". pyqYear OMITTED (sample papers, not board PYQ).
 */
export const SAV_SP: CanonicalQuestion[] = [
  {
    "id": "SP-M-2022-SAV-D-001",
    "subject": "Maths",
    "topicKey": "surface-areas-and-volumes",
    "subtopic": "Volume (Cylinder and Cuboid)",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "In a hospital, used water is collected in a cylindrical tank of diameter 2 m and height 5 m. After recycling, this water is used to irrigate a park of the hospital whose length is 25 m and breadth is 20 m. If the tank is filled completely, then what will be the height of standing water used for irrigating the park?",
    "options": [],
    "answer": "Height of standing water ≈ 0.031 m",
    "solutionSteps": [
      "[1 mark] Radius of cylindrical tank r = 2/2 = 1 m; height h = 5 m.",
      "[1 mark] Volume of tank = πr²h = (22/7) × (1)² × 5 = 110/7 m³.",
      "[1 mark] Park dimensions: length l = 25 m, breadth b = 20 m. Let h be the height of standing water; volume of water in park = l × b × h.",
      "[1 mark] Equate volumes: (22/7) × 5 = 25 × 20 × h → h = (22 × 5)/(7 × 25 × 20).",
      "[1 mark] h = 110/3500 = 11/350 ≈ 0.031 m. Height of standing water in the park is about 0.031 m."
    ],
    "finalAnswer": "Height of standing water ≈ 0.031 m",
    "isCompetencyBased": true
  },
  {
    "id": "SP-M-2022-SAV-D-002",
    "subject": "Maths",
    "topicKey": "surface-areas-and-volumes",
    "subtopic": "Surface Area (Cylinder Surmounted by Cone)",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Applying",
    "questionText": "A military tent of height 8.25 m is in the form of a right circular cylinder of base diameter 30 m and height 5.5 m surmounted by a right circular cone of the same base radius. Find the length of the canvas used in making the tent, if the breadth of the canvas is 1.5 m.",
    "options": [],
    "answer": "Length of canvas = 825 m",
    "solutionSteps": [
      "[1 mark] Radius r = 30/2 = 15 m; height of cylindrical part = 5.5 m; height of conical part = 8.25 − 5.5 = 2.75 m.",
      "[1 mark] Slant height of cone l = √(r² + h²) = √(15² + 2.75²) = √(225 + 121/16) = √(3721/16) = 61/4 m.",
      "[1 mark] Total surface area = CSA of cylinder + CSA of cone = 2πrh + πrl = πr(2h + l) = (22/7) × 15 × (2 × 5.5 + 61/4).",
      "[1 mark] = (22/7) × 15 × (11 + 61/4) = (22/7) × 15 × (105/4) = 2475/2 m². This is the area of canvas used.",
      "[1 mark] Length of canvas = area / breadth = (2475/2) ÷ 1.5 = (2475/2) ÷ (3/2) = 825 m."
    ],
    "finalAnswer": "Length of canvas = 825 m",
    "isCompetencyBased": true
  }
];
