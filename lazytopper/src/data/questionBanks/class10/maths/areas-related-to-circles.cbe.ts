import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Areas Related to Circles — CBSE CBE Item Bank (Competency-based education for CBSE), Maths Class 10.
 * Source: Item-Bank--Maths---Class-10.pdf (British Council / CBSE, September 2021),
 *   items Maths10AS8 (a,b), Maths10ASR2, Maths10AD5 (a,b), Maths10ASR10 (a,b),
 *   Maths10AKP1, Maths10AKP12.
 * Content Reference 10M1b (areas and perimeter/circumference of plane figures — circles,
 *   sectors, quadrants, semicircles, combinations) mapped to CBSE chapter topicKey
 *   "areas-related-to-circles".
 * NOTE: Maths10AKP1 and Maths10AKP12 are tagged 10M2a in the source table but their item
 *   bodies are purely about area/circumference of a (2-D) circle — not surface area/volume of
 *   a solid — so they belong to this chapter and are included on a body-content basis.
 * Extracted: 2026-05-29 (Sprint 1 — CBSE Official). pyqYear OMITTED (item-bank, not PYQ).
 * Section distribution: A=4, B=1, C=2, E=1.
 */
export const ARC_CBE: CanonicalQuestion[] = [
  {
    "id": "CBE-M-ARC-A-001",
    "subject": "Maths",
    "topicKey": "areas-related-to-circles",
    "subtopic": "Area of a Circle",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "The area of a circular playground is 9856 m². Find the radius of the circular field. (Use π = 22/7)",
    "options": [],
    "answer": "56 m",
    "solutionSteps": [
      "[1 mark] Area = πr² = 22/7 × r² = 9856 → r² = 9856 × 7/22 = 3136 → r = √3136 = 56 m."
    ],
    "finalAnswer": "56 m",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-ARC-A-002",
    "subject": "Maths",
    "topicKey": "areas-related-to-circles",
    "subtopic": "Perimeter of a Quadrant",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "What is the perimeter of a quadrant of a circle (OAB) whose diameter is 10 cm? (Use π = 3.14)",
    "options": [
      "A. 7.85 cm",
      "B. 17.85 cm",
      "C. 27.85 cm",
      "D. 37.85 cm"
    ],
    "answer": "B. 17.85 cm",
    "solutionSteps": [
      "[1 mark] Radius r = 10/2 = 5 cm. Perimeter of quadrant = 2r + (1/4 × 2πr) = 10 + (1/4 × 2 × 3.14 × 5) = 10 + 7.85 = 17.85 cm. Answer: B."
    ],
    "finalAnswer": "B. 17.85 cm",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "A quadrant OAB of a circle: O is the centre with two perpendicular radii OA and OB (each 5 cm, since diameter is 10 cm), and the arc AB joining A to B forms the quarter-circle. The perimeter is the two straight radii plus the quarter arc."
  },
  {
    "id": "CBE-M-ARC-A-003",
    "subject": "Maths",
    "topicKey": "areas-related-to-circles",
    "subtopic": "Area of a Circle",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "The area of a circular coin is 3.14 cm². The radius of it will be (use π = 3.14)",
    "options": [
      "A. 0.01 cm",
      "B. 0.1 cm",
      "C. 1 cm",
      "D. 10 cm"
    ],
    "answer": "C. 1 cm",
    "solutionSteps": [
      "[1 mark] Area of coin = πr² = 3.14 → 3.14 r² = 3.14 → r² = 1 → r = 1 cm. Answer: C."
    ],
    "finalAnswer": "C. 1 cm",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-ARC-A-004",
    "subject": "Maths",
    "topicKey": "areas-related-to-circles",
    "subtopic": "Circumference of a Circle",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The area of a circular cap is 25π cm². The circumference of the cap will be",
    "options": [
      "A. 0.0314 cm",
      "B. 0.314 cm",
      "C. 3.14 cm",
      "D. 31.4 cm"
    ],
    "answer": "D. 31.4 cm",
    "solutionSteps": [
      "[1 mark] Area = πr² = 25π → r² = 25 → r = 5 cm. Circumference = 2πr = 2 × 3.14 × 5 = 31.4 cm. Answer: D."
    ],
    "finalAnswer": "D. 31.4 cm",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-ARC-B-001",
    "subject": "Maths",
    "topicKey": "areas-related-to-circles",
    "subtopic": "Circumference of a Circle",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The area of a circular playground is 9856 m² (its radius is 56 m). Find the cost of fencing this ground at the rate of Rs 50 per m. (Use π = 22/7)",
    "options": [],
    "answer": "Rs. 8800",
    "solutionSteps": [
      "[1 mark] Cost of fencing = perimeter × cost per m = 2πr × 50 = 2 × (22/7) × 56 × 50.",
      "[1 mark] = 352 × 50 = Rs. 8800."
    ],
    "finalAnswer": "Rs. 8800",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-ARC-C-001",
    "subject": "Maths",
    "topicKey": "areas-related-to-circles",
    "subtopic": "Perimeter of Combination of Semicircles",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "APB, AQC, CSD, BRD are semicircles where AB = BC = CD = 7 cm. Find the perimeter of the shaded region. (Use π = 22/7)",
    "options": [],
    "answer": "66 cm",
    "solutionSteps": [
      "[1 mark] Identify the perimeter as the sum of arc lengths APB + AQC + CSD + BRD. Bigger semicircles (on AC and BD, radius R = 7 cm) and smaller semicircles (on AB and CD, radius r = 3.5 cm).",
      "[1 mark] Length of a semicircular arc = πr. Total = πr + πR + πr + πR = 2(πr + πR) = 2π(r + R) = 2 × (22/7) × (3.5 + 7) = 2 × (22/7) × 10.5.",
      "[1 mark] = 66 cm."
    ],
    "finalAnswer": "66 cm",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Four collinear points A, B, C, D with AB = BC = CD = 7 cm. APB and CSD are semicircles (radius 3.5 cm) drawn on AB and CD; AQC and BRD are larger semicircles (radius 7 cm) drawn on AC and BD. The arcs alternate above and below the line AD to enclose the shaded region whose boundary is the four semicircular arcs."
  },
  {
    "id": "CBE-M-ARC-C-002",
    "subject": "Maths",
    "topicKey": "areas-related-to-circles",
    "subtopic": "Area of Combination of Semicircles",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "APB, AQC, CSD, BRD are semicircles where AB = BC = CD = 7 cm. Find the area of the shaded region. (Use π = 22/7)",
    "options": [],
    "answer": "115.5 cm²",
    "solutionSteps": [
      "[1 mark] Identify the shaded area as 2 × (area of bigger semicircle − area of smaller semicircle), with R = 7 cm and r = 3.5 cm.",
      "[1 mark] Area = 2(πR²/2 − πr²/2) = π(R² − r²) = (22/7) × (49 − 12.25).",
      "[1 mark] = (22/7) × 36.75 = 115.5 cm²."
    ],
    "finalAnswer": "115.5 cm²",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Four collinear points A, B, C, D with AB = BC = CD = 7 cm. APB and CSD are semicircles (radius 3.5 cm) drawn on AB and CD; AQC and BRD are larger semicircles (radius 7 cm) drawn on AC and BD. The shaded region is formed by the difference of the larger and smaller semicircular regions."
  },
  {
    "id": "CBE-M-ARC-E-001",
    "subject": "Maths",
    "topicKey": "areas-related-to-circles",
    "subtopic": "Areas of Sectors and Combinations (Real-World)",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "\"4-Clover Leaf\" interchanges are structured freeways that contain 'sectors of circles' with additional portions. Each leaf is in the form of a quadrant of a circle of radius 98 ft (i.e., AB = 98 ft). A semicircle is drawn with a diameter equal to BC. (Take π = 22/7) The lighter shaded region of all the leaves needs to be landscaped. Find the total area to be landscaped.",
    "options": [],
    "answer": "19,208 sq. feet",
    "solutionSteps": [
      "[1 mark] ABC is a right-angled triangle with AB = AC = 98 ft (radius of quadrant). By Pythagoras, BC² = AB² + AC² → BC = 98√2 ft, so radius of the semicircle r = BC/2 = 49√2 ft; area of semicircle = (1/2)πr² = (1/2)(22/7)(49√2)² = 7546 sq. ft.",
      "[1 mark] Area of right triangle ABC = (1/2) × 98 × 98 = 4802 sq. ft; area of quadrant = (1/4)πR² = (1/4)(22/7)(98)² = 7546 sq. ft.",
      "[1 mark] Shaded area of one cloverleaf = area of semicircle + area of ΔABC − area of quadrant = 7546 + 4802 − 7546 = 4802 sq. ft.",
      "[1 mark] Total area to be landscaped = 4 × 4802 = 19,208 sq. ft."
    ],
    "finalAnswer": "19,208 sq. feet",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "A 4-clover-leaf freeway interchange. Each leaf is a quadrant of a circle with centre A and perpendicular radii AB and AC each 98 ft. A semicircle is drawn on BC (the chord joining B and C) as diameter; triangle ABC is right-angled at A. The lighter shaded region of one leaf is the part formed by the semicircle plus triangle ABC minus the quadrant; the figure shows all four such leaves arranged symmetrically."
  }
];
