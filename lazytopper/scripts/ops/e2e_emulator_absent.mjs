#!/usr/bin/env node
/**
 * UI-E2E-2 — THE KILL SWITCH'S PROOF: a normal build carries no Firebase-emulator connect.
 *
 *   tsx scripts/ops/e2e_emulator_absent.mjs                 check the build (vite.config.ts build.outDir)
 *   tsx scripts/ops/e2e_emulator_absent.mjs --dist=<dir>    check another build output (plain `node` works too)
 *
 * Runs as a step of `pnpm run build` (lazytopper/package.json), so it runs on EVERY build:
 * quality-gate's CI build, the ui-e2e jobs, Vercel and the Railway image.
 *
 * services/firebaseClient.ts and services/firestoreSdk.ts connect Auth and Firestore to the local
 * emulator ONLY when the build-time flag VITE_E2E_FIREBASE_EMULATOR is "1"
 * (tests/e2e/buildEnv.signedIn.json, the one file allowed to set it). Vite replaces the flag, so
 * in any other build the block is dead code and is dropped. This script reads what the build
 * EMITTED (a test proves the code works; a chunk proves what ships):
 *
 *   flag unset (every real build)  -> no emitted file may contain an emulator endpoint. RED otherwise.
 *   flag "1", outside Vercel/Railway (the ui-e2e-signed-in job, a local test build)
 *                                  -> the endpoints MUST be present: the positive control that this
 *                                     matcher can fire on a real bundle, not only on the self-test.
 *   flag set at all ON Vercel or Railway                             -> RED, always. It is never set there.
 *
 * SELF-TEST (every run): the matcher fires on fixture text in both emitted shapes and stays
 * silent on the "127.0.0.1" that the normal bundle legitimately contains (a loopback-host set).
 *
 * WHY THESE MARKERS (measured 2026-11-25 at 33032a3a, flag unset vs set, production flags from
 * tests/e2e/buildEnv.json): unset, 0 files contain either; set, the entry chunk contains
 * `"http://127.0.0.1:9099"` (connectAuthEmulator) and `"127.0.0.1",8080` (connectFirestoreEmulator).
 * The bare host "127.0.0.1" is NOT a marker: the normal entry already contains it.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LAZYTOPPER = path.resolve(__dirname, "..", "..");

/** The build output, resolved as perf3_entry_chunk_acceptance.mjs and the seo build steps resolve it. */
async function resolveDist(argv) {
  const override = argv.find((a) => a.startsWith("--dist="));
  if (override) return path.resolve(override.slice("--dist=".length));
  process.env.NODE_ENV = process.env.NODE_ENV || "production";
  const viteConfig = (await import("../../vite.config.ts")).default;
  const outDir = viteConfig?.build?.outDir;
  if (typeof outDir !== "string" || outDir.length === 0) throw new Error("e2e_emulator_absent: vite.config.ts declares no build.outDir");
  return path.resolve(LAZYTOPPER, outDir);
}

/** The emulator endpoints as they appear in an emitted chunk (any quote style, any spacing). */
export const EMULATOR_MARKERS = [
  { name: "Auth emulator 127.0.0.1:9099", re: /127\.0\.0\.1:9099/ },
  { name: "Firestore emulator 127.0.0.1, 8080", re: /127\.0\.0\.1["'`]?\s*[,:]\s*8080/ },
];

const TEXT_EXT = new Set([".js", ".mjs", ".cjs", ".html", ".json", ".map", ".css", ".txt", ".xml", ".webmanifest"]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (TEXT_EXT.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

/** Every (file, marker) hit under `dist`. */
export function findMarkers(dist) {
  const hits = [];
  for (const file of walk(dist)) {
    const text = fs.readFileSync(file, "utf8");
    for (const m of EMULATOR_MARKERS) if (m.re.test(text)) hits.push({ file: path.relative(dist, file), marker: m.name });
  }
  return hits;
}

function selfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-emulator-absent-"));
  try {
    fs.mkdirSync(path.join(dir, "assets"));
    const clean = 'const Tk=new Set(["127.0.0.1","localhost","::1"]);';
    fs.writeFileSync(path.join(dir, "assets", "index-clean.js"), clean);
    if (findMarkers(dir).length !== 0) return "a normal bundle's loopback-host set was reported as an emulator endpoint";
    fs.writeFileSync(path.join(dir, "assets", "index-auth.js"), 'Iw(K,"http://127.0.0.1:9099")');
    fs.writeFileSync(path.join(dir, "assets", "fs.js"), 'n.connectFirestoreEmulator(r.db,"127.0.0.1",8080)');
    const names = new Set(findMarkers(dir).map((h) => h.marker));
    for (const m of EMULATOR_MARKERS) if (!names.has(m.name)) return `the matcher did not fire on fixture text for "${m.name}"`;
    return null;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function decide(env, hits) {
  const flag = String(env.VITE_E2E_FIREBASE_EMULATOR ?? "").trim();
  const host = env.VERCEL || env.VERCEL_ENV ? "Vercel" : env.RAILWAY_ENVIRONMENT || env.RAILWAY_PROJECT_ID ? "Railway" : null;
  if (flag !== "" && host) {
    return { ok: false, mode: "deploy", why: `VITE_E2E_FIREBASE_EMULATOR is set (${JSON.stringify(flag)}) on ${host}. It must never be set there: remove it from the ${host} environment.` };
  }
  if (flag === "1") {
    const names = new Set(hits.map((h) => h.marker));
    const missing = EMULATOR_MARKERS.filter((m) => !names.has(m.name)).map((m) => m.name);
    return missing.length
      ? { ok: false, mode: "emulator-build", why: `test build (flag "1") but the bundle lacks: ${missing.join("; ")}. The guarded connect was lost, or this matcher no longer matches what the build emits.` }
      : { ok: true, mode: "emulator-build", why: `test build: emulator endpoints present as expected (${hits.length} hit(s)); this bundle must never be deployed` };
  }
  return hits.length
    ? { ok: false, mode: "normal", why: `emulator endpoint(s) in a normal build: ${hits.map((h) => `${h.file} [${h.marker}]`).join(", ")}` }
    : { ok: true, mode: "normal", why: "no emulator endpoint in any emitted file" };
}

async function main() {
  const dist = await resolveDist(process.argv);
  const selfFail = selfTest();
  if (selfFail) {
    console.error(`FAIL UI-E2E-2 emulator-absent self-test: ${selfFail}`);
    process.exit(1);
  }
  if (!fs.existsSync(dist)) {
    console.error(`FAIL UI-E2E-2 emulator-absent: no build output at ${dist}`);
    process.exit(1);
  }
  const hits = findMarkers(dist);
  const verdict = decide(process.env, hits);
  console.log(`${verdict.ok ? "PASS" : "FAIL"} UI-E2E-2 emulator-absent (${verdict.mode}): ${verdict.why}`);
  process.exit(verdict.ok ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
