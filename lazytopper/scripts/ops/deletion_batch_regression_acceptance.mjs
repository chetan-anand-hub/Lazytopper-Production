import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");
const outFile = resolve(repoRoot, ".project_memory/ops/out/deletion_batch_regression_acceptance.json");
const gapAuditPath = resolve(repoRoot, ".project_memory/ops/out/human_tutor_gap_audit.json");
const stepwisePath = resolve(repoRoot, ".project_memory/ops/out/safe_delete_stepwise_log.json");

const deletedFiles = [
  "src/ai/mentorPrompts.ts",
  "src/ai/mentorPrompts_hi.ts",
  "src/contracts/topicMentorContract.ts",
  "src/core/redaction.ts",
  "src/data/_finalGenerated/triangles.topicHub.ts",
  "src/data/practicePackSummaries.ts",
  "src/data/trianglesLearnSeedPack.ts",
  "src/data/weightage.ts",
  "src/hooks/useCurrentURL.ts",
  "src/services/matchScoreService.ts",
  "src/theme/designTokens.ts",
  "src/types/NavigationState.ts",
  "src/ui/microcopy/userFeedbackAlertsCopy.ts",
  "src/ui/microcopy/userFeedbackAlertsCopyVariants.ts",
  "src/ui/microcopy/weeklyWrappedStoryCopy.ts",
  "src/ui/microcopy/weeklyWrappedStoryCopy_hi.ts",
  "src/ui/theme.ts",
];

const checks = [];

function addCheck(name, passed, details = "") {
  checks.push({ name, passed: !!passed, details });
}

function runCmd(label, args) {
  const isWin = process.platform === "win32";
  const cmd = isWin ? "cmd.exe" : "npm";
  const cmdArgs = isWin ? ["/c", "npm", ...args] : args;
  const result = spawnSync(cmd, cmdArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: isWin,
    maxBuffer: 1024 * 1024 * 20,
  });
  const ok = result.status === 0;
  const detail = ok
    ? "ok"
    : result.error
      ? String(result.error)
      : (result.stderr || result.stdout || `exit=${String(result.status)}`);
  addCheck(label, ok, detail);
  return ok;
}

function readJson(path) {
  try {
    if (!existsSync(path)) return null;
    const raw = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function waitForUrl(url, timeoutMs = 90000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function killTree(proc) {
  if (!proc || !proc.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(proc.pid), "/T", "/F"], { shell: true, encoding: "utf8" });
  } else {
    proc.kill("SIGTERM");
  }
}

async function runViteSmoke() {
  const isWin = process.platform === "win32";
  const cmd = isWin ? "cmd.exe" : "npm";
  const args = isWin
    ? ["/c", "npm", "run", "dev", "--", "--host", "127.0.0.1", "--port", "5173", "--strictPort"]
    : ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5173", "--strictPort"];
  const dev = spawn(cmd, args, {
    cwd: repoRoot,
    shell: isWin,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let logs = "";
  dev.stdout.on("data", (d) => {
    logs += d.toString();
  });
  dev.stderr.on("data", (d) => {
    logs += d.toString();
  });

  try {
    const base = "http://127.0.0.1:5173";
    const ready = await waitForUrl(`${base}/`);
    addCheck("vite_server_started", ready, ready ? "server reachable" : logs.slice(-2000));
    if (!ready) return;

    const routes = [
      "/",
      "/trends/10/Maths",
      "/topic-hub",
      "/practice/10/Maths?topic=Real%20Numbers",
      "/highly-probable/10/Maths",
      "/login",
    ];

    for (const route of routes) {
      let ok = false;
      let details = "";
      try {
        const res = await fetch(`${base}${route}`);
        const text = await res.text();
        ok = res.ok && text.includes('<div id="root"></div>');
        details = `status=${res.status}`;
      } catch (err) {
        details = String(err);
      }
      addCheck(`vite_route_smoke:${route}`, ok, details);
    }
  } finally {
    killTree(dev);
  }
}

async function main() {
  for (const file of deletedFiles) {
    addCheck(`deleted:${file}`, !existsSync(resolve(repoRoot, file)), "file must be absent");
  }

  const stepwise = readJson(stepwisePath);
  addCheck("stepwise_log_present", !!stepwise, stepwise ? `steps=${stepwise.steps?.length ?? 0}` : "missing");
  if (stepwise?.steps) {
    const stepByFile = new Map(stepwise.steps.map((s) => [s.file, s]));
    const dryRunAll = deletedFiles.every((f) => {
      const step = stepByFile.get(f);
      return Boolean(step?.dryRunOk && step?.deleted);
    });
    addCheck("stepwise_dryrun_and_delete_for_each", dryRunAll, `processed=${stepwise.steps.length}`);
  }

  const baseline = readJson(gapAuditPath);
  addCheck("baseline_gap_report_present", !!baseline, baseline ? "present" : "missing (will run fresh)");

  runCmd("build_after_deletion", ["run", "build"]);
  runCmd("lint_ci_after_deletion", ["run", "lint:ci"]);
  runCmd("triangles_human_tutor_after_deletion", ["run", "test:triangles:human-tutor"]);
  runCmd("ux_all_priorities_after_deletion", ["run", "test:ux:all-priorities"]);
  runCmd("human_tutor_gap_audit_after_deletion", ["run", "test:human-tutor:gaps"]);

  const current = readJson(gapAuditPath);
  if (baseline && current?.summary && baseline?.summary) {
    addCheck(
      "gap_failed_suites_not_regressed",
      current.summary.failedSuites <= baseline.summary.failedSuites,
      `before=${baseline.summary.failedSuites}, after=${current.summary.failedSuites}`
    );
    addCheck(
      "gap_p0_not_regressed",
      current.summary.p0 <= baseline.summary.p0,
      `before=${baseline.summary.p0}, after=${current.summary.p0}`
    );
  } else {
    addCheck("gap_comparison_skipped", !!current, "baseline/current missing");
  }

  await runViteSmoke();

  const passed = checks.filter((c) => c.passed).length;
  const failed = checks.length - passed;

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      total: checks.length,
      passed,
      failed,
      deletedFiles: deletedFiles.length,
    },
    checks,
  };

  writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(`Report: ${outFile}`);
  console.table(
    checks.map((c) => ({ check: c.name, status: c.passed ? "PASS" : "FAIL", details: c.details }))
  );

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
