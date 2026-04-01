import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateStylesConnectivityGraph } from "./styles_connectivity_graph.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const defaultOutPath = path.join(
  repoRoot,
  ".project_memory",
  "ops",
  "out",
  "styles_change_impact_graph.json"
);

const codeExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const contentExtensions = [".ts", ".tsx", ".js", ".jsx", ".html"];

function normalizePath(input) {
  return String(input || "")
    .replaceAll("\\", "/")
    .replace(/\/{2,}/g, "/")
    .replace(/^\.\//, "")
    .trim();
}

function uniqSorted(items) {
  return [...new Set(items.filter(Boolean).map((x) => normalizePath(x)))].sort();
}

function parseArgs(argv) {
  const getValue = (flag) => {
    const idx = argv.indexOf(flag);
    return idx >= 0 && argv[idx + 1] ? argv[idx + 1] : "";
  };

  const outRaw = getValue("--out");
  const selector = getValue("--selector");
  const lineRaw = getValue("--line");
  const outPath = outRaw ? path.resolve(process.cwd(), outRaw) : defaultOutPath;
  const line =
    lineRaw !== "" && Number.isFinite(Number(lineRaw)) && Number.isInteger(Number(lineRaw))
      ? Number(lineRaw)
      : null;

  return { outPath, selector, line };
}

async function listFiles(dir, allowExt) {
  const out = [];
  async function walk(current) {
    let entries = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
        continue;
      }
      if (allowExt.has(path.extname(entry.name))) {
        out.push(abs);
      }
    }
  }
  await walk(dir);
  return out;
}

