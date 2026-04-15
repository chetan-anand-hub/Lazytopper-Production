/**
 * verify-production-build.mjs
 *
 * Quick sanity-check script for the LazyTopper production dist.
 * Run after every production build:
 *   node scripts/verify-production-build.mjs
 *
 * Checks:
 *  1. index.html exists and is fresh (< 2 hrs old)
 *  2. index-*.js bundle exists (main question-bank bundle)
 *  3. No CBSE-deleted topic content leaks through into the build
 *  4. Minimum expected assets present (fonts, CSS, JS chunks)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "../artifacts/lazytopper-app/dist/public/app");
const ASSETS = path.join(DIST, "assets");

let passed = 0;
let failed = 0;

function check(label, fn) {
  try {
    const result = fn();
    if (result !== false) {
      console.log(`  ✅  ${label}`);
      passed++;
    } else {
      console.error(`  ❌  ${label}`);
      failed++;
    }
  } catch (err) {
    console.error(`  ❌  ${label} — ${err.message}`);
    failed++;
  }
}

console.log("\n🔍  Verifying production build …\n");

// 1. index.html exists
check("index.html exists", () => fs.existsSync(path.join(DIST, "index.html")));

// 2. index.html is fresh (< 2 hours old)
check("index.html freshness (< 2 hrs)", () => {
  const stat = fs.statSync(path.join(DIST, "index.html"));
  const ageMs = Date.now() - stat.mtimeMs;
  return ageMs < 2 * 60 * 60 * 1000;
});

// 3. Main JS bundle exists
check("Main JS bundle (index-*.js) exists", () => {
  const files = fs.readdirSync(ASSETS).filter((f) => f.startsWith("index-") && f.endsWith(".js"));
  return files.length >= 1;
});

// 4. CSS bundle exists
check("CSS bundle exists", () => {
  const files = fs.readdirSync(ASSETS).filter((f) => f.endsWith(".css"));
  return files.length >= 1;
});

// 5. KaTeX fonts present (proves assets were bundled)
check("KaTeX fonts present", () => {
  const files = fs.readdirSync(ASSETS).filter((f) => f.includes("KaTeX"));
  return files.length >= 5;
});

// 6. CBSE-deleted content checks — these must be ABSENT from the bundle
const DELETED_TOPICS = [
  // Euclid's Division Lemma (deleted from CBSE 2025-26 Maths syllabus)
  { pattern: "Euclid Division Lemma", label: "Euclid Division Lemma" },
  { pattern: "euclid-division", label: "euclid-division concept note" },
];

const mainBundles = fs
  .readdirSync(ASSETS)
  .filter((f) => f.startsWith("index-") && f.endsWith(".js"))
  .map((f) => path.join(ASSETS, f));

for (const { pattern, label } of DELETED_TOPICS) {
  check(`ABSENT from build: "${label}"`, () => {
    for (const bundle of mainBundles) {
      const content = fs.readFileSync(bundle, "utf8");
      if (content.includes(pattern)) return false;
    }
    return true;
  });
}

// 7. Minimum chunk count (proves tree-shaking didn't collapse everything)
check("Minimum 15 JS chunk files", () => {
  const jsFiles = fs.readdirSync(ASSETS).filter((f) => f.endsWith(".js"));
  return jsFiles.length >= 15;
});

// Summary
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  console.error("❌  Build verification FAILED — do not deploy.\n");
  process.exit(1);
} else {
  console.log("✅  Build verification PASSED — safe to deploy.\n");
  process.exit(0);
}
