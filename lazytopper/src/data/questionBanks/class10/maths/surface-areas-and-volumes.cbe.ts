import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Surface Areas and Volumes — CBSE CBE Item Bank (Competency-based education for CBSE), Maths Class 10.
 * Source: Item-Bank--Maths---Class-10.pdf (British Council / CBSE, September 2021),
 *   items Maths10MM3_5 (a–d), Maths10AKP1, Maths10AKP12, Maths10AD3, Maths10PR3,
 *   Maths10SR8 (a, b), Maths10AS7, Maths10PR7 (part 1a).
 * Content References 10M2a (surface areas/volumes of combinations of two solids) and
 *   10M2b (converting one metallic solid into another / mixed problems) mapped to CBSE
 *   chapter topicKey "surface-areas-and-volumes".
 * Extracted: 2026-05-29 (Sprint 1 — CBSE Official). pyqYear OMITTED (item-bank, not PYQ).
 * Frustum of Cone items skipped per 2026-27 syllabus deletion (none qualified in source).
 * Section distribution: A=5, B=2, C=4, D=1.
 */
export const SAV_CBE: CanonicalQuestion[] = [
  {
    "id": "CBE-M-SAV-A-001",
    "subject": "Maths",
    "topicKey": "surface-areas-and-volumes",
    "subtopic": "Volume of a Cylinder",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "Kanupriya runs a bakery shop. After a biscuit is cooked it becomes a cylinder of radius 3 cm and height 0.7 cm. Find the volume of one biscuit after it is cooked.",
    "options": [
      "A. 17.8 cm³",
      "B. 18.7 cm³",
      "C. 19.8 cm³",
      "D. 21.2 cm³"
    ],
    "answer": "C. 19.8 cm³",
    "solutionSteps": [
      "[1 mark] Volume of cylinder = πr²h = (22/7) × 3 × 3 × 0.7 = 19.8 cm³. Answer: C."
    ],
    "finalAnswer": "C. 19.8 cm³",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-SAV-A-002",
    "subject": "Maths",
    "topicKey": "surface-areas-and-volumes",
    "subtopic": "Combination of Solids — Sphere in a Cylinder",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The amount of mixture required to make one biscuit is 18 cm³. After cooking, the biscuit becomes a cylinder of radius 3 cm and height 0.7 cm and has some air trapped inside it. Find the volume of air trapped in the biscuit.",
    "options": [
      "A. 0.7 cm³",
      "B. 1.5 cm³",
      "C. 1.8 cm³",
      "D. 3.2 cm³"
    ],
    "answer": "C. 1.8 cm³",
    "solutionSteps": [
      "[1 mark] Volume of air trapped = Volume of cooked biscuit − Volume of mixture = 19.8 − 18 = 1.8 cm³. Answer: C."
    ],
    "finalAnswer": "C. 1.8 cm³",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-SAV-A-003",
    "subject": "Maths",
    "topicKey": "surface-areas-and-volumes",
    "subtopic": "Ratio of Volumes of Cones",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "Two cones of equal heights have their radii in the ratio 3 : 2. The ratio of their volumes will be equal to",
    "options": [
      "A. 3 : 2",
      "B. 9 : 4",
      "C. 27 : 8",
      "D. 81 : 16"
    ],
    "answer": "B. 9 : 4",
    "solutionSteps": [
      "[1 mark] Volume of cone = (1/3)πr²h; with equal h, ratio = R²/r² = 3²/2² = 9 : 4. Answer: B."
    ],
    "finalAnswer": "B. 9 : 4",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-SAV-B-001",
    "subject": "Maths",
    "topicKey": "surface-areas-and-volumes",
    "subtopic": "Packing Solids — Counting in a Cylinder",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Kanupriya runs a bakery shop. Each cooked biscuit is a cylinder of radius 3 cm and height 0.7 cm. The biscuits are packed in a cylindrical card box of height 14 cm, with 7 biscuits arranged in each layer as shown in the figure. How many biscuits will there be in a box?",
    "options": [],
    "answer": "140 biscuits",
    "solutionSteps": [
      "[1 mark] Number of layers in the box = box height / biscuit height = 14 / 0.7 = 20 layers.",
      "[1 mark] Each layer holds 7 biscuits, so number of biscuits = 20 × 7 = 140."
    ],
    "finalAnswer": "140 biscuits",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "A cylindrical card box (height 14 cm) viewed to show the arrangement of cylindrical biscuits inside: 7 biscuits (each radius 3 cm, height 0.7 cm) packed in each horizontal layer, with layers stacked up the height of the box."
  },
  {
    "id": "CBE-M-SAV-B-002",
    "subject": "Maths",
    "topicKey": "surface-areas-and-volumes",
    "subtopic": "Volume of a Cuboid — Unit Conversion",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The area of the base of a rectangular tank is 7200 cm² and the volume of water contained in it is 3 m³. Find the height of water in the tank.",
    "options": [],
    "answer": "4.16 m (or 416.67 cm)",
    "solutionSteps": [
      "[1 mark] Convert volume to cm³: 3 m³ = 3 × 100 × 100 × 100 = 3,000,000 cm³.",
      "[1 mark] Height = volume / base area = 3,000,000 / 7200 = 416.67 cm = 4.16 m."
    ],
    "finalAnswer": "4.16 m (or 416.67 cm)",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-SAV-C-001",
    "subject": "Maths",
    "topicKey": "surface-areas-and-volumes",
    "subtopic": "Volume of a Combination of Solids",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Kanupriya's cooked biscuit is a cylinder of radius 3 cm and height 0.7 cm with volume 19.8 cm³. The biscuits (140 in number) are packed in a cylindrical card box of radius 9 cm and height 14 cm. How much space is vacant in the box after the biscuits are packed?",
    "options": [],
    "answer": "792 cm³",
    "solutionSteps": [
      "[1 mark] Volume of box = πR²h = (22/7) × 9 × 9 × 14 = 3564 cm³.",
      "[1 mark] Volume of 140 biscuits = 140 × 19.8 = 2772 cm³.",
      "[1 mark] Vacant volume = 3564 − 2772 = 792 cm³."
    ],
    "finalAnswer": "792 cm³",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "A cylindrical card box (radius 9 cm, height 14 cm) packed with cylindrical biscuits (radius 3 cm, height 0.7 cm), 7 per layer and 20 layers, used to determine the box radius and the vacant volume around the biscuits."
  },
  {
    "id": "CBE-M-SAV-C-002",
    "subject": "Maths",
    "topicKey": "surface-areas-and-volumes",
    "subtopic": "Volume of Cylinder with Hemispherical Ends",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A jackfruit is in the shape of a cylinder with two hemispherical ends. The total length of the jackfruit is 60 cm and its diameter is 25 cm. Find the volume of the jackfruit (take π = 3.14).",
    "options": [],
    "answer": "21,260.42 cm³ (any value between 21260 and 21261 acceptable)",
    "solutionSteps": [
      "[1 mark] Radius r = 25/2 = 12.5 cm; the two hemispherical ends form one sphere, and cylinder length h = 60 − 25 = 35 cm. Volume = πr²h + (4/3)πr³ = πr²(h + (2/3)r).",
      "[1 mark] Substitute: = 3.14 × 12.5 × 12.5 × (35 + (2/3) × 12.5).",
      "[1 mark] = 21,260.42 cm³."
    ],
    "finalAnswer": "21,260.42 cm³",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "A jackfruit modelled as a right circular cylinder with a hemisphere attached at each end; total length 60 cm and diameter 25 cm marked on the figure (not to scale)."
  },
  {
    "id": "CBE-M-SAV-C-003",
    "subject": "Maths",
    "topicKey": "surface-areas-and-volumes",
    "subtopic": "Smallest Cuboidal Box Enclosing a Solid",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A jackfruit is in the shape of a cylinder with two hemispherical ends; its total length is 60 cm and its diameter is 25 cm. The jackfruit is to be packed in a cuboidal container. What is the volume of the smallest such box?",
    "options": [],
    "answer": "37,500 cm³",
    "solutionSteps": [
      "[1 mark] The smallest box must just contain the jackfruit, so length = 60 cm and breadth = height = 25 cm.",
      "[1 mark] Volume of box = l × b × h = 60 × 25 × 25.",
      "[1 mark] = 37,500 cm³."
    ],
    "finalAnswer": "37,500 cm³",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "A jackfruit (cylinder with two hemispherical ends, length 60 cm, diameter 25 cm) enclosed snugly in a cuboidal box of dimensions 60 cm × 25 cm × 25 cm."
  },
  {
    "id": "CBE-M-SAV-C-004",
    "subject": "Maths",
    "topicKey": "surface-areas-and-volumes",
    "subtopic": "Volume of a Cylinder — Rate of Filling",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Ramesh has recently built his house and installed a cylindrical water tank of radius 50 cm and height 175 cm. If water is filled in the tank at the rate of 11 litres per minute, how long will it take for the tank to be completely filled?",
    "options": [],
    "answer": "125 minutes",
    "solutionSteps": [
      "[1 mark] Volume of tank = πr²h = (22/7) × 50 × 50 × 175 = 1,375,000 cm³ = 1375 litres.",
      "[1 mark] Identify rate of filling = 11 litres per minute.",
      "[1 mark] Time = volume / rate = 1375 / 11 = 125 minutes."
    ],
    "finalAnswer": "125 minutes",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-SAV-D-001",
    "subject": "Maths",
    "topicKey": "surface-areas-and-volumes",
    "subtopic": "Lateral Surface Area of a Pyramid and a Cone",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "Kaju and Seerat each set up a tent of the same height in their respective rooms. Kaju's tent is a square-based pyramid with base side 4 m; Seerat's tent is conical with base diameter 4 m. Both tents have height 2 m. Kaju uses green printed cloth and Seerat uses pink printed cloth; the base is the floor of the room, so cloth is used for the sides only. Find the difference, in m², in the cloth used by Kaju and Seerat. (Take π = 22/7.)",
    "options": [],
    "answer": "About 4.86 m² (mark scheme states 14.84 m²; allow 14.8 to 14.9)",
    "solutionSteps": [
      "[1 mark] Kaju's cloth = 4 × area of one triangular side face = 4 × (1/2) × b × s, with base b = 4 m and slant height s perpendicular to the base from the apex.",
      "[1 mark] Find slant height by Pythagoras using the height (2 m) and half the base (2 m): (2)² + (2)² = s² ⟹ s² = 8 ⟹ s = 2.83 m.",
      "[1 mark] Kaju's cloth = 4 × (1/2) × 4 × 2.83 = 22.64 m².",
      "[1 mark] Seerat's cloth = curved surface area of cone = πrl = (22/7) × 2 × √(2² + 2²) = 17.78 m².",
      "[1 mark] Difference of areas = 22.64 − 17.78 = 4.86 m²."
    ],
    "finalAnswer": "Difference = 4.86 m²",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "Two tents side by side, not to scale. Kaju's tent is a square-based pyramid with base side 4 m and vertical height h = 2 m, slant edge/face labelled. Seerat's tent is a right circular cone with base diameter 4 m and vertical height h = 2 m. The base of each is the floor; only the sloping sides are covered with cloth."
  }
];
