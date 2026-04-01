import { build } from "esbuild";
import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const bundlePath = path.join(outDir, "hpq_phase2_acceptance.bundle.mjs");
const entryPath = path.join(__dirname, "hpq_phase2_acceptance.entry.ts");

async function run() {
  await fs.mkdir(outDir, { recursive: true });
  console.log("hpq_phase2: bundling acceptance module...");
  await build({
    entryPoints: [entryPath],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    outfile: bundlePath,
    sourcemap: false,
  });
  console.log("hpq_phase2: bundle ready, executing checks...");

  const mod = await import(`${pathToFileURL(bundlePath).href}?t=${Date.now()}`);
  if (typeof mod.runAcceptance !== "function") {
    throw new Error("runAcceptance export not found in bundled acceptance module.");
  }

  const report = await mod.runAcceptance();
  const failedChecks = (report.checks || []).filter((check) => !check.ok);

  if (failedChecks.length > 0) {
    console.error(
      `HPQ phase-2 acceptance FAILED (${report.summary.failed}/${report.summary.total}).`
    );
    for (const failed of failedChecks) {
      console.error(`- ${failed.name}: ${failed.details}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `HPQ phase-2 acceptance PASSED (${report.summary.passed}/${report.summary.total}).`
  );
}

run().catch((error) => {
  console.error("HPQ phase-2 acceptance errored.");
  console.error(String(error?.stack || error));
  process.exitCode = 1;
});
