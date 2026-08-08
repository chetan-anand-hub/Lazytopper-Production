#!/usr/bin/env node
/**
 * premise_ledger_check.mjs — gate for agent instruction specs.
 *
 * WHY THIS EXISTS
 * A spec built on an unverified premise sends a whole lane chasing a bug that does not
 * exist. That doctrine has been written down five times in cofounder-skill/SKILL.md and
 * has failed anyway. Prose is a hope; a check is a fact. This is the check.
 *
 * It enforces, mechanically:
 *   1. Every spec carries a §0 PREMISE LEDGER, a §0b OPEN PREMISES block, and a
 *      §0c PRE-FLIGHT block. Missing any → FAIL.
 *   2. Every VERIFIED row cites `path:line` (or `path:start-end`) evidence — never a bare
 *      filename, never a grep hit, never memory.
 *   3. The "How verified" cell contains no inference-trap weasel (grep / name / memory /
 *      assumed / the report says / the skill says …).
 *   4. Every UNVERIFIED row has an empty evidence cell AND appears in §0b as a QUESTION
 *      for the agent to establish — never as a stated conclusion in the body.
 *   5. With --worktree: each cited file exists at the declared base SHA's tree, the line
 *      number is in range, and the row's ANCHOR string actually appears in that window.
 *      This is the part that catches a premise that WAS true and has since rotted.
 *   6. A line budget on the spec itself (default 250). Three lanes returned past the
 *      context floor because of spec size, not agent judgement (DECISION_LOG 2026-08-06).
 *
 * THE SILENT SKIP: if no input files are found, this exits NON-ZERO. A check that can
 * quietly not-run is a check you do not have.
 *
 * Usage:
 *   node scripts/premise_ledger_check.mjs <spec.md> [more.md ...]
 *     [--worktree=DIR]        resolve evidence against a real tree (STRONGLY recommended)
 *     [--max-lines=250]       spec line budget; 0 disables
 *     [--strict-anchor]       every VERIFIED row must carry an anchor string
 *     [--json]                machine-readable output
 *
 * Exit: 0 = all specs pass. 1 = at least one ERROR. 2 = bad invocation.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const H_LEDGER = '§0 PREMISE LEDGER';
const H_OPEN = '§0b OPEN PREMISES';
const H_PREFLIGHT = '§0c PRE-FLIGHT';

const REQUIRED_COLUMNS = ['id', 'claim', 'evidence', 'anchor', 'how verified', 'status'];

/** Cells that mean "deliberately blank". Anything else in an UNVERIFIED evidence cell is a lie. */
const BLANK = new Set(['', '-', '—', '–', 'n/a', 'na', 'none', 'tbd', '?']);

/**
 * Phrases that describe INFERENCE, not reading. Each one is a documented failure:
 * a grep hit is not an import; a variable's name is not its source; a doc comment is not
 * behaviour; memory is a hypothesis generator, never an answer.
 */
const WEASEL = [
  ['grep', 'a grep hit proves a string exists, nothing more — open the file and read the lines'],
  ['rg ', 'a search hit is not a read — open the file'],
  ['search', 'a search hit is not a read — open the file'],
  ['filename', 'a filename match is not evidence of behaviour'],
  ['variable name', "a variable's NAME is not its source — read the assignment"],
  ['named', "a variable's NAME is not its source — read the assignment"],
  ['doc comment', 'a comment describes intent, not behaviour'],
  ['comment says', 'a comment describes intent, not behaviour'],
  ['memory', 'memory is a hypothesis generator, never an answer'],
  ['remember', 'memory is a hypothesis generator, never an answer'],
  ['recall', 'memory is a hypothesis generator, never an answer'],
  ['assume', 'an assumption is a bug waiting to ship'],
  ['assumed', 'an assumption is a bug waiting to ship'],
  ['presumably', 'an assumption is a bug waiting to ship'],
  ['obviously', 'an assumption is a bug waiting to ship'],
  ['should be', 'state what IS, verified — not what should be'],
  ['report says', 'reports are claims, not proof — verify against the tree'],
  ['agent said', 'reports are claims, not proof — verify against the tree'],
  ['skill says', 'a skill fact about current code is a HYPOTHESIS to verify'],
  ['handoff says', 'handoff docs lag trunk by design — verify against the tree'],
  ['as discussed', 'a conversation is not evidence — cite file:line'],
  ['previous session', 'a conversation is not evidence — cite file:line'],
];

