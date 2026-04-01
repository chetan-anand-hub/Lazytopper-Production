import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { createRequire } from "module";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "student_bots_product_experience_acceptance.json");
const outHumanPath = path.join(outDir, "student_bots_product_experience_human_readable.md");

function addCheck(checks, name, ok, details = "") {
  checks.push({ name, ok: Boolean(ok), details: String(details || "") });
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function toPercent(summary) {
  if (!summary || !Number.isFinite(summary.total) || summary.total <= 0) return 0;
  return Math.round((Number(summary.passed || 0) / Number(summary.total)) * 100);
}

function runSuite(scriptRelPath) {
  const scriptAbsPath = path.join(repoRoot, scriptRelPath);
  const result = spawnSync(process.execPath, [scriptAbsPath], {
    cwd: repoRoot,
    env: { ...process.env },
    stdio: "inherit",
  });
  return {
    script: scriptRelPath,
    ok: (result.status ?? 1) === 0,
    status: result.status ?? 1,
  };
}

async function readReport(reportFileName) {
  const reportPath = path.join(outDir, reportFileName);
  const raw = await fs.readFile(reportPath, "utf8");
  const parsed = JSON.parse(raw);
  return {
    file: reportFileName,
    summary: parsed?.summary || { total: 0, passed: 0, failed: 0 },
  };
}

async function readText(relPath) {
  return fs.readFile(path.join(repoRoot, relPath), "utf8");
}

function registerTsLoader() {
  const req = createRequire(import.meta.url);
  req.extensions[".ts"] = (module, filename) => {
    const source = fsSyncRead(filename);
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
      fileName: filename,
    });
    module._compile(transpiled.outputText, filename);
  };
  return req;
}

function fsSyncRead(file) {
  return requireFs().readFileSync(file, "utf8");
}

let _fsModule;
function requireFs() {
  if (_fsModule) return _fsModule;
  _fsModule = createRequire(import.meta.url)("fs");
  return _fsModule;
}

function intelligenceIndex(criteria) {
  const reading = Number(criteria.readingComprehension || 0);
  const abstraction = Number(criteria.abstraction || 0);
  const workingMemory = Number(criteria.workingMemory || 0);
  const selfCorrection = Number(criteria.selfCorrection || 0);
  const examDiscipline = Number(criteria.examDiscipline || 0);
  const weighted =
    reading * 0.25 +
    abstraction * 0.25 +
    workingMemory * 0.2 +
    selfCorrection * 0.2 +
    examDiscipline * 0.1;
  return Math.round(clamp(weighted * 20, 0, 100));
}

function bandFromIndex(index) {
  if (index < 56) return "foundation-explorer";
  if (index < 76) return "structured-performer";
  return "advanced-strategist";
}

function scoreBot(bot, dimensions) {
  const weights = bot.weights;
  const raw =
    dimensions.navigationEase * weights.navigationEase +
    dimensions.uiuxFeel * weights.uiuxFeel +
    dimensions.examPrepHelpfulness * weights.examPrepHelpfulness +
    dimensions.teachMentorQuality * weights.teachMentorQuality +
    dimensions.practiceQuestionFit * weights.practiceQuestionFit +
    dimensions.reliability * weights.reliability;
  const totalWeight =
    weights.navigationEase +
    weights.uiuxFeel +
    weights.examPrepHelpfulness +
    weights.teachMentorQuality +
    weights.practiceQuestionFit +
    weights.reliability;
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) return Math.round(clamp(raw, 0, 100));
  return Math.round(clamp(raw / totalWeight, 0, 100));
}

function buildNarrative(bot, dimensions, score) {
  const lines = [];
  lines.push(`${bot.name}: ${bot.band} learner score ${score}/100.`);
  lines.push(`Navigation felt ${dimensions.navigationEase >= 90 ? "easy" : "moderate"} across Home, Dashboard, TopicHub, Practice.`);
  lines.push(`UI/UX felt ${dimensions.uiuxFeel >= 90 ? "clean and low-cognitive-load" : "usable but cluttered in parts"}.`);
  lines.push(`Exam-prep value felt ${dimensions.examPrepHelpfulness >= 90 ? "strong for CBSE prep loops" : "partial and inconsistent"}.`);
  lines.push(`Teach mentor felt ${dimensions.teachMentorQuality >= 90 ? "human-guided and clear" : "partially guided"} with checkpoint flow.`);
  lines.push(
    `Practice question-count reliability is ${dimensions.practiceQuestionFit >= 90 ? "strong" : "uneven on some topics"} for requested set sizes.`
  );
  lines.push(`Overall reliability is ${dimensions.reliability >= 95 ? "production-leaning stable" : "usable but still fragile"} from acceptance runs.`);
  return lines.join(" ");
}

