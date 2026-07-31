const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const allowedExt = new Set(['.ts', '.tsx', '.js', '.cjs', '.mjs', '.json', '.md', '.txt', '.css', '.html', '.yml', '.yaml', '.ps1', '.sh']);
const excludedDirs = new Set(['node_modules', 'dist', 'build', '.next', '.git', 'coverage', '.cache', '.vite', '.turbo', 'out', '.vercel']);
const mojibakeRegex = /(?:\uFFFD|\u0393\u00C7|[\u00C2\u00C3\u00CE\u00CF\u00E2\u00F0][\u0080-\u00BF\u00C0-\u00FF\u2013-\u201F\u2020-\u2022\u2030\u2039\u203A\u20AC\u2122\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u02C6\u02DC])/u;
// ★ [GUARD-3] ENUMERATE FROM THE GIT ROOT, NOT FROM lazytopper/.
// This was `path.resolve(__dirname, '..')` — i.e. the lazytopper/ package dir — so `git ls-files`
// below ran with cwd=lazytopper and listed ONLY files under lazytopper/. Everything else in the
// monorepo (handoff/, scripts/, artifacts/, lib/, .github/, root *.md) was STRUCTURALLY INVISIBLE
// to this gate: not "scanned and clean", never looked at. It ran green for months while 616
// mojibake lines sat on trunk in handoff/. A pass from the old frame was no evidence at all about
// any file outside lazytopper/.
// Fall back to the old anchor only if git is unavailable (e.g. a tarball checkout), so the gate
// degrades to its previous scope rather than crashing.
let repoRoot;
try {
  repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
} catch (err) {
  repoRoot = path.resolve(__dirname, '..');
}

// ★★ [GUARD-3] ENFORCE vs REPORT — AND WHY THIS IS SCOPING, NOT SOFTENING.
//
// Widening the frame above surfaced 616 pre-existing hits in `handoff/`. PR-2 (#570) re-encoded 608
// of them. The residual 8 are DELIBERATE MOJIBAKE SPECIMENS quoted inside handoff entries that are
// LESSONS ABOUT MOJIBAKE - e.g. `[FU-HANDOFF-MOJIBAKE-LEGACY]` shows what U+25B3 looks like AFTER a
// UTF-8-read-as-Latin-1 round trip, so the next reader RECOGNISES it in the wild. Correct content.
//
// So `handoff/` can never reach zero, and a repo-wide hard gate would be RED ON A CORRECT REPO.
// Two fixes were proposed and both REJECTED by the owner, for reasons worth keeping here:
//   • rewrite the specimens as escaped codepoints — "preserves the INFORMATION and destroys the
//     LESSON; someone reading the FU needs to SEE what the corrupted form looks like."
//   • a gate-honoured `mojibake-ok` pragma — "a file allowlist with better manners; the next person
//     adds one to silence a real hit."
//
// ★★ THE RULING: THE GATE WAS ASKING THE WRONG QUESTION. Mojibake is a DEFECT in product text and a
// legitimate SUBJECT in documentation about mojibake. A gate that cannot tell those apart is not
// detecting a bug — it is banning a character. The gate's job is "no mojibake reaches a student",
// not "no such byte exists in the repository". So the verdict is scoped, and NOTHING ELSE IS:
//
//   ENFORCE (non-zero exit) — everything tracked, BY DEFAULT.
//   REPORT  (counted, printed, never fails) — the declared record trees below, `handoff/` alone.
//
// ⚠ THIS IS A DENYLIST OF EXEMPT TREES, DELIBERATELY — NOT AN ALLOWLIST OF ENFORCED ONES.
// An enumerated enforce-list is exactly the defect this lane exists to close: a new top-level tree
// would default to INVISIBLE (that is instances #4 and #5 of the frame bug, one of which was in the
// suite built to catch the other). Here a new tree defaults to ENFORCED. It fails safe.
//
// ★★ AND `handoff/` IS STILL SCANNED. This is the load-bearing distinction. The gate SEES the
// record tree — the blind spot this lane exists to close — prints every hit and prints a COUNT on
// every run, green or red. If 616 lines reappeared, the log would say `handoff/: 616`. A SILENT
// SKIP WOULD BE INDISTINGUISHABLE FROM A BLIND SPOT, which is the exact thing being fixed; the
// count is what makes this monitoring rather than exemption.
//
// ★ [FU-MOJIBAKE-SPECIMEN-LINES] and [FU-HANDOFF-MOJIBAKE-LEGACY] are RESOLVED BY SCOPING, on that
// reasoning. DO NOT "TIDY" THE 8 SPECIMENS — they are the lesson. DO NOT re-enforce `handoff/` —
// that turns CI red on a correct repo and re-opens both FUs.
const REPORT_ONLY_PREFIXES = ['handoff/'];
const isReportOnly = (rel) => REPORT_ONLY_PREFIXES.some((prefix) => rel.startsWith(prefix));

