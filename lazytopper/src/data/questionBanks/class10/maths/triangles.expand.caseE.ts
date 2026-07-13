import type { CanonicalQuestion } from "../../../predictionTypes";

// Bank-Expansion Batch 11 — topic: triangles (CBSE Class-10 Maths 2026-27)
// Band: Section E (4-mark Case-Based). Author genuinely-distinct case-based items.
// Every sub-part is Class-10 (Similarity / BPT / Pythagoras / area-ratio only).
// requiresDiagram:false throughout — each configuration is fully described in words.

export const TRI_EXPAND_CASE_E: CanonicalQuestion[] = [
  { id: "BX-TRI-E-001", subject: "Maths", topicKey: "triangles", subtopic: "Similarity criteria and correspondence", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "To measure the height of a building, Ria places a small mirror flat on the level ground and steps back until she just sees the top of the building reflected in it. Her eyes are 1.5 m above the ground, she stands 1.2 m from the mirror, and the mirror is 9.6 m from the foot of the building. Because the angle of incidence equals the angle of reflection, the girl-mirror triangle and the building-mirror triangle are similar.\n(i) State the similarity criterion and the equal angles.\n(ii) Write the proportion relating the building height H to the given lengths.\n(iii) Find the height H of the building.\n(iv) Find the ratio of the areas of the smaller (girl) triangle to the larger (building) triangle.",
    solutionSteps: [
      "[1 mark] (i) Both triangles have a right angle (girl and building are vertical) and equal angles at the mirror (incidence = reflection), so by the AA criterion the triangles are similar.",
      "[1 mark] (ii) Corresponding sides are proportional: H/1.5 = 9.6/1.2.",
      "[1 mark] (iii) H = 1.5 x (9.6/1.2) = 1.5 x 8 = 12 m.",
      "[1 mark] (iv) Ratio of areas = (1.2/9.6)^2 = (1/8)^2 = 1/64, i.e. 1 : 64.",
    ],
    finalAnswer: "(i) AA similarity (ii) H/1.5 = 9.6/1.2 (iii) 12 m (iv) 1 : 64" },

  { id: "BX-TRI-E-002", subject: "Maths", topicKey: "triangles", subtopic: "Similarity criteria and correspondence", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A student measures the width of a canal without crossing it. AB is the width (A on the near bank, B a post on the far bank, with AB perpendicular to the bank direction). She walks 30 m along the bank from A to a rod at C, a further 10 m to D, then turns inland at right angles to the bank and walks until the post B is exactly in line with the rod at C; she has walked DE = 9 m. This makes triangle ABC similar to triangle EDC.\n(i) State the similarity criterion that makes the two triangles similar.\n(ii) Write the proportion for the width AB.\n(iii) Find the width AB of the canal.\n(iv) Find the ratio of the areas of triangle ABC to triangle EDC.",
    solutionSteps: [
      "[1 mark] (i) Right angles at A and D are equal, and the angles at C are vertically opposite (equal), so by AA the triangles are similar.",
      "[1 mark] (ii) Corresponding sides: AB/DE = AC/DC, i.e. AB/9 = 30/10.",
      "[1 mark] (iii) AB = 9 x (30/10) = 9 x 3 = 27 m.",
      "[1 mark] (iv) Ratio of areas = (AC/DC)^2 = (30/10)^2 = 9 : 1.",
    ],
    finalAnswer: "(i) AA similarity (ii) AB/9 = 30/10 (iii) 27 m (iv) 9 : 1" },

  { id: "BX-TRI-E-003", subject: "Maths", topicKey: "triangles", subtopic: "Pythagoras Theorem", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "During a storm a straight vertical tree cracks at a point B above the ground. The upper part bends over (still attached at B) and its tip touches the ground at a point 5 m from the foot of the tree. The broken (bent) part measures 13 m.\n(i) Explain why the figure formed is a right triangle and name the right angle.\n(ii) Find the height of the standing part (foot to the crack B).\n(iii) Find the original total height of the tree.\n(iv) Find the area of the right triangle formed by the standing part, the ground distance and the bent part.",
    solutionSteps: [
      "[1 mark] (i) The standing part is vertical and the ground is horizontal, so the triangle is right-angled at the foot of the tree; the bent part is the hypotenuse.",
      "[1 mark] (ii) Height BC: BC^2 = 13^2 - 5^2 = 169 - 25 = 144, so BC = 12 m.",
      "[1 mark] (iii) Original height = standing part 12 m + bent part 13 m = 25 m.",
      "[1 mark] (iv) Area = 1/2 x 5 x 12 = 30 m^2.",
    ],
    finalAnswer: "(i) right angle at the foot (ii) 12 m (iii) 25 m (iv) 30 m^2" },

  { id: "BX-TRI-E-004", subject: "Maths", topicKey: "triangles", subtopic: "Similarity criteria and correspondence", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A wheelchair ramp is built as a right triangle: it rises 2.5 m over a horizontal run of 6 m. A larger stage ramp of the same design rises 5 m over a horizontal run of 12 m.\n(i) Find the sloping (surface) length of the first ramp.\n(ii) Show the two ramp triangles are similar and state the criterion.\n(iii) Find the ratio of their areas.\n(iv) If the first ramp's triangular side needs 15 m^2 of board, how much does the second need?",
    solutionSteps: [
      "[1 mark] (i) Length = sqrt(6^2 + 2.5^2) = sqrt(36 + 6.25) = sqrt(42.25) = 6.5 m.",
      "[1 mark] (ii) 6/12 = 2.5/5 = 1/2 (two sides in the same ratio with the included right angle equal), so by SAS the triangles are similar.",
      "[1 mark] (iii) Ratio of areas = (1/2)^2 = 1/4.",
      "[1 mark] (iv) Second board area = 4 x 15 = 60 m^2.",
    ],
    finalAnswer: "(i) 6.5 m (ii) SAS similarity, ratio 1:2 (iii) 1 : 4 (iv) 60 m^2" },

  { id: "BX-TRI-E-005", subject: "Maths", topicKey: "triangles", subtopic: "Pythagoras Theorem", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A carpenter builds a staircase whose stringer is the hypotenuse of a right triangle with total rise 3 m and total run 4 m. A client then asks for a steeper staircase keeping the same run 4 m but with rise 7.5 m.\n(i) Find the stringer length of the first staircase.\n(ii) Find the stringer length of the steeper staircase.\n(iii) By how much is the second stringer longer?\n(iv) Are the two staircase triangles similar? Justify by comparing side ratios.",
    solutionSteps: [
      "[1 mark] (i) Stringer = sqrt(3^2 + 4^2) = sqrt(25) = 5 m.",
      "[1 mark] (ii) Stringer = sqrt(7.5^2 + 4^2) = sqrt(56.25 + 16) = sqrt(72.25) = 8.5 m.",
      "[1 mark] (iii) Difference = 8.5 - 5 = 3.5 m.",
      "[1 mark] (iv) rise:run for first = 3:4, for second = 7.5:4; since 3/4 is not equal to 7.5/4, the triangles are NOT similar.",
    ],
    finalAnswer: "(i) 5 m (ii) 8.5 m (iii) 3.5 m (iv) not similar (unequal side ratios)" },

  { id: "BX-TRI-E-006", subject: "Maths", topicKey: "triangles", subtopic: "Areas of Similar Triangles", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A symmetric roof truss is an isosceles triangle ABC with horizontal base BC (the span) = 16 m and apex A at a vertical rise of 6 m above the midpoint of BC. A horizontal tie-beam DE joins the midpoints of the two rafters AB and AC.\n(i) Find the length of one rafter AB.\n(ii) Find the length of the tie-beam DE.\n(iii) Find the ratio of the area of triangle ADE to the area of triangle ABC.\n(iv) If triangle ABC has area 48 m^2, find the area of triangle ADE.",
    solutionSteps: [
      "[1 mark] (i) Half-span = 8 m, rise = 6 m, so AB = sqrt(8^2 + 6^2) = sqrt(100) = 10 m.",
      "[1 mark] (ii) D, E are midpoints, so DE is parallel to BC and DE = 1/2 BC = 8 m (mid-point theorem / BPT).",
      "[1 mark] (iii) triangle ADE ~ triangle ABC with ratio 1/2, so ratio of areas = (1/2)^2 = 1/4.",
      "[1 mark] (iv) Area of triangle ADE = 1/4 x 48 = 12 m^2.",
    ],
    finalAnswer: "(i) 10 m (ii) 8 m (iii) 1 : 4 (iv) 12 m^2" },

  { id: "BX-TRI-E-007", subject: "Maths", topicKey: "triangles", subtopic: "Areas of Similar Triangles", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "The triangular cross-section of a camping tent is an isosceles triangle with base 6 m and each slanting side 5 m. A larger family tent has the same shape with base 9 m and slanting sides 7.5 m.\n(i) Find the height of the small tent's cross-section.\n(ii) Find the area of the small tent's triangular cross-section.\n(iii) Are the two cross-sections similar? Give the criterion.\n(iv) Find the ratio of their areas.",
    solutionSteps: [
      "[1 mark] (i) Half-base = 3 m, slant = 5 m, so height = sqrt(5^2 - 3^2) = sqrt(16) = 4 m.",
      "[1 mark] (ii) Area = 1/2 x 6 x 4 = 12 m^2.",
      "[1 mark] (iii) 6/9 = 5/7.5 = 2/3 for base and both equal slants, so by SSS the triangles are similar.",
      "[1 mark] (iv) Ratio of areas = (2/3)^2 = 4 : 9.",
    ],
    finalAnswer: "(i) 4 m (ii) 12 m^2 (iii) SSS similarity (2:3) (iv) 4 : 9" },

  { id: "BX-TRI-E-008", subject: "Maths", topicKey: "triangles", subtopic: "Areas of Similar Triangles", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A rectangular photograph 8 cm by 6 cm is enlarged for a poster so that it keeps the same shape (similar). The diagonal of the enlarged poster measures 50 cm.\n(i) Find the diagonal of the original photograph.\n(ii) Find the enlargement (scale) factor.\n(iii) Find the dimensions of the enlarged poster.\n(iv) Find the ratio of the area of the original photograph to the enlarged poster.",
    solutionSteps: [
      "[1 mark] (i) Diagonal = sqrt(8^2 + 6^2) = sqrt(100) = 10 cm.",
      "[1 mark] (ii) Scale factor = 50/10 = 5.",
      "[1 mark] (iii) Enlarged dimensions = 8 x 5 by 6 x 5 = 40 cm by 30 cm.",
      "[1 mark] (iv) Ratio of areas = (1/5)^2 = 1 : 25.",
    ],
    finalAnswer: "(i) 10 cm (ii) 5 (iii) 40 cm x 30 cm (iv) 1 : 25" },

  { id: "BX-TRI-E-009", subject: "Maths", topicKey: "triangles", subtopic: "Similarity in Right Triangles", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A triangular steel bracket ABC is right-angled at B. A strut BD is welded from B perpendicular to the hypotenuse AC, meeting it at D. Measurement gives AD = 9 cm and DC = 4 cm.\n(i) Name the two smaller triangles that are each similar to triangle ABC.\n(ii) Find the length of the strut BD.\n(iii) Find the length of side AB.\n(iv) Find the area of the bracket triangle ABC.",
    solutionSteps: [
      "[1 mark] (i) triangle ADB ~ triangle ABC and triangle BDC ~ triangle ABC (altitude to the hypotenuse of a right triangle).",
      "[1 mark] (ii) BD = sqrt(AD x DC) = sqrt(9 x 4) = 6 cm.",
      "[1 mark] (iii) AB = sqrt(AD x AC) = sqrt(9 x 13) = sqrt(117) = 3 sqrt(13) cm.",
      "[1 mark] (iv) AC = 9 + 4 = 13 cm; area = 1/2 x AC x BD = 1/2 x 13 x 6 = 39 cm^2.",
    ],
    finalAnswer: "(i) triangle ADB and triangle BDC (ii) 6 cm (iii) 3 sqrt(13) cm (iv) 39 cm^2" },

  { id: "BX-TRI-E-010", subject: "Maths", topicKey: "triangles", subtopic: "Converse of Pythagoras", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Evaluating", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A mason wants to be sure the corner of a rectangular floor is a true right angle. From the corner he measures 60 cm along one wall and 80 cm along the other, and finds the straight distance between the two marks is 100 cm. On a second corner he measures 60 cm, 80 cm and 90 cm.\n(i) State the theorem that decides whether a corner is a right angle.\n(ii) Is the first corner a right angle? Show working.\n(iii) Is the second corner a right angle? Show working.\n(iv) For the second corner, what should the diagonal be for a true right angle?",
    solutionSteps: [
      "[1 mark] (i) The converse of the Pythagoras theorem.",
      "[1 mark] (ii) 60^2 + 80^2 = 3600 + 6400 = 10000 = 100^2, so YES it is a right angle.",
      "[1 mark] (iii) 60^2 + 80^2 = 10000, but 90^2 = 8100; since 10000 is not 8100, it is NOT a right angle.",
      "[1 mark] (iv) Correct diagonal = sqrt(60^2 + 80^2) = sqrt(10000) = 100 cm.",
    ],
    finalAnswer: "(i) converse of Pythagoras (ii) yes (iii) no (iv) 100 cm" },

  { id: "BX-TRI-E-011", subject: "Maths", topicKey: "triangles", subtopic: "Pythagoras Theorem", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A kite is flying with its string taut. The kite is at a horizontal distance of 40 m from Meera and at a height of 30 m above her hand. A friend's kite of the same design flies taut at horizontal distance 80 m and height 60 m.\n(i) Find the length of Meera's kite string.\n(ii) Are the two string triangles similar? Give the criterion.\n(iii) Find the ratio of their perimeters.\n(iv) A third kite of the same design has string 100 m at height 60 m; find its horizontal distance.",
    solutionSteps: [
      "[1 mark] (i) String = sqrt(40^2 + 30^2) = sqrt(2500) = 50 m.",
      "[1 mark] (ii) 40/80 = 30/60 = 1/2 with the included right angle equal, so by SAS the triangles are similar.",
      "[1 mark] (iii) Ratio of perimeters = ratio of corresponding sides = 1 : 2.",
      "[1 mark] (iv) Horizontal distance = sqrt(100^2 - 60^2) = sqrt(6400) = 80 m.",
    ],
    finalAnswer: "(i) 50 m (ii) SAS similarity (iii) 1 : 2 (iv) 80 m" },

  { id: "BX-TRI-E-012", subject: "Maths", topicKey: "triangles", subtopic: "Basic Proportionality Theorem", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A triangular sail ABC has a reinforcing batten DE sewn parallel to the foot BC, with D on the luff AB and E on the leech AC. The maker measures AD = 1.2 m, DB = 0.8 m and AE = 1.5 m.\n(i) Name the theorem connecting these segments.\n(ii) Find EC.\n(iii) Find the ratio DE : BC.\n(iv) If the batten DE is 1.8 m long, find the length of the foot BC.",
    solutionSteps: [
      "[1 mark] (i) The Basic Proportionality Theorem (Thales theorem).",
      "[1 mark] (ii) AD/DB = AE/EC gives 1.2/0.8 = 1.5/EC, so EC = 1.5 x 0.8/1.2 = 1 m.",
      "[1 mark] (iii) triangle ADE ~ triangle ABC, so DE/BC = AD/AB = 1.2/(1.2 + 0.8) = 1.2/2 = 3/5.",
      "[1 mark] (iv) BC = DE x 5/3 = 1.8 x 5/3 = 3 m.",
    ],
    finalAnswer: "(i) BPT (ii) 1 m (iii) 3 : 5 (iv) 3 m" },

  { id: "BX-TRI-E-013", subject: "Maths", topicKey: "triangles", subtopic: "Basic Proportionality Theorem", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A step-ladder forms an isosceles triangle ABC with the two legs AB and AC of equal length and the floor BC. A horizontal safety rope DE is tied across, parallel to the floor, with D on AB and E on AC. It is found that AD = 60 cm and the whole leg AB = 150 cm.\n(i) Find the ratio AD : DB.\n(ii) Using BPT, find the ratio AE : EC.\n(iii) Find the ratio DE : BC.\n(iv) If the floor spread BC = 90 cm, find the length of the rope DE.",
    solutionSteps: [
      "[1 mark] (i) DB = 150 - 60 = 90 cm, so AD : DB = 60 : 90 = 2 : 3.",
      "[1 mark] (ii) By BPT, AE : EC = AD : DB = 2 : 3.",
      "[1 mark] (iii) DE is parallel to BC, so DE : BC = AD : AB = 60 : 150 = 2 : 5.",
      "[1 mark] (iv) DE = (2/5) x 90 = 36 cm.",
    ],
    finalAnswer: "(i) 2 : 3 (ii) 2 : 3 (iii) 2 : 5 (iv) 36 cm" },

  { id: "BX-TRI-E-014", subject: "Maths", topicKey: "triangles", subtopic: "Areas of Similar Triangles", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "Two triangular flower beds are similar in shape. The sides of the smaller bed are 9 m, 12 m and 15 m. The longest side of the larger bed is 25 m.\n(i) Find the scale factor from the smaller to the larger bed.\n(ii) Find the perimeter of the larger bed (for fencing).\n(iii) Find the ratio of their areas.\n(iv) If the smaller bed needs 720 g of seed, how much does the larger bed need (seed proportional to area)?",
    solutionSteps: [
      "[1 mark] (i) Scale factor = 25/15 = 5/3.",
      "[1 mark] (ii) Smaller perimeter = 9 + 12 + 15 = 36 m; larger = 36 x 5/3 = 60 m.",
      "[1 mark] (iii) Ratio of areas = (5/3)^2 = 25 : 9.",
      "[1 mark] (iv) Seed = 720 x 25/9 = 2000 g.",
    ],
    finalAnswer: "(i) 5/3 (ii) 60 m (iii) 25 : 9 (iv) 2000 g" },

  { id: "BX-TRI-E-015", subject: "Maths", topicKey: "triangles", subtopic: "Pythagoras Theorem", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "An aeroplane is flying at a height of 3000 m directly above a point that is 4000 m (horizontal) from an airport control tower on level ground.\n(i) Find the straight-line distance from the tower to the aeroplane.\n(ii) Later the aeroplane is 12000 m horizontally from the tower at a height of 5000 m; find the straight-line distance then.\n(iii) By how much did the straight-line distance increase?\n(iv) Using the converse of Pythagoras, check whether the triangle with sides 5000 m, 12000 m and 13000 m is right-angled.",
    solutionSteps: [
      "[1 mark] (i) Distance = sqrt(3000^2 + 4000^2) = sqrt(25000000) = 5000 m.",
      "[1 mark] (ii) Distance = sqrt(12000^2 + 5000^2) = sqrt(169000000) = 13000 m.",
      "[1 mark] (iii) Increase = 13000 - 5000 = 8000 m.",
      "[1 mark] (iv) 5000^2 + 12000^2 = 25000000 + 144000000 = 169000000 = 13000^2, so YES it is right-angled.",
    ],
    finalAnswer: "(i) 5000 m (ii) 13000 m (iii) 8000 m (iv) yes, right-angled" },

  { id: "BX-TRI-E-016", subject: "Maths", topicKey: "triangles", subtopic: "Similarity criteria and correspondence", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "In the school garden a vertical gnomon (rod) 0.5 m tall casts a shadow 1.2 m long. At the same moment a flag mast nearby casts a shadow 9.6 m long.\n(i) Which similarity criterion lets you compare the two heights?\n(ii) Find the height of the flag mast.\n(iii) A wall casts a shadow 4.8 m long at the same time; find the wall's height.\n(iv) Later the gnomon's shadow shortens to 0.4 m; find the flag mast's shadow then.",
    solutionSteps: [
      "[1 mark] (i) AA similarity: both objects are vertical (right angles) and the sun's elevation is the same, so the ray angles are equal.",
      "[1 mark] (ii) Mast height = 0.5 x (9.6/1.2) = 0.5 x 8 = 4 m.",
      "[1 mark] (iii) Wall height = 0.5 x (4.8/1.2) = 2 m.",
      "[1 mark] (iv) height/shadow is constant, so mast shadow = 4 x (0.4/0.5) = 3.2 m.",
    ],
    finalAnswer: "(i) AA similarity (ii) 4 m (iii) 2 m (iv) 3.2 m" },

  { id: "BX-TRI-E-017", subject: "Maths", topicKey: "triangles", subtopic: "Converse of Pythagoras", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "An architect makes a scale model of a triangular glass facade. On the model the three edges measure 8 cm, 15 cm and 17 cm. The shortest real edge is to be 4 m.\n(i) Show the model triangle is right-angled.\n(ii) Find the scale factor (real : model).\n(iii) Find the real length of the longest edge.\n(iv) Find the ratio of the model's area to the real facade's area.",
    solutionSteps: [
      "[1 mark] (i) 8^2 + 15^2 = 64 + 225 = 289 = 17^2, so by the converse of Pythagoras it is right-angled.",
      "[1 mark] (ii) Real : model = 400 cm : 8 cm = 50 : 1.",
      "[1 mark] (iii) Longest real edge = 17 x 50 = 850 cm = 8.5 m.",
      "[1 mark] (iv) Ratio of areas (model : real) = (1/50)^2 = 1 : 2500.",
    ],
    finalAnswer: "(i) right-angled (ii) 50 : 1 (iii) 8.5 m (iv) 1 : 2500" },

  { id: "BX-TRI-E-018", subject: "Maths", topicKey: "triangles", subtopic: "Similarity criteria and correspondence", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A slide projector throws the image of a slide onto a screen. The slide is 3 cm tall and sits 5 cm from the lens; the screen is 400 cm from the lens. The rays through the lens form two similar triangles on either side of the lens.\n(i) State why the two triangles are similar.\n(ii) Write the proportion relating the image height H to the given lengths.\n(iii) Find the height of the image on the screen.\n(iv) Find the ratio of the areas of the slide triangle to the image triangle.",
    solutionSteps: [
      "[1 mark] (i) The vertically opposite angles at the lens are equal and both triangles are right-angled (heights perpendicular to the axis), so by AA they are similar.",
      "[1 mark] (ii) H/3 = 400/5.",
      "[1 mark] (iii) H = 3 x 80 = 240 cm.",
      "[1 mark] (iv) Ratio of areas = (5/400)^2 = (1/80)^2 = 1 : 6400.",
    ],
    finalAnswer: "(i) AA similarity (ii) H/3 = 400/5 (iii) 240 cm (iv) 1 : 6400" },

  { id: "BX-TRI-E-019", subject: "Maths", topicKey: "triangles", subtopic: "Pythagoras Theorem", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A zip-line runs from the top of a 21 m tower to the top of a shorter 6 m tower. The two towers stand on level ground 8 m apart.\n(i) Find the vertical drop between the two tower tops.\n(ii) Find the length of the zip-line (straight cable between the tops).\n(iii) A second cable runs from the 21 m top to the base of the short tower; find its length.\n(iv) Are the two cable right-triangles similar? Justify.",
    solutionSteps: [
      "[1 mark] (i) Vertical drop = 21 - 6 = 15 m.",
      "[1 mark] (ii) Cable = sqrt(8^2 + 15^2) = sqrt(289) = 17 m.",
      "[1 mark] (iii) From 21 m top to base of short tower: sqrt(8^2 + 21^2) = sqrt(505) = approximately 22.47 m.",
      "[1 mark] (iv) Legs 8, 15 versus 8, 21: 8/8 is not equal to 15/21, so the triangles are NOT similar.",
    ],
    finalAnswer: "(i) 15 m (ii) 17 m (iii) sqrt(505) approx 22.47 m (iv) not similar" },

  { id: "BX-TRI-E-020", subject: "Maths", topicKey: "triangles", subtopic: "Similarity criteria and correspondence", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A vertical lamp-post PQ = 12 m stands beside a straight road QA. A shorter vertical sign-post MN is placed with its foot N on the road between Q and A, and its top M lies exactly on the straight line joining the top P of the lamp-post to the point A on the road. Given QN = 6 m and NA = 3 m.\n(i) Explain why triangle ANM is similar to triangle AQP.\n(ii) Find QA and the ratio NA : QA.\n(iii) Find the height MN of the sign-post.\n(iv) Find the ratio of the areas of triangle ANM to triangle AQP.",
    solutionSteps: [
      "[1 mark] (i) MN is parallel to PQ (both vertical) and angle A is common, so by AA triangle ANM ~ triangle AQP.",
      "[1 mark] (ii) QA = QN + NA = 6 + 3 = 9 m; NA : QA = 3 : 9 = 1 : 3.",
      "[1 mark] (iii) MN/PQ = NA/QA = 1/3, so MN = 12 x 1/3 = 4 m.",
      "[1 mark] (iv) Ratio of areas = (1/3)^2 = 1 : 9.",
    ],
    finalAnswer: "(i) AA (MN parallel PQ, common angle A) (ii) QA = 9 m, 1 : 3 (iii) 4 m (iv) 1 : 9" },

  { id: "BX-TRI-E-021", subject: "Maths", topicKey: "triangles", subtopic: "Pythagoras Theorem", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A rectangular football practice field is 80 m long and 60 m wide. A junior field is similar in shape with its longer side 40 m.\n(i) Find the diagonal of the senior field.\n(ii) Find the ratio of the sides (senior : junior) and the diagonal of the junior field.\n(iii) Find the ratio of their areas.\n(iv) Marking the senior field boundary needs 280 m of tape; how much for the junior field?",
    solutionSteps: [
      "[1 mark] (i) Diagonal = sqrt(80^2 + 60^2) = sqrt(10000) = 100 m.",
      "[1 mark] (ii) senior : junior = 80 : 40 = 2 : 1, so junior diagonal = 100/2 = 50 m.",
      "[1 mark] (iii) Ratio of areas = 2^2 = 4 : 1.",
      "[1 mark] (iv) Junior perimeter = 280/2 = 140 m.",
    ],
    finalAnswer: "(i) 100 m (ii) 2 : 1, 50 m (iii) 4 : 1 (iv) 140 m" },

  { id: "BX-TRI-E-022", subject: "Maths", topicKey: "triangles", subtopic: "Areas of Similar Triangles", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A straight hill path rises steadily. A hiker notes that after walking 130 m along the path she has risen 50 m vertically. A gentler branch path of the same hill rises 20 m over a slope length of 52 m.\n(i) Find the horizontal distance covered on the main path.\n(ii) Find the horizontal distance covered on the branch path.\n(iii) Are the two path triangles similar? Give the reason.\n(iv) Find the ratio of their areas.",
    solutionSteps: [
      "[1 mark] (i) Horizontal = sqrt(130^2 - 50^2) = sqrt(14400) = 120 m.",
      "[1 mark] (ii) Horizontal = sqrt(52^2 - 20^2) = sqrt(2304) = 48 m.",
      "[1 mark] (iii) Sides (50, 120, 130) and (20, 48, 52): 50/20 = 120/48 = 130/52 = 2.5, so by SSS they are similar.",
      "[1 mark] (iv) Ratio of areas = 2.5^2 = 6.25 = 25 : 4.",
    ],
    finalAnswer: "(i) 120 m (ii) 48 m (iii) SSS similarity (2.5) (iv) 25 : 4" },

  { id: "BX-TRI-E-023", subject: "Maths", topicKey: "triangles", subtopic: "Areas of Similar Triangles", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A triangular pennant flag ABC has a coloured stripe DE printed parallel to the free edge BC, with D on AB and E on AC, at one-third of the way down from the tip A, so that AD : AB = 1 : 3.\n(i) Find the ratio AD : DB.\n(ii) Find the ratio DE : BC.\n(iii) Find the ratio of the area of the top triangle ADE to the whole flag ABC.\n(iv) Find the ratio of the area of the top triangle ADE to the trapezium DBCE below the stripe.",
    solutionSteps: [
      "[1 mark] (i) AD : AB = 1 : 3, so DB is 2 parts and AD : DB = 1 : 2.",
      "[1 mark] (ii) DE : BC = AD : AB = 1 : 3.",
      "[1 mark] (iii) Area of triangle ADE : triangle ABC = (1/3)^2 = 1 : 9.",
      "[1 mark] (iv) Trapezium = 9 - 1 = 8 parts, so triangle ADE : trapezium = 1 : 8.",
    ],
    finalAnswer: "(i) 1 : 2 (ii) 1 : 3 (iii) 1 : 9 (iv) 1 : 8" },

  { id: "BX-TRI-E-024", subject: "Maths", topicKey: "triangles", subtopic: "Areas of Similar Triangles", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "Two triangular sails are similar. The area of the smaller sail is 32 m^2 and the area of the larger sail is 72 m^2.\n(i) Find the ratio of their areas in simplest form.\n(ii) Find the ratio of their corresponding sides.\n(iii) If the smaller sail's longest edge is 8 m, find the larger sail's longest edge.\n(iv) Find the ratio of their perimeters.",
    solutionSteps: [
      "[1 mark] (i) 32 : 72 = 4 : 9.",
      "[1 mark] (ii) Ratio of sides = sqrt(4/9) = 2 : 3.",
      "[1 mark] (iii) Longest edge = 8 x 3/2 = 12 m.",
      "[1 mark] (iv) Ratio of perimeters = ratio of sides = 2 : 3.",
    ],
    finalAnswer: "(i) 4 : 9 (ii) 2 : 3 (iii) 12 m (iv) 2 : 3" },

  { id: "BX-TRI-E-025", subject: "Maths", topicKey: "triangles", subtopic: "Pythagoras Theorem", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "From the top of a vertical lighthouse 60 m high, the keeper sees a boat. The straight-line distance from the top of the lighthouse to the boat is 100 m (the boat, the foot of the lighthouse and the top form a right triangle with the right angle at the foot).\n(i) Find the horizontal distance of the boat from the foot of the lighthouse.\n(ii) The boat moves so that this horizontal distance becomes 45 m; find the new straight-line distance from the top.\n(iii) By how much did the straight-line distance change?\n(iv) A second lighthouse of height 90 m has a boat at horizontal distance 120 m; is its triangle similar to the first boat position? Justify.",
    solutionSteps: [
      "[1 mark] (i) Horizontal = sqrt(100^2 - 60^2) = sqrt(6400) = 80 m.",
      "[1 mark] (ii) New distance = sqrt(60^2 + 45^2) = sqrt(5625) = 75 m.",
      "[1 mark] (iii) Change = 100 - 75 = 25 m (decrease).",
      "[1 mark] (iv) First (60, 80, 100) and second (90, 120, 150): all sides in ratio 2 : 3, so by SSS they are similar.",
    ],
    finalAnswer: "(i) 80 m (ii) 75 m (iii) 25 m decrease (iv) similar (SSS, 2:3)" },

  { id: "BX-TRI-E-026", subject: "Maths", topicKey: "triangles", subtopic: "Pythagoras Theorem", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A shopping-mall escalator rises 4.8 m vertically between two floors and covers 6.4 m horizontally.\n(i) Find the length of the escalator (its sloping length).\n(ii) A taller escalator of the same slope rises 7.2 m vertically; find its horizontal run.\n(iii) Find the ratio of the sloping lengths of the two escalators.\n(iv) Find the ratio of the areas of the two right triangles.",
    solutionSteps: [
      "[1 mark] (i) Length = sqrt(4.8^2 + 6.4^2) = sqrt(23.04 + 40.96) = sqrt(64) = 8 m.",
      "[1 mark] (ii) Same slope means similar; vertical rise 4.8 -> 7.2 is x1.5, so horizontal = 6.4 x 1.5 = 9.6 m.",
      "[1 mark] (iii) Ratio of sloping lengths = 1 : 1.5 = 2 : 3.",
      "[1 mark] (iv) Ratio of areas = (2/3)^2 = 4 : 9.",
    ],
    finalAnswer: "(i) 8 m (ii) 9.6 m (iii) 2 : 3 (iv) 4 : 9" },

  { id: "BX-TRI-E-027", subject: "Maths", topicKey: "triangles", subtopic: "Similarity criteria and correspondence", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "To find the height of a distant tower two similar triangles are used with a marked ruler held at arm's length. When the 10 cm mark of the ruler is held 50 cm from the eye, the tower exactly spans the 10 cm at that mark. The tower is 300 m from the observer.\n(i) State why the small (ruler) triangle and the large (tower) triangle are similar.\n(ii) Write the proportion for the tower height H (use 300 m = 30000 cm).\n(iii) Find the height of the tower.\n(iv) Find the ratio of the areas of the ruler triangle to the tower triangle.",
    solutionSteps: [
      "[1 mark] (i) The two triangles share the apex angle at the eye and both bases are perpendicular to the line of sight, so by AA they are similar.",
      "[1 mark] (ii) H/10 = 30000/50.",
      "[1 mark] (iii) H = 10 x 600 = 6000 cm = 60 m.",
      "[1 mark] (iv) Ratio of areas = (50/30000)^2 = (1/600)^2 = 1 : 360000.",
    ],
    finalAnswer: "(i) AA similarity (ii) H/10 = 30000/50 (iii) 60 m (iv) 1 : 360000" },

  { id: "BX-TRI-E-028", subject: "Maths", topicKey: "triangles", subtopic: "Basic Proportionality Theorem", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "In a triangular bracket ABC, a strut DE is fixed parallel to the base BC (D on AB, E on AC). The measured lengths in cm are AD = x, DB = x - 3, AE = x + 2 and EC = x - 2.\n(i) Write the proportionality condition from BPT.\n(ii) Form the equation in x.\n(iii) Solve for x.\n(iv) Find the actual lengths AD and DB.",
    solutionSteps: [
      "[1 mark] (i) Since DE is parallel to BC, by BPT: AD/DB = AE/EC.",
      "[1 mark] (ii) x/(x - 3) = (x + 2)/(x - 2), so x(x - 2) = (x + 2)(x - 3).",
      "[1 mark] (iii) x^2 - 2x = x^2 - x - 6, so -2x = -x - 6, giving x = 6.",
      "[1 mark] (iv) AD = x = 6 cm and DB = x - 3 = 3 cm (check: 6/3 = 8/4 = 2).",
    ],
    finalAnswer: "(i) AD/DB = AE/EC (ii) x(x-2) = (x+2)(x-3) (iii) x = 6 (iv) AD = 6 cm, DB = 3 cm" },

  { id: "BX-TRI-E-029", subject: "Maths", topicKey: "triangles", subtopic: "Converse of Pythagoras", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A farmer's triangular plot has sides 7 m, 24 m and 25 m. He wants to know whether the corner between the two shorter sides is a right angle so he can fit a rectangular gate there.\n(i) State the test to be used.\n(ii) Check whether the plot is right-angled.\n(iii) Find the area of the plot.\n(iv) A neighbouring similar plot has its shortest side 21 m; find that plot's longest side.",
    solutionSteps: [
      "[1 mark] (i) The converse of the Pythagoras theorem.",
      "[1 mark] (ii) 7^2 + 24^2 = 49 + 576 = 625 = 25^2, so YES, right-angled between the 7 m and 24 m sides.",
      "[1 mark] (iii) Area = 1/2 x 7 x 24 = 84 m^2.",
      "[1 mark] (iv) Scale = 21/7 = 3, so longest side = 25 x 3 = 75 m.",
    ],
    finalAnswer: "(i) converse of Pythagoras (ii) yes (iii) 84 m^2 (iv) 75 m" },

  { id: "BX-TRI-E-030", subject: "Maths", topicKey: "triangles", subtopic: "Areas of Similar Triangles", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A stained-glass window has two similar triangular panes. Their corresponding sides are in the ratio 3 : 5. The perimeter of the smaller pane is 24 cm.\n(i) Find the perimeter of the larger pane.\n(ii) Find the ratio of their areas.\n(iii) If the smaller pane uses 18 cm^2 of glass, find the glass needed for the larger pane.\n(iv) If glass costs 2 rupees per cm^2, find the extra cost of the larger pane over the smaller.",
    solutionSteps: [
      "[1 mark] (i) Larger perimeter = 24 x 5/3 = 40 cm.",
      "[1 mark] (ii) Ratio of areas = (3/5)^2 = 9 : 25.",
      "[1 mark] (iii) Larger glass = 18 x 25/9 = 50 cm^2.",
      "[1 mark] (iv) Extra area = 50 - 18 = 32 cm^2, so extra cost = 32 x 2 = 64 rupees.",
    ],
    finalAnswer: "(i) 40 cm (ii) 9 : 25 (iii) 50 cm^2 (iv) 64 rupees" },

  { id: "BX-TRI-E-031", subject: "Maths", topicKey: "triangles", subtopic: "Pythagoras Theorem", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Evaluating", requiresDiagram: false, isCompetencyBased: true,
    questionText: "Accessibility rules require a ramp's slope to be at most 1 vertical to 12 horizontal. A new ramp rises 1.5 m over a horizontal distance of 15 m.\n(i) Find the sloping length of the ramp.\n(ii) Does the ramp meet the 1 : 12 rule? Justify.\n(iii) What is the maximum rise allowed for a 15 m run under the rule?\n(iv) Find the sloping length if the ramp were built at that maximum allowed rise.",
    solutionSteps: [
      "[1 mark] (i) Sloping length = sqrt(15^2 + 1.5^2) = sqrt(227.25) = approximately 15.07 m.",
      "[1 mark] (ii) Slope = 1.5 : 15 = 1 : 10, which is steeper than 1 : 12, so it does NOT meet the rule.",
      "[1 mark] (iii) Maximum rise = 15/12 = 1.25 m.",
      "[1 mark] (iv) Sloping length = sqrt(15^2 + 1.25^2) = sqrt(226.5625) = approximately 15.05 m.",
    ],
    finalAnswer: "(i) approx 15.07 m (ii) no (1:10 too steep) (iii) 1.25 m (iv) approx 15.05 m" },

  { id: "BX-TRI-E-032", subject: "Maths", topicKey: "triangles", subtopic: "Similarity criteria and correspondence", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A street lamp is fixed at the top of a pole 5 m high. A boy 1.5 m tall stands so that the tip of his shadow is 9 m from the foot of the lamp-post. The lamp, the top of the boy's head and the tip of the shadow lie in a straight line.\n(i) Explain why the boy's triangle is similar to the pole's triangle.\n(ii) Let the shadow length be s; write the proportion from the similar triangles.\n(iii) Find the length s of the boy's shadow.\n(iv) Find the distance of the boy from the foot of the lamp-post.",
    solutionSteps: [
      "[1 mark] (i) The boy and the pole are both vertical (parallel) and they share the angle at the shadow tip, so by AA the triangles are similar.",
      "[1 mark] (ii) boy height / shadow = pole height / (distance from pole to tip): 1.5/s = 5/9.",
      "[1 mark] (iii) s = 9 x 1.5/5 = 2.7 m.",
      "[1 mark] (iv) Distance of boy from the foot = 9 - 2.7 = 6.3 m.",
    ],
    finalAnswer: "(i) AA (boy parallel pole, common tip angle) (ii) 1.5/s = 5/9 (iii) 2.7 m (iv) 6.3 m" },

  { id: "BX-TRI-E-033", subject: "Maths", topicKey: "triangles", subtopic: "Areas of Similar Triangles", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "Two triangular road-signs are similar, triangle ABC ~ triangle PQR, with BC = 6 cm and QR = 9 cm. The height (altitude) of the smaller sign from A to BC is 4 cm.\n(i) Find the ratio of corresponding sides.\n(ii) Find the altitude of the larger sign from P to QR.\n(iii) Find the ratio of their areas.\n(iv) Find the area of the larger sign if the smaller has area 12 cm^2.",
    solutionSteps: [
      "[1 mark] (i) BC : QR = 6 : 9 = 2 : 3.",
      "[1 mark] (ii) Altitudes are in the same ratio as the sides, so altitude = 4 x 3/2 = 6 cm.",
      "[1 mark] (iii) Ratio of areas = (2/3)^2 = 4 : 9.",
      "[1 mark] (iv) Larger area = 12 x 9/4 = 27 cm^2.",
    ],
    finalAnswer: "(i) 2 : 3 (ii) 6 cm (iii) 4 : 9 (iv) 27 cm^2" },

  { id: "BX-TRI-E-034", subject: "Maths", topicKey: "triangles", subtopic: "Pythagoras Theorem", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A rectangular TV screen has width 44 cm and height 33 cm. The maker labels its diagonal as 55 cm.\n(i) Verify the diagonal using the Pythagoras theorem.\n(ii) A larger similar screen has width 88 cm; find its diagonal.\n(iii) Find the ratio of the areas of the two screens.\n(iv) Find the ratio of their diagonals (small : large).",
    solutionSteps: [
      "[1 mark] (i) Diagonal = sqrt(44^2 + 33^2) = sqrt(1936 + 1089) = sqrt(3025) = 55 cm, verified.",
      "[1 mark] (ii) Scale = 88/44 = 2, so diagonal = 55 x 2 = 110 cm.",
      "[1 mark] (iii) Ratio of areas = 2^2 = 4 : 1 (large : small).",
      "[1 mark] (iv) Ratio of diagonals (small : large) = 1 : 2.",
    ],
    finalAnswer: "(i) 55 cm verified (ii) 110 cm (iii) 4 : 1 (iv) 1 : 2" },

  { id: "BX-TRI-E-035", subject: "Maths", topicKey: "triangles", subtopic: "Pythagoras Theorem", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A television transmission tower is held by a guy wire fixed to the top of the tower and anchored to the ground 18 m from the foot; the wire is 30 m long.\n(i) Find the height of the tower.\n(ii) Using the converse of Pythagoras, verify that the tower stands vertical (right angle at the foot).\n(iii) A second guy wire is anchored 32 m from the foot to the same top; find its length.\n(iv) Find the total length of wire used for both.",
    solutionSteps: [
      "[1 mark] (i) Height = sqrt(30^2 - 18^2) = sqrt(900 - 324) = sqrt(576) = 24 m.",
      "[1 mark] (ii) 18^2 + 24^2 = 324 + 576 = 900 = 30^2, so the angle at the foot is a right angle.",
      "[1 mark] (iii) Second wire = sqrt(32^2 + 24^2) = sqrt(1024 + 576) = sqrt(1600) = 40 m.",
      "[1 mark] (iv) Total wire = 30 + 40 = 70 m.",
    ],
    finalAnswer: "(i) 24 m (ii) right angle confirmed (iii) 40 m (iv) 70 m" },

  { id: "BX-TRI-E-036", subject: "Maths", topicKey: "triangles", subtopic: "Basic Proportionality Theorem", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A triangular decorative panel ABC has two horizontal bars parallel to the base BC. Bar DE passes through D on AB and E on AC with AD = 2 cm; bar FG (lower down) passes through F on AB and G on AC with AF = 6 cm. The full side AB = 9 cm and both bars are parallel to BC.\n(i) Find the ratio DE : BC.\n(ii) Find the ratio FG : BC.\n(iii) Find the ratio DE : FG.\n(iv) If BC = 18 cm, find the lengths DE and FG.",
    solutionSteps: [
      "[1 mark] (i) DE : BC = AD : AB = 2 : 9.",
      "[1 mark] (ii) FG : BC = AF : AB = 6 : 9 = 2 : 3.",
      "[1 mark] (iii) DE : FG = 2 : 6 = 1 : 3.",
      "[1 mark] (iv) DE = (2/9) x 18 = 4 cm and FG = (6/9) x 18 = 12 cm.",
    ],
    finalAnswer: "(i) 2 : 9 (ii) 2 : 3 (iii) 1 : 3 (iv) DE = 4 cm, FG = 12 cm" },

  { id: "BX-TRI-E-037", subject: "Maths", topicKey: "triangles", subtopic: "Pythagoras Theorem", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "From a crossroads, one car drives due north and another due east. After some time the northbound car is 24 km from the crossroads and the eastbound car is 7 km from it.\n(i) Explain why the two cars' positions form a right triangle.\n(ii) Find the straight-line distance between the two cars.\n(iii) Later the cars are 15 km (north) and 20 km (east) from the crossroads; find the distance between them.\n(iv) Are the two position triangles similar? Justify.",
    solutionSteps: [
      "[1 mark] (i) North and east are perpendicular directions, so the two distances are the legs of a right triangle with the crossroads at the right angle.",
      "[1 mark] (ii) Distance = sqrt(24^2 + 7^2) = sqrt(576 + 49) = sqrt(625) = 25 km.",
      "[1 mark] (iii) Distance = sqrt(15^2 + 20^2) = sqrt(225 + 400) = sqrt(625) = 25 km.",
      "[1 mark] (iv) Legs (24, 7) versus (15, 20): 24/15 is not equal to 7/20, so the triangles are NOT similar (though hypotenuses are equal).",
    ],
    finalAnswer: "(i) perpendicular roads -> right angle (ii) 25 km (iii) 25 km (iv) not similar" },

  { id: "BX-TRI-E-038", subject: "Maths", topicKey: "triangles", subtopic: "Areas of Similar Triangles", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A triangular lawn ABC has a straight path DE parallel to the base BC (D on AB, E on AC). The path divides the lawn so that AD : DB = 3 : 2.\n(i) Find the ratio DE : BC.\n(ii) Find the ratio of areas triangle ADE : triangle ABC.\n(iii) Find the ratio of the area of the top triangle ADE to the lower trapezium DBCE.\n(iv) If the whole lawn has area 100 m^2, find the grassed area in the trapezium region.",
    solutionSteps: [
      "[1 mark] (i) AD : AB = 3 : 5, so DE : BC = 3 : 5.",
      "[1 mark] (ii) Ratio of areas = (3/5)^2 = 9 : 25.",
      "[1 mark] (iii) Trapezium = 25 - 9 = 16 parts, so triangle ADE : trapezium = 9 : 16.",
      "[1 mark] (iv) Trapezium area = (16/25) x 100 = 64 m^2.",
    ],
    finalAnswer: "(i) 3 : 5 (ii) 9 : 25 (iii) 9 : 16 (iv) 64 m^2" },

  { id: "BX-TRI-E-039", subject: "Maths", topicKey: "triangles", subtopic: "Areas of Similar Triangles", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A floor is tiled with small triangular tiles that are all similar to one large triangular tile. Each small tile has sides half those of the large tile.\n(i) Find the ratio of the perimeter of a small tile to the large tile.\n(ii) Find the ratio of their areas.\n(iii) How many small tiles exactly cover one large tile?\n(iv) If the large tile has area 64 cm^2, find the area of one small tile.",
    solutionSteps: [
      "[1 mark] (i) Ratio of perimeters = ratio of sides = 1 : 2.",
      "[1 mark] (ii) Ratio of areas = (1/2)^2 = 1 : 4.",
      "[1 mark] (iii) 4 small tiles cover one large tile (inverse of the area ratio).",
      "[1 mark] (iv) Small tile area = 64/4 = 16 cm^2.",
    ],
    finalAnswer: "(i) 1 : 2 (ii) 1 : 4 (iii) 4 tiles (iv) 16 cm^2" },

  { id: "BX-TRI-E-040", subject: "Maths", topicKey: "triangles", subtopic: "Converse of Pythagoras", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "On a map drawn to scale, a triangular park is shown with sides 3 cm, 4 cm and 5 cm. The scale is 1 cm to 200 m.\n(i) Show the map triangle is right-angled.\n(ii) Find the real lengths of the three sides.\n(iii) Find the real perimeter of the park.\n(iv) Find the ratio of the map area to the real area.",
    solutionSteps: [
      "[1 mark] (i) 3^2 + 4^2 = 9 + 16 = 25 = 5^2, so by the converse of Pythagoras it is right-angled.",
      "[1 mark] (ii) Real sides = 600 m, 800 m and 1000 m (each cm is 200 m).",
      "[1 mark] (iii) Real perimeter = 600 + 800 + 1000 = 2400 m.",
      "[1 mark] (iv) 1 cm : 200 m = 1 : 20000 (linear), so map : real area = 1 : 20000^2 = 1 : 400000000.",
    ],
    finalAnswer: "(i) right-angled (ii) 600 m, 800 m, 1000 m (iii) 2400 m (iv) 1 : 4 x 10^8" },

  { id: "BX-TRI-E-041", subject: "Maths", topicKey: "triangles", subtopic: "Areas of Similar Triangles", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "Two triangular sails are similar, triangle ABC ~ triangle DEF, with a scale factor 5 : 8 (small : large). The median AM of the smaller sail (from A to BC) is 15 cm.\n(i) Find the length of the corresponding median DN of the larger sail.\n(ii) Find the ratio of their perimeters.\n(iii) Find the ratio of their areas.\n(iv) If the smaller sail's perimeter is 40 cm, find the larger sail's perimeter.",
    solutionSteps: [
      "[1 mark] (i) Corresponding medians are in the ratio 5 : 8, so DN = 15 x 8/5 = 24 cm.",
      "[1 mark] (ii) Ratio of perimeters = 5 : 8.",
      "[1 mark] (iii) Ratio of areas = 5^2 : 8^2 = 25 : 64.",
      "[1 mark] (iv) Larger perimeter = 40 x 8/5 = 64 cm.",
    ],
    finalAnswer: "(i) 24 cm (ii) 5 : 8 (iii) 25 : 64 (iv) 64 cm" },

  { id: "BX-TRI-E-042", subject: "Maths", topicKey: "triangles", subtopic: "Pythagoras Theorem", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "The sloping face of a canal embankment rises 7 m vertically over a horizontal distance of 24 m.\n(i) Find the slant length of the embankment face.\n(ii) A scale model of the embankment has horizontal distance 6 m; find its vertical rise.\n(iii) Find the ratio of the slant lengths (model : real).\n(iv) Find the ratio of the areas of the two triangular cross-sections.",
    solutionSteps: [
      "[1 mark] (i) Slant = sqrt(24^2 + 7^2) = sqrt(576 + 49) = sqrt(625) = 25 m.",
      "[1 mark] (ii) 6 = 24/4, so the model is 1/4 scale and its rise = 7/4 = 1.75 m.",
      "[1 mark] (iii) Slant lengths ratio (model : real) = 1 : 4 (model slant = 25/4 = 6.25 m).",
      "[1 mark] (iv) Ratio of areas = (1/4)^2 = 1 : 16.",
    ],
    finalAnswer: "(i) 25 m (ii) 1.75 m (iii) 1 : 4 (iv) 1 : 16" },

  { id: "BX-TRI-E-043", subject: "Maths", topicKey: "triangles", subtopic: "Similarity in Right Triangles", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "Two similar right-angled triangular brackets are used on a shelf. In the smaller bracket the legs are 6 cm and 8 cm. The larger bracket's hypotenuse is 20 cm.\n(i) Find the hypotenuse of the smaller bracket.\n(ii) Find the scale factor (large : small).\n(iii) Find the legs of the larger bracket.\n(iv) Find the ratio of the areas of the two brackets (small : large).",
    solutionSteps: [
      "[1 mark] (i) Hypotenuse = sqrt(6^2 + 8^2) = sqrt(100) = 10 cm.",
      "[1 mark] (ii) Scale factor = 20/10 = 2.",
      "[1 mark] (iii) Larger legs = 6 x 2 and 8 x 2 = 12 cm and 16 cm.",
      "[1 mark] (iv) Ratio of areas (small : large) = (1/2)^2 = 1 : 4.",
    ],
    finalAnswer: "(i) 10 cm (ii) 2 (iii) 12 cm and 16 cm (iv) 1 : 4" },

  { id: "BX-TRI-E-044", subject: "Maths", topicKey: "triangles", subtopic: "Pythagoras Theorem", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A vertical flag mast casts a shadow 8 m long at the same moment a 1 m rod casts a shadow 0.5 m long. A guy wire runs from the top of the mast to a point on the ground 5 m from its foot.\n(i) Using similar triangles, find the height of the mast.\n(ii) State the similarity criterion used.\n(iii) Find the length of the guy wire.\n(iv) Using the converse of Pythagoras, confirm that the wire, mast and ground form a right triangle at the foot.",
    solutionSteps: [
      "[1 mark] (i) mast / 8 = 1 / 0.5, so mast height = 8 x (1/0.5) = 16 m.",
      "[1 mark] (ii) AA similarity (both vertical -> right angles, equal sun elevation).",
      "[1 mark] (iii) Wire = sqrt(16^2 + 5^2) = sqrt(256 + 25) = sqrt(281) = approximately 16.76 m.",
      "[1 mark] (iv) 16^2 + 5^2 = 281 = (sqrt 281)^2, which confirms the right angle at the foot.",
    ],
    finalAnswer: "(i) 16 m (ii) AA similarity (iii) sqrt(281) approx 16.76 m (iv) right angle confirmed" },

  { id: "BX-TRI-E-045", subject: "Maths", topicKey: "triangles", subtopic: "Pythagoras Theorem", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", requiresDiagram: false, isCompetencyBased: true,
    questionText: "A rectangular gate 2.4 m wide and 1.8 m high is strengthened by a straight diagonal brace from one corner to the opposite corner.\n(i) Find the length of the diagonal brace.\n(ii) A similar larger gate is 4 m wide; find its height.\n(iii) Find the diagonal brace of the larger gate.\n(iv) Find the ratio of the areas of the two gates (large : small).",
    solutionSteps: [
      "[1 mark] (i) Brace = sqrt(2.4^2 + 1.8^2) = sqrt(5.76 + 3.24) = sqrt(9) = 3 m.",
      "[1 mark] (ii) Scale = 4/2.4 = 5/3, so height = 1.8 x 5/3 = 3 m.",
      "[1 mark] (iii) Larger diagonal = 3 x 5/3 = 5 m.",
      "[1 mark] (iv) Ratio of areas (large : small) = (5/3)^2 = 25 : 9.",
    ],
    finalAnswer: "(i) 3 m (ii) 3 m (iii) 5 m (iv) 25 : 9" },
];
