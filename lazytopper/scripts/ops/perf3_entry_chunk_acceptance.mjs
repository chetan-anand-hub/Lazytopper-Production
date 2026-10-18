#!/usr/bin/env node
/**
 * PERF-3 — `firebase/firestore` STAYS OUT OF EVERYTHING A PAGE LOADS EAGERLY. A build-output guard.
 *
 *   tsx scripts/ops/perf3_entry_chunk_acceptance.mjs            markers (+ the size budget in CI)
 *   tsx scripts/ops/perf3_entry_chunk_acceptance.mjs --budget   force the size budget (local)
 *   tsx scripts/ops/perf3_entry_chunk_acceptance.mjs --mutate   prove the guard can go RED
 *   (optional) --dist=<dir> | --out=<dir>                        check another build output
 *
 * Runs as the LAST step of `pnpm run build`; it reads what the build emitted — a test proves the
 * code works; a chunk proves it ships. Run under `tsx`: it reads `build.outDir` from
 * vite.config.ts exactly as writeStaticHeads / applyPrerendered do.
 *
 * WHAT IT CHECKS
 *   1. MARKERS (every build, deploy builds included — cheap, and a correct fail-closed): no
 *      Firestore-SDK marker below is in the EAGER SET = the entry chunk (the module script
 *      `index.html` loads, never guessed from a file-name prefix) + every chunk it imports
 *      STATICALLY (transitively) + every `<link rel="modulepreload">` in `index.html` AND every
 *      prerendered page (and their static closures). A dynamic `import()` is not eager and is
 *      not followed.
 *   2. VACUITY CONTROL: every marker IS in some emitted chunk. If the SDK stopped containing a
 *      marker, check 1 would pass for any build — a missing marker is RED, not silently green.
 *   3. SIZE BUDGET (CI only — GitHub Actions, or `--budget`): the entry's gzip size ≤ the size
 *      PERF-3 measured + 10%. Deliberately NOT enforced in deploy builds (Vercel, the Railway
 *      image): two PRs that are green apart could cross it together, and that must block a PR,
 *      never an unrelated backend hotfix (review of #1255, SHOULD-FIX 1).
 *   4. SELF-TEST (every run): fixture builds prove the closure + modulepreload detection fires,
 *      and that a dynamic-only reference stays green. A matcher nobody proved can fire is not a
 *      guard.
 *
 * WHY THESE MARKERS. Names such as "@firebase/firestore" or "initializeFirestore" stay in the
 * entry legitimately (firebase/app's component-name table; the facade's `fs.initializeFirestore`
 * property access). These two strings exist only inside the Firestore SDK's own code (measured
 * 2026-10-18 at c8970cfc: entry before PERF-3 1 / 2 hits, after 0 / 0; lazy SDK chunk 1 / 2).
 *
 * --mutate puts a static `import "firebase/firestore"` back into services/firebaseClient.ts,
 * builds into a temp dir, expects RED, and restores the file in all cases.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LAZYTOPPER = path.resolve(__dirname, "..", "..");

/** Strings found only in the Firestore SDK's code (see header). */
export const FIRESTORE_MARKERS = ["firestore.googleapis.com", "webchannel"];

/** Whole-file gzip (zlib default level) of the EMITTED entry file, measured by PERF-3
 *  (`pnpm run build`, 2026-10-18, after the review round: +97 B for the chunk-URL retry).
 *  Before PERF-3 the same measure read 414195. Re-measure and update when the entry
 *  legitimately changes. */
export const MEASURED_ENTRY_GZ = 248296;
export const ENTRY_GZ_BUDGET = Math.floor(MEASURED_ENTRY_GZ * 1.1);

/** Resolve the build output the way the sibling build scripts do (applyPrerendered.resolveOutDir). */
async function resolveDist(argv) {
  const override = argv.find((a) => a.startsWith("--dist=") || a.startsWith("--out="));
  if (override) return path.resolve(override.slice(override.indexOf("=") + 1));
  // `vite build` sets NODE_ENV=production inside its own process and vite.config.ts branches
  // build.outDir on it; this is a separate process in the build chain (see writeStaticHeads).
  process.env.NODE_ENV = process.env.NODE_ENV || "production";
  const viteConfig = (await import("../../vite.config.ts")).default;
  const outDir = viteConfig?.build?.outDir;
  if (typeof outDir !== "string" || outDir.length === 0) {
    throw new Error("perf3_entry_chunk_acceptance: vite.config.ts declares no build.outDir");
  }
  return path.resolve(LAZYTOPPER, outDir);
}

