#!/usr/bin/env node
/**
 * PERF-3 — `firebase/firestore` STAYS OUT OF THE ENTRY CHUNK. A build-output guard.
 *
 *   node scripts/ops/perf3_entry_chunk_acceptance.mjs            check the current build
 *   node scripts/ops/perf3_entry_chunk_acceptance.mjs --mutate   prove the guard can go RED
 *   (optional) --dist=<dir>                                       check another build output
 *
 * It runs as the LAST step of `pnpm run build` (so CI's build-ops job gates it) and reads what
 * the build emitted — a test proves the code works; a chunk proves it ships.
 *
 * WHAT IT CHECKS, on the ENTRY chunk (the module script `index.html` loads — never guessed from
 * a file-name prefix):
 *   1. none of the Firestore SDK markers below is in it;
 *   2. its gzip size is within the budget (the size PERF-3 measured + 10%);
 *   3. CONTROL (vacuity): every marker IS in some other emitted chunk. If the SDK stopped
 *      containing a marker, check 1 would pass for any build, so a missing marker is RED, not
 *      silently green.
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
const DEFAULT_DIST = path.resolve(LAZYTOPPER, "..", "artifacts", "lazytopper-app", "dist", "public");

/** Strings found only in the Firestore SDK's code (see header). */
export const FIRESTORE_MARKERS = ["firestore.googleapis.com", "webchannel"];

/** Whole-file gzip (zlib default level) of the EMITTED entry file, measured by PERF-3
 *  (`pnpm run build`, 2026-10-18, on this branch). Before PERF-3 the same measure read 414195. */
export const MEASURED_ENTRY_GZ = 248199;
export const ENTRY_GZ_BUDGET = Math.floor(MEASURED_ENTRY_GZ * 1.1);

export function entryChunkOf(dist) {
  const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
  const m = html.match(/<script\b[^>]*\btype="module"[^>]*\bsrc="\/?(assets\/[^"]+\.js)"/);
  if (!m) throw new Error(`no module entry <script> in ${path.join(dist, "index.html")}`);
  return m[1];
}

export function checkBuild(dist) {
  const failures = [];
  const entryRel = entryChunkOf(dist);
  const entry = fs.readFileSync(path.join(dist, entryRel), "utf8");
  const gz = zlib.gzipSync(entry).length;
  const assets = path.join(dist, "assets");
  const others = fs
    .readdirSync(assets)
    .filter((f) => f.endsWith(".js") && `assets/${f}` !== entryRel)
    .map((f) => fs.readFileSync(path.join(assets, f), "utf8"));

  for (const marker of FIRESTORE_MARKERS) {
    const inEntry = entry.includes(marker);
    if (inEntry) failures.push(`entry ${entryRel} contains the Firestore SDK marker "${marker}"`);
    if (!inEntry && !others.some((src) => src.includes(marker))) {
      failures.push(`CONTROL: marker "${marker}" is in NO emitted chunk — the marker is stale, so its absence proves nothing`);
    }
  }
  if (gz > ENTRY_GZ_BUDGET) failures.push(`entry ${entryRel} is ${gz} B gz, over the budget ${ENTRY_GZ_BUDGET} B`);
  return { entryRel, raw: Buffer.byteLength(entry), gz, failures };
}

function report(label, r) {
  const verdict = r.failures.length ? "FAIL" : "PASS";
  console.log(`${verdict} ${label}: entry=${r.entryRel} raw=${r.raw} gz=${r.gz} budget=${ENTRY_GZ_BUDGET}`);
  for (const f of r.failures) console.log(`  ✗ ${f}`);
  return r.failures.length === 0;
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
    const r = checkBuild(out);
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
  if (process.argv.includes("--mutate")) {
    process.exit(mutate() ? 0 : 1);
  }
  const distArg = process.argv.find((a) => a.startsWith("--dist="));
  const dist = distArg ? path.resolve(distArg.slice("--dist=".length)) : DEFAULT_DIST;
  process.exit(report("PERF-3 entry chunk", checkBuild(dist)) ? 0 : 1);
}
