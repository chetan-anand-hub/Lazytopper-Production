import type { CanonicalQuestion } from "../../../predictionTypes";

export const TRI_EXPAND_EXTRACT: CanonicalQuestion[] = [
  {
    "id": "BX-TRI-EX-A-001",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Areas of Similar Triangles",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "requiresDiagram": false,
    "questionText": "In △ABC, P lies on AB and Q lies on AC with PQ ∥ BC, and PQ divides △ABC into two parts of equal area. The ratio PA : AB is:",
    "options": [
      "1 : √2",
      "2 : 3",
      "√2 : 1",
      "1 : 4"
    ],
    "answer": "1 : √2",
    "solutionSteps": [
      "[1 mark] PQ ∥ BC ⇒ △APQ ~ △ABC, so ar(APQ)/ar(ABC) = (AP/AB)². Equal-area split ⇒ this ratio = 1/2, giving AP/AB = 1/√2, i.e. PA : AB = 1 : √2."
    ],
    "finalAnswer": "1 : √2 — option (a).",
    "ncertRef": "rava.org.in CBSE Objective QB Ch6 Q1",
    "isCompetencyBased": true,
    "strategyHint": "Area ratio of similar triangles = (side ratio)²; set it to 1/2 and take the square root."
  },
  {
    "id": "BX-TRI-EX-A-002",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Pythagoras Theorem",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "requiresDiagram": false,
    "questionText": "The length of the side of a square whose diagonal is 16 cm is:",
    "options": [
      "8√2 cm",
      "16√2 cm",
      "8 cm",
      "4√2 cm"
    ],
    "answer": "8√2 cm",
    "solutionSteps": [
      "[1 mark] For a square of side x, diagonal = x√2 (Pythagoras on two equal sides). So x√2 = 16 ⇒ x = 16/√2 = 8√2 cm."
    ],
    "finalAnswer": "8√2 cm — option (a).",
    "ncertRef": "rava.org.in CBSE Objective QB Ch6 Q8",
    "isCompetencyBased": false,
    "strategyHint": "Square diagonal = side × √2."
  },
  {
    "id": "BX-TRI-EX-A-003",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Similar Figures",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "requiresDiagram": false,
    "questionText": "Which of the following statements is FALSE?",
    "options": [
      "All isosceles triangles are similar.",
      "All squares are similar.",
      "All circles are similar.",
      "All equilateral triangles are similar."
    ],
    "answer": "All isosceles triangles are similar.",
    "solutionSteps": [
      "[1 mark] Isosceles triangles can have different vertex angles, so they need not be equiangular ⇒ not always similar. Squares, circles and equilateral triangles are each always similar. Hence the false statement is 'All isosceles triangles are similar.'"
    ],
    "finalAnswer": "All isosceles triangles are similar — option (a).",
    "ncertRef": "rava.org.in CBSE Objective QB Ch6 Q10",
    "isCompetencyBased": false
  },
  {
    "id": "BX-TRI-EX-A-004",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Areas of Similar Triangles",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "requiresDiagram": false,
    "questionText": "The areas of two similar triangles are 81 cm² and 49 cm² respectively. The ratio of their corresponding medians is:",
    "options": [
      "9 : 7",
      "7 : 9",
      "81 : 49",
      "3 : √7"
    ],
    "answer": "9 : 7",
    "solutionSteps": [
      "[1 mark] Ratio of corresponding medians = ratio of corresponding sides = √(ratio of areas) = √(81/49) = 9/7, i.e. 9 : 7."
    ],
    "finalAnswer": "9 : 7 — option (a).",
    "ncertRef": "rava.org.in CBSE Objective QB Ch6 Q12",
    "isCompetencyBased": false,
    "strategyHint": "Corresponding medians are proportional to corresponding sides = √(area ratio)."
  },
  {
    "id": "BX-TRI-EX-A-005",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Pythagoras Theorem",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "requiresDiagram": false,
    "questionText": "The area of a right-angled triangle is 40 cm² and its perimeter is 40 cm. The length of its hypotenuse is:",
    "options": [
      "18 cm",
      "16 cm",
      "17 cm",
      "20 cm"
    ],
    "answer": "18 cm",
    "solutionSteps": [
      "[1 mark] Let legs a, b and hypotenuse c: ab = 80, a+b+c = 40 and a²+b² = c². Then (a+b)² = c²+2ab ⇒ (40−c)² = c²+160 ⇒ 1600−80c = 160 ⇒ c = 18 cm."
    ],
    "finalAnswer": "18 cm — option (a).",
    "ncertRef": "rava.org.in CBSE Objective QB Ch6 Q16",
    "isCompetencyBased": true,
    "strategyHint": "Use (a+b)² = a²+b²+2ab with a+b = 40−c and 2ab = 160."
  },
  {
    "id": "BX-TRI-EX-A-006",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Pythagoras Theorem",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "requiresDiagram": false,
    "questionText": "In a right triangle ABC right-angled at B, P and Q are points on the sides AB and BC respectively. Which relation is true?",
    "options": [
      "AQ² + CP² = AC² + PQ²",
      "AQ² + CP² = 2AC² + PQ²",
      "AQ² + BP² = AC² + PQ²",
      "AQ² + CP² = AB² + PQ²"
    ],
    "answer": "AQ² + CP² = AC² + PQ²",
    "solutionSteps": [
      "[1 mark] By Pythagoras: AQ² = AB²+BQ² and CP² = CB²+BP². Adding, AQ²+CP² = (AB²+CB²)+(BP²+BQ²) = AC²+PQ² (since AC²=AB²+CB² and PQ²=BP²+BQ²)."
    ],
    "finalAnswer": "AQ² + CP² = AC² + PQ² — option (a).",
    "ncertRef": "rava.org.in CBSE Objective QB Ch6 Q14",
    "isCompetencyBased": true,
    "strategyHint": "Apply Pythagoras to the four right triangles at B and regroup."
  },
  {
    "id": "BX-TRI-EX-A-007",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Similar Figures",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Remembering",
    "requiresDiagram": false,
    "questionText": "If two polygons are similar, the constant common ratio of their corresponding sides is called the:",
    "options": [
      "scale factor",
      "perimeter ratio",
      "area factor",
      "congruence ratio"
    ],
    "answer": "scale factor",
    "solutionSteps": [
      "[1 mark] For similar polygons every pair of corresponding sides is in the same ratio; this constant ratio is called the scale factor."
    ],
    "finalAnswer": "scale factor — option (a).",
    "ncertRef": "rava.org.in CBSE Objective QB Ch6 (Fill-in-the-blank 13)",
    "isCompetencyBased": false
  },
  {
    "id": "BX-TRI-EX-A-008",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Basic Proportionality Theorem",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "requiresDiagram": false,
    "questionText": "The diagonals of a quadrilateral ABCD intersect at O such that AO/BO = CO/DO. Then ABCD is a:",
    "options": [
      "trapezium",
      "parallelogram",
      "rectangle",
      "square"
    ],
    "answer": "trapezium",
    "solutionSteps": [
      "[1 mark] AO/BO = CO/DO ⇒ AO/CO = BO/DO, so the diagonals divide each other in the same ratio. By the converse of BPT this forces one pair of opposite sides parallel (AB ∥ CD), i.e. ABCD is a trapezium."
    ],
    "finalAnswer": "trapezium — option (a).",
    "ncertRef": "rava.org.in CBSE Objective QB Ch6 (Fill-in-the-blank 21)",
    "isCompetencyBased": false,
    "strategyHint": "Diagonals cut in the same ratio ⇒ a pair of parallel sides ⇒ trapezium."
  },
  {
    "id": "BX-TRI-EX-A-009",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Areas of Similar Triangles",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "requiresDiagram": false,
    "questionText": "Assertion (A): Two similar triangles ABC and DEF have BC = 4 cm, EF = 5 cm and ar(△ABC) = 64 cm²; then ar(△DEF) = 100 cm². Reason (R): The areas of two similar triangles are in the ratio of the squares of their corresponding altitudes.",
    "options": [
      "Both Assertion (A) and Reason (R) are true and Reason (R) is the correct explanation of Assertion (A).",
      "Both Assertion (A) and Reason (R) are true but Reason (R) is not the correct explanation of Assertion (A).",
      "Assertion (A) is true but Reason (R) is false.",
      "Assertion (A) is false but Reason (R) is true."
    ],
    "answer": "Both Assertion (A) and Reason (R) are true but Reason (R) is not the correct explanation of Assertion (A).",
    "solutionSteps": [
      "[1 mark] ar(ABC)/ar(DEF) = (BC/EF)² = 16/25 ⇒ ar(DEF) = 64×25/16 = 100 cm², so A is true. R (ratio via squares of corresponding altitudes) is a true standard result, but the computation here uses corresponding SIDES, so R does not explain A ⇒ option (b)."
    ],
    "finalAnswer": "Option (b): both true, R not the correct explanation.",
    "ncertRef": "rava.org.in CBSE Objective QB Ch6 (Assertion-Reason 7)",
    "isCompetencyBased": true
  },
  {
    "id": "BX-TRI-EX-A-010",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Basic Proportionality Theorem",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "requiresDiagram": false,
    "questionText": "In △ABC, DE ∥ BC with D on AB and E on AC. If DE = 5 cm, BC = 8 cm and AD = 3.5 cm, then AB equals:",
    "options": [
      "5.6 cm",
      "4.8 cm",
      "5.2 cm",
      "6.4 cm"
    ],
    "answer": "5.6 cm",
    "solutionSteps": [
      "[1 mark] DE ∥ BC ⇒ △ADE ~ △ABC, so AD/AB = DE/BC ⇒ 3.5/AB = 5/8 ⇒ AB = 3.5×8/5 = 5.6 cm."
    ],
    "finalAnswer": "5.6 cm — option (a).",
    "ncertRef": "Question-Bank-with-Explanations Ch6 Q5",
    "isCompetencyBased": false,
    "strategyHint": "AD/AB = DE/BC from △ADE ~ △ABC."
  },
  {
    "id": "BX-TRI-EX-B-001",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Basic Proportionality Theorem",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "requiresDiagram": false,
    "questionText": "In △KMN, P lies on KM and Q lies on KN such that PQ ∥ MN. If KP : PM = 4 : 13 and KN = 20.4 cm, find KQ.",
    "answer": "Since PQ ∥ MN, by BPT KP/PM = KQ/QN, so KP/KM = KQ/KN. KP : KM = 4 : (4+13) = 4 : 17. Hence KQ = (4/17) × 20.4 = 4.8 cm.",
    "solutionSteps": [
      "[1 mark] PQ ∥ MN ⇒ by BPT KP/PM = KQ/QN ⇒ KP/KM = KQ/KN = 4/17 (since KP : KM = 4 : 4+13).",
      "[1 mark] KQ = (4/17) × 20.4 = 4.8 cm."
    ],
    "finalAnswer": "KQ = 4.8 cm.",
    "ncertRef": "rava.org.in PYQ Ch6 VSA Q4",
    "isCompetencyBased": false,
    "strategyHint": "Convert the part-ratio KP:PM into the whole-ratio KP:KM before applying BPT to KN."
  },
  {
    "id": "BX-TRI-EX-B-002",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Pythagoras Theorem",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "requiresDiagram": false,
    "questionText": "ABCD is a rectangle with AB = 6 cm and AD = 3 cm. E is a point on AB such that AE = (2/3)AB. Find the length of DE.",
    "answer": "AE = (2/3)(6) = 4 cm. In the right triangle ADE (right angle at A), DE² = AD² + AE² = 3² + 4² = 9 + 16 = 25, so DE = 5 cm.",
    "solutionSteps": [
      "[1 mark] AE = (2/3) × 6 = 4 cm; △ADE is right-angled at A (adjacent sides of a rectangle).",
      "[1 mark] DE = √(AD² + AE²) = √(9 + 16) = √25 = 5 cm."
    ],
    "finalAnswer": "DE = 5 cm.",
    "ncertRef": "rava.org.in PYQ Ch6 SA-I Q16",
    "isCompetencyBased": true,
    "strategyHint": "Find AE first, then apply Pythagoras in right triangle ADE."
  },
  {
    "id": "BX-TRI-EX-B-003",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Basic Proportionality Theorem",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "requiresDiagram": false,
    "questionText": "In △PQR, S lies on PQ and T lies on PR with ST ∥ QR. If PS : SQ = 3 : 5 and PR = 28 cm, find PT.",
    "answer": "ST ∥ QR ⇒ by BPT PS/SQ = PT/TR, so PS/PQ = PT/PR = 3/(3+5) = 3/8. Hence PT = (3/8) × 28 = 10.5 cm.",
    "solutionSteps": [
      "[1 mark] ST ∥ QR ⇒ PS/SQ = PT/TR ⇒ PS/PQ = PT/PR = 3/8 (from PS : SQ = 3 : 5).",
      "[1 mark] PT = (3/8) × 28 = 10.5 cm."
    ],
    "finalAnswer": "PT = 10.5 cm.",
    "ncertRef": "rava.org.in PYQ Ch6 SA-I Q13",
    "isCompetencyBased": false,
    "strategyHint": "Use PS : PQ = 3 : 8, then PT = (PS/PQ)·PR."
  },
  {
    "id": "BX-TRI-EX-C-002",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Areas of Similar Triangles",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "requiresDiagram": false,
    "questionText": "In △ABC, DE ∥ BC with D on AB and E on AC. If AD = 1.5 cm and DB = 2·AD, find the ratio of the area of trapezium BCED to the area of △ADE.",
    "answer": "DB = 2 × 1.5 = 3 cm, so AB = AD + DB = 4.5 cm. DE ∥ BC ⇒ △ADE ~ △ABC, so ar(ADE)/ar(ABC) = (AD/AB)² = (1.5/4.5)² = 1/9. Then ar(BCED) = ar(ABC) − ar(ADE) gives ar(BCED)/ar(ADE) = (9 − 1)/1 = 8, i.e. 8 : 1.",
    "solutionSteps": [
      "[1 mark] DB = 2 × 1.5 = 3 cm ⇒ AB = 1.5 + 3 = 4.5 cm; DE ∥ BC ⇒ △ADE ~ △ABC.",
      "[1 mark] ar(ADE)/ar(ABC) = (AD/AB)² = (1.5/4.5)² = 1/9.",
      "[1 mark] ar(BCED) = ar(ABC) − ar(ADE) ⇒ ar(BCED) : ar(ADE) = (9 − 1) : 1 = 8 : 1."
    ],
    "finalAnswer": "ar(trapezium BCED) : ar(△ADE) = 8 : 1.",
    "ncertRef": "rava.org.in PYQ Ch6 SA-I Q8",
    "isCompetencyBased": true,
    "strategyHint": "Trapezium area = whole − small triangle; use the (side ratio)² = 1/9 result."
  },
  {
    "id": "BX-TRI-EX-C-003",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Pythagoras Theorem",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "requiresDiagram": false,
    "questionText": "In △PQR, ∠QPR = 90°, PQ = 24 cm and QR = 26 cm. A point K is such that ∠PKR = 90° and KR = 8 cm. Find PR and PK.",
    "answer": "In right △PQR (right angle at P), PR = √(QR² − PQ²) = √(26² − 24²) = √(676 − 576) = √100 = 10 cm. In right △PKR (right angle at K), PR is the hypotenuse, so PK = √(PR² − KR²) = √(10² − 8²) = √(100 − 64) = √36 = 6 cm.",
    "solutionSteps": [
      "[1 mark] In right △PQR: PR = √(QR² − PQ²) = √(676 − 576) = √100 = 10 cm.",
      "[1 mark] In right △PKR (right-angled at K), PR is the hypotenuse: PK = √(PR² − KR²) = √(100 − 64).",
      "[1 mark] PK = √36 = 6 cm."
    ],
    "finalAnswer": "PR = 10 cm, PK = 6 cm.",
    "ncertRef": "rava.org.in PYQ Ch6 SA-I Q9",
    "isCompetencyBased": false,
    "strategyHint": "Apply Pythagoras in the first right triangle to get PR, then in the second."
  },
  {
    "id": "BX-TRI-EX-C-004",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Pythagoras Theorem",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "requiresDiagram": false,
    "questionText": "From an airport two aeroplanes start at the same time — one flies due north at 500 km/h and the other due east at 650 km/h. Find the distance between the two aeroplanes after 2 hours.",
    "answer": "North distance = 500 × 2 = 1000 km; east distance = 650 × 2 = 1300 km. The two directions are perpendicular, so distance = √(1000² + 1300²) = √(1000000 + 1690000) = √2690000 ≈ 1640.12 km.",
    "solutionSteps": [
      "[1 mark] Distance north = 500 × 2 = 1000 km; distance east = 650 × 2 = 1300 km; the paths are perpendicular (N ⟂ E).",
      "[1 mark] Distance between them = √(1000² + 1300²) = √(1000000 + 1690000) = √2690000.",
      "[1 mark] √2690000 ≈ 1640.12 km."
    ],
    "finalAnswer": "≈ 1640.12 km (√2690000 km).",
    "ncertRef": "rava.org.in PYQ Ch6 SA-II Q8",
    "isCompetencyBased": true,
    "strategyHint": "Convert speeds to distances (×2 h), then Pythagoras on the perpendicular legs."
  },
  {
    "id": "BX-TRI-EX-C-005",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Criteria for Similarity",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "requiresDiagram": false,
    "questionText": "In △ABC, P lies on AB and Q lies on AC with AP = 3.5 cm, PB = 7 cm, AQ = 3 cm and QC = 6 cm. If PQ = 4.5 cm, find BC.",
    "answer": "AB = AP + PB = 10.5 cm and AC = AQ + QC = 9 cm. AP/AB = 3.5/10.5 = 1/3 and AQ/AC = 3/9 = 1/3, with ∠A common ⇒ △APQ ~ △ABC by SAS similarity. Hence PQ/BC = 1/3 ⇒ BC = 3 × 4.5 = 13.5 cm.",
    "solutionSteps": [
      "[1 mark] AB = 3.5 + 7 = 10.5 cm, AC = 3 + 6 = 9 cm; AP/AB = 1/3 and AQ/AC = 1/3.",
      "[1 mark] Two sides proportional and included ∠A common ⇒ △APQ ~ △ABC (SAS similarity).",
      "[1 mark] PQ/BC = 1/3 ⇒ BC = 3 × 4.5 = 13.5 cm."
    ],
    "finalAnswer": "BC = 13.5 cm.",
    "ncertRef": "rava.org.in PYQ Ch6 SA-II Q12",
    "isCompetencyBased": false,
    "strategyHint": "Check AP/AB = AQ/AC with the common angle A to establish SAS similarity, then scale PQ."
  },
  {
    "id": "BX-TRI-EX-C-006",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Criteria for Similarity",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "requiresDiagram": false,
    "questionText": "Two line segments BC and PQ satisfy BC ∥ PQ, and the lines BQ and CP intersect at a point A (with B, A, Q collinear and C, A, P collinear). If BC = 8 cm, PQ = 4 cm, BA = 6.5 cm and AP = 2.8 cm, find CA and AQ.",
    "answer": "BC ∥ PQ ⇒ ∠ABC = ∠AQP (alternate angles) and ∠BAC = ∠QAP (vertically opposite) ⇒ △ABC ~ △AQP (AA). So AB/AQ = BC/QP = CA/PA = 8/4 = 2. Hence AQ = AB/2 = 6.5/2 = 3.25 cm and CA = 2 × PA = 2 × 2.8 = 5.6 cm.",
    "solutionSteps": [
      "[1 mark] BC ∥ PQ ⇒ ∠ABC = ∠AQP (alternate) and ∠BAC = ∠QAP (vertically opposite) ⇒ △ABC ~ △AQP (AA).",
      "[1 mark] Corresponding sides: AB/AQ = BC/QP = CA/PA = 8/4 = 2.",
      "[1 mark] AQ = AB/2 = 6.5/2 = 3.25 cm; CA = 2 × PA = 2 × 2.8 = 5.6 cm."
    ],
    "finalAnswer": "CA = 5.6 cm, AQ = 3.25 cm.",
    "ncertRef": "rava.org.in PYQ Ch6 SA-II Q26",
    "isCompetencyBased": false,
    "strategyHint": "The X-shaped figure gives △ABC ~ △AQP by AA; the constant ratio is BC : PQ = 2."
  },
];
