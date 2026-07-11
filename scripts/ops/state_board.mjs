#!/usr/bin/env node
// scripts/ops/state_board.mjs
//
// State-board ledger builder. Computes ONE machine-generated record for the tip commit of
// a push to the trunk branch and inserts it -- NEWEST-FIRST -- into handoff/MERGE_LEDGER.md.
// It also mirrors the record into the Actions run summary. The WORKFLOW commits + pushes the
// mutated ledger (with [skip ci]); this script only builds the record and edits the file, so
// the git write stays visible + auditable in the workflow YAML.
//
// It NEVER touches CURRENT_STATE.md or any human handoff doc -- only the machine ledger.
// This is what kills the stale-SHA trap: the record of "what merged when" is generated, not
// hand-copied.
//
// Changed-file list comes from the GitHub API (depth-independent -- a shallow checkout cannot
// diff against an un-fetched parent); commit metadata comes from local git on the tip commit,
// which a depth-1 checkout already has.
//
// Env (from .github/workflows/state-board.yml):
//   GITHUB_SHA          - tip commit of the push                 (required)
//   GITHUB_REPOSITORY   - "owner/repo"                           (required)
//   GH_TOKEN            - token for the gh CLI                   (required; set to GITHUB_TOKEN)
//   PUSH_BEFORE         - github.event.before (range start)      (optional)
//   GITHUB_STEP_SUMMARY - run-summary file                       (optional)
//
// Exit: 0 on success (ledger updated); 1 on fatal error.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const SHA = process.env.GITHUB_SHA;
const REPO = process.env.GITHUB_REPOSITORY;
const BEFORE = process.env.PUSH_BEFORE || '';
const SUMMARY = process.env.GITHUB_STEP_SUMMARY;
const LEDGER = 'handoff/MERGE_LEDGER.md';
const MARKER = '<!-- LEDGER:INSERT';
const ZERO = '0000000000000000000000000000000000000000';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
}
function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
}
function summary(md) {
  if (!SUMMARY) return;
  try { appendFileSync(SUMMARY, md + '\n'); } catch { /* non-fatal */ }
}

// Changed files via the API (depth-independent). Prefer the full push range when
// github.event.before is a real commit; else the tip commit's own file list.
function changedFiles() {
  if (BEFORE && BEFORE !== ZERO) {
    try {
      const out = gh(['api', `repos/${REPO}/compare/${BEFORE}...${SHA}`, '--jq', '.files[].filename']);
      return out ? out.split('\n').map((s) => s.trim()).filter(Boolean) : [];
    } catch { /* fall through to single-commit list */ }
  }
  const out = gh(['api', `repos/${REPO}/commits/${SHA}`, '--jq', '.files[].filename']);
  return out ? out.split('\n').map((s) => s.trim()).filter(Boolean) : [];
}

function ledgerHeader() {
  return [
    '# Merge Ledger (machine-generated -- do not hand-edit rows)',
    '',
    'Every push to the trunk branch (`base/approved-thru-437`) appends one row here via',
    '`.github/workflows/state-board.yml` + `scripts/ops/state_board.mjs`. It is the machine',
    'record of *what merged when*, so no one has to trust a hand-copied SHA. The human',
    'narrative stays in `CURRENT_STATE.md` and `SESSION_LOG.md`; this file is append-only',
    'plumbing -- newest row first, directly under the marker below.',
    '',
    '| Date (UTC) | SHA | PR | Subject | Files | Top-level dirs |',
    '| --- | --- | --- | --- | --- | --- |',
    `${MARKER} (newest rows are added directly below this line) -->`,
    '',
  ].join('\n');
}

function main() {
  if (!SHA || !REPO) {
    console.error('::error::state-board: GITHUB_SHA and GITHUB_REPOSITORY must both be set.');
    process.exit(1);
  }

  const iso = new Date(git(['show', '-s', '--format=%cI', SHA])).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const subjectRaw = git(['show', '-s', '--format=%s', SHA]);
  const short = git(['rev-parse', SHA]).slice(0, 7);

  const prMatch = subjectRaw.match(/\(#(\d+)\)\s*$/) || subjectRaw.match(/Merge pull request #(\d+)/);
  const pr = prMatch ? `#${prMatch[1]}` : '-';

  let subject = subjectRaw.replace(/\s*\(#\d+\)\s*$/, '').trim().replace(/\|/g, '\\|');
  if (subject.length > 100) subject = subject.slice(0, 97) + '...';

  const files = changedFiles();
  const topDirs = [...new Set(files.map((f) => (f.includes('/') ? f.split('/')[0] : '(root)')))]
    .sort().join(', ') || '-';

  const row = `| ${iso} | \`${short}\` | ${pr} | ${subject} | ${files.length} | ${topDirs} |`;

  // --- Insert newest-first, directly after the marker ---
  let content = existsSync(LEDGER) ? readFileSync(LEDGER, 'utf8') : ledgerHeader();
  const lines = content.split('\n');
  const idx = lines.findIndex((l) => l.startsWith(MARKER));
  if (idx === -1) {
    // Marker missing (hand-edited or corrupted): prepend a fresh header + this row; keep old
    // content untouched below so nothing is lost.
    writeFileSync(LEDGER, ledgerHeader() + row + '\n\n' + content);
  } else {
    lines.splice(idx + 1, 0, row);
    writeFileSync(LEDGER, lines.join('\n'));
  }

  console.log('Appended ledger row:');
  console.log(row);
  summary('## State-board -- ledger updated');
  summary('');
  summary('| Date (UTC) | SHA | PR | Subject | Files | Top-level dirs |');
  summary('| --- | --- | --- | --- | --- | --- |');
  summary(row);
}

main();
