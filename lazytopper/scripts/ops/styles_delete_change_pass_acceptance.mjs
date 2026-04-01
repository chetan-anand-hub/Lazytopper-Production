import { promises as fs } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "styles_delete_change_pass_acceptance.json");

const connectivityPath = path.join(outDir, "styles_connectivity_graph.json");
const impactPath = path.join(outDir, "styles_change_impact_graph.json");
const trimPath = path.join(outDir, "styles_trim_candidates.json");

function addCheck(checks, id, ok, details = "") {
  checks.push({ id, ok: Boolean(ok), details: String(details || "") });
}

function runNodeScript(relScriptPath, checks, id) {
  const absScriptPath = path.join(repoRoot, relScriptPath);
  const result = spawnSync(process.execPath, [absScriptPath], {
    cwd: repoRoot,
    env: { ...process.env },
    encoding: "utf8",
    shell: false,
    maxBuffer: 1024 * 1024 * 30,
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  addCheck(
    checks,
    `step_${id}`,
    (result.status ?? 1) === 0,
    `status=${result.status ?? "null"} script=${relScriptPath}`
  );
}

async function listSourceFiles() {
  const root = path.join(repoRoot, "src");
  const allowExt = new Set([".ts", ".tsx", ".js", ".jsx"]);
  const out = [];

  async function walk(dir) {
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
        continue;
      }
      if (allowExt.has(path.extname(entry.name))) out.push(abs);
    }
  }

  await walk(root);
  return out;
}

