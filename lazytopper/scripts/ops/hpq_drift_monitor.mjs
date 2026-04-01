import { build } from "esbuild";
import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const bundlePath = path.join(outDir, "hpq_drift_monitor.bundle.mjs");
const entryPath = path.join(__dirname, "hpq_drift_monitor.entry.ts");

async function run() {
  await fs.mkdir(outDir, { recursive: true });
  await build({
    entryPoints: [entryPath],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    outfile: bundlePath,
    sourcemap: false,
  });

  const mod = await import(`${pathToFileURL(bundlePath).href}?t=${Date.now()}`);
  if (typeof mod.runDriftMonitor !== "function") {
    throw new Error("runDriftMonitor export missing.");
  }

  const report = await mod.runDriftMonitor();
  console.log(
    `HPQ drift monitor complete. total=${report.summary.total} changed=${report.summary.changed} stale=${report.summary.staleTopics} fetchErrors=${report.summary.fetchErrors} missingBaseline=${report.summary.missingBaseline}`
  );
}

run().catch((error) => {
  console.error("HPQ drift monitor errored.");
  console.error(String(error?.stack || error));
  process.exitCode = 1;
});

