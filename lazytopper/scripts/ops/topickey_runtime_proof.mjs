// topickey_runtime_proof.mjs — P0 [FU-TOPICKEY-UNIVERSAL] Commit-3 AUTHORITATIVE proof.
//
// This is the check the prior attempt LACKED. It does NOT text-scan source; it transpiles the
// real TS to CJS and IMPORTS the ASSEMBLED `canonicalQuestionBank`, so it sees EVERY served
// question regardless of how it is authored — JS-literal, JSON-literal (`"topicKey":`), factory
// `.map(spec => make())`, inline-in-aggregator, or any future construction. Over that assembled
// bank it asserts the P0 invariants:
//   1. served count > a collapse floor (a partial-load / broken-import detector — NOT the exact
//      count; the count is REPORTED, never hardcoded as a target, so a legit +/-N never false-fails)
//   2. 0 duplicate ids
//   3. every served topicKey IS a topics.ts slug (0 orphans)  <- the cure, at runtime
//   4. registry coverage: every topics.ts slug reachable (0-question chapter = WARN, honest empty)
//
// Cross-platform: shells out to `node <typescript>/bin/tsc` (works on Windows dev boxes AND the
// linux CI runner — unlike vitest/vite/tsx, whose esbuild binary is linux-pinned). Emits nothing
// into the repo (temp dir under os.tmpdir, removed on exit). `--emit <file>` also writes the
// per-canonical depth census (topic x section x mark-band) for the owner's depth-floor decision.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const LAZY = join(HERE, "../..");          // lazytopper/
const SRC = join(LAZY, "src");
const TSC = join(LAZY, "node_modules/typescript/bin/tsc");
const require = createRequire(import.meta.url);

const COLLAPSE_FLOOR = 5000; // bank is ~7084; below this ⇒ a broken import / partial load, not a real edit.

const emitIdx = process.argv.indexOf("--emit");
const emitPath = emitIdx >= 0 ? process.argv[emitIdx + 1] : null;

function readTopicsTsSlugs() {
  const s = readFileSync(join(SRC, "lib/desktop/topics.ts"), "utf8");
  return new Set([...s.matchAll(/\bslug:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]));
}
const TOPIC_SLUGS = readTopicsTsSlugs();

const out = mkdtempSync(join(tmpdir(), "lt-topickey-proof-"));
let failed = false;
try {
  execFileSync("node", [
    TSC,
    "src/data/canonicalQuestionBank.ts",
    "src/data/bankQuery.ts",
    "src/data/syllabus/canonicalTopicSlug.ts",
    "src/lib/desktop/topics.ts",
    "src/lib/desktop/navigation.ts",
    "src/data/syllabus/topicAliasMap.ts",
    "--outDir", out, "--rootDir", "src",
    "--module", "commonjs", "--target", "es2020",
    "--moduleResolution", "node", "--skipLibCheck", "--esModuleInterop",
    "--noEmitOnError", "false",
  ], { cwd: LAZY, stdio: ["ignore", "ignore", "inherit"] });
  writeFileSync(join(out, "package.json"), '{"type":"commonjs"}');

  const { canonicalQuestionBank } = require(join(out, "data/canonicalQuestionBank.js"));
  const bank = canonicalQuestionBank;
  const n = bank.length;
  const ids = bank.map((q) => q.id);
  const dup = ids.length - new Set(ids).size;
  const orphanKeys = [...new Set(bank.map((q) => q.topicKey))].filter((k) => !TOPIC_SLUGS.has(k));
  const reached = new Set(bank.map((q) => q.topicKey));
  const zero = [...TOPIC_SLUGS].filter((s) => !reached.has(s));

  console.log(`Runtime proof — ASSEMBLED bank imported (all authoring styles + factory + inline):`);
  console.log(`  served questions = ${n}  (collapse floor ${COLLAPSE_FLOOR})`);
  console.log(`  duplicate ids    = ${dup}`);
  console.log(`  orphan topicKeys = ${orphanKeys.length}`);
  console.log(`  registry reached = ${TOPIC_SLUGS.size - zero.length}/${TOPIC_SLUGS.size}`);

  if (n < COLLAPSE_FLOOR) { failed = true; console.error(`  FAIL — served count ${n} < collapse floor ${COLLAPSE_FLOOR} (broken import / partial load?).`); }
  if (dup !== 0) { failed = true; console.error(`  FAIL — ${dup} duplicate question id(s).`); }
  if (orphanKeys.length) { failed = true; console.error(`  FAIL — non-canonical topicKey(s) served: ${orphanKeys.join(", ")}`); }
  if (zero.length) console.log(`  WARN — ${zero.length} registry slug(s) with 0 questions (honest empty state): ${zero.join(", ")}`);

  if (emitPath) {
    const SECS = ["A", "B", "C", "D", "E"];
    const t = {};
    for (const q of bank) {
      const k = q.topicKey;
      t[k] ??= { subject: q.subject, total: 0, sec: {}, marks: {} };
      t[k].total++;
      t[k].sec[q.section || "?"] = (t[k].sec[q.section || "?"] || 0) + 1;
      t[k].marks[String(q.marks)] = (t[k].marks[String(q.marks)] || 0) + 1;
    }
    let md = `# Assembled-bank depth census — ${n} served questions (dup ${dup}, orphans ${orphanKeys.length})\n\n`;
    md += `| Canonical slug | Subj | Total | A | B | C | D | E | m1 | m2 | m3 | m4 | m5 |\n|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|\n`;
    for (const slug of [...TOPIC_SLUGS]) {
      const r = t[slug] || { subject: "", total: 0, sec: {}, marks: {} };
      const c = (o, k) => o[k] || 0;
      md += `| ${slug} | ${r.subject} | ${r.total} | ${c(r.sec,"A")} | ${c(r.sec,"B")} | ${c(r.sec,"C")} | ${c(r.sec,"D")} | ${c(r.sec,"E")} | ${c(r.marks,"1")} | ${c(r.marks,"2")} | ${c(r.marks,"3")} | ${c(r.marks,"4")} | ${c(r.marks,"5")} |\n`;
    }
    writeFileSync(emitPath, md);
    console.log(`  depth census written -> ${emitPath}`);
  }
} finally {
  try { rmSync(out, { recursive: true, force: true }); } catch { /* best-effort */ }
}

if (failed) { console.error("\ntopickey RUNTIME PROOF FAILED."); process.exit(1); }
console.log("\ntopickey RUNTIME PROOF PASSED — every served topicKey is a topics.ts slug (0 orphans, 0 dup ids).");
