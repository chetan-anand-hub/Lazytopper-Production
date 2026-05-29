import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * triangles — CBSE Sample Papers (P5): Sample Paper Maths Standard 2022.
 * Extracted 2026-05-29 (Sprint 1). topicKey "triangles". pyqYear OMITTED (sample papers, not board PYQ).
 */
export const TRI_SP: CanonicalQuestion[] = [
  {
    "id": "SP-M-2022-TRI-A-001",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Areas of Similar Triangles",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "∆ABC ~ ∆DEF. If AB = 4DE, ar(∆ABC) = 128 cm² then ar(∆DEF) is",
    "options": [
      "(a) 8 cm²",
      "(b) 4 cm²",
      "(c) 16 cm²",
      "(d) 10 cm²"
    ],
    "answer": "(a) 8 cm²",
    "solutionSteps": [
      "[1 mark] Ratio of areas = (AB/DE)² = 4² = 16. So ar(∆DEF) = ar(∆ABC)/16 = 128/16 = 8 cm². Answer: (a)."
    ],
    "finalAnswer": "(a) 8 cm²",
    "isCompetencyBased": false
  },
  {
    "id": "SP-M-2022-TRI-A-002",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Basic Proportionality Theorem (Thales)",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "In the given figure, ST || QR, then x is",
    "options": [
      "(a) 4",
      "(b) 3",
      "(c) 2",
      "(d) 1"
    ],
    "answer": "(b) 3",
    "solutionSteps": [
      "[1 mark] By Basic Proportionality Theorem (ST || QR): PS/SQ = PT/TR → x/(x+3) = (x+1)/(x+5). Cross-multiply: x(x+5) = (x+1)(x+3) → x² + 5x = x² + 4x + 3 → x = 3. Answer: (b)."
    ],
    "finalAnswer": "(b) 3",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Triangle PQR with point S on side PQ and point T on side PR, with segment ST parallel to base QR. Along PQ: PS = x and SQ = x + 3. Along PR: PT = x + 1 and TR = x + 5."
  },
  {
    "id": "SP-M-2022-TRI-A-003",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Similar Triangles and Ratio of Areas",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "ABDC is a trapezium with ar(∆ABC)/ar(∆DBC) = 4/9, AO = 4 cm then DO is",
    "options": [
      "(a) 2 cm",
      "(b) 3 cm",
      "(c) 9 cm",
      "(d) 8 cm"
    ],
    "answer": "(c) 9 cm",
    "solutionSteps": [
      "[1 mark] Triangles ABC and DBC have the same base BC, so the ratio of their areas equals the ratio of their heights, which equals AO/DO. Thus AO/DO = 4/9 → 4/DO = 4/9 → DO = 9 cm. Answer: (c)."
    ],
    "finalAnswer": "(c) 9 cm",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Trapezium ABDC with diagonals AD and BC intersecting at point O. Triangles ABC and DBC share base BC; AO = 4 cm and DO is to be found, with ar(∆ABC)/ar(∆DBC) = 4/9."
  },
  {
    "id": "SP-M-2022-TRI-B-001",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Basic Proportionality Theorem (Thales)",
    "section": "B",
    "marks": 2,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "In the given figure, EF || AC, BC = 10 cm, AB = 13 cm and EC = 2 cm. Find AF.",
    "options": [],
    "answer": "AF = 2.6 cm",
    "solutionSteps": [
      "[1 mark] In ∆ABC with EF || AC, by Basic Proportionality Theorem: BE/EC = BF/AF. Here BE = BC − EC = 10 − 2 = 8 and BF = AB − AF = 13 − AF, so 8/2 = (13 − AF)/AF.",
      "[1 mark] Cross-multiplying: 8·AF = 2(13 − AF) → 8AF = 26 − 2AF → 10AF = 26 → AF = 2.6 cm."
    ],
    "finalAnswer": "AF = 2.6 cm",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Triangle ABC with point E on BC and point F on AB, with segment EF parallel to AC. BC = 10 cm, AB = 13 cm and EC = 2 cm."
  },
  {
    "id": "SP-M-2022-TRI-D-001",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Basic Proportionality Theorem (Statement, Proof and Application)",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "Prove that if a line is drawn parallel to one side of a triangle, to intersect the other two sides in distinct points, then the other two sides are divided in the same ratio. Using the above theorem, find AD if DE || BC, AE = 8 cm, EC = 2 cm and BD = 6 cm.",
    "options": [],
    "answer": "AD = 24 cm",
    "solutionSteps": [
      "[1 mark] Given: ∆ABC in which DE || BC, DE meeting AB at D and AC at E. To prove: AD/DB = AE/EC. Construction: join BE and CD; draw EF ⊥ AB and DN ⊥ AC.",
      "[1 mark] ar(∆ADE)/ar(∆BDE) = ((½ × AD × EF))/((½ × DB × EF)) = AD/DB …(1).",
      "[1 mark] ar(∆ADE)/ar(∆CDE) = ((½ × AE × DN))/((½ × EC × DN)) = AE/EC …(2).",
      "[1 mark] ∆BDE and ∆CDE are on the same base DE and between the same parallels DE and BC, so ar(∆BDE) = ar(∆CDE) …(3). From (1), (2) and (3): AD/DB = AE/EC. Hence proved.",
      "[1 mark] Application: by the theorem AE/EC = AD/DB → 8/2 = AD/6 → AD = (8 × 6)/2 = 24 cm."
    ],
    "finalAnswer": "AD = 24 cm",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Triangle ABC with D on AB and E on AC such that DE is parallel to BC. For the application part: AE = 8 cm, EC = 2 cm, BD = 6 cm, and AD is to be found."
  }
];