function buildSuggestion(bot, dimensions) {
  const notes = [];
  if (dimensions.practiceQuestionFit < 90) {
    notes.push("Improve weak-topic practice coverage (especially trigonometry) so requested count always fills.");
  }
  if (bot.band === "foundation-explorer") {
    notes.push("Add more guided onboarding tips and default one-tap start paths.");
  }
  if (bot.band === "structured-performer") {
    notes.push("Add clearer progress markers from Learn -> Grind -> Practice in one timeline.");
  }
  if (bot.band === "advanced-strategist") {
    notes.push("Expose faster keyboard and power-user drill presets for rapid revision.");
  }
  if (!notes.length) {
    notes.push("Current flow is strong; maintain speed and reliability while adding more topic depth.");
  }
  return notes;
}

function runPracticeCountProbe() {
  const req = registerTsLoader();
  let generator = null;
  let engineLoadError = null;
  try {
    generator = req(path.join(repoRoot, "src/data/practiceSetGenerator.ts"));
  } catch (err) {
    engineLoadError = String(err?.message || err);
    generator = null;
  }

  let packs = {};
  let packLoadError = null;
  try {
    const packModule = req(path.join(repoRoot, "src/data/promptDPracticePacks.ts"));
    packs = packModule?.promptDPracticePacks || {};
  } catch (err) {
    packLoadError = String(err?.message || err);
    packs = {};
  }

  const scenarios = [
    { subject: "maths", topicKey: "Triangles", packKey: "triangles", requested: 10 },
    { subject: "maths", topicKey: "Trigonometry", packKey: "trigonometry", requested: 10, weakTopic: true },
    { subject: "maths", topicKey: "Trigonometry", packKey: "trigonometry", requested: 40, weakTopic: true, highDemand: true },
    { subject: "maths", topicKey: "Coordinate Geometry", packKey: "coordinate_geometry", requested: 10 },
    { subject: "science", topicKey: "Electricity", packKey: "electricity", requested: 10 },
    { subject: "science", topicKey: "Life Processes", packKey: "life_processes", requested: 10 },
    {
      subject: "science",
      topicKey: "Light Reflection and Refraction",
      packKey: "light_reflection_refraction",
      requested: 10,
    },
  ];

  const rows = scenarios.map((s) => {
    let engineCount = 0;
    if (generator && typeof generator.generatePracticeSet === "function") {
      try {
        const generated = generator.generatePracticeSet({
          subject: s.subject,
          topicKey: s.topicKey,
          totalQuestions: s.requested,
          shuffle: false,
        });
        engineCount = Array.isArray(generated?.questions) ? generated.questions.length : 0;
      } catch {
        engineCount = 0;
      }
    }
    const packCount = Number(((packs?.[s.subject] || {})?.[s.packKey]?.questions || []).length || 0);
    const likelyCountWithoutAi = Math.max(engineCount, packCount);
    const fillsRequestedWithoutAi = likelyCountWithoutAi >= s.requested;
      return {
        ...s,
        engineCount,
        packCount,
        likelyCountWithoutAi,
        fillsRequestedWithoutAi,
      };
    });

  const passCount = rows.filter((r) => r.fillsRequestedWithoutAi).length;
  const fitPercent = Math.round((passCount / rows.length) * 100);
  const weakHighDemandRows = rows.filter((r) => r.weakTopic && r.highDemand);
  const weakHighDemandPass = weakHighDemandRows.every((r) => r.fillsRequestedWithoutAi);
  return {
    rows,
    passCount,
    total: rows.length,
    fitPercent,
    weakHighDemandPass,
    weakHighDemandRows,
    probeMode: generator ? "engine_plus_pack" : "pack_only_fallback",
    engineLoadError,
    packLoadError,
  };
}

