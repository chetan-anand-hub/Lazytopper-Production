import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(
  outDir,
  "hpq_practice_predictive_standards_acceptance.json"
);

function addCheck(checks, name, ok, details = "") {
  checks.push({ name, ok: Boolean(ok), details: String(details || "") });
}

async function readText(relPath) {
  return fs.readFile(path.join(repoRoot, relPath), "utf8");
}

function count(text, re) {
  return (text.match(re) || []).length;
}

async function run() {
  const checks = [];

  const predictivePapers = await readText("src/data/predictivePapers.ts");
  const mockPaperEngine = await readText("src/utils/mockPaperEngine.ts");
  const blueprintConfig = await readText("src/data/blueprintConfig.ts");
  const sciencePredictiveEngine = await readText(
    "src/data/class10SciencePredictiveEngine.ts"
  );
  const predictedMath = await readText("src/data/predictedQuestions.ts");
  const predictedMathAdd = await readText("src/data/predictedQuestionsAdditions.ts");
  const predictedScience = await readText("src/data/predictedQuestionsScience.ts");
  const hpq = await readText("src/data/highlyProbableQuestions.ts");
  const practicePage = await readText("src/pages/PracticePage.tsx");
  const hpqPage = await readText("src/pages/HighlyProbableQuestions.tsx");
  const mockPaperPage = await readText("src/pages/MockPaper.tsx");
  const visualAid = await readText("src/components/question/QuestionVisualAid.tsx");

  // 1) Predictive papers must use CBSE A-E marks = 20,10,18,20,12 and total 80.
  const sectionRows = [
    ...predictivePapers.matchAll(
      /sectionMarks:\s*\{\s*A:\s*(\d+),\s*B:\s*(\d+),\s*C:\s*(\d+),\s*D:\s*(\d+),\s*E:\s*(\d+)\s*\}/g
    ),
  ];
  const allRowsFollowPattern =
    sectionRows.length > 0 &&
    sectionRows.every((m) => {
      const a = Number(m[1]);
      const b = Number(m[2]);
      const c = Number(m[3]);
      const d = Number(m[4]);
      const e = Number(m[5]);
      return a === 20 && b === 10 && c === 18 && d === 20 && e === 12 && a + b + c + d + e === 80;
    });
  addCheck(
    checks,
    "predictive_papers_cbse_a_e_pattern",
    allRowsFollowPattern,
    `rows=${sectionRows.length}`
  );

  addCheck(
    checks,
    "mock_paper_engine_blueprint_aligned",
    mockPaperEngine.includes('{ section: "B", targetQuestions: 5, marksPerQuestion: 2 }') &&
      mockPaperEngine.includes('{ section: "C", targetQuestions: 6, marksPerQuestion: 3 }') &&
      mockPaperEngine.includes('{ section: "D", targetQuestions: 4, marksPerQuestion: 5 }') &&
      mockPaperEngine.includes('{ section: "E", targetQuestions: 3, marksPerQuestion: 4 }'),
    "Maths fallback engine should align to CBSE marks pattern."
  );

  addCheck(
    checks,
    "blueprint_config_maths_science_aligned",
    blueprintConfig.includes("totalQuestions: 5") &&
      blueprintConfig.includes("totalQuestions: 6") &&
      blueprintConfig.includes("totalQuestions: 4") &&
      blueprintConfig.includes("totalQuestions: 3"),
    "Both subject blueprints should reflect 20/10/18/20/12 style split."
  );

  addCheck(
    checks,
    "science_predictive_engine_blueprint_aligned",
    sciencePredictiveEngine.includes("numQuestions: 5") &&
      sciencePredictiveEngine.includes("numQuestions: 6") &&
      sciencePredictiveEngine.includes("numQuestions: 4"),
    "Science predictive engine blueprint should align with section targets."
  );

  // 2) Coverage for competency/case-based + enough section D questions.
  const mathAll = `${predictedMath}\n${predictedMathAdd}`;
  const mathCase = count(mathAll, /\bkind:\s*"Case-Based"/g);
  const mathAR = count(mathAll, /\bkind:\s*"Assertion-Reasoning"/g);
  const mathSecD = count(mathAll, /\bsection:\s*"D"[\s\S]*?\bmarks:\s*5\b/g);

  const sciCase = count(predictedScience, /\bkind:\s*"Case-Based"/g);
  const sciAR = count(predictedScience, /\bkind:\s*"Assertion-Reasoning"/g);
  const sciSecD = count(predictedScience, /\bsection:\s*"D"[\s\S]*?\bmarks:\s*5\b/g);

  addCheck(
    checks,
    "predictive_maths_competency_case_presence",
    mathCase >= 3 && mathAR >= 3,
    `mathCase=${mathCase}, mathAR=${mathAR}`
  );
  addCheck(
    checks,
    "predictive_science_competency_case_presence",
    sciCase >= 3 && sciAR >= 1,
    `sciCase=${sciCase}, sciAR=${sciAR}`
  );
  addCheck(
    checks,
    "predictive_banks_have_min_section_d_capacity",
    mathSecD >= 4 && sciSecD >= 4,
    `mathSecD=${mathSecD}, sciSecD=${sciSecD}`
  );

  // 3) HPQ must guard science topics via syllabus boundary filter.
  addCheck(
    checks,
    "hpq_science_syllabus_guard_present",
    hpq.includes("allowedScienceTopicLabels") &&
      hpq.includes("class10ScienceTopicTrends") &&
      hpq.includes("!allowedScienceTopicLabels.has(normalizeTopicLabel(b.topic))"),
    "HPQ should filter out non-syllabus science buckets at retrieval time."
  );

  // 4) Practice has case-based path and board pattern support.
  addCheck(
    checks,
    "practice_page_case_filter_and_board_pattern",
    practicePage.includes('<option value="E">E (Case, 4m)</option>') &&
      practicePage.includes("boardPattern: normalizeBoardPattern(args.boardPattern)") &&
      practicePage.includes("inferBoardPatternFromQuestion"),
    "Practice page should expose and honor case-based section filtering."
  );

  // 5) Visual aid coverage hooks across HPQ/Practice/MockPaper.
  addCheck(
    checks,
    "visual_aid_component_has_context_aware_topics",
    visualAid.includes("triangle") &&
      visualAid.includes("coordinate") &&
      visualAid.includes("circle") &&
      visualAid.includes("ray") &&
      visualAid.includes("circuit") &&
      visualAid.includes("magnetic") &&
      visualAid.includes("heart") &&
      visualAid.includes("nephron"),
    "Visual aid component should support key Maths/Science diagram contexts."
  );

  addCheck(
    checks,
    "visual_aid_wired_to_all_target_surfaces",
    practicePage.includes("QuestionVisualAid") &&
      hpqPage.includes("QuestionVisualAid") &&
      mockPaperPage.includes("QuestionVisualAid"),
    "Practice, HPQ and Predictive-paper views must render visual aids."
  );

  const visualTriggerRegex =
    /\b(draw|diagram|graph|construct|ray|circuit|labelled|heights|distance)\b/gi;
  const visualTriggerCount =
    count(mathAll, visualTriggerRegex) + count(predictedScience, visualTriggerRegex);
  addCheck(
    checks,
    "question_bank_contains_visual_required_items",
    visualTriggerCount >= 40,
    `visualTriggerCount=${visualTriggerCount}`
  );

  const failed = checks.filter((c) => !c.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
    },
    checks,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  if (failed.length) {
    console.error(
      `HPQ/Practice/Predictive standards acceptance FAILED (${failed.length}/${checks.length}).`
    );
    failed.forEach((f) => {
      console.error(`- ${f.name}: ${f.details}`);
    });
    console.error(`Report: ${path.relative(repoRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `HPQ/Practice/Predictive standards acceptance PASSED (${checks.length}/${checks.length}).`
  );
  console.log(`Report: ${path.relative(repoRoot, outPath)}`);
}

run().catch(async (err) => {
  const report = {
    generatedAt: new Date().toISOString(),
    error: String(err?.stack || err?.message || err),
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.error("HPQ/Practice/Predictive standards acceptance errored.");
  console.error(String(err?.stack || err));
  console.error(`Report: ${path.relative(repoRoot, outPath)}`);
  process.exitCode = 1;
});

