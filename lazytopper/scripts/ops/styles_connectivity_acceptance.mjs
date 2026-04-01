import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const reportPath = path.join(
  repoRoot,
  ".project_memory",
  "ops",
  "out",
  "styles_connectivity_graph.json"
);

const requiredFields = [
  "rules_total",
  "rules_with_class_tokens",
  "rules_resolved",
  "rules_unresolved",
  "duplicate_selectors",
  "duplicate_selector_blocks_identical",
  "duplicate_selector_blocks_nonidentical",
  "global_collision_selectors",
  "candidates_safe_remove",
  "rules",
  "selector_counts",
];

function fail(msg) {
  console.error(`styles_connectivity_acceptance: FAIL - ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`styles_connectivity_acceptance: ${msg}`);
}

try {
  const raw = await fs.readFile(reportPath, "utf8");
  const report = JSON.parse(raw);

  for (const field of requiredFields) {
    if (!(field in report)) {
      fail(`missing required field "${field}"`);
      process.exit();
    }
  }

  if (!Array.isArray(report.rules) || report.rules.length === 0) {
    fail("rules array is empty or invalid");
    process.exit();
  }

  const badRules = report.rules.filter(
    (r) =>
      !Number.isInteger(r.start_line) ||
      !Number.isInteger(r.end_line) ||
      r.start_line < 1 ||
      r.end_line < r.start_line ||
      typeof r.selector !== "string" ||
      !Array.isArray(r.class_tokens) ||
      typeof r.declaration_hash !== "string"
  );
  if (badRules.length > 0) {
    fail(`parser produced invalid rule metadata count=${badRules.length}`);
    process.exit();
  }

  const summary = {
    rules_total: report.rules_total,
    rules_with_class_tokens: report.rules_with_class_tokens,
    rules_resolved: report.rules_resolved,
    rules_unresolved: report.rules_unresolved,
    duplicate_selectors: Array.isArray(report.duplicate_selectors)
      ? report.duplicate_selectors.length
      : 0,
    duplicate_identical: Array.isArray(report.duplicate_selector_blocks_identical)
      ? report.duplicate_selector_blocks_identical.length
      : 0,
    duplicate_nonidentical: Array.isArray(report.duplicate_selector_blocks_nonidentical)
      ? report.duplicate_selector_blocks_nonidentical.length
      : 0,
    global_collision_selectors: Array.isArray(report.global_collision_selectors)
      ? report.global_collision_selectors.length
      : 0,
    candidates_safe_remove: Array.isArray(report.candidates_safe_remove)
      ? report.candidates_safe_remove.length
      : 0,
  };

  console.log("styles_connectivity_acceptance: SUMMARY");
  for (const [k, v] of Object.entries(summary)) {
    console.log(`  ${k}: ${v}`);
  }

  ok(`PASS report=${path.relative(repoRoot, reportPath).replaceAll("\\", "/")}`);
} catch (err) {
  fail(String(err?.stack || err));
}
