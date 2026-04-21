/**
 * verify-production-build.mjs
 *
 * Verifies that the production Vite bundle is:
 *  1. Present (dist directory exists)
 *  2. Fresh (built within the last 4 hours)
 *  3. Contains solutionSteps data (question bank content was bundled)
 *
 * Exits 0 on success, 1 on failure.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LAZYTOPPER_ROOT = path.resolve(__dirname, "..");
const DIST_ASSETS = path.resolve(
  LAZYTOPPER_ROOT,
  "..",
  "artifacts",
  "lazytopper-app",
  "dist",
  "public",
  "app",
  "assets"
);

let ok = true;

function check(label, pass, detail = "") {
  const icon = pass ? "✓" : "✗";
  console.log(`${icon} ${label}${detail ? "  " + detail : ""}`);
  if (!pass) ok = false;
}

// 1. Dist assets directory exists
check("dist/assets directory exists", fs.existsSync(DIST_ASSETS), DIST_ASSETS);

if (fs.existsSync(DIST_ASSETS)) {
  const entries = fs.readdirSync(DIST_ASSETS);

  // 2. Main bundle (index-*.js) exists
  const mainBundle = entries.find((f) => f.startsWith("index-") && f.endsWith(".js"));
  check("main bundle (index-*.js) present", !!mainBundle, mainBundle ?? "(not found)");

  if (mainBundle) {
    const bundlePath = path.join(DIST_ASSETS, mainBundle);
    const stat = fs.statSync(bundlePath);
    const ageMs = Date.now() - stat.mtimeMs;
    const ageMins = Math.round(ageMs / 60000);
    const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours

    // 3. Bundle is fresh
    check(
      `bundle is fresh (age: ${ageMins} min, threshold: 240 min)`,
      ageMs < STALE_THRESHOLD_MS,
      ageMs >= STALE_THRESHOLD_MS ? "— run `npm run build` to refresh" : ""
    );

    // 4. Bundle contains solutionSteps (key indicator that question bank data is bundled)
    const content = fs.readFileSync(bundlePath, "utf8");
    check(
      "bundle contains solutionSteps (question bank filled)",
      content.includes("solutionSteps")
    );
  }
}

if (ok) {
  console.log("\nAll checks passed. Production build is valid.");
  process.exit(0);
} else {
  console.error("\nOne or more checks failed.");
  process.exit(1);
}
