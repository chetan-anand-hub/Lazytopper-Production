import type { CanonicalQuestion } from "../../../predictionTypes";

export const RN_SCARCE2: CanonicalQuestion[] = [
  {
    "id": "RN2SD-001",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "Fundamental Theorem of Arithmetic",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "The number 8232 is not a perfect cube. Break 8232 down into its prime powers, then reason from the exponents to answer: (i) by how little may 8232 be enlarged, using a single whole-number factor, to reach a perfect cube; (ii) by how little may it be shrunk, using a single whole-number divisor, to reach a perfect cube. Report each resulting cube and its edge length.",
    "options": [],
    "answer": "8232 = 2^3 x 3 x 7^3; (i) multiply by 9 -> 74088 = 42^3; (ii) divide by 3 -> 2744 = 14^3.",
    "solutionSteps": [
      "[1 mark] Prime factorise by repeated division: 8232 = 8 x 1029 = 2^3 x 3 x 343 = 2^3 x 3 x 7^3.",
      "[1 mark] A number is a perfect cube exactly when every prime in its factorisation has an exponent that is a multiple of 3. Here the exponents are 2 -> 3 and 7 -> 3 (both multiples of 3), but 3 -> 1 (not a multiple of 3), so only the prime 3 is out of balance.",
      "[1 mark] (i) The exponent of 3 must rise from 1 to the next multiple of 3, i.e. to 3, needing two more factors of 3; smallest multiplier = 3^2 = 9. Product = 2^3 x 3^3 x 7^3 = (2 x 3 x 7)^3 = 42^3 = 74088, a cube of edge 42.",
      "[1 mark] (ii) The exponent of 3 must fall from 1 to the previous multiple of 3, i.e. to 0, removing the single factor of 3; smallest divisor = 3. Quotient = 2^3 x 7^3 = (2 x 7)^3 = 14^3 = 2744, a cube of edge 14.",
      "[1 mark] Verify: 8232 x 9 = 74088 and cube root of 74088 = 42; 8232 / 3 = 2744 and cube root of 2744 = 14. So the smallest multiplier is 9 and the smallest divisor is 3."
    ],
    "finalAnswer": "8232 = 2^3 x 3 x 7^3; multiply by 9 (74088 = 42^3); divide by 3 (2744 = 14^3)",
    "isCompetencyBased": false,
    "requiresDiagram": false
  },
];