// `path/to/file.ts:185` or `path/to/file.ts:185-195`, optionally backticked
const EVIDENCE_RE = /^`?([^\s`:*][^\s`:]*):(\d+)(?:\s*[-–]\s*(\d+))?`?$/;
const SHA_RE = /Base SHA:\s*`?([0-9a-f]{7,40})`?/i;
const ID_RE = /^P\d+$/;

/* ------------------------------------------------------------------ parsing */

function stripCode(s) {
  return String(s ?? '').replace(/`/g, '').trim();
}

/** Return the [startIdx, endIdx) line range of the section whose heading contains `needle`. */
function sectionRange(lines, needle) {
  const start = lines.findIndex((l) => /^#{1,6}\s/.test(l) && l.includes(needle));
  if (start === -1) return null;
  let end = lines.length;
  const level = (lines[start].match(/^#+/) || ['#'])[0].length;
  for (let i = start + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s/);
    if (m && m[1].length <= level) {
      end = i;
      break;
    }
  }
  return [start, end];
}

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

const isSeparator = (line) => /^\|?[\s:|-]*-{2,}[\s:|-]*\|?$/.test(line.trim());

/** Parse the first markdown table inside a line range. */
function parseTable(lines, from, to) {
  const rows = [];
  let header = null;
  for (let i = from; i < to; i++) {
    const raw = lines[i];
    if (!raw.trim().startsWith('|')) {
      if (header && rows.length) break; // table ended
      continue;
    }
    if (isSeparator(raw)) continue;
    const cells = splitRow(raw);
    if (!header) {
      header = cells.map((c) => stripCode(c).toLowerCase());
      continue;
    }
    rows.push({ cells, line: i + 1 });
  }
  return { header, rows };
}

/* ------------------------------------------------------------------ checking */

function checkSpec(file, opts) {
  const findings = [];
  const add = (level, line, msg, fix) => findings.push({ level, line, msg, fix });

  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    return { file, findings: [{ level: 'ERROR', line: 0, msg: `cannot read: ${e.message}` }] };
  }
  const lines = text.split(/\r?\n/);

  // --- line budget -------------------------------------------------------
  if (opts.maxLines > 0 && lines.length > opts.maxLines) {
    add(
      'ERROR',
      lines.length,
      `spec is ${lines.length} lines, budget is ${opts.maxLines}`,
      'Split the lane or move reference detail into a linked doc. Spec size, not agent ' +
        'judgement, is what pushed three lanes past the context floor.'
    );
  }

  // --- required sections -------------------------------------------------
  const ledgerRange = sectionRange(lines, H_LEDGER);
  const openRange = sectionRange(lines, H_OPEN);
  const preflightRange = sectionRange(lines, H_PREFLIGHT);

  if (!ledgerRange) add('ERROR', 0, `missing a "${H_LEDGER}" section`, 'Copy templates/AGENT_SPEC_TEMPLATE.md.');
  if (!openRange) add('ERROR', 0, `missing a "${H_OPEN}" section`, 'Include it even when empty — write "None." explicitly.');
  if (!preflightRange)
    add('ERROR', 0, `missing a "${H_PREFLIGHT}" section`, "The agent's FIRST output must be the premise re-check.");

  const shaMatch = text.match(SHA_RE);
  if (!shaMatch) {
    add('ERROR', 0, 'no `Base SHA:` declared', 'Re-derive it: git ls-remote origin <trunk>. Never copy a written SHA.');
  }

  if (!ledgerRange) return { file, findings, sha: null };

  // --- table shape -------------------------------------------------------
  const { header, rows } = parseTable(lines, ledgerRange[0], ledgerRange[1]);
  if (!header) {
    add('ERROR', ledgerRange[0] + 1, 'the premise ledger has no table');
    return { file, findings, sha: shaMatch?.[1] ?? null };
  }
  const col = {};
  for (const want of REQUIRED_COLUMNS) {
    const idx = header.findIndex((h) => h === want || h.startsWith(want));
    if (idx === -1) add('ERROR', ledgerRange[0] + 1, `ledger is missing the "${want}" column`);
    col[want] = idx;
  }
  if (Object.values(col).some((v) => v === -1)) return { file, findings, sha: shaMatch?.[1] ?? null };

  if (rows.length === 0) {
    add(
      'ERROR',
      ledgerRange[0] + 1,
      'the premise ledger is empty',
      'A spec with no premises is a spec nobody checked. List what it depends on.'
    );
  }

  const openText = openRange ? lines.slice(openRange[0], openRange[1]).join('\n') : '';
  const seenIds = new Set();

  for (const row of rows) {
    const at = row.line;
    const id = stripCode(row.cells[col.id]);
    const claim = stripCode(row.cells[col.claim]);
    const evidenceRaw = (row.cells[col.evidence] ?? '').trim();
    const evidence = stripCode(evidenceRaw);
    const anchor = (row.cells[col.anchor] ?? '').trim().replace(/^`|`$/g, '');
    const how = stripCode(row.cells[col['how verified']]);
    const status = stripCode(row.cells[col.status]).toUpperCase();
    const tag = id || `row@${at}`;

    if (!ID_RE.test(id)) add('ERROR', at, `${tag}: ID must look like P1, P2 …`);
    else if (seenIds.has(id)) add('ERROR', at, `${tag}: duplicate premise ID`);
    else seenIds.add(id);

    if (!claim) add('ERROR', at, `${tag}: empty claim`);

    if (status !== 'VERIFIED' && status !== 'UNVERIFIED') {
      add('ERROR', at, `${tag}: Status must be VERIFIED or UNVERIFIED, got "${status}"`);
      continue;
    }

    if (status === 'UNVERIFIED') {
      if (!BLANK.has(evidence.toLowerCase())) {
        add(
          'ERROR',
          at,
          `${tag}: UNVERIFIED row carries evidence "${evidence}"`,
          'Either verify it and flip to VERIFIED, or clear the cell to "—".'
        );
      }
      if (!openText.includes(id)) {
        add(
          'ERROR',
          at,
          `${tag}: UNVERIFIED but not listed in ${H_OPEN}`,
          `An unverified premise must reach the agent as a QUESTION, never a conclusion. ` +
            `Add a "${id} — QUESTION: …" line to ${H_OPEN}.`
        );
      } else if (!/QUESTION/i.test(openText)) {
        add('ERROR', at, `${tag}: ${H_OPEN} must phrase open premises as QUESTION: …`);
      }
      continue;
    }

    // --- VERIFIED rows ---------------------------------------------------
    const m = evidence.match(EVIDENCE_RE);
    if (!m) {
      add(
        'ERROR',
        at,
        `${tag}: VERIFIED needs \`path:line\` evidence, got "${evidence || '(blank)'}"`,
        'A bare filename is not evidence. Cite the lines you actually read.'
      );
    }

    if (!how) {
      add('ERROR', at, `${tag}: "How verified" is empty`);
    } else {
      const lower = how.toLowerCase();
      for (const [needle, why] of WEASEL) {
        if (lower.includes(needle)) {
          add('ERROR', at, `${tag}: "How verified" says "${needle}" — ${why}`);
          break;
        }
      }
    }

    if (!anchor || BLANK.has(anchor.toLowerCase())) {
      add(
        opts.strictAnchor ? 'ERROR' : 'WARN',
        at,
        `${tag}: no anchor string`,
        'An anchor is the only thing that survives the lines moving. Add a literal substring.'
      );
    }

    // --- resolve against a real tree -------------------------------------
    if (opts.worktree && m) {
      const [, relPath, startS, endS] = m;
      const abs = path.resolve(opts.worktree, relPath);
      if (!fs.existsSync(abs)) {
        add(
          'ERROR',
          at,
          `${tag}: ${relPath} does not exist in the worktree`,
          'An empty or surprising result indicts your command, not the world — but verify in a ' +
            'CLEAN worktree (git worktree add --detach), never a dirty tree that keeps ghosts.'
        );
        continue;
      }
      const fileLines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
      const start = Number(startS);
      const end = endS ? Number(endS) : start;
      if (end > fileLines.length) {
        add('ERROR', at, `${tag}: ${relPath} has ${fileLines.length} lines, evidence cites ${end}`);
        continue;
      }
      if (anchor && !BLANK.has(anchor.toLowerCase())) {
        const pad = 3;
        const window = fileLines.slice(Math.max(0, start - 1 - pad), Math.min(fileLines.length, end + pad)).join('\n');
        if (!window.includes(anchor)) {
          add(
            'ERROR',
            at,
            `${tag}: anchor ${JSON.stringify(anchor)} not found near ${relPath}:${startS}`,
            'The premise has ROTTED — the lines moved or the code changed. Re-read and re-cite ' +
              'before this spec goes out.'
          );
        }
      }
    }
  }

  return { file, findings, sha: shaMatch?.[1] ?? null, premises: rows.length };
}

