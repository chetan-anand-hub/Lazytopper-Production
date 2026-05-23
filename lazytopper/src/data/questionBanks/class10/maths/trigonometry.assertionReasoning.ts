import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Trigonometry Assertion-Reason Pack (Section A, 1 mark each)
 *
 * Source: split from assertion_reason_pack.ts.
 * Content basis: CBSE Class X Maths Standard SQP 2025-26, NCERT Ch 8 & 9,
 * CBSE Board Papers 2022-2025, Circular Acad-30/2024 (AR mandatory in Section A).
 * topicKey: "trigonometry" | format: Assertion-Reasoning | section: A.
 */
export const TRIGONOMETRY_AR_QUESTIONS: CanonicalQuestion[] = [
{
    "id": "AR-TRIG-001",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Ratios",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "Assertion (A): sin 60° = cos 30°.\nReason (R): For complementary angles A and B (A + B = 90°), sinA = cosB.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "Assertion: sin 60° = √3/2 and cos 30° = √3/2. So sin 60° = cos 30°. TRUE.",
      "Reason: For complementary angles, sinA = cos(90°−A). Here 60° + 30° = 90°, so sin 60° = cos 30°. TRUE.",
      "R directly explains A using the complementary angle identity.",
      "Answer: (A)"
    ],
    "finalAnswer": "(A)",
    "explanation": "Both true. sin 60° = cos 30° = √3/2. R (sinA = cos(90°−A)) directly explains this since 60° and 30° are complementary.",
    "isCompetencyBased": false,
    "pyqYear": "2023",
    "pyqSet": "30/1/1",
    "ncertRef": "Ex 8.2, Ex 8.3"
  },

{
    "id": "AR-TRIG-002",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Identities",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "Assertion (A): (1 − sin²θ) = cos²θ for all values of θ.\nReason (R): sin²θ + cos²θ = 1 is a fundamental trigonometric identity.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "Assertion: From sin²θ + cos²θ = 1, rearranging gives cos²θ = 1 − sin²θ. TRUE.",
      "Reason: sin²θ + cos²θ = 1 is the fundamental Pythagorean identity. TRUE.",
      "A is a direct rearrangement of R, so R explains A.",
      "Answer: (A)"
    ],
    "finalAnswer": "(A)",
    "explanation": "Both true. 1 − sin²θ = cos²θ is a direct rearrangement of the identity sin²θ + cos²θ = 1 (R). R explains A.",
    "isCompetencyBased": false,
    "pyqYear": undefined,
    "pyqSet": undefined,
    "ncertRef": "Ex 8.4"
  },

{
    "id": "AR-TRIG-003",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Ratios",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "Assertion (A): The value of sin θ can be greater than 1 for some values of θ.\nReason (R): sinθ = perpendicular/hypotenuse in a right triangle, and hypotenuse is always the longest side.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(D) Assertion is false but Reason is true.",
    "solutionSteps": [
      "Assertion: sinθ = perpendicular/hypotenuse. Since hypotenuse ≥ perpendicular always, sinθ ≤ 1. sinθ cannot exceed 1. FALSE.",
      "Reason: sinθ = opposite/hypotenuse, and hypotenuse is the longest side in a right triangle (opposite the right angle). Therefore perpendicular ≤ hypotenuse, so sinθ ≤ 1. TRUE.",
      "A says sinθ > 1 is possible — FALSE. R correctly explains why sinθ ≤ 1 always.",
      "Answer: (D)"
    ],
    "finalAnswer": "(D)",
    "explanation": "A is false — sinθ ≤ 1 always since hypotenuse ≥ perpendicular. R is true and actually disproves A by explaining why sinθ cannot exceed 1.",
    "isCompetencyBased": true,
    "pyqYear": "2024",
    "pyqSet": "30/2/1",
    "ncertRef": "Ex 8.1"
  },

