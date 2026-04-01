import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "mojibake_acceptance.json");

const mojibakeRegex =
  /(?:\uFFFD|\u0393\u00C7|[\u00C2\u00C3\u00CE\u00CF\u00E2\u00F0][\u0080-\u00BF\u00C0-\u00FF\u2013-\u201F\u2020-\u2022\u2030\u2039\u203A\u20AC\u2122\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u02C6\u02DC])/u;

function normalizePath(input) {
  return String(input || "").replace(/\\/g, "/");
}

function addCheck(checks, name, ok, details = "") {
  checks.push({ name, ok: Boolean(ok), details: String(details || "") });
}

async function run() {
  const checks = [];
  const knownBadSamples = [
    "don\uFFFDt",
    "x = 5 \u00E2\u2021\u2019 y = 7",
    "Jump into HPQs \u00E2\u2020\u2019",
    "Step 2 \u00E2\u20AC\u00A2 Practice",
    "40 \u00C3\u2014 30",
    "2\u00CF\u20ACr",
    "\u00F0\u0178\u2018\u20AC",
    "\u0393\u00C7",
  ];
  const knownGoodSamples = [
    "don't",
    "x = 5 \u21D2 y = 7",
    "40 \u00D7 30",
    "2\u03C0r",
    "normal ascii text",
  ];

  addCheck(
    checks,
    "known_bad_samples_detected",
    knownBadSamples.every((sample) => mojibakeRegex.test(sample)),
    knownBadSamples.join(" | ")
  );
  addCheck(
    checks,
    "known_good_samples_not_detected",
    knownGoodSamples.every((sample) => !mojibakeRegex.test(sample)),
    knownGoodSamples.join(" | ")
  );

  const checker = spawnSync("node", ["scripts/check-mojibake.cjs"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  addCheck(
    checks,
    "repo_scan_passes",
    checker.status === 0,
    `${String(checker.stdout || "").trim()} ${String(checker.stderr || "").trim()}`.trim()
  );

  const failed = checks.filter((item) => !item.ok);
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

  if (failed.length > 0) {
    console.error(`Mojibake acceptance FAILED (${failed.length}/${checks.length}).`);
    for (const failure of failed) {
      console.error(`- ${failure.name}: ${failure.details}`);
    }
    console.error(`Report: ${normalizePath(path.relative(repoRoot, outPath))}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Mojibake acceptance PASSED (${checks.length}/${checks.length}).`);
  console.log(`Report: ${normalizePath(path.relative(repoRoot, outPath))}`);
}

run().catch(async (err) => {
  const report = {
    generatedAt: new Date().toISOString(),
    error: String(err?.stack || err?.message || err),
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.error("Mojibake acceptance errored.");
  console.error(String(err?.stack || err));
  console.error(`Report: ${normalizePath(path.relative(repoRoot, outPath))}`);
  process.exitCode = 1;
});
