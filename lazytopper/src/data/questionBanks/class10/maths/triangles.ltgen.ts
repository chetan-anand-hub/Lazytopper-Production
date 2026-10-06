import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * triangles — LazyTopper-generated CBSE-shaped practice (GEN-THIN-1 PR-1, 2026-10-06).
 *
 * Thin IN concept: "Definitions, examples, counter-examples of similar triangles" (syllabus
 * p5). Each row is modelled on a cited real CBSE / NCERT question (same shape and intent; new
 * figures and numbers). Similarity criteria are only STATED / applied, never proved (p5 limit).
 *
 * Provenance is INTERNAL ONLY (`origin`, `modelledOn`, `questionProvenance`, `shapedFrom`):
 * never rendered. No `pyqYear` / `isPYQ`; ids outside the NCERT / exemplar patterns.
 */
export const TRIANGLES_LT_GENERATED: CanonicalQuestion[] = [
  {
    "id": "LTG-M-TRI-001",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Similar Figures — Definitions and Counter-examples",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Remembering",
    "questionText": "Which of the following pairs of figures are ALWAYS similar?",
    "options": ["Two rectangles", "Two rhombuses", "Two regular hexagons", "Two isosceles triangles"],
    "answer": "Two regular hexagons",
    "solutionSteps": [
      "[1 mark] Two regular hexagons always have all angles equal (120°) and all sides in one common ratio, so they are similar; rectangles, rhombuses and isosceles triangles can differ in side ratio or in angles."
    ],
    "finalAnswer": "Two regular hexagons",
    "isCompetencyBased": false,
    "questionProvenance": "authored",
    "shapedFrom": "TRI-N-NCERT-6-MCQ-001",
    "origin": "lt-generated",
    "modelledOn": "NCERT Class X Ex 6.1 Q1(i)"
  },
  {
    "id": "LTG-M-TRI-002",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Similar Figures — Definitions and Counter-examples",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Remembering",
    "questionText": "Two polygons with the same number of sides are similar if",
    "options": [
      "their corresponding angles are equal",
      "their corresponding sides are proportional",
      "their corresponding angles are equal and their corresponding sides are proportional",
      "they have equal perimeters"
    ],
    "answer": "their corresponding angles are equal and their corresponding sides are proportional",
    "solutionSteps": [
      "[1 mark] By definition, two polygons with the same number of sides are similar when BOTH conditions hold: corresponding angles are equal AND corresponding sides are in the same ratio."
    ],
    "finalAnswer": "their corresponding angles are equal and their corresponding sides are proportional",
    "isCompetencyBased": false,
    "questionProvenance": "authored",
    "shapedFrom": "TRI-N-NCERT-6-VSA-001",
    "origin": "lt-generated",
    "modelledOn": "NCERT Class X Ex 6.1 Q1(iv)"
  },
  {
    "id": "LTG-M-TRI-003",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Similar Figures — Definitions and Counter-examples",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "Which of the following statements is FALSE?",
    "options": [
      "All congruent triangles are similar.",
      "All equilateral triangles are similar.",
      "Any two right triangles are similar.",
      "All squares are similar."
    ],
    "answer": "Any two right triangles are similar.",
    "solutionSteps": [
      "[1 mark] Two right triangles share only the 90° angle; their other angles can differ (e.g. 30°–60°–90° and 45°–45°–90°), so they need not be similar. The other three statements are true."
    ],
    "finalAnswer": "Any two right triangles are similar.",
    "isCompetencyBased": false,
    "questionProvenance": "authored",
    "shapedFrom": "TRI-N-NCERT-6-MCQ-002",
    "origin": "lt-generated",
    "modelledOn": "NCERT Class X Ex 6.1 Q1(iii)"
  },
  {
    "id": "LTG-M-TRI-004",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Similar Figures — Definitions and Counter-examples",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "A square has side 4 cm and a rhombus (which is not a square) has side 8 cm. Which statement is correct?",
    "options": [
      "They are similar because their sides are proportional.",
      "They are similar because all their angles are equal.",
      "They are not similar because their corresponding angles are not equal.",
      "They are not similar because their sides are not proportional."
    ],
    "answer": "They are not similar because their corresponding angles are not equal.",
    "solutionSteps": [
      "[1 mark] All sides are in the ratio 4 : 8 = 1 : 2, so the sides ARE proportional; but a rhombus that is not a square has angles other than 90°, so the corresponding angles are not equal — not similar."
    ],
    "finalAnswer": "They are not similar because their corresponding angles are not equal.",
    "isCompetencyBased": true,
    "questionProvenance": "authored",
    "shapedFrom": "TRI-N-EXMPLR-6-SA-005",
    "origin": "lt-generated",
    "modelledOn": "NCERT Exemplar Class X Ex 6.2 Q6"
  },
  {
    "id": "LTG-M-TRI-005",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Similar Figures — Definitions and Counter-examples",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "Assertion (A): A rectangle of 6 cm × 4 cm and a rectangle of 9 cm × 6 cm are similar.\nReason (R): Two polygons with the same number of sides are similar if their corresponding angles are equal and their corresponding sides are in the same ratio.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "[1 mark] R is the definition of similar polygons (true). For the rectangles all angles are 90° and 6/9 = 4/6 = 2/3, so by R they are similar — A is true and R explains it."
    ],
    "finalAnswer": "Option (A).",
    "isCompetencyBased": true,
    "questionProvenance": "authored",
    "shapedFrom": "TRI-N-NCERT-6-AR-001",
    "origin": "lt-generated",
    "modelledOn": "NCERT Class X Ch 6 Section 6.2 (Similar Figures)"
  },
  {
    "id": "LTG-M-TRI-006",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Similar Figures — Definitions and Counter-examples",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "Assertion (A): Any two isosceles right triangles are similar.\nReason (R): Any two isosceles triangles are similar.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(C) Assertion is true but Reason is false.",
    "solutionSteps": [
      "[1 mark] Every isosceles right triangle has angles 45°, 45°, 90°, so any two are similar (AAA) — A is true. Isosceles triangles with apex angles 40° and 100° are not similar, so R is false."
    ],
    "finalAnswer": "Option (C).",
    "isCompetencyBased": true,
    "questionProvenance": "authored",
    "shapedFrom": "AR-TRI-003",
    "origin": "lt-generated",
    "modelledOn": "CBSE Board 2023 30/2/1 (Assertion–Reason, NCERT Ex 6.1)"
  },
  {
    "id": "LTG-M-TRI-007",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Similar Figures — Definitions and Counter-examples",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Evaluating",
    "questionText": "Is the following statement true? Justify your answer with a counter-example if it is not.\n'Two rhombuses are similar if their corresponding sides are proportional.'",
    "options": [],
    "answer": "False — e.g. a square of side 3 cm and a rhombus of side 3 cm with angles 60° and 120°",
    "solutionSteps": [
      "[1 mark] The statement is false: the sides of any two rhombuses are always proportional (all four sides equal), but their angles need not be equal.",
      "[1 mark] Counter-example: a square of side 3 cm and a rhombus of side 3 cm with angles 60° and 120° have proportional sides (1 : 1) but unequal corresponding angles, so they are not similar."
    ],
    "finalAnswer": "False; a square and a non-square rhombus of equal side are a counter-example.",
    "isCompetencyBased": true,
    "questionProvenance": "authored",
    "shapedFrom": "TRI-N-EXMPLR-6-SA-005",
    "origin": "lt-generated",
    "modelledOn": "NCERT Exemplar Class X Ex 6.2 Q6"
  },
  {
    "id": "LTG-M-TRI-008",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Similar Figures — Definitions and Counter-examples",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "In △ABC, ∠A = 50°, ∠B = 60° and ∠C = 70°. In △PQR, ∠P = 70° and ∠Q = 50°. Are the two triangles similar? If yes, write the similarity statement with the vertices in the correct order.",
    "options": [],
    "answer": "Yes; △ABC ~ △QRP",
    "solutionSteps": [
      "[1 mark] ∠R = 180° − (70° + 50°) = 60°, so the angles of △PQR are 70°, 50°, 60° — the same as those of △ABC; the triangles are similar (AAA).",
      "[1 mark] Matching equal angles: A ↔ Q (50°), B ↔ R (60°), C ↔ P (70°), so △ABC ~ △QRP."
    ],
    "finalAnswer": "Yes, △ABC ~ △QRP.",
    "isCompetencyBased": true,
    "questionProvenance": "authored",
    "shapedFrom": "APQ-M-TRI-002",
    "origin": "lt-generated",
    "modelledOn": "CBSE Additional Practice Questions (Maths Standard) PQ1 Q6"
  },
  {
    "id": "LTG-M-TRI-009",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Similar Figures — Definitions and Counter-examples",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Evaluating",
    "questionText": "A student says, 'A quadrilateral with sides 3 cm, 4 cm, 5 cm, 6 cm and another quadrilateral with sides 6 cm, 8 cm, 10 cm, 12 cm (taken in order) must be similar, because their sides are proportional.' Do you agree? Give a reason.",
    "options": [],
    "answer": "No — for quadrilaterals, proportional sides alone do not guarantee similarity; corresponding angles must also be equal",
    "solutionSteps": [
      "[1 mark] No, I do not agree. The sides are proportional (ratio 1 : 2), but that is only one of the two conditions for similar polygons.",
      "[1 mark] A quadrilateral with given sides can change its angles (it is not rigid), so the corresponding angles need not be equal; without equal angles the quadrilaterals need not be similar."
    ],
    "finalAnswer": "Disagree: proportional sides alone are not enough for quadrilaterals; equal corresponding angles are also needed.",
    "isCompetencyBased": true,
    "questionProvenance": "authored",
    "shapedFrom": "TRI-N-EXMPLR-6-SA-005",
    "origin": "lt-generated",
    "modelledOn": "NCERT Exemplar Class X Ex 6.2 Q6"
  },
  {
    "id": "LTG-M-TRI-010",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Similar Figures — Definitions and Counter-examples",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "State, with reason, whether each pair of figures is similar:\n(i) two circles of radii 2 cm and 5 cm;\n(ii) a rectangle of 4 cm × 6 cm and a square of side 6 cm;\n(iii) two equilateral triangles of sides 3 cm and 7 cm.",
    "options": [],
    "answer": "(i) similar; (ii) not similar; (iii) similar",
    "solutionSteps": [
      "[1 mark] (i) Similar — all circles have the same shape; one is an enlargement of the other (ratio 2 : 5).",
      "[1 mark] (ii) Not similar — all angles are 90° in both, but the sides are not proportional (4/6 ≠ 6/6).",
      "[1 mark] (iii) Similar — every angle of each is 60° and the sides are in the ratio 3 : 7."
    ],
    "finalAnswer": "(i) Similar; (ii) Not similar; (iii) Similar.",
    "isCompetencyBased": false,
    "questionProvenance": "authored",
    "shapedFrom": "TRI-N-NCERT-6-MCQ-001",
    "origin": "lt-generated",
    "modelledOn": "NCERT Class X Ex 6.1 Q1(i)"
  }
];
