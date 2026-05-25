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
];
