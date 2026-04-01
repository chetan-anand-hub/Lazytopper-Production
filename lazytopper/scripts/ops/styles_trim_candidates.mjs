import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const graphPath = path.join(
  repoRoot,
  ".project_memory",
  "ops",
  "out",
  "styles_connectivity_graph.json"
);
const outPath = path.join(
  repoRoot,
  ".project_memory",
  "ops",
  "out",
  "styles_trim_candidates.json"
);
const includeUnresolved = process.argv.includes("--include-unresolved");

function mergeRanges(ranges) {
  const sorted = [...ranges].sort((a, b) => a.start_line - b.start_line);
  const merged = [];
  for (const curr of sorted) {
    const last = merged[merged.length - 1];
    if (!last || curr.start_line > last.end_line + 1) {
      merged.push({
        start_line: curr.start_line,
        end_line: curr.end_line,
        reasons: [curr.reason],
        selectors: [curr.selector].filter(Boolean),
      });
      continue;
    }
    last.end_line = Math.max(last.end_line, curr.end_line);
    if (!last.reasons.includes(curr.reason)) last.reasons.push(curr.reason);
    if (curr.selector && !last.selectors.includes(curr.selector)) last.selectors.push(curr.selector);
  }
  return merged;
}

function countLines(ranges) {
  return ranges.reduce((acc, r) => acc + (r.end_line - r.start_line + 1), 0);
}

const graph = JSON.parse(await fs.readFile(graphPath, "utf8"));

const rawCandidates = [];

for (const c of graph.candidates_safe_remove || []) {
  if (includeUnresolved && c.reason === "unresolved_no_usage" && c.confidence === "high") {
    rawCandidates.push({
      start_line: c.start_line,
      end_line: c.end_line,
      reason: "unresolved_no_usage",
      selector: c.selector,
    });
  }
}

for (const d of graph.duplicate_selector_blocks_identical || []) {
  const entries = [...(d.entries || [])].sort((a, b) => a.start_line - b.start_line);
  if (entries.length < 2) continue;
  const keep = entries[entries.length - 1];
  for (const e of entries) {
    if (e.start_line === keep.start_line && e.end_line === keep.end_line) continue;
    rawCandidates.push({
      start_line: e.start_line,
      end_line: e.end_line,
      reason: "duplicate_identical_keep_latest",
      selector: d.selector,
    });
  }
}

const dedup = new Map();
for (const c of rawCandidates) {
  const key = `${c.start_line}:${c.end_line}:${c.reason}`;
  if (!dedup.has(key)) dedup.set(key, c);
}

const merged = mergeRanges([...dedup.values()]);
const report = {
  generated_at: new Date().toISOString(),
  source_report: path.relative(repoRoot, graphPath).replaceAll("\\", "/"),
  include_unresolved: includeUnresolved,
  total_ranges: merged.length,
  total_lines: countLines(merged),
  ranges: merged,
};

await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

console.log(
  `styles_trim_candidates: ranges=${report.total_ranges}, lines=${report.total_lines}, output=${path
    .relative(repoRoot, outPath)
    .replaceAll("\\", "/")}`
);
