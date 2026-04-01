import { promises as fs } from "node:fs";
import path from "node:path";
import { runPredictionDriftMonitor } from "../../src/prediction/driftMonitor";

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "hpq_drift_monitor.json");

export async function runDriftMonitor() {
  const report = await runPredictionDriftMonitor();
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  return report;
}
