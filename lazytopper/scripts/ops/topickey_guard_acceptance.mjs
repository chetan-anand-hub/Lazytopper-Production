// topickey_guard_acceptance.mjs — P0 [FU-TOPICKEY-UNIVERSAL] Commit-3 GUARDS (the cure).
//
// The guards are the point: prior sessions fixed call sites WITHOUT a guard and the disease
// regenerated. After this, a non-canonical topic key cannot enter the served BANK DATA — not from
// an agent, not from the Fable content lane (Guard A + topickey_runtime_proof.mjs reject it in CI).
// (Attribution/history WRITES canonicalise via Guard D; the mastery-STORAGE key scheme is a
// separate, deliberately-preserved layer — see the Guard D note + [FU-TOPICHUB-MASTERY-STORAGE-KEY].)
//
//   Guard A (data)      every `topicKey` string LITERAL in the served bank source IS a
//                       topics.ts slug — NOT "resolves via topicAliasMap". Scans BOTH object
//                       styles (`topicKey:` and `"topicKey":`) across questionBanks/class10/**
//                       AND the aggregator canonicalQuestionBank.ts (which holds 26 inline
//                       served questions). predicted* is on death row ([FU-FM-RESOURCE-PREDICTED])
//                       and is OUT of scope (not scanned).                                → FAIL
//   Guard B (read sites) no NEW raw `.topicKey ===/!==` compare outside the audited allowlist;
//                       new bank-question<->chosen-topic matching must go through the helper. → FAIL
//   Guard C (registry)  every topics.ts slug is reachable in the bank source (a 0-question
//                       chapter is a WARNING — an honest empty state, not a build failure). → WARN
//   Guard D (write path) every ATTRIBUTION/history WRITE site (weak-area bucket key) routes through
//                       resolveCanonicalSlug. Scoped, NOT "every topic-key write in the repo" — the
//                       mastery-STORAGE scheme (normalizeTopicKeyForStorage) is a separate preserved
//                       layer, documented + FU-tracked, NOT silently claimed.               → FAIL
//
// Pure-Node text-scan (lazytopper/scripts/ops convention; runs on Windows + CI). Guard A here is
// the fast source-side belt; the AUTHORITATIVE assembled-bank proof is topickey_runtime_proof.mjs
// (transpile + import canonicalQuestionBank — covers factory + any future runtime construction).
// A source-regex-only Guard A is exactly what false-passed the prior attempt; this one is
// dual-style AND paired with the runtime proof. B and D are targeted lint/checklist guards with
// EXPLICIT, stated policies — a guard that cannot be made 100% reliable is declared loudly.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "../../src");
const BANK_DIRS = ["data/questionBanks/class10/maths", "data/questionBanks/class10/science"];
const AGGREGATOR = "data/canonicalQuestionBank.ts"; // holds 26 inline served questions

// ── canonical vocabulary: read topics.ts slugs (single source of truth) ──────
function readTopicsTsSlugs() {
  const src = readFileSync(join(SRC, "lib/desktop/topics.ts"), "utf8");
  // Only the TOPICS array entries (`slug: "kebab-slug",`) — the two `slug: string` type
  // annotations have no quotes and are skipped.
  return new Set([...src.matchAll(/\bslug:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]));
}
const TOPIC_SLUGS = readTopicsTsSlugs();

function walk(dir) {
  const out = [];
  for (const e of readdirSync(join(SRC, dir || "."), { withFileTypes: true })) {
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...walk(rel));
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(rel);
  }
  return out;
}
// strip `//` line + `/* */` block comments (so comment topicKeys / compares don't trip)
function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}
// DUAL-STYLE topicKey literal matcher — matches BOTH `topicKey: "…"` and `"topicKey": "…"`,
// value in single OR double quotes. This is the fix for the prior blind spot: a `\btopicKey:`
// regex silently skipped 124 JSON-style files (1912 questions).
function* topicKeyLiterals(code) {
  const re = /(?:"topicKey"|'topicKey'|\btopicKey)\s*:\s*(?:"([^"]*)"|'([^']*)')/g;
  let m;
  while ((m = re.exec(code)) !== null) yield m[1] !== undefined ? m[1] : m[2];
}

