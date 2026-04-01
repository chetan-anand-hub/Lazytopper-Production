import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

const CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
]);

const SCAN_ROOTS = ["src", "server", "scripts", "tools"];

const OUTPUT_DIR = path.join(repoRoot, "docs", "project_memory", "audits");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "repo_connectivity_graph.json");
const OUTPUT_MERMAID = path.join(OUTPUT_DIR, "repo_connectivity_graph.mmd");
const OUTPUT_GRAPH_MD = path.join(OUTPUT_DIR, "repo_connectivity_graph.md");
const OUTPUT_FUNCTIONAL_REPORT = path.join(OUTPUT_DIR, "repo_functionality_report.md");

function normalizeRel(p) {
  return String(p || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .trim();
}

function categoryFor(file) {
  const rel = normalizeRel(file);
  if (rel === "src/main.tsx") return "entrypoint";
  if (rel === "src/App.tsx") return "app-shell";
  if (rel.startsWith("src/pages/")) return "page";
  if (rel.startsWith("src/services/")) return "service";
  if (rel.startsWith("src/components/")) return "component";
  if (rel.startsWith("src/context/")) return "context";
  if (rel.startsWith("src/engine/")) return "engine";
  if (rel.startsWith("src/tutor/")) return "tutor-core";
  if (rel.startsWith("src/data/")) return "data";
  if (rel.endsWith(".css")) return "style";
  if (rel.startsWith("src/ui/")) return "ui";
  if (rel.startsWith("src/hooks/")) return "hook";
  if (rel.startsWith("src/utils/")) return "utility";
  if (rel.startsWith("server/")) return "backend";
  if (rel.startsWith("scripts/")) return "tooling-script";
  if (rel.startsWith("tools/")) return "tooling-runtime";
  return "other";
}

function toRel(abs) {
  return normalizeRel(path.relative(repoRoot, abs));
}

function computeLineStarts(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\n") starts.push(i + 1);
  }
  return starts;
}

function lineOfIndex(lineStarts, idx) {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lineStarts[mid] <= idx) lo = mid + 1;
    else hi = mid - 1;
  }
  return hi + 1;
}

