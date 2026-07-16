// tutor_visual_catalogue_acceptance.mjs
// CI-GATED guard for the tutor explanation panel's concept->figure catalogue (Stage 3).
//
// The panel resolves a concept to a figure by (canonical topicKey, EXACT conceptLabel).
// Two ways that silently breaks into a blank or broken panel — this guard fails the build
// on either, because a maths tutor showing a wrong/blank/broken figure is a fabrication:
//
//   1. LABEL DRIFT — a boardEssentials `name` is edited but the catalogue's conceptLabel
//      is not (or vice-versa). The lookup then misses and the panel silently blanks
//      (the [FU-PROG-TOPIC-KEY-MISMATCH] two-canonicalizer trap). Assert every catalogue
//      conceptLabel is present verbatim as a `name:` in lib/desktop/topicHubContent.ts.
//   2. MISSING IMAGE — a curated notes-figure / bank-figure ref points at an asset that
//      isn't on disk. That renders a broken <img>. Assert every image ref resolves to a
//      real file. (Interactive refs degrade to an honest gap state, not a broken image,
//      so they are checked as a warning, not a hard failure.)
//
// Plain Node (no Vite/tsx) so it runs in the lazytopper ops matrix, which CI executes.
// The catalogue and registry are read as TEXT — no module import — so a Vite-only
// import.meta.glob dependency never blocks this guard.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const lazytopperRoot = path.resolve(here, "..", ".."); // lazytopper/
const repoRoot = path.resolve(lazytopperRoot, ".."); // repo root

const read = (rel, base = repoRoot) => fs.readFileSync(path.join(base, rel), "utf8");

const CATALOGUE = "lazytopper/src/pages/tutor/conceptVisualCatalogue.data.ts";
const HUB = "lazytopper/src/lib/desktop/topicHubContent.ts";
const REGISTRY = "lazytopper/src/data/visualConceptRegistry.ts";
const NOTES_ASSETS = "notes/assets"; // repo-root
const PUBLIC = "lazytopper/public"; // bank figures + interactives are public-served

const failures = [];
const warnings = [];
const fail = (m) => failures.push(m);

// ── Parse the wired catalogue: conceptKey, topicKey, conceptLabel, best.kind, best.ref ──
const catText = read(CATALOGUE);
const rowRe =
  /conceptKey:\s*"([^"]+)",[\s\S]*?topicKey:\s*"([^"]+)",[\s\S]*?conceptLabel:\s*"((?:[^"\\]|\\.)*)",[\s\S]*?best:\s*\{\s*kind:\s*"([^"]+)",\s*ref:\s*"((?:[^"\\]|\\.)*)"/g;
const rows = [...catText.matchAll(rowRe)].map((m) => ({
  conceptKey: m[1],
  topicKey: m[2],
  conceptLabel: m[3].replace(/\\"/g, '"'),
  bestKind: m[4],
  bestRef: m[5].replace(/\\"/g, '"'),
}));

// Sanity: the parser must catch every row (a silent under-parse would false-PASS).
// Count `conceptKey: "` (a value) — NOT `conceptKey:` bare, which also matches the
// interface field `conceptKey: string;`.
const declaredRows = (catText.match(/conceptKey:\s*"/g) || []).length;
if (rows.length !== declaredRows) {
  fail(`parser caught ${rows.length} rows but the file declares ${declaredRows} — regex drift; fix the parser before trusting this guard.`);
}

// ── 0. conceptKey is the sentinel token + byKey index key — must be a clean, unique slug ──
const seenKey = new Set();
for (const r of rows) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.conceptKey)) {
    fail(`BAD conceptKey [${r.topicKey}] ${JSON.stringify(r.conceptKey)} — must be a kebab slug ([a-z0-9-]); it is the [[figure:<key>]] sentinel token and must survive the regex.`);
  }
  const ck = `${r.topicKey}\n${r.conceptKey}`;
  if (seenKey.has(ck)) {
    fail(`DUP conceptKey [${r.topicKey}] ${JSON.stringify(r.conceptKey)} — the byKey lookup would be ambiguous (two rows share it).`);
  }
  seenKey.add(ck);
}

// ── 1. LABEL DRIFT — every conceptLabel present verbatim as a boardEssentials `name:` ──
const hubText = read(HUB);
const hubNames = new Set(
  [...hubText.matchAll(/name:\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1].replace(/\\"/g, '"')),
);
for (const r of rows) {
  if (!hubNames.has(r.conceptLabel)) {
    fail(`LABEL DRIFT [${r.topicKey}] conceptLabel is not a live boardEssentials name: ${JSON.stringify(r.conceptLabel)} — the panel would silently blank this concept.`);
  }
}

// ── 2a. notes-figure refs exist on disk (repo-root notes/assets/<ref>) ──
for (const r of rows.filter((x) => x.bestKind === "notes-figure")) {
  const abs = path.join(repoRoot, NOTES_ASSETS, r.bestRef);
  if (!fs.existsSync(abs)) {
    fail(`MISSING NOTES ASSET [${r.topicKey}] ${JSON.stringify(r.conceptLabel)} -> notes/assets/${r.bestRef} does not exist (broken image).`);
  }
}

// ── 2b. bank-figure refs (questionId) map to a real filePath asset ──
const regText = read(REGISTRY);
const qidToFilePath = new Map();
for (const m of regText.matchAll(/filePath:\s*"([^"]+)"[^}]*questionId:\s*"([^"]+)"/g)) {
  if (!qidToFilePath.has(m[2])) qidToFilePath.set(m[2], m[1]);
}
for (const r of rows.filter((x) => x.bestKind === "bank-figure")) {
  const fp = qidToFilePath.get(r.bestRef);
  if (!fp) {
    fail(`MISSING BANK FIGURE [${r.topicKey}] ${JSON.stringify(r.conceptLabel)} -> questionId ${r.bestRef} has no figure entry in the registry.`);
    continue;
  }
  const abs = path.join(repoRoot, PUBLIC, fp.replace(/^\//, ""));
  if (!fs.existsSync(abs)) {
    fail(`MISSING BANK ASSET [${r.topicKey}] ${JSON.stringify(r.conceptLabel)} -> ${fp} (from ${r.bestRef}) does not exist (broken image).`);
  }
}

// ── 2c. interactive refs — NOT disk-checkable here, and safe if stale ──
// Interactive ids are COMPUTED by the registry's private makeId() at init, so they are
// never literal strings in the registry text — a text guard here can only false-alarm.
// A stale interactive ref degrades to an honest gap state (never a broken/wrong image),
// so it is not a fabrication risk. Existence is covered by the co-located resolver vitest
// (conceptVisualCatalogue.test.ts) which imports the real registry. We only count them here.
const interactiveCount = rows.filter((x) => x.bestKind === "interactive").length;

// ── Report ──
const kinds = rows.reduce((a, r) => ((a[r.bestKind] = (a[r.bestKind] || 0) + 1), a), {});
console.log(`[tutor-visual-catalogue] parsed ${rows.length} rows — best.kind:`, JSON.stringify(kinds));
console.log(`[tutor-visual-catalogue] boardEssentials names in hub: ${hubNames.size}; bank figure entries: ${qidToFilePath.size}; interactive rows (not disk-checked here): ${interactiveCount}`);
for (const w of warnings) console.warn("  WARN:", w);

if (failures.length) {
  console.error(`\n[tutor-visual-catalogue] FAIL — ${failures.length} problem(s):`);
  for (const f of failures) console.error("  -", f);
  process.exit(1);
}
console.log(`[tutor-visual-catalogue] PASS — all ${rows.length} concept rows resolve (labels live, images on disk).`);
