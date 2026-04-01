import { ESLint } from "eslint";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, ".project_memory", "lint");
const BASELINE_PATH = path.join(OUT_DIR, "baseline.json");
const SUMMARY_PATH = path.join(OUT_DIR, "baseline_summary.md");

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, "/");
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

function formatRuleCounts(ruleCounts) {
  const entries = Array.from(ruleCounts.entries()).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return "- None\n";

  const top = entries.slice(0, 20);
  return top.map(([rule, count]) => `- ${rule}: ${count}`).join("\n") + "\n";
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const eslint = new ESLint();
  const results = await eslint.lintFiles(["."]);

  const entries = [];
  const fileSet = new Set();
  const ruleCounts = new Map();

  for (const result of results) {
    const relPath = toRel(result.filePath);
    for (const msg of result.messages) {
      entries.push({
        filePath: relPath,
        ruleId: msg.ruleId || "UNKNOWN",
        messageId: msg.messageId || null,
        line: msg.line || 0,
        column: msg.column || 0,
      });

      fileSet.add(relPath);
      const rule = msg.ruleId || "UNKNOWN";
      ruleCounts.set(rule, (ruleCounts.get(rule) || 0) + 1);
    }
  }

  entries.sort((a, b) => {
    const keyA = entryKey(a);
    const keyB = entryKey(b);
    return keyA.localeCompare(keyB);
  });

  fs.writeFileSync(BASELINE_PATH, JSON.stringify(entries, null, 2) + "\n");

  const summaryLines = [
    "# Lint Baseline Summary",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Baseline path: ${toRel(BASELINE_PATH)}`,
    "",
    `Total lint messages: ${entries.length}`,
    `Files with lint: ${fileSet.size}`,
    "",
    "## Top rules",
    formatRuleCounts(ruleCounts).trimEnd(),
    "",
    "## Notes",
    "- This baseline freezes legacy lint debt.",
    "- Use npm run lint:debt:check to block regressions.",
  ];

  fs.writeFileSync(SUMMARY_PATH, summaryLines.join("\n") + "\n");

  console.log(`lint:debt:freeze - baseline saved to ${toRel(BASELINE_PATH)}`);
  console.log(`lint:debt:freeze - summary saved to ${toRel(SUMMARY_PATH)}`);
  console.log(`lint:debt:freeze - total messages: ${entries.length}`);
}

main().catch((err) => {
  console.error("lint:debt:freeze - failed");
  console.error(err?.message || err);
  process.exit(1);
});
