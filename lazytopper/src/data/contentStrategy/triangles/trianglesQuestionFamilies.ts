import type { QuestionFamilyOverlay } from "../types";
import {
  buildParallelLinesDiagram,
  buildSimilarityDiagram,
  buildTriangleDiagram,
} from "../../../diagrams/geometryBuilders";

export const trianglesQuestionFamilies: QuestionFamilyOverlay[] = [
  {
    familyId: "TRI_FAMILY_THEOREM_CHOICE",
    qtypeId: "TRI_QTYPE_01_THEOREM_CHOICE",
    studentLabel: "Which theorem fits first?",
    tutorMeaning:
      "Classify the figure before solving: equal angles -> similarity, parallel line -> BPT, matching side ratios with the included angle -> SAS similarity.",
    weakStudentCue:
      "Do not start ratios immediately. First ask: do I see equal angles, a parallel line, or side-pair correspondence that fixes a similarity criterion?",
    advancedStudentShortcut:
      "Write the theorem choice in one clean line, then jump straight to the target relation.",
    commonConfusion:
      "Students mix CPST, BPT, and similarity without proving the setup first.",
    recommendedNextAction:
      "Do one theorem-choice drill, then one worked example from the same family.",
    theoremFamily: "Theorem choice",
    skillFamily: "Recognition",
    boardPayoff:
      "This prevents the biggest board loss: wrong theorem in the opening step.",
    practiceHint: "Similarity",
    focusBankIds: [
      "2026-TRI-P1-A-001",
      "2026-TRI-P1-A-003",
      "2026-TRI-MCQ-05",
      "2026-TRI-P1-B-001",
    ],
    mentorPrompt:
      "I am confused about which theorem fits this Triangles question. Help me decide between similarity, BPT, converse BPT, and CPST before solving.",
    mentorModeHint: "solve_with_me",
    mentorSolveStyle: "socratic",
    tutorNodeId: "gQ1",
    diagramRequired: true,
    recommendedDiagramType: "geometry_triangle",
    visualPriority: "high",
    diagram: buildTriangleDiagram({
      title: "Read the figure before solving",
      caption: "The first board step is often theorem choice, not calculation.",
      diagramIntent: "explain",
      accessibilityLabel: "Triangles theorem-choice setup",
    }),
  },
  {
    familyId: "TRI_FAMILY_SIMILARITY_CHOICE",
    qtypeId: "TRI_QTYPE_02_SIMILARITY",
    studentLabel: "Similarity rule choice",
    tutorMeaning:
      "Choose AA, SAS, or SSS correctly and keep the triangle order consistent before writing ratios.",
    weakStudentCue:
      "Match the corresponding vertices first. Wrong triangle order ruins the whole proof.",
    advancedStudentShortcut:
      "Lock the criterion and correspondence in one line, then move straight to CPST or ratio use.",
    commonConfusion:
      "Students prove similarity but write the vertices in the wrong order or use SAS with a non-included angle.",
    recommendedNextAction:
      "Practice one recognition question and one proof that uses the same criterion.",
    theoremFamily: "Similarity criteria",
    skillFamily: "Criterion selection",
    boardPayoff:
      "Usually 1-3 marks depend on naming the correct criterion and matching the order cleanly.",
    practiceHint: "Similarity Criteria",
    focusBankIds: ["2026-TRI-AR-03", "2026-TRI-MCQ-05", "2026-TRI-AR-09"],
    mentorPrompt:
      "Check whether I chose the correct similarity criterion and triangle order. Keep it board-style and point out correspondence mistakes clearly.",
    mentorModeHint: "explain",
    mentorSolveStyle: "socratic",
    tutorNodeId: "gAA",
    diagramRequired: true,
    recommendedDiagramType: "geometry_similarity",
    visualPriority: "high",
    diagram: buildSimilarityDiagram({
      title: "Match angles before ratios",
      caption: "AA/SAS/SSS becomes easier when the correspondence is visible first.",
      diagramIntent: "explain",
      accessibilityLabel: "Similarity criterion visual",
    }),
  },
  {
    familyId: "TRI_FAMILY_BPT_PARALLEL",
    qtypeId: "TRI_QTYPE_03_BPT",
    studentLabel: "BPT / parallel-line pattern",
    tutorMeaning:
      "Use the parallel line as the trigger. Once DE || BC is fixed, the ratio step becomes justified.",
    weakStudentCue:
      "Circle the parallel line before writing any proportion. No parallel line means no BPT.",
    advancedStudentShortcut:
      "State the parallel condition once, then go directly to the required ratio or converse.",
    commonConfusion:
      "Students write AD/DB = AE/EC without first stating that the segment is parallel to the third side.",
    recommendedNextAction:
      "Do one direct BPT ratio question, then one converse or case-based variation.",
    theoremFamily: "BPT / converse BPT",
    skillFamily: "Parallel-line inference",
    boardPayoff:
      "A clean BPT first line saves marks in both 2-mark and 4-mark geometry questions.",
    practiceHint: "BPT",
    focusBankIds: [
      "2026-TRI-P1-B-005",
      "2026-TRI-SA-04",
      "2026-TRI-SA-07",
      "2026-TRI-CASE-04",
    ],
    mentorPrompt:
      "Check whether I used the parallel-line condition and BPT correctly. Tell me if I jumped to ratios too early.",
    mentorModeHint: "solve_with_me",
    mentorSolveStyle: "socratic",
    tutorNodeId: "gBPT",
    diagramRequired: true,
    recommendedDiagramType: "geometry_parallel_lines",
    visualPriority: "high",
    diagram: buildParallelLinesDiagram({
      title: "Parallel line -> proportional sides",
      caption: "BPT starts only after the parallel segment is identified clearly.",
      diagramIntent: "solve",
      accessibilityLabel: "BPT and parallel-line visual",
    }),
  },
  {
    familyId: "TRI_FAMILY_AREA_RATIO",
    qtypeId: "TRI_QTYPE_04_AREA_RATIO",
    studentLabel: "Area-ratio consequence",
    tutorMeaning:
      "After proving similarity, area ratio follows from the square of corresponding side ratio.",
    weakStudentCue:
      "Do not use area ratio before proving similarity. And do not forget to square the side ratio.",
    advancedStudentShortcut:
      "Once similarity is fixed, move straight from side ratio to squared area ratio.",
    commonConfusion:
      "Students either forget the square or apply the area rule without first establishing similar triangles.",
    recommendedNextAction:
      "Practice one direct ratio question and one case study where the side ratio must be inferred first.",
    theoremFamily: "Area ratio of similar triangles",
    skillFamily: "Application consequence",
    boardPayoff:
      "This is a favourite conceptual board pattern because it tests both theorem order and ratio discipline.",
    practiceHint: "Area Ratio",
    focusBankIds: ["2026-TRI-MCQ-03", "2026-TRI-P1-E-001"],
    mentorPrompt:
      "Check whether I proved similarity before using the area-ratio rule, and whether I squared the correct side ratio.",
    mentorModeHint: "solve_with_me",
    mentorSolveStyle: "socratic",
    tutorNodeId: "gArea",
    diagramRequired: true,
    recommendedDiagramType: "geometry_similarity",
    visualPriority: "medium",
    diagram: buildSimilarityDiagram({
      title: "Square the side ratio",
      caption: "Area ratio only comes after similarity and uses the square of corresponding sides.",
      diagramIntent: "revise",
      accessibilityLabel: "Area-ratio similarity visual",
    }),
  },
  {
    familyId: "TRI_FAMILY_PROOF_STRUCTURE",
    qtypeId: "TRI_QTYPE_05_PROOF",
    studentLabel: "Proof structure and justification",
    tutorMeaning:
      "Treat the answer as a board proof: name triangles, state the theorem, justify the step, then conclude.",
    weakStudentCue:
      "Write Given -> theorem/reason -> result. Do not jump straight to the final statement.",
    advancedStudentShortcut:
      "Use a compact board skeleton: identify pair, justify criterion, conclude, then apply CPST if needed.",
    commonConfusion:
      "Students know the idea but lose marks because they skip the theorem name, correspondence, or conclusion line.",
    recommendedNextAction:
      "Open one board example, then practise one proof with a clean statement-reason flow.",
    theoremFamily: "Proof writing",
    skillFamily: "Board proof structure",
    boardPayoff:
      "This is where 3-5 mark questions are won or lost. Structure matters as much as the theorem.",
    practiceHint: "Similarity",
    focusBankIds: ["2026-TRI-SA-07", "2026-TRI-CASE-04", "2026-TRI-AR-09"],
    sectionFilter: "C",
    mentorPrompt:
      "Check my Triangles proof in CBSE style. Focus on theorem choice, correspondence order, statement-reason flow, and the final conclusion line.",
    mentorModeHint: "board_steps",
    mentorSolveStyle: "board",
    tutorNodeId: "gEnd",
    diagramRequired: true,
    recommendedDiagramType: "geometry_triangle",
    visualPriority: "high",
    diagram: buildTriangleDiagram({
      title: "Proof-ready labeled figure",
      caption: "A clean figure lowers proof-writing mistakes before the first written line.",
      diagramIntent: "visualize_question",
      accessibilityLabel: "Triangles proof-writing setup",
    }),
  },
  {
    familyId: "TRI_FAMILY_BOARD_CHECK",
    qtypeId: "TRI_QTYPE_06_BOARD_CHECK",
    studentLabel: "Board-check my proof",
    tutorMeaning:
      "This family is not about learning the theorem from scratch. It is about whether the written solution will survive examiner checking.",
    weakStudentCue:
      "If you feel shaky, paste your full working and let the mentor check the missing line or wrong order.",
    advancedStudentShortcut:
      "Use this as a quick audit: theorem chosen, reason stated, ratio order correct, conclusion boxed.",
    commonConfusion:
      "Students think the idea is enough, but the examiner cuts marks for missing justification or weak final statements.",
    recommendedNextAction:
      "After one self-attempt, run a board-style check instead of restarting from zero.",
    theoremFamily: "Marking-scheme proof check",
    skillFamily: "Board examiner review",
    boardPayoff:
      "Best for converting almost-correct proofs into full-mark answers.",
    practiceHint: "BPT + ratios",
    focusBankIds: ["2026-TRI-SA-07", "2026-TRI-CASE-04", "2026-TRI-P1-E-002"],
    sectionFilter: "C",
    mentorPrompt:
      "Use CBSE marking-scheme style and check my Triangles proof for missing reasons, wrong triangle order, ratio-order errors, and weak conclusion lines.",
    mentorModeHint: "board_steps",
    mentorSolveStyle: "board",
    tutorNodeId: "gEnd",
    diagramRequired: true,
    recommendedDiagramType: "geometry_triangle",
    visualPriority: "medium",
    diagram: buildTriangleDiagram({
      title: "Examiner-check setup",
      caption: "Before you send the answer, make sure the compared triangles and final line are obvious in the figure.",
      diagramIntent: "mentor_support",
      accessibilityLabel: "Triangles board-check visual",
    }),
  },
];
