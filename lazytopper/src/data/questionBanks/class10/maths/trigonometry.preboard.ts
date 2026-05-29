import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * trigonometry — CBSE Maths Standard Preboard Sample Papers SP1 & SP2 (Class X, Code 041).
 * Source: 776_STD SP1.pdf + 777_STD SP2.pdf (unsolved papers; worked solutions
 * generated in CBSE marking style, Sprint 1 follow-up, 2026-05-29). topicKey "trigonometry".
 * Section D (4-mark) items omitted — 4 marks maps to no valid CBSE section. pyqYear OMITTED.
 */
export const TRIG_PREBOARD: CanonicalQuestion[] = [
  {
    "id": "PB-M-1-TRIG-A-001",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Trigonometric Identities",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "(cos⁴A − sin⁴A) is equal to",
    "options": [
      "(a) 1 − 2cos²A",
      "(b) 2sin²A − 1",
      "(c) sin²A − cos²A",
      "(d) 2cos²A − 1"
    ],
    "answer": "(d) 2cos²A − 1",
    "solutionSteps": [
      "[1 mark] cos⁴A − sin⁴A = (cos²A − sin²A)(cos²A + sin²A) = (cos²A − sin²A)(1) = cos²A − (1 − cos²A) = 2cos²A − 1. Answer: (d)."
    ],
    "finalAnswer": "(d) 2cos²A − 1",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-1-TRIG-C-001",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Heights and Distances",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "A local Outdoors Club has just hiked to the south rim of a large canyon, when they spot a climber attempting to scale the taller northern face. The distance between the sheer walls of the northern and southern faces of the canyon is approximately 175 m. They sight an angle of depression of 60° to the bottom of the north face, and angles of elevation of 30° and 45° to the climber and to the top of the northern rim respectively. (a) How high is the southern rim of the canyon? (b) How high is the northern rim? (c) How much farther until the climber reaches the top?",
    "options": [],
    "answer": "(a) ≈ 303.1 m, (b) ≈ 478.1 m, (c) ≈ 74 m",
    "solutionSteps": [
      "[1 mark] The observers at the south rim look across the canyon (horizontal distance 175 m). Angle of depression 60° to the bottom of the north face gives the height of the south rim above the canyon floor = 175 × tan60° = 175√3 ≈ 303.1 m.",
      "[1 mark] Angle of elevation 45° to the top of the north rim gives height above eye-level = 175 × tan45° = 175 m. So height of north rim above the canyon floor = 303.1 + 175 = 478.1 m.",
      "[1 mark] Angle of elevation 30° to the climber gives the climber's height above eye-level = 175 × tan30° = 175/√3 ≈ 101.0 m. Distance the climber still has to climb = (height above eye-level of top) − (of climber) = 175 − 101.0 ≈ 74 m."
    ],
    "finalAnswer": "(a) Southern rim ≈ 303.1 m; (b) Northern rim ≈ 478.1 m; (c) ≈ 74 m remaining",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "Cross-section of a canyon: a vertical south wall (left) where the observers stand at the top, and a taller vertical north wall (right). Horizontal gap between the walls = 175 m, drawn at the observers' eye level. From the observer's horizontal line of sight: a line angled 60° downward to the foot of the north wall, a line 30° upward to the climber on the north wall, and a line 45° upward to the top of the north rim."
  },
  {
    "id": "PB-M-1-TRIG-C-002",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Heights and Distances",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Hard",
    "bloomSkill": "Applying",
    "questionText": "Hari, standing on the top of a building, sees the top of a tower at an angle of elevation of 50° and the foot of the tower at an angle of depression of 20°. Hari is 1.6 metres tall and the height of the building on which he is standing is 9.2 metres. (a) Draw a rough sketch according to the given information. (b) How far is the tower from the building? (c) Calculate the height of the tower. [Use sin20° = 0.34, cos20° = 0.94, tan20° = 0.36, sin50° = 0.77, cos50° = 0.64, tan50° = 1.19]",
    "options": [],
    "answer": "(b) 30 m, (c) ≈ 46.5 m",
    "solutionSteps": [
      "[1 mark] Hari's eye level above the ground = building height + Hari's height = 9.2 + 1.6 = 10.8 m. Let the horizontal distance to the tower be d. From the angle of depression 20° to the tower's foot: tan20° = 10.8/d.",
      "[1 mark] d = 10.8 / tan20° = 10.8 / 0.36 = 30 m. So the tower is 30 m from the building.",
      "[1 mark] Height of tower above eye level = d × tan50° = 30 × 1.19 = 35.7 m. Total height of tower = 35.7 + 10.8 = 46.5 m."
    ],
    "finalAnswer": "(b) Distance = 30 m; (c) Height of tower ≈ 46.5 m",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "A building (height 9.2 m) on the left with Hari (1.6 m tall) standing on its top, so his eye is 10.8 m above the ground. A taller tower stands to the right at horizontal distance d. From Hari's eye, a horizontal line; a line of elevation 50° up to the top of the tower and a line of depression 20° down to the foot of the tower. The horizontal distance between building and tower is the base of both right triangles."
  },
  {
    "id": "PB-M-2-TRIG-C-001",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Heights and Distances",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Hard",
    "bloomSkill": "Applying",
    "questionText": "From her elevated observation post 300 m (horizontally) away, a naturalist spots a troop of baboons high up in a tree. The angle of depression to the bottom of the tree is 30°, the angle of elevation to the top of the tree is 60°, and the angle of elevation to the troop of baboons is 45°. Find (a) the height of the observation post, (b) the height of the baboons' tree, and (c) the height of the baboons above ground.",
    "options": [],
    "answer": "(a) 100√3 ≈ 173.2 m, (b) 400√3 ≈ 692.8 m, (c) (300 + 100√3) ≈ 473.2 m.",
    "solutionSteps": [
      "[1 mark] (a) Height of post = horizontal distance × tan(angle of depression to tree base) = 300 × tan 30° = 300/√3 = 100√3 ≈ 173.2 m.",
      "[1 mark] (b) Height of tree top above the post level = 300 × tan 60° = 300√3 m. Height of tree = (top above post) + (post height above tree base) = 300√3 + 100√3 = 400√3 ≈ 692.8 m.",
      "[1 mark] (c) Height of baboons above the post level = 300 × tan 45° = 300 m. Height of baboons above the ground = post height + 300 = 100√3 + 300 ≈ 473.2 m."
    ],
    "finalAnswer": "(a) ≈ 173.2 m, (b) ≈ 692.8 m, (c) ≈ 473.2 m",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "A horizontal line of 300 m from the observation post (left, on a raised platform) to the tree (right). From the post's sight line: a downward 30° line to the tree base (ground), an upward 45° line to the baboons on the trunk, and an upward 60° line to the tree top. The tree is vertical on the right."
  },
  {
    "id": "PB-M-2-TRIG-C-002",
    "subject": "Maths",
    "topicKey": "trigonometry",
    "subtopic": "Heights and Distances",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Hard",
    "bloomSkill": "Applying",
    "questionText": "A boy 1.4 m tall, standing at the edge of a river bank, sees the top of a tree on the edge of the other bank at an elevation of 55°. Standing back by 3 m, he sees it at an elevation of 45°. (a) Draw a rough figure showing these facts. (b) How wide is the river and how tall is the tree? [sin55° = 0.8192, cos55° = 0.5736, tan55° = 1.4281]",
    "options": [],
    "answer": "River width ≈ 7 m; tree height ≈ 11.4 m.",
    "solutionSteps": [
      "[1 mark] Let the height of the tree above the boy's eye level be h, and the river width (horizontal distance from the first position to the tree base) be d. From the first position: tan 55° = h/d. From the position 3 m back: tan 45° = h/(d + 3) = 1, so h = d + 3.",
      "[1 mark] Substitute into tan 55° = 1.4281: 1.4281 = (d + 3)/d → 1.4281d = d + 3 → 0.4281d = 3 → d ≈ 7.0 m (river width). Then h = d + 3 ≈ 10.0 m.",
      "[1 mark] Total height of tree = h + eye/boy height = 10.0 + 1.4 ≈ 11.4 m."
    ],
    "finalAnswer": "River width ≈ 7 m; tree height ≈ 11.4 m.",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "A vertical tree on the far river bank. The boy (1.4 m tall) stands at the near bank edge; his line of sight to the tree top makes 55° with the horizontal at eye level. He steps back 3 m and the line of sight makes 45°. The horizontal eye-level distance from the first position to the tree base is the river width d; h is the tree height above eye level."
  }
];
