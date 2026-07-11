// topickey_count_invariant.mjs — P0 [FU-TOPICKEY-UNIVERSAL] Commit-2 lossless proof (DUAL-STYLE).
//
// Migration-time reproducibility harness. Proves the topicKey rewrite is LOSSLESS + touched ONLY
// the topicKey string: run BEFORE (grouping every question by its RESOLVED canonical target) and
// AFTER (grouping by the now-LITERAL key), then compare — any differing cell means a question was
// lost, added, or misfiled. Reproduce the BEFORE/AFTER over git refs:
//     git stash; git checkout e0a33a9 -- src/data      # pre-migration (Commit 1)
//     node scripts/ops/topickey_count_invariant.mjs emit --mode resolved --out before.json
//     git checkout HEAD -- src/data                     # post-migration (Commit 2)
//     node scripts/ops/topickey_count_invariant.mjs emit --mode literal  --out after.json
//     node scripts/ops/topickey_count_invariant.mjs compare before.json after.json
//
// SCANS BOTH object-literal styles — `id:`/`"id":` and `topicKey:`/`"topicKey":` — across
// questionBanks/class10/** AND the aggregator canonicalQuestionBank.ts (26 inline questions).
// A `\bid:` / `topicKey:` regex silently skipped 124 JSON-style files (1912 Q) in the prior
// attempt — that blind spot is fixed here. SCOPE: this covers LITERAL question objects only.
// Factory `.map(spec => make())` questions (triangles.pack1 = 50, trigonometry.pack1 = 120) have
// COMPUTED ids a text-scan cannot enumerate; they are consistently absent from BOTH before and
// after, and are proven 100% by the AUTHORITATIVE runtime proof (topickey_runtime_proof.mjs +
// src/data/bankQuery.test.ts, which import the assembled bank: 7084 served, 0 orphans). Do NOT
// hand-enumerate the factory files here — that would re-create the very blind spot.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "../../src");
const BANK_DIRS = [
  ["Maths", join(SRC, "data/questionBanks/class10/maths")],
  ["Science", join(SRC, "data/questionBanks/class10/science")],
];
const AGGREGATOR = ["Aggregator", join(SRC, "data/canonicalQuestionBank.ts")];

// ── comment/string-aware top-level {…} object splitter ───────────────────────
function splitObjects(src) {
  const objs = []; let i = 0, n = src.length, depth = 0, start = -1, state = "code";
  while (i < n) {
    const c = src[i], c2 = src[i + 1];
    if (state === "line") { if (c === "\n") state = "code"; i++; continue; }
    if (state === "block") { if (c === "*" && c2 === "/") { state = "code"; i += 2; continue; } i++; continue; }
    if (state === "dq") { if (c === "\\") { i += 2; continue; } if (c === '"') state = "code"; i++; continue; }
    if (state === "sq") { if (c === "\\") { i += 2; continue; } if (c === "'") state = "code"; i++; continue; }
    if (state === "tpl") { if (c === "\\") { i += 2; continue; } if (c === "`") state = "code"; i++; continue; }
    if (c === "/" && c2 === "/") { state = "line"; i += 2; continue; }
    if (c === "/" && c2 === "*") { state = "block"; i += 2; continue; }
    if (c === '"') { state = "dq"; i++; continue; }
    if (c === "'") { state = "sq"; i++; continue; }
    if (c === "`") { state = "tpl"; i++; continue; }
    if (c === "{") { if (depth === 0) start = i; depth++; i++; continue; }
    if (c === "}") { depth--; if (depth === 0 && start >= 0) { objs.push(src.slice(start, i + 1)); start = -1; } i++; continue; }
    i++;
  }
  return objs;
}
// DUAL-STYLE field readers — accept optional quotes around the key name.
const field = (o, k) => { const m = o.match(new RegExp('["\'`]?' + k + '["\'`]?\\s*:\\s*["\'`]([^"\'`]*)["\'`]')); return m ? m[1] : undefined; };
const numField = (o, k) => { const m = o.match(new RegExp('["\'`]?' + k + '["\'`]?\\s*:\\s*(\\d+)')); return m ? Number(m[1]) : undefined; };

