import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * triangles — CBSE Maths Standard Preboard Sample Papers SP1 & SP2 (Class X, Code 041).
 * Source: 776_STD SP1.pdf + 777_STD SP2.pdf (unsolved papers; worked solutions
 * generated in CBSE marking style, Sprint 1 follow-up, 2026-05-29). topicKey "triangles".
 * Section D (4-mark) items omitted — 4 marks maps to no valid CBSE section. pyqYear OMITTED.
 */
export const TRI_PREBOARD: CanonicalQuestion[] = [
  {
    "id": "PB-M-1-TRI-A-001",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Areas of Similar Triangles",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "It is given that △ABC ~ △PQR with BC/QR = 1/3. Then ar(△PRQ)/ar(△BCA) is equal to",
    "options": [
      "(a) 9",
      "(b) 3",
      "(c) 1/3",
      "(d) 1/9"
    ],
    "answer": "(a) 9",
    "solutionSteps": [
      "[1 mark] The ratio of areas of similar triangles equals the square of the ratio of corresponding sides. ar(△PRQ)/ar(△BCA) = (QR/BC)² = (3/1)² = 9. Answer: (a)."
    ],
    "finalAnswer": "(a) 9",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-1-TRI-C-001",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Areas of Similar Triangles",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "In a trapezium ABCD, diagonals AC and BD intersect at O and AB = 3 DC, then find the ratio of areas of triangles COD and AOB.",
    "options": [],
    "answer": "1 : 9",
    "solutionSteps": [
      "[1 mark] In trapezium ABCD, AB ∥ DC. In △COD and △AOB, ∠COD = ∠AOB (vertically opposite) and ∠OCD = ∠OAB (alternate angles, AB ∥ DC).",
      "[1 mark] By AA similarity, △COD ~ △AOB. So ar(△COD)/ar(△AOB) = (DC/AB)².",
      "[1 mark] Given AB = 3 DC ⇒ DC/AB = 1/3. Therefore ratio = (1/3)² = 1/9, i.e. 1 : 9."
    ],
    "finalAnswer": "ar(△COD) : ar(△AOB) = 1 : 9",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Trapezium ABCD with AB ∥ DC (AB the longer parallel side at the bottom, DC the shorter at top). Diagonals AC and BD drawn, crossing at point O in the interior, forming the two triangles COD (upper) and AOB (lower)."
  },
  {
    "id": "PB-M-2-TRI-A-001",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Areas of Similar Triangles",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "The areas of two similar triangles ABC and PQR are in the ratio 9 : 16. If BC = 4.5 cm, then the length of QR is",
    "options": [
      "(a) 4 cm",
      "(b) 4.5 cm",
      "(c) 3 cm",
      "(d) 6 cm"
    ],
    "answer": "(d) 6 cm",
    "solutionSteps": [
      "[1 mark] Ratio of areas = (ratio of corresponding sides)² → BC²/QR² = 9/16, so BC/QR = 3/4. Then QR = BC × 4/3 = 4.5 × 4/3 = 6 cm. Answer: (d)."
    ],
    "finalAnswer": "(d) 6 cm",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-2-TRI-A-002",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Triangle Inequality",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "The sides of a triangle (in cm) are given below. In which case is the construction of a triangle not possible?",
    "options": [
      "(a) 8, 7, 3",
      "(b) 8, 6, 4",
      "(c) 8, 4, 4",
      "(d) 7, 6, 5"
    ],
    "answer": "(c) 8, 4, 4",
    "solutionSteps": [
      "[1 mark] A triangle exists only if the sum of any two sides exceeds the third. For (c): 4 + 4 = 8, which is not greater than 8, so the triangle is degenerate and cannot be constructed. All other sets satisfy the triangle inequality. Answer: (c)."
    ],
    "finalAnswer": "(c) 8, 4, 4",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-2-TRI-B-001",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Similarity / Right-Angle Proof",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "In ∆ABC, AD ⊥ BC, such that AD² = BD × CD. Prove that ∆ABC is right angled at A.",
    "options": [],
    "answer": "∠BAC = 90°, hence ∆ABC is right angled at A.",
    "solutionSteps": [
      "[1 mark] Since AD ⊥ BC and AD² = BD × CD, in right triangles ∆ADB and ∆ADC we have AD/BD = CD/AD with the included right angles ∠ADB = ∠ADC = 90°, so ∆ADB ~ ∆CDA (SAS similarity). Hence ∠BAD = ∠ACD and ∠ABD = ∠CAD.",
      "[1 mark] In ∆ADB, ∠BAD + ∠ABD = 90°. Therefore ∠BAD + ∠CAD = 90°, i.e. ∠BAC = 90°. Hence ∆ABC is right angled at A."
    ],
    "finalAnswer": "∠BAC = 90°; ∆ABC is right angled at A.",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Triangle ABC with vertex A at top, base BC horizontal. AD is the perpendicular drawn from A to BC, meeting BC at D between B and C, with the right-angle mark at D."
  },
  {
    "id": "PB-M-2-TRI-B-002",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Pythagoras Theorem (Application)",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "Pawan is fly fishing in a stream. The tip of her fishing rod is 1.8 m above the surface of the water and the fly at the end of the string rests on the water 3.6 m away and 2.4 m from a point directly under the tip of the rod. Assuming that her string (from the tip of the rod to the fly) is taut, how much string does she have out?",
    "options": [],
    "answer": "3 m of string.",
    "solutionSteps": [
      "[1 mark] The string is the hypotenuse of a right triangle whose vertical leg is the rod-tip height = 1.8 m and whose horizontal leg is the distance of the fly from the point directly under the tip = 2.4 m.",
      "[1 mark] String = √(1.8² + 2.4²) = √(3.24 + 5.76) = √9 = 3 m."
    ],
    "finalAnswer": "3 m",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "A right triangle: a vertical segment of 1.8 m from the water surface up to the rod tip, a horizontal segment of 2.4 m along the water from the point directly below the tip to the fly, and the taut string as the hypotenuse joining the rod tip to the fly resting on the water."
  },
  {
    "id": "PB-M-2-TRI-C-001",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Similarity / Area Relations in Right Triangle",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "∆ABC is right angled at C. If p is the length of the perpendicular from C to AB and a, b, c are the lengths of the sides opposite to ∠A, ∠B and ∠C respectively, then prove that 1/p² = 1/a² + 1/b².",
    "options": [],
    "answer": "1/p² = 1/a² + 1/b² (proved).",
    "solutionSteps": [
      "[1 mark] The area of ∆ABC can be written two ways: ½ × a × b (legs BC = a and AC = b) and ½ × c × p (base AB = c with height p). Equating: a·b = c·p, so p = ab/c.",
      "[1 mark] Since ∠C = 90°, by Pythagoras theorem c² = a² + b².",
      "[1 mark] Then 1/p² = c²/(a²b²) = (a² + b²)/(a²b²) = a²/(a²b²) + b²/(a²b²) = 1/b² + 1/a². Hence 1/p² = 1/a² + 1/b²."
    ],
    "finalAnswer": "1/p² = 1/a² + 1/b² (proved).",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Right triangle ABC with the right angle at C. Hypotenuse AB is horizontal; sides a = BC and b = AC are the legs. CD = p is the perpendicular dropped from C onto AB, meeting AB at D with a right-angle mark."
  }
];