{
    "id": "AR-TRIG-004",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Identities",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "Assertion (A): sec²θ − tan²θ = 1 for all values of θ where secθ is defined.\nReason (R): sin²θ + cos²θ = 1, from which dividing by cos²θ gives sec²θ − tan²θ = 1.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "Assertion: sec²θ − tan²θ = 1 is a standard identity. TRUE.",
      "Reason: Dividing sin²θ + cos²θ = 1 by cos²θ gives tan²θ + 1 = sec²θ, i.e., sec²θ − tan²θ = 1. TRUE.",
      "R is the derivation of the identity in A. R correctly explains A.",
      "Answer: (A)"
    ],
    "finalAnswer": "(A)",
    "explanation": "Both true. Dividing the fundamental identity sin²θ + cos²θ = 1 by cos²θ gives sec²θ − tan²θ = 1. R is the exact derivation of A.",
    "isCompetencyBased": false,
    "pyqYear": "2022",
    "pyqSet": "30/1/1",
    "ncertRef": "Ex 8.4"
  },

{
    "id": "AR-TRIG-005",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Ratios",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "Assertion (A): tan 45° = 1.\nReason (R): At 45°, the perpendicular and base of the right triangle are equal.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "Assertion: tan 45° = sin45°/cos45° = (1/√2)/(1/√2) = 1. TRUE.",
      "Reason: In a right triangle with 45° angle, the two legs (perpendicular and base) are equal. tan = perpendicular/base = 1. TRUE.",
      "R explains why tan 45° = 1 geometrically.",
      "Answer: (A)"
    ],
    "finalAnswer": "(A)",
    "explanation": "Both true. At 45°, perpendicular = base in the right triangle, so tanθ = p/b = 1. R is the geometric explanation of A.",
    "isCompetencyBased": false,
    "pyqYear": undefined,
    "pyqSet": undefined,
    "ncertRef": "Ex 8.2"
  },

{
    "id": "AR-TRIG-006",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Heights and Distances",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Assertion (A): The angle of elevation of the sun decreases as the height of the shadow increases.\nReason (R): As the angle of elevation θ decreases, tanθ decreases, so for the same object height, the shadow length (base) increases.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "Assertion: When the sun is lower in the sky (smaller angle of elevation), shadows are longer. As shadow length increases, the angle of elevation of the sun decreases. TRUE.",
      "Reason: tanθ = height/shadow length. For fixed height, if tanθ decreases (θ decreases), shadow length = height/tanθ increases. TRUE.",
      "R explains the mathematical relationship behind A.",
      "Answer: (A)"
    ],
    "finalAnswer": "(A)",
    "explanation": "Both true. tanθ = height/shadow. Smaller θ → smaller tanθ → longer shadow. R correctly explains why the sun's lower angle of elevation gives longer shadows.",
    "isCompetencyBased": true,
    "pyqYear": undefined,
    "pyqSet": undefined,
    "ncertRef": "Ex 9.1"
  },

{
    "id": "AR-TRIG-007",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Identities",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Hard",
    "bloomSkill": "Evaluating",
    "questionText": "Assertion (A): (sinθ + cosθ)² = 1 + 2sinθcosθ.\nReason (R): (a + b)² = a² + b² + 2ab and sin²θ + cos²θ = 1.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "Assertion: (sinθ + cosθ)² = sin²θ + cos²θ + 2sinθcosθ = 1 + 2sinθcosθ. TRUE.",
      "Reason: The expansion uses (a+b)² = a²+2ab+b², and then sin²θ+cos²θ = 1 simplifies the result. TRUE.",
      "R provides exactly the two steps needed to prove A.",
      "Answer: (A)"
    ],
    "finalAnswer": "(A)",
    "explanation": "Both true. Expanding (sinθ+cosθ)² using (a+b)² formula and substituting sin²θ+cos²θ = 1 gives 1+2sinθcosθ. R contains exactly these two tools.",
    "isCompetencyBased": false,
    "pyqYear": "2025",
    "pyqSet": "30/1/1",
    "ncertRef": "Ex 8.4"
  },