/* ------------------------------------------------------------------ main */

function main(argv) {
  const files = [];
  const opts = { worktree: null, maxLines: 250, strictAnchor: false, json: false };

  for (const arg of argv) {
    if (arg === '--json') opts.json = true;
    else if (arg === '--strict-anchor') opts.strictAnchor = true;
    else if (arg.startsWith('--worktree=')) opts.worktree = arg.slice(11);
    else if (arg.startsWith('--max-lines=')) opts.maxLines = Number(arg.slice(12));
    else if (arg === '-h' || arg === '--help') {
      console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
      return 0;
    } else if (arg.startsWith('-')) {
      console.error(`unknown flag: ${arg}`);
      return 2;
    } else files.push(arg);
  }

  // THE SILENT SKIP: no input is a FAILURE, never a quiet pass.
  const existing = files.filter((f) => fs.existsSync(f));
  if (existing.length === 0) {
    console.error(
      'premise-ledger: FAIL — no spec files found.\n' +
        '  A check that can silently not-run is a check you do not have.\n' +
        '  Pass at least one spec path, or remove this gate deliberately.'
    );
    return 1;
  }
  if (opts.worktree && !fs.existsSync(opts.worktree)) {
    console.error(`premise-ledger: FAIL — worktree not found: ${opts.worktree}`);
    return 1;
  }
  if (!opts.worktree) {
    console.error(
      'premise-ledger: NOTE — running without --worktree. Evidence FORMAT is checked, ' +
        'but not whether it is still TRUE. Pass --worktree=DIR to catch rotted premises.'
    );
  }

  const results = existing.map((f) => checkSpec(f, opts));

  if (opts.json) {
    console.log(JSON.stringify({ results, opts: { ...opts, json: undefined } }, null, 2));
  } else {
    for (const r of results) {
      const errors = r.findings.filter((f) => f.level === 'ERROR');
      const warns = r.findings.filter((f) => f.level === 'WARN');
      const verdict = errors.length ? 'FAIL' : 'PASS';
      console.log(`\n${verdict}  ${r.file}` + (r.premises != null ? `  (${r.premises} premises)` : ''));
      for (const f of r.findings) {
        console.log(`  ${f.level === 'ERROR' ? '✗' : '!'} L${f.line}: ${f.msg}`);
        if (f.fix) console.log(`      → ${f.fix}`);
      }
      if (!errors.length && !warns.length) console.log('  ✓ ledger complete, evidence well-formed');
    }
  }

  const failed = results.filter((r) => r.findings.some((f) => f.level === 'ERROR'));
  if (!opts.json) {
    console.log(
      `\npremise-ledger: ${results.length - failed.length}/${results.length} specs passed` +
        (opts.worktree ? ` (evidence resolved against ${opts.worktree})` : '')
    );
  }
  return failed.length ? 1 : 0;
}

process.exit(main(process.argv.slice(2)));
