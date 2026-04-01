import { ESLint } from "eslint";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, ".project_memory", "lint");
const BASELINE_PATH = path.join(OUT_DIR, "baseline.json");
const REPORT_PATH = path.join(OUT_DIR, "check_report.md");
const EXCLUDED_DEBT_DIR_PREFIXES = [
  "_debug_bundle/",
  "_handover_evidence/",
  "_codex_output/",
  ".codex_runs/",
  "docs/project_memory/test_runs/",
  "docs/project_memory/strategy_reports/",
  "reports/",
];

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, "/");
}

function normalizeForMatch(filePath) {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
}

function isExcludedDebtPath(filePath) {
  const normalized = normalizeForMatch(filePath);
  return EXCLUDED_DEBT_DIR_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function entryKey(entry) {
  return [
    entry.filePath,
    entry.ruleId || "",
    entry.messageId || "",
    entry.line || 0,
    entry.column || 0,
  ].join("::");
}

function formatEntry(entry) {
  const msgId = entry.messageId ? ` (${entry.messageId})` : "";
  return `- ${entry.filePath}:${entry.line}:${entry.column} ${entry.ruleId}${msgId}`;
}

async function main() {
  if (!fs.existsSync(BASELINE_PATH)) {
    const msg = "lint:debt:check - baseline not found; run npm run lint:debt:freeze";
    fs.writeFileSync(REPORT_PATH, `# Lint Debt Check Report\n\n${msg}\n`);
    console.error(msg);
    process.exit(1);
  }

  const baselineEntries = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
  const baselineSet = new Set(baselineEntries.map(entryKey));

  const eslint = new ESLint();
  const results = await eslint.lintFiles(["."]);

  const currentEntries = [];
  for (const result of results) {
    const relPath = toRel(result.filePath);
    if (isExcludedDebtPath(relPath)) {
      continue;
    }

    for (const msg of result.messages) {
      currentEntries.push({
        filePath: relPath,
        ruleId: msg.ruleId || "UNKNOWN",
        messageId: msg.messageId || null,
        line: msg.line || 0,
        column: msg.column || 0,
      });
    }
  }

  const newEntries = currentEntries.filter((entry) => !baselineSet.has(entryKey(entry)));

  const reportLines = [
    "# Lint Debt Check Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Baseline path: ${toRel(BASELINE_PATH)}`,
    `Total lint messages: ${currentEntries.length}`,
    `New lint messages: ${newEntries.length}`,
    "",
  ];

  if (!newEntries.length) {
    reportLines.push("Result: PASS (no new lint debt)");
  } else {
    reportLines.push("Result: FAIL (new lint debt detected)", "", "## New lint messages");
    newEntries.sort((a, b) => entryKey(a).localeCompare(entryKey(b)));
    for (const entry of newEntries) reportLines.push(formatEntry(entry));
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, reportLines.join("\n") + "\n");

  if (newEntries.length) {
    console.error(`lint:debt:check - ${newEntries.length} new lint message(s)`);
    process.exit(1);
  }

  console.log("lint:debt:check - no new lint debt");
}

main().catch((err) => {
  console.error("lint:debt:check - failed");
  console.error(err?.message || err);
  process.exit(1);
});
