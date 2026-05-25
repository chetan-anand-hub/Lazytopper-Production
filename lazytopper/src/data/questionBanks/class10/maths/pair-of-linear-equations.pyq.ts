import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2022-23 board exam
// Question papers + matched marking schemes (MS 041_30-x-x Mathematics 2022-23) from CBSE
// topicKey: "pair-of-linear-equations"
// Extraction date: 2026-05-25
// PDF tool: pymupdf 1.27.2.3 (0 cid artifacts confirmed via probe)
// Coverage: 9 text-extractable QPs (30/2/x, 30/4/x, 30/5/x); 6 scanned QPs (30/1/x, 30/6/x) and 30-B-5 skipped — require OCR

export const PAIR_LINEAR_EQUATIONS_PYQ: CanonicalQuestion[] = [
  { id: "PYQ-M-PLE-001", subject: "Maths", topicKey: "pair-of-linear-equations", subtopic: "Graphical Method", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The pair of equations x = a and y = b graphically represents lines which are :",
    options: ["parallel", "intersecting at (b, a)", "coincident", "intersecting at (a, b)"],
    answer: "intersecting at (a, b)",
    solutionSteps: ["Correct option: (d) intersecting at (a, b)."],
    finalAnswer: "(d) intersecting at (a, b)",
    ncertRef: "PYQ 30/2/1 Q8", isCompetencyBased: true,
    pyqYear: "2023", pyqSet: "1" },
  { id: "PYQ-M-PLE-002", subject: "Maths", topicKey: "pair-of-linear-equations", subtopic: "General", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The pair of linear equations 2x = 5y + 6 and 15y = 6x – 18 represents two lines which are :",
    options: ["intersecting", "parallel", "coincident", "either intersecting or parallel"],
    answer: "Coincident",
    solutionSteps: ["Correct option: (c) Coincident."],
    finalAnswer: "(c) Coincident",
    ncertRef: "PYQ 30/4/1 Q7", isCompetencyBased: true,
    pyqYear: "2023", pyqSet: "1" },
  { id: "PYQ-M-PLE-003", subject: "Maths", topicKey: "pair-of-linear-equations", subtopic: "Conditions for Parallel Lines", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The pair of equations ax + 2y = 9 and 3x + by = 18 represent parallel lines, where a, b are integers, if :",
    options: ["a = b", "3a = 2b", "2a = 3b", "ab ="],
    answer: "ab = 6",
    solutionSteps: ["Correct option: (d) ab = 6."],
    finalAnswer: "(d) ab = 6",
    ncertRef: "PYQ 30/5/1 Q2", isCompetencyBased: true,
    pyqYear: "2023", pyqSet: "1" },
];
