import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Mathematics (Standard 041)
// Papers: Mathematics-PQ1.pdf + MS, Mathematics-PQ2.pdf + MS
// topicKey: "quadratic-equations"
// Extraction date: 2026-05-24

export const QUADRATIC_EQUATIONS_APQ: CanonicalQuestion[] = [
  // PQ1 Q3 (Section A, MCQ, 1 mark)
  { id: "APQ-M-QE-001", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Roots of Quadratic", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "What is/are the roots of 3x^2 = 6x?",
    options: ["only 2", "only 3", "0 and 6", "0 and 2"],
    answer: "0 and 2",
    solutionSteps: ["3x^2 − 6x = 0 ⟹ 3x(x − 2) = 0 ⟹ x = 0 or x = 2."],
    finalAnswer: "(d) 0 and 2",
    ncertRef: "APQ PQ1 Q3", isCompetencyBased: false },

  // PQ2 Q4 (Section A, MCQ, 1 mark)
  { id: "APQ-M-QE-002", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Discriminant — Real Roots Condition", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "If the quadratic equation x^2 − 8x + k = 0 has real roots, then",
    options: ["k < 16", "k ≤ 16", "k > 16", "k ≥ 16"],
    answer: "k ≤ 16",
    solutionSteps: ["Real roots condition: discriminant D ≥ 0.", "D = (−8)^2 − 4·1·k = 64 − 4k ≥ 0 ⟹ k ≤ 16."],
    finalAnswer: "(b) k ≤ 16",
    ncertRef: "APQ PQ2 Q4", isCompetencyBased: false },

  // PQ1 Q32 (Section D, Long, 5 marks)
  { id: "APQ-M-QE-003", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Word Problem — Speed/Distance/Time", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Manu and Aiza are competing in a 60 km cycling race. Aiza's average speed is 10 km/hr greater than Manu's average speed and she finished the race in 1/2 hour less than Manu. Find the time taken by Manu to finish the race. OR Shown below is a cuboid with water in two different orientations. The length, breadth and height of the cuboid are distinct. The cuboid has 480 cm^3 of water. If the height of water in orientation II is half of that in orientation I, then find the heights of water in both orientations.",
    answer: "Manu took 2 hours. [OR] Orientation I: 12 cm; Orientation II: 6 cm.",
    solutionSteps: ["Let Manu's time = t hours, so Manu's speed = 60/t km/hr. Aiza's speed = 60/t + 10 and Aiza's time = t − 1/2.", "Equation: (60/t + 10)(t − 1/2) = 60. Expand: 60 − 30/t + 10t − 5 = 60 ⟹ 10t − 30/t − 5 = 0.", "Multiply by t: 10t^2 − 5t − 30 = 0 ⟹ 2t^2 − t − 6 = 0.", "Factorise: (t − 2)(2t + 3) = 0 ⟹ t = 2 (reject t = −3/2).", "Manu took 2 hours.", "[OR] Let cuboid vertical length in orientation I = h cm; height of water = (h − 4) cm. In orientation II, water height = (h − 4)/2. Volume in II: 5 × h × (h−4)/2 = 480 ⟹ h^2 − 4h − 192 = 0 ⟹ (h − 16)(h + 12) = 0 ⟹ h = 16. Heights: I = 12 cm, II = 6 cm."],
    finalAnswer: "Manu took 2 hours. [OR] I: 12 cm, II: 6 cm.",
    ncertRef: "APQ PQ1 Q32", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE for OR variant (cuboid with water orientations)." },

  // PQ2 Q35 (Section D, Long, 5 marks)
  { id: "APQ-M-QE-004", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Word Problem — Speed/Distance/Time", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "A flight left 30 minutes later than the scheduled time and in order to reach its destination 1500 km away in time it has to increase its speed by 250 km/hr from its usual speed. Find its usual speed.",
    answer: "Usual speed = 750 km/hr.",
    solutionSteps: ["Let usual speed = x km/hr. Time saved by faster speed = 30 min = 1/2 hr.", "Equation: 1500/x − 1500/(x + 250) = 1/2.", "Multiply through and simplify: 1500·(250) / [x(x + 250)] = 1/2 ⟹ x(x + 250) = 750000.", "x^2 + 250x − 750000 = 0 ⟹ (x − 750)(x + 1000) = 0.", "Reject negative root: x = 750 km/hr."],
    finalAnswer: "Usual speed = 750 km/hr.",
    ncertRef: "APQ PQ2 Q35", isCompetencyBased: true },

  // ===== Mathematics-PQ_2022.pdf (2022-23 set, appended 2026-05-25) =====

  // PQ_2022 Q3 (Section A, MCQ, 1 mark)
  { id: "APQ-M-QE-005", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Nature of Roots — Discriminant", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "A teacher asks three students to complete the following statement about the nature of the roots of a quadratic equation. If q^2 − 4pr > 0, the roots of the quadratic equation px^2 + qx + r = 0 will be... Zain answers, \"always positive\". Vipul answers, \"positive, if p, q, and r are positive\". Suman answers, \"negative, if p, q, and r are positive\". Who answered correctly?",
    options: ["Zain", "Vipul", "Suman", "(none of them)"],
    answer: "Suman",
    solutionSteps: ["q^2 − 4pr > 0 ⟹ two distinct real roots. Sum of roots = −q/p; product of roots = r/p.", "If p, q, r > 0: sum = −q/p < 0 (negative), product = r/p > 0 (positive). Both roots negative.", "Suman is correct."],
    finalAnswer: "(c) Suman",
    ncertRef: "APQ PQ_2022 Q3", isCompetencyBased: true },

  // PQ_2022 Q32 first variant (Section D, Long, 5 marks)
  { id: "APQ-M-QE-006", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Word Problem — Sales/Price", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Sejal started a business where she sells earrings online. She made Rs 12000 in sales in her first month. In the second month, when she decreased the price of her product by Rs 20, she sold 40 more items and increased her total sales by Rs 2000. At what price did she sell the earrings in the second month? Show your work.",
    answer: "Rs 100 per earring (second month).",
    solutionSteps: ["Let first-month price = p; first-month quantity n = 12000/p.", "Second month: price = (p − 20), quantity = (12000/p + 40), sales = 12000 + 2000 = 14000. Equation: (p − 20)(12000/p + 40) = 14000.", "Expand: 12000 + 40p − 240000/p − 800 = 14000 ⟹ 40p − 240000/p − 2800 = 0. Multiply by p: 40p^2 − 2800p − 240000 = 0 ⟹ p^2 − 70p − 6000 = 0.", "Solve: p = (70 ± √(4900 + 24000))/2 = (70 ± 170)/2 ⟹ p = 120 (rejecting p = −50).", "Second-month price = 120 − 20 = Rs 100."],
    finalAnswer: "Rs 100.",
    ncertRef: "APQ PQ_2022 Q32 (first variant)", isCompetencyBased: true },

  // PQ_2022 Q32 OR variant (Section D, Long, 5 marks)
  { id: "APQ-M-QE-007", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Word Problem — Geometric Area", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "A wall measures 5 m in length and 4 m in height. The outer portion of the wall of uniform width 'x' m will be painted and the central portion will be tiled. The total budget, including the tiles at Rs 500 per m^2 and paint at Rs 200 per m^2, is Rs 5800. Find x such that the work is completed as per the budget. Show your work.",
    answer: "x = 1 m.",
    solutionSteps: ["Tiled area = (5 − 2x)(4 − 2x); painted area = 20 − (5 − 2x)(4 − 2x).", "Budget equation: 500·(5 − 2x)(4 − 2x) + 200·[20 − (5 − 2x)(4 − 2x)] = 5800.", "Simplify: 300·(5 − 2x)(4 − 2x) + 4000 = 5800 ⟹ (5 − 2x)(4 − 2x) = 6 ⟹ 20 − 18x + 4x^2 = 6 ⟹ 4x^2 − 18x + 14 = 0 ⟹ 2x^2 − 9x + 7 = 0.", "Solve: (2x − 7)(x − 1) = 0 ⟹ x = 1 or x = 3.5.", "Reject x = 3.5 (exceeds height/2 = 2). Accept x = 1 m."],
    finalAnswer: "x = 1 m.",
    ncertRef: "APQ PQ_2022 Q32 (OR variant)", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: wall with painted border of width x." },
];
