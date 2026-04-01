import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const prePath = path.join(
  repoRoot,
  ".project_memory",
  "ops",
  "out",
  "styles_connectivity_graph.pretrim.json"
);
const postPath = path.join(
  repoRoot,
  ".project_memory",
  "ops",
  "out",
  "styles_connectivity_graph.json"
);

function fail(msg) {
  console.error(`styles_trim_acceptance: FAIL - ${msg}`);
  process.exitCode = 1;
}

function asCountMap(selectorCounts) {
  if (!selectorCounts || typeof selectorCounts !== "object") return new Map();
  return new Map(Object.entries(selectorCounts).map(([k, v]) => [k, Number(v) || 0]));
}

try {
  const pre = JSON.parse(await fs.readFile(prePath, "utf8"));
  const post = JSON.parse(await fs.readFile(postPath, "utf8"));
  const preCounts = asCountMap(pre.selector_counts);
  const postCounts = asCountMap(post.selector_counts);
  const postRules = Array.isArray(post.rules) ? post.rules : [];
  const preRules = Array.isArray(pre.rules) ? pre.rules : [];
  const postResolvedTokens = new Set(
    postRules
      .filter((r) => r.class_tokens?.length > 0 && r.resolved)
      .flatMap((r) => r.class_tokens || [])
      .map((t) => String(t || "").trim())
      .filter(Boolean)
  );
  const postTokenCounts = new Map();
  for (const row of postRules) {
    for (const token of row.class_tokens || []) {
      const clean = String(token || "").trim();
      if (!clean) continue;
      postTokenCounts.set(clean, (postTokenCounts.get(clean) || 0) + 1);
    }
  }

  function selectorHasEquivalentResolvedToken(selector) {
    const selectorRules = preRules.filter((r) => String(r.selector || "") === selector);
    const tokens = [...new Set(selectorRules.flatMap((r) => r.class_tokens || []))];
    if (tokens.length === 0) return false;
    return tokens.some((token) => {
      const clean = String(token || "").trim();
      if (!clean) return false;
      if (postResolvedTokens.has(clean)) return true;
      if (postResolvedTokens.has(`lt-${clean}`)) return true;
      return false;
    });
  }

  function selectorHasEquivalentTokenPresence(selector) {
    const selectorRules = preRules.filter((r) => String(r.selector || "") === selector);
    const tokens = [...new Set(selectorRules.flatMap((r) => r.class_tokens || []))];
    if (tokens.length === 0) return false;
    return tokens.some((token) => {
      const clean = String(token || "").trim();
      if (!clean) return false;
      if ((postTokenCounts.get(clean) || 0) > 0) return true;
      if ((postTokenCounts.get(`lt-${clean}`) || 0) > 0) return true;
      return false;
    });
  }

  const resolvedSelectorsPre = new Set(
    (pre.rules || [])
      .filter((r) => r.class_tokens?.length > 0 && r.resolved)
      .map((r) => String(r.selector || ""))
      .filter(Boolean)
  );
  const missingResolved = [...resolvedSelectorsPre].filter(
    (sel) => (postCounts.get(sel) || 0) < 1 && !selectorHasEquivalentResolvedToken(sel)
  );

  const duplicateSelectorsPre = new Set(
    (pre.duplicate_selector_blocks_identical || []).map((d) => String(d.selector || "")).filter(Boolean)
  );
  const missingDuplicateKeeps = [...duplicateSelectorsPre].filter(
    (sel) => (postCounts.get(sel) || 0) < 1 && !selectorHasEquivalentTokenPresence(sel)
  );

  if (missingResolved.length > 0) {
    fail(`resolved selectors dropped: count=${missingResolved.length}`);
    for (const sel of missingResolved.slice(0, 60)) console.error(`  - ${sel}`);
  }

  if (missingDuplicateKeeps.length > 0) {
    fail(`duplicate keep selector missing after trim: count=${missingDuplicateKeeps.length}`);
    for (const sel of missingDuplicateKeeps.slice(0, 60)) console.error(`  - ${sel}`);
  }

  if (process.exitCode === 1) {
    process.exit();
  }

  console.log("styles_trim_acceptance: PASS");
  console.log(`  pre.rules_total: ${pre.rules_total}`);
  console.log(`  post.rules_total: ${post.rules_total}`);
  console.log(`  pre.rules_unresolved: ${pre.rules_unresolved}`);
  console.log(`  post.rules_unresolved: ${post.rules_unresolved}`);
  console.log(`  pre.duplicate_selectors: ${(pre.duplicate_selectors || []).length}`);
  console.log(`  post.duplicate_selectors: ${(post.duplicate_selectors || []).length}`);
  console.log(
    `  pre.report: ${path.relative(repoRoot, prePath).replaceAll("\\", "/")}`
  );
  console.log(
    `  post.report: ${path.relative(repoRoot, postPath).replaceAll("\\", "/")}`
  );
} catch (err) {
  fail(String(err?.stack || err));
}