let failed = false;
const warnings = [];

// ── Guard A ──────────────────────────────────────────────────────────────────
const aViolations = [];
const perCanonical = {};
const scanFiles = [];
for (const dir of BANK_DIRS) {
  for (const f of readdirSync(join(SRC, dir)).filter((x) => x.endsWith(".ts"))) scanFiles.push(`${dir}/${f}`);
}
scanFiles.push(AGGREGATOR);
for (const rel of scanFiles) {
  const code = stripComments(readFileSync(join(SRC, rel), "utf8"));
  for (const val of topicKeyLiterals(code)) {
    perCanonical[val] = (perCanonical[val] || 0) + 1;
    if (!TOPIC_SLUGS.has(val)) aViolations.push(`${rel}: "${val}"`);
  }
}
if (aViolations.length) {
  failed = true;
  console.error(`Guard A FAIL — ${aViolations.length} non-canonical topicKey literal(s) in the served bank source:`);
  for (const v of aViolations.slice(0, 40)) console.error(`  x ${v}`);
} else {
  console.log(`Guard A PASS — every topicKey literal in the served bank source (both object styles, ${scanFiles.length} files incl. the aggregator) is one of the ${TOPIC_SLUGS.size} topics.ts slugs (predicted* out of scope by design).`);
}

// ── Guard C (uses Guard A's per-canonical counts) ────────────────────────────
const zero = [...TOPIC_SLUGS].filter((s) => !perCanonical[s]);
if (zero.length) {
  for (const s of zero) warnings.push(`Guard C WARNING — topics.ts slug "${s}" has 0 questions in the bank (honest empty state).`);
  console.log(`Guard C WARN — ${zero.length} registry slug(s) with no bank questions (warning, not failure): ${zero.join(", ")}`);
} else {
  console.log(`Guard C PASS — all ${TOPIC_SLUGS.size} topics.ts slugs are reachable in the bank.`);
}

// ── Guard B ──────────────────────────────────────────────────────────────────
// POLICY: flags any direct property-access equality compare `<expr>.topicKey ===/!== …`
// (the bank-question<->chosen-topic bug pattern) OUTSIDE the allowlist below. Comments are
// stripped first. It does NOT attempt to catch Set-membership or normalised compares — those
// are neutralised by Guard A (data is canonical) + the shared helper; a reviewer adds any new
// genuinely-safe compare to the allowlist WITH a one-line justification. Test files excluded.
// Allowlist = audited same-provenance / registry / self-consistent-normalised sites (2026-07-11):
const B_ALLOW = new Set([
  "components/worksheet/worksheetModel.ts",     // :586 same-provenance label lookup (key ∈ ws.questions)
  "data/class10TopicRegistry.ts",               // :110 registry self-lookup (both sides registry keys)
  "pages/TopicHub.tsx",                         // :130 list dedup (r.topicKey !== entry.topicKey)
  "services/learningPathGenerator.ts",          // :72/:367 learning-path area self-match (one vocabulary)
  "services/topicHubMastery.ts",                // :166 persistence guard vs its own normalizeTopicKeyForStorage
]);
const bViolations = [];
for (const rel of walk("").filter((r) => !/\.test\.|\.spec\./.test(r))) {
  if (B_ALLOW.has(rel)) continue;
  const code = stripComments(readFileSync(join(SRC, rel), "utf8"));
  for (const m of code.matchAll(/[\w\])]\.topicKey\s*[=!]==/g)) {
    const line = code.slice(0, m.index).split("\n").length;
    bViolations.push(`${rel}:${line}`);
  }
}
if (bViolations.length) {
  failed = true;
  console.error(`Guard B FAIL — ${bViolations.length} raw .topicKey compare(s) outside the allowlist (route through bankQuery/canonicalTopicSlug, or allowlist with justification):`);
  for (const v of bViolations) console.error(`  x ${v}`);
} else {
  console.log(`Guard B PASS — no raw .topicKey equality compare outside the audited allowlist (${B_ALLOW.size} entries).`);
}

