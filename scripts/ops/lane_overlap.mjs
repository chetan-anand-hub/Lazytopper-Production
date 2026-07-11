#!/usr/bin/env node
// scripts/ops/lane_overlap.mjs
//
// Lane-overlap check (the collision guard). READ-ONLY diagnostic -- mutates nothing.
//
// For the current pull request it compares that PR's changed file paths against the
// changed paths of every OTHER open pull request. Any shared path is a "lane overlap":
// two branches editing the same file in parallel WILL conflict on merge, so the check
// FAILS (exit 1) to force the owner to sequence them instead of parallelizing.
//
// Separately it WARNS (never fails) when the PR touches a GATED path (the CLAUDE.md
// globally-forbidden files, lazytopper/src/data/**, cofounder-skill/**, .github/**),
// so the gated-lane review requirement is visible in the check output as well as via
// .github/CODEOWNERS.
//
// Env (supplied by .github/workflows/lane-overlap.yml):
//   PR_NUMBER          - the current PR's number            (required)
//   GITHUB_REPOSITORY  - "owner/repo"                        (required)
//   GH_TOKEN           - token for the gh CLI                (required; set to GITHUB_TOKEN)
//   GITHUB_STEP_SUMMARY- file path for the run summary       (optional; set by Actions)
//
// Exit: 0 = no overlap (may still WARN on gated paths); 1 = overlap found, or fatal error.

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const PR_NUMBER = process.env.PR_NUMBER;
const REPO = process.env.GITHUB_REPOSITORY;
const SUMMARY = process.env.GITHUB_STEP_SUMMARY; // may be undefined when run locally

// --- Gated lanes: touching any of these requires owner review (see .github/CODEOWNERS). ---
// Keep in sync with CLAUDE.md section 4 (globally-forbidden files) + the gated set.
const GATED_PREFIXES = [
  'lazytopper/src/data/', // question banks, predictionTypes.ts, all content data
  'cofounder-skill/',     // the operating skill
  '.github/',             // CI is sensitive -- owner reviews every change
];
const GATED_FILES = new Set([
  'lazytopper/src/pages/Welcome.tsx',
  'lazytopper/src/App.tsx',
  'lazytopper/src/components/desktop/DesktopShell.tsx',
  'lazytopper/src/main.tsx',
  'lazytopper/vite.config.ts',
  'firebase.json',
  'firestore.rules',
]);

function annErr(msg) { console.error(`::error::${msg}`); }
function annWarn(msg) { console.error(`::warning::${msg}`); }
function summary(md) {
  if (!SUMMARY) return;
  try { appendFileSync(SUMMARY, md + '\n'); } catch { /* non-fatal */ }
}
function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

// REST pulls/{n}/files with --jq streams one filename per line across ALL pages.
function prFiles(num) {
  const out = gh(['api', `repos/${REPO}/pulls/${num}/files`, '--paginate', '--jq', '.[].filename']);
  return out.split('\n').map(s => s.trim()).filter(Boolean);
}

function isGated(path) {
  if (GATED_FILES.has(path)) return true;
  return GATED_PREFIXES.some((p) => path.startsWith(p));
}

function main() {
  if (!PR_NUMBER || !REPO) {
    annErr('lane-overlap: PR_NUMBER and GITHUB_REPOSITORY must both be set.');
    process.exit(1);
  }

  let mine;
  try {
    mine = prFiles(PR_NUMBER);
  } catch (e) {
    annErr(`lane-overlap: could not read files for PR #${PR_NUMBER}: ${e.message}`);
    process.exit(1);
  }
  const mineSet = new Set(mine);
  console.log(`PR #${PR_NUMBER} changes ${mine.length} file(s).`);

  // --- Gated-path warnings (non-fatal) ---
  const gatedHits = mine.filter(isGated);
  for (const p of gatedHits) {
    annWarn(`PR #${PR_NUMBER} touches GATED path '${p}' -- owner review required (see .github/CODEOWNERS).`);
  }

  // --- Enumerate other open PRs ---
  let others;
  try {
    const raw = gh(['pr', 'list', '--state', 'open', '--limit', '500',
      '--json', 'number,title,headRefName,baseRefName,isDraft']);
    others = JSON.parse(raw).filter((pr) => String(pr.number) !== String(PR_NUMBER));
  } catch (e) {
    annErr(`lane-overlap: could not list open PRs: ${e.message}`);
    process.exit(1);
  }
  console.log(`Comparing against ${others.length} other open PR(s).`);

  const overlaps = [];
  for (const pr of others) {
    let files;
    try {
      files = prFiles(pr.number);
    } catch (e) {
      annWarn(`lane-overlap: could not read files for PR #${pr.number} (skipping): ${e.message}`);
      continue;
    }
    const shared = files.filter((f) => mineSet.has(f));
    if (shared.length) overlaps.push({ pr, shared });
  }

  // --- Report to the run summary ---
  summary('## Lane-overlap check');
  summary('');
  summary(`**PR #${PR_NUMBER}** changes ${mine.length} file(s); ${gatedHits.length} gated.`);
  summary('');
  if (gatedHits.length) {
    summary('### WARN -- gated paths touched (owner review required)');
    for (const p of gatedHits) summary(`- \`${p}\``);
    summary('');
  }

  if (overlaps.length === 0) {
    console.log('PASS: no lane overlap with any other open PR.');
    summary('### PASS -- no lane overlap');
    summary('This PR shares no changed file with any other open PR.');
    process.exit(0);
  }

  summary('### FAIL -- lane overlap found (sequence, do not parallelize)');
  summary('');
  summary('| Other PR | Base | Shared path(s) |');
  summary('|---|---|---|');
  for (const { pr, shared } of overlaps) {
    const tag = pr.isDraft ? ' [draft]' : '';
    annErr(`Lane overlap with PR #${pr.number}${tag} (${pr.headRefName}): shares ${shared.length} path(s) -- ${shared.join(', ')} -- sequence, do not parallelize.`);
    const cells = shared.map((s) => '`' + s + '`').join('<br>');
    summary(`| #${pr.number}${tag} ${pr.title} | ${pr.baseRefName} | ${cells} |`);
  }
  summary('');
  summary('> Two branches editing the same file in parallel will conflict on merge. Land one, rebase the other.');
  process.exit(1);
}

main();
