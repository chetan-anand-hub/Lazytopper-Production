import { promises as fs } from "node:fs";
import path from "node:path";
import mammoth from "mammoth";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "feature_file_matrix.json");

const proTipsDoc = "c:\\Users\\Chetan\\OneDrive\\Desktop\\Lazytopper\\UIUX\\Pro Tips.docx";
const trianglesDocDir =
  "c:\\Users\\Chetan\\OneDrive\\Desktop\\Lazytopper\\wayforward\\24-01-2026\\Reports\\Previous reports\\Triangles Audit Plan";
const trianglesDocPrefix = "Designing an AI-Powered Human-Level Tutor for CBSE Class";

async function safeRead(relPath) {
  try {
    return await fs.readFile(path.join(repoRoot, relPath), "utf8");
  } catch {
    return "";
  }
}

async function findTrianglesDocPath() {
  try {
    const files = await fs.readdir(trianglesDocDir);
    const match = files.find(
      (f) => f.endsWith(".docx") && f.includes(trianglesDocPrefix) && f.includes("Triangles Case Study")
    );
    return match ? path.join(trianglesDocDir, match) : "";
  } catch {
    return "";
  }
}

async function extractDocText(docPath) {
  if (!docPath) return "";
  try {
    const result = await mammoth.extractRawText({ path: docPath });
    return String(result.value || "");
  } catch {
    return "";
  }
}

function toStatus(hitCount, total) {
  if (total === 0) return "missing";
  if (hitCount === 0) return "missing";
  if (hitCount >= total) return "implemented";
  return "partial";
}

function makeFeature(id, source, summary, evidence) {
  return { id, source, summary, evidence };
}

