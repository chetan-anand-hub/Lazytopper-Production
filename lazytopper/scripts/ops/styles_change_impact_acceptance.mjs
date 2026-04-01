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
  "styles_change_impact_graph.json"
);

function fail(msg) {
  console.error(`styles_change_impact_acceptance: FAIL - ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`styles_change_impact_acceptance: ${msg}`);
}

function hasBackslash(value) {
  return String(value || "").includes("\\");
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

try {
  const raw = await fs.readFile(reportPath, "utf8");
  const report = JSON.parse(raw);

  const requiredTopLevel = ["generated_at", "summary", "routes", "rule_impacts", "selector_rollup"];
  for (const key of requiredTopLevel) {
    if (!(key in report)) {
      fail(`missing required field "${key}"`);
      process.exit();
    }
  }

  if (!Array.isArray(report.routes) || report.routes.length === 0) {
    fail("routes array is empty");
    process.exit();
  }

  if (!Array.isArray(report.rule_impacts) || report.rule_impacts.length === 0) {
    fail("rule_impacts array is empty");
    process.exit();
  }

  if (!Array.isArray(report.selector_rollup) || report.selector_rollup.length === 0) {
    fail("selector_rollup array is empty");
    process.exit();
  }

  const dashboardRoute = report.routes.find((r) => r.path === "/dashboard");
  if (!dashboardRoute) {
    fail('route binding missing for "/dashboard"');
  } else if (!ensureArray(dashboardRoute.entry_files).includes("src/pages/Dashboard.tsx")) {
    fail('"/dashboard" route should include src/pages/Dashboard.tsx in entry_files');
  }

  const withDirectImpact = report.rule_impacts.filter(
    (row) => ensureArray(row.usage_routes).length > 0
  );
  if (withDirectImpact.length === 0) {
    fail("no rules map to runtime routes via usage_routes; impact graph is not end-to-end");
  }

  const withTextOnlyImpact = report.rule_impacts.filter(
    (row) =>
      ensureArray(row.usage_routes).length === 0 &&
      ensureArray(row.text_presence_routes).length > 0
  );

  const hasSelectorToken = (token) =>
    report.selector_rollup.some((row) => {
      const selectors = ensureArray(String(row.selector || "").split(",")).map((s) => s.trim());
      return selectors.includes(`.${token}`) || ensureArray(row.class_tokens).includes(token);
    });

  if (!hasSelectorToken("page") && !hasSelectorToken("lt-page")) {
    fail('selector_rollup should contain page wrapper token (".page" or ".lt-page")');
  }

  if (!hasSelectorToken("pill") && !hasSelectorToken("lt-pill")) {
    fail('selector_rollup should contain chip token (".pill" or ".lt-pill")');
  }

  const badPaths = [];
  for (const row of report.rule_impacts) {
    for (const p of ensureArray(row.direct_usage_files)) if (hasBackslash(p)) badPaths.push(p);
    for (const p of ensureArray(row.text_presence_files)) if (hasBackslash(p)) badPaths.push(p);
  }
  for (const route of report.routes) {
    for (const p of ensureArray(route.entry_files)) if (hasBackslash(p)) badPaths.push(p);
    for (const p of ensureArray(route.reachable_files)) if (hasBackslash(p)) badPaths.push(p);
  }
  if (badPaths.length > 0) {
    fail(`paths must be normalized to POSIX style; found backslashes count=${badPaths.length}`);
  }

  if (process.exitCode === 1) {
    process.exit();
  }

  const summary = {
    rules_total: report.summary.rules_total,
    selectors_total: report.summary.selectors_total,
    routes_total: report.summary.routes_total,
    rules_with_direct_route_impact: report.summary.rules_with_direct_route_impact,
    high_risk_rules: report.summary.high_risk_rules,
    medium_risk_rules: report.summary.medium_risk_rules,
    low_risk_rules: report.summary.low_risk_rules,
    text_only_route_impacts: withTextOnlyImpact.length,
  };

  console.log("styles_change_impact_acceptance: SUMMARY");
  for (const [k, v] of Object.entries(summary)) console.log(`  ${k}: ${v}`);
  ok(`PASS report=${path.relative(repoRoot, reportPath).replaceAll("\\", "/")}`);
} catch (err) {
  fail(String(err?.stack || err));
}
