// This file contains append‑only predicted question additions for Mathematics.
// It expands the existing predicted questions to align with CBSE 2025–26 competency focus.
// Note: Do not overwrite existing arrays; import and merge as needed in the main engine.

import type { PredictedQuestion } from "./predictedQuestions";

export const predictedQuestionsAdditions: PredictedQuestion[] = [
  // ===== Pair of Linear Equations (must‑crack) =====
  {
    id: "2026-PLE-MCQ-07",
    topicKey: "Pair of Linear Equations",
    subtopic: "Graphical Solutions/Nature",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Analysing",
    questionText:
      "For the system of equations 4x − 5y = 1 and 8x − 10y = 3, choose the correct statement about its solution set:",
    options: [
      "Exactly one solution",
      "Infinitely many solutions",
      "No solution",
      "It depends on values of x and y",
    ],
    answer: "No solution",
    explanation:
      "Doubling the first equation gives 8x − 10y = 2, which conflicts with 8x − 10y = 3. The lines are parallel and never meet.",
  },
  {
    id: "2026-PLE-MCQ-08",
    topicKey: "Pair of Linear Equations",
    subtopic: "Algebraic Solution Methods",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Applying",
    questionText:
      "Solve the system x + y = 5 and 2x + 3y = 12. What is the value of x?",
    options: ["1", "2", "3", "4"],
    answer: "3",
    explanation:
      "From x + y = 5 we get y = 5 − x. Substitute into 2x + 3(5 − x) = 12 and solve for x = 3.",
  },
  {
    id: "2026-PLE-SA-09",
    topicKey: "Pair of Linear Equations",
    subtopic: "Word & Application Problems",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A taxi service charges ₹10 per kilometre for the first 5 km and ₹8 per kilometre thereafter. A passenger pays ₹90 for a ride of 10 km. Form a pair of linear equations to find the kilometres charged at each rate and solve them.",
    answer: "5 km at ₹10 per km and 5 km at ₹8 per km.",
    explanation:
      "Let x and y be the kilometres charged at ₹10 and ₹8 respectively. Then x + y = 10 (total distance) and 10x + 8y = 90 (total fare). Solving gives x = 5 and y = 5.",
    solutionSteps: [
      "Let x km be charged at ₹10 and y km at ₹8.",
      "Form equations: x + y = 10 and 10x + 8y = 90.",
      "Subtract 8 times the first equation from the second: 2x = 10 ⇒ x = 5.",
      "Hence y = 5 from x + y = 10.",
    ],
    strategyHint:
      "Translate the charges into equations and use elimination to solve.",
  },
  {
    id: "2026-PLE-SA-10",
    topicKey: "Pair of Linear Equations",
    subtopic: "Algebraic Solution Methods",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "Solve the following pair of equations using substitution: 3x + 2y = 12 and 2x + y = 7.",
    answer: "x = 2, y = 3.",
    explanation:
      "From 2x + y = 7 we get y = 7 − 2x. Substitute into 3x + 2y = 12 to obtain 3x + 2(7 − 2x) = 12 ⇒ 3x + 14 − 4x = 12 ⇒ −x = −2 ⇒ x = 2 and y = 3.",
    solutionSteps: [
      "Make y the subject: y = 7 − 2x.",
      "Substitute into 3x + 2y = 12.",
      "Simplify and solve for x.",
      "Back‑substitute to find y.",
    ],
  },
  {
    id: "2026-PLE-AR-11",
    topicKey: "Pair of Linear Equations",
    subtopic: "Graphical Solutions/Nature",
    kind: "Assertion-Reasoning",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Assertion (A): The pair of equations 3x − 2y + 4 = 0 and 9x − 6y + 12 = 0 has infinitely many solutions.\nReason (R): For two linear equations a₁x + b₁y + c₁ = 0 and a₂x + b₂y + c₂ = 0, the condition for infinitely many solutions is \\((\\frac{a₁}{a₂} = \\frac{b₁}{b₂} = \\frac{c₁}{c₂})\\).",
    answer:
      "Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    explanation:
      "The second equation is a multiple of the first, so both represent the same line, giving infinitely many solutions. The stated condition correctly identifies coincident lines.",
  },
  {
    id: "2026-PLE-CASE-12",
    topicKey: "Pair of Linear Equations",
    subtopic: "Word & Application Problems",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Two inlet pipes A and B can fill a water tank in different times, and there is a leak at the bottom. Pipe A alone can fill the tank in 10 hours. When both pipes A and B are opened together, they fill the tank in 6 hours. However, because of a leak, the tank actually takes 8 hours to fill when both pipes are open.\n(a) Write two linear equations in x and y if x hours is the time taken by pipe B alone to fill the tank and y hours is the time taken by the leak alone to empty it.\n(b) Solve the equations to find x and y.",
    answer:
      "Pipe B alone can fill the tank in 15 hours and the leak alone would empty it in 24 hours.",
    explanation:
      "Let the filling rates be 1/10, 1/x and the leak emptying rate be 1/y per hour. Without the leak: 1/10 + 1/x = 1/6. With the leak: 1/10 + 1/x − 1/y = 1/8. Solving gives 1/x = 1/15 and 1/y = 1/24.",
    solutionSteps: [
      "Assign rates: pipe A = 1/10, pipe B = 1/x, leak = 1/y.",
      "Without leak: 1/10 + 1/x = 1/6.",
      "With leak: 1/10 + 1/x − 1/y = 1/8.",
      "Subtract the first equation from the second to eliminate 1/x and solve for 1/y.",
      "Back‑substitute to find 1/x.",
    ],
    strategyHint: "Convert times to rates and form equations for the combined rates.",
  },

  // ===== Quadratic Equations (must‑crack) =====
  {
    id: "2026-QE-MCQ-07",
    topicKey: "Quadratic Equations",
    subtopic: "Nature of Roots (Discriminant)",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "For the quadratic equation 2x² − 3x + 5 = 0, what is the nature of its roots?",
    options: [
      "Real and distinct",
      "Real and equal",
      "No real roots",
      "Imaginary and equal",
    ],
    answer: "No real roots",
    explanation:
      "Discriminant D = (−3)² − 4·2·5 = 9 − 40 = −31 < 0; therefore the roots are not real.",
  },
  {
    id: "2026-QE-MCQ-08",
    topicKey: "Quadratic Equations",
    subtopic: "Coefficient–root Relations",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "For the equation x² − 7x + 10 = 0, what is the product of its roots?",
    options: ["7", "10", "−10", "−7"],
    answer: "10",
    explanation:
      "For ax² + bx + c = 0, product of roots = c/a. Here c = 10 and a = 1, so the product is 10.",
  },
  {
    id: "2026-QE-SA-09",
    topicKey: "Quadratic Equations",
    subtopic: "Algebraic Solution",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Solve the quadratic equation 3t² − 2t − 1 = 0 using the quadratic formula.",
    answer: "t = 1 or t = −1/3.",
    explanation:
      "Identify a = 3, b = −2, c = −1. Discriminant D = b² − 4ac = 16. Using t = [−b ± √D]/(2a) gives t = [2 ± 4]/6 ⇒ t = 1 or −1/3.",
    solutionSteps: [
      "Compute D = (−2)² − 4·3·(−1) = 16.",
      "Apply t = [−(−2) ± √16]/(2·3) = [2 ± 4]/6.",
      "Simplify to get t = 1 or t = −1/3.",
    ],
    strategyHint:
      "Apply the quadratic formula when factorisation is not obvious.",
  },
  {
    id: "2026-QE-SA-10",
    topicKey: "Quadratic Equations",
    subtopic: "Word/Application Problems",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A farmer wishes to fence a rectangular field such that its length is 20 m more than its breadth. If the area of the field is 300 m², form a quadratic equation in the breadth and find the dimensions of the field.",
    answer: "Breadth = 10 m and length = 30 m.",
    explanation:
      "Let breadth = x m, then length = x + 20. Area = x(x + 20) = 300 ⇒ x² + 20x − 300 = 0. Solving gives x = 10 (positive root), hence length = 30 m.",
    solutionSteps: [
      "Let breadth be x and length be x + 20.",
      "Write x(x + 20) = 300 to model the area.",
      "Rearrange to x² + 20x − 300 = 0.",
      "Solve to obtain x = 10 (positive value) and length = x + 20 = 30.",
    ],
    strategyHint:
      "Translate the statement into algebra and solve the resulting quadratic.",
  },
  {
    id: "2026-QE-AR-11",
    topicKey: "Quadratic Equations",
    subtopic: "Nature of Roots (Discriminant)",
    kind: "Assertion-Reasoning",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Assertion (A): The quadratic equation x² + 4x + 5 = 0 has no real roots.\nReason (R): A quadratic equation ax² + bx + c = 0 has real roots only when the discriminant b² − 4ac is non‑negative.",
    answer:
      "Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    explanation:
      "For x² + 4x + 5, D = 16 − 20 = −4 < 0, so there are no real roots. The discriminant test exactly determines whether roots are real.",
  },
  {
    id: "2026-QE-CASE-12",
    topicKey: "Quadratic Equations",
    subtopic: "Word/Application Problems",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A rectangular garden measures 40 m by 30 m. A path of uniform width runs around the inside of the garden. The area of the path is 476 m². Let x metres be the width of the path.\n(a) Write a quadratic equation in x that models the situation.\n(b) Solve the equation to find the width of the path (give your answer correct to two decimal places).",
    answer:
      "The quadratic equation is 4x² − 140x + 476 = 0 and the path is approximately 3.81 m wide.",
    explanation:
      "Area of garden = 40 × 30 = 1200 m²; area of inner rectangle = (40 − 2x)(30 − 2x). Difference = 476 ⇒ 1200 − (40 − 2x)(30 − 2x) = 476. Simplifying yields 4x² − 140x + 476 = 0. Solving gives x ≈ 3.81 m.",
    solutionSteps: [
      "Let inner dimensions be (40 − 2x) and (30 − 2x).",
      "Set 40×30 − (40 − 2x)(30 − 2x) = 476.",
      "Expand and rearrange to 4x² − 140x + 476 = 0.",
      "Use the quadratic formula: x = [140 ± √(140² − 4·4·476)]/(8).",
      "Choose the positive root and round to two decimal places (≈ 3.81 m).",
    ],
    strategyHint:
      "Express areas in terms of x and apply the quadratic formula.",
  },

  // ===== Triangles (must‑crack) =====
  {
    id: "2026-TRI-MCQ-05",
    topicKey: "Triangles",
    subtopic: "Similarity Criteria",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "If ΔABC ∼ ΔDEF with \\(\\\\frac{AB}{DE} = \\\\frac{AC}{DF})\\, which of the following is true?",
    options: ["∠A = ∠D", "∠A = ∠E", "∠A = ∠F", "No relation"],
    answer: "∠A = ∠D",
    explanation:
      "The pairs AB:DE and AC:DF correspond, so vertex A matches with D. Therefore ∠A = ∠D.",
  },
  {
    id: "2026-TRI-SA-07",
    topicKey: "Triangles",
    subtopic: "BPT (Basic Proportionality Theorem)",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "In ΔABC, DE ∥ BC intersects AB at D and AC at E. If AD = 3 cm, DB = 2 cm and AC = 10 cm, find the length of AE.",
    answer: "AE = 6 cm.",
    explanation:
      "By BPT, AD/DB = AE/EC. Let AE = x. Then EC = 10 − x. So 3/2 = x/(10 − x) ⇒ 30 − 3x = 2x ⇒ x = 6 cm.",
    solutionSteps: [
      "Let AE = x ⇒ EC = 10 − x.",
      "Apply BPT: 3/2 = x/(10 − x).",
      "Cross‑multiply and solve for x.",
    ],
    strategyHint: "Relate the segments using the Basic Proportionality Theorem.",
  },
  {
    id: "2026-TRI-AR-09",
    topicKey: "Triangles",
    subtopic: "Similarity Criteria",
    kind: "Assertion-Reasoning",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Assertion (A): If two sides of one triangle are proportional to two sides of another triangle and the included angles are equal, the triangles are similar.\nReason (R): By the SAS similarity criterion, two triangles are similar when the ratio of two pairs of corresponding sides is equal and the included angles are equal.",
    answer:
      "Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    explanation:
      "The statement describes exactly the SAS criterion: two sides in proportion and the included angle equal implies similarity.",
  },
  // ===== Trigonometry (must‑crack) =====
  {
    id: "2026-TRIG-MCQ-09",
    topicKey: "Trigonometry",
    subtopic: "Trig Ratios/Values",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "Evaluate sin 30° × cos 60° + tan 45°.",
    options: ["1/2", "1", "5/4", "3/4"],
    answer: "5/4",
    explanation:
      "sin 30° = 1/2 and cos 60° = 1/2, so their product is 1/4. tan 45° = 1; thus 1/4 + 1 = 5/4.",
  },
  {
    id: "2026-TRIG-MCQ-10",
    topicKey: "Trigonometry",
    subtopic: "Trig Ratios/Values",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "If tan θ = 3/4 for an acute angle θ, then sec θ equals:",
    options: ["5/4", "4/3", "5/3", "3/5"],
    answer: "5/4",
    explanation:
      "sec² θ = 1 + tan² θ = 1 + 9/16 = 25/16 ⇒ sec θ = 5/4.",
  },
  {
    id: "2026-TRIG-SA-11",
    topicKey: "Trigonometry",
    subtopic: "Trig Identities/Proofs",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Prove that \\(\\\\frac{1 - \\\\cos θ}{1 + \\\\cos θ} = \\\\tan^2\\\\frac{θ}{2}\\).",
    answer:
      "Using 1 − cos θ = 2 sin²(θ/2) and 1 + cos θ = 2 cos²(θ/2), the given expression simplifies to tan²(θ/2).",
    explanation:
      "Express the numerator and denominator using the half‑angle identities. Cancelling factors gives tan²(θ/2).",
    solutionSteps: [
      "Recall: 1 − cos θ = 2 sin²(θ/2) and 1 + cos θ = 2 cos²(θ/2).",
      "Substitute into the fraction.",
      "Simplify to obtain tan²(θ/2).",
    ],
    strategyHint:
      "Use half‑angle identities for 1 ± cos θ.",
  },
  {
    id: "2026-TRIG-SA-12",
    topicKey: "Trigonometry",
    subtopic: "Application/Heights & Distances",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "From the top of a 15 m high tower, the angle of depression of a car on the road is 30°. Find the distance of the car from the foot of the tower. (Take \\(\\\\sqrt{3} = 1.732\\).",
    answer: "Approximately 25.98 m.",
    explanation:
      "Let the horizontal distance be d. tan 30° = 15/d ⇒ 1/√3 = 15/d ⇒ d = 15√3 ≈ 25.98 m.",
    solutionSteps: [
      "Draw a right triangle with height 15 m and base d.",
      "Use tan 30° = 1/√3 = 15/d.",
      "Solve for d = 15√3.",
      "Substitute √3 = 1.732 to find d ≈ 25.98 m.",
    ],
    strategyHint:
      "Relate the angle of depression to the angle of elevation and apply the tangent ratio.",
  },
  {
    id: "2026-TRIG-AR-13",
    topicKey: "Trigonometry",
    subtopic: "Trig Ratios/Values",
    kind: "Assertion-Reasoning",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Assertion (A): sin(90° − θ) = cos θ for all θ.\nReason (R): In a right triangle, exchanging the roles of the adjacent and opposite sides for complementary angles gives the cofunction identity.",
    answer:
      "Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    explanation:
      "The cofunction identity follows from considering complementary angles in a right triangle. The reason clearly explains the assertion.",
  },
  {
    id: "2026-TRIG-CASE-14",
    topicKey: "Trigonometry",
    subtopic: "Application/Heights & Distances",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A vertical pole 12 m high casts a shadow 4√3 m long on level ground. At the same time, a nearby tower casts a shadow 12√3 m long.\n(a) Find the angle of elevation of the Sun.\n(b) Calculate the height of the tower. (Take \\(\\\\sqrt{3} = 1.732\\).",
    answer:
      "Angle of elevation of the Sun = 60°; height of the tower = 36 m.",
    explanation:
      "For the pole: tan θ = 12/(4√3) = √3 ⇒ θ = 60°. For the tower with shadow 12√3 m, tan 60° = √3 = height/(12√3) ⇒ height = 12√3 × √3 = 36 m.",
    solutionSteps: [
      "Compute tan θ = 12/(4√3) = √3 and deduce θ = 60°.",
      "Let the tower height be h. Write tan 60° = √3 = h/(12√3).",
      "Solve: h = 12√3 × √3 = 36 m.",
    ],
    strategyHint:
      "Use the same angle of elevation for both objects since observations are simultaneous.",
  },

  // ===== Statistics (must‑crack) =====
  {
    id: "2026-STAT-MCQ-07",
    topicKey: "Statistics",
    subtopic: "Mode of Grouped Data",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "Given a frequency distribution with class intervals 0–10 (5), 10–20 (10) and 20–30 (15), the modal class is:",
    options: ["0–10", "10–20", "20–30", "Cannot be determined"],
    answer: "20–30",
    explanation:
      "The modal class has the greatest frequency. Here 20–30 has the highest frequency (15).",
  },
  {
    id: "2026-STAT-MCQ-08",
    topicKey: "Statistics",
    subtopic: "Median of Grouped Data",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "For the same distribution (0–10: 5, 10–20: 10, 20–30: 15), the median class is:",
    options: ["0–10", "10–20", "20–30", "Cannot be determined"],
    answer: "10–20",
    explanation:
      "Total frequency is 30. The median (15th observation) lies in the class whose cumulative frequency reaches at least 15: the class 10–20.",
  },
  {
    id: "2026-STAT-SA-09",
    topicKey: "Statistics",
    subtopic: "Mean (Step Deviation)",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Calculate the mean of the following data: values 2, 4, 6 and 8 have frequencies 3, 5, 4 and 2 respectively.",
    answer: "Mean ≈ 4.71.",
    explanation:
      "Σf = 14 and Σf x = 2·3 + 4·5 + 6·4 + 8·2 = 66. Mean = 66/14 ≈ 4.71.",
    solutionSteps: [
      "Total frequency = 3 + 5 + 4 + 2 = 14.",
      "Sum of products = 6 + 20 + 24 + 16 = 66.",
      "Mean = 66 ÷ 14 ≈ 4.71.",
    ],
    strategyHint:
      "Use the direct formula \\(\\\\bar{x} = \\\\frac{\\\\Sigma f_i x_i}{\\\\Sigma f_i}\\).",
  },
  {
    id: "2026-STAT-SA-10",
    topicKey: "Statistics",
    subtopic: "Mean (Step Deviation)",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Use the step deviation method to compute the mean of the following grouped data:\nClass: 0–10, 10–20, 20–30, 30–40\nFrequency: 4, 6, 10, 8.",
    answer: "Mean ≈ 22.86.",
    explanation:
      "Midpoints: 5, 15, 25, 35; assumed mean A = 25; class width h = 10. d_i = (m_i − 25)/10: −2, −1, 0, 1. Σfd = −6 and Σf = 28. Mean = 25 + (−6/28) × 10 ≈ 22.86.",
    solutionSteps: [
      "List midpoints and choose A = 25, h = 10.",
      "Compute deviations and multiply by frequencies.",
      "Find Σfd = −6 and Σf = 28.",
      "Substitute into \\(\\\\bar{x} = A + \\\\frac{\\\\Sigma fd}{\\\\Sigma f} × h\\).",
    ],
    strategyHint:
      "Choose a convenient assumed mean to simplify calculations.",
  },
  {
    id: "2026-STAT-AR-11",
    topicKey: "Statistics",
    subtopic: "Mean (Step Deviation)",
    kind: "Assertion-Reasoning",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Assertion (A): In any dataset, the mode is the value with the highest frequency.\nReason (R): For a grouped frequency distribution, the class interval with the greatest frequency is called the modal class.",
    answer:
      "Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    explanation:
      "Mode represents the most frequent observation. In grouped data, the class with highest frequency is termed the modal class.",
  },
  {
    id: "2026-STAT-CASE-12",
    topicKey: "Statistics",
    subtopic: "Mean (Step Deviation)",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A company records the daily wages of its 20 workers as follows:\nClass (₹): 100–120, 120–140, 140–160, 160–180, 180–200\nFrequency: 2, 5, 8, 3, 2\n(a) Identify the modal class.\n(b) Estimate the mean daily wage using the step‑deviation method.\n(c) Comment on the wage distribution.",
    answer:
      "(a) The modal class is 140–160. (b) Mean ≈ ₹148. (c) Wages cluster around the middle class; most workers earn between ₹140 and ₹160, indicating moderate dispersion.",
    explanation:
      "The highest frequency is 8 in the 140–160 class. Taking A = 150 and h = 20 yields Σfd = −2 and Σf = 20, so mean = 150 + (−2/20) × 20 = 148. The distribution peaks in the middle class.",
    solutionSteps: [
      "Midpoints: 110, 130, 150, 170, 190; assumed mean A = 150; h = 20.",
      "Calculate d_i and Σfd = −2; Σf = 20.",
      "Mean = 150 + (−2/20) × 20 = 148.",
      "Identify modal class as the one with highest frequency (140–160).",
      "Discuss that most frequencies lie near the middle class.",
    ],
    strategyHint:
      "Apply step‑deviation and interpret both mean and modal class.",
  },

  // ===== Probability (must‑crack) =====
  {
    id: "2026-PROB-MCQ-09",
    topicKey: "Probability",
    subtopic: "Single Event Probability",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "A fair coin is tossed once. What is the probability of getting a tail?",
    options: ["0", "1/2", "1", "2"],
    answer: "1/2",
    explanation:
      "There are two equally likely outcomes (H or T). Only one is a tail, so probability = 1/2.",
  },
  {
    id: "2026-PROB-MCQ-10",
    topicKey: "Probability",
    subtopic: "Single Event Probability",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "A fair die is rolled once. What is the probability of getting a prime number?",
    options: ["1/3", "1/2", "2/3", "1/6"],
    answer: "1/2",
    explanation:
      "Prime outcomes on a die are 2, 3 and 5. There are 3 favourable outcomes out of 6, so the probability is 3/6 = 1/2.",
  },
  {
    id: "2026-PROB-SA-11",
    topicKey: "Probability",
    subtopic: "Single Event Probability",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A bag contains 3 red balls, 5 white balls and 7 blue balls. A ball is drawn at random. Find the probability that it is (i) white, (ii) not red.",
    answer: "(i) 1/3, (ii) 4/5.",
    explanation:
      "Total balls = 15. (i) White balls = 5 ⇒ probability = 5/15 = 1/3. (ii) Not red = 5 + 7 = 12 ⇒ probability = 12/15 = 4/5.",
    solutionSteps: [
      "Compute total balls = 3 + 5 + 7 = 15.",
      "For (i), favourable outcomes = 5 ⇒ probability = 5/15.",
      "For (ii), favourable outcomes = 12 ⇒ probability = 12/15.",
    ],
    strategyHint:
      "Count favourable outcomes and divide by total outcomes.",
  },
  {
    id: "2026-PROB-SA-12",
    topicKey: "Probability",
    subtopic: "Combined/Word Problem Probability",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Two coins are tossed simultaneously. Find the probability of getting (i) exactly one head, (ii) at most one head, and (iii) at least one head.",
    answer: "(i) 1/2, (ii) 3/4, (iii) 3/4.",
    explanation:
      "Sample space = {HH, HT, TH, TT}. Exactly one head in HT or TH: probability = 2/4. At most one head includes HT, TH, TT: probability = 3/4. At least one head includes HH, HT, TH: probability = 3/4.",
    solutionSteps: [
      "List all possible outcomes.",
      "Count favourable outcomes for each event.",
      "Divide by total outcomes (4).",
    ],
    strategyHint:
      "Enumerate outcomes for two coin tosses and classify them by number of heads.",
  },
  {
    id: "2026-PROB-AR-13",
    topicKey: "Probability",
    subtopic: "Probability Axioms",
    kind: "Assertion-Reasoning",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Assertion (A): The probability of an event always lies between 0 and 1.\nReason (R): The number of favourable outcomes for an event cannot exceed the total number of equally likely outcomes.",
    answer:
      "Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    explanation:
      "An event's probability is a ratio of non-negative counts to total outcomes and therefore cannot exceed 1. The reason explains why the ratio is bounded.",
  },
  {
    id: "2026-PROB-CASE-14",
    topicKey: "Probability",
    subtopic: "Combined/Word Problem Probability",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A box contains 6 green pens, 4 blue pens and 5 black pens. Two pens are drawn at random one after the other without replacement. Find the probability that:\n(a) both pens are green,\n(b) one pen is green and the other is blue,\n(c) none of the pens is black.",
    answer: "(a) 1/7, (b) 8/35, (c) 3/7.",
    explanation:
      "Total pens = 15. (a) P(GG) = (6/15) x (5/14) = 1/7. (b) P(GB or BG) = (6/15)(4/14) + (4/15)(6/14) = 8/35. (c) Non-black pens = 10 => P(both non-black) = (10/15) x (9/14) = 3/7.",
    solutionSteps: [
      "Count total pens and identify favourable outcomes for each event.",
      "Calculate probabilities sequentially without replacement.",
      "Sum probabilities for (b) where order matters.",
    ],
    strategyHint:
      "Adjust the denominator after the first draw and consider both orders for mixed draws.",
  },

  // ===== Real Numbers (high-roi) =====
  {
    id: "2026-RN-MCQ-03",
    topicKey: "Real Numbers",
    subtopic: "Euclid's Division Algorithm",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText: "The HCF of 42 and 56 is:",
    options: ["7", "8", "14", "6"],
    answer: "14",
    explanation:
      "Applying Euclid's algorithm: 56 = 42 x 1 + 14 and 42 = 14 x 3 + 0, giving HCF = 14.",
  },
  {
    id: "2026-RN-MCQ-04",
    topicKey: "Real Numbers",
    subtopic: "Decimal Expansions",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "Which of the following rational numbers has a terminating decimal expansion?",
    options: ["2/15", "3/7", "14/125", "1/11"],
    answer: "14/125",
    explanation:
      "A fraction has a terminating decimal expansion when its denominator (in lowest terms) has only the prime factors 2 or 5. 125 = 5^3, so 14/125 qualifies.",
  },
  {
    id: "2026-RN-SA-05",
    topicKey: "Real Numbers",
    subtopic: "Euclid's Division Algorithm",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Use Euclid's division lemma to find the HCF of 135 and 225 and express it as a linear combination of 135 and 225.",
    answer: "HCF = 45 and 45 = 2 x 135 - 225.",
    explanation:
      "Applying Euclid's algorithm: 225 = 135 x 1 + 90; 135 = 90 x 1 + 45; 90 = 45 x 2 + 0, so HCF = 45. Back-substituting gives 45 = 135 - (225 - 135) = 2 x 135 - 225.",
    solutionSteps: [
      "Perform Euclid's algorithm to find the HCF.",
      "Express the remainder relation: 45 = 135 - 90 and 90 = 225 - 135.",
      "Substitute to get 45 = 2 x 135 - 225.",
    ],
    strategyHint:
      "After finding the HCF, work backwards to express it as a linear combination.",
  },
  {
    id: "2026-RN-AR-06",
    topicKey: "Real Numbers",
    subtopic: "Irrational Numbers & Proofs",
    kind: "Assertion-Reasoning",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Assertion (A): \\(\\\\sqrt{5}\\) is an irrational number.\nReason (R): The square root of any prime number is irrational.",
    answer:
      "Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    explanation:
      "Prime factors of 5 cannot be paired to form a rational square. The Fundamental Theorem of Arithmetic shows that √p is irrational for any prime p.",
  },

  // ===== Polynomials (high‑roi) =====
  {
    id: "2026-POLY-MCQ-05",
    topicKey: "Polynomials",
    subtopic: "Coefficient–root Relations",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "If one zero of the cubic polynomial f(x) = x³ − 4x² + 3x is 0, what is the sum of the other two zeroes?",
    options: ["1", "3", "4", "5"],
    answer: "4",
    explanation:
      "Sum of all zeroes = coefficient of x² with sign changed = 4. One zero is 0, so the sum of the remaining two zeroes is 4.",
  },
  {
    id: "2026-POLY-MCQ-06",
    topicKey: "Polynomials",
    subtopic: "Factor Theorem",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "Which of the following is a factor of the polynomial x³ + x² − 4x − 4?",
    options: ["x − 1", "x + 1", "x − 2", "x + 2"],
    answer: "x + 1",
    explanation:
      "Substitute x = −1: (−1)³ + (−1)² − 4(−1) − 4 = −1 + 1 + 4 − 4 = 0, so x + 1 is a factor by the Factor Theorem.",
  },
  {
    id: "2026-POLY-SA-07",
    topicKey: "Polynomials",
    subtopic: "Zeros & Factorisation",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Divide the polynomial p(x) = x⁴ − 5x³ + 7x − 3 by x² − 2 and find the quotient and remainder.",
    answer: "Quotient = x² − 5x + 2; Remainder = 1 − 3x.",
    explanation:
      "Perform polynomial long division. After dividing term by term, the quotient is x² − 5x + 2 and the remainder is 1 − 3x.",
    solutionSteps: [
      "Arrange p(x) and the divisor in descending powers.",
      "Divide the highest degree term and subtract repeatedly.",
      "Stop when the degree of the remainder is less than that of the divisor.",
    ],
    strategyHint:
      "Align like terms carefully during polynomial division.",
  },
  {
    id: "2026-POLY-CASE-08",
    topicKey: "Polynomials",
    subtopic: "Zeros & Factorisation",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "The polynomial f(x) = x³ − 6x² + 11x − 6 models the number of organisms in a culture dish (in millions) after x hours.\n(a) Factorise f(x) completely.\n(b) Find the times at which the population becomes zero.\n(c) Discuss which of these times are meaningful.",
    answer:
      "(a) f(x) = (x − 1)(x − 2)(x − 3). (b) The roots are x = 1, 2 and 3 hours. (c) All three roots are positive and correspond to possible times when the population could become zero.",
    explanation:
      "By testing small integers, f(1) = f(2) = f(3) = 0. Factorising gives (x − 1)(x − 2)(x − 3). The positive roots represent times at which the population would be zero; negative times are not meaningful.",
    solutionSteps: [
      "Evaluate f(1), f(2) and f(3) to find zeros.",
      "Use synthetic division or repeated factorisation to obtain f(x) = (x − 1)(x − 2)(x − 3).",
      "Interpret the positive roots in the context of time.",
    ],
    strategyHint:
      "Test small integer values to identify factors and relate roots to real‑world contexts.",
  },

  // ===== Arithmetic Progression (high‑roi) =====
  {
    id: "2026-AP-MCQ-05",
    topicKey: "Arithmetic Progression",
    subtopic: "nth Term",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Applying",
    questionText:
      "What is the 10th term of the arithmetic progression 3, 8, 13, …?",
    options: ["48", "45", "50", "53"],
    answer: "48",
    explanation:
      "First term a = 3 and common difference d = 5. 10th term = a + 9d = 3 + 45 = 48.",
  },
  {
    id: "2026-AP-MCQ-06",
    topicKey: "Arithmetic Progression",
    subtopic: "Sum of n Terms",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "Find the sum of the first 20 terms of the arithmetic progression 2, 5, 8, …. (Assume n ≥ 1).",
    options: ["400", "610", "620", "590"],
    answer: "610",
    explanation:
      "a = 2, d = 3. Sₙ = n/2[2a + (n − 1)d] ⇒ S₂₀ = 10[4 + 57] = 610.",
  },
  {
    id: "2026-AP-SA-07",
    topicKey: "Arithmetic Progression",
    subtopic: "nth Term",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "In an arithmetic progression, the 5th term is 22 and the 13th term is 46. Find the first term and the common difference.",
    answer: "First term = 10, common difference = 3.",
    explanation:
      "Let a be the first term and d be the common difference. Then a + 4d = 22 and a + 12d = 46. Subtracting gives 8d = 24 ⇒ d = 3; substituting back gives a = 10.",
    solutionSteps: [
      "Write equations: a + 4d = 22 and a + 12d = 46.",
      "Subtract to eliminate a and solve for d.",
      "Substitute d into one equation to find a.",
    ],
    strategyHint:
      "Use the nth‑term formula and solve the resulting system.",
  },
  {
    id: "2026-AP-AR-08",
    topicKey: "Arithmetic Progression",
    subtopic: "Sum of n Terms",
    kind: "Assertion-Reasoning",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Assertion (A): In any arithmetic progression, the sum of terms equidistant from the beginning and the end is the same.\nReason (R): For an arithmetic progression, each pair of equidistant terms adds up to the sum of the first and last terms.",
    answer:
      "Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    explanation:
      "In an AP, the k‑th term from the beginning and the k‑th term from the end are a + (k − 1)d and l − (k − 1)d. Their sum is a + l, independent of k.",
  },

  // ===== Coordinate Geometry (high‑roi) =====
  {
    id: "2026-CG-MCQ-08",
    topicKey: "Coordinate Geometry",
    subtopic: "Distance Formula",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Applying",
    questionText:
      "The distance between the points (2, −3) and (−4, 5) is:",
    options: ["2√13", "10", "√52", "8"],
    answer: "10",
    explanation:
      "Distance = √[(2 + 4)² + (−3 − 5)²] = √[6² + (−8)²] = √100 = 10.",
  },
  {
    id: "2026-CG-MCQ-09",
    topicKey: "Coordinate Geometry",
    subtopic: "Distance Formula",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "If a point (x, 4) is equidistant from (2, −1) and (−2, 3), then x equals:",
    options: ["1", "2", "3", "4"],
    answer: "3",
    explanation:
      "Equate squares of distances: (x − 2)² + 25 = (x + 2)² + 1 ⇒ −4x + 29 = 4x + 5 ⇒ x = 3.",
  },
  {
    id: "2026-CG-SA-10",
    topicKey: "Coordinate Geometry",
    subtopic: "Section Formula",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Find the coordinates of the point that divides the line segment joining A(2, 3) and B(8, 5) internally in the ratio 3 : 2.",
    answer: "The point is (28/5, 21/5) or (5.6, 4.2).",
    explanation:
      "Using the section formula: x = (3×8 + 2×2)/5 = 28/5, y = (3×5 + 2×3)/5 = 21/5.",
    solutionSteps: [
      "Label A(x₁, y₁) = (2,3) and B(x₂, y₂) = (8,5); m:n = 3:2.",
      "Apply section formula: x = (m x₂ + n x₁)/(m + n), y = (m y₂ + n y₁)/(m + n).",
      "Compute x and y to get (28/5, 21/5).",
    ],
    strategyHint:
      "Multiply the coordinates by the opposite segment lengths and divide by the total parts.",
  },
  {
    id: "2026-CG-CASE-11",
    topicKey: "Coordinate Geometry",
    subtopic: "Distance Formula",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Given triangle P(1, 1), Q(4, 5) and R(7, 1):\n(a) Show that PQ = QR.\n(b) Find the area of ΔPQR using the coordinate method.\n(c) State the type of triangle PQR is.",
    answer:
      "(a) PQ = QR = 5 units. (b) Area of ΔPQR = 12 square units. (c) ΔPQR is an isosceles triangle.",
    explanation:
      "Compute PQ = √[(4 − 1)² + (5 − 1)²] = 5 and QR = √[(7 − 4)² + (1 − 5)²] = 5. Using the determinant formula, area = ½|1(5 − 1) + 4(1 − 1) + 7(1 − 5)| = 12. Two equal sides imply an isosceles triangle.",
    solutionSteps: [
      "Use the distance formula to show PQ and QR both equal 5.",
      "Use the coordinate area formula to compute area.",
      "Conclude that the triangle is isosceles.",
    ],
    strategyHint:
      "Compute side lengths and use the determinant method for area.",
  },

  // ===== Circles (high‑roi) =====
  {
    id: "2026-CIRC-MCQ-08",
    topicKey: "Circles",
    subtopic: "Tangent Properties",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "From a point A, a tangent AT is drawn to a circle with centre O and radius r. If OA = 13 cm and AT = 12 cm, the radius r is:",
    options: ["5 cm", "12 cm", "13 cm", "25 cm"],
    answer: "5 cm",
    explanation:
      "Right triangle OAT gives OA² = OT² + AT² ⇒ 13² = r² + 12² ⇒ r² = 25 ⇒ r = 5 cm.",
  },
  {
    id: "2026-CIRC-MCQ-09",
    topicKey: "Circles",
    subtopic: "Tangent Theorems & Proofs",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Two tangents PA and PB are drawn to a circle from an external point P. If chord AB subtends an angle of 60° at the centre, then ∠APB equals:",
    options: ["30°", "60°", "90°", "120°"],
    answer: "120°",
    explanation:
      "The angle between tangents is supplementary to the central angle subtended by the chord: ∠APB = 180° − 60° = 120°.",
  },
  {
    id: "2026-CIRC-SA-10",
    topicKey: "Circles",
    subtopic: "Tangent Properties",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "From an external point P, tangents PT and PS are drawn to a circle with centre O. If OP = 25 cm and PT = 24 cm, find the radius of the circle.",
    answer: "7 cm.",
    explanation:
      "OT ⟂ PT. In ΔOPT: OP² = PT² + OT² ⇒ 25² = 24² + r² ⇒ r = 7 cm.",
    solutionSteps: [
      "Recognise that OT is perpendicular to PT at T.",
      "Apply the Pythagoras theorem in ΔOPT.",
      "Substitute OP = 25 and PT = 24 to find r.",
    ],
    strategyHint:
      "Use the property that tangents from an external point are equal and perpendicular to the radius.",
  },
  {
    id: "2026-CIRC-CASE-11",
    topicKey: "Circles",
    subtopic: "Number/Type of Tangents",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A circle has radius 5 cm. Two chords are drawn at distances of 4 cm and 3 cm from the centre.\n(a) Find the length of each chord.\n(b) Which chord is longer and why?",
    answer:
      "(a) The chord at 4 cm from the centre is 6 cm; the chord at 3 cm is 8 cm. (b) The chord closer to the centre (3 cm away) is longer.",
    explanation:
      "Chord length = 2√(r² − d²). For d = 4: 2√(25 − 16) = 6 cm. For d = 3: 2√(25 − 9) = 8 cm. The closer chord subtends a larger arc and is longer.",
    solutionSteps: [
      "Use chord length formula L = 2√(r² − d²).",
      "Compute lengths for d = 4 and d = 3.",
      "Compare and explain why the chord nearer the centre is longer.",
    ],
    strategyHint:
      "Remember the relationship between distance from the centre and chord length.",
  },

  // ===== Surface Areas and Volumes (high‑roi) =====
  {
    id: "2026-SAV-MCQ-06",
    topicKey: "Surface Areas and Volumes",
    subtopic: "Cylinder/Cone/Sphere",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Applying",
    questionText:
      "What is the volume of a sphere of radius 3 cm? (Take π = 22/7)",
    options: [
      "36π cm³",
      "72π cm³",
      "113 1/7 cm³",
      "452/7 cm³",
    ],
    answer: "113 1/7 cm³",
    explanation:
      "Volume = \\((4/3)πr³ = (4/3) × (22/7) × 27 = 792/7 ≈ 113\\\\frac{1}{7}\\\\).",
  },
  {
    id: "2026-SAV-MCQ-07",
    topicKey: "Surface Areas and Volumes",
    subtopic: "Cylinder/Cone/Sphere",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "If the ratio of the surface areas of two spheres is 16 : 25, the ratio of their volumes is:",
    options: ["4 : 5", "8 : 15", "64 : 125", "16 : 25"],
    answer: "64 : 125",
    explanation:
      "Surface area ratio = (r₁/r₂)² = 16/25 ⇒ r₁/r₂ = 4/5. Volume ratio = (r₁/r₂)³ = (4/5)³ = 64/125.",
  },
  {
    id: "2026-SAV-SA-08",
    topicKey: "Surface Areas and Volumes",
    subtopic: "Combination/Transformation",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A metal sphere of radius 10 cm is melted and recast into small cones, each of radius 2.5 cm and height 8 cm. How many such cones can be formed? (Use π in your answer.)",
    answer: "80 cones.",
    explanation:
      "Volume of sphere = \\((4/3)π(10)³ = 4000/3 π\\\\). Volume of one cone = \\((1/3)π(2.5)² × 8 = 50/3 π\\\\). Number of cones = (4000/3)/(50/3) = 80.",
    solutionSteps: [
      "Compute sphere volume: \\((4/3)π(10)³\\\\).",
      "Compute cone volume: \\((1/3)π(2.5)² × 8\\\\).",
      "Divide V_s by V_c.",
    ],
    strategyHint:
      "Conservation of volume applies when recasting shapes.",
  },
  {
    id: "2026-SAV-CASE-09",
    topicKey: "Surface Areas and Volumes",
    subtopic: "Cylinder/Cone/Sphere",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A cylindrical water tank of radius 1.5 m and height 5 m has to be painted both inside and outside, leaving the top open. The cost of painting is ₹120 per square metre. Calculate the total cost.",
    answer: "Approximately ₹13,020.",
    explanation:
      "Outer curved surface area + base = 2πrh + πr² = 17.25π m². Inner curved surface area + base = 17.25π m². Total area = 34.5π m² ≈ 108.5 m² (taking π ≈ 3.14). Cost ≈ 108.5 × 120 ≈ ₹13,020.",
    solutionSteps: [
      "Calculate outer curved surface: 2πrh = 2π×1.5×5 = 15π.",
      "Calculate area of base: πr² = 2.25π.",
      "Total outer + inner surface (excluding top) = 2 × (15π + 2.25π) = 34.5π.",
      "Convert to decimal using π ≈ 3.14 and multiply by ₹120.",
    ],
    strategyHint:
      "Paint both inner and outer surfaces except the open top.",
  },

  // ===== Constructions (good‑to‑do) =====
  {
    id: "2026-CONST-MCQ-04",
    topicKey: "Constructions",
    subtopic: "Divide Segment",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "To divide a given line segment AB into 4 equal parts using ruler and compass, how many equal divisions should be marked on an auxiliary ray?",
    options: ["2", "3", "4", "5"],
    answer: "4",
    explanation:
      "To divide a segment into n equal parts, mark n equal arcs on the auxiliary ray. Therefore 4 equal marks are required.",
  },
  {
    id: "2026-CONST-SA-05",
    topicKey: "Constructions",
    subtopic: "Divide Segment",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Construct a line segment PQ of length 8 cm and divide it internally in the ratio 3 : 2 using only a straightedge and compass. Describe the steps and justify your construction.",
    answer:
      "Draw PQ = 8 cm. Draw an acute ray PR. Mark five equal segments on PR. Join the fifth mark to Q. Through the third mark draw a line parallel to this, meeting PQ at S. Then PS:PQ = 3:5 and SQ:PQ = 2:5, so S divides PQ in the ratio 3:2.",
    explanation:
      "Using equal divisions and drawing a parallel line ensures that corresponding segments are proportional (Basic Proportionality Theorem). Hence PS:SQ = 3:2.",
    solutionSteps: [
      "Draw PQ = 8 cm and an acute ray PR.",
      "On PR, mark five equal divisions (since 3 + 2 = 5 parts).",
      "Join the fifth division point to Q.",
      "Through the third division point, draw a line parallel to this connecting line to meet PQ at S.",
      "PS:PQ = 3:5 ⇒ PS = 4.8 cm and SQ = 3.2 cm.",
    ],
    strategyHint:
      "Divide the auxiliary ray into total parts equal to the sum of the ratio terms.",
  },

  // ===== Areas Related to Circles (good‑to‑do) =====
  {
    id: "2026-ARC-MCQ-03",
    topicKey: "Areas Related to Circles",
    subtopic: "Sectors and Segments",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Applying",
    questionText:
      "Find the area of a sector of a circle with radius 7 cm and angle 60°. (Take π = 22/7.)",
    options: ["77 cm²", "154/3 cm²", "77/3 cm²", "154 cm²"],
    answer: "77/3 cm²",
    explanation:
      "Area = (60/360) × πr² = (1/6) × 22/7 × 49 = 154/6 = 77/3 cm².",
  },
  {
    id: "2026-ARC-SA-04",
    topicKey: "Areas Related to Circles",
    subtopic: "Composite Figures",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A running track consists of two straight sections each of length 50 m joined by two semicircles of radius 20 m. Find the total length of the track and the area enclosed by it. (Take π = 3.14.)",
    answer:
      "Length ≈ 225.6 m; Area ≈ 3,256 m².",
    explanation:
      "Length: two semicircles make a full circle of circumference 2πr = 40π m; adding straight sections gives 40π + 100 ≈ 125.6 + 100 = 225.6 m. Area: rectangle 50 × 40 = 2,000 m² plus circle area πr² = 3.14 × 400 = 1,256 m²; total ≈ 3,256 m².",
    solutionSteps: [
      "Compute the circular part: circumference = 2π×20 = 40π m.",
      "Add the two straight segments (100 m).",
      "For area, combine the area of the rectangle (50 × 40) and the area of the full circle (π×20²).",
      "Use π = 3.14 for numerical results.",
    ],
    strategyHint:
      "Break the track into simple geometric shapes: a rectangle and a circle.",
  },
  {
    id: "2026-TRIG-LA-13",
    topicKey: "Trigonometry",
    subtopic: "Application/Heights & Distances",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Hard",
    bloomSkill: "Applying",
    questionText:
      "From the top of a tower, the angle of depression of two objects on the same straight line with the foot of the tower are 45° and 30°. If the two objects are 40 m apart, find the height of the tower and the distance of the nearer object from the foot of the tower.",
    answer:
      "Let nearer distance = x m, farther distance = x + 40 m. tan45° = h/x gives h = x. tan30° = h/(x+40) gives h = (x+40)/√3. Equating: x = (x+40)/√3 ⇒ x(√3−1)=40 ⇒ x = 20(√3+1). Height h = 20(√3+1) m.",
    finalAnswer:
      "Height of tower = 20(√3+1) m and distance of nearer object from foot = 20(√3+1) m.",
    explanation:
      "Board-style 5-mark application that combines two depression angles with a shared-height setup.",
    solutionSteps: [
      "Draw a labelled diagram with tower AB and points C (nearer) and D (farther) on horizontal line through B.",
      "Use angle of depression = angle of elevation to write ∠ACB = 45° and ∠ADB = 30°.",
      "Assume BC = x, so BD = x + 40 and AB = h.",
      "From triangle ABC: tan45° = h/x ⇒ h = x.",
      "From triangle ABD: tan30° = h/(x+40) ⇒ h = (x+40)/√3.",
      "Equate both values of h and solve for x.",
      "State h and BC clearly with units.",
    ],
    strategyHint:
      "For two observations on one line, create two tan equations using the same height variable.",
    policyTag: "Trigonometry 5-mark competency application",
    pastBoardYear: "2024",
  },
];