async function readTextIfPresent(absPath) {
  try {
    return await fs.readFile(absPath, "utf8");
  } catch {
    return "";
  }
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractImportSpecifiers(text) {
  const out = [];
  const re =
    /(?:import\s+(?:[^"'`]*?\sfrom\s*)?["']([^"']+)["'])|(?:require\(\s*["']([^"']+)["']\s*\))|(?:import\(\s*["']([^"']+)["']\s*\))/g;
  let match;
  while ((match = re.exec(text))) {
    const spec = match[1] || match[2] || match[3] || "";
    if (spec) out.push(spec);
  }
  return out;
}

function resolveLocalSpecifier(fromRel, specifier, codeFileSet) {
  if (!specifier.startsWith(".")) return "";

  const fromAbs = path.join(repoRoot, fromRel);
  const rawAbs = path.resolve(path.dirname(fromAbs), specifier);
  const rawExt = path.extname(rawAbs);
  const candidates = [];

  if (rawExt) {
    candidates.push(rawAbs);
  } else {
    for (const ext of codeExtensions) {
      candidates.push(`${rawAbs}${ext}`);
    }
    for (const ext of codeExtensions) {
      candidates.push(path.join(rawAbs, `index${ext}`));
    }
  }

  for (const candidateAbs of candidates) {
    const rel = normalizePath(path.relative(repoRoot, candidateAbs));
    if (codeFileSet.has(rel)) return rel;
  }
  return "";
}

function buildImportGraph(codeFilesRel, textByFileRel) {
  const codeFileSet = new Set(codeFilesRel);
  const graph = new Map(codeFilesRel.map((f) => [f, new Set()]));

  for (const fromRel of codeFilesRel) {
    const text = textByFileRel.get(fromRel) || "";
    const specs = extractImportSpecifiers(text);
    for (const spec of specs) {
      const toRel = resolveLocalSpecifier(fromRel, spec, codeFileSet);
      if (!toRel) continue;
      if (!graph.has(toRel)) graph.set(toRel, new Set());
      graph.get(fromRel).add(toRel);
    }
  }

  return graph;
}

function parseAppRouteBindings(appText, codeFileSet) {
  const appRel = "src/App.tsx";
  const componentToFile = new Map();

  const defaultImportRe = /import\s+([A-Za-z_$][A-Za-z0-9_$]*)\s+from\s+["']([^"']+)["']/g;
  let m;
  while ((m = defaultImportRe.exec(appText))) {
    const componentName = m[1];
    const spec = m[2];
    const fileRel = resolveLocalSpecifier(appRel, spec, codeFileSet);
    if (fileRel) componentToFile.set(componentName, fileRel);
  }

  const namedImportRe = /import\s*\{\s*([^}]+)\s*\}\s*from\s+["']([^"']+)["']/g;
  while ((m = namedImportRe.exec(appText))) {
    const rawNames = m[1] || "";
    const spec = m[2];
    const fileRel = resolveLocalSpecifier(appRel, spec, codeFileSet);
    if (!fileRel) continue;
    for (const token of rawNames.split(",")) {
      const clean = token.trim();
      if (!clean) continue;
      const asParts = clean.split(/\s+as\s+/i);
      const localName = (asParts[1] || asParts[0] || "").trim();
      if (localName) componentToFile.set(localName, fileRel);
    }
  }

  const lazyImportRe =
    /const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*lazy\s*\(\s*\(\s*\)\s*=>\s*import\(\s*["']([^"']+)["']\s*\)\s*\)\s*;?/g;
  while ((m = lazyImportRe.exec(appText))) {
    const componentName = m[1];
    const spec = m[2];
    const fileRel = resolveLocalSpecifier(appRel, spec, codeFileSet);
    if (fileRel) componentToFile.set(componentName, fileRel);
  }

  function extractRouteTags(text) {
    const tags = [];
    let cursor = 0;

    while (cursor < text.length) {
      const start = text.indexOf("<Route", cursor);
      if (start < 0) break;

      let end = -1;
      let braceDepth = 0;
      let inString = false;
      let quote = "";
      let escape = false;

      for (let i = start; i < text.length; i += 1) {
        const ch = text[i];
        const next = text[i + 1];

        if (inString) {
          if (escape) {
            escape = false;
            continue;
          }
          if (ch === "\\") {
            escape = true;
            continue;
          }
          if (ch === quote) {
            inString = false;
            quote = "";
          }
          continue;
        }

        if (ch === "'" || ch === '"') {
          inString = true;
          quote = ch;
          continue;
        }

        if (ch === "{") {
          braceDepth += 1;
          continue;
        }

        if (ch === "}") {
          braceDepth = Math.max(0, braceDepth - 1);
          continue;
        }

        if (ch === "/" && next === ">" && braceDepth === 0) {
          end = i + 2;
          break;
        }
      }

      if (end > start) {
        tags.push(text.slice(start, end));
        cursor = end;
      } else {
        cursor = start + 6;
      }
    }

    return tags;
  }

  function extractJsxPropExpression(tag, propName) {
    const needle = `${propName}={`;
    const start = tag.indexOf(needle);
    if (start < 0) return "";

    const exprStart = start + needle.length;
    let depth = 1;
    let inString = false;
    let quote = "";
    let escape = false;

    for (let i = exprStart; i < tag.length; i += 1) {
      const ch = tag[i];

      if (inString) {
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === "\\") {
          escape = true;
          continue;
        }
        if (ch === quote) {
          inString = false;
          quote = "";
        }
        continue;
      }

      if (ch === "'" || ch === '"') {
        inString = true;
        quote = ch;
        continue;
      }

      if (ch === "{") {
        depth += 1;
        continue;
      }

      if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          return tag.slice(exprStart, i);
        }
      }
    }

    return "";
  }

  const routes = [];
  const routeTags = extractRouteTags(appText);

  for (const block of routeTags) {
    const pathMatch = block.match(/path="([^"]+)"/);
    if (!pathMatch) continue;
    const routePath = pathMatch[1];
    const elementExpr = extractJsxPropExpression(block, "element");

    const componentNames = uniqSorted(
      [...elementExpr.matchAll(/<([A-Z][A-Za-z0-9_]*)\b/g)].map((x) => x[1])
    );
    const mappedFiles = uniqSorted(componentNames.map((name) => componentToFile.get(name)));

    if (!mappedFiles.length) continue;

    const pageEntries = mappedFiles.filter((f) => f.startsWith("src/pages/"));
    const entryFiles = pageEntries.length > 0 ? pageEntries : mappedFiles;

    routes.push({
      path: routePath,
      component_names: componentNames,
      entry_files: entryFiles,
      all_mapped_files: mappedFiles,
    });
  }

  return routes;
}