const tracked = execSync('git ls-files', { cwd: repoRoot, encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean);

const hits = [];
const reported = [];
let scanned = 0;

for (const rel of tracked) {
  const parts = rel.split(/[/\\]/);
  if (parts.some((part) => excludedDirs.has(part))) {
    continue;
  }
  const ext = path.extname(rel).toLowerCase();
  if (!allowedExt.has(ext)) {
    continue;
  }
  const abs = path.join(repoRoot, rel);
  let content;
  try {
    content = fs.readFileSync(abs, 'utf8');
  } catch (err) {
    continue;
  }
  scanned += 1;
  const lines = content.split(/\r?\n/);
  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    const match = line.match(mojibakeRegex);
    if (match) {
      const hit = { file: rel, line: idx + 1, sig: match[0], snippet: line.trim() };
      (isReportOnly(rel) ? reported : hits).push(hit);
    }
  }
}

// Scan EVERY tracked file and EVERY line above — never break early. A prior 50-hit cap bounded the
// SCAN (not just the output), so a heavily-corrupted file that filled the cap blinded the checker to
// corruption in any file sorting after it (real corruption shipped this way). The display limit below
// bounds only the printed lines; detection (and the failing exit code) always covers the whole repo.
const DISPLAY_LIMIT = 200;

// ★ [GUARD-3] STATE THE SUBJECT, NOT JUST THE VERDICT. A guard that prints only a verdict cannot be
// distinguished from a guard that inspected nothing — both are silent on success. Printing the root
// and the scanned-file count means a future frame regression is visible in the log (the count would
// collapse from repo-wide to lazytopper-only) instead of hiding behind a green tick.
console.log(
  `MOJIBAKE_SCOPE: root=${repoRoot.replace(/\\/g, '/')} tracked=${tracked.length} scanned=${scanned}` +
    ` enforced_hits=${hits.length} report_only_hits=${reported.length}`
);

// ★ THE COUNT LINE — PRINTED ON EVERY RUN, INCLUDING A CLEAN ONE (and including 0). This is the
// whole difference between monitoring and exemption: a run that printed nothing about `handoff/`
// would be indistinguishable from the pre-GUARD-3 gate that could not see `handoff/` at all.
for (const prefix of REPORT_ONLY_PREFIXES) {
  const inTree = reported.filter((hit) => hit.file.startsWith(prefix));
  const files = new Set(inTree.map((hit) => hit.file)).size;
  console.log(
    `MOJIBAKE_REPORT_ONLY: ${prefix}: ${inTree.length} non-enforced hits across ${files} files` +
      ` (record tree — deliberate specimens quoted in lessons about mojibake; scanned, not enforced)`
  );
  for (const hit of inTree.slice(0, DISPLAY_LIMIT)) {
    console.log(`  report-only ${hit.file}:${hit.line}:${hit.sig}`);
  }
  if (inTree.length > DISPLAY_LIMIT) {
    console.log(`  ... and ${inTree.length - DISPLAY_LIMIT} more report-only hits under ${prefix}`);
  }
}

if (hits.length > 0) {
  for (const hit of hits.slice(0, DISPLAY_LIMIT)) {
    console.log(hit.file + ':' + hit.line + ':' + hit.sig + ':' + hit.snippet);
  }
  if (hits.length > DISPLAY_LIMIT) {
    const fileCount = new Set(hits.map((hit) => hit.file)).size;
    console.log(`... and ${hits.length - DISPLAY_LIMIT} more mojibake hits (total ${hits.length} across ${fileCount} files)`);
  }
  process.exitCode = 1;
} else {
  process.exitCode = 0;
}
