import type { CanonicalQuestion } from "../../../predictionTypes";

// Bank-Expansion Batch 11 — coordinate-geometry, Section D (5-mark Long Answer)
// CBSE 2026-27, TOPIC 2. IN = Distance formula + Section formula (internal division,
// midpoint, ratio) ONLY. Area-of-triangle / collinearity-by-area is guard-BANNED and
// NEVER used here. Thin chapter → honest-stop below 75 (13 genuinely distinct setups).
// Deduped vs 15 banked D. Every solutionSteps entry [N mark]-prefixed, 5 steps summing to 5.
// requiresDiagram:false — every configuration is fully described in words (student self-draws).

export const COORD_EXPAND_LONG_D: CanonicalQuestion[] = [
  { id: "BX-COORD-D-001", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Section Formula", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Applying", requiresDiagram: false,
    questionText: "Three consecutive vertices of a parallelogram ABCD taken in order are A(1, 2), B(4, 3) and C(6, 6). Using the property that the diagonals of a parallelogram bisect each other, find the coordinates of the fourth vertex D.",
    answer: "In a parallelogram the diagonals AC and BD bisect each other, so midpoint of AC = midpoint of BD. Midpoint of AC = ((1+6)/2, (2+6)/2) = (7/2, 4). Let D = (x, y); midpoint of BD = ((4+x)/2, (3+y)/2). Equate: (4+x)/2 = 7/2 ⇒ x = 3; (3+y)/2 = 4 ⇒ y = 5. So D = (3, 5). Check: AB = C−D vector: B−A = (3, 1) and C−D = (3, 1), confirming AB ∥ = DC.",
    solutionSteps: ["[1 mark] Property: diagonals of a parallelogram bisect each other ⇒ midpoint of diagonal AC = midpoint of diagonal BD.", "[1 mark] Midpoint of AC = ((1+6)/2, (2+6)/2) = (7/2, 4).", "[1 mark] Let D = (x, y). Midpoint of BD = ((4+x)/2, (3+y)/2).", "[1 mark] Equate x: (4+x)/2 = 7/2 ⇒ x = 3. Equate y: (3+y)/2 = 4 ⇒ y = 5.", "[1 mark] D = (3, 5). Verify: B−A = (3, 1) and C−D = (3, 1) so AB ∥ = DC. Hence ABCD is a parallelogram."],
    finalAnswer: "D = (3, 5).",
    isCompetencyBased: true, strategyHint: "For a parallelogram, set midpoint of one diagonal equal to midpoint of the other and solve." },

  { id: "BX-COORD-D-002", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Distance Formula", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false,
    questionText: "Verify that the points A(−2, −1), B(1, 0), C(4, 3) and D(1, 2), taken in order, form a parallelogram. Using the lengths of the diagonals, decide further whether it is a rectangle.",
    answer: "AB = √[(1+2)²+(0+1)²] = √(9+1) = √10. BC = √[(4−1)²+(3−0)²] = √(9+9) = √18. CD = √[(1−4)²+(2−3)²] = √(9+1) = √10. DA = √[(−2−1)²+(−1−2)²] = √(9+9) = √18. Opposite sides equal (AB = CD = √10, BC = DA = √18) ⇒ parallelogram. Diagonals: AC = √[(4+2)²+(3+1)²] = √(36+16) = √52; BD = √[(1−1)²+(2−0)²] = √4 = 2. Since AC ≠ BD, it is NOT a rectangle.",
    solutionSteps: ["[1 mark] AB = √[(1+2)²+(0+1)²] = √10 and CD = √[(1−4)²+(2−3)²] = √10.", "[1 mark] BC = √[(4−1)²+(3−0)²] = √18 and DA = √[(−2−1)²+(−1−2)²] = √18.", "[1 mark] AB = CD and BC = DA ⇒ both pairs of opposite sides equal ⇒ ABCD is a parallelogram.", "[1 mark] Diagonal AC = √[(4+2)²+(3+1)²] = √52; diagonal BD = √[(1−1)²+(2−0)²] = 2.", "[1 mark] AC ≠ BD, so the diagonals are unequal ⇒ ABCD is a parallelogram but NOT a rectangle."],
    finalAnswer: "Parallelogram (opposite sides equal); not a rectangle (AC = √52 ≠ BD = 2).",
    isCompetencyBased: true, strategyHint: "Opposite sides equal ⇒ parallelogram; add the equal-diagonal test only to upgrade to a rectangle." },

  { id: "BX-COORD-D-003", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Distance Formula", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false,
    questionText: "The corners of a rhombus-shaped tile are marked A(3, 0), B(4, 5), C(−1, 4) and D(−2, −1). Show that all four sides are equal, and by comparing the diagonals prove that the tile is a rhombus but not a square.",
    answer: "AB = √[(4−3)²+(5−0)²] = √(1+25) = √26. BC = √[(−1−4)²+(4−5)²] = √(25+1) = √26. CD = √[(−2+1)²+(−1−4)²] = √(1+25) = √26. DA = √[(3+2)²+(0+1)²] = √(25+1) = √26. All sides equal ⇒ rhombus. Diagonals: AC = √[(−1−3)²+(4−0)²] = √(16+16) = √32; BD = √[(−2−4)²+(−1−5)²] = √(36+36) = √72. AC ≠ BD, so it is a rhombus but not a square (a square needs equal diagonals).",
    solutionSteps: ["[1 mark] AB = √[(4−3)²+(5−0)²] = √26 and BC = √[(−1−4)²+(4−5)²] = √26.", "[1 mark] CD = √[(−2+1)²+(−1−4)²] = √26 and DA = √[(3+2)²+(0+1)²] = √26.", "[1 mark] AB = BC = CD = DA = √26 ⇒ all four sides equal ⇒ ABCD is a rhombus.", "[1 mark] Diagonal AC = √[(−1−3)²+(4−0)²] = √32; diagonal BD = √[(−2−4)²+(−1−5)²] = √72.", "[1 mark] AC ≠ BD ⇒ the diagonals are unequal, so it is a rhombus but NOT a square."],
    finalAnswer: "All sides = √26 (rhombus); AC = √32 ≠ BD = √72, so not a square.",
    isCompetencyBased: true, strategyHint: "All sides equal ⇒ rhombus; a square additionally needs equal diagonals." },

  { id: "BX-COORD-D-004", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Distance Formula", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false,
    questionText: "Prove that the quadrilateral with vertices P(1, 1), Q(5, 3), R(4, 5) and S(0, 3), taken in order, is a rectangle by showing its opposite sides are equal, its two diagonals are equal, and its adjacent sides are unequal.",
    answer: "Sides: PQ = √[(5−1)²+(3−1)²] = √(16+4) = √20. QR = √[(4−5)²+(5−3)²] = √(1+4) = √5. RS = √[(0−4)²+(3−5)²] = √(16+4) = √20. SP = √[(1−0)²+(1−3)²] = √(1+4) = √5. So PQ = RS = √20 and QR = SP = √5 (opposite sides equal, adjacent sides unequal). Diagonals: PR = √[(4−1)²+(5−1)²] = √(9+16) = 5; QS = √[(0−5)²+(3−3)²] = √25 = 5. Opposite sides equal AND equal diagonals AND adjacent sides unequal ⇒ PQRS is a rectangle (not a square).",
    solutionSteps: ["[1 mark] PQ = √[(5−1)²+(3−1)²] = √20 and RS = √[(0−4)²+(3−5)²] = √20.", "[1 mark] QR = √[(4−5)²+(5−3)²] = √5 and SP = √[(1−0)²+(1−3)²] = √5. Opposite sides equal.", "[1 mark] Adjacent sides PQ = √20 and QR = √5 are unequal ⇒ not a rhombus/square.", "[1 mark] Diagonals PR = √[(4−1)²+(5−1)²] = 5 and QS = √[(0−5)²+(3−3)²] = 5.", "[1 mark] Opposite sides equal + diagonals equal (5 = 5) + adjacent sides unequal ⇒ PQRS is a rectangle."],
    finalAnswer: "PQRS is a rectangle: PQ = RS = √20, QR = SP = √5, PR = QS = 5.",
    isCompetencyBased: true, strategyHint: "Rectangle test: opposite sides equal, diagonals equal, and adjacent sides unequal (else it is a square)." },

  { id: "BX-COORD-D-005", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Distance Formula", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing", requiresDiagram: false,
    questionText: "Find the coordinates of the point P that is equidistant from the three points A(7, 3), B(2, 8) and C(6, 0). Also find the common distance PA (the circumradius).",
    answer: "Let P(x, y) with PA² = PB² and PB² = PC². PA² = PB²: (x−7)²+(y−3)² = (x−2)²+(y−8)² ⇒ −14x+49−6y+9 = −4x+4−16y+64 ⇒ −10x+10y−10 = 0 ⇒ x − y + 1 = 0. PB² = PC²: (x−2)²+(y−8)² = (x−6)²+y² ⇒ −4x+4−16y+64 = −12x+36 ⇒ 8x−16y+32 = 0 ⇒ x − 2y + 4 = 0. Subtracting the two: (x−y+1) − (x−2y+4) = 0 ⇒ y − 3 = 0 ⇒ y = 3, then x = 2. So P(2, 3). PA = √[(7−2)²+(3−3)²] = √25 = 5.",
    solutionSteps: ["[1 mark] Let P(x, y) be equidistant from A, B, C, so PA² = PB² and PB² = PC².", "[1 mark] PA² = PB²: (x−7)²+(y−3)² = (x−2)²+(y−8)² ⇒ x − y + 1 = 0.", "[1 mark] PB² = PC²: (x−2)²+(y−8)² = (x−6)²+y² ⇒ x − 2y + 4 = 0.", "[1 mark] Solve the two linear equations: subtracting gives y = 3, and x − y + 1 = 0 ⇒ x = 2. So P(2, 3).", "[1 mark] Common distance PA = √[(7−2)²+(3−3)²] = √25 = 5 units (the circumradius)."],
    finalAnswer: "P(2, 3); common distance PA = PB = PC = 5.",
    isCompetencyBased: true, strategyHint: "Equidistant from three points ⇒ set PA²=PB² and PB²=PC² to get two linear equations; solve." },

  { id: "BX-COORD-D-006", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Section Formula", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Applying", requiresDiagram: false,
    questionText: "Find the ratio in which the x-axis divides the line segment joining the points A(2, −3) and B(5, 6). Also find the coordinates of the point of division and its distance from the origin.",
    answer: "Let the x-axis divide AB in ratio k : 1. Its y-coordinate is 0, so by section formula y = (6k + (−3)·1)/(k+1) = 0 ⇒ 6k − 3 = 0 ⇒ k = 1/2, giving ratio 1 : 2. x-coordinate: x = (1·5 + 2·2)/(1+2) = (5+4)/3 = 3. Point of division = (3, 0). Distance from origin = √(3²+0²) = 3 units.",
    solutionSteps: ["[1 mark] Let the x-axis divide AB in ratio k : 1; a point on the x-axis has y = 0.", "[1 mark] y = (6k + (−3)·1)/(k+1) = 0 ⇒ 6k − 3 = 0 ⇒ k = 1/2 ⇒ ratio = 1 : 2.", "[1 mark] Using ratio 1 : 2, x = (1·5 + 2·2)/(1+2) = 9/3 = 3.", "[1 mark] Point of division = (3, 0).", "[1 mark] Distance from the origin = √(3² + 0²) = 3 units."],
    finalAnswer: "Ratio 1 : 2; point (3, 0); distance from origin = 3.",
    isCompetencyBased: true, strategyHint: "On the x-axis y = 0 — set the section-formula y equal to 0 to get the ratio, then find x." },

  { id: "BX-COORD-D-007", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Section Formula", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false,
    questionText: "For the triangle with vertices A(−1, 3), B(5, 1) and C(2, −4): (i) find the centroid G by averaging the vertices; (ii) find the midpoint D of side BC; and (iii) verify that G divides the median AD internally in the ratio 2 : 1.",
    answer: "(i) Centroid G = ((−1+5+2)/3, (3+1−4)/3) = (6/3, 0/3) = (2, 0). (ii) Midpoint of BC: D = ((5+2)/2, (1−4)/2) = (7/2, −3/2). (iii) Point dividing AD in ratio 2 : 1 from A: x = (2·(7/2) + 1·(−1))/3 = (7−1)/3 = 2; y = (2·(−3/2) + 1·3)/3 = (−3+3)/3 = 0. This equals (2, 0) = G, so G divides median AD in ratio 2 : 1.",
    solutionSteps: ["[1 mark] Centroid G = ((−1+5+2)/3, (3+1−4)/3) = (2, 0).", "[1 mark] Midpoint of BC: D = ((5+2)/2, (1−4)/2) = (7/2, −3/2).", "[1 mark] Apply section formula to divide AD in ratio 2 : 1 (from A): x = (2·(7/2) + 1·(−1))/(2+1).", "[1 mark] x = (7 − 1)/3 = 2; y = (2·(−3/2) + 1·3)/3 = (−3 + 3)/3 = 0.", "[1 mark] The 2 : 1 point (2, 0) coincides with G, verifying that the centroid divides the median AD in ratio 2 : 1."],
    finalAnswer: "G = (2, 0); D = (7/2, −3/2); the 2 : 1 point of AD is (2, 0) = G. Verified.",
    isCompetencyBased: true, strategyHint: "Compute centroid by averaging, then use the section formula on the median with ratio 2 : 1 to confirm." },

  { id: "BX-COORD-D-008", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Distance Formula", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false,
    questionText: "The distance between the points P(3, −2) and Q(11, y) is 10 units. Find all possible values of y, and for each value find the coordinates of the midpoint of PQ.",
    answer: "PQ² = 100: (11−3)² + (y+2)² = 100 ⇒ 64 + (y+2)² = 100 ⇒ (y+2)² = 36 ⇒ y + 2 = ±6 ⇒ y = 4 or y = −8. For y = 4: midpoint = ((3+11)/2, (−2+4)/2) = (7, 1). For y = −8: midpoint = ((3+11)/2, (−2−8)/2) = (7, −5).",
    solutionSteps: ["[1 mark] Apply distance formula: PQ² = (11−3)² + (y−(−2))² = 100.", "[1 mark] 64 + (y+2)² = 100 ⇒ (y+2)² = 36.", "[1 mark] y + 2 = ±6 ⇒ y = 4 or y = −8.", "[1 mark] For y = 4: midpoint of PQ = ((3+11)/2, (−2+4)/2) = (7, 1).", "[1 mark] For y = −8: midpoint of PQ = ((3+11)/2, (−2−8)/2) = (7, −5)."],
    finalAnswer: "y = 4 (midpoint (7, 1)) or y = −8 (midpoint (7, −5)).",
    isCompetencyBased: true, strategyHint: "Square the distance to form a quadratic in y; solve for both roots, then apply the midpoint formula to each." },

  { id: "BX-COORD-D-009", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Distance Formula", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing", requiresDiagram: false,
    questionText: "(i) Find the point P on the x-axis that is equidistant from A(2, −5) and B(−2, 9). (ii) Find this equal distance PA. (iii) Determine whether the point C(2, 5) lies on the circle centred at P that passes through A and B.",
    answer: "(i) P = (x, 0) on the x-axis. PA² = PB²: (x−2)²+25 = (x+2)²+81 ⇒ x²−4x+4+25 = x²+4x+4+81 ⇒ −4x+29 = 4x+85 ⇒ −8x = 56 ⇒ x = −7. So P(−7, 0). (ii) PA = √[(−7−2)²+(0+5)²] = √(81+25) = √106, which is the radius. (iii) PC = √[(2+7)²+(5−0)²] = √(81+25) = √106 = PA. Since PC equals the radius, C(2, 5) lies on the circle.",
    solutionSteps: ["[1 mark] A point on the x-axis is P(x, 0); set PA² = PB² since P is equidistant from A and B.", "[1 mark] (x−2)²+25 = (x+2)²+81 ⇒ −4x+29 = 4x+85 ⇒ x = −7, so P(−7, 0).", "[1 mark] Equal distance PA = √[(−7−2)²+(0+5)²] = √(81+25) = √106 (the radius).", "[1 mark] PC = √[(2+7)²+(5−0)²] = √(81+25) = √106.", "[1 mark] PC = √106 = radius, so C(2, 5) lies on the circle centred at P through A and B."],
    finalAnswer: "P(−7, 0); PA = √106; yes, C(2, 5) lies on the circle (PC = √106).",
    isCompetencyBased: true, strategyHint: "On the x-axis y = 0; solve PA²=PB² for x, then a point lies on the circle iff its distance from the centre equals the radius." },

  { id: "BX-COORD-D-010", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Section Formula", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false,
    questionText: "Find the coordinates P and Q of the two points of trisection of the line segment joining A(4, −1) and B(−2, −7). Then verify that the trisection point Q nearer to B is equidistant from R(−3, −1) and S(3, −9).",
    answer: "P divides AB in ratio 1 : 2: P = ((1·(−2)+2·4)/3, (1·(−7)+2·(−1))/3) = ((−2+8)/3, (−7−2)/3) = (2, −3). Q divides AB in ratio 2 : 1: Q = ((2·(−2)+1·4)/3, (2·(−7)+1·(−1))/3) = ((−4+4)/3, (−14−1)/3) = (0, −5). QR = √[(−3−0)²+(−1+5)²] = √(9+16) = 5; QS = √[(3−0)²+(−9+5)²] = √(9+16) = 5. Since QR = QS = 5, Q is equidistant from R and S.",
    solutionSteps: ["[1 mark] First trisection point P divides AB in ratio 1 : 2: P = ((1·(−2)+2·4)/3, (1·(−7)+2·(−1))/3) = (2, −3).", "[1 mark] Second trisection point Q divides AB in ratio 2 : 1: Q = ((2·(−2)+1·4)/3, (2·(−7)+1·(−1))/3) = (0, −5).", "[1 mark] QR = √[(−3−0)²+(−1+5)²] = √(9+16) = 5.", "[1 mark] QS = √[(3−0)²+(−9+5)²] = √(9+16) = 5.", "[1 mark] QR = QS = 5, so Q is equidistant from R(−3, −1) and S(3, −9)."],
    finalAnswer: "P(2, −3), Q(0, −5); QR = QS = 5, so Q is equidistant from R and S.",
    isCompetencyBased: true, strategyHint: "Trisection points divide in 1 : 2 and 2 : 1; then apply the distance formula to check equidistance." },

  { id: "BX-COORD-D-011", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Section Formula", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Applying", requiresDiagram: false,
    questionText: "Find the coordinates of the three points that divide the line segment joining A(−4, 0) and B(4, 8) into four equal parts. Verify your answer by checking that consecutive points are equally spaced.",
    answer: "The three points divide AB in ratios 1 : 3, 1 : 1 (midpoint) and 3 : 1. P₁ (1 : 3): ((1·4+3·(−4))/4, (1·8+3·0)/4) = ((4−12)/4, 8/4) = (−2, 2). P₂ (midpoint): ((−4+4)/2, (0+8)/2) = (0, 4). P₃ (3 : 1): ((3·4+1·(−4))/4, (3·8+1·0)/4) = ((12−4)/4, 24/4) = (2, 6). Consecutive gaps: A→P₁ = (2, 2), P₁→P₂ = (2, 2), P₂→P₃ = (2, 2), P₃→B = (2, 2), all equal ⇒ four equal parts.",
    solutionSteps: ["[1 mark] The three points divide AB in ratios 1 : 3, 1 : 1 and 3 : 1.", "[1 mark] P₁ (1 : 3) = ((1·4+3·(−4))/4, (1·8+3·0)/4) = (−2, 2).", "[1 mark] P₂ (midpoint) = ((−4+4)/2, (0+8)/2) = (0, 4).", "[1 mark] P₃ (3 : 1) = ((3·4+1·(−4))/4, (3·8+1·0)/4) = (2, 6).", "[1 mark] Each consecutive gap is the vector (2, 2), so the four parts are equal. Points: (−2, 2), (0, 4), (2, 6)."],
    finalAnswer: "(−2, 2), (0, 4) and (2, 6); each of the four parts has equal spacing (2, 2).",
    isCompetencyBased: true, strategyHint: "Four equal parts ⇒ divide in ratios 1 : 3, 1 : 1 and 3 : 1 via the section formula." },

  { id: "BX-COORD-D-012", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Distance Formula", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false,
    questionText: "A kite-shaped design has corners A(0, 6), B(3, 0), C(0, −4) and D(−3, 0), taken in order. Using side lengths, show that AB = AD and CB = CD, and by comparing all four sides and the two diagonals, explain why the figure is a kite and not a rhombus.",
    answer: "AB = √[(3−0)²+(0−6)²] = √(9+36) = √45. AD = √[(−3−0)²+(0−6)²] = √(9+36) = √45, so AB = AD. CB = √[(3−0)²+(0+4)²] = √(9+16) = 5. CD = √[(−3−0)²+(0+4)²] = √(9+16) = 5, so CB = CD. Two distinct pairs of adjacent sides are equal (√45 and 5) but AB ≠ CB, so not all sides are equal ⇒ it is a kite, not a rhombus. Diagonals: AC = √[0+(6+4)²] = 10; BD = √[(3+3)²+0] = 6; AC ≠ BD, consistent with a kite.",
    solutionSteps: ["[1 mark] AB = √[(3−0)²+(0−6)²] = √45 and AD = √[(−3−0)²+(0−6)²] = √45, so AB = AD.", "[1 mark] CB = √[(3−0)²+(0+4)²] = 5 and CD = √[(−3−0)²+(0+4)²] = 5, so CB = CD.", "[1 mark] Two distinct pairs of adjacent sides are equal (AB = AD = √45, CB = CD = 5).", "[1 mark] Since AB = √45 ≠ CB = 5, the four sides are NOT all equal ⇒ it is a kite, not a rhombus.", "[1 mark] Diagonals AC = √[(6+4)²] = 10 and BD = √[(3+3)²] = 6 are unequal, consistent with a kite."],
    finalAnswer: "AB = AD = √45, CB = CD = 5; a kite (not a rhombus) with diagonals AC = 10, BD = 6.",
    isCompetencyBased: true, strategyHint: "A kite has two distinct pairs of equal ADJACENT sides; a rhombus needs all four equal." },

  { id: "BX-COORD-D-013", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Section Formula", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing", requiresDiagram: false,
    questionText: "The midpoints of the sides BC, CA and AB of a triangle ABC are D(3, 4), E(0, 3) and F(2, 1) respectively. Using the midpoint formula, find the coordinates of the vertices A, B and C.",
    answer: "Since D, E, F are midpoints of BC, CA, AB, the vertex opposite each side equals (sum of the other two midpoints) − (that midpoint): A = E + F − D = (0+2−3, 3+1−4) = (−1, 0). B = F + D − E = (2+3−0, 1+4−3) = (5, 2). C = D + E − F = (3+0−2, 4+3−1) = (1, 6). Check: midpoint of AB = ((−1+5)/2, (0+2)/2) = (2, 1) = F ✓; midpoint of BC = ((5+1)/2, (2+6)/2) = (3, 4) = D ✓.",
    solutionSteps: ["[1 mark] D, E, F are midpoints of BC, CA, AB. Using midpoint relations, A = E + F − D.", "[1 mark] A = (0 + 2 − 3, 3 + 1 − 4) = (−1, 0).", "[1 mark] B = F + D − E = (2 + 3 − 0, 1 + 4 − 3) = (5, 2).", "[1 mark] C = D + E − F = (3 + 0 − 2, 4 + 3 − 1) = (1, 6).", "[1 mark] Check: midpoint of AB = (2, 1) = F and midpoint of BC = (3, 4) = D. Verified."],
    finalAnswer: "A(−1, 0), B(5, 2), C(1, 6).",
    isCompetencyBased: true, strategyHint: "With all three side-midpoints, each vertex = (sum of the other two midpoints) − (opposite-side midpoint)." },
];