// ── Guard D ──────────────────────────────────────────────────────────────────
// POLICY: every ATTRIBUTION/history WRITE site (the weak-area BUCKET key — mistakes, practice,
// sessions, mock breakdowns) must route through resolveCanonicalSlug (the topics.ts-slug resolver).
// A NEW attribution write site must be added here AND use the resolver. Checklist guard (not full
// dataflow analysis) — stated plainly so it is not a silent convention.
//
// EXPLICIT OUT-OF-SCOPE (do NOT silently claim these): the mastery/schedule STORAGE layer keys its
// records with `normalizeTopicKeyForStorage` (topicHubMastery.ts) and a `${topicKey}::${conceptKey}`
// composite (spacedRepetitionEngine.ts, currently dormant — no live write caller), NOT
// resolveCanonicalSlug. Commit 1 DELIBERATELY preserved the mastery-lookup key so already-stored
// mastery is not orphaned (no backfill). Reconciling that storage-key scheme with the canonical
// vocabulary (incl. the raw-vs-canonical writer/reader asymmetry) is [FU-TOPICHUB-MASTERY-STORAGE-KEY]
// — a separate, migration-sensitive change, NOT this data-cure PR. The list below is therefore the
// set that MUST canonicalise; the storage layer is asserted only to be honestly excluded, below.
const D_WRITE_SITES = [
  "services/mistakeIntelligence.ts",   // recordWrongAnswer topic key
  "services/practiceInsights.ts",      // PracticeAttempt.topicKey
  "services/sessionRecords.ts",        // SessionRecord.topicKeys[]
  "services/weakAreaAggregator.ts",    // weak-area bucket key
  "services/mockScoreHistory.ts",      // mock topicBreakdown read-resolve
  "pages/ExamSimulationPage.tsx",      // mock topicBreakdown write
  "pages/MockPaper.tsx",               // mock topicBreakdown write
];
// Storage-layer sites known to use the preserved scheme — reported for transparency (NOT failed).
const D_STORAGE_LAYER = ["services/topicHubMastery.ts", "services/spacedRepetitionEngine.ts"];
const dViolations = [];
for (const rel of D_WRITE_SITES) {
  const p = join(SRC, rel);
  if (!existsSync(p)) { dViolations.push(`${rel} (MISSING — write-site list is stale)`); continue; }
  if (!/resolveCanonicalSlug/.test(readFileSync(p, "utf8"))) dViolations.push(`${rel} (does not route through resolveCanonicalSlug)`);
}
if (dViolations.length) {
  failed = true;
  console.error(`Guard D FAIL — ${dViolations.length} attribution write site(s) not routing through the resolver:`);
  for (const v of dViolations) console.error(`  x ${v}`);
} else {
  console.log(`Guard D PASS — all ${D_WRITE_SITES.length} attribution/history write sites route through resolveCanonicalSlug.`);
  console.log(`Guard D note — mastery/schedule STORAGE layer (${D_STORAGE_LAYER.join(", ")}) uses the preserved normalizeTopicKeyForStorage scheme by C1 design; OUT of scope here, tracked as [FU-TOPICHUB-MASTERY-STORAGE-KEY].`);
}

if (warnings.length) { console.log(""); for (const w of warnings) console.log(w); }
if (failed) { console.error("\ntopickey guards FAILED."); process.exit(1); }
console.log("\ntopickey guards PASSED (A/B/D pass; C warnings are non-blocking).");
