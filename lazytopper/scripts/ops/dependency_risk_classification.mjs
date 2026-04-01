import { promises as fs } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "dependency_risk_classification.json");
const RUNTIME_EDGE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

function runMadgeGraph() {
  const res = spawnSync(
    "npx",
    ["madge", "--extensions", "ts,tsx,js,mjs,cjs", "--json", "src", "server", "scripts"],
    {
      cwd: repoRoot,
      env: { ...process.env },
      shell: process.platform === "win32",
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 30,
    }
  );
  if (res.error) {
    throw new Error(`madge spawn failed: ${String(res.error.message || res.error)}`);
  }
  if ((res.status ?? 1) !== 0) {
    throw new Error(`madge failed: ${res.stderr || res.stdout || "unknown error"}`);
  }
  return JSON.parse(String(res.stdout || "{}"));
}

function normalizePath(input) {
  return String(input || "")
    .replaceAll("\\", "/")
    .replace(/^\.\/+/, "")
    .replace(/\/{2,}/g, "/")
    .trim();
}

function normalizeGraph(rawGraph) {
  const merged = new Map();
  const ensureNode = (name) => {
    if (!merged.has(name)) merged.set(name, new Set());
  };

  for (const [rawNode, rawDeps] of Object.entries(rawGraph || {})) {
    const node = normalizePath(rawNode);
    if (!node) continue;
    ensureNode(node);

    const deps = Array.isArray(rawDeps) ? rawDeps : [];
    for (const rawDep of deps) {
      const dep = normalizePath(rawDep);
      if (!dep) continue;
      ensureNode(dep);
      merged.get(node).add(dep);
    }
  }

  const normalized = {};
  for (const [node, depSet] of [...merged.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    normalized[node] = [...depSet].sort();
  }
  return normalized;
}

function upsertEdge(graph, fromRaw, toRaw) {
  const from = normalizePath(fromRaw);
  const to = normalizePath(toRaw);
  if (!from || !to) return;
  if (!graph[from]) graph[from] = [];
  if (!graph[to]) graph[to] = [];
  if (!graph[from].includes(to)) graph[from].push(to);
}

async function extractSupplementalServerRuntimeEdges() {
  const serverEntryPath = path.join(repoRoot, "server", "index.cjs");
  const from = "server/index.cjs";

  let source = "";
  try {
    source = await fs.readFile(serverEntryPath, "utf8");
  } catch {
    return {
      from,
      targets: [],
      patterns: { directRequire: 0, pathJoin: 0 },
    };
  }

  const relMatches = new Set();
  let directRequire = 0;
  let pathJoin = 0;
  const directRequireRe = /require\(\s*['"](\.\.\/src\/[^'"]+)['"]\s*\)/g;
  const pathJoinRe = /path\.join\(\s*__dirname\s*,\s*['"](\.\.\/src\/[^'"]+)['"]\s*\)/g;

  let m;
  while ((m = directRequireRe.exec(source))) {
    relMatches.add(m[1]);
    directRequire += 1;
  }
  while ((m = pathJoinRe.exec(source))) {
    relMatches.add(m[1]);
    pathJoin += 1;
  }

  const targets = [];
  for (const relRef of relMatches) {
    const abs = path.resolve(path.dirname(serverEntryPath), relRef);
    const rel = normalizePath(path.relative(repoRoot, abs));
    if (!rel.startsWith("src/")) continue;
    if (!RUNTIME_EDGE_EXTENSIONS.has(path.extname(rel))) continue;
    targets.push(rel);
  }

  return {
    from,
    targets: [...new Set(targets)].sort(),
    patterns: {
      directRequire,
      pathJoin,
    },
  };
}

function dfs(graph, start) {
  const seen = new Set();
  const stack = [normalizePath(start)];
  while (stack.length) {
    const node = stack.pop();
    if (!node || seen.has(node) || !graph[node]) continue;
    seen.add(node);
    for (const dep of graph[node] || []) stack.push(dep);
  }
  return seen;
}

function classifyImports(importers) {
  if (!importers.length) return "none";
  const roots = new Set(importers.map((i) => i.split("/")[0]));
  if (roots.size === 1 && roots.has("src")) return "src_only";
  if (roots.size === 1 && roots.has("server")) return "server_only";
  if (roots.size === 1 && roots.has("scripts")) return "scripts_only";
  return "mixed";
}

function rankByRisk(kind) {
  const rank = {
    runtime_critical: 0,
    server_critical: 1,
    tooling_only: 2,
    test_only: 3,
    half_built_chain: 4,
    orphan_candidate: 5,
  };
  return rank[kind] ?? 9;
}

async function run() {
  const madgeGraph = runMadgeGraph();
  let graph = normalizeGraph(madgeGraph);
  const supplementalRuntime = await extractSupplementalServerRuntimeEdges();

  for (const target of supplementalRuntime.targets) {
    upsertEdge(graph, supplementalRuntime.from, target);
  }
  graph = normalizeGraph(graph);

  const files = Object.keys(graph).sort();
  const reverse = Object.fromEntries(files.map((f) => [f, []]));
  for (const [from, deps] of Object.entries(graph)) {
    for (const dep of deps || []) {
      if (reverse[dep]) reverse[dep].push(from);
    }
  }

  const reachableMain = dfs(graph, "src/main.tsx");
  const reachableServer = dfs(graph, "server/index.cjs");

  const classified = [];
  for (const file of files) {
    const importers = reverse[file] || [];
    const deps = graph[file] || [];
    const importClass = classifyImports(importers);
    const isReachMain = reachableMain.has(file);
    const isReachServer = reachableServer.has(file);

    let classification = "orphan_candidate";
    let confidence = "medium";
    let rationale = "";

    if (file === "src/main.tsx" || isReachMain) {
      classification = "runtime_critical";
      confidence = "high";
      rationale = "Reachable from src/main.tsx runtime entry.";
    } else if (file === "server/index.cjs" || isReachServer || importClass === "server_only") {
      classification = "server_critical";
      confidence = "high";
      rationale = "Reachable from server runtime entry.";
    } else if (file.startsWith("scripts/")) {
      const isTestScript = /scripts\/ops\/|scripts\/smoke\//.test(file);
      classification = isTestScript ? "test_only" : "tooling_only";
      confidence = "high";
      rationale = isTestScript
        ? "Script appears in acceptance/smoke tooling lane."
        : "Script appears in tooling lane.";
    } else if (importClass === "scripts_only") {
      const onlyTestImporters = importers.every((i) => /scripts\/ops\/|scripts\/smoke\//.test(i));
      classification = onlyTestImporters ? "test_only" : "tooling_only";
      confidence = "high";
      rationale = onlyTestImporters
        ? "Only imported by acceptance/smoke scripts."
        : "Only imported by tooling scripts.";
    } else if (file.startsWith("src/") && importClass === "src_only") {
      classification = "half_built_chain";
      confidence = deps.length > 0 || importers.length > 0 ? "high" : "medium";
      rationale = "Referenced only inside src chain but not reachable from app entry.";
    } else if (file.startsWith("src/") && importClass === "none") {
      classification = "orphan_candidate";
      confidence = deps.length === 0 ? "high" : "medium";
      rationale =
        deps.length === 0
          ? "No importers and no dependencies; likely stale."
          : "No importers; isolated chain root not wired to runtime.";
    }

    classified.push({
      file,
      classification,
      confidence,
      importers: importers.sort(),
      importer_count: importers.length,
      dependency_count: deps.length,
      import_class: importClass,
      reachable_from_main: isReachMain,
      reachable_from_server: isReachServer,
      rationale,
    });
  }

  classified.sort((a, b) => {
    const byRisk = rankByRisk(a.classification) - rankByRisk(b.classification);
    if (byRisk !== 0) return byRisk;
    return a.file.localeCompare(b.file);
  });

  const summary = classified.reduce(
    (acc, row) => {
      acc[row.classification] = (acc[row.classification] || 0) + 1;
      return acc;
    },
    {
      runtime_critical: 0,
      server_critical: 0,
      tooling_only: 0,
      test_only: 0,
      half_built_chain: 0,
      orphan_candidate: 0,
    }
  );

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      total_files: files.length,
      ...summary,
    },
    graph_stats: {
      nodes: files.length,
      edges: Object.values(graph).reduce((acc, deps) => acc + (deps?.length || 0), 0),
      reachable_from_main: reachableMain.size,
      reachable_from_server: reachableServer.size,
    },
    supplemental_runtime_edges: {
      from: supplementalRuntime.from,
      count: supplementalRuntime.targets.length,
      targets: supplementalRuntime.targets,
      patterns: supplementalRuntime.patterns,
    },
    classifications: classified,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  console.log(
    `dependency_risk_classification: runtime=${summary.runtime_critical}, server=${summary.server_critical}, tooling=${summary.tooling_only}, test=${summary.test_only}, half_built=${summary.half_built_chain}, orphan=${summary.orphan_candidate}`
  );
  console.log(`report=${path.relative(repoRoot, outPath).replaceAll("\\", "/")}`);
}

run().catch(async (err) => {
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        error: String(err?.stack || err),
      },
      null,
      2
    ),
    "utf8"
  );
  console.error("dependency_risk_classification errored.");
  console.error(String(err?.stack || err));
  process.exitCode = 1;
});
