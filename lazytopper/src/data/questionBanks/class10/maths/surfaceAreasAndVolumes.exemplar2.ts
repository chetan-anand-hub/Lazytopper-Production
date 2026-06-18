import type { CanonicalQuestion } from '../../../predictionTypes';

// =============================================================================
// Source: NCERT Class 10 Mathematics Exemplar — Chapter 12 (Surface Areas & Volumes)
// PDF file used: jeep212.pdf (Exemplar) · Answer key cross-checked vs jeep2an.pdf
// topicKey: "surface-areas-and-volumes"
// Extraction date: 2026-06-18 · Bank-Expansion Phase 1, Batch 1.
//
// PROVENANCE / THE DECOUPLE:
//   • QUESTION text = AUTHENTIC, verbatim from the Exemplar PDF.
//   • SOLUTION = AI-GENERATED, step-marked, PENDING OWNER VERIFICATION.
//     solutionSource: "ai-generated" for EVERY id (all ids registered in
//     AI_GENERATED_SOLUTION_IDS in canonicalQuestionBank.ts). finalAnswers
//     cross-checked vs the official answer key; WORKED STEPS are AI and the owner
//     (examiner-of-record) must verify before merge. (π = 22/7 unless stated.)
//
// SYLLABUS (CBSE 2026-27) — BANNED, EXCLUDED at the question level:
//   • Frustum of a Cone — dropped Ex12.1 Q4,6,7,13,18; Ex12.2 Q5,7,8; Ex12.3 Q3,4;
//     Ex12.4 Q12.
//   • Conversion of Solid from One Shape to Another (melting/recasting solids) —
//     dropped Ex12.1 Q9,10,12,17; Ex12.3 Q1,2,11,12,14; Ex12.4 Q1,9.
//   (Water/sand transfer, displacement and packing problems are NOT "conversion of
//    solids" and remain in-syllabus.)
// DROPPED — figure-locked (cannot verify the figure; Q3 fidelity guardrail):
//   Ex12.1 Q3,4,5; Ex12.2 Q6; Ex12.3 Q8,9.
// DROPPED — unreconstructable: Ex12.2 Q3 (the claimed TSA formula was flattened in
//   the PDF and could not be confidently reconstructed — omitted, not guessed).
// Net-new only: deduped vs repo (existing refs Ex12.1 Q1,2,3,5,6,14,15,16; Ex12.2
//   Q1,2; Ex12.3 Q5,6,7,9; Ex12.4 Q6,11,14,20 are NOT repeated).
// solutionSteps: every step `[N mark]`-prefixed; prefixes sum to marks.
// =============================================================================

