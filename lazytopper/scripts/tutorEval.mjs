import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: "CommonJS",
      target: "ES2020",
      esModuleInterop: true,
    },
    fileName: path.basename(filename),
  });
  module._compile(transpiled.outputText, filename);
};

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, ".project_memory", "tutor_eval");
fs.mkdirSync(OUT_DIR, { recursive: true });

const { validateTutorStructured, validateAttemptLoop, buildTutorFallback } = require(
  path.join(ROOT, "src", "contracts", "tutorContracts.ts")
);
const { initHintState, computeNextHint } = require(
  path.join(ROOT, "src", "tutor", "hintLadder.ts")
);
const { scoreRubric } = require(path.join(ROOT, "src", "tutor", "rubricScore.ts"));
const { retrieveTrianglesSources } = require(
  path.join(ROOT, "src", "tutor", "retrieval", "trianglesRetriever.ts")
);

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value && typeof value === "object") {
    const out = {};
    Object.keys(value)
      .sort()
      .forEach((k) => {
        out[k] = sortObject(value[k]);
      });
    return out;
  }
  return value;
}

function sanitizeForCompare(value) {
  if (Array.isArray(value)) return value.map(sanitizeForCompare);
  if (value && typeof value === "object") {
    const out = {};
    Object.keys(value).forEach((k) => {
      if (k === "ts") return;
      out[k] = sanitizeForCompare(value[k]);
    });
    return out;
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(sortObject(sanitizeForCompare(value)));
}

function recordCheck(list, name, ok, details = null) {
  list.push({ name, ok, details });
}

const cases = [
  {
    id: "solve_with_me_correct",
    mode: "solve_with_me",
    payload: {
      topicKey: "triangles",
      grade: 10,
      subject: "Maths",
      questionText: "Prove triangles ABC and DEF are congruent.",
      studentAttempt: "AB = DE, AC = DF, and \u2220A = \u2220D, so triangles are congruent by SAS.",
    },
  },
  {
    id: "board_steps_common_wrong",
    mode: "board_steps_ms",
    payload: {
      topicKey: "triangles",
      grade: 10,
      subject: "Maths",
      questionText: "Use AA similarity to prove two triangles are similar.",
      studentAttempt: "Triangles are similar because they look the same.",
    },
  },
  {
    id: "learn_teach_partial_credit",
    mode: "learn_teach",
    payload: {
      topicKey: "triangles",
      grade: 10,
      subject: "Maths",
      questionText: "Define similarity and list criteria.",
      studentAttempt: "Use AA or SAS when two angles are equal.",
      mindmapNodeId: "gAA",
      mindmapNodeTitle: "AA similarity",
    },
  },
  {
    id: "learn_proof_needs_hint",
    mode: "learn_proof",
    payload: {
      topicKey: "triangles",
      grade: 10,
      subject: "Maths",
      questionText: "Prove triangles are similar using BPT.",
      studentAttempt: "DE divides the sides in equal ratio but I did not show parallel lines.",
    },
  },
  {
    id: "learn_mindmap_bsre",
    mode: "learn_mindmap",
    payload: {
      topicKey: "triangles",
      grade: 10,
      subject: "Maths",
      studentAttempt: "Not sure how to show the similarity criterion.",
      mindmapNodeId: "gAA",
      mindmapNodeTitle: "AA similarity",
      mindmapNodeText: "Two angles equal implies similarity.",
    },
  },
];

const caseResults = [];
const checks = [];
const failures = [];

for (const test of cases) {
  const output = buildTutorFallback(test.mode, test.payload);
  const output2 = buildTutorFallback(test.mode, test.payload);

  const contractCheck = validateTutorStructured(test.mode, output, test.payload);
  const attemptLoopCheck = output && output.attempt_loop ? validateAttemptLoop(output.attempt_loop) : { ok: true, issues: [] };
  const deterministicOk = stableStringify(output) === stableStringify(output2);

  const issues = [];
  if (!contractCheck.ok) issues.push(...contractCheck.issues);
  if (!attemptLoopCheck.ok) issues.push(...attemptLoopCheck.issues);
  if (!deterministicOk) issues.push("Deterministic check failed (output mismatch on repeat).");

  caseResults.push({
    id: test.id,
    mode: test.mode,
    ok: issues.length === 0,
    issues,
  });

  if (issues.length) failures.push({ id: test.id, mode: test.mode, issues });
}

// Hint ladder progression check
(function () {
  const state = initHintState();
  const context = {
    status: "incorrect",
    mistakeTags: ["similarity_criterion_missing"],
    attemptText: "No criterion stated.",
    topicKey: "triangles",
  };

  let current = state;
  const levels = [];
  for (let i = 0; i < 7; i += 1) {
    current = computeNextHint(current, context, true);
    levels.push(current.level);
  }

  const monotonic = levels.every((lvl, idx) => idx === 0 || lvl >= levels[idx - 1]);
  const bounded = levels.every((lvl) => lvl >= 0 && lvl <= 5);
  const lastIsMax = levels[levels.length - 1] === 5;

  recordCheck(checks, "hint_ladder_progression", monotonic && bounded && lastIsMax, { levels });
})();

// Rubric score check
(function () {
  const contexts = [
    { status: "correct", mistakeTags: [], attemptText: "AA similarity with full steps.", theoremFocus: "similarity" },
    { status: "incorrect", mistakeTags: ["wrong_theorem"], attemptText: "Used AAA to claim similarity.", theoremFocus: "similarity" },
  ];
  const results = contexts.map((ctx) => scoreRubric(ctx));
  const withinRange = results.every((r) => Number.isFinite(r.total_score) && r.total_score >= 0 && r.total_score <= 100);
  const bandsOk = results.every((r) => ["BEGINNER", "DEVELOPING", "PROFICIENT", "MASTER"].includes(r.band));
  recordCheck(checks, "rubric_score_ranges", withinRange && bandsOk, { totals: results.map((r) => r.total_score) });
})();

// Citations schema check (sources)
(function () {
  const sources = retrieveTrianglesSources({
    attemptText: "Used AA similarity but did not state corresponding angles.",
    mistakeTags: ["similarity_criterion_missing"],
    theoremFocus: "similarity",
  });
  const ok = Array.isArray(sources) && sources.every((s) =>
    s && typeof s === "object" &&
    String(s.id || "").trim() &&
    String(s.title || "").trim() &&
    String(s.path || "").trim() &&
    String(s.excerpt || "").trim()
  );
  recordCheck(checks, "citations_schema", ok, { count: sources.length });
})();

const failedChecks = checks.filter((c) => !c.ok);
if (failedChecks.length) {
  failures.push({ id: "global_checks", issues: failedChecks.map((c) => c.name) });
}

const summary = {
  totalCases: cases.length,
  passedCases: caseResults.filter((c) => c.ok).length,
  failedCases: failures.length,
  checks: checks,
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  cases: caseResults,
};

const reportJsonPath = path.join(OUT_DIR, "eval_report.json");
const reportMdPath = path.join(OUT_DIR, "eval_report.md");
const failingPath = path.join(OUT_DIR, "failing_cases.json");

fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2));