export function entryChunkOf(dist) {
  const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
  const m = html.match(/<script\b[^>]*\btype="module"[^>]*\bsrc="\/?(assets\/[^"]+\.js)"/);
  if (!m) throw new Error(`no module entry <script> in ${path.join(dist, "index.html")}`);
  return m[1];
}

/** Every `<link rel="modulepreload">` in EVERY built HTML file (index.html, the prerendered
 *  public pages and their __desktop variants): a route chunk a public page preloads is fetched
 *  on that page, so it is as eager as the entry for the visitor who lands there. */
export function modulepreloadsOf(dist) {
  const htmlFiles = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== "assets") walk(p); }
      else if (e.name.endsWith(".html")) htmlFiles.push(p);
    }
  };
  walk(dist);
  const out = new Set();
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");
    for (const tag of html.match(/<link\b[^>]*\brel="modulepreload"[^>]*>/g) ?? []) {
      const href = /\bhref="\/?(assets\/[^"]+\.js)"/.exec(tag);
      if (href) out.add(href[1]);
    }
  }
  return [...out];
}

/** The chunks a built chunk imports STATICALLY (`import … from "./x.js"`, `import "./x.js"`,
 *  `export … from "./x.js"`). A dynamic `import("./x.js")` is not matched. */
export function staticImportsOf(src) {
  const found = new Set();
  const patterns = [
    /(?:^|[;\s}])import\s*(?:[\w$*{}\s,]+?\s*from\s*)?["'](\.\/[^"']+\.js)["']/g,
    /(?:^|[;\s}])export\s*(?:\*|\{[^}]*\})\s*from\s*["'](\.\/[^"']+\.js)["']/g,
  ];
  for (const re of patterns) for (const m of src.matchAll(re)) found.add(m[1].slice(2));
  return [...found];
}

/** Entry + its static closure + modulepreloads + theirs, as `assets/...` paths. */
export function eagerSetOf(dist) {
  const entryRel = entryChunkOf(dist);
  const seen = new Set();
  const queue = [entryRel, ...modulepreloadsOf(dist)];
  while (queue.length) {
    const rel = queue.shift();
    if (seen.has(rel)) continue;
    const file = path.join(dist, rel);
    if (!fs.existsSync(file)) continue;
    seen.add(rel);
    const src = fs.readFileSync(file, "utf8");
    for (const dep of staticImportsOf(src)) queue.push(path.posix.join(path.posix.dirname(rel), dep));
  }
  return { entryRel, eager: [...seen] };
}

export function checkBuild(dist, { budget = false } = {}) {
  const failures = [];
  const { entryRel, eager } = eagerSetOf(dist);
  const entry = fs.readFileSync(path.join(dist, entryRel), "utf8");
  const gz = zlib.gzipSync(entry).length;
  const assets = path.join(dist, "assets");
  const all = fs.readdirSync(assets).filter((f) => f.endsWith(".js")).map((f) => `assets/${f}`);
  const text = new Map(all.map((rel) => [rel, fs.readFileSync(path.join(dist, rel), "utf8")]));
  for (const marker of FIRESTORE_MARKERS) {
    const eagerHits = eager.filter((rel) => (text.get(rel) ?? fs.readFileSync(path.join(dist, rel), "utf8")).includes(marker));
    for (const rel of eagerHits) {
      failures.push(`${rel === entryRel ? "entry" : "eagerly loaded chunk"} ${rel} contains the Firestore SDK marker "${marker}"`);
    }
    if (!eagerHits.length && ![...text.values()].some((src) => src.includes(marker))) {
      failures.push(`CONTROL: marker "${marker}" is in NO emitted chunk — the marker is stale, so its absence proves nothing`);
    }
  }
  if (budget && gz > ENTRY_GZ_BUDGET) failures.push(`entry ${entryRel} is ${gz} B gz, over the budget ${ENTRY_GZ_BUDGET} B`);
  return { entryRel, eager, raw: Buffer.byteLength(entry), gz, budget, failures };
}