function safePercent(reportMap, key) {
  return toPercent(reportMap[key]?.summary);
}

async function run() {
  const checks = [];
  const suiteDefs = [
    {
      script: "scripts/ops/pro_tips_product_acceptance.mjs",
      report: "pro_tips_product_acceptance.json",
      key: "proTips",
    },
    {
      script: "scripts/ops/planner_mentor_realism_acceptance.mjs",
      report: "planner_mentor_realism_acceptance.json",
      key: "planner",
    },
    {
      script: "scripts/ops/topichub_intended_functionality_acceptance.mjs",
      report: "topichub_intended_functionality_acceptance.json",
      key: "topicHubIntended",
    },
    {
      script: "scripts/ops/ux_focus_acceptance.mjs",
      report: "ux_focus_acceptance.json",
      key: "ux",
    },
  ];

  const suiteRuns = [];
  for (const suite of suiteDefs) {
    const result = runSuite(suite.script);
    suiteRuns.push({ ...suite, ...result });
    checks.push({
      name: `suite_${suite.key}_status`,
      ok: result.ok,
      details: `status=${result.status}`,
    });
  }

  const reportMap = {};
  for (const suite of suiteRuns) {
    try {
      reportMap[suite.key] = await readReport(suite.report);
      checks.push({
        name: `suite_${suite.key}_report_readable`,
        ok: true,
        details: suite.report,
      });
    } catch (err) {
      reportMap[suite.key] = { file: suite.report, summary: { total: 0, passed: 0, failed: 1 } };
      checks.push({
        name: `suite_${suite.key}_report_readable`,
        ok: false,
        details: String(err?.message || err),
      });
    }
  }

  const dependentReports = [
    { key: "triangles", report: "triangles_human_tutor_acceptance.json" },
    { key: "grind", report: "topic_grind_contracts_acceptance.json" },
    { key: "diagrams", report: "topic_diagram_coverage_acceptance.json" },
    { key: "allTopics", report: "topichub_human_tutor_all_topics_acceptance.json" },
    { key: "docAlign", report: "topichub_doc_alignment_acceptance.json" },
  ];
  for (const item of dependentReports) {
    try {
      reportMap[item.key] = await readReport(item.report);
      checks.push({
        name: `suite_${item.key}_report_readable`,
        ok: true,
        details: item.report,
      });
    } catch (err) {
      reportMap[item.key] = { file: item.report, summary: { total: 0, passed: 0, failed: 1 } };
      checks.push({
        name: `suite_${item.key}_report_readable`,
        ok: false,
        details: String(err?.message || err),
      });
    }
  }

  const topicHubText = await readText("src/pages/TopicHub.tsx");
  const onboardingText = await readText("src/pages/Onboarding.tsx");
  const practicePageText = await readText("src/pages/PracticePage.tsx");
  addCheck(
    checks,
    "ux_timeline_learn_grind_practice_present",
    topicHubText.includes('data-testid="topichub-learn-grind-practice-timeline"') &&
      topicHubText.includes("Recommended order: Learn concept") &&
      topicHubText.includes("Practice timed questions."),
    "TopicHub should expose explicit Learn -> Grind -> Practice timeline guidance."
  );
  addCheck(
    checks,
    "onboarding_guided_cues_present",
    onboardingText.includes('data-testid="onboarding-support-cues"') &&
      onboardingText.includes("Guided start (recommended)") &&
      onboardingText.includes("step-by-step"),
    "Onboarding should provide stronger low-ability guidance cues."
  );
  addCheck(
    checks,
    "practice_advanced_shortcuts_present",
    practicePageText.includes("Fast drill presets:") &&
      practicePageText.includes("Shortcut: Alt+1/2/3/4/5 and Alt+R.") &&
      practicePageText.includes("MAX_QUESTION_COUNT = 100"),
    "Practice should support faster advanced drill shortcuts and higher count demand."
  );

  const practiceProbe = runPracticeCountProbe();
  checks.push({
    name: "practice_probe_minimum_quality_gate",
    ok: practiceProbe.fitPercent >= 70,
    details: `fit=${practiceProbe.fitPercent}% (${practiceProbe.passCount}/${practiceProbe.total})`,
  });
  checks.push({
    name: "practice_probe_weak_topic_high_demand_gate",
    ok: practiceProbe.weakHighDemandPass,
    details: `weak_high_demand_rows=${practiceProbe.weakHighDemandRows.length}`,
  });

  const dimensions = {
    navigationEase: Math.round(
      safePercent(reportMap, "ux") * 0.55 + safePercent(reportMap, "topicHubIntended") * 0.45
    ),
    uiuxFeel: Math.round(
      safePercent(reportMap, "ux") * 0.6 + safePercent(reportMap, "proTips") * 0.4
    ),
    examPrepHelpfulness: Math.round(
      safePercent(reportMap, "proTips") * 0.35 +
        safePercent(reportMap, "planner") * 0.25 +
        safePercent(reportMap, "allTopics") * 0.25 +
        safePercent(reportMap, "grind") * 0.15
    ),
    teachMentorQuality: Math.round(
      safePercent(reportMap, "triangles") * 0.4 +
        safePercent(reportMap, "allTopics") * 0.4 +
        safePercent(reportMap, "docAlign") * 0.2
    ),
    practiceQuestionFit: practiceProbe.fitPercent,
    reliability: Math.round(
      suiteRuns.reduce((acc, r) => acc + (r.ok ? 1 : 0), 0) / suiteRuns.length * 100
    ),
  };

  const bots = [
    {
      id: "bot_riya",
      name: "Riya Sharma",
      age: 15,
      city: "Bhopal",
      board: "CBSE",
      classLevel: "10",
      generation: "Gen-Z",
      criteria: {
        readingComprehension: 2,
        abstraction: 2,
        workingMemory: 2,
        selfCorrection: 2,
        examDiscipline: 3,
      },
      threshold: 78,
      weights: {
        navigationEase: 0.2,
        uiuxFeel: 0.2,
        examPrepHelpfulness: 0.2,
        teachMentorQuality: 0.25,
        practiceQuestionFit: 0.1,
        reliability: 0.05,
      },
    },
    {
      id: "bot_aarav",
      name: "Aarav Verma",
      age: 15,
      city: "Indore",
      board: "CBSE",
      classLevel: "10",
      generation: "Gen-Z",
      criteria: {
        readingComprehension: 3,
        abstraction: 3,
        workingMemory: 3,
        selfCorrection: 3,
        examDiscipline: 4,
      },
      threshold: 82,
      weights: {
        navigationEase: 0.2,
        uiuxFeel: 0.1,
        examPrepHelpfulness: 0.25,
        teachMentorQuality: 0.25,
        practiceQuestionFit: 0.2,
        reliability: 0.2,
      },
    },
    {
      id: "bot_kabir",
      name: "Kabir Iyer",
      age: 16,
      city: "Bengaluru",
      board: "CBSE",
      classLevel: "10",
      generation: "Gen-Z",
      criteria: {
        readingComprehension: 5,
        abstraction: 4,
        workingMemory: 4,
        selfCorrection: 5,
        examDiscipline: 5,
      },
      threshold: 86,
      weights: {
        navigationEase: 0.1,
        uiuxFeel: 0.05,
        examPrepHelpfulness: 0.35,
        teachMentorQuality: 0.25,
        practiceQuestionFit: 0.25,
        reliability: 0.2,
      },
    },
  ];

  const botResults = bots.map((bot) => {
    const iqIndex = intelligenceIndex(bot.criteria);
    const band = bandFromIndex(iqIndex);
    const score = scoreBot(bot, dimensions);
    const passed = score >= bot.threshold;
    const narrative = buildNarrative({ ...bot, band }, dimensions, score);
    checks.push({
      name: `student_${bot.id}_pass`,
      ok: passed,
      details: `score=${score}; threshold=${bot.threshold}; intelligenceIndex=${iqIndex}`,
    });
    return {
      id: bot.id,
      name: bot.name,
      age: bot.age,
      city: bot.city,
      board: bot.board,
      classLevel: bot.classLevel,
      generation: bot.generation,
      intelligenceCriteria: bot.criteria,
      intelligenceIndex: iqIndex,
      band,
      threshold: bot.threshold,
      score,
      passed,
      experience: narrative,
      suggestions: buildSuggestion({ ...bot, band }, dimensions),
    };
  });

  const allPassed = checks.every((c) => c.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    objective:
      "Simulate three Indian Gen-Z CBSE Class 10 student bots with different intelligence bands and validate LazyTopper experience.",
    intelligenceCriterion:
      "Weighted score from readingComprehension(25%), abstraction(25%), workingMemory(20%), selfCorrection(20%), examDiscipline(10%).",
    dimensions,
    suites: suiteRuns.map((run) => ({
      script: run.script,
      ok: run.ok,
      status: run.status,
      report: run.report,
      summary: reportMap[run.key]?.summary || null,
    })),
    practiceCountProbe: practiceProbe,
    students: botResults,
    summary: {
      totalChecks: checks.length,
      passedChecks: checks.filter((c) => c.ok).length,
      failedChecks: checks.filter((c) => !c.ok).length,
      overallPass: allPassed,
    },
    checks,
  };

  const humanLines = [];
  humanLines.push("# LazyTopper Student Bot Experience Report");
  humanLines.push("");
  humanLines.push(`Generated: ${report.generatedAt}`);
  humanLines.push("");
  humanLines.push("## Overall");
  humanLines.push(
    `Checks: ${report.summary.passedChecks}/${report.summary.totalChecks} passed. Overall pass: ${report.summary.overallPass}.`
  );
  humanLines.push(
    `Dimensions -> Navigation: ${dimensions.navigationEase}, UI/UX: ${dimensions.uiuxFeel}, Helpfulness: ${dimensions.examPrepHelpfulness}, Teach Mentor: ${dimensions.teachMentorQuality}, Practice Count Fit: ${dimensions.practiceQuestionFit}, Reliability: ${dimensions.reliability}`
  );
  humanLines.push("");
  humanLines.push("## Practice Count Probe (requested 10)");
  for (const row of practiceProbe.rows) {
    humanLines.push(
            `- ${row.subject}/${row.topicKey}: engine=${row.engineCount}, pack=${row.packCount}, likely_without_ai=${row.likelyCountWithoutAi}, fills_requested=${row.fillsRequestedWithoutAi}`
    );
  }
  humanLines.push(
    `- Weak-topic high-demand gate: ${practiceProbe.weakHighDemandPass} (rows=${practiceProbe.weakHighDemandRows.length})`
  );
  humanLines.push("");
  humanLines.push("## Student Voices");
  for (const s of botResults) {
    humanLines.push(`### ${s.name} (${s.band})`);
    humanLines.push(`- Score: ${s.score}/100 (threshold ${s.threshold})`);
    humanLines.push(`- Experience: ${s.experience}`);
    for (const tip of s.suggestions) {
      humanLines.push(`- Suggested change: ${tip}`);
    }
    humanLines.push("");
  }

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  await fs.writeFile(outHumanPath, humanLines.join("\n"), "utf8");

  if (!allPassed) {
    console.error(
      `Student-bot product experience acceptance FAILED (${report.summary.failedChecks}/${report.summary.totalChecks}).`
    );
    for (const check of checks.filter((c) => !c.ok)) {
      console.error(`- ${check.name}: ${check.details}`);
    }
    console.error(`Report: ${path.relative(repoRoot, outPath)}`);
    console.error(`Human report: ${path.relative(repoRoot, outHumanPath)}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Student-bot product experience acceptance PASSED (${report.summary.passedChecks}/${report.summary.totalChecks}).`
  );
  for (const student of botResults) {
    console.log(`- ${student.name} (${student.band}) => ${student.score}/100`);
  }
  console.log(`Report: ${path.relative(repoRoot, outPath)}`);
  console.log(`Human report: ${path.relative(repoRoot, outHumanPath)}`);
}

run().catch(async (err) => {
  await fs.mkdir(outDir, { recursive: true });
  const fallback = {
    generatedAt: new Date().toISOString(),
    error: String(err?.stack || err?.message || err),
  };
  await fs.writeFile(outPath, JSON.stringify(fallback, null, 2), "utf8");
  console.error("Student-bot product experience acceptance errored.");
  console.error(String(err?.stack || err));
  console.error(`Report: ${path.relative(repoRoot, outPath)}`);
  process.exitCode = 1;
});