async function run() {
  const trianglesDocPath = await findTrianglesDocPath();
  const proTipsText = await extractDocText(proTipsDoc);
  const trianglesText = await extractDocText(trianglesDocPath);

  const fileCache = new Map();
  async function hasEvidence(relPath, regex) {
    if (!fileCache.has(relPath)) fileCache.set(relPath, await safeRead(relPath));
    const txt = fileCache.get(relPath);
    return regex.test(txt);
  }

  const features = [
    makeFeature(
      "human_tutor_loop",
      "triangles_doc",
      "Learn -> Practice -> Mistakes -> Exam Tips -> Mastery flow in TopicHub tutor.",
      [
        { file: "src/components/tutor/TutorDrawerV2.tsx", regex: /const sessionSteps = \["Learn", "Checkpoint", "Practice", "Mistake Fix", "Exam Drill", "Mastery"\]/ },
        { file: "src/components/tutor/TutorDrawerV2.tsx", regex: /Checkpoint not yet passed for this node\./ },
        { file: "src/pages/TopicHub.tsx", regex: /type TopicTabKey = 'learn' \| 'grind' \| 'resources';/ },
      ]
    ),
    makeFeature(
      "human_tutor_exam_format_enforcement",
      "triangles_doc",
      "Deterministic CBSE exam-writing teach contract normalization.",
      [
        { file: "server/index.cjs", regex: /enforceTeacherGoal/ },
        { file: "server/index.cjs", regex: /normalizeTeachKeyIdeas/ },
        { file: "server/index.cjs", regex: /enforceCheckpointAnswer/ },
      ]
    ),
    makeFeature(
      "human_tutor_contextual_diagrams",
      "triangles_doc",
      "Diagram-required tutor output for diagram-heavy topics.",
      [
        { file: "src/components/DiagramBlock.tsx", regex: /TutorDiagramSpec|diagramRequired|diagramType/ },
        { file: "src/pages/TopicHub.tsx", regex: /extractDiagramSpec|inferDiagramTypeFromText|diagram/i },
        { file: "scripts/ops/topic_diagram_coverage_acceptance.mjs", regex: /diagram_required/ },
      ]
    ),
    makeFeature(
      "daily_focus_mix",
      "pro_tips",
      "Daily Focus Mix playlist behavior with one-tap entry.",
      [
        { file: "src/services/dailyMixGenerator.ts", regex: /1 concept item \+ 3 must-crack questions \+ 1 revision card/ },
        { file: "src/pages/Dashboard.tsx", regex: /Play Mix|Daily Mix|Your .* Mix/ },
        { file: "src/pages/DailyMixPage.tsx", regex: /DailyMixWidget/ },
      ]
    ),
    makeFeature(
      "match_percent_score",
      "pro_tips",
      "Topic-level match score visible in topic selection surfaces.",
      [
        { file: "src/engine/smartLearningStore.tsx", regex: /computeMatchScoreForChapter|getMatchScoreForChapter/ },
        { file: "src/pages/TrendsPage.tsx", regex: /% Match|getMatchScoreForChapter/ },
        { file: "src/pages/TopicHubHome.tsx", regex: /% Match|getMatchScoreForChapter/ },
      ]
    ),
    makeFeature(
      "vibe_check",
      "pro_tips",
      "Beast vs Zombie mode with low-energy fallback behavior.",
      [
        { file: "src/context/vibeModeContext.tsx", regex: /type VibeMode = 'beast' \| 'zombie'/ },
        { file: "src/pages/Login.tsx", regex: /Energy Level:|setMode\("zombie"\)|setMode\("beast"\)/ },
        { file: "src/pages/Dashboard.tsx", regex: /Energy Level:|setMode\("zombie"\)|setMode\("beast"\)/ },
      ]
    ),
    makeFeature(
      "command_palette",
      "pro_tips",
      "Cmd/Ctrl+K global command palette with fast navigation intents.",
      [
        { file: "src/App.tsx", regex: /Press Ctrl\/Cmd \+ K to search/ },
        { file: "src/ui/components/CommandPalette.tsx", regex: /onSelect|CommandPalette|Enter/ },
        { file: "src/services/commandIntent.ts", regex: /parseCommandIntent|navigateToPractice|navigateToTopicHub/ },
      ]
    ),
    makeFeature(
      "weekly_wrapped",
      "pro_tips",
      "Weekly Wrapped story and sharing loop.",
      [
        { file: "src/pages/WeeklyWrappedPage.tsx", regex: /Weekly Wrapped|Share/ },
        { file: "src/components/WeeklyWrappedCarousel.tsx", regex: /WeeklyWrappedCarousel|Share to Instagram/ },
        { file: "src/services/weeklyWrappedGenerator.ts", regex: /consistencyPercentile|powerHourLabel/ },
      ]
    ),
    makeFeature(
      "auth_google_phone",
      "product_flow",
      "Homepage/login should support Google + Phone OTP auth.",
      [
        { file: "src/pages/Login.tsx", regex: /Continue with Email \(Google\)|Phone number \(OTP\)|Send OTP|Verify OTP/ },
        { file: "src/context/AuthContext.tsx", regex: /sendPhoneOtp|verifyPhoneOtp|signInWithGoogle/ },
      ]
    ),
    makeFeature(
      "topic_launcher_and_resume",
      "human_tutor_scale",
      "Dedicated TopicHub launcher with resume/weakest-topic guidance.",
      [
        { file: "src/pages/TopicHubHome.tsx", regex: /Continue where you left off|Search topic|Start Learning/ },
        { file: "src/App.tsx", regex: /path="\/topic-hub"/ },
        { file: "src/services/topicHubMastery.ts", regex: /loadTopicMasterySnapshot|getWeakestNodes|lazytopper\.topicHub\.triangles\.mastery\.v1/ },
      ]
    ),
  ];

  const evaluated = [];
  for (const f of features) {
    const evidenceResults = [];
    for (const e of f.evidence) {
      const hit = await hasEvidence(e.file, e.regex);
      evidenceResults.push({
        file: e.file,
        pattern: String(e.regex),
        hit,
      });
    }
    const hitCount = evidenceResults.filter((r) => r.hit).length;
    evaluated.push({
      id: f.id,
      source: f.source,
      summary: f.summary,
      status: toStatus(hitCount, evidenceResults.length),
      coverage: {
        matched: hitCount,
        total: evidenceResults.length,
      },
      evidence: evidenceResults,
    });
  }

  const statusCounts = evaluated.reduce(
    (acc, f) => {
      acc[f.status] = (acc[f.status] || 0) + 1;
      return acc;
    },
    { implemented: 0, partial: 0, missing: 0 }
  );

  const report = {
    generatedAt: new Date().toISOString(),
    docs: {
      proTipsDoc,
      proTipsFound: proTipsText.length > 0,
      trianglesDoc: trianglesDocPath,
      trianglesDocFound: trianglesText.length > 0,
      keywordSignals: {
        proTipsDailyMix: /Daily Focus Mix/i.test(proTipsText),
        proTipsMatch: /Match/i.test(proTipsText),
        proTipsVibe: /Vibe Check/i.test(proTipsText),
        proTipsCommandPalette: /Command Palette/i.test(proTipsText),
        proTipsWrapped: /Wrapped/i.test(proTipsText),
        trianglesLearnPracticeMistakesExamMastery: /Learn.*Practice.*Mistakes.*Exam.*Mastery/is.test(
          trianglesText
        ),
      },
    },
    summary: {
      totalFeatures: evaluated.length,
      ...statusCounts,
    },
    features: evaluated,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  console.log(
    `feature_file_matrix: implemented=${statusCounts.implemented}, partial=${statusCounts.partial}, missing=${statusCounts.missing}`
  );
  console.log(`report=${path.relative(repoRoot, outPath).replaceAll("\\", "/")}`);
}

run().catch(async (err) => {
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        error: String(err?.stack || err),
      },
      null,
      2
    ),
    "utf8"
  );
  console.error("feature_file_matrix errored.");
  console.error(String(err?.stack || err));
  process.exitCode = 1;
});
