import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Surface Areas and Volumes — CBSE Sample Question Paper 2023-24 (MATHEMATICS STANDARD — Code 041)
 * Source: MathsStandard-SQP.pdf (10pp) + MathsStandard-MS.pdf (9pp), cbseacademic.nic.in
 * Extracted: 2026-05-24 (P2 SQP-only scope; APQ deferred to follow-up PR)
 * topicKey: "surface-areas-and-volumes"
 * Section distribution: A=1 (AR), D=1
 */
export const SURFACE_AREAS_AND_VOLUMES_SQP: CanonicalQuestion[] = [
  {
    "id": "SQP-M-SAV-001",
    "subject": "Maths",
    "topicKey": "surface-areas-and-volumes",
    "subtopic": "Combination of Solids — Surface Area",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "Statement A (Assertion): Total Surface area of the top is the sum of the curved surface area of the hemisphere and the curved surface area of the cone.\nStatement R (Reason): Top is obtained by joining the plane surfaces of the hemisphere and cone together.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "When two solids are joined along their plane (flat) surfaces, the plane surfaces become internal and only the curved surfaces remain visible. For a hemisphere + cone top, this gives TSA = CSA(hemisphere) + CSA(cone). Reason is the correct explanation of Assertion. Answer: (A)."
    ],
    "finalAnswer": "(A)",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-M-SAV-002",
    "subject": "Maths",
    "topicKey": "surface-areas-and-volumes",
    "subtopic": "Volume of Combination of Solids — Real-World",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Applying",
    "questionText": "Water is flowing at the rate of 15 km/h through a pipe of diameter 14 cm into a cuboidal pond which is 50 m long and 44 m wide. In what time will the level of water in pond rise by 21 cm? What should be the speed of water if the rise in water level is to be attained in 1 hour?\n\n[OR]\n\nA tent is in the shape of a cylinder surmounted by a conical top. If the height and radius of the cylindrical part are 3 m and 14 m respectively, and the total height of the tent is 13.5 m, find the area of the canvas required for making the tent, keeping a provision of 26 m² of canvas for stitching and wastage. Also, find the cost of the canvas to be purchased at the rate of ₹500 per m².",
    "options": [],
    "answer": "Main: 2 hours; speed for 1 hour rise = 30 km/h. OR Alt: 1060 m² canvas; cost = ₹5,30,000.",
    "solutionSteps": [
      "Volume of water in pond = l × b × h = 50 × 44 × (21/100) = 462 m³.",
      "Pipe radius r = 7 cm = 7/100 m. Area of cross-section = πr² = (22/7) × (7/100) × (7/100) = 154/10000 m².",
      "Speed of flow = 15 km/h = 15000 m/h. Volume flowing in 1 h = (154/10000) × 15000 = 231 m³/h.",
      "Time required = Volume of pond / Rate = 462/231 = 2 hours.",
      "For 1-hour rise: required rate = 462 m³/h; required speed = 462 × 10000 / 154 = 30000 m/h = 30 km/h.",
      "OR (alternative): Cylinder: r = 14 m, h_cyl = 3 m. Cone: r = 14 m, h_cone = 13.5 − 3 = 10.5 m. Slant height ℓ = √(h² + r²) = √(110.25 + 196) = √306.25 = 17.5 m. CSA(cylinder) = 2πrh = 2 × (22/7) × 14 × 3 = 264 m². CSA(cone) = πrℓ = (22/7) × 14 × 17.5 = 770 m². Total CSA = 1034 m². Add stitching/wastage 26 m² → canvas needed = 1060 m². Cost = 500 × 1060 = ₹5,30,000."
    ],
    "finalAnswer": "Main: 2 hours, 30 km/h. OR Alt: 1060 m², ₹5,30,000.",
    "isCompetencyBased": true
  }
];
