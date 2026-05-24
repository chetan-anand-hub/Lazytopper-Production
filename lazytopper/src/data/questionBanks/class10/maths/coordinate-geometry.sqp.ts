import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Coordinate Geometry — CBSE Sample Question Paper 2023-24 (MATHEMATICS STANDARD — Code 041)
 * Source: MathsStandard-SQP.pdf (10pp) + MathsStandard-MS.pdf (9pp), cbseacademic.nic.in
 * Extracted: 2026-05-24 (P2 SQP-only scope; APQ deferred to follow-up PR)
 * topicKey: "coordinate-geometry"
 * Section distribution: A=2, E=1 (case-based)
 * Note: subtopic 'area of a triangle from coordinates' is RETAINED in CBSE 2025-26 syllabus
 * (chapter blurb in topics.ts line 84-86 keeps it). Not used here, but available for APQ.
 */
export const COORDINATE_GEOMETRY_SQP: CanonicalQuestion[] = [
  {
    "id": "SQP-M-CG-001",
    "subject": "Maths",
    "topicKey": "coordinate-geometry",
    "subtopic": "Section Formula — Ratio in which Axis Divides a Segment",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "What is the ratio in which the line segment joining (2, −3) and (5, 6) is divided by x-axis?",
    "options": [
      "(A) 1:2",
      "(B) 2:1",
      "(C) 2:5",
      "(D) 5:2"
    ],
    "answer": "(A) 1:2",
    "solutionSteps": [
      "Let x-axis divide the segment in ratio k:1. Point on x-axis has y = 0. By section formula, y = (k·6 + 1·(−3))/(k + 1) = 0 ⇒ 6k − 3 = 0 ⇒ k = 1/2. So ratio = 1:2 (internal). Answer: (A)."
    ],
    "finalAnswer": "(A) 1:2",
    "isCompetencyBased": true
  },
  {
    "id": "SQP-M-CG-002",
    "subject": "Maths",
    "topicKey": "coordinate-geometry",
    "subtopic": "Distance Formula — Locus from Origin",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "A point (x, y) is at a distance of 5 units from the origin. How many such points lie in the third quadrant?",
    "options": [
      "(A) 0",
      "(B) 1",
      "(C) 2",
      "(D) infinitely many"
    ],
    "answer": "(D) infinitely many",
    "solutionSteps": [
      "Locus of points 5 units from origin is the circle x² + y² = 25. In the third quadrant (x < 0, y < 0), this circle has a continuous arc — infinitely many points lie on it. Answer: (D)."
    ],
    "finalAnswer": "(D) infinitely many",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-M-CG-003",
    "subject": "Maths",
    "topicKey": "coordinate-geometry",
    "subtopic": "Case-Based — Football Field Coordinates",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Tharunya was thrilled to know that the football tournament is fixed with a monthly timeframe from 20th July to 20th August 2023 and for the first time in the FIFA Women's World Cup's history, two nations host in 10 venues. Her father felt that the game can be better understood if the position of players is represented as points on a coordinate plane.\n\nPart (i) [1 mark]: At an instance, the midfielders and forward formed a parallelogram. Find the position of the central midfielder D if the position of other players who formed the parallelogram are A(1, 2), B(4, 3) and C(6, 6).\n\nPart (ii) [2 marks]: Check if the Goal-keeper G(−3, 5), Sweeper H(3, 1) and Wing-back K(0, 3) fall on the same straight line. OR Check if the Full-back J(5, −3) and centre-back I(−4, 6) are equidistant from forward C(0, 1) and if C is the mid-point of IJ.\n\nPart (iii) [1 mark]: If Defensive midfielder A(1, 4), Attacking midfielder B(2, −3) and Striker E(a, b) lie on the same straight line and B is equidistant from A and E, find the position of E.",
    "options": [],
    "answer": "(i) D(3, 5). (ii) G, H, K are collinear (GK + HK = GH). OR J and I are equidistant from C (CJ = CI = √41), but C is NOT the midpoint of IJ. (iii) E(3, −10).",
    "solutionSteps": [
      "Part (i): For parallelogram ABCD, diagonals bisect each other. Midpoint of AC = Midpoint of BD. Let D = (a, b). ((1 + 6)/2, (2 + 6)/2) = ((4 + a)/2, (3 + b)/2) ⇒ 4 + a = 7 ⇒ a = 3; 3 + b = 8 ⇒ b = 5. So D = (3, 5).",
      "Part (ii): GH = √((−3 − 3)² + (5 − 1)²) = √(36 + 16) = √52 = 2√13. GK = √((0 + 3)² + (3 − 5)²) = √13. HK = √((3 − 0)² + (1 − 3)²) = √13. GK + HK = √13 + √13 = 2√13 = GH ⇒ G, H, K are collinear.",
      "Part (ii) OR: CJ = √((0 − 5)² + (1 + 3)²) = √(25 + 16) = √41. CI = √((0 + 4)² + (1 − 6)²) = √(16 + 25) = √41. Hence equidistant. Midpoint of IJ = ((5 − 4)/2, (−3 + 6)/2) = (1/2, 3/2) ≠ C(0, 1). So C is NOT the midpoint.",
      "Part (iii): A, B, E collinear and B equidistant from A and E ⇒ B is the midpoint of AE. So ((1 + a)/2, (4 + b)/2) = (2, −3) ⇒ 1 + a = 4 ⇒ a = 3; 4 + b = −6 ⇒ b = −10. E = (3, −10)."
    ],
    "finalAnswer": "(i) D(3, 5); (ii) collinear; OR equidistant but C not midpoint; (iii) E(3, −10).",
    "isCompetencyBased": true
  }
];
