import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Triangles — PROOF expansion pack (Batch 11).
 * Genuinely DISTINCT proof items (different configuration or different result) vs the
 * banked triangles proofs (triangles.proof.ts + assembled bank). CBSE Class-10 2026-27.
 * IN-syllabus tools only: BPT + converse, similarity criteria, areas of similar triangles,
 * Pythagoras + converse. No constructions, no circle/coordinate/trig proofs.
 * Step-marking: each solutionStep is [N mark]-prefixed and sums to the item's marks.
 * requiresDiagram:false — every configuration is fully described in words (student draws).
 * ID scheme: BX-TRI-PF-### (section D 5-mark or C 3-mark to match the proof's exam weight).
 */
export const TRI_EXPAND_PROOF: CanonicalQuestion[] = [

  // ───────────── SECTION D — 5 MARKS ─────────────

  {
    "id": "BX-TRI-PF-001",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Converse of Basic Proportionality Theorem",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "Prove the converse of the Basic Proportionality Theorem: if a line divides any two sides of a triangle in the same ratio, then the line is parallel to the third side. In △ABC a line meets AB at D and AC at E with AD/DB = AE/EC; conclude that DE ∥ BC.",
    "options": [],
    "answer": "DE ∥ BC (proved by contradiction using BPT)",
    "solutionSteps": [
      "[1 mark] GIVEN: In △ABC, D lies on AB and E lies on AC such that AD/DB = AE/EC. TO PROVE: DE ∥ BC.",
      "[1 mark] CONSTRUCTION: If DE is not parallel to BC, draw a line DE′ through D parallel to BC meeting AC at a point E′.",
      "[1 mark] Since DE′ ∥ BC, by the Basic Proportionality Theorem: AD/DB = AE′/E′C.",
      "[1 mark] But it is given that AD/DB = AE/EC; therefore AE′/E′C = AE/EC.",
      "[0.5 mark] Adding 1 to both sides: (AE′ + E′C)/E′C = (AE + EC)/EC, i.e. AC/E′C = AC/EC, so E′C = EC and E′ coincides with E.",
      "[0.5 mark] Hence the line through D and E is the same as DE′, which is parallel to BC. Therefore DE ∥ BC. Proved."
    ],
    "finalAnswer": "DE ∥ BC",
    "explanation": "Converse of BPT proved by assuming a parallel DE′ through D, applying BPT, and showing E′ must coincide with E.",
    "isCompetencyBased": true,
    "ncertRef": "Theorem 6.2 (converse), Ex 6.2",
    "strategyHint": "Assume a parallel line through D and use forward BPT to force the second point to coincide with E.",
    "requiresDiagram": false
  },

  {
    "id": "BX-TRI-PF-002",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Pythagoras Theorem",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "O is any point in the interior of △ABC. Perpendiculars OD, OE and OF are drawn from O to the sides BC, CA and AB respectively. Prove that AF² + BD² + CE² = AE² + CD² + BF².",
    "options": [],
    "answer": "AF² + BD² + CE² = AE² + CD² + BF² (proved)",
    "solutionSteps": [
      "[1 mark] GIVEN: O is interior to △ABC with OD ⊥ BC, OE ⊥ CA and OF ⊥ AB. CONSTRUCTION: Join OA, OB and OC.",
      "[1 mark] In right triangles OAF and OAE: OA² = AF² + OF² and OA² = AE² + OE², so AF² − AE² = OE² − OF². ...(i)",
      "[1 mark] In right triangles OBD and OBF: OB² = BD² + OD² and OB² = BF² + OF², so BD² − BF² = OF² − OD². ...(ii)",
      "[1 mark] In right triangles OCE and OCD: OC² = CE² + OE² and OC² = CD² + OD², so CE² − CD² = OD² − OE². ...(iii)",
      "[1 mark] Adding (i), (ii) and (iii): (AF² − AE²) + (BD² − BF²) + (CE² − CD²) = 0, therefore AF² + BD² + CE² = AE² + CD² + BF². Proved."
    ],
    "finalAnswer": "AF² + BD² + CE² = AE² + CD² + BF²",
    "explanation": "Join O to each vertex and write OA², OB², OC² two ways using the perpendicular feet; the three differences cancel.",
    "isCompetencyBased": true,
    "ncertRef": "Ex 6.5 (Pythagoras applications)",
    "strategyHint": "Express each of OA², OB², OC² using two different perpendicular feet, then add.",
    "requiresDiagram": false
  },

  {
    "id": "BX-TRI-PF-003",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Basic Proportionality Theorem",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "In quadrilateral ABCD the diagonals AC and BD intersect each other at O such that AO/BO = CO/DO. Prove that ABCD is a trapezium with AB ∥ CD.",
    "options": [],
    "answer": "ABCD is a trapezium (AB ∥ CD)",
    "solutionSteps": [
      "[1 mark] GIVEN: Quadrilateral ABCD; diagonals AC and BD meet at O with AO/BO = CO/DO. TO PROVE: AB ∥ CD.",
      "[1 mark] The condition AO/BO = CO/DO can be rearranged (cross-multiplying) to AO/OC = BO/OD. ...(i)",
      "[1 mark] CONSTRUCTION: Through O draw OE parallel to AB, meeting AD at E.",
      "[1 mark] In △DAB, OE ∥ AB, so by the Basic Proportionality Theorem DE/EA = DO/OB. From (i), DO/OB = CO/OA, so DE/EA = CO/OA, i.e. AE/ED = AO/OC.",
      "[1 mark] Thus in △ADC the point E divides AD and O divides AC in the same ratio, so by the converse of BPT OE ∥ DC. Since OE ∥ AB, we get AB ∥ CD. Hence ABCD is a trapezium. Proved."
    ],
    "finalAnswer": "AB ∥ CD, so ABCD is a trapezium",
    "explanation": "Converse of the trapezium-diagonal result: rearrange the ratio, draw OE ∥ AB, and use BPT and its converse to force OE ∥ DC.",
    "isCompetencyBased": true,
    "ncertRef": "Ex 6.2 Q10",
    "strategyHint": "Rearrange the given ratio, drop a line through O parallel to AB, and chase BPT both ways.",
    "requiresDiagram": false
  },

  {
    "id": "BX-TRI-PF-004",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Areas of Similar Triangles",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "Prove that in two similar triangles the ratio of their areas equals the square of the ratio of a pair of corresponding medians. If △ABC ~ △PQR with medians AD and PS, and ar(△ABC) : ar(△PQR) = 9 : 16, find AD : PS.",
    "options": [],
    "answer": "AD : PS = 3 : 4",
    "solutionSteps": [
      "[1 mark] GIVEN: △ABC ~ △PQR; AD is the median to BC and PS is the median to QR. TO PROVE: ar(△ABC)/ar(△PQR) = (AD/PS)².",
      "[1 mark] Since △ABC ~ △PQR, ∠B = ∠Q and AB/PQ = BC/QR; as D and S are midpoints, BD/QS = (½BC)/(½QR) = AB/PQ.",
      "[1 mark] In △ABD and △PQS: ∠B = ∠Q and AB/PQ = BD/QS, so by SAS similarity △ABD ~ △PQS, giving AD/PS = AB/PQ. ...(i)",
      "[1 mark] The areas of similar triangles are in the ratio of the squares of corresponding sides: ar(△ABC)/ar(△PQR) = (AB/PQ)². Using (i), this equals (AD/PS)². Proved.",
      "[1 mark] APPLICATION: (AD/PS)² = 9/16, so AD/PS = 3/4, i.e. AD : PS = 3 : 4."
    ],
    "finalAnswer": "AD : PS = 3 : 4",
    "explanation": "Show the median splits give AD/PS = AB/PQ via SAS similarity, then use the area-ratio = side-ratio² theorem.",
    "isCompetencyBased": true,
    "ncertRef": "Ex 6.4",
    "strategyHint": "Prove AD/PS = AB/PQ using the half-base similar triangles, then substitute into the area theorem.",
    "requiresDiagram": false
  },

  {
    "id": "BX-TRI-PF-005",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Criteria for Similarity",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "In △ABC the altitudes AD (from A to BC) and CE (from C to AB) intersect at P. Prove that (i) △APE ~ △CPD, (ii) △ABD ~ △CBE, and (iii) △APE ~ △ABD.",
    "options": [],
    "answer": "All three similarities proved by AA criterion",
    "solutionSteps": [
      "[1 mark] GIVEN: AD ⊥ BC and CE ⊥ AB intersect at P. Hence ∠ADB = ∠ADC = 90° and ∠CEA = ∠CEB = 90°.",
      "[1.5 mark] (i) In △APE and △CPD: ∠AEP = 90° (CE ⊥ AB) and ∠CDP = 90° (AD ⊥ BC), and ∠APE = ∠CPD (vertically opposite angles). By AA similarity, △APE ~ △CPD.",
      "[1 mark] (ii) In △ABD and △CBE: ∠ADB = ∠CEB = 90° and ∠B is common. By AA similarity, △ABD ~ △CBE.",
      "[1.5 mark] (iii) In △APE and △ABD: ∠AEP = ∠ADB = 90° and ∠PAE = ∠DAB (the same angle at A, since E lies on AB and P lies on AD). By AA similarity, △APE ~ △ABD. Proved."
    ],
    "finalAnswer": "△APE ~ △CPD, △ABD ~ △CBE and △APE ~ △ABD",
    "explanation": "Each pair shares a right angle plus one more equal angle (vertically opposite, common, or the shared vertex angle), giving AA similarity.",
    "isCompetencyBased": true,
    "ncertRef": "Ex 6.3 Q14",
    "strategyHint": "For each pair, spot the right angle from the altitude and one further equal angle.",
    "requiresDiagram": false
  },

  {
    "id": "BX-TRI-PF-006",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Pythagoras Theorem",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "Prove that the sum of the squares of the sides of a rhombus is equal to the sum of the squares of its diagonals. (Rhombus ABCD with diagonals AC and BD meeting at O.)",
    "options": [],
    "answer": "AB² + BC² + CD² + DA² = AC² + BD² (proved)",
    "solutionSteps": [
      "[1 mark] GIVEN: Rhombus ABCD; diagonals AC and BD intersect at O. TO PROVE: AB² + BC² + CD² + DA² = AC² + BD².",
      "[1 mark] The diagonals of a rhombus bisect each other at right angles, so OA = OC = AC/2, OB = OD = BD/2 and ∠AOB = 90°.",
      "[1 mark] In right triangle AOB (right-angled at O): AB² = OA² + OB² = (AC/2)² + (BD/2)² = (AC² + BD²)/4.",
      "[1 mark] All four sides of a rhombus are equal (AB = BC = CD = DA), so AB² + BC² + CD² + DA² = 4·AB².",
      "[1 mark] Therefore AB² + BC² + CD² + DA² = 4 × (AC² + BD²)/4 = AC² + BD². Proved."
    ],
    "finalAnswer": "AB² + BC² + CD² + DA² = AC² + BD²",
    "explanation": "Use that rhombus diagonals bisect at 90°; Pythagoras in one quarter-triangle gives a side² in terms of half-diagonals, then multiply by four.",
    "isCompetencyBased": true,
    "ncertRef": "Ex 6.5 (Pythagoras applications)",
    "strategyHint": "The diagonals meet at right angles and bisect each other — apply Pythagoras to triangle AOB.",
    "requiresDiagram": false
  },

  {
    "id": "BX-TRI-PF-007",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Criteria for Similarity",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "Sides AB and AC and median AD of △ABC are respectively proportional to sides PQ and PR and median PM of △PQR (AB/PQ = AC/PR = AD/PM). Prove that △ABC ~ △PQR.",
    "options": [],
    "answer": "△ABC ~ △PQR (proved via SAS similarity)",
    "solutionSteps": [
      "[1 mark] GIVEN: AD and PM are medians with AB/PQ = AC/PR = AD/PM. CONSTRUCTION: Produce AD to E with DE = AD and join CE; produce PM to N with MN = PM and join RN.",
      "[1 mark] In quadrilateral ABEC the diagonals BC and AE bisect each other (BD = DC, AD = DE), so ABEC is a parallelogram and CE = AB. Likewise PQNR is a parallelogram and RN = PQ. Also AE = 2AD and PN = 2PM.",
      "[1 mark] Now BE = AC and CE = AB give CE/RN = AB/PQ = AC/PR, and AE/PN = 2AD/2PM = AD/PM = AB/PQ; hence CE/RN = AC/PR = AE/PN, so by SSS similarity △ACE ~ △PRN, giving ∠CAE = ∠RPN. ...(i)",
      "[1 mark] Similarly, using BE = AC and the parallelogram sides, △ABE ~ △PQN, giving ∠BAE = ∠QPN. ...(ii)",
      "[1 mark] Adding (i) and (ii): ∠BAC = ∠BAE + ∠CAE = ∠QPN + ∠RPN = ∠QPR. With AB/PQ = AC/PR and ∠BAC = ∠QPR, by SAS similarity △ABC ~ △PQR. Proved."
    ],
    "finalAnswer": "△ABC ~ △PQR",
    "explanation": "Double each median to build parallelograms; SSS similarity of the two auxiliary triangles gives ∠A = ∠P, then SAS similarity finishes it.",
    "isCompetencyBased": true,
    "ncertRef": "Ex 6.3 Q16",
    "strategyHint": "Produce the medians to twice their length to make parallelograms, prove the halves similar, then use SAS.",
    "requiresDiagram": false
  },

  // ───────────── SECTION C — 3 MARKS ─────────────

  {
    "id": "BX-TRI-PF-008",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Pythagoras Theorem",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "O is a point in the interior of a rectangle ABCD. Prove that OA² + OC² = OB² + OD².",
    "options": [],
    "answer": "OA² + OC² = OB² + OD² (proved)",
    "solutionSteps": [
      "[1 mark] CONSTRUCTION: Let the perpendicular distances of O from sides AB and CD be p and q (so p + q = AD), and from sides AD and BC be m and n (so m + n = AB). Join OA, OB, OC, OD.",
      "[1 mark] Each vertex is where two adjacent sides meet, so by Pythagoras: OA² = m² + p², OB² = n² + p², OC² = n² + q² and OD² = m² + q².",
      "[1 mark] Therefore OA² + OC² = m² + p² + n² + q² and OB² + OD² = n² + p² + m² + q²; these are equal, so OA² + OC² = OB² + OD². Proved."
    ],
    "finalAnswer": "OA² + OC² = OB² + OD²",
    "explanation": "Resolve OA, OB, OC, OD into perpendicular distances to the two sides meeting at each corner; both sums equal m² + n² + p² + q².",
    "isCompetencyBased": true,
    "ncertRef": "Ex 6.5 (Pythagoras applications)",
    "strategyHint": "Write each vertex distance from the perpendicular distances of O to the two sides at that corner.",
    "requiresDiagram": false
  },

  {
    "id": "BX-TRI-PF-009",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Pythagoras Theorem",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "In an equilateral triangle ABC, AD is the altitude drawn from A to BC. Prove that 3·AB² = 4·AD².",
    "options": [],
    "answer": "3·AB² = 4·AD² (proved)",
    "solutionSteps": [
      "[1 mark] GIVEN: Equilateral △ABC with AD ⊥ BC. In an equilateral triangle the altitude bisects the base, so BD = BC/2 = AB/2 (since BC = AB).",
      "[1 mark] In right triangle ABD: AB² = AD² + BD² (Pythagoras), so AD² = AB² − BD² = AB² − (AB/2)² = AB² − AB²/4 = 3AB²/4.",
      "[1 mark] Multiplying both sides by 4: 4·AD² = 3·AB². Proved."
    ],
    "finalAnswer": "3·AB² = 4·AD²",
    "explanation": "The altitude bisects the base of an equilateral triangle; Pythagoras then gives AD² = 3AB²/4.",
    "isCompetencyBased": false,
    "ncertRef": "Ex 6.5 Q6",
    "strategyHint": "Use that the foot of the altitude bisects the base, then apply Pythagoras once.",
    "requiresDiagram": false
  },

  {
    "id": "BX-TRI-PF-010",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Pythagoras Theorem",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "ABC is an equilateral triangle and D is a point on BC such that BD = (1/3)BC. Prove that 9·AD² = 7·AB².",
    "options": [],
    "answer": "9·AD² = 7·AB² (proved)",
    "solutionSteps": [
      "[1 mark] CONSTRUCTION: Draw AE ⊥ BC with E on BC. As △ABC is equilateral, E is the midpoint of BC, so BE = BC/2 and AE² = AB² − BE² = AB² − (BC/2)² = 3AB²/4 (using BC = AB).",
      "[1 mark] Since BD = BC/3, DE = BE − BD = BC/2 − BC/3 = BC/6 = AB/6. In right triangle ADE: AD² = AE² + DE² = 3AB²/4 + (AB/6)².",
      "[1 mark] AD² = 3AB²/4 + AB²/36 = (27AB² + AB²)/36 = 28AB²/36 = 7AB²/9. Therefore 9·AD² = 7·AB². Proved."
    ],
    "finalAnswer": "9·AD² = 7·AB²",
    "explanation": "Drop the altitude to find AE and DE, then Pythagoras in △ADE gives AD² = 7AB²/9.",
    "isCompetencyBased": true,
    "ncertRef": "Ex 6.5 Q7",
    "strategyHint": "Drop the altitude to get AE and the offset DE from the midpoint, then apply Pythagoras in △ADE.",
    "requiresDiagram": false
  },

  {
    "id": "BX-TRI-PF-011",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Pythagoras Theorem",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "In △ABC, AD is drawn perpendicular to BC with D on BC. Prove that AB² + CD² = AC² + BD².",
    "options": [],
    "answer": "AB² + CD² = AC² + BD² (proved)",
    "solutionSteps": [
      "[1 mark] GIVEN: AD ⊥ BC with D on BC, so △ABD and △ACD are both right-angled at D.",
      "[1 mark] In right triangle ABD: AB² = AD² + BD², so AD² = AB² − BD². In right triangle ACD: AC² = AD² + CD², so AD² = AC² − CD².",
      "[1 mark] Equating the two values of AD²: AB² − BD² = AC² − CD², therefore AB² + CD² = AC² + BD². Proved."
    ],
    "finalAnswer": "AB² + CD² = AC² + BD²",
    "explanation": "Both right triangles share the altitude AD; equating AD² from each gives the identity.",
    "isCompetencyBased": true,
    "ncertRef": "Ex 6.5 (Pythagoras applications)",
    "strategyHint": "Apply Pythagoras in the two right triangles on either side of the foot D, then equate AD².",
    "requiresDiagram": false
  },

  {
    "id": "BX-TRI-PF-012",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Basic Proportionality Theorem",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "ABCD is a trapezium in which AB ∥ DC. A line EF is drawn parallel to AB with E on AD and F on BC. Prove that AE/ED = BF/FC.",
    "options": [],
    "answer": "AE/ED = BF/FC (proved)",
    "solutionSteps": [
      "[1 mark] CONSTRUCTION: Join the diagonal AC and let it meet EF at G. Since EF ∥ AB and AB ∥ DC, we also have EF ∥ DC.",
      "[1 mark] In △ADC, EG ∥ DC, so by the Basic Proportionality Theorem AE/ED = AG/GC. ...(i)",
      "[1 mark] In △ABC, GF ∥ AB, so by BPT AG/GC = BF/FC. ...(ii) From (i) and (ii), AE/ED = BF/FC. Proved."
    ],
    "finalAnswer": "AE/ED = BF/FC",
    "explanation": "The diagonal splits the trapezium into two triangles; BPT in each connects the ratios through the common ratio AG/GC.",
    "isCompetencyBased": true,
    "ncertRef": "Ex 6.2 (BPT applications)",
    "strategyHint": "Draw a diagonal through the strip EF and apply BPT in the two triangles it creates.",
    "requiresDiagram": false
  },

  {
    "id": "BX-TRI-PF-013",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Areas of Similar Triangles",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "In △ABC, D and E lie on AB and AC respectively with DE ∥ BC. If DE divides the triangle into two regions of equal area, that is ar(△ADE) = ar(trapezium DBCE), prove that AD/AB = 1/√2.",
    "options": [],
    "answer": "AD/AB = 1/√2 (proved)",
    "solutionSteps": [
      "[1 mark] Since DE ∥ BC, △ADE ~ △ABC by AA similarity, so ar(△ADE)/ar(△ABC) = (AD/AB)². ...(i)",
      "[1 mark] Given ar(△ADE) = ar(DBCE), and ar(△ABC) = ar(△ADE) + ar(DBCE) = 2·ar(△ADE); hence ar(△ADE)/ar(△ABC) = 1/2. ...(ii)",
      "[1 mark] From (i) and (ii): (AD/AB)² = 1/2, therefore AD/AB = 1/√2. Proved."
    ],
    "finalAnswer": "AD/AB = 1/√2",
    "explanation": "Equal-area split means △ADE is half of △ABC; the area-ratio = (AD/AB)² gives AD/AB = 1/√2.",
    "isCompetencyBased": true,
    "ncertRef": "Ex 6.4",
    "strategyHint": "Equal areas force ar(△ADE)/ar(△ABC) = 1/2; combine with the area-ratio theorem.",
    "requiresDiagram": false
  },

  {
    "id": "BX-TRI-PF-014",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Criteria for Similarity",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "If △ABC ~ △DEF, prove that the ratio of their perimeters is equal to the ratio of their corresponding sides.",
    "options": [],
    "answer": "Perimeter ratio = corresponding-side ratio (proved)",
    "solutionSteps": [
      "[1 mark] GIVEN: △ABC ~ △DEF, so corresponding sides are proportional: AB/DE = BC/EF = CA/FD = k (say).",
      "[1 mark] Then AB = k·DE, BC = k·EF and CA = k·FD, so AB + BC + CA = k(DE + EF + FD).",
      "[1 mark] Therefore (AB + BC + CA)/(DE + EF + FD) = k = AB/DE. Hence the ratio of perimeters equals the ratio of corresponding sides. Proved."
    ],
    "finalAnswer": "Perimeter(△ABC)/Perimeter(△DEF) = AB/DE",
    "explanation": "Each side of the first is k times the corresponding side of the second; summing preserves the factor k.",
    "isCompetencyBased": false,
    "ncertRef": "Ex 6.3 (similarity properties)",
    "strategyHint": "Write each side as k times its correspondent and add the three equalities.",
    "requiresDiagram": false
  },

  {
    "id": "BX-TRI-PF-015",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Criteria for Similarity",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "△ABC ~ △PQR. AD is the bisector of ∠A meeting BC at D, and PS is the bisector of ∠P meeting QR at S. Prove that AD/PS = AB/PQ.",
    "options": [],
    "answer": "AD/PS = AB/PQ (proved)",
    "solutionSteps": [
      "[1 mark] Since △ABC ~ △PQR, ∠A = ∠P and ∠B = ∠Q. As AD and PS bisect ∠A and ∠P, ∠BAD = (1/2)∠A = (1/2)∠P = ∠QPS.",
      "[1 mark] In △ABD and △PQS: ∠BAD = ∠QPS and ∠B = ∠Q, so by AA similarity △ABD ~ △PQS.",
      "[1 mark] Therefore corresponding sides are proportional: AD/PS = AB/PQ. Proved."
    ],
    "finalAnswer": "AD/PS = AB/PQ",
    "explanation": "The bisected half-angles and the equal base angles make △ABD ~ △PQS, giving the bisector ratio equal to the side ratio.",
    "isCompetencyBased": true,
    "ncertRef": "Ex 6.3 (bisectors of similar triangles)",
    "strategyHint": "Halve the equal apex angles and pair with the equal base angle to get AA similarity of the bisector triangles.",
    "requiresDiagram": false
  },

  {
    "id": "BX-TRI-PF-016",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Criteria for Similarity",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "△ABC and △AMP are two right triangles, right-angled at B and M respectively, sharing the common angle A. Prove that △ABC ~ △AMP and hence that CA/PA = BC/MP.",
    "options": [],
    "answer": "△ABC ~ △AMP and CA/PA = BC/MP (proved)",
    "solutionSteps": [
      "[1 mark] GIVEN: ∠ABC = 90° and ∠AMP = 90°, with ∠A common to both triangles.",
      "[1 mark] In △ABC and △AMP: ∠A = ∠A (common) and ∠ABC = ∠AMP = 90°. By AA similarity, △ABC ~ △AMP.",
      "[1 mark] Corresponding sides of similar triangles are proportional, so CA/PA = BC/MP. Proved."
    ],
    "finalAnswer": "△ABC ~ △AMP, CA/PA = BC/MP",
    "explanation": "Common angle A plus equal right angles gives AA similarity; the side ratio follows.",
    "isCompetencyBased": false,
    "ncertRef": "Ex 6.3 Q9",
    "strategyHint": "Two equal right angles and the shared angle A give AA similarity directly.",
    "requiresDiagram": false
  },

  {
    "id": "BX-TRI-PF-017",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Criteria for Similarity",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "ABCD is a parallelogram. E is a point on AD produced and BE intersects CD at F. Prove that △ABE ~ △CFB.",
    "options": [],
    "answer": "△ABE ~ △CFB (proved by AA)",
    "solutionSteps": [
      "[1 mark] Since ABCD is a parallelogram, AD ∥ BC and AB ∥ DC, and opposite angles are equal, so ∠BAE = ∠A = ∠C = ∠FCB.",
      "[1 mark] AE lies along AD, and AD ∥ BC, so with transversal BE, ∠AEB = ∠CBF (alternate interior angles).",
      "[1 mark] In △ABE and △CFB: ∠BAE = ∠FCB and ∠AEB = ∠CBF, so by AA similarity △ABE ~ △CFB. Proved."
    ],
    "finalAnswer": "△ABE ~ △CFB",
    "explanation": "Equal opposite angles of the parallelogram and alternate angles from AD ∥ BC give AA similarity.",
    "isCompetencyBased": true,
    "ncertRef": "Ex 6.3 (parallelogram similarity)",
    "strategyHint": "Use opposite angles of the parallelogram and alternate angles across the parallel sides.",
    "requiresDiagram": false
  },

  {
    "id": "BX-TRI-PF-018",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Similarity in Right Triangles",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "In △ABC, ∠B = 90° and BD ⊥ AC with D on AC. Prove that AD/DC = AB²/BC².",
    "options": [],
    "answer": "AD/DC = AB²/BC² (proved)",
    "solutionSteps": [
      "[1 mark] In △ADB and △ABC: ∠A is common and ∠ADB = ∠ABC = 90°, so △ADB ~ △ABC, which gives AB² = AD·AC. ...(i)",
      "[1 mark] In △BDC and △ABC: ∠C is common and ∠BDC = ∠ABC = 90°, so △BDC ~ △ABC, which gives BC² = DC·AC. ...(ii)",
      "[1 mark] Dividing (i) by (ii): AB²/BC² = (AD·AC)/(DC·AC) = AD/DC. Therefore AD/DC = AB²/BC². Proved."
    ],
    "finalAnswer": "AD/DC = AB²/BC²",
    "explanation": "The altitude to the hypotenuse gives AB² = AD·AC and BC² = DC·AC; dividing cancels AC.",
    "isCompetencyBased": true,
    "ncertRef": "Ex 6.5 (altitude on hypotenuse)",
    "strategyHint": "Get AB² and BC² as products with AC from the two sub-triangle similarities, then divide.",
    "requiresDiagram": false
  },

  {
    "id": "BX-TRI-PF-019",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Areas of Similar Triangles",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "If two similar triangles have equal areas, prove that they are congruent. (Take △ABC ~ △DEF with ar(△ABC) = ar(△DEF).)",
    "options": [],
    "answer": "△ABC ≅ △DEF (proved)",
    "solutionSteps": [
      "[1 mark] Since △ABC ~ △DEF, ar(△ABC)/ar(△DEF) = (AB/DE)² = (BC/EF)² = (CA/FD)².",
      "[1 mark] Given ar(△ABC) = ar(△DEF), so (AB/DE)² = 1, giving AB/DE = 1, i.e. AB = DE; similarly BC = EF and CA = FD.",
      "[1 mark] With all three pairs of corresponding sides equal, by the SSS congruence criterion △ABC ≅ △DEF. Proved."
    ],
    "finalAnswer": "△ABC ≅ △DEF",
    "explanation": "Equal areas force the ratio of areas to be 1, so the side ratio is 1; equal corresponding sides give SSS congruence.",
    "isCompetencyBased": true,
    "ncertRef": "Ex 6.4 Q1",
    "strategyHint": "Set the area ratio equal to 1 and read off equal sides, then apply SSS congruence.",
    "requiresDiagram": false
  },

  {
    "id": "BX-TRI-PF-020",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Areas of Similar Triangles",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "ABCD is a trapezium with AB ∥ DC, and its diagonals AC and BD intersect at O. Prove that ar(△AOD) = ar(△BOC).",
    "options": [],
    "answer": "ar(△AOD) = ar(△BOC) (proved)",
    "solutionSteps": [
      "[1 mark] Triangles ABD and ABC stand on the same base AB and lie between the same parallels AB and DC, so ar(△ABD) = ar(△ABC).",
      "[1 mark] From the diagonals: ar(△ABD) = ar(△AOB) + ar(△AOD) and ar(△ABC) = ar(△AOB) + ar(△BOC).",
      "[1 mark] Subtracting the common area ar(△AOB) from the equal areas ar(△ABD) = ar(△ABC) gives ar(△AOD) = ar(△BOC). Proved."
    ],
    "finalAnswer": "ar(△AOD) = ar(△BOC)",
    "explanation": "Triangles on the same base between the same parallels are equal in area; removing the common triangle AOB leaves the result.",
    "isCompetencyBased": true,
    "ncertRef": "Ex 6.4 (areas in a trapezium)",
    "strategyHint": "Use same-base-same-parallels equality for △ABD and △ABC, then subtract the shared △AOB.",
    "requiresDiagram": false
  }
];
