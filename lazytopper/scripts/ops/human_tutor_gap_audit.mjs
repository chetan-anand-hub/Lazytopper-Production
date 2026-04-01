import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "human_tutor_gap_audit.json");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readJsonSafe(absPath) {
  return fs
    .readFile(absPath, "utf8")
    .then((txt) => JSON.parse(txt))
    .catch(() => null);
}

function classifyPriority(checkName, details) {
  const signal = `${checkName} ${details}`.toLowerCase();
  if (
    signal.includes("human_tutor") ||
    signal.includes("diagram") ||
    signal.includes("checkpoint") ||
    signal.includes("teach") ||
    signal.includes("mistake")
  ) {
    return "P0";
  }
  if (
    signal.includes("route") ||
    signal.includes("launcher") ||
    signal.includes("play cta") ||
    signal.includes("dashboard") ||
    signal.includes("topichub")
  ) {
    return "P1";
  }
  return "P2";
}

function inferAction(checkName) {
  const s = String(checkName || "").toLowerCase();
  if (s.includes("launcher") || s.includes("route")) {
    return "Align route expectation and actual protected route wiring for /topic-hub.";
  }
  if (s.includes("play_cta") || s.includes("dashboard")) {
    return "Expose and standardize a single primary Daily Mix Play CTA on Dashboard.";
  }
  if (s.includes("diagram")) {
    return "Harden diagram-required enforcement for all diagram-heavy topics.";
  }
  if (s.includes("checkpoint")) {
    return "Strengthen checkpoint gating copy + feedback continuity in tutor loop.";
  }
  return "Investigate failing acceptance check and align with product contract.";
}

async function waitForServer(baseUrl, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/api/mentor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "noop", payload: {} }),
      });
      if (res.status >= 400 || res.status < 600) return;
    } catch {
      // not ready
    }
    await delay(300);
  }
  throw new Error(`Server not ready at ${baseUrl}`);
}

function runScript(relPath) {
  const abs = path.join(repoRoot, relPath);
  const res = spawnSync(process.execPath, [abs], {
    cwd: repoRoot,
    env: { ...process.env },
    stdio: "inherit",
  });
  return { script: relPath, status: res.status ?? 1 };
}

async function run() {
  const baseUrl = "http://localhost:3001";
  const serverProc = spawn(process.execPath, ["server/index.cjs"], {
    cwd: repoRoot,
    env: { ...process.env, PORT: "3001" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logs = [];
  serverProc.stdout.on("data", (d) => logs.push(String(d || "")));
  serverProc.stderr.on("data", (d) => logs.push(String(d || "")));

  const suites = [
    {
      script: "scripts/ops/triangles_human_tutor_acceptance.mjs",
      report: "triangles_human_tutor_acceptance.json",
    },
    {
      script: "scripts/ops/topic_grind_contracts_acceptance.mjs",
      report: "topic_grind_contracts_acceptance.json",
    },
    {
      script: "scripts/ops/topic_diagram_coverage_acceptance.mjs",
      report: "topic_diagram_coverage_acceptance.json",
    },
    {
      script: "scripts/ops/topichub_human_tutor_all_topics_acceptance.mjs",
      report: "topichub_human_tutor_all_topics_acceptance.json",
    },
    {
      script: "scripts/ops/topichub_doc_alignment_acceptance.mjs",
      report: "topichub_doc_alignment_acceptance.json",
    },
    {
      script: "scripts/ops/pro_tips_product_acceptance.mjs",
      report: "pro_tips_product_acceptance.json",
    },
  ];

  const runResults = [];
  try {
    await waitForServer(baseUrl);
    for (const suite of suites) {
      runResults.push(runScript(suite.script));
    }
  } finally {
    if (!serverProc.killed) {
      serverProc.kill("SIGTERM");
      await delay(300);
      if (!serverProc.killed) serverProc.kill("SIGKILL");
    }
  }

  const suiteSummaries = [];
  const gapItems = [];

  for (const suite of suites) {
    const reportAbs = path.join(outDir, suite.report);
    const report = await readJsonSafe(reportAbs);
    if (!report) {
      suiteSummaries.push({
        suite: suite.script,
        report: suite.report,
        status: "missing_report",
        summary: null,
      });
      gapItems.push({
        id: `missing_report_${suite.report}`,
        priority: "P0",
        source: suite.script,
        check: "report_generation",
        details: `Report not generated: ${suite.report}`,
        recommendedAction: "Fix script/report path and rerun suite.",
      });
      continue;
    }

    suiteSummaries.push({
      suite: suite.script,
      report: suite.report,
      status: Number(report?.summary?.failed || 0) > 0 ? "failed" : "passed",
      summary: report.summary || null,
    });

    for (const check of report.checks || []) {
      if (check?.ok) continue;
      gapItems.push({
        id: `${path.basename(suite.script)}:${check.name}`,
        priority: classifyPriority(check.name, check.details),
        source: suite.script,
        check: check.name,
        details: check.details || "",
        recommendedAction: inferAction(check.name),
      });
    }
  }

  gapItems.sort((a, b) => {
    const rank = { P0: 0, P1: 1, P2: 2 };
    const byPriority = (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9);
    if (byPriority !== 0) return byPriority;
    return a.id.localeCompare(b.id);
  });

  const summary = {
    totalSuites: suiteSummaries.length,
    passedSuites: suiteSummaries.filter((s) => s.status === "passed").length,
    failedSuites: suiteSummaries.filter((s) => s.status === "failed").length,
    missingReports: suiteSummaries.filter((s) => s.status === "missing_report").length,
    totalGaps: gapItems.length,
    p0: gapItems.filter((g) => g.priority === "P0").length,
    p1: gapItems.filter((g) => g.priority === "P1").length,
    p2: gapItems.filter((g) => g.priority === "P2").length,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    suiteRuns: runResults,
    suiteSummaries,
    gapBacklog: gapItems,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  console.log(
    `human_tutor_gap_audit: suites passed=${summary.passedSuites}/${summary.totalSuites}, gaps=${summary.totalGaps} (P0=${summary.p0}, P1=${summary.p1}, P2=${summary.p2})`
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
  console.error("human_tutor_gap_audit errored.");
  console.error(String(err?.stack || err));
  process.exitCode = 1;
});