// ── ported resolver (faithful copy; self-checked at startup) ─────────────────
function normalizeTopicSlug(raw) {
  const t = String(raw ?? "").trim(); if (!t) return "";
  return t.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()
    .replace(/&/g, " and ").replace(/[/\\]/g, " ").replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
}
const canonicalTopicAliasMap = {
  "pair-of-linear-equations-in-two-variables": ["pair-of-linear-equations"],
  "arithmetic-progressions": ["arithmetic-progression", "maths_arithmetic_progressions"],
  "real-numbers": ["maths_real_numbers"], polynomials: ["maths_polynomials"],
  "coordinate-geometry": ["maths_coordinate_geometry"], circles: ["maths_circles"],
  trigonometry: ["maths_introduction_trigonometry", "maths_applications_trigonometry"],
  "areas-related-to-circles": ["maths_areas_circles"], "surface-areas-and-volumes": ["maths_surface_areas_volumes"],
  "acids-bases-and-salts": ["acids-bases-salts", "science_acids_bases_salts"],
  "chemical-reactions-and-equations": ["chemical-reactions-equations", "chemical-reactions", "chemical-reactions-and-equations"],
  "metals-and-non-metals": ["metals-non-metals", "science_metals_nonmetals"],
  reproduction: ["how-do-organisms-reproduce", "science_reproduction"],
  "control-and-co-ordination": ["science_control_coordination"],
  "heredity-and-evolution": ["heredity", "science_heredity_evolution"],
  "our-environment": ["science_our_environment", "our-environment-food-chains", "s10-ch-our-env", "S10_CH_OUR_ENV", "our environment"],
  "light-reflection-and-refraction-incl-human-eye-prism": ["light-reflection-refraction", "light-reflection-and-refraction", "light", "human-eye-colourful-world", "science_light_reflection_refraction", "science_human_eye_colourful_world"],
  electricity: ["science_electricity"],
  "carbon-and-its-compounds": ["carbon-compounds", "carbon-compounds-and-their-nomenclature", "science_carbon_compounds"],
  "life-processes": ["science_life_processes"],
  "magnetic-effects-of-electric-current": ["magnetic-effects", "science_magnetic_effects"],
};
const aliasToCanonical = (() => { const m = new Map();
  for (const c of Object.keys(canonicalTopicAliasMap)) { const nc = normalizeTopicSlug(c); m.set(nc, nc);
    for (const a of canonicalTopicAliasMap[c] || []) m.set(normalizeTopicSlug(a), nc); } return m; })();
function resolveCanonicalTopicKey(raw) { const nz = normalizeTopicSlug(raw); if (!nz) return ""; return aliasToCanonical.get(nz) || nz; }
function getRuntimeTopicCandidates(raw) {
  const ni = normalizeTopicSlug(raw), can = resolveCanonicalTopicKey(raw), al = canonicalTopicAliasMap[can] || [];
  const uniq = (v) => { const o = [], s = new Set(); for (const x of v) { const k = String(x || "").trim(); if (!k || s.has(k)) continue; s.add(k); o.push(k); } return o; };
  const seeds = uniq([can, ni, ...al, can.replace(/-/g, "_"), ni.replace(/-/g, "_")]); const ex = [];
  for (const sd of seeds) { ex.push(sd); ex.push(normalizeTopicSlug(sd)); ex.push(normalizeTopicSlug(sd).replace(/-/g, "_")); } return uniq(ex);
}
const TOPICS = [["real-numbers","Real Numbers"],["polynomials","Polynomials"],["pair-of-linear-equations","Pair of Linear Equations"],["quadratic-equations","Quadratic Equations"],["arithmetic-progression","Arithmetic Progression"],["triangles","Triangles"],["coordinate-geometry","Coordinate Geometry"],["trigonometry","Trigonometry"],["circles","Circles"],["areas-related-to-circles","Areas Related to Circles"],["surface-areas-and-volumes","Surface Areas and Volumes"],["statistics","Statistics"],["probability","Probability"],["chemical-reactions-and-equations","Chemical Reactions & Equations"],["acids-bases-and-salts","Acids Bases & Salts"],["metals-and-non-metals","Metals & Non-metals"],["carbon-and-its-compounds","Carbon & its Compounds"],["light-reflection-and-refraction","Light - Reflection & Refraction"],["human-eye-and-colourful-world","Human Eye & Colourful World"],["electricity","Electricity"],["magnetic-effects-of-electric-current","Magnetic Effects of Electric Current"],["life-processes","Life Processes"],["control-and-coordination","Control & Coordination"],["how-do-organisms-reproduce","How do Organisms Reproduce"],["heredity","Heredity"],["our-environment","Our Environment"]];
const TOPIC_SLUGS = new Set(TOPICS.map((t) => t[0]));
const tnorm = (v) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const TOPIC_ALIASES = { "trigonometry-heights-distances":"trigonometry","trigonometry-heights":"trigonometry","trigonometry-and-heights":"trigonometry","trigonometric-identities":"trigonometry","light-reflection-refraction":"light-reflection-and-refraction","light-reflection":"light-reflection-and-refraction","acids-bases-salts":"acids-bases-and-salts","areas-related-to-circle":"areas-related-to-circles","surface-area-and-volume":"surface-areas-and-volumes","surface-areas-volumes":"surface-areas-and-volumes","linear-equations-in-two-variables":"pair-of-linear-equations","pair-of-linear-equations-in-two-variables":"pair-of-linear-equations","arithmetic-progressions":"arithmetic-progression",ap:"arithmetic-progression","metals-non-metals":"metals-and-non-metals","metals-and-nonmetals":"metals-and-non-metals","carbon-and-compounds":"carbon-and-its-compounds","carbon-compounds":"carbon-and-its-compounds","chemical-reactions-equations":"chemical-reactions-and-equations","human-eye":"human-eye-and-colourful-world","human-eye-and-colorful-world":"human-eye-and-colourful-world","magnetic-effects":"magnetic-effects-of-electric-current","magnetic-effects-of-current":"magnetic-effects-of-electric-current","control-coordination":"control-and-coordination","control-and-co-ordination":"control-and-coordination",reproduction:"how-do-organisms-reproduce","how-organisms-reproduce":"how-do-organisms-reproduce",environment:"our-environment",light:"light-reflection-and-refraction",lifeprocesses:"life-processes",acidsbasessalts:"acids-bases-and-salts",humaneyeandcolourfulworld:"human-eye-and-colourful-world",carboncompounds:"carbon-and-its-compounds",controlandcoordination:"control-and-coordination",metalsnonmetals:"metals-and-non-metals",chemicalreactions:"chemical-reactions-and-equations",magneticeffects:"magnetic-effects-of-electric-current",heredityevolution:"heredity",ourenvironment:"our-environment","science-light-reflection-refraction":"light-reflection-and-refraction","science-reproduction":"how-do-organisms-reproduce",
  // owner-approved (2026-07-11)
  "introduction-to-trigonometry":"trigonometry","applications-of-trigonometry":"trigonometry","human-eye-and-the-colourful-world":"human-eye-and-colourful-world" };
