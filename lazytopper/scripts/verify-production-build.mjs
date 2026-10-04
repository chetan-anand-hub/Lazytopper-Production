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

    // 4. The question bank made it into the BUILD — searched across every emitted
    //    chunk, not just the main one.
    //
    // ⚠ THIS USED TO READ ONLY `index-*.js`, AND THAT ASSUMPTION WAS THE DEFECT IT
    // OUTLIVED. Until PERF-1 the whole 7.87 MiB bank sat in the main chunk, because
    // `main.tsx` invoked a dev-only duplicate-id check at module scope; every real
    // consumer was already code-split behind lazy(). Making the bank lazy moved it into
    // the chunks that actually use it — the intended outcome — and this check went red
    // while the build was CORRECT. A guard that can only pass while the bug is present
    // is a guard that votes for the bug.
    //
    // The INTENT is unchanged and still worth guarding: catch a build that shipped an
    // empty or broken question bank. That question is "is the bank in the output", not
    // "is the bank in one particular file", so the search now spans every chunk and is
    // indifferent to how rollup happens to split them.
    const jsChunks = entries.filter((f) => f.endsWith(".js"));
    const chunksWithBank = jsChunks.filter((f) =>
      fs.readFileSync(path.join(DIST_ASSETS, f), "utf8").includes("solutionSteps")
    );
    check(
      `question bank is bundled (solutionSteps in ${chunksWithBank.length} of ${jsChunks.length} chunks)`,
      chunksWithBank.length > 0,
      chunksWithBank.length === 0 ? "— no emitted chunk carries question data" : ""
    );
  }

  // 5. SEO-5 PR-2 — pins (a) + (d) on the BUILT pages: every advertised path (the committed
  //    manifest's `paths`, which applyPrerendered holds equal to the sitemap set) has a filled
  //    mobile file AND a filled `__desktop/` variant, and every <link rel="modulepreload">
  //    names a chunk this build emitted. The same rules run inside the build itself
  //    (applyPrerendered `verifyBuiltPages`, line PRERENDER_DEVICE_VERIFY) — this re-reads
  //    the output independently, for a local run of this verifier.
  const DIST_ROOT = path.dirname(DIST_ASSETS);
  const manifestFile = path.resolve(LAZYTOPPER_ROOT, "prerendered", "manifest.json");
  if (fs.existsSync(manifestFile)) {
    const paths = JSON.parse(fs.readFileSync(manifestFile, "utf8")).paths ?? [];
    let files = 0;
    let links = 0;
    const problems = [];
    for (const page of paths) {
      const stem = page === "/" ? "index" : page.slice(1);
      const targets = page === "/" ? ["index.html"] : [`${stem}.html`, path.join(stem, "index.html")];
      for (const target of [...targets, `__desktop/${stem}.html`]) {
        const file = path.join(DIST_ROOT, target);
        if (!fs.existsSync(file)) {
          problems.push(`${target} missing`);
          continue;
        }
        const html = fs.readFileSync(file, "utf8");
        if (html.includes('<div id="root"></div>')) problems.push(`${target} has an empty body`);
        for (const tag of html.match(/<link\b[^>]*\brel="modulepreload"[^>]*>/g) ?? []) {
          const href = (tag.match(/\bhref="([^"]+)"/) ?? [])[1] ?? "";
          links += 1;
          if (!fs.existsSync(path.join(DIST_ROOT, href.replace(/^\/(?:[^/]*\/)?assets\//, "assets/")))) {
            problems.push(`${target} preloads ${href}, which was not emitted`);
          }
        }
        files += 1;
      }
    }
    check(
      `prerendered device variants + modulepreloads (pins a+d): pages=${paths.length} files=${files} modulepreload_links=${links} problems=${problems.length}`,
      paths.length > 0 && problems.length === 0,
      problems.slice(0, 5).join("; ")
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
