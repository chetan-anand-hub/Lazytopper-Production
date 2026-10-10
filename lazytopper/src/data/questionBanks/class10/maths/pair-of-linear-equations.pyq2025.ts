import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2024-25 board exam
// Question papers + matched marking schemes (X_MS_041_Mathematics Standard_30-x-x_2024-25) from CBSE
// topicKey: "pair-of-linear-equations"
// Extraction date: 2026-05-25
// PDF tool: pymupdf 1.27.2.3 (0 cid artifacts confirmed via probe)
// Coverage: 9 text-extractable Standard QPs (30/1/x, 30/2/x, 30/3/x); 10 scanned QPs (30/4/x, 30/5/x, 30/6/x, 30(B)) skipped — require OCR; Maths Basic (241) not in scope

export const PAIR_LINEAR_EQUATIONS_PYQ_2025: CanonicalQuestion[] = [
  { id: "PYQ-M-2025-PLE-001", subject: "Maths", topicKey: "pair-of-linear-equations", subtopic: "General", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If x = 1 and y = 2 is a solution of the pair of linear equations 2x − 3y + a = 0 and 2x + 3y − b = 0, then :",
    options: ["a = 2b", "2a = b", "a + 2b = 0", "2a + b = 0"],
    answer: "2a = b",
    solutionSteps: ["Correct option: (b) 2a = b."],
    finalAnswer: "(b) 2a = b",
    ncertRef: "PYQ 30/1/1 Q2", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2025-PLE-002", subject: "Maths", topicKey: "pair-of-linear-equations", subtopic: "General", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Assertion (A) : The pair of linear equations px + 3y + 59 = 0 and 2x + 6y + 118 = 0 will have infinitely many solutions if p = 1. Reason (R): If the pair of linear equations px + 3y + 19 = 0 and 2x + 6y + 157 = 0 has a unique solution, then p ≠ 1.",
    options: ["Both Assertion (A) and Reason (R) are true and Reason (R) is the correct explanation of Assertion (A).", "Both Assertion (A) and Reason (R) are true but Reason (R) is not the correct explanation of Assertion (A).", "Assertion (A) is true but Reason (R) is false.", "Assertion (A) is false but Reason (R) is true."],
    answer: "Both Assertion (A) and Reason (R) are true but Reason (R) is not the correct explanation of Assertion (A).",
    solutionSteps: ["Correct option: (b). A: p/2 = 3/6 = 59/118 gives p = 1, so A is true. R: unique solution needs p/2 ≠ 3/6, i.e. p ≠ 1, so R is true. R concerns a different pair (unique-solution condition), so it does not explain A."],
    finalAnswer: "(b) Both Assertion (A) and Reason (R) are true, but Reason (R) is not the correct explanation of the Assertion (A).",
    ncertRef: "PYQ 30/2/1 Q20", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2025-PLE-003", subject: "Maths", topicKey: "pair-of-linear-equations", subtopic: "Conditions for Inconsistency", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A system of two linear equations in two variables is inconsistent, if the lines in the graph are :",
    options: ["coincident", "parallel", "intersecting at one point", "intersecting at right angles"],
    answer: "parallel",
    solutionSteps: ["Correct option: (b) parallel."],
    finalAnswer: "(b) parallel",
    ncertRef: "PYQ 30/3/2 Q7", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2025-PLE-004", subject: "Maths", topicKey: "pair-of-linear-equations", subtopic: "General", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A school is organizing a grand cultural event to show the talent of its students. To accommodate the guests, the school plans to rent chairs and tables from a local supplier. It finds that the rent for each chair is ₹50 and for each table is ₹200. The school spends ₹30,000 for renting the chairs and tables. Also, the total number of items (chairs and tables) rented is 300.\n(i) Write down the pair of linear equations representing the given information.\n(ii) (a) Find the number of chairs and number of tables rented by the school.\nOR\n(b) If the school wants to spend a maximum of ₹27,000 on 300 items (tables and chairs), then find the number of chairs and tables it can rent.\n(iii) What is the maximum number of tables that can be rented in ₹30,000 if no chairs are rented?",
    answer: "(i) x + y = 300 and 50x + 200y = 30000 (i.e. x + 4y = 600). (ii)(a) 200 chairs and 100 tables. OR (b) 220 chairs and 80 tables. (iii) 150 tables.",
    solutionSteps: ["[1 mark] (i) Let chairs = x, tables = y: x + y = 300 and 50x + 200y = 30000, i.e. x + 4y = 600.", "[2 marks] (ii)(a) Subtracting x + y = 300 from x + 4y = 600: 3y = 300 ⇒ y = 100, x = 200. So 200 chairs and 100 tables.", "OR [2 marks] (b) x + y = 300 and 50x + 200y = 27000, i.e. x + 4y = 540 ⇒ 3y = 240 ⇒ y = 80, x = 220. So 220 chairs and 80 tables.", "[1 mark] (iii) Number of tables = 30000 ÷ 200 = 150, so at most 150 tables can be rented if no chairs are rented."],
    finalAnswer: "(i) x + y = 300, x + 4y = 600; (ii)(a) 200 chairs, 100 tables OR (b) 220 chairs, 80 tables; (iii) 150 tables",
    ncertRef: "PYQ 30/2/1 Q36", isCompetencyBased: true,
    sourceOverride: "others",
  },
];