function desktopTopicBySlug(slug) { if (!slug) return undefined; const key = tnorm(slug);
  const d = TOPICS.find((t) => t[0] === key || tnorm(t[1]) === key); if (d) return d[0];
  const a = TOPIC_ALIASES[key]; if (a) return TOPICS.find((t) => t[0] === a)?.[0]; return undefined; }
function resolveCanonicalSlug(raw) { const k = String(raw ?? ""); const d = desktopTopicBySlug(k); if (d) return d;
  for (const c of getRuntimeTopicCandidates(k)) { const v = desktopTopicBySlug(c); if (v) return v; } return normalizeTopicSlug(k); }

// startup self-check — fail loudly if the port drifts from the shipped resolver
for (const [inp, exp] of [["chemical-reactions-equations","chemical-reactions-and-equations"],["acids-bases-salts","acids-bases-and-salts"],["metals-non-metals","metals-and-non-metals"],["reproduction","how-do-organisms-reproduce"],["OurEnvironment","our-environment"],["Circles","circles"],["Heredity","heredity"],["light","light-reflection-and-refraction"],["Introduction to Trigonometry","trigonometry"],["Human Eye and the Colourful World","human-eye-and-colourful-world"]]) {
  if (resolveCanonicalSlug(inp) !== exp) { console.error(`PORT DRIFT: resolveCanonicalSlug(${JSON.stringify(inp)}) = ${JSON.stringify(resolveCanonicalSlug(inp))} !== ${JSON.stringify(exp)}`); process.exit(2); }
}

const SECTIONS = ["A", "B", "C", "D", "E", "other"];
const BANDS = ["1", "2", "3", "4", "5", "other"];

function census(mode /* "resolved" | "literal" */) {
  const ids = []; const perTopic = {}; const perFile = {}; let total = 0;
  const targets = [];
  for (const [subj, dir] of BANK_DIRS) for (const f of readdirSync(dir).filter((x) => x.endsWith(".ts"))) targets.push([subj, join(dir, f), f]);
  targets.push([AGGREGATOR[0], AGGREGATOR[1], "canonicalQuestionBank.ts"]);
  for (const [subj, path, fname] of targets) {
    const src = readFileSync(path, "utf8"); let cnt = 0;
    for (const o of splitObjects(src)) {
      const id = field(o, "id"); const tk = field(o, "topicKey");
      if (!id || !tk) continue;
      const slug = mode === "literal" ? tk : resolveCanonicalSlug(tk);
      const sec = SECTIONS.includes(field(o, "section")) ? field(o, "section") : "other";
      const band = BANDS.includes(String(numField(o, "marks"))) ? String(numField(o, "marks")) : "other";
      ids.push(id); total++; cnt++;
      perTopic[slug] ??= { total: 0, sec: {}, band: {} };
      perTopic[slug].total++;
      perTopic[slug].sec[sec] = (perTopic[slug].sec[sec] || 0) + 1;
      perTopic[slug].band[band] = (perTopic[slug].band[band] || 0) + 1;
    }
    perFile[`${subj}/${fname}`] = cnt;
  }
  ids.sort();
  return { mode, total, ids, perTopic, perFile };
}

