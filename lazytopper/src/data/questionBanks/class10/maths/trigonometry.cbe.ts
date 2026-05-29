import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Trigonometry — CBSE CBE Item Bank (Competency-based education for CBSE), Maths Class 10.
 * Source: Item-Bank--Maths---Class-10.pdf (British Council / CBSE, September 2021),
 *   items Maths10SK3, Maths10SS1 (a,b), Maths10PS9 (a,b), Maths10AS5 (a,b),
 *   Maths10SK2, Maths10GS4, Maths10SS2, Maths10PS5, Maths10AR4, Maths10AR6a,
 *   Maths10SS3, Maths10SK5, Maths10RK7 (a,b), Maths10RM6 (a,b,c).
 * Content Reference codes 10T1a/10T1b/10T1c/10T2a/10T3a mapped to chapter topicKey "trigonometry".
 * Extracted: 2026-05-29 (Sprint 1 — CBSE Official). pyqYear OMITTED (item-bank, not PYQ).
 * COLLISION GUARD: several items mis-coded 10T3a are actually coordinate geometry and were
 *   excluded (Maths10AR2, Maths10RK8, Maths10RM7a/b, Maths10SS4). Plain non-case 4-mark
 *   heights items (Maths10SK6, Maths10AR6b) excluded — section E is case-based only.
 * Section distribution: A=5, B=10, C=4.
 */
