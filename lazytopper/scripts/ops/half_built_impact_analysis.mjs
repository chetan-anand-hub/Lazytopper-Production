import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");
const input = resolve(repoRoot, ".project_memory/ops/out/dependency_risk_classification.json");
const out = resolve(repoRoot, ".project_memory/ops/out/half_built_impact_analysis.json");

const runtimeKeep = new Set([
  "server/telemetry.cjs",
  "server/tutorOrchestrator.cjs",
  "src/engine/bsre/evaluator.ts",
  "src/engine/bsre/types.ts",
  "src/prompts/grind/trianglesGrindContract.ts",
  "src/tutor/retrieval/trianglesRetriever.ts",
  "src/data/_finalGenerated/triangles.mentor.ts",
]);

function normalizePath(value) {
  return String(value || "").replaceAll("\\", "/");
}

function rgRefs(pattern) {
  const result = spawnSync("rg", ["-n", "--fixed-strings", pattern, "src", "server", "scripts"], {
    cwd: repoRoot,
    encoding: "utf8",
    shell: process.platform === "win32",
    maxBuffer: 1024 * 1024 * 20,
  });
  if (result.status !== 0 && result.status !== 1) {
    return [];
  }
  const lines = String(result.stdout || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => normalizePath(line));
  return lines;
}

function decide(row, refs) {
  const file = normalizePath(row.file);

  if (runtimeKeep.has(file)) {
    return {
      decision: "keep_runtime_critical",
      reason: "Referenced by runtime server contracts or essential tutor/grind loaders.",
      action: "keep and exclude from deletion batches",
      priority: "P0",
    };
  }

  if (row.classification === "half_built_chain") {
    return {
      decision: "reconnect_or_retire",
      reason: "Half-built chain: imported in a disconnected branch; requires product-level integration choice.",
      action: "trace caller chain, either wire into runtime flow or delete with regression proof",
      priority: "P1",
    };
  }

  if (row.importer_count === 0 && row.dependency_count === 0 && row.confidence === "high") {
    return {
      decision: "safe_delete_candidate",
      reason: "No importers, no dependencies, high confidence orphan.",
      action: "delete with per-file dry-run + regression checks",
      priority: "P1",
    };
  }

  if (refs.some((line) => line.includes("server/index.cjs") || line.includes("src/App.tsx") || line.includes("src/main.tsx"))) {
    return {
      decision: "keep_pending_runtime_review",
      reason: "Referenced by runtime entry or router-level file; requires manual verification.",
      action: "do not delete until runtime chain is proven dead",
      priority: "P0",
    };
  }

  if (row.dependency_count > 0) {
    return {
      decision: "architecture_review",
      reason: "Orphan root with internal dependency subtree; likely abandoned feature branch.",
      action: "group-delete or reconnect as a unit, not file-by-file",
      priority: "P2",
    };
  }

  return {
    decision: "manual_review",
    reason: "Insufficient certainty for automated action.",
    action: "manual dependency trace before changes",
    priority: "P2",
  };
}

function main() {
  if (!existsSync(input)) {
    throw new Error(`Missing input report: ${input}`);
  }

  const report = JSON.parse(readFileSync(input, "utf8"));
  const candidates = report.classifications.filter(
    (row) => row.classification === "half_built_chain" || row.classification === "orphan_candidate"
  );

  const analysed = candidates.map((row) => {
    const refs = rgRefs(row.file).filter((line) => !line.includes("half_built_impact_analysis.mjs"));
    const decision = decide(row, refs);
    return {
      file: row.file,
      classification: row.classification,
      importer_count: row.importer_count,
      dependency_count: row.dependency_count,
      confidence: row.confidence,
      reachable_from_main: row.reachable_from_main,
      refs_count: refs.length,
      ref_samples: refs.slice(0, 6),
      ...decision,
    };
  });

  const summary = {
    total: analysed.length,
    keep_runtime_critical: analysed.filter((r) => r.decision === "keep_runtime_critical").length,
    reconnect_or_retire: analysed.filter((r) => r.decision === "reconnect_or_retire").length,
    safe_delete_candidate: analysed.filter((r) => r.decision === "safe_delete_candidate").length,
    keep_pending_runtime_review: analysed.filter((r) => r.decision === "keep_pending_runtime_review").length,
    architecture_review: analysed.filter((r) => r.decision === "architecture_review").length,
    manual_review: analysed.filter((r) => r.decision === "manual_review").length,
  };

  const outData = {
    generatedAt: new Date().toISOString(),
    summary,
    analysed,
  };

  writeFileSync(out, JSON.stringify(outData, null, 2));
  console.log(`half_built_impact_analysis written to ${out}`);
  console.log(summary);
}

main();