function compare(a, b) {
  const diffs = [];
  if (a.total !== b.total) diffs.push(`TOTAL: ${a.total} -> ${b.total}`);
  const aIds = new Set(a.ids), bIds = new Set(b.ids);
  const removed = a.ids.filter((id) => !bIds.has(id)), added = b.ids.filter((id) => !aIds.has(id));
  if (removed.length) diffs.push(`IDS REMOVED (${removed.length}): ${removed.slice(0, 50).join(", ")}`);
  if (added.length) diffs.push(`IDS ADDED (${added.length}): ${added.slice(0, 50).join(", ")}`);
  if (a.ids.length !== aIds.size) diffs.push(`DUPLICATE IDS in BEFORE: ${a.ids.length - aIds.size}`);
  if (b.ids.length !== bIds.size) diffs.push(`DUPLICATE IDS in AFTER: ${b.ids.length - bIds.size}`);
  const topics = new Set([...Object.keys(a.perTopic), ...Object.keys(b.perTopic)]);
  for (const t of [...topics].sort()) {
    const ta = a.perTopic[t] || { total: 0, sec: {}, band: {} }, tb = b.perTopic[t] || { total: 0, sec: {}, band: {} };
    if (ta.total !== tb.total) diffs.push(`TOPIC ${t}: total ${ta.total} -> ${tb.total}`);
    for (const s of SECTIONS) if ((ta.sec[s] || 0) !== (tb.sec[s] || 0)) diffs.push(`TOPIC ${t} sec ${s}: ${ta.sec[s] || 0} -> ${tb.sec[s] || 0}`);
    for (const bd of BANDS) if ((ta.band[bd] || 0) !== (tb.band[bd] || 0)) diffs.push(`TOPIC ${t} band ${bd}: ${ta.band[bd] || 0} -> ${tb.band[bd] || 0}`);
  }
  const files = new Set([...Object.keys(a.perFile), ...Object.keys(b.perFile)]);
  for (const f of [...files].sort()) if ((a.perFile[f] || 0) !== (b.perFile[f] || 0)) diffs.push(`FILE ${f}: ${a.perFile[f] || 0} -> ${b.perFile[f] || 0}`);
  return diffs;
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const cmd = argv[0];
const flag = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : def; };

if (cmd === "emit") {
  const mode = flag("--mode", "resolved");
  const out = flag("--out", null);
  const c = census(mode);
  const summary = { mode: c.mode, literalObjects: c.total, distinctTopics: Object.keys(c.perTopic).length, files: Object.keys(c.perFile).length, uniqueIds: new Set(c.ids).size, note: "LITERAL objects only (JS+JSON styles + aggregator inline); factory (~170 Q) excluded — proven by topickey_runtime_proof.mjs (assembled 7084)." };
  if (out) { writeFileSync(out, JSON.stringify(c)); console.log(`wrote ${out}`); }
  console.log(JSON.stringify(summary, null, 2));
} else if (cmd === "compare") {
  const a = JSON.parse(readFileSync(argv[1], "utf8"));
  const b = JSON.parse(readFileSync(argv[2], "utf8"));
  const diffs = compare(a, b);
  if (diffs.length === 0) {
    console.log(`COUNT INVARIANT HOLDS (LITERAL objects) — total=${a.total}, uniqueIds=${new Set(a.ids).size}, topics(before)=${Object.keys(a.perTopic).length}, files=${Object.keys(a.perFile).length}. No id added/removed; every per-topic x section x mark-band cell identical. (Factory ~170 Q consistently excluded both sides; assembled bank 7084 proven by topickey_runtime_proof.mjs.)`);
    process.exit(0);
  } else {
    console.error(`COUNT INVARIANT VIOLATED — ${diffs.length} difference(s). STOP.\n` + diffs.join("\n"));
    process.exit(1);
  }
} else {
  console.error("usage: topickey_count_invariant.mjs emit --mode resolved|literal [--out f.json] | compare before.json after.json");
  process.exit(2);
}
