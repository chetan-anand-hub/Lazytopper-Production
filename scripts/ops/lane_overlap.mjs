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
// DRAFTS (owner ruling, CI-2, 2026-10-18). A draft PR is parked work, not a lane that is
// about to merge, so it must not block anyone:
//   - an overlap with ANOTHER PR that is a draft is INFORMATIONAL (a ::warning:: and a
//     summary row), never a failure;
//   - when THIS PR is a draft, the check still runs and reports every overlap, but passes
//     with a note. lane-overlap.yml re-runs on `ready_for_review`, so the real verdict is
//     taken the moment the PR leaves draft.
// An overlap between two NON-draft PRs still FAILS, exactly as before.
//
// Env (supplied by .github/workflows/lane-overlap.yml):
//   PR_NUMBER          - the current PR's number            (required)
//   GITHUB_REPOSITORY  - "owner/repo"                        (required)
//   GH_TOKEN           - token for the gh CLI                (required; set to GITHUB_TOKEN)
//   PR_IS_DRAFT        - "true" when this PR is a draft     (optional; github.event.pull_request.draft)
//   GITHUB_STEP_SUMMARY- file path for the run summary       (optional; set by Actions)
//
// Exit: 0 = no blocking overlap (may still WARN on gated paths / draft overlaps);
//       1 = blocking overlap found, or fatal error.

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

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

// --- Generated artifacts: shared paths here are NOT a lane collision. ---
//
// ★ WHY THIS EXCLUSION EXISTS, AND WHY IT IS EXACTLY ONE ENTRY.
// This check exists to stop two lanes editing the same AUTHORED file in parallel, where
// a shared path means two humans disagreeing about one source of truth and a conflict
// that a person must resolve. A GENERATED artifact has no such conflict: whichever lane
// merges second regenerates it from its own source, and the "disagreement" resolves
// itself. Without this, every content lane would collide with every other content lane
// on `lazytopper/prerendered/**` and the whole set would have to be sequenced -- a real
// cost protecting nothing.
//
// ⚠ DO NOT ADD TO THIS LIST TO SILENCE AN INCONVENIENT COLLISION. The temptation will
// be concrete: `lazytopper/package.json` collisions are common and annoying, and adding
// it here would make them disappear. It would also be exactly wrong -- package.json is
// authored, two lanes editing it really can conflict, and hiding that is how a bad merge
// reaches trunk. The only thing that belongs here is output that a tool regenerates in
// full from source. `lane_overlap.guard.test.ts` asserts this list is EXACTLY the one
// path below, so widening it fails the root guard matrix rather than passing quietly.
export const GENERATED_PREFIXES = ['lazytopper/prerendered/'];

export function isGenerated(path) {
  return GENERATED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * Pure verdict. `mine` = this PR's changed paths; `others` = [{ pr, files }] for every
 * other open PR (pr.isDraft from `gh pr list`); `selfIsDraft` = this PR is a draft.
 *   blocking      - overlaps with NON-draft PRs (fail the check unless this PR is a draft)
 *   informational - overlaps with DRAFT PRs (warn only, never fail)
 *   ok            - true when the check passes
 */
export function evaluateOverlaps({ mine, others, selfIsDraft = false }) {
  const mineSet = new Set(mine);
  const blocking = [];
  const informational = [];
  for (const { pr, files } of others) {
    // Generated output is excluded: whichever lane merges second regenerates it.
    const shared = files.filter((f) => mineSet.has(f) && !isGenerated(f));
    if (!shared.length) continue;
    (pr.isDraft === true ? informational : blocking).push({ pr, shared });
  }
  const ok = blocking.length === 0 || selfIsDraft === true;
  return { ok, blocking, informational, selfIsDraft: selfIsDraft === true };
}

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

  const fetched = [];
  for (const pr of others) {
    let files;
    try {
      files = prFiles(pr.number);
    } catch (e) {
      annWarn(`lane-overlap: could not read files for PR #${pr.number} (skipping): ${e.message}`);
      continue;
    }
    fetched.push({ pr, files });
  }
  const selfIsDraft = String(process.env.PR_IS_DRAFT || '').toLowerCase() === 'true';
  const { ok, blocking, informational } = evaluateOverlaps({ mine, others: fetched, selfIsDraft });

  // --- Report to the run summary ---
  summary('## Lane-overlap check');
  summary('');
  summary(`**PR #${PR_NUMBER}**${selfIsDraft ? ' [draft]' : ''} changes ${mine.length} file(s); ${gatedHits.length} gated.`);
  summary('');
  if (gatedHits.length) {
    summary('### WARN -- gated paths touched (owner review required)');
    for (const p of gatedHits) summary(`- \`${p}\``);
    summary('');
  }

  const row = ({ pr, shared }) => {
    const tag = pr.isDraft ? ' [draft]' : '';
    const cells = shared.map((s) => '`' + s + '`').join('<br>');
    return `| #${pr.number}${tag} ${pr.title} | ${pr.baseRefName} | ${cells} |`;
  };

  // Draft overlaps: informational only, never a failure.
  if (informational.length) {
    summary('### INFO -- overlap with DRAFT PR(s) (does not block)');
    summary('');
    summary('| Other PR | Base | Shared path(s) |');
    summary('|---|---|---|');
    for (const o of informational) {
      annWarn(`Lane overlap with DRAFT PR #${o.pr.number} (${o.pr.headRefName}): shares ${o.shared.length} path(s) -- ${o.shared.join(', ')} -- informational only; drafts do not block.`);
      summary(row(o));
    }
    summary('');
  }

  if (blocking.length === 0) {
    console.log(`PASS: no lane overlap with any other open non-draft PR${informational.length ? ` (${informational.length} draft overlap(s) reported as warnings)` : ''}.`);
    summary('### PASS -- no blocking lane overlap');
    summary('This PR shares no changed file with any other open non-draft PR.');
    process.exit(0);
  }

  if (ok) {
    // THIS PR is a draft: report every overlap, pass with a note. ready_for_review re-runs the check.
    for (const o of blocking) {
      annWarn(`Lane overlap with PR #${o.pr.number} (${o.pr.headRefName}): shares ${o.shared.length} path(s) -- ${o.shared.join(', ')} -- this PR is a DRAFT, so it passes for now; it will be re-checked when marked ready for review.`);
    }
    console.log(`PASS (draft): ${blocking.length} overlap(s) with non-draft PR(s); re-checked on ready_for_review.`);
    summary('### PASS (draft) -- overlap found, but this PR is a draft');
    summary('');
    summary('| Other PR | Base | Shared path(s) |');
    summary('|---|---|---|');
    for (const o of blocking) summary(row(o));
    summary('');
    summary('> This check re-runs when the PR is marked ready for review, and will FAIL then if the overlap remains.');
    process.exit(0);
  }

  summary('### FAIL -- lane overlap found (sequence, do not parallelize)');
  summary('');
  summary('| Other PR | Base | Shared path(s) |');
  summary('|---|---|---|');
  for (const o of blocking) {
    annErr(`Lane overlap with PR #${o.pr.number} (${o.pr.headRefName}): shares ${o.shared.length} path(s) -- ${o.shared.join(', ')} -- sequence, do not parallelize.`);
    summary(row(o));
  }
  summary('');
  summary('> Two branches editing the same file in parallel will conflict on merge. Land one, rebase the other.');
  process.exit(1);
}

// Run only when invoked directly, so the guard test can import the pure predicates above
// without the script reaching for a PR number and exiting.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
