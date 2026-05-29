import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * trigonometry — CBSE Sample Papers (P5): Sample Paper Maths Standard 2022.
 * Extracted 2026-05-29 (Sprint 1). topicKey "trigonometry". pyqYear OMITTED (sample papers, not board PYQ).
 */
export const TRIG_SP: CanonicalQuestion[] = [
  {
    "id": "SP-M-2022-TRIG-A-001",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Identities",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If 2 sin²θ − cos²θ = 2, then θ is equal to",
    "options": [
      "(a) 45°",
      "(b) 90°",
      "(c) 60°",
      "(d) 0°"
    ],
    "answer": "(b) 90°",
    "solutionSteps": [
      "[1 mark] 2 sin²θ − cos²θ = 2 → 2 sin²θ − (1 − sin²θ) = 2 → 3 sin²θ = 3 → sin²θ = 1 → sin θ = 1 → θ = 90°. Answer: (b)."
    ],
    "finalAnswer": "(b) 90°",
    "isCompetencyBased": false
  },
  {
    "id": "SP-M-2022-TRIG-A-002",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Identities",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If tan θ + cot θ = 5, then tan²θ + cot²θ is",
    "options": [
      "(a) 24",
      "(b) 25",
      "(c) 10",
      "(d) 23"
    ],
    "answer": "(d) 23",
    "solutionSteps": [
      "[1 mark] (tan θ + cot θ)² = tan²θ + cot²θ + 2(tan θ · cot θ) = tan²θ + cot²θ + 2. So 25 = tan²θ + cot²θ + 2 → tan²θ + cot²θ = 23. Answer: (d)."
    ],
    "finalAnswer": "(d) 23",
    "isCompetencyBased": false
  },
  {
    "id": "SP-M-2022-TRIG-A-003",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Ratios",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If 5 sin θ = 4, then 1/cos θ + 1/cot θ is",
    "options": [
      "(a) 1/3",
      "(b) 3",
      "(c) 2",
      "(d) 6"
    ],
    "answer": "(b) 3",
    "solutionSteps": [
      "[1 mark] sin θ = 4/5 → cos θ = 3/5, tan θ = 4/3. So 1/cos θ + 1/cot θ = sec θ + tan θ = 5/3 + 4/3 = 9/3 = 3. Answer: (b)."
    ],
    "finalAnswer": "(b) 3",
    "isCompetencyBased": false
  },
  {
    "id": "SP-M-2022-TRIG-B-001",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Identities (Proofs)",
    "section": "B",
    "marks": 2,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If x = a cos θ − b sin θ and y = a sin θ + b cos θ, then prove that a² + b² = x² + y².",
    "options": [],
    "answer": "Proved that x² + y² = a² + b²",
    "solutionSteps": [
      "[1 mark] x² + y² = (a cos θ − b sin θ)² + (a sin θ + b cos θ)² = a²cos²θ + b²sin²θ − 2ab sin θ cos θ + a²sin²θ + b²cos²θ + 2ab sin θ cos θ.",
      "[1 mark] The cross terms cancel: = a²(cos²θ + sin²θ) + b²(sin²θ + cos²θ) = a²(1) + b²(1) = a² + b². Hence proved."
    ],
    "finalAnswer": "x² + y² = a² + b² (proved)",
    "isCompetencyBased": false
  },
  {
    "id": "SP-M-2022-TRIG-B-002",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Identities (Proofs)",
    "section": "B",
    "marks": 2,
    "format": "VSA",
    "difficulty": "Hard",
    "bloomSkill": "Applying",
    "questionText": "If tan θ = a/b, then prove that (a sin θ − b cos θ)/(a sin θ + b cos θ) = (a² − b²)/(a² + b²).",
    "options": [],
    "answer": "Proved",
    "solutionSteps": [
      "[1 mark] Divide numerator and denominator of the L.H.S. by b cos θ: (a sin θ − b cos θ)/(a sin θ + b cos θ) = (a tan θ − b)/(a tan θ + b).",
      "[1 mark] Substitute tan θ = a/b: = (a·(a/b) − b)/(a·(a/b) + b) = ((a² − b²)/b)/((a² + b²)/b) = (a² − b²)/(a² + b²) = R.H.S. Hence proved."
    ],
    "finalAnswer": "(a sin θ − b cos θ)/(a sin θ + b cos θ) = (a² − b²)/(a² + b²) (proved)",
    "isCompetencyBased": false
  },
  {
    "id": "SP-M-2022-TRIG-C-001",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Identities (sec and tan)",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "If sec θ − tan θ = x, show that sec θ + tan θ = 1/x and hence find values of cos θ and sin θ.",
    "options": [],
    "answer": "sec θ + tan θ = 1/x; cos θ = 2x/(x² + 1); sin θ = (1 − x²)/(1 + x²)",
    "solutionSteps": [
      "[1 mark] sec θ − tan θ = x …(1). Multiply and divide by (sec θ + tan θ): (sec²θ − tan²θ)/(sec θ + tan θ) = x. Since sec²θ − tan²θ = 1, this gives 1/(sec θ + tan θ) = x, so sec θ + tan θ = 1/x …(2). Hence proved.",
      "[1 mark] Adding (1) and (2): 2 sec θ = x + 1/x → sec θ = (x² + 1)/(2x), so cos θ = 2x/(x² + 1).",
      "[1 mark] sin²θ = 1 − cos²θ = 1 − 4x²/(x² + 1)² = (x² + 1)² − 4x²)/(x² + 1)² = (x² − 1)²/(x² + 1)². Therefore sin θ = (1 − x²)/(1 + x²)."
    ],
    "finalAnswer": "sec θ + tan θ = 1/x; cos θ = 2x/(x² + 1); sin θ = (1 − x²)/(1 + x²)",
    "isCompetencyBased": true
  },
  {
    "id": "SP-M-2022-TRIG-E-001",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Heights and Distances (Angles of Elevation and Depression)",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A group of class X students visited India Gate. The teacher said India Gate is about 138 feet (42 metres) in height. (a) What is the angle formed by the line of sight with the horizontal called when the object being viewed lies below the horizontal level? (b) They want to see the gate at an angle of 60°, so they want to know the distance where they should stand. Find the distance. (c) If the altitude of the Sun is at 60°, then find the height of the vertical tower that will cast a shadow of length 20 m. [OR] What is the angle of elevation if the students are standing at a distance of 42 m away from the monument?",
    "options": [],
    "answer": "(a) Angle of depression; (b) 14√3 m; (c) 20√3 m [OR (c) 45°]",
    "solutionSteps": [
      "[1 mark] (a) When the object viewed lies below the horizontal level, the angle formed by the line of sight with the horizontal is called the angle of depression.",
      "[1 mark] (b) tan 60° = height/distance = 42/d → √3 = 42/d → d = 42/√3 = (42√3)/3 = 14√3 m.",
      "[2 marks] (c) For the tower with shadow 20 m and sun's altitude 60°: tan 60° = h/20 → √3 = h/20 → h = 20√3 m.",
      "[2 marks] (OR) tan θ = height/distance = 42/42 = 1 → θ = 45°. The angle of elevation is 45°."
    ],
    "finalAnswer": "(a) Angle of depression; (b) 14√3 m; (c) 20√3 m [OR 45°]",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "India Gate represented as a vertical line segment AC of height 42 m standing on horizontal ground. An observer stands at point B on the ground at horizontal distance d from the base; the line of sight from B to the top A makes an angle of 60° with the horizontal."
  }
];
