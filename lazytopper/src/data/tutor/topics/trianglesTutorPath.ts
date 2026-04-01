import type { ChapterTutorPath } from "../tutorFlowTypes";

export const trianglesTutorPath: ChapterTutorPath = {
  topicKey: "triangles",
  canonicalTopicKey: "triangles",
  subject: "Maths",
  status: "partial",
  studentJourney: [
    {
      id: "tri-start",
      title: "Start with similarity as the chapter spine",
      studentGoal:
        "Give the student one clear entry point instead of mixing BPT, proof structure, and ratio consequences from the start.",
      stepType: "start",
      sourceRefs: [
        {
          kind: "topicKey",
          path: "src/data/topicHubV2Full.ts",
          value: '"topicKey": "triangles"',
          label: "TopicHub V2 triangles shell",
        },
        {
          kind: "topicKey",
          path: "src/data/topicHubV2Enrichment.ts",
          value: '"triangles": {',
          label: "TopicHub enrichment for triangles",
        },
      ],
      recommendedCTA: "Open TopicHub Learn and frame the chapter around proving similarity before using any ratio result.",
      expectedStudentOutcome: "Student sees similarity as the main reasoning engine of the chapter.",
      cognitiveLoadNote: "Delay enrichment-only branches until the assessed-core path is stable.",
    },
    {
      id: "tri-concept-ladder",
      title: "Teach the assessed concept ladder first",
      studentGoal: "Sequence criteria, BPT, and CPST before branching into enrichment.",
      stepType: "concept",
      sourceRefs: [
        {
          kind: "file",
          path: "src/data/trianglesGuidedMindmap.ts",
          label: "Guided concept ladder",
        },
        {
          kind: "file",
          path: "src/data/geminiTopicHubPacks/trianglesTopicHubPack.ts",
          label: "Triangles worked examples and study boosters",
        },
        {
          kind: "stringSearch",
          path: "src/data/syllabus/scopePolicy.ts",
          value: 'canonicalTopicKey === "triangles"',
          label: "Triangles scope guard",
        },
      ],
      recommendedCTA: "Teach AA/SAS/SSS and BPT first, then use CPST applications only after similarity is explicit.",
      expectedStudentOutcome: "Student can identify which theorem or criterion should be named before solving.",
      mentorModeHint: "explain",
      cognitiveLoadNote: "Keep theorem naming and correspondence order explicit at every step.",
    },
    {
      id: "tri-misconception-repair",
      title: "Repair proof-writing mistakes before timed solving",
      studentGoal: "Stop common board-mark losses caused by missing correspondence and weak conclusion lines.",
      stepType: "misconception",
      sourceRefs: [
        {
          kind: "topicKey",
          path: "src/data/topicHubV2Full.ts",
          value: '"topicKey": "triangles"',
          label: "TopicHub base misconceptions",
        },
        {
          kind: "file",
          path: "src/data/bsre/hint_ladder_policy_triangles_v1.md",
          label: "Triangles hint ladder policy",
        },
        {
          kind: "file",
          path: "src/data/bsre/triangles_bsre_rubrics_v1.json",
          label: "Triangles rubric-level mark-loss map",
        },
      ],
      recommendedCTA: "Run a quick proof-health check before asking the student to write a full solution.",
      expectedStudentOutcome: "Student stops skipping criterion names, correspondence order, and the final conclusion line.",
      mentorModeHint: "check_cbse",
    },
    {
      id: "tri-guided-example",
      title: "Use one guided example before each proof family",
      studentGoal: "Show how a clean board answer should look before independent practice.",
      stepType: "example",
      sourceRefs: [
        {
          kind: "file",
          path: "src/data/geminiTopicHubPacks/trianglesTopicHubPack.ts",
          label: "Worked examples and case-study pack",
        },
        {
          kind: "file",
          path: "src/data/_final/maths-triangles/boardSteps.json",
          label: "Triangles board-step exemplars",
        },
      ],
      recommendedCTA: "Show one solved AA/BPT/example flow before moving to student writing.",
      expectedStudentOutcome: "Student can mirror the theorem-first, therefore/hence board structure instead of guessing the answer format.",
      mentorModeHint: "explain",
    },
    {
      id: "tri-board-practice",
      title: "Use the chapter pack and live runtime pool for board practice",
      studentGoal:
        "Practice from the real runtime pool while keeping the chapter honest about its current depth.",
      stepType: "practice",
      sourceRefs: [
        {
          kind: "file",
          path: "src/data/questionBanks/class10/maths/triangles.pack1.ts",
          label: "Triangles Pack1 canonical bank",
        },
        {
          kind: "questionId",
          path: "src/data/questionBanks/class10/maths/triangles.pack1.ts",
          value: "2026-TRI-P1-B-005",
          label: "Triangles pack BPT checkpoint",
        },
        {
          kind: "questionId",
          path: "src/data/predictedQuestionsAdditions.ts",
          value: "2026-TRI-SA-07",
          label: "Triangles live predicted BPT question",
        },
        {
          kind: "stringSearch",
          path: "src/data/highlyProbableQuestions.ts",
          value: 'topic: "Triangles"',
          label: "Triangles HPQ bucket",
        },
        {
          kind: "file",
          path: "src/data/predictionCore.ts",
          label: "Unified practice selection runtime",
        },
      ],
      recommendedCTA:
        "Use Practice from the chapter pack plus the live prediction/HPQ pool, but keep the router theorem-family first.",
      expectedStudentOutcome:
        "Student gets chapter-specific practice without overclaiming full Trigonometry-level depth.",
      mentorModeHint: "hint",
      cognitiveLoadNote: "Keep practice grouped by proof family or theorem family instead of broad random sets.",
    },
    {
      id: "tri-hpq-sprint",
      title: "Use HPQ as the fast exam-readiness sprint",
      studentGoal: "Give stronger students a direct high-value path after the chapter spine is stable.",
      stepType: "hpq",
      sourceRefs: [
        {
          kind: "stringSearch",
          path: "src/data/highlyProbableQuestions.ts",
          value: 'topic: "Triangles"',
          label: "Triangles HPQ bucket",
        },
        {
          kind: "file",
          path: "src/pages/HighlyProbableQuestions.tsx",
          label: "HPQ student-facing surface",
        },
      ],
      recommendedCTA: "After one clean proof + one BPT question, jump to HPQ for fast board payoff and confidence checks.",
      expectedStudentOutcome: "Strong students get efficient exam-relevant repetition without feeling trapped in beginner flow.",
      cognitiveLoadNote: "Keep HPQ as an intentional fast lane, not the first chapter step for anxious learners.",
    },
    {
      id: "tri-mentor-support",
      title: "Lean on the chapter-specific mentor stack when proof friction appears",
      studentGoal: "Use the strongest existing tutor assets in the repo without rewriting the chapter system.",
      stepType: "mentor",
      sourceRefs: [
        {
          kind: "stringSearch",
          path: "src/tutor/topicTeachContracts.ts",
          value: "triangles: {",
          label: "Triangles teach-contract seed",
        },
        {
          kind: "file",
          path: "src/data/trianglesGrindMindmap.ts",
          label: "Triangles grind mindmap",
        },
        {
          kind: "file",
          path: "src/data/_finalGenerated/triangles.mentor.ts",
          label: "Triangles mentor seed",
        },
        {
          kind: "stringSearch",
          path: "server/index.cjs",
          value: "triangles_bsre",
          label: "Backend triangles BSRE path",
        },
      ],
      recommendedCTA: "When proof-writing breaks down, route the student to Mentor after one self-attempt, not before.",
      expectedStudentOutcome: "Student gets human-tutor-like help on theorem choice, correspondence, and CBSE answer structure.",
      mentorModeHint: "check_cbse",
    },
    {
      id: "tri-next-step",
      title: "Choose the next chapter move deliberately",
      studentGoal: "Prevent scope drift and direct the student to the right follow-up chapter.",
      stepType: "next-step",
      sourceRefs: [
        {
          kind: "stringSearch",
          path: "src/data/syllabus/scopePolicy.ts",
          value: "Pythagoras and areas-of-similar-triangles are enrichment-only in this policy layer.",
          label: "Assessed vs enrichment guardrail",
        },
        {
          kind: "topicKey",
          path: "src/data/topicHubV2Full.ts",
          value: '"topicKey": "trigonometry"',
          label: "Natural bridge chapter after triangles",
        },
      ],
      recommendedCTA: "If assessed-core is stable, move next to Trigonometry or Coordinate Geometry; keep enrichment-only material explicitly marked.",
      expectedStudentOutcome: "Student knows what is exam-core now and what should wait for later transfer or enrichment.",
      cognitiveLoadNote: "Do not blur assessed scope and enrichment in the same revision loop.",
    },
  ],
  sourceOfTruth: {
    topicHubV2: "authoritative",
    topicHubEnrichment: "authoritative",
    predictedQuestions: "authoritative",
    highlyProbableQuestions: "authoritative",
    qtfOverlay: "supporting",
    canonicalQuestionBank: "supporting",
    mentorAssets: "authoritative",
  },
  mentorSupport: {
    status: "deep",
    surfaces: ["AiMentorPage", "TopicHub tutor drawer", "Practice mentor flow", "server triangles BSRE path"],
    note: "Triangles already has the strongest chapter-specific mentor stack in the repo: teach contracts, guided/grind mindmaps, BSRE rubrics, final board-step assets, and backend routing.",
  },
  qtfSupport: {
    status: "partial",
    note: "Triangles now has a real family-first QTF overlay, a chapter-specific canonical pack, and focused practice routing. It still uses the family router instead of the full Trigonometry-style generic tile strip.",
  },
  gapFlags: [
    "triangles-qtf-is-family-first-not-a-full-generic-tile-strip",
    "triangles-pack-depth-is-still-lighter-than-trigonometry",
    "assessed-scope-and-enrichment-scope-are-not-the-same",
    "chapter-assets-live-across-topic-hub-mentor-bsre-and-final-json-paths",
  ],
  nextExpansionNotes: [
    "Triangles now has focused bank depth and family-aware routing, but it should still be treated as partial until the chapter reaches Trigonometry-level volume and tile breadth.",
    "Any expansion must respect scopePolicy before copying Pythagoras or area-ratio content into assessed-core flows.",
    "Keep mentor assets referenced, not duplicated, until the chapter gets its own overlay and pack.",
  ],
};
