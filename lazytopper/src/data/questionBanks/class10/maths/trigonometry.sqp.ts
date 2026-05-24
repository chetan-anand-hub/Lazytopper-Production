import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Trigonometry — CBSE Sample Question Paper 2023-24 (MATHEMATICS STANDARD — Code 041)
 * Source: MathsStandard-SQP.pdf (10pp) + MathsStandard-MS.pdf (9pp), cbseacademic.nic.in
 * Extracted: 2026-05-24 (P2 SQP-only scope; APQ deferred to follow-up PR)
 * topicKey: "trigonometry"
 * Section distribution: A=3, B=1, C=1, E=1 (case-based)
 * Note: "Complementary Angles" subtopic banned in CBSE 2025-26; none of these questions
 * use that concept (all are Pythagorean identity / heights-and-distances / standard ratios).
 */
export const TRIGONOMETRY_SQP: CanonicalQuestion[] = [
  {
    "id": "SQP-M-TRIG-001",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Pythagorean Identity — Find cos from sin",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "Given that sin θ = a/b, then cos θ is",
    "options": [
      "(A) b/√(b² − a²)",
      "(B) b/a",
      "(C) √(b² − a²)/b",
      "(D) a/√(b² − a²)"
    ],
    "answer": "(C) √(b² − a²)/b",
    "solutionSteps": [
      "Using sin²θ + cos²θ = 1: cos²θ = 1 − (a/b)² = (b² − a²)/b² ⇒ cos θ = √(b² − a²)/b (taking the positive root for acute θ). Answer: (C)."
    ],
    "finalAnswer": "(C) √(b² − a²)/b",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-M-TRIG-002",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Identity Simplification",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "(sec A + tan A)(1 − sin A) equals:",
    "options": [
      "(A) sec A",
      "(B) sin A",
      "(C) cosec A",
      "(D) cos A"
    ],
    "answer": "(D) cos A",
    "solutionSteps": [
      "(sec A + tan A)(1 − sin A) = (1/cos A + sin A/cos A)(1 − sin A) = ((1 + sin A)/cos A)·(1 − sin A) = (1 − sin²A)/cos A = cos²A/cos A = cos A. Answer: (D)."
    ],
    "finalAnswer": "(D) cos A",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-M-TRIG-003",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Heights and Distances — Angle of Elevation",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "If a pole 6 m high casts a shadow 2√3 m long on the ground, then the Sun's elevation is",
    "options": [
      "(A) 60°",
      "(B) 45°",
      "(C) 30°",
      "(D) 90°"
    ],
    "answer": "(A) 60°",
    "solutionSteps": [
      "tan(elevation) = height of pole / length of shadow = 6 / (2√3) = 3/√3 = √3. So elevation = arctan(√3) = 60°. Answer: (A)."
    ],
    "finalAnswer": "(A) 60°",
    "isCompetencyBased": true
  },
  {
    "id": "SQP-M-TRIG-004",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Solving tan(A+B) and tan(A−B) System",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If tan(A + B) = √3 and tan(A − B) = 1/√3 ; 0° < A + B < 90°; A > B, find A and B.\n\n[OR]\n\nFind the value of x if 2 cosec²30° + x sin²60° − (3/4) tan²30° = 10.",
    "options": [],
    "answer": "Main: A = 45°, B = 15°. OR Alt: x = 3.",
    "solutionSteps": [
      "Main: tan(A + B) = √3 ⇒ A + B = 60°. tan(A − B) = 1/√3 ⇒ A − B = 30°. Add: 2A = 90° ⇒ A = 45°. Subtract: 2B = 30° ⇒ B = 15°.",
      "OR (alternative): cosec 30° = 2, sin 60° = √3/2, tan 30° = 1/√3. Substitute: 2·(2)² + x·(√3/2)² − (3/4)·(1/√3)² = 10 ⇒ 8 + x·(3/4) − (3/4)·(1/3) = 10 ⇒ 8 + (3x/4) − (1/4) = 10. Multiply by 4: 32 + 3x − 1 = 40 ⇒ 3x = 9 ⇒ x = 3."
    ],
    "finalAnswer": "Main: A = 45°, B = 15°. OR Alt: x = 3.",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-M-TRIG-005",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Identity Proof — Quadratic in tan θ",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "If 1 + sin²θ = 3 sin θ cos θ, then prove that tan θ = 1 or tan θ = 1/2.",
    "options": [],
    "answer": "Proved: tan θ = 1 or tan θ = 1/2.",
    "solutionSteps": [
      "Divide both sides by cos²θ: (1/cos²θ) + (sin²θ/cos²θ) = 3·(sin θ/cos θ) ⇒ sec²θ + tan²θ = 3 tan θ.",
      "Use sec²θ = 1 + tan²θ: (1 + tan²θ) + tan²θ = 3 tan θ ⇒ 2 tan²θ − 3 tan θ + 1 = 0.",
      "Let tan θ = t. Quadratic: 2t² − 3t + 1 = 0 ⇒ (t − 1)(2t − 1) = 0 ⇒ t = 1 or t = 1/2. Hence tan θ = 1 or tan θ = 1/2."
    ],
    "finalAnswer": "tan θ = 1 or tan θ = 1/2.",
    "isCompetencyBased": true
  },
  {
    "id": "SQP-M-TRIG-006",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Case-Based — Heights and Distances (Bird, Tree, Ball)",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "One evening, Kaushik was in a park. Children were playing cricket. Birds were singing on a nearby tree of height 80 m. He observed a bird on the tree at an angle of elevation of 45°. When a sixer was hit, a ball flew through the tree frightening the bird to fly away. In 2 seconds, he observed the bird flying at the same height at an angle of elevation of 30° and the ball flying towards him at the same height at an angle of elevation of 60°.\n\nPart (i) [1 mark]: At what distance from the foot of the tree was he observing the bird sitting on the tree?\n\nPart (ii) [2 marks]: How far did the bird fly in the mentioned time? OR After hitting the tree, how far did the ball travel in the sky when Kaushik saw the ball?\n\nPart (iii) [1 mark]: What is the speed of the bird in m/min if it had flown 20(√3 + 1) m?",
    "options": [],
    "answer": "(i) 80 m. (ii) Bird flew 80(√3 − 1) m. OR Ball travelled 80(1 − 1/√3) m. (iii) Speed = 600(√3 + 1) m/min.",
    "solutionSteps": [
      "Part (i): With elevation 45° and tree height 80 m, tan 45° = 80/CB ⇒ CB = 80 m.",
      "Part (ii): When bird flies away, new elevation 30°. tan 30° = 80/CE ⇒ (1/√3) = 80/CE ⇒ CE = 80√3. Bird displacement AD = BE = CE − CB = 80√3 − 80 = 80(√3 − 1) m.",
      "Part (ii) OR: For the ball with elevation 60°: tan 60° = 80/CG ⇒ √3 = 80/CG ⇒ CG = 80/√3. Ball travel after hitting tree = CB − CG = 80 − 80/√3 = 80(1 − 1/√3) m.",
      "Part (iii): Distance flown = 20(√3 + 1) m in 2 s. Speed = (20(√3 + 1) / 2) m/s = 10(√3 + 1) m/s. Convert to m/min: × 60 ⇒ 600(√3 + 1) m/min."
    ],
    "finalAnswer": "(i) 80 m; (ii) 80(√3 − 1) m OR 80(1 − 1/√3) m; (iii) 600(√3 + 1) m/min.",
    "isCompetencyBased": true
  }
];