export const TRIG_CBE: CanonicalQuestion[] = [
  {
    "id": "CBE-M-TRIG-A-001",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Ratios of an Acute Angle",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "In right-angled ∆ABC, AB = 13 cm, BC = 5 cm and AC = 12 cm, what is the value of cos B?",
    "options": [
      "A. 5/12",
      "B. 5/13",
      "C. 12/13",
      "D. 13/12"
    ],
    "answer": "B. 5/13",
    "solutionSteps": [
      "[1 mark] cos B = base/hypotenuse = BC/AB = 5/13. Answer: B."
    ],
    "finalAnswer": "B. 5/13",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-TRIG-A-002",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Ratios of Specific Angles",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "If sin (A − B) = ½ and cos (A + B) = ½, where (A + B) ≤ 90° and A > B, find the value of tan 2A.",
    "options": [],
    "answer": "tan 2A = 1/√3 (per official mark scheme)",
    "solutionSteps": [
      "[1 mark] From sin(A−B)=½ → A−B=30° and cos(A+B)=½ → A+B=60°, giving A=45° and B=15°. The official mark scheme states tan 2A = tan 30° = 1/√3 (see DEFECTS note: with A=45°, 2A=90°, so this value is taken directly from the source scheme)."
    ],
    "finalAnswer": "tan 2A = 1/√3 (per official mark scheme)",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-TRIG-A-003",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Ratios of Specific Angles",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "The value of θ, for which sin 2θ = 1/2; 0° < θ < 90° is",
    "options": [
      "A. 15°",
      "B. 30°",
      "C. 45°",
      "D. 60°"
    ],
    "answer": "A. 15°",
    "solutionSteps": [
      "[1 mark] sin 2θ = 1/2 → 2θ = 30° → θ = 15°. Answer: A."
    ],
    "finalAnswer": "A. 15°",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-TRIG-A-004",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Ratios of Specific Angles",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "Evaluate in the simplest form: cos 60°·cos 30° − sin 60°·sin 30°",
    "options": [],
    "answer": "0",
    "solutionSteps": [
      "[1 mark] cos 60°·cos 30° − sin 60°·sin 30° = (1/2)(√3/2) − (√3/2)(1/2) = 0."
    ],
    "finalAnswer": "0",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-TRIG-A-005",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Relationships Between Trigonometric Ratios",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If tan A = 3/4, then cos A equals",
    "options": [
      "A. 4/5",
      "B. 3/5",
      "C. 4/3",
      "D. 3/4"
    ],
    "answer": "A. 4/5",
    "solutionSteps": [
      "[1 mark] tan A = 3/4 → opposite = 3, adjacent = 4, hypotenuse = √(3²+4²) = 5. So cos A = adjacent/hypotenuse = 4/5. Answer: A."
    ],
    "finalAnswer": "A. 4/5",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-TRIG-B-001",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Ratios of an Acute Angle",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The rod of a TV disc antenna is fixed at right angles to wall AB and a rod CD supports the disc, as shown in the figure. AC = 1.5 m and CD = 3 m. Compute the value of sec θ + cosec θ.",
    "options": [],
    "answer": "41/13",
    "solutionSteps": [
      "[1 mark] sec θ = CD/AD = 3/2.6 and cosec θ = CD/AC = 3/1.5 (using AD = 2.6 m from Pythagoras).",
      "[1 mark] sec θ + cosec θ = 3/2.6 + 3/1.5 = 41/13."
    ],
    "finalAnswer": "41/13",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Right-angled triangle ACD representing a TV disc antenna. Rod AB is the vertical wall; the rod is fixed at right angles to wall AB. AC = 1.5 m is one leg, CD = 3 m is the hypotenuse (rod supporting the disc), and AD is the third side. Angle θ is the acute angle at D between CD and AD."
  },
  {
    "id": "CBE-M-TRIG-B-002",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Ratios of an Acute Angle",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A rectangular-shaped gardening block measures 12 m by 5 m and angle CAD = θ. Determine the value of 12 tan θ.",
    "options": [],
    "answer": "5",
    "solutionSteps": [
      "[1 mark] tan θ = opposite/adjacent = CD/AD = 5/12.",
      "[1 mark] 12 tan θ = 12 × 5/12 = 5."
    ],
    "finalAnswer": "5",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Rectangle ABCD with sides 12 m and 5 m. The diagonal AC creates angle CAD = θ at vertex A. Side AD = 12 m (adjacent to θ) and side CD = 5 m (opposite to θ)."
  },
  {
    "id": "CBE-M-TRIG-B-003",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Relationships Between Trigonometric Ratios",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A rectangular-shaped gardening block measures 12 m by 5 m and angle CAD = θ. Determine the value of (1 − tan²θ) / (1 + tan²θ).",
    "options": [],
    "answer": "119/169 or 0.704",
    "solutionSteps": [
      "[1 mark] tan²θ = (5/12)² = 25/144.",
      "[1 mark] (1 − 25/144)/(1 + 25/144) = (144 − 25)/(144 + 25) = 119/169 ≈ 0.704."
    ],
    "finalAnswer": "119/169 or 0.704",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Rectangle ABCD with sides 12 m and 5 m. The diagonal AC creates angle CAD = θ at vertex A. Side AD = 12 m (adjacent to θ) and side CD = 5 m (opposite to θ)."
  },
  {
    "id": "CBE-M-TRIG-B-004",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Ratios of Specific Angles",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Evaluate sin²60° − 2 tan 45° − cos²30°",
    "options": [],
    "answer": "−2",
    "solutionSteps": [
      "[1 mark] Substitute the correct values of the trigonometric ratios: (√3/2)² − 2(1) − (√3/2)².",
      "[1 mark] = 3/4 − 2 − 3/4 = −2."
    ],
    "finalAnswer": "−2",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-TRIG-B-005",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Heights and Distances",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "A flagpole casts its shadow that is 25 m long on the ground. The angle made by the tip of the flagpole and the tip of its shadow on the ground is 45°. Find the height of the flagpole.",
    "options": [],
    "answer": "25 m",
    "solutionSteps": [
      "[1 mark] tan 45° = opposite/adjacent = (height of flagpole)/25.",
      "[1 mark] 1 = (height of flagpole)/25 → height of flagpole = 25 m."
    ],
    "finalAnswer": "25 m",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "Right-angled triangle (figure not to scale). A vertical flagpole is perpendicular to the horizontal ground. Its shadow on the ground is 25 m long. The angle of elevation from the tip of the shadow to the top of the flagpole is 45°. The height of the flagpole is the unknown vertical side."
  },
  {
    "id": "CBE-M-TRIG-B-006",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Identities",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Hard",
    "bloomSkill": "Understanding",
    "questionText": "Prove that 1/(1 − sin x) − 1/(1 + sin x) = 2 tan x · sec x.",
    "options": [],
    "answer": "Proved: LHS = 2 tan x · sec x",
    "solutionSteps": [
      "[1 mark] Taking LCM = 1 − sin²x: 1/(1 − sin x) − 1/(1 + sin x) = 2 sin x/(1 − sin²x) = 2 sin x/cos²x.",
      "[1 mark] = 2 (sin x/cos x)(1/cos x) = 2 tan x · sec x. Hence proved."
    ],
    "finalAnswer": "Proved: LHS = 2 tan x · sec x",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-TRIG-B-007",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Identities",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Hard",
    "bloomSkill": "Applying",
    "questionText": "Simplify the following expression. Show your working: (sin³θ + cos³θ) / (sin θ + cos θ)",
    "options": [],
    "answer": "1 − sin θ cos θ",
    "solutionSteps": [
      "[1 mark] Factor the numerator: (sin θ + cos θ)(sin²θ − sin θ cos θ + cos²θ) / (sin θ + cos θ).",
      "[1 mark] Using sin²θ + cos²θ = 1: = (sin θ + cos θ)(1 − sin θ cos θ)/(sin θ + cos θ) = 1 − sin θ cos θ."
    ],
    "finalAnswer": "1 − sin θ cos θ",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-TRIG-B-008",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Heights and Distances",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Ravi got a clinometer from his school's maths lab and started measuring angles of elevation. He saw a corporate building with the company logo painted on a wall. From a point P on the ground, 24 metres from the base of the building, the angle of elevation of the roof is 45°. The angle of elevation of C, the centre of the logo, is 30°. What is the height of the centre of the logo from the ground?",
    "options": [],
    "answer": "8√3 m ≈ 13.84 m",
    "solutionSteps": [
      "[1 mark] tan 30° = h/x → h/24 = 1/√3.",
      "[1 mark] h = 24/√3 = 8√3 = 8 × 1.73 = 13.84 m."
    ],
    "finalAnswer": "8√3 m ≈ 13.84 m",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "A vertical corporate building stands on horizontal ground. Point P is on the ground 24 m from the base of the building. From P, the angle of elevation to the roof of the building is 45° and the angle of elevation to C (the centre of the logo on the wall) is 30°. Two right triangles share the same horizontal base of 24 m."
  },
  {
    "id": "CBE-M-TRIG-B-009",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Heights and Distances",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "From a point P on the ground, 24 metres from the base of a corporate building, the angle of elevation of the roof is 45° and the angle of elevation of C, the centre of the logo, is 30°. What is the distance between the roof and the centre of the logo?",
    "options": [],
    "answer": "10.16 m",
    "solutionSteps": [
      "[1 mark] Height of roof: tan 45° = H/24 → H/24 = 1 → H = 24 m.",
      "[1 mark] Distance between roof and centre of logo = 24 − 13.84 = 10.16 m."
    ],
    "finalAnswer": "10.16 m",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "A vertical corporate building stands on horizontal ground. Point P is on the ground 24 m from the base. From P, the angle of elevation to the roof is 45° and to the centre C of the logo is 30°. The roof height is 24 m and the logo centre height is 8√3 ≈ 13.84 m; the required distance is the vertical gap between them."
  },
  {
    "id": "CBE-M-TRIG-B-010",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Heights and Distances",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "For the corporate building, the centre C of the logo is at height 8√3 m. If the point of observation P (originally 24 m from the base) is moved 16 m towards the base of the building, find the angle of elevation of the logo on the building.",
    "options": [],
    "answer": "60°",
    "solutionSteps": [
      "[1 mark] New distance of P from the base = 24 − 16 = 8 m; tan φ = H/x = 8√3/8 = √3.",
      "[1 mark] φ = 60°."
    ],
    "finalAnswer": "60°",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "A vertical corporate building on horizontal ground with the logo centre C at height 8√3 m. The observation point is moved from 24 m to 8 m from the base (16 m closer). The new angle of elevation φ from the moved point to C is the unknown."
  },
  {
    "id": "CBE-M-TRIG-C-001",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Ratios of an Acute Angle",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The rod of a TV disc antenna is fixed at right angles to wall AB and a rod CD supports the disc, as shown in the figure. AC = 1.5 m and CD = 3 m. Find the length of the rod AD.",
    "options": [],
    "answer": "2.6 m (or 2.59 m)",
    "solutionSteps": [
      "[1 mark] Apply Pythagoras' theorem in right triangle ACD: AD² + AC² = DC².",
      "[1 mark] AD² + (1.5)² = (3)² → AD² = 9 − 2.25 = 6.75.",
      "[1 mark] AD = √6.75 = 2.6 m (approx.)."
    ],
    "finalAnswer": "2.6 m (or 2.59 m)",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Right-angled triangle ACD representing a TV disc antenna. Rod AB is the vertical wall; the rod is fixed at right angles to wall AB. AC = 1.5 m is one leg, CD = 3 m is the hypotenuse (rod supporting the disc), and AD is the third side to be found."
  },
  {
    "id": "CBE-M-TRIG-C-002",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Ratios of Specific Angles",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If sin (A − B) = ½ and cos (A + B) = ½, where (A + B) ≤ 90° and A > B, find the values of A and B.",
    "options": [],
    "answer": "A = 45°; B = 15°",
    "solutionSteps": [
      "[1 mark] sin(A − B) = ½ = sin 30° → A − B = 30°  ...(i).",
      "[1 mark] cos(A + B) = ½ = cos 60° → A + B = 60°  ...(ii).",
      "[1 mark] Solving (i) and (ii): A = 45°; B = 15°."
    ],
    "finalAnswer": "A = 45°; B = 15°",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-TRIG-C-003",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Identities",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Hard",
    "bloomSkill": "Applying",
    "questionText": "If k + 1 = sec²θ (1 + sin θ)(1 − sin θ), find the value of k.",
    "options": [],
    "answer": "k = 0",
    "solutionSteps": [
      "[1 mark] k + 1 = sec²θ (1 + sin θ)(1 − sin θ) = sec²θ (1 − sin²θ).",
      "[1 mark] = sec²θ · cos²θ = (1/cos²θ) · cos²θ = 1.",
      "[1 mark] k + 1 = 1 → k = 1 − 1 = 0."
    ],
    "finalAnswer": "k = 0",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-TRIG-C-004",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Heights and Distances",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A laser rangefinder shows that the top of a tower is 200 metres from a point on the ground. It is at an angle of elevation of 30°. Find the height of the tower.",
    "options": [],
    "answer": "100 m",
    "solutionSteps": [
      "[1 mark] Let C be the point on the ground, A the top of the tower and B the base. In triangle ABC, sin 30° = AB/200.",
      "[1 mark] AB = 200 × sin 30°.",
      "[1 mark] AB = 200 × ½ = 100 m."
    ],
    "finalAnswer": "100 m",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "Right-angled triangle ABC. AB is the vertical tower, B its base on the ground, and C a point on the ground. The line of sight CA (the laser rangefinder distance) is 200 m and the angle of elevation at C is 30°. The height AB is the unknown."
  },
  {
    "id": "CBE-M-TRIG-C-005",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Heights and Distances",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The rooftop of your house is 8 m above the ground. The base of a tree is 30 m away (along the ground) at the ground level of your house. From the nearest point of the rooftop of your house, the top of the tree is at an angle of elevation of 45°. Find the height of the tree.",
    "options": [],
    "answer": "38 m",
    "solutionSteps": [
      "[1 mark] Let AC be the tree and DE the side of the house; the horizontal distance CD = BE = 30 m.",
      "[1 mark] In triangle ABE, AB/BE = tan 45° → AB = 30 m (the height of the tree above rooftop level).",
      "[1 mark] Height of the tree AC = AB + 8 = 30 + 8 = 38 m."
    ],
    "finalAnswer": "38 m",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "A house and a tree on level ground. The rooftop of the house is 8 m above the ground. The base of the tree is 30 m horizontally from the house. From the nearest point of the rooftop (at height 8 m), the angle of elevation to the top of the tree is 45°. A right triangle ABE has horizontal leg BE = 30 m at rooftop level and the vertical rise AB to the tree top; the full tree height AC adds the 8 m rooftop height."
  }
];