function parseSelectorParts(selector) {
  return String(selector || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function computeRepeatedHashGroups(rules) {
  const bySelector = new Map();
  for (const rule of rules || []) {
    const selector = String(rule.selector || "");
    if (!selector) continue;
    if (!bySelector.has(selector)) bySelector.set(selector, []);
    bySelector.get(selector).push(rule);
  }

  const repeated = new Map();
  for (const [selector, rows] of bySelector.entries()) {
    const byHash = new Map();
    for (const row of rows) {
      const hash = String(row.declaration_hash || "");
      if (!hash) continue;
      if (!byHash.has(hash)) byHash.set(hash, []);
      byHash.get(hash).push(row);
    }
    const groups = [...byHash.entries()]
      .filter(([, list]) => list.length > 1)
      .map(([hash, list]) => ({
        hash,
        count: list.length,
        lines: list.map((r) => ({ start_line: r.start_line, end_line: r.end_line })),
      }));
    if (groups.length) repeated.set(selector, groups);
  }
  return repeated;
}

async function run() {
  const checks = [];

  // Strict execution order requested by user.
  runNodeScript("scripts/ops/styles_connectivity_graph.mjs", checks, "01_connectivity_graph");
  runNodeScript("scripts/ops/styles_connectivity_acceptance.mjs", checks, "02_connectivity_acceptance");
  runNodeScript("scripts/ops/styles_change_impact_graph.mjs", checks, "03_impact_graph");
  runNodeScript("scripts/ops/styles_change_impact_acceptance.mjs", checks, "04_impact_acceptance");
  runNodeScript("scripts/ops/styles_trim_candidates.mjs", checks, "05_trim_candidates");
  runNodeScript("scripts/ops/styles_trim_acceptance.mjs", checks, "06_trim_acceptance");
  runNodeScript("scripts/ops/styles_uiux_audit.mjs", checks, "07_uiux_audit");

  const [connectivity, impact, trim] = await Promise.all([
    fs.readFile(connectivityPath, "utf8").then((raw) => JSON.parse(raw)),
    fs.readFile(impactPath, "utf8").then((raw) => JSON.parse(raw)),
    fs.readFile(trimPath, "utf8").then((raw) => JSON.parse(raw)),
  ]);

  const sourceFiles = await listSourceFiles();
  let legacyPageClassName = 0;
  let legacyPillClassName = 0;
  let ltPageClassName = 0;
  let ltPillClassName = 0;

  for (const abs of sourceFiles) {
    const text = await fs.readFile(abs, "utf8");
    legacyPageClassName += (text.match(/className="page"/g) || []).length;
    legacyPillClassName += (text.match(/className="pill"/g) || []).length;
    ltPageClassName += (text.match(/className="lt-page"/g) || []).length;
    ltPillClassName += (text.match(/className="lt-pill"/g) || []).length;
  }

  addCheck(
    checks,
    "migration_no_legacy_page_literal",
    legacyPageClassName === 0,
    `legacy_page_className_literals=${legacyPageClassName}`
  );
  addCheck(
    checks,
    "migration_no_legacy_pill_literal",
    legacyPillClassName === 0,
    `legacy_pill_className_literals=${legacyPillClassName}`
  );
  addCheck(
    checks,
    "migration_lt_page_adopted",
    ltPageClassName > 0,
    `lt_page_className_literals=${ltPageClassName}`
  );
  addCheck(
    checks,
    "migration_lt_pill_adopted",
    ltPillClassName > 0,
    `lt_pill_className_literals=${ltPillClassName}`
  );

  const pageRules = (connectivity.rules || []).filter((r) =>
    parseSelectorParts(r.selector).includes(".page")
  );
  const pillRules = (connectivity.rules || []).filter((r) =>
    parseSelectorParts(r.selector).includes(".pill")
  );

  addCheck(
    checks,
    "collision_hardening_single_page_rule",
    pageRules.length === 1,
    `page_rule_count=${pageRules.length}`
  );
  addCheck(
    checks,
    "collision_hardening_single_pill_rule",
    pillRules.length === 1,
    `pill_rule_count=${pillRules.length}`
  );

  const globalCollisionSelectors = new Set(
    (connectivity.global_collision_selectors || [])
      .map((row) => String(row.selector || ""))
      .filter(Boolean)
  );
  addCheck(
    checks,
    "collision_hardening_page_not_global_collision",
    !globalCollisionSelectors.has(".page"),
    `global_collision_contains_page=${globalCollisionSelectors.has(".page")}`
  );
  addCheck(
    checks,
    "collision_hardening_pill_not_global_collision",
    !globalCollisionSelectors.has(".pill"),
    `global_collision_contains_pill=${globalCollisionSelectors.has(".pill")}`
  );

  const repeatedHashGroups = computeRepeatedHashGroups(connectivity.rules || []);
  const consolidatedSelectors = [
    ".mentor-panel",
    ".concept-list",
    ".concept-name",
    ".difficulty-row",
    ".tier-emoji",
    ".topic-main",
    ".topic-meta",
    ".topic-toggle",
  ];
  for (const selector of consolidatedSelectors) {
    const groups = repeatedHashGroups.get(selector) || [];
    addCheck(
      checks,
      `duplicate_consolidation_${selector}`,
      groups.length === 0,
      `repeat_hash_groups=${groups.length}`
    );
  }

  addCheck(
    checks,
    "conservative_removal_trim_ranges_zero",
    Number(trim.total_ranges || 0) === 0,
    `trim_total_ranges=${trim.total_ranges}`
  );
  addCheck(
    checks,
    "impact_routes_nonzero",
    Number(impact.summary?.routes_total || 0) > 0,
    `routes_total=${impact.summary?.routes_total ?? 0}`
  );

  const failed = checks.filter((c) => !c.ok);
  const report = {
    generated_at: new Date().toISOString(),
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
    },
    metrics: {
      legacy_page_className_literals: legacyPageClassName,
      legacy_pill_className_literals: legacyPillClassName,
      lt_page_className_literals: ltPageClassName,
      lt_pill_className_literals: ltPillClassName,
      rules_total: connectivity.rules_total,
      duplicate_selectors: (connectivity.duplicate_selectors || []).length,
      global_collision_selectors: (connectivity.global_collision_selectors || []).map((x) => x.selector),
      trim_total_ranges: trim.total_ranges,
      impact_routes_total: impact.summary?.routes_total ?? 0,
    },
    checks,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  if (failed.length > 0) {
    console.error(`styles_delete_change_pass_acceptance: FAIL (${failed.length}/${checks.length})`);
    for (const item of failed) console.error(`- ${item.id}: ${item.details}`);
    console.error(`report=${path.relative(repoRoot, outPath).replaceAll("\\", "/")}`);
    process.exitCode = 1;
    return;
  }

  console.log(`styles_delete_change_pass_acceptance: PASS (${checks.length}/${checks.length})`);
  console.log(`report=${path.relative(repoRoot, outPath).replaceAll("\\", "/")}`);
}

run().catch(async (err) => {
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    outPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        error: String(err?.stack || err),
      },
      null,
      2
    ),
    "utf8"
  );
  console.error("styles_delete_change_pass_acceptance errored.");
  console.error(String(err?.stack || err));
  console.error(`report=${path.relative(repoRoot, outPath).replaceAll("\\", "/")}`);
  process.exitCode = 1;
});