function report(label, r) {
  const verdict = r.failures.length ? "FAIL" : "PASS";
  const b = r.budget ? `budget=${ENTRY_GZ_BUDGET}` : "budget=not-enforced(deploy build; CI only)";
  console.log(`${verdict} ${label}: entry=${r.entryRel} eager_chunks=${r.eager.length} raw=${r.raw} gz=${r.gz} ${b}`);
  for (const f of r.failures) console.log(`  ✗ ${f}`);
  return r.failures.length === 0;
}

/** Fixture builds: the detector must fire on a static-import closure and on a modulepreload,
 *  and must NOT fire on a dynamic-only reference. Returns the list of self-test failures. */
export function selfTest() {
  const problems = [];
  const mk = (files, html) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "perf3-selftest-"));
    fs.mkdirSync(path.join(dir, "assets"));
    for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(dir, "assets", name), body);
    fs.writeFileSync(path.join(dir, "index.html"), html);
    return dir;
  };
  const sdk = `const h="firestore.googleapis.com";const w="webchannel";export{h,w};`;
  const html = (extra = "") => `<html><head><script type="module" crossorigin src="/assets/index-AAAA.js"></script>${extra}</head></html>`;
  const cases = [
    { name: "dynamic-only reference stays GREEN", red: false,
      files: { "index-AAAA.js": `const l=()=>import("./sdk-BBBB.js");export{l};`, "sdk-BBBB.js": sdk }, html: html() },
    { name: "SDK in a STATICALLY imported chunk goes RED", red: true,
      files: { "index-AAAA.js": `import{h as a}from"./vendor-CCCC.js";console.log(a);`, "vendor-CCCC.js": sdk }, html: html() },
    { name: "SDK reached TRANSITIVELY (entry → a → b) goes RED", red: true,
      files: { "index-AAAA.js": `import"./a-DDDD.js";`, "a-DDDD.js": `export*from"./b-EEEE.js";`, "b-EEEE.js": sdk }, html: html() },
    { name: "SDK in a MODULEPRELOADED chunk goes RED", red: true,
      files: { "index-AAAA.js": `const l=()=>import("./sdk-BBBB.js");export{l};`, "sdk-BBBB.js": sdk },
      html: html(`<link rel="modulepreload" crossorigin href="/assets/sdk-BBBB.js">`) },
  ];
  for (const c of cases) {
    const dir = mk(c.files, c.html);
    try {
      const r = checkBuild(dir);
      const red = r.failures.some((f) => f.includes("contains the Firestore SDK marker"));
      if (red !== c.red) problems.push(`SELF-TEST "${c.name}": expected ${c.red ? "RED" : "GREEN"}, got ${red ? "RED" : "GREEN"}`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
  return problems;
}

function mutate() {
  const target = path.join(LAZYTOPPER, "src", "services", "firebaseClient.ts");
  const original = fs.readFileSync(target, "utf8");
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "perf3-mutate-"));
  try {
    fs.writeFileSync(target, `import "firebase/firestore";\n${original}`);
    const vite = path.join(LAZYTOPPER, "node_modules", "vite", "bin", "vite.js");
    const res = spawnSync(process.execPath, [vite, "build", "--outDir", out, "--emptyOutDir", "--logLevel", "error"], {
      cwd: LAZYTOPPER,
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "production" },
    });
    if (res.status !== 0) {
      console.log("FAIL --mutate: the mutated build did not complete, so the guard was not exercised");
      return false;
    }
    const r = checkBuild(out, { budget: true });
    report("MUTATED build (static firebase/firestore import in firebaseClient.ts)", r);
    const red = r.failures.some((f) => f.includes("contains the Firestore SDK marker"));
    console.log(red ? "PASS --mutate: the guard went RED on the mutation" : "FAIL --mutate: the guard stayed GREEN on the mutation");
    return red;
  } finally {
    fs.writeFileSync(target, original);
    fs.rmSync(out, { recursive: true, force: true });
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const st = selfTest();
  if (st.length) {
    console.log("FAIL PERF-3 guard self-test");
    for (const p of st) console.log(`  ✗ ${p}`);
    process.exit(1);
  }
  if (process.argv.includes("--mutate")) process.exit(mutate() ? 0 : 1);
  const budget = process.argv.includes("--budget") || process.env.GITHUB_ACTIONS === "true";
  const dist = await resolveDist(process.argv);
  process.exit(report("PERF-3 entry chunk", checkBuild(dist, { budget })) ? 0 : 1);
}