async function listFilesInRoot(relRoot) {
  const absRoot = path.join(repoRoot, relRoot);
  const out = [];
  async function walk(absDir) {
    let entries = [];
    try {
      entries = await fs.readdir(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = path.join(absDir, entry.name);
      if (entry.isDirectory()) {
        if (
          entry.name === "node_modules" ||
          entry.name === "dist" ||
          entry.name === "build" ||
          entry.name === ".git" ||
          entry.name === ".project_memory" ||
          entry.name === "reports"
        ) {
          continue;
        }
        await walk(abs);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (!CODE_EXTENSIONS.has(ext)) continue;
      out.push(toRel(abs));
    }
  }
  await walk(absRoot);
  return out;
}

async function collectCodeFiles() {
  const all = [];
  for (const relRoot of SCAN_ROOTS) {
    const files = await listFilesInRoot(relRoot);
    all.push(...files);
  }
  return [...new Set(all)].sort();
}

function extractStaticSpecifiers(text) {
  const local = new Set();
  const external = new Set();
  const staticImportRe =
    /(?:import\s+(?:[^"'`]*?\sfrom\s*)?["'`]([^"'`]+)["'`])|(?:import\(\s*["'`]([^"'`]+)["'`]\s*\))|(?:require\(\s*["'`]([^"'`]+)["'`]\s*\))/g;
  let m;
  while ((m = staticImportRe.exec(text))) {
    const spec = String(m[1] || m[2] || m[3] || "").trim();
    if (!spec) continue;
    if (spec.startsWith(".") || spec.startsWith("/")) local.add(spec);
    else external.add(spec);
  }

  const pathJoinRequireRe = /require\(\s*path\.join\(\s*__dirname\s*,\s*([^)]+?)\)\s*\)/g;
  while ((m = pathJoinRequireRe.exec(text))) {
    const inner = String(m[1] || "");
    const parts = [...inner.matchAll(/["'`]([^"'`]+)["'`]/g)].map((x) => String(x[1] || "").trim());
    if (!parts.length) continue;
    const joined = normalizeRel(path.join(...parts));
    if (joined.startsWith(".") || joined.startsWith("/")) local.add(joined);
  }

  return {
    local: [...local].sort(),
    external: [...external].sort(),
  };
}

function buildResolveCandidates(fromRel, specifier) {
  const cleanSpec = String(specifier || "").split("?")[0].split("#")[0];
  if (!cleanSpec) return [];

  let baseAbs = "";
  if (cleanSpec.startsWith("/")) {
    baseAbs = path.join(repoRoot, cleanSpec);
  } else if (cleanSpec.startsWith(".")) {
    baseAbs = path.resolve(path.dirname(path.join(repoRoot, fromRel)), cleanSpec);
  } else if (cleanSpec.startsWith("@/")) {
    baseAbs = path.join(repoRoot, "src", cleanSpec.slice(2));
  } else {
    return [];
  }

  const ext = path.extname(baseAbs).toLowerCase();
  if (ext) return [toRel(baseAbs)];

  const candidates = [];
  for (const codeExt of CODE_EXTENSIONS) {
    candidates.push(toRel(`${baseAbs}${codeExt}`));
  }
  for (const codeExt of CODE_EXTENSIONS) {
    candidates.push(toRel(path.join(baseAbs, `index${codeExt}`)));
  }
  return candidates;
}

function resolveLocalSpecifier(fromRel, specifier, fileSet) {
  const candidates = buildResolveCandidates(fromRel, specifier);
  for (const candidate of candidates) {
    if (fileSet.has(candidate)) return candidate;
  }
  return "";
}

function mapImports(files, textByFile) {
  const fileSet = new Set(files);
  const edges = [];
  const unresolvedLocalImports = [];
  const externalImports = [];

  for (const from of files) {
    const text = textByFile.get(from) || "";
    const specs = extractStaticSpecifiers(text);
    for (const localSpec of specs.local) {
      const resolved = resolveLocalSpecifier(from, localSpec, fileSet);
      if (resolved) {
        edges.push({ from, to: resolved, via: localSpec });
      } else {
        unresolvedLocalImports.push({ file: from, specifier: localSpec });
      }
    }
    for (const extSpec of specs.external) {
      externalImports.push({ file: from, package: extSpec });
    }
  }

  return {
    edges,
    unresolvedLocalImports,
    externalImports,
  };
}

function dedupeEdges(edges) {
  const seen = new Set();
  const out = [];
  for (const edge of edges) {
    const key = `${edge.from}->${edge.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(edge);
  }
  return out;
}

function computeDegree(files, edges) {
  const indegree = new Map(files.map((f) => [f, 0]));
  const outdegree = new Map(files.map((f) => [f, 0]));
  for (const edge of edges) {
    outdegree.set(edge.from, (outdegree.get(edge.from) || 0) + 1);
    indegree.set(edge.to, (indegree.get(edge.to) || 0) + 1);
  }
  return { indegree, outdegree };
}

function topN(mapObj, n = 15) {
  return [...mapObj.entries()]
    .map(([file, value]) => ({ file, value }))
    .sort((a, b) => b.value - a.value || a.file.localeCompare(b.file))
    .slice(0, n);
}

function buildAdjacency(edges) {
  const g = new Map();
  for (const edge of edges) {
    if (!g.has(edge.from)) g.set(edge.from, new Set());
    g.get(edge.from).add(edge.to);
  }
  return g;
}

function reachableFromSeeds(adjacency, seeds) {
  const seen = new Set();
  const stack = [...seeds];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || seen.has(cur)) continue;
    seen.add(cur);
    for (const nxt of adjacency.get(cur) || []) {
      if (!seen.has(nxt)) stack.push(nxt);
    }
  }
  return seen;
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
      tags.push({ text: text.slice(start, end), index: start });
      cursor = end;
    } else {
      cursor = start + 6;
    }
  }
  return tags;
}

function extractJsxPropExpression(routeTagText, propName) {
  const needle = `${propName}={`;
  const start = routeTagText.indexOf(needle);
  if (start < 0) return "";
  const exprStart = start + needle.length;
  let depth = 1;
  let inString = false;
  let quote = "";
  let escape = false;
  for (let i = exprStart; i < routeTagText.length; i += 1) {
    const ch = routeTagText[i];
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
      if (depth === 0) return routeTagText.slice(exprStart, i);
    }
  }
  return "";
}

function parseRouteMap(appText, fileSet) {
  const appRel = "src/App.tsx";
  const componentToFile = new Map();

  const defaultImportRe = /import\s+([A-Za-z_$][A-Za-z0-9_$]*)\s+from\s+["'`]([^"'`]+)["'`]/g;
  let m;
  while ((m = defaultImportRe.exec(appText))) {
    const name = String(m[1] || "").trim();
    const spec = String(m[2] || "").trim();
    const resolved = resolveLocalSpecifier(appRel, spec, fileSet);
    if (name && resolved) componentToFile.set(name, resolved);
  }

  const namedImportRe = /import\s*\{\s*([^}]+)\s*\}\s*from\s+["'`]([^"'`]+)["'`]/g;
  while ((m = namedImportRe.exec(appText))) {
    const names = String(m[1] || "");
    const spec = String(m[2] || "").trim();
    const resolved = resolveLocalSpecifier(appRel, spec, fileSet);
    if (!resolved) continue;
    for (const rawToken of names.split(",")) {
      const token = rawToken.trim();
      if (!token) continue;
      const parts = token.split(/\s+as\s+/i);
      const localName = String(parts[1] || parts[0] || "").trim();
      if (localName) componentToFile.set(localName, resolved);
    }
  }

  const lazyImportRe =
    /const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*lazy\s*\(\s*\(\s*\)\s*=>\s*import\(\s*["'`]([^"'`]+)["'`]\s*\)\s*\)\s*;?/g;
  while ((m = lazyImportRe.exec(appText))) {
    const name = String(m[1] || "").trim();
    const spec = String(m[2] || "").trim();
    const resolved = resolveLocalSpecifier(appRel, spec, fileSet);
    if (name && resolved) componentToFile.set(name, resolved);
  }

  const lineStarts = computeLineStarts(appText);
  const routes = [];
  for (const routeTag of extractRouteTags(appText)) {
    const tag = routeTag.text;
    const pathMatch = tag.match(/path="([^"]+)"/);
    if (!pathMatch) continue;
    const routePath = String(pathMatch[1] || "").trim();
    if (!routePath) continue;
    const elementExpr = extractJsxPropExpression(tag, "element");
    const componentNames = [...new Set([...elementExpr.matchAll(/<([A-Z][A-Za-z0-9_]*)\b/g)].map((x) => x[1]))].sort();
    const mappedFiles = [...new Set(componentNames.map((name) => componentToFile.get(name)).filter(Boolean))].sort();
    const pageEntries = mappedFiles.filter((f) => f.startsWith("src/pages/"));
    const nonWrapperEntries = mappedFiles.filter((f) => f !== "src/components/auth/RequireAuth.tsx");
    const entryFiles = pageEntries.length
      ? pageEntries
      : nonWrapperEntries.length
      ? nonWrapperEntries
      : mappedFiles;
    routes.push({
      path: routePath,
      line: lineOfIndex(lineStarts, routeTag.index),
      requiresAuth: /<RequireAuth\b/.test(elementExpr),
      componentNames,
      mappedFiles,
      entryFiles,
    });
  }

  return routes;
}

function parseBackendEndpoints(serverText) {
  const endpoints = [];
  const lineStarts = computeLineStarts(serverText);
  const ifRe = /if\s*\(([\s\S]{0,460}?)\)\s*\{/g;
  let m;
  while ((m = ifRe.exec(serverText))) {
    const condition = String(m[1] || "");
    if (!condition.includes("req.method")) continue;

    const methods = [...condition.matchAll(/req\.method\s*===\s*['"]([A-Z]+)['"]/g)].map((x) => String(x[1] || "").toUpperCase());
    if (!methods.length) continue;

    const literalPaths = [...condition.matchAll(/(?:req\.url|reqPath)\s*===\s*['"]([^'"]+)['"]/g)].map((x) => String(x[1] || ""));
    const startsWithPaths = [...condition.matchAll(/startsWith\(\s*['"]([^'"]+)['"]\s*\)/g)].map((x) => String(x[1] || ""));
    const regexPaths = [...condition.matchAll(/(\/\^?.+?\/[gimsuy]*)\.test\((?:req\.url|reqPath)\)/g)].map((x) => String(x[1] || ""));
    const line = lineOfIndex(lineStarts, m.index);

    for (const method of methods) {
      for (const p of literalPaths) {
        endpoints.push({ method, path: p, match: "exact", line });
      }
      for (const p of startsWithPaths) {
        endpoints.push({ method, path: p, match: "prefix", line });
      }
      for (const p of regexPaths) {
        endpoints.push({ method, path: p, match: "regex", line });
      }
    }
  }

  const dedup = new Map();
  for (const ep of endpoints) {
    const key = `${ep.method}|${ep.match}|${ep.path}`;
    if (!dedup.has(key)) dedup.set(key, ep);
  }
  return [...dedup.values()].sort((a, b) => a.line - b.line || a.method.localeCompare(b.method));
}

function parseFrontendApiUsage(textByFile) {
  const out = [];
  const apiRe = /["'`](\/api\/[^"'`]+)["'`]/g;
  for (const [file, text] of textByFile.entries()) {
    if (!file.startsWith("src/")) continue;
    const paths = [...new Set([...text.matchAll(apiRe)].map((x) => String(x[1] || "").trim()).filter(Boolean))].sort();
    if (!paths.length) continue;
    out.push({ file, apiPaths: paths });
  }
  return out.sort((a, b) => a.file.localeCompare(b.file));
}

function makeMermaidGraph({ routes, edges }) {
  const edgeMap = new Map();
  for (const edge of edges) {
    if (!edgeMap.has(edge.from)) edgeMap.set(edge.from, []);
    edgeMap.get(edge.from).push(edge.to);
  }

  const lines = [];
  lines.push("graph TD");
  lines.push("  APP[\"src/App.tsx\"]");
  lines.push("  SERVER[\"server/index.cjs\"]");

  const pageFiles = new Set();
  for (const route of routes) {
    const routeNode = `ROUTE_${route.path.replace(/[^A-Za-z0-9]/g, "_") || "root"}`;
    lines.push(`  APP --> ${routeNode}[\"${route.path}\"]`);
    const entries = route.entryFiles.slice(0, 2);
    for (const file of entries) {
      pageFiles.add(file);
      const pageNode = `PAGE_${file.replace(/[^A-Za-z0-9]/g, "_")}`;
      lines.push(`  ${routeNode} --> ${pageNode}[\"${file}\"]`);
    }
  }

  for (const page of [...pageFiles].sort()) {
    const deps = [...new Set((edgeMap.get(page) || []).filter((f) => {
      const cat = categoryFor(f);
      return (
        cat === "service" ||
        cat === "context" ||
        cat === "engine" ||
        cat === "component" ||
        cat === "ui" ||
        cat === "tutor-core"
      );
    }))].slice(0, 6);
    const pageNode = `PAGE_${page.replace(/[^A-Za-z0-9]/g, "_")}`;
    for (const dep of deps) {
      const depNode = `DEP_${dep.replace(/[^A-Za-z0-9]/g, "_")}`;
      lines.push(`  ${pageNode} --> ${depNode}[\"${dep}\"]`);
    }
  }

  const backendDeps = [...new Set((edgeMap.get("server/index.cjs") || []))].slice(0, 12);
  for (const dep of backendDeps) {
    const depNode = `BACK_${dep.replace(/[^A-Za-z0-9]/g, "_")}`;
    lines.push(`  SERVER --> ${depNode}[\"${dep}\"]`);
  }

  return lines.join("\n") + "\n";
}

function domainRows(fileSet, routes) {
  const domains = [
    {
      name: "Auth and Identity",
      summary: "Login, auth gating, Firebase initialization, and user/session identity context.",
      routeMatches: ["/login", "/onboarding", "/dashboard"],
      files: [
        "src/context/AuthContext.tsx",
        "src/components/auth/RequireAuth.tsx",
        "src/pages/Login.tsx",
        "src/services/firebaseClient.ts",
        "src/context/ProfileContext.tsx",
      ],
    },
    {
      name: "Topic Hub + Human Tutor",
      summary: "Concept-map learning, grind drawer, mentor chat/fallback, and topic mastery state.",
      routeMatches: ["/topic-hub", "/topics/:topicKey"],
      files: [
        "src/pages/TopicHub.tsx",
        "src/pages/TopicHubHome.tsx",
        "src/components/tutor/TutorDrawerV2.tsx",
        "src/services/topicHubMastery.ts",
        "src/services/mentorServerGate.ts",
        "src/services/sessionLogger.ts",
        "server/index.cjs",
        "server/tutorOrchestrator.cjs",
      ],
    },
    {
      name: "Practice and Session Playback",
      summary: "Practice setup, cloud/local session bootstrapping, and active session player flow.",
      routeMatches: ["/practice/:grade/:subject", "/play/:sessionId"],
      files: [
        "src/pages/PracticePage.tsx",
        "src/pages/SessionPlayPage.tsx",
        "src/components/SessionPlayer.tsx",
        "src/services/sessionApi.ts",
        "src/services/sessionService.ts",
        "src/services/sessionTypes.ts",
        "server/sessionHandlers.cjs",
        "server/sessionStore.cjs",
      ],
    },
    {
      name: "Daily Mix + Weekly Wrapped",
      summary: "Daily personalized study mix and weekly recap/wrap storytelling widgets.",
      routeMatches: ["/daily-mix/:grade/:subject", "/weekly-wrapped"],
      files: [
        "src/pages/DailyMixPage.tsx",
        "src/pages/WeeklyWrappedPage.tsx",
        "src/components/DailyMixWidget.tsx",
        "src/components/DailyMixPlayer.tsx",
        "src/components/WeeklyWrappedWidget.tsx",
        "src/components/WeeklyWrappedCarousel.tsx",
        "src/services/dailyMixGenerator.ts",
        "src/services/dailyMixService.ts",
        "src/services/weeklyWrappedGenerator.ts",
        "src/services/weeklyWrapService.ts",
      ],
    },
    {
      name: "Predictive / Mock / HPQ Surfaces",
      summary: "Trends, predictive papers, mock builder, mock paper viewer, and HPQ entry points.",
      routeMatches: [
        "/trends/:grade/:subject",
        "/predictive-papers",
        "/mock-builder/:grade/:subject",
        "/mock-paper/:slug",
        "/highly-probable/:grade/:subject",
      ],
      files: [
        "src/pages/TrendsPage.tsx",
        "src/pages/PredictivePapers.tsx",
        "src/pages/MockBuilder.tsx",
        "src/pages/MockPaper.tsx",
        "src/pages/HighlyProbableQuestions.tsx",
      ],
    },
    {
      name: "Planner / Mentor / UX Control Layer",
      summary: "Study planner, AI mentor page, command palette navigation intents, and vibe mode toggle.",
      routeMatches: ["/planner/:grade/:subject", "/mentor/:grade/:subject", "/ai-mentor/:grade/:subject"],
      files: [
        "src/components/planner/StudyPlannerView.tsx",
        "src/pages/StudyPlanPage.tsx",
        "src/pages/AiMentorPage.tsx",
        "src/ui/components/CommandPalette.tsx",
        "src/ui/components/VibeToggle.tsx",
        "src/services/commandIntent.ts",
        "src/services/commandPaletteConfig.ts",
        "src/context/vibeModeContext.tsx",
      ],
    },
  ];

  return domains.map((domain) => {
    const existingFiles = domain.files.filter((f) => fileSet.has(f));
    const routeHits = routes
      .filter((r) => domain.routeMatches.some((needle) => r.path === needle || r.path.startsWith(needle)))
      .map((r) => r.path);
    return {
      name: domain.name,
      summary: domain.summary,
      files: existingFiles,
      routes: [...new Set(routeHits)].sort(),
    };
  });
}

function formatMdTable(headers, rows) {
  const lines = [];
  lines.push(`| ${headers.join(" | ")} |`);
  lines.push(`| ${headers.map(() => "---").join(" | ")} |`);
  for (const row of rows) {
    lines.push(`| ${row.map((cell) => String(cell ?? "")).join(" | ")} |`);
  }
  return lines.join("\n");
}

async function main() {
  const files = await collectCodeFiles();
  const fileSet = new Set(files);
  const textByFile = new Map();
  for (const rel of files) {
    const abs = path.join(repoRoot, rel);
    try {
      textByFile.set(rel, await fs.readFile(abs, "utf8"));
    } catch {
      textByFile.set(rel, "");
    }
  }

  const importMap = mapImports(files, textByFile);
  const edges = dedupeEdges(importMap.edges);
  const { indegree, outdegree } = computeDegree(files, edges);
  const adjacency = buildAdjacency(edges);

  const appText = textByFile.get("src/App.tsx") || "";
  const routes = parseRouteMap(appText, fileSet);
  const backendText = textByFile.get("server/index.cjs") || "";
  const backendEndpoints = parseBackendEndpoints(backendText);
  const frontendApiUsage = parseFrontendApiUsage(textByFile);

  const routeSeeds = [...new Set([...routes.flatMap((r) => r.entryFiles), "src/App.tsx", "src/main.tsx"])];
  const reachableFromRoutes = reachableFromSeeds(adjacency, routeSeeds);
  const runtimeCandidates = files.filter((f) => {
    const cat = categoryFor(f);
    return (
      cat === "page" ||
      cat === "component" ||
      cat === "service" ||
      cat === "context" ||
      cat === "engine" ||
      cat === "ui" ||
      cat === "hook" ||
      cat === "tutor-core" ||
      cat === "utility"
    );
  });
  const routeUnreachableRuntimeFiles = runtimeCandidates
    .filter((f) => !reachableFromRoutes.has(f))
    .sort();

  const potentialOrphans = files
    .filter((f) => (indegree.get(f) || 0) === 0 && (outdegree.get(f) || 0) === 0)
    .filter((f) => !f.endsWith(".json"))
    .filter((f) => !f.endsWith(".css"))
    .sort();

  const summary = {
    generatedAt: new Date().toISOString(),
    filesScanned: files.length,
    dependencyEdges: edges.length,
    unresolvedLocalImports: importMap.unresolvedLocalImports.length,
    externalImportRefs: importMap.externalImports.length,
    routes: routes.length,
    backendEndpoints: backendEndpoints.length,
    frontendApiConsumers: frontendApiUsage.length,
  };

  const domains = domainRows(fileSet, routes);

  const jsonReport = {
    summary,
    graph: {
      nodes: files.map((f) => ({
        file: f,
        category: categoryFor(f),
        indegree: indegree.get(f) || 0,
        outdegree: outdegree.get(f) || 0,
      })),
      edges: edges.map((e) => ({ from: e.from, to: e.to })),
      topInbound: topN(indegree, 20),
      topOutbound: topN(outdegree, 20),
      unresolvedLocalImports: importMap.unresolvedLocalImports
        .sort((a, b) => a.file.localeCompare(b.file) || a.specifier.localeCompare(b.specifier))
        .slice(0, 200),
      potentialOrphans: potentialOrphans.slice(0, 200),
      routeUnreachableRuntimeFiles: routeUnreachableRuntimeFiles.slice(0, 200),
    },
    runtime: {
      routes,
      backendEndpoints,
      frontendApiUsage,
    },
    domains,
  };

  const mermaidText = makeMermaidGraph({ routes, edges });

  const mdLines = [];
  mdLines.push("# Repo Functionality and Connectivity Audit");
  mdLines.push("");
  mdLines.push(`Generated: ${summary.generatedAt}`);
  mdLines.push("");
  mdLines.push("## Snapshot");
  mdLines.push("");
  mdLines.push(`- Files scanned (src/server/scripts/tools): ${summary.filesScanned}`);
  mdLines.push(`- Local dependency edges: ${summary.dependencyEdges}`);
  mdLines.push(`- Unresolved local imports: ${summary.unresolvedLocalImports}`);
  mdLines.push(`- Frontend routes in App shell: ${summary.routes}`);
  mdLines.push(`- Backend endpoint conditions discovered: ${summary.backendEndpoints}`);
  mdLines.push(`- Frontend files with explicit /api calls: ${summary.frontendApiConsumers}`);
  mdLines.push("");
  mdLines.push("## Project Understanding");
  mdLines.push("");
  mdLines.push(
    "LazyTopper is a CBSE-focused adaptive study platform with a React web app and a Node gateway. The frontend routes cover onboarding, dashboard, Topic Hub tutor journeys, practice/session playback, daily mix, weekly wrapped, and predictive/mock surfaces. The backend provides mentor generation, session APIs, tutor feedback intake, and health/meta utilities."
  );
  mdLines.push("");
  mdLines.push("## High-Level Functionality Areas");
  mdLines.push("");
  for (const domain of domains) {
    mdLines.push(`### ${domain.name}`);
    mdLines.push("");
    mdLines.push(`- ${domain.summary}`);
    mdLines.push(`- Routes: ${domain.routes.length ? domain.routes.join(", ") : "No direct route match in App.tsx"}`);
    mdLines.push(`- Key files (${domain.files.length}):`);
    for (const f of domain.files) mdLines.push(`  - \`${f}\``);
    mdLines.push("");
  }

  mdLines.push("## Route to Entry File Map");
  mdLines.push("");
  mdLines.push(
    formatMdTable(
      ["Route", "Auth Gate", "Entry Files"],
      routes.map((r) => [
        `\`${r.path}\``,
        r.requiresAuth ? "Yes" : "No",
        r.entryFiles.length ? r.entryFiles.map((f) => `\`${f}\``).join("<br>") : "N/A",
      ])
    )
  );
  mdLines.push("");

  mdLines.push("## Backend Endpoints");
  mdLines.push("");
  mdLines.push(
    formatMdTable(
      ["Method", "Path/Pattern", "Match", "Line"],
      backendEndpoints.map((ep) => [`\`${ep.method}\``, `\`${ep.path}\``, ep.match, ep.line])
    )
  );
  mdLines.push("");

  mdLines.push("## Frontend API Call Sites");
  mdLines.push("");
  mdLines.push(
    formatMdTable(
      ["File", "API Paths"],
      frontendApiUsage.map((row) => [
        `\`${row.file}\``,
        row.apiPaths.map((p) => `\`${p}\``).join("<br>"),
      ])
    )
  );
  mdLines.push("");

  mdLines.push("## Top Dependency Hubs");
  mdLines.push("");
  mdLines.push("### Top Inbound (most depended-on files)");
  mdLines.push("");
  mdLines.push(
    formatMdTable(
      ["File", "Inbound"],
      topN(indegree, 15).map((x) => [`\`${x.file}\``, x.value])
    )
  );
  mdLines.push("");
  mdLines.push("### Top Outbound (most dependencies)");
  mdLines.push("");
  mdLines.push(
    formatMdTable(
      ["File", "Outbound"],
      topN(outdegree, 15).map((x) => [`\`${x.file}\``, x.value])
    )
  );
  mdLines.push("");

  mdLines.push("## Audit Flags");
  mdLines.push("");
  mdLines.push(`- Unresolved local imports (first 20): ${Math.min(importMap.unresolvedLocalImports.length, 20)}`);
  for (const row of importMap.unresolvedLocalImports.slice(0, 20)) {
    mdLines.push(`  - \`${row.file}\` -> \`${row.specifier}\``);
  }
  mdLines.push("");
  mdLines.push(`- Runtime files not reachable from any App route seed (first 30): ${Math.min(routeUnreachableRuntimeFiles.length, 30)}`);
  for (const file of routeUnreachableRuntimeFiles.slice(0, 30)) {
    mdLines.push(`  - \`${file}\``);
  }
  mdLines.push("");

  mdLines.push("## End-to-End Journeys (Current Understanding)");
  mdLines.push("");
  mdLines.push("1. Sign-in and startup");
  mdLines.push("   - `src/pages/Login.tsx` calls auth flows from `src/context/AuthContext.tsx` with Firebase bootstrap in `src/services/firebaseClient.ts`.");
  mdLines.push("   - App shell and route gating are controlled in `src/App.tsx` and `src/components/auth/RequireAuth.tsx`.");
  mdLines.push("");
  mdLines.push("2. Topic Hub tutor journey");
  mdLines.push("   - `src/pages/TopicHub.tsx` + `src/components/tutor/TutorDrawerV2.tsx` drive learn/grind/mentor interactions.");
  mdLines.push("   - Mentor requests post to `/api/mentor` and fallback through `src/services/mentorServerGate.ts`.");
  mdLines.push("   - Backend handling is in `server/index.cjs` and `server/tutorOrchestrator.cjs`.");
  mdLines.push("");
  mdLines.push("3. Practice and active session");
  mdLines.push("   - `src/pages/PracticePage.tsx` and `src/pages/SessionPlayPage.tsx` orchestrate session lifecycle.");
  mdLines.push("   - Client-side APIs are in `src/services/sessionApi.ts` and `src/services/sessionService.ts`.");
  mdLines.push("   - Session endpoints are implemented by `server/sessionHandlers.cjs` over `server/sessionStore.cjs`.");
  mdLines.push("");
  mdLines.push("4. Daily mix and recap loops");
  mdLines.push("   - `src/pages/DailyMixPage.tsx` + `src/components/DailyMixWidget.tsx` use `src/services/dailyMixGenerator.ts`.");
  mdLines.push("   - `src/pages/WeeklyWrappedPage.tsx` + `src/components/WeeklyWrappedCarousel.tsx` use `src/services/weeklyWrappedGenerator.ts`.");
  mdLines.push("");
  mdLines.push("5. Predictive and exam surfaces");
  mdLines.push("   - `src/pages/TrendsPage.tsx`, `src/pages/PredictivePapers.tsx`, `src/pages/MockBuilder.tsx`, and `src/pages/HighlyProbableQuestions.tsx` use prediction datasets under `src/data/` and smart learning store logic under `src/engine/`.");
  mdLines.push("");

  mdLines.push("## Graph Artifact");
  mdLines.push("");
  mdLines.push("```mermaid");
  mdLines.push(mermaidText.trimEnd());
  mdLines.push("```");
  mdLines.push("");
  mdLines.push("## Generated Files");
  mdLines.push("");
  mdLines.push(`- \`docs/project_memory/audits/repo_connectivity_graph.json\``);
  mdLines.push(`- \`docs/project_memory/audits/repo_connectivity_graph.mmd\``);
  mdLines.push(`- \`docs/project_memory/audits/repo_connectivity_graph.md\``);
  mdLines.push(`- \`docs/project_memory/audits/repo_functionality_report.md\``);
  mdLines.push("");

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_JSON, JSON.stringify(jsonReport, null, 2), "utf8");
  await fs.writeFile(OUTPUT_MERMAID, mermaidText, "utf8");
  await fs.writeFile(
    OUTPUT_GRAPH_MD,
    `# Repo Connectivity Graph\n\nGenerated: ${summary.generatedAt}\n\n\`\`\`mermaid\n${mermaidText.trimEnd()}\n\`\`\`\n`,
    "utf8"
  );
  await fs.writeFile(OUTPUT_FUNCTIONAL_REPORT, mdLines.join("\n"), "utf8");

  console.log(
    `repo_deep_audit: files=${summary.filesScanned}, edges=${summary.dependencyEdges}, routes=${summary.routes}, endpoints=${summary.backendEndpoints}`
  );
  console.log(`json=${normalizeRel(path.relative(repoRoot, OUTPUT_JSON))}`);
  console.log(`report=${normalizeRel(path.relative(repoRoot, OUTPUT_FUNCTIONAL_REPORT))}`);
}

main().catch((err) => {
  console.error("repo_deep_audit failed");
  console.error(String(err?.stack || err));
  process.exit(1);
});