{
    "id": "AR-TRIG-008",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Ratios",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Hard",
    "bloomSkill": "Evaluating",
    "questionText": "Assertion (A): cos 0° = 0.\nReason (R): cosθ = base/hypotenuse and at θ = 0°, the base becomes equal to the hypotenuse.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(D) Assertion is false but Reason is true.",
    "solutionSteps": [
      "Assertion: cos 0° = 1 (NOT 0). At 0°, the angle is zero, the perpendicular vanishes, base = hypotenuse, so cosθ = base/hypotenuse = 1. FALSE — the claim that cos 0° = 0 is wrong.",
      "Reason: cosθ = base/hypotenuse. At θ = 0°, the triangle degenerates so that base = hypotenuse, giving cos 0° = 1. TRUE.",
      "A is false (cos 0° = 1, not 0). R is true and actually contradicts A.",
      "Answer: (D)"
    ],
    "finalAnswer": "(D)",
    "explanation": "A is false — cos 0° = 1, not 0. R is true — at θ = 0°, base = hypotenuse so cosθ = 1. This is a classic trap question testing knowledge of standard values.",
    "isCompetencyBased": true,
    "pyqYear": "2024",
    "pyqSet": "30/3/1",
    "ncertRef": "Ex 8.2"
  },

{
    "id": "AR-TRIG-009",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Heights and Distances",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Hard",
    "bloomSkill": "Evaluating",
    "questionText": "Assertion (A): If the angle of elevation of the top of a tower from a point on the ground increases, the observer is moving closer to the tower.\nReason (R): tan θ = height/distance. As distance decreases, tanθ increases, so θ increases.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "Assertion: As an observer moves closer to the base of a tower, the horizontal distance decreases. With the same tower height, tanθ = h/d increases, so θ increases. TRUE.",
      "Reason: tanθ = height/distance. For fixed height h, as distance d decreases, tanθ = h/d increases, meaning θ increases. TRUE.",
      "R provides the mathematical justification for A.",
      "Answer: (A)"
    ],
    "finalAnswer": "(A)",
    "explanation": "Both true. As observer moves closer, distance d decreases, tanθ = h/d increases, so angle θ increases. R is the direct mathematical explanation of A.",
    "isCompetencyBased": true,
    "pyqYear": undefined,
    "pyqSet": undefined,
    "ncertRef": "Ex 9.1"
  },

{
    "id": "AR-TRIG-010",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Identities",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Hard",
    "bloomSkill": "Evaluating",
    "questionText": "Assertion (A): cosec θ + cot θ = 1/(cosec θ − cot θ).\nReason (R): cosec²θ − cot²θ = 1, which can be written as (cosecθ + cotθ)(cosecθ − cotθ) = 1.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "Assertion: cosecθ + cotθ = 1/(cosecθ − cotθ).",
      "Check: (cosecθ + cotθ)(cosecθ − cotθ) = cosec²θ − cot²θ = 1.",
      "So cosecθ + cotθ = 1/(cosecθ − cotθ). TRUE.",
      "Reason: cosec²θ − cot²θ = 1 (standard identity, derived by dividing sin²θ+cos²θ=1 by sin²θ).",
      "Factoring: (cosecθ+cotθ)(cosecθ−cotθ) = 1, which directly gives A. TRUE.",
      "R is the factorisation that proves A.",
      "Answer: (A)"
    ],
    "finalAnswer": "(A)",
    "explanation": "Both true. From cosec²θ − cot²θ = 1, factoring as (cosecθ+cotθ)(cosecθ−cotθ) = 1 gives cosecθ+cotθ = 1/(cosecθ−cotθ). R is the direct proof of A.",
    "isCompetencyBased": true,
    "pyqYear": "2023",
    "pyqSet": "30/2/1",
    "ncertRef": "Ex 8.4"
  }
];
