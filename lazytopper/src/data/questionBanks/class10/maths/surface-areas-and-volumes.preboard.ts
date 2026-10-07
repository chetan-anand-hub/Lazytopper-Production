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
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "The length of the diagonal of a cube that can be inscribed in a sphere of radius 7.5 cm is",
    "options": ["7.5 cm", "15√3 cm", "15 cm", "5√3 cm"],
    "answer": "15 cm",
    "solutionSteps": [
      "[1 mark] 15 cm — the cube's space diagonal equals the sphere's diameter = 2 × 7.5 = 15 cm."
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
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A rectangular sheet of paper 40 cm × 22 cm is rolled to form a hollow cylinder of height 40 cm. The radius of the cylinder is",
    "options": ["7 cm", "1.75 cm", "14 cm", "3.5 cm"],
    "answer": "3.5 cm",
    "solutionSteps": [
      "[1 mark] 3.5 cm — base circumference = 22 cm: 2 × (22/7) × r = 22 ⇒ r = 3.5 cm."
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
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "If the heights of two cylinders are equal and their radii are in the ratio 7 : 5, then the ratio of their volumes is",
    "options": ["49 : 25", "7 : 5", "343 : 125", "25 : 49"],
    "answer": "49 : 25",
    "solutionSteps": [
      "[1 mark] 49 : 25 — V = πr²h with equal h, so ratio = 7² : 5² = 49 : 25."
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
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "The ratio of the total surface area of a solid hemisphere to the square of its radius is",
    "options": ["2π : 1", "3π : 1", "4π : 1", "π : 1"],
    "answer": "3π : 1",
    "solutionSteps": [
      "[1 mark] 3π : 1 — TSA of a solid hemisphere = 2πr² + πr² = 3πr², so the ratio is 3π : 1."
    ],
    "finalAnswer": "3π : 1",
    "isCompetencyBased": false
  }
];
