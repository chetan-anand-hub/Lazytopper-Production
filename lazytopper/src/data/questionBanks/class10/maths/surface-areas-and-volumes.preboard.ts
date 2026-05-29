import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * surface-areas-and-volumes — CBSE Maths Standard Preboard Sample Papers SP1 & SP2 (Class X, Code 041).
 * Source: 776_STD SP1.pdf + 777_STD SP2.pdf (unsolved papers; worked solutions
 * generated in CBSE marking style, Sprint 1 follow-up, 2026-05-29). topicKey "surface-areas-and-volumes".
 * Section D (4-mark) items omitted — 4 marks maps to no valid CBSE section. pyqYear OMITTED.
 */
export const SAV_PREBOARD: CanonicalQuestion[] = [
  {
    "id": "PB-M-1-SAV-A-001",
    "subject": "Maths",
    "topicKey": "surface-areas-and-volumes",
    "subtopic": "Volume of a Sphere",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If the radius of the sphere is increased by 100%, the volume of the corresponding sphere is increased by",
    "options": [
      "(a) 200%",
      "(b) 500%",
      "(c) 700%",
      "(d) 800%"
    ],
    "answer": "(c) 700%",
    "solutionSteps": [
      "[1 mark] Increasing the radius by 100% doubles it (new r = 2r). Volume ∝ r³, so new volume = (2)³ = 8 times the original. Increase = 8V − V = 7V, i.e. 700%. Answer: (c)."
    ],
    "finalAnswer": "(c) 700%",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-1-SAV-A-002",
    "subject": "Maths",
    "topicKey": "surface-areas-and-volumes",
    "subtopic": "Diagonal of a Cube Inscribed in a Sphere",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "The length of the diagonal of a cube that can be inscribed in a sphere of radius 7.5 cm is __________.",
    "options": [],
    "answer": "15 cm",
    "solutionSteps": [
      "[1 mark] For a cube inscribed in a sphere, the space diagonal of the cube equals the diameter of the sphere. Diagonal = 2 × radius = 2 × 7.5 = 15 cm."
    ],
    "finalAnswer": "15 cm",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-1-SAV-A-003",
    "subject": "Maths",
    "topicKey": "surface-areas-and-volumes",
    "subtopic": "Forming a Cylinder from a Sheet",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A rectangular sheet of paper 40 cm × 22 cm is rolled to form a hollow cylinder of height 40 cm. Find the radius of the cylinder.",
    "options": [],
    "answer": "3.5 cm",
    "solutionSteps": [
      "[1 mark] On rolling along the side of length 22 cm, the width 22 cm becomes the circumference of the base: 2πr = 22 → 2 × (22/7) × r = 22 → r = 22 × 7 / 44 = 3.5 cm."
    ],
    "finalAnswer": "3.5 cm",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-2-SAV-A-001",
    "subject": "Maths",
    "topicKey": "surface-areas-and-volumes",
    "subtopic": "Curved/Lateral Surface Area of a Cylinder",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "The ratio of the lateral surface areas of two cylinders with equal height (radii R and r) is",
    "options": [
      "(a) 1 : 2",
      "(b) H : h",
      "(c) R : r",
      "(d) None of these"
    ],
    "answer": "(c) R : r",
    "solutionSteps": [
      "[1 mark] Lateral (curved) surface area of a cylinder = 2πrh. With equal heights h, the ratio = 2πRh : 2πrh = R : r. Answer: (c)."
    ],
    "finalAnswer": "(c) R : r",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-2-SAV-A-002",
    "subject": "Maths",
    "topicKey": "surface-areas-and-volumes",
    "subtopic": "Volume of a Cylinder",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "If the heights of two cylinders are equal and their radii are in the ratio 7 : 5, then the ratio of their volumes is __________.",
    "options": [],
    "answer": "49 : 25",
    "solutionSteps": [
      "[1 mark] Volume of a cylinder = πr²h. With equal heights, ratio = r₁² : r₂² = 7² : 5² = 49 : 25."
    ],
    "finalAnswer": "49 : 25",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-2-SAV-A-003",
    "subject": "Maths",
    "topicKey": "surface-areas-and-volumes",
    "subtopic": "Total Surface Area of a Hemisphere",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "What is the ratio of the total surface area of a solid hemisphere to the square of its radius?",
    "options": [],
    "answer": "3π : 1",
    "solutionSteps": [
      "[1 mark] Total surface area of a solid hemisphere = 3πr². Ratio to r² = 3πr² : r² = 3π : 1."
    ],
    "finalAnswer": "3π : 1",
    "isCompetencyBased": false
  }
];
