/**
 * verify-production-build.mjs
 *
 * Sanity-check for the LazyTopper production dist before publishing.
 * Run after every production build:
 *   node scripts/verify-production-build.mjs
 *
 * Exit code 0 = safe to deploy. Exit code 1 = do NOT deploy.
 *
 * Checks:
 *  1. dist/index.html exists
 *  2. dist is FRESH — newest file in lazytopper/src/** must be OLDER than newest dist asset
 *     (proves the production build actually ran after the last source change)
 *  3. Main JS bundle (index-*.js) exists
 *  4. CSS bundle exists
 *  5. KaTeX fonts present (proves asset bundling worked)
 *  6. CBSE-deleted topic content is ABSENT from the bundle
 *  7. Minimum expected JS chunk count (proves tree-shaking didn't collapse everything)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "../artifacts/lazytopper-app/dist/public/app");
const ASSETS = path.join(DIST, "assets");
const SRC_DIR = path.join(__dirname, "../lazytopper/src");

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

/** Walk a directory recursively and return the max mtime in milliseconds. */
function newestMtime(dir) {
  let max = 0;
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        const mt = fs.statSync(full).mtimeMs;
        if (mt > max) max = mt;
      }
    }
  }
  walk(dir);
  return max;
}

console.log("\n🔍  Verifying production build …\n");

// 1. index.html exists
check("index.html exists", () => fs.existsSync(path.join(DIST, "index.html")));

// 2. Freshness: newest src file must be OLDER than newest dist asset
//    If dist is older than src, the build is stale.
check("Dist is fresh (built after latest source change)", () => {
  const newestSrc = newestMtime(SRC_DIR);
  const newestDist = newestMtime(ASSETS);
  const isStale = newestDist < newestSrc;
  if (isStale) {
    const srcDate = new Date(newestSrc).toISOString();
    const distDate = new Date(newestDist).toISOString();
    console.error(
      `\n  ⚠️  DIST IS STALE — run NODE_ENV=production pnpm run build before publishing\n` +
      `      Newest src : ${srcDate}\n` +
      `      Newest dist: ${distDate}\n`
    );
    return false;
  }
  return true;
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

// 6. CBSE-deleted topic content checks — these must be ABSENT from the bundle
const DELETED_TOPICS = [
  { pattern: "Euclid Division Lemma", label: "Euclid Division Lemma" },
  { pattern: "euclid-division", label: "euclid-division concept note id" },
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