function dfs(graph, start) {
  const seen = new Set();
  const stack = [start];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || seen.has(node)) continue;
    if (!graph.has(node)) continue;
    seen.add(node);
    for (const dep of graph.get(node) || []) {
      if (!seen.has(dep)) stack.push(dep);
    }
  }

  return seen;
}

function riskFromMeta(meta) {
  let score = 0;
  if (meta.global_collision) score += 5;
  if (meta.duplicate_nonidentical) score += 2;
  if (meta.duplicate_count >= 4) score += 2;
  else if (meta.duplicate_count >= 2) score += 1;

  if (meta.usage_route_count >= 5) score += 4;
  else if (meta.usage_route_count >= 2) score += 2;
  else if (meta.usage_route_count === 1) score += 1;

  if (meta.direct_usage_files_count >= 8) score += 3;
  else if (meta.direct_usage_files_count >= 3) score += 1;

  if (meta.direct_usage_files_count === 0 && meta.text_presence_files_count === 0) score -= 2;
  if (!meta.resolved && meta.text_presence_files_count === 0) score -= 1;

  if (score >= 7) return "high";
  if (score >= 3) return "medium";
  return "low";
}

function maxRisk(a, b) {
  const rank = { low: 1, medium: 2, high: 3 };
  return (rank[a] || 0) >= (rank[b] || 0) ? a : b;
}

function normalizeSetToArray(setLike) {
  return uniqSorted([...(setLike || [])]);
}

function toLineRanges(ruleImpacts) {
  const ranges = [];
  for (const r of ruleImpacts) {
    ranges.push({ start_line: r.start_line, end_line: r.end_line, rule_id: r.rule_id });
  }
  return ranges.sort((a, b) => a.start_line - b.start_line);
}