export const SAV_EXEMPLAR2: CanonicalQuestion[] = [
  // ===== Section A — MCQs (Exercise 12.1, 1 mark) =====
  { id: "SAV-N-EXEM2-12-MCQ-001", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Packing / Number of Spheres", section: "A", marks: 1, format: "MCQ", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A hollow cube of internal edge 22 cm is filled with spherical marbles of diameter 0.5 cm and it is assumed that 1/8 space of the cube remains unfilled. Then the number of marbles that the cube can accommodate is",
    options: ["142296", "142396", "142496", "142596"],
    answer: "142296",
    solutionSteps: ["[1 mark] Filled volume = (7/8) × 22³ = (7/8) × 10648 = 9317 cm³; each marble = (4/3)(22/7)(0.25)³ ≈ 0.0654762 cm³, so number = 9317 / 0.0654762 ≈ 142296 — option (A)."],
    finalAnswer: "142296 — option (A).",
    ncertRef: "Exemplar Ex 12.1 Q8", isCompetencyBased: true },

  { id: "SAV-N-EXEM2-12-MCQ-002", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Number of Bricks", section: "A", marks: 1, format: "MCQ", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A mason constructs a wall of dimensions 270 cm × 300 cm × 350 cm with bricks each of size 22.5 cm × 11.25 cm × 8.75 cm and it is assumed that 1/8 space is covered by the mortar. Then the number of bricks used to construct the wall is",
    options: ["11100", "11200", "11000", "11300"],
    answer: "11200",
    solutionSteps: ["[1 mark] Brick-filled volume = (7/8)(270 × 300 × 350) = (7/8)(28350000) = 24806250 cm³; each brick = 22.5 × 11.25 × 8.75 = 2214.84375 cm³, so number = 24806250 / 2214.84375 = 11200 — option (B)."],
    finalAnswer: "11200 — option (B).",
    ncertRef: "Exemplar Ex 12.1 Q11", isCompetencyBased: true },

  { id: "SAV-N-EXEM2-12-MCQ-003", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Cross-Section of a Cone", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "In a right circular cone, the cross-section made by a plane parallel to the base is a",
    options: ["circle", "frustum of a cone", "sphere", "hemisphere"],
    answer: "circle",
    solutionSteps: ["[1 mark] A plane parallel to the base of a right circular cone cuts it in a circle (a smaller circular section) — option (A)."],
    finalAnswer: "circle — option (A).",
    ncertRef: "Exemplar Ex 12.1 Q19", isCompetencyBased: false },

  { id: "SAV-N-EXEM2-12-MCQ-004", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Ratio of Surface Areas of Spheres", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Volumes of two spheres are in the ratio 64:27. The ratio of their surface areas is",
    options: ["3 : 4", "4 : 3", "9 : 16", "16 : 9"],
    answer: "16 : 9",
    solutionSteps: ["[1 mark] (r₁/r₂)³ = 64/27 ⇒ r₁/r₂ = 4/3, so the surface-area ratio = (r₁/r₂)² = 16/9 — option (D)."],
    finalAnswer: "16 : 9 — option (D).",
    ncertRef: "Exemplar Ex 12.1 Q20", isCompetencyBased: true },

  // ===== Section B — Short Answer with Reasoning (Exercise 12.2, 2 marks) =====
  { id: "SAV-N-EXEM2-12-VSA-001", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Sphere Inscribed in a Cube", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "Write 'True' or 'False' and justify: A solid ball is exactly fitted inside the cubical box of side a. The volume of the ball is (4/3)a³.",
    solutionSteps: ["[1 mark] A ball fitting exactly inside a cube of side a has diameter a, hence radius a/2.", "[1 mark] Its volume = (4/3)π(a/2)³ = πa³/6, not (4/3)a³ — so the statement is False."],
    finalAnswer: "False — the volume of the ball is πa³/6.",
    ncertRef: "Exemplar Ex 12.2 Q4", isCompetencyBased: true },

  // ===== Section C — Short Answer (Exercise 12.3, 3 marks) =====
  { id: "SAV-N-EXEM2-12-SA-001", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Displacement of Water", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Marbles of diameter 1.4 cm are dropped into a cylindrical beaker of diameter 7 cm containing some water. Find the number of marbles that should be dropped into the beaker so that the water level rises by 5.6 cm.",
    solutionSteps: ["[1 mark] Volume of risen water = π(3.5)²(5.6) = 68.6π cm³.", "[1 mark] Volume of one marble = (4/3)π(0.7)³ = (4/3)π(0.343) = 0.457333π cm³.", "[1 mark] Number of marbles = 68.6π / 0.457333π = 150."],
    finalAnswer: "150 marbles.",
    ncertRef: "Exemplar Ex 12.3 Q10", isCompetencyBased: true },

  { id: "SAV-N-EXEM2-12-SA-002", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Number of Bricks (Mortar)", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A wall 24 m long, 0.4 m thick and 6 m high is constructed with bricks each of dimensions 25 cm × 16 cm × 10 cm. If the mortar occupies 1/10 th of the volume of the wall, then find the number of bricks used in constructing the wall.",
    solutionSteps: ["[1 mark] Volume of wall = 24 × 0.4 × 6 = 57.6 m³ = 57600000 cm³; brick volume = 9/10 of this = 51840000 cm³.", "[1 mark] Volume of one brick = 25 × 16 × 10 = 4000 cm³.", "[1 mark] Number of bricks = 51840000 / 4000 = 12960."],
    finalAnswer: "12960 bricks.",
    ncertRef: "Exemplar Ex 12.3 Q13", isCompetencyBased: true },

  // ===== Section D — Long Answer (Exercise 12.4, 5 marks) =====
  { id: "SAV-N-EXEM2-12-LA-001", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Water Transfer (Cuboid to Cylinder)", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A rectangular water tank of base 11 m × 6 m contains water upto a height of 5 m. If the water in the tank is transferred to a cylindrical tank of radius 3.5 m, find the height of the water level in the tank.",
    solutionSteps: ["[1 mark] Volume of water in the rectangular tank = 11 × 6 × 5 = 330 m³.", "[1 mark] The water is poured into a cylinder of radius 3.5 m; let its height be h.", "[1 mark] Volume of cylinder = πr²h = (22/7)(3.5)²h = 38.5h.", "[1 mark] Equate volumes: 38.5h = 330.", "[1 mark] h = 330/38.5 ≈ 8.6 m."],
    finalAnswer: "Height of water ≈ 8.6 m.",
    ncertRef: "Exemplar Ex 12.4 Q2", isCompetencyBased: true },

  { id: "SAV-N-EXEM2-12-LA-002", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Volume of Hollow Box + Weight", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "How many cubic centimetres of iron is required to construct an open box whose external dimensions are 36 cm, 25 cm and 16.5 cm provided the thickness of the iron is 1.5 cm. If one cubic cm of iron weighs 7.5 g, find the weight of the box.",
    solutionSteps: ["[1 mark] External volume = 36 × 25 × 16.5 = 14850 cm³.", "[1 mark] Internal length = 36 − 2(1.5) = 33, width = 25 − 2(1.5) = 22.", "[1 mark] Internal height = 16.5 − 1.5 = 15 (open box, only the base removes thickness once), so internal volume = 33 × 22 × 15 = 10890 cm³.", "[1 mark] Volume of iron = 14850 − 10890 = 3960 cm³.", "[1 mark] Weight = 3960 × 7.5 g = 29700 g = 29.7 kg."],
    finalAnswer: "Iron required = 3960 cm³; weight = 29.7 kg.",
    ncertRef: "Exemplar Ex 12.4 Q3", isCompetencyBased: true },

  { id: "SAV-N-EXEM2-12-LA-003", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Volume of Cylinder (Ink Barrel)", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "The barrel of a fountain pen, cylindrical in shape, is 7 cm long and 5 mm in diameter. A full barrel of ink in the pen is used up on writing 3300 words on an average. How many words can be written in a bottle of ink containing one fifth of a litre?",
    solutionSteps: ["[1 mark] Barrel radius = 0.25 cm, length = 7 cm; volume = (22/7)(0.25)²(7) = 1.375 cm³.", "[1 mark] This barrel writes 3300 words, so words per cm³ = 3300/1.375 = 2400.", "[1 mark] One fifth of a litre = (1/5)(1000) = 200 cm³.", "[1 mark] Words from 200 cm³ = 2400 × 200.", "[1 mark] = 480000 words."],
    finalAnswer: "480000 words.",
    ncertRef: "Exemplar Ex 12.4 Q4", isCompetencyBased: true },

  { id: "SAV-N-EXEM2-12-LA-004", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Rate of Flow (Pipe filling Cone)", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Water flows at the rate of 10 m/minute through a cylindrical pipe 5 mm in diameter. How long would it take to fill a conical vessel whose diameter at the base is 40 cm and depth 24 cm?",
    solutionSteps: ["[1 mark] Conical vessel volume = (1/3)π(20)²(24) = 3200π cm³.", "[1 mark] Pipe radius = 0.25 cm; water speed = 10 m/min = 1000 cm/min.", "[1 mark] Volume of water per minute = π(0.25)²(1000) = 62.5π cm³.", "[1 mark] Time = 3200π / 62.5π = 51.2 minutes.", "[1 mark] 0.2 minute = 12 seconds, so the time is 51 minutes 12 seconds."],
    finalAnswer: "51 minutes 12 seconds.",
    ncertRef: "Exemplar Ex 12.4 Q5", isCompetencyBased: true },

  { id: "SAV-N-EXEM2-12-LA-005", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Curved Surface Area (Cost)", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A factory manufactures 120000 pencils daily. The pencils are cylindrical in shape each of length 25 cm and circumference of base as 1.5 cm. Determine the cost of colouring the curved surfaces of the pencils manufactured in one day at Rs 0.05 per dm².",
    solutionSteps: ["[1 mark] Curved surface area of one pencil = circumference × length = 1.5 × 25 = 37.5 cm².", "[1 mark] Total CSA for 120000 pencils = 120000 × 37.5 = 4500000 cm².", "[1 mark] Convert to dm²: 1 dm² = 100 cm², so area = 4500000/100 = 45000 dm².", "[1 mark] Cost = 45000 × Rs 0.05.", "[1 mark] = Rs 2250."],
    finalAnswer: "Rs 2250.",
    ncertRef: "Exemplar Ex 12.4 Q7", isCompetencyBased: true },

  { id: "SAV-N-EXEM2-12-LA-006", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Rate of Flow (Pipe filling Pond)", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Water is flowing at the rate of 15 km/h through a pipe of diameter 14 cm into a cuboidal pond which is 50 m long and 44 m wide. In what time will the level of water in pond rise by 21 cm?",
    solutionSteps: ["[1 mark] Pipe radius = 7 cm = 0.07 m; water speed = 15 km/h = 15000 m/h.", "[1 mark] Volume of water per hour = (22/7)(0.07)²(15000) = 231 m³.", "[1 mark] Required volume in pond = 50 × 44 × 0.21 = 462 m³.", "[1 mark] Time = 462 / 231.", "[1 mark] = 2 hours."],
    finalAnswer: "2 hours.",
    ncertRef: "Exemplar Ex 12.4 Q8", isCompetencyBased: true },

  { id: "SAV-N-EXEM2-12-LA-007", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Displacement (Rise of Water)", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "500 persons are taking a dip into a cuboidal pond which is 80 m long and 50 m broad. What is the rise of water level in the pond, if the average displacement of the water by a person is 0.04 m³?",
    solutionSteps: ["[1 mark] Total water displaced = 500 × 0.04 = 20 m³.", "[1 mark] This volume spreads over the pond's base area = 80 × 50 = 4000 m².", "[1 mark] Let rise be h; then 4000 × h = 20.", "[1 mark] h = 20/4000 = 0.005 m.", "[1 mark] = 0.5 cm."],
    finalAnswer: "Rise of water level = 0.5 cm.",
    ncertRef: "Exemplar Ex 12.4 Q10", isCompetencyBased: true },

  { id: "SAV-N-EXEM2-12-LA-008", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Cylinder of Sand to Conical Heap", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A cylindrical bucket of height 32 cm and base radius 18 cm is filled with sand. This bucket is emptied on the ground and a conical heap of sand is formed. If the height of the conical heap is 24 cm, find the radius and slant height of the heap.",
    solutionSteps: ["[1 mark] Volume of sand = volume of cylinder = π(18)²(32) = 10368π cm³.", "[1 mark] Conical heap volume = (1/3)πr²(24) = 8πr².", "[1 mark] Equate: 8πr² = 10368π ⇒ r² = 1296 ⇒ r = 36 cm.", "[1 mark] Slant height l = √(r² + h²) = √(1296 + 576) = √1872.", "[1 mark] l = 12√13 ≈ 43.27 cm."],
    finalAnswer: "Radius = 36 cm; slant height ≈ 43.27 cm.",
    ncertRef: "Exemplar Ex 12.4 Q13", isCompetencyBased: true },

  { id: "SAV-N-EXEM2-12-LA-009", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Cylinder + Hemispherical Dome", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "A building is in the form of a cylinder surmounted by a hemispherical vaulted dome and contains 41 19/21 m³ of air. If the internal diameter of dome is equal to its total height above the floor, find the height of the building.",
    solutionSteps: ["[1 mark] Let the dome radius be r; internal diameter 2r equals the total height H, so H = 2r.", "[1 mark] Cylinder height = H − r = 2r − r = r, with radius r.", "[1 mark] Volume = πr²(r) + (2/3)πr³ = (5/3)πr³ = 41 19/21 = 880/21.", "[1 mark] (5/3)(22/7)r³ = 880/21 ⇒ (110/21)r³ = 880/21 ⇒ r³ = 8 ⇒ r = 2.", "[1 mark] Height of building H = 2r = 4 m."],
    finalAnswer: "Height of the building = 4 m.",
    ncertRef: "Exemplar Ex 12.4 Q15", isCompetencyBased: true },

  { id: "SAV-N-EXEM2-12-LA-010", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Hemispherical Bowl to Bottles", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A hemispherical bowl of internal radius 9 cm is full of liquid. The liquid is to be filled into cylindrical shaped bottles each of radius 1.5 cm and height 4 cm. How many bottles are needed to empty the bowl?",
    solutionSteps: ["[1 mark] Volume of liquid = (2/3)π(9)³ = (2/3)π(729) = 486π cm³.", "[1 mark] Volume of one bottle = π(1.5)²(4) = 9π cm³.", "[1 mark] Number of bottles = 486π / 9π.", "[1 mark] = 54.", "[1 mark] So 54 bottles are needed to empty the bowl."],
    finalAnswer: "54 bottles.",
    ncertRef: "Exemplar Ex 12.4 Q16", isCompetencyBased: true },

  { id: "SAV-N-EXEM2-12-LA-011", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Water Left after Immersing Cone", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A solid right circular cone of height 120 cm and radius 60 cm is placed in a right circular cylinder full of water of height 180 cm such that it touches the bottom. Find the volume of water left in the cylinder, if the radius of the cylinder is equal to the radius of the cone.",
    solutionSteps: ["[1 mark] Cylinder volume = π(60)²(180) = 648000π cm³.", "[1 mark] Cone volume = (1/3)π(60)²(120) = 144000π cm³.", "[1 mark] Volume of water left = 648000π − 144000π = 504000π cm³.", "[1 mark] = 504000 × (22/7) = 1584000 cm³.", "[1 mark] = 1.584 m³."],
    finalAnswer: "Volume of water left = 1.584 m³.",
    ncertRef: "Exemplar Ex 12.4 Q17", isCompetencyBased: true },

  { id: "SAV-N-EXEM2-12-LA-012", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Rate of Flow (Rise of Water)", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Water flows through a cylindrical pipe, whose inner radius is 1 cm, at the rate of 80 cm/sec in an empty cylindrical tank, the radius of whose base is 40 cm. What is the rise of water level in tank in half an hour?",
    solutionSteps: ["[1 mark] Volume of water per second = π(1)²(80) = 80π cm³.", "[1 mark] Half an hour = 1800 seconds, so total volume = 80π × 1800 = 144000π cm³.", "[1 mark] Base area of the tank = π(40)² = 1600π cm².", "[1 mark] Rise h = 144000π / 1600π.", "[1 mark] = 90 cm."],
    finalAnswer: "Rise of water level = 90 cm.",
    ncertRef: "Exemplar Ex 12.4 Q18", isCompetencyBased: true },

  { id: "SAV-N-EXEM2-12-LA-013", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Rainfall from Roof Drainage", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "The rain water from a roof of dimensions 22 m × 20 m drains into a cylindrical vessel having diameter of base 2 m and height 3.5 m. If the rain water collected from the roof just fill the cylindrical vessel, then find the rainfall in cm.",
    solutionSteps: ["[1 mark] Volume of the cylindrical vessel = π(1)²(3.5) = (22/7)(3.5) = 11 m³.", "[1 mark] Let the rainfall depth be d metres over the roof area 22 × 20 = 440 m².", "[1 mark] Volume of rain water = 440 × d, which equals the vessel volume.", "[1 mark] 440d = 11 ⇒ d = 0.025 m.", "[1 mark] = 2.5 cm."],
    finalAnswer: "Rainfall = 2.5 cm.",
    ncertRef: "Exemplar Ex 12.4 Q19", isCompetencyBased: true },
];
