import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { createRequire } from "module";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "planner_mentor_realism_acceptance.json");

function addCheck(checks, name, ok, details = "") {
  checks.push({ name, ok: Boolean(ok), details: String(details || "") });
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

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function callJson(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const body = await res.json();
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

async function withServer(envOverrides, fn) {
  const child = spawn(process.execPath, ["server/index.cjs"], {
    cwd: repoRoot,
    env: { ...process.env, ...envOverrides },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let ready = false;
  const readyPromise = new Promise((resolve, reject) => {
    const onData = (chunk) => {
      const text = String(chunk || "");
      if (text.includes("LazyTopper AI server running on port")) {
        ready = true;
        resolve(undefined);
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", (code) => {
      if (!ready) reject(new Error(`Server exited before ready (code=${code})`));
    });
  });

  try {
    await Promise.race([
      readyPromise,
      wait(15000).then(() => {
        if (!ready) throw new Error("Server start timeout");
      }),
    ]);
    return await fn();
  } finally {
    child.kill("SIGTERM");
    await wait(600);
    if (!child.killed) {
      child.kill("SIGKILL");
    }
  }
}

async function run() {
  const checks = [];
  const req = registerTsLoader();
  const strategy = req(path.join(repoRoot, "src/services/strategyEngine.ts"));
  const generateStrategyPlan = strategy.generateStrategyPlan;

  const plan = generateStrategyPlan({
    grade: "10",
    subject: "Maths",
    daysLeft: 90,
    hoursPerDay: 2,
    targetPercent: 88,
    vibe: "beast",
    weakChapters: ["Triangles"],
  });

  addCheck(checks, "planner_returns_rows", Array.isArray(plan?.planRows) && plan.planRows.length > 0, "Planner should allocate chapter-level hours.");
  addCheck(
    checks,
    "planner_has_realism_meta",
    Boolean(plan?.meta) &&
      Number(plan.meta.coreHours) > 0 &&
      Number(plan.meta.revisionHours) > 0 &&
      Number(plan.meta.mockHours) > 0,
    "Planner should reserve realistic revision and mock hours."
  );

  const coreSum = (plan?.planRows || []).reduce((sum, row) => sum + Number(row.hours || 0), 0);
  addCheck(
    checks,
    "planner_core_hours_balanced",
    Math.abs(coreSum - Number(plan?.meta?.coreHours || 0)) <= 1.2,
    "Topic allocations should approximately match core study-hour budget."
  );

  const withoutWeak = generateStrategyPlan({
    grade: "10",
    subject: "Maths",
    daysLeft: 90,
    hoursPerDay: 2,
    targetPercent: 88,
    vibe: "beast",
    weakChapters: [],
  });
  const weakTopic = withoutWeak.planRows[0]?.topicKey || "Triangles";
  const withWeak = generateStrategyPlan({
    grade: "10",
    subject: "Maths",
    daysLeft: 90,
    hoursPerDay: 2,
    targetPercent: 88,
    vibe: "beast",
    weakChapters: [weakTopic],
  });
  const noWeakHours = Number(withoutWeak.planRows.find((r) => r.topicKey === weakTopic)?.hours || 0);
  const weakHours = Number(withWeak.planRows.find((r) => r.topicKey === weakTopic)?.hours || 0);
  addCheck(
    checks,
    "planner_boosts_weak_topic",
    weakHours > noWeakHours,
    "Weak topics should get extra study-hour allocation."
  );

  const riskPlan = generateStrategyPlan({
    grade: "10",
    subject: "Science",
    daysLeft: 25,
    hoursPerDay: 1,
    targetPercent: 95,
    vibe: "beast",
    weakChapters: [],
  });
  const onTrackPlan = generateStrategyPlan({
    grade: "10",
    subject: "Science",
    daysLeft: 120,
    hoursPerDay: 2.4,
    targetPercent: 78,
    vibe: "beast",
    weakChapters: [],
  });

  addCheck(
    checks,
    "planner_feasibility_risk_detection",
    riskPlan.meta.feasibilityBand === "risk",
    "High target with low capacity should be marked risk."
  );
  addCheck(
    checks,
    "planner_feasibility_on_track_detection",
    onTrackPlan.meta.feasibilityBand === "on-track" || onTrackPlan.meta.feasibilityBand === "stretch",
    "Healthy capacity should not be marked risk."
  );

  const testPort = "3019";
  await withServer(
    {
      PORT: testPort,
      CBSE_CLASS10_OFFICIAL_DATE: "2026-02-17",
      AI_PROVIDER: "none",
      API_KEY: "",
    },
    async () => {
      const res = await callJson(`http://localhost:${testPort}/api/cbse-exam-date?class=10`);
      addCheck(
        checks,
        "cbse_admin_override_env_applied",
        res.status === 200 &&
          res.body &&
          res.body.source === "official" &&
          String(res.body.examDate || "") === "2026-02-17",
        "Server should honor manual official CBSE date override."
      );
    }
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
    console.error(`Planner mentor realism acceptance FAILED (${failed.length}/${checks.length}).`);
    for (const f of failed) console.error(`- ${f.name}: ${f.details}`);
    console.error(`Report: ${path.relative(repoRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Planner mentor realism acceptance PASSED (${checks.length}/${checks.length}).`);
  console.log(`Report: ${path.relative(repoRoot, outPath)}`);
}

run().catch(async (err) => {
  const report = {
    generatedAt: new Date().toISOString(),
    error: String(err?.stack || err?.message || err),
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.error("Planner mentor realism acceptance errored.");
  console.error(String(err?.stack || err));
  console.error(`Report: ${path.relative(repoRoot, outPath)}`);
  process.exitCode = 1;
});