export async function generateStylesChangeImpactGraph(opts = {}) {
  const outPath = opts.outPath || defaultOutPath;
  const querySelector = opts.selector ? String(opts.selector).trim() : "";
  const queryLine = Number.isInteger(opts.line) ? opts.line : null;

  const { report: connectivity } = await generateStylesConnectivityGraph();

  const srcAbs = path.join(repoRoot, "src");
  const codeAbsFiles = await listFiles(srcAbs, new Set(codeExtensions));
  const contentAbsFiles = await listFiles(srcAbs, new Set(contentExtensions));
  const indexHtmlAbs = path.join(repoRoot, "index.html");
  const hasIndexHtml = await readTextIfPresent(indexHtmlAbs);
  if (hasIndexHtml) contentAbsFiles.push(indexHtmlAbs);

  const codeFilesRel = uniqSorted(codeAbsFiles.map((abs) => path.relative(repoRoot, abs)));
  const contentFilesRel = uniqSorted(contentAbsFiles.map((abs) => path.relative(repoRoot, abs)));
  const codeFileSet = new Set(codeFilesRel);

  const textByFileRel = new Map();
  for (const rel of contentFilesRel) {
    const abs = path.join(repoRoot, rel);
    textByFileRel.set(normalizePath(rel), await readTextIfPresent(abs));
  }

  const codeTextByRel = new Map();
  for (const rel of codeFilesRel) {
    codeTextByRel.set(rel, textByFileRel.get(rel) || "");
  }

  const importGraph = buildImportGraph(codeFilesRel, codeTextByRel);

  const appRel = "src/App.tsx";
  const appText = codeTextByRel.get(appRel) || "";
  const routes = parseAppRouteBindings(appText, codeFileSet);

  const routeClosureMap = new Map();
  const fileToRoutes = new Map();

  for (const route of routes) {
    const closure = new Set();
    for (const entry of route.entry_files) {
      for (const node of dfs(importGraph, entry)) closure.add(node);
    }
    const closureList = normalizeSetToArray(closure);
    routeClosureMap.set(route.path, closureList);

    for (const fileRel of closureList) {
      if (!fileToRoutes.has(fileRel)) fileToRoutes.set(fileRel, new Set());
      fileToRoutes.get(fileRel).add(route.path);
    }
  }

  const routeEntryFilesByPath = new Map(routes.map((r) => [r.path, r.entry_files]));

  const allTokens = new Set();
  for (const rule of connectivity.rules || []) {
    for (const token of rule.class_tokens || []) allTokens.add(token);
  }

  const tokenToTextFiles = new Map();
  for (const token of allTokens) {
    const esc = escapeRegExp(token);
    const re = new RegExp(`(^|[^A-Za-z0-9_-])${esc}(?=$|[^A-Za-z0-9_-])`);
    const files = [];
    for (const [rel, text] of textByFileRel.entries()) {
      if (re.test(text || "")) files.push(rel);
    }
    tokenToTextFiles.set(token, new Set(files));
  }

  const selectorCounts = connectivity.selector_counts || {};
  const duplicateNonIdenticalSelectors = new Set(
    (connectivity.duplicate_selector_blocks_nonidentical || [])
      .map((row) => String(row.selector || ""))
      .filter(Boolean)
  );
  const globalCollisionSelectors = new Set(
    (connectivity.global_collision_selectors || [])
      .map((row) => String(row.selector || ""))
      .filter(Boolean)
  );

  const routeSelectorTouches = new Map();
  const routeRuleTouches = new Map();

  const ruleImpacts = (connectivity.rules || []).map((rule, idx) => {
    const directUsageFiles = new Set();
    for (const usage of rule.usage || []) {
      for (const f of usage.files || []) directUsageFiles.add(normalizePath(f));
    }

    const textPresenceFiles = new Set();
    for (const token of rule.class_tokens || []) {
      for (const f of tokenToTextFiles.get(token) || []) {
        textPresenceFiles.add(normalizePath(f));
      }
    }

    const usageRoutes = new Set();
    for (const f of directUsageFiles) {
      for (const routePath of fileToRoutes.get(f) || []) usageRoutes.add(routePath);
    }

    const textPresenceRoutes = new Set();
    for (const f of textPresenceFiles) {
      for (const routePath of fileToRoutes.get(f) || []) textPresenceRoutes.add(routePath);
    }

    const usagePageEntries = new Set();
    for (const routePath of usageRoutes) {
      for (const entry of routeEntryFilesByPath.get(routePath) || []) usagePageEntries.add(entry);
      if (!routeSelectorTouches.has(routePath)) routeSelectorTouches.set(routePath, new Set());
      routeSelectorTouches.get(routePath).add(rule.selector);
      if (!routeRuleTouches.has(routePath)) routeRuleTouches.set(routePath, new Set());
      routeRuleTouches.get(routePath).add(`r${idx + 1}`);
    }

    const duplicateCount = Number(selectorCounts[rule.selector] || 1);
    const duplicateNonIdentical = duplicateNonIdenticalSelectors.has(rule.selector);
    const globalCollision = globalCollisionSelectors.has(rule.selector);

    const riskLevel = riskFromMeta({
      global_collision: globalCollision,
      duplicate_nonidentical: duplicateNonIdentical,
      duplicate_count: duplicateCount,
      usage_route_count: usageRoutes.size,
      direct_usage_files_count: directUsageFiles.size,
      text_presence_files_count: textPresenceFiles.size,
      resolved: Boolean(rule.resolved),
    });

    return {
      rule_id: `r${idx + 1}`,
      selector: rule.selector,
      start_line: rule.start_line,
      end_line: rule.end_line,
      class_tokens: rule.class_tokens || [],
      resolved: Boolean(rule.resolved),
      direct_usage_files: normalizeSetToArray(directUsageFiles),
      text_presence_files: normalizeSetToArray(textPresenceFiles),
      usage_routes: normalizeSetToArray(usageRoutes),
      text_presence_routes: normalizeSetToArray(textPresenceRoutes),
      usage_page_entries: normalizeSetToArray(usagePageEntries),
      duplicate_selector_count: duplicateCount,
      duplicate_nonidentical: duplicateNonIdentical,
      global_collision: globalCollision,
      risk_level: riskLevel,
      change_effects: {
        delete: {
          affected_routes: usageRoutes.size,
          affected_files: directUsageFiles.size,
        },
        modify: {
          potentially_affected_routes: Math.max(usageRoutes.size, textPresenceRoutes.size),
          potentially_affected_files: Math.max(directUsageFiles.size, textPresenceFiles.size),
        },
      },
    };
  });

  const selectorRollupMap = new Map();
  for (const impact of ruleImpacts) {
    if (!selectorRollupMap.has(impact.selector)) {
      selectorRollupMap.set(impact.selector, {
        selector: impact.selector,
        rule_ids: new Set(),
        line_ranges: [],
        class_tokens: new Set(),
        direct_usage_files: new Set(),
        text_presence_files: new Set(),
        usage_routes: new Set(),
        text_presence_routes: new Set(),
        usage_page_entries: new Set(),
        duplicate_selector_count: impact.duplicate_selector_count,
        duplicate_nonidentical: impact.duplicate_nonidentical,
        global_collision: impact.global_collision,
        risk_level: impact.risk_level,
      });
    }

    const row = selectorRollupMap.get(impact.selector);
    row.rule_ids.add(impact.rule_id);
    row.line_ranges.push({
      start_line: impact.start_line,
      end_line: impact.end_line,
      rule_id: impact.rule_id,
    });
    for (const token of impact.class_tokens) row.class_tokens.add(token);
    for (const file of impact.direct_usage_files) row.direct_usage_files.add(file);
    for (const file of impact.text_presence_files) row.text_presence_files.add(file);
    for (const p of impact.usage_routes) row.usage_routes.add(p);
    for (const p of impact.text_presence_routes) row.text_presence_routes.add(p);
    for (const f of impact.usage_page_entries) row.usage_page_entries.add(f);
    row.duplicate_selector_count = Math.max(
      row.duplicate_selector_count,
      impact.duplicate_selector_count
    );
    row.duplicate_nonidentical = row.duplicate_nonidentical || impact.duplicate_nonidentical;
    row.global_collision = row.global_collision || impact.global_collision;
    row.risk_level = maxRisk(row.risk_level, impact.risk_level);
  }

  const selectorRollup = [...selectorRollupMap.values()]
    .map((row) => ({
      selector: row.selector,
      rule_ids: normalizeSetToArray(row.rule_ids),
      line_ranges: row.line_ranges.sort((a, b) => a.start_line - b.start_line),
      class_tokens: normalizeSetToArray(row.class_tokens),
      direct_usage_files: normalizeSetToArray(row.direct_usage_files),
      text_presence_files: normalizeSetToArray(row.text_presence_files),
      usage_routes: normalizeSetToArray(row.usage_routes),
      text_presence_routes: normalizeSetToArray(row.text_presence_routes),
      usage_page_entries: normalizeSetToArray(row.usage_page_entries),
      duplicate_selector_count: row.duplicate_selector_count,
      duplicate_nonidentical: row.duplicate_nonidentical,
      global_collision: row.global_collision,
      risk_level: row.risk_level,
    }))
    .sort((a, b) => {
      const riskRank = { high: 0, medium: 1, low: 2 };
      const byRisk = (riskRank[a.risk_level] ?? 9) - (riskRank[b.risk_level] ?? 9);
      if (byRisk !== 0) return byRisk;
      const byRoutes = b.usage_routes.length - a.usage_routes.length;
      if (byRoutes !== 0) return byRoutes;
      return a.selector.localeCompare(b.selector);
    });

  const routesWithReachability = routes.map((route) => {
    const reachableFiles = routeClosureMap.get(route.path) || [];
    return {
      path: route.path,
      component_names: route.component_names,
      entry_files: route.entry_files,
      reachable_files_count: reachableFiles.length,
      reachable_files: reachableFiles,
      rules_touching_route: (routeRuleTouches.get(route.path) || new Set()).size,
      selectors_touching_route: (routeSelectorTouches.get(route.path) || new Set()).size,
    };
  });

  routesWithReachability.sort((a, b) => {
    const byTouched = b.rules_touching_route - a.rules_touching_route;
    if (byTouched !== 0) return byTouched;
    return a.path.localeCompare(b.path);
  });

  const ruleWithUsageRoutes = ruleImpacts.filter((r) => r.usage_routes.length > 0).length;
  const highRiskRules = ruleImpacts.filter((r) => r.risk_level === "high").length;
  const mediumRiskRules = ruleImpacts.filter((r) => r.risk_level === "medium").length;
  const lowRiskRules = ruleImpacts.filter((r) => r.risk_level === "low").length;
  const highRiskSelectors = selectorRollup.filter((r) => r.risk_level === "high").length;

  const report = {
    generated_at: new Date().toISOString(),
    source_reports: {
      styles_connectivity_graph: ".project_memory/ops/out/styles_connectivity_graph.json",
    },
    summary: {
      rules_total: ruleImpacts.length,
      selectors_total: selectorRollup.length,
      routes_total: routesWithReachability.length,
      rules_with_direct_route_impact: ruleWithUsageRoutes,
      high_risk_rules: highRiskRules,
      medium_risk_rules: mediumRiskRules,
      low_risk_rules: lowRiskRules,
      high_risk_selectors: highRiskSelectors,
    },
    routes: routesWithReachability,
    rule_impacts: ruleImpacts,
    selector_rollup: selectorRollup,
  };

  const query = {};
  if (querySelector) {
    query.selector = querySelector;
    query.matches = selectorRollup.filter((row) => row.selector === querySelector);
  }
  if (queryLine !== null) {
    query.line = queryLine;
    query.matches_by_line = ruleImpacts.filter(
      (row) => Number(row.start_line) <= queryLine && Number(row.end_line) >= queryLine
    );
  }
  if (query.selector || query.line !== undefined) {
    report.query = query;
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  return {
    outPath,
    report,
    queryPreview: {
      selector: querySelector || null,
      selector_matches: querySelector ? (query.matches || []).length : null,
      line: queryLine,
      line_matches: queryLine !== null ? (query.matches_by_line || []).length : null,
    },
  };
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  const { outPath, selector, line } = parseArgs(process.argv.slice(2));
  const result = await generateStylesChangeImpactGraph({ outPath, selector, line });
  const summary = result.report.summary;
  console.log(
    `styles_change_impact_graph: rules=${summary.rules_total}, selectors=${summary.selectors_total}, routes=${summary.routes_total}, highRiskRules=${summary.high_risk_rules}`
  );
  if (selector || line !== null) {
    console.log(
      `styles_change_impact_graph: query selector=${result.queryPreview.selector ?? "none"}, selectorMatches=${result.queryPreview.selector_matches ?? "n/a"}, line=${result.queryPreview.line ?? "none"}, lineMatches=${result.queryPreview.line_matches ?? "n/a"}`
    );
  }
  console.log(`report=${normalizePath(path.relative(repoRoot, outPath))}`);
}
