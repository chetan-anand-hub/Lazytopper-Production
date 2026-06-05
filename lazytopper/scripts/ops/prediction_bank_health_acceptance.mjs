import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// Bank-health RETIREMENT guard.
//
// The bank-health engine (src/prediction/bankHealth.ts + buildTopicKeySources.ts) was built but
// never wired into any page: nothing in src/ imported its runtime builders, the wrapper symbol
// `bankHealthSummaryForSubject` was never authored, and HighlyProbableQuestions deliberately does
// NOT surface a computed bank-health summary (an un-validated computed health number would brush
// against the no-fake-data doctrine). Consistent with PR #194's "retire dead compute", the orphan
// files were removed. This guard locks that in — same shape as trig_legacy_retire / bsre retire —
// so the dead compute (and any fake computed-health surface) cannot creep back.

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outFile = path.join(outDir, "prediction_bank_health_acceptance.json");

function check(name, ok, details = "") {
  return { name, ok: Boolean(ok), details: String(details || "") };
}

function fileMissing(rel) {
  return !existsSync(path.join(repoRoot, rel));
}

function text(rel) {
  try {
    return readFileSync(path.join(repoRoot, rel), "utf8");
  } catch {
    return "";
  }
}

function rg(query) {
  const res = spawnSync("rg", ["-n", "-e", query, "src", "scripts", "server"], {
    cwd: repoRoot,
    shell: false,
    encoding: "utf8",
  });
  if ((res.status ?? 1) === 1) return [];
  return String(res.stdout || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((line) => !line.includes("prediction_bank_health_acceptance"));
}

function run() {
  const checks = [];

  checks.push(
    check("bank_health_compute_retired", fileMissing("src/prediction/bankHealth.ts"), "orphaned bank-health engine should be removed")
  );
  checks.push(
    check(
      "topic_key_source_builder_retired",
      fileMissing("src/prediction/buildTopicKeySources.ts"),
      "orphaned topic-key-source builder should be removed"
    )
  );

  const hpq = text("src/pages/HighlyProbableQuestions.tsx");
  checks.push(
    check(
      "hpq_surfaces_no_computed_bank_health",
      !/from "\.\.\/prediction\/bankHealth"/.test(hpq) &&
        !/from "\.\.\/prediction\/buildTopicKeySources"/.test(hpq) &&
        !/bankHealthSummaryForSubject/.test(hpq) &&
        !/buildBankHealthReport\(/.test(hpq),
      "HPQ must not surface an un-validated computed bank-health summary (no-fake-data doctrine)"
    )
  );

  const refs = rg("bankHealth|buildTopicKeySources|bankHealthSummaryForSubject|buildBankHealthReport|summariseBankHealth");
  checks.push(check("no_orphan_bank_health_refs", refs.length === 0, refs.length ? refs.join(" | ") : "none"));

  const failed = checks.filter((c) => !c.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    summary: { total: checks.length, passed: checks.length - failed.length, failed: failed.length },
    checks,
  };

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8");

  console.log(`prediction bank health (retirement) acceptance: ${report.summary.passed}/${report.summary.total}`);
  console.log(`report: ${path.relative(repoRoot, outFile)}`);

  if (failed.length) process.exit(1);
}

run();