const mdLines = [];
mdLines.push("# Tutor Eval Report");
mdLines.push("");
mdLines.push(`Generated: ${report.generatedAt}`);
mdLines.push("");
mdLines.push(`Cases: ${summary.passedCases}/${summary.totalCases} passed`);
mdLines.push(`Checks: ${checks.filter((c) => c.ok).length}/${checks.length} passed`);
mdLines.push("");
mdLines.push("## Checks");
checks.forEach((c) => {
  mdLines.push(`- ${c.ok ? "\u2705" : "\u274c"} ${c.name}`);
});
mdLines.push("");
mdLines.push("## Case Results");
caseResults.forEach((c) => {
  mdLines.push(`- ${c.ok ? "\u2705" : "\u274c"} ${c.id} (${c.mode})`);
  if (!c.ok && c.issues.length) {
    c.issues.forEach((issue) => mdLines.push(`  - ${issue}`));
  }
});

fs.writeFileSync(reportMdPath, mdLines.join("\n"));

if (failures.length) {
  fs.writeFileSync(failingPath, JSON.stringify(failures, null, 2));
  console.error("Tutor eval failed. See report in .project_memory/tutor_eval/");
  process.exit(1);
}

if (fs.existsSync(failingPath)) fs.unlinkSync(failingPath);
console.log("Tutor eval passed. Report written to .project_memory/tutor_eval/");
