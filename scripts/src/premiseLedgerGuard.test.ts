/**
 * premiseLedgerGuard.test.ts
 *
 * Pins the DECISION of what counts as an ANCHORED spec, for
 * scripts/premise_ledger_check.mjs.
 *
 * WHY THIS EXISTS
 * The checker is invoked from no workflow and no other test — only from prose in
 * ops/AGENT_STANDING_RULES.md and from the template's own §0c.0. This file is therefore
 * the ONLY thing exercising that script in CI, which is why every case below is
 * mutation-verified rather than merely written.
 *
 * Coverage:
 *   1. The template passes under --template (the all-zero SHA is its placeholder).
 *   2. The template FAILS without --template, and the message names the zero SHA.
 *      Before this guard, forty zeros satisfied the presence check and an unanchored
 *      spec sailed through — that was the hole.
 *   3. A real spec (real 40-hex SHA, well-formed ledger) still passes: the zero-SHA
 *      rejection must not become a blanket refusal.
 *   3b. The same, resolved against a real worktree with --strict-anchor, citing a file
 *      OUTSIDE the checker. §3(d) of the GATE-1 spec could not assert this, because the
 *      spec it named cites the very file this lane edits, so its own anchor rots on
 *      contact. Pinned here instead, where it cannot rot the same way.
 *   4. The remediation path named in the source RESOLVES ON DISK. It sits inside an
 *      error branch, so no passing run can ever reach it — it named a nonexistent
 *      `templates/` directory for exactly that reason. Parsed out of the source, never
 *      hardcoded, or this assertion rots the same way the string did.
 *   5. No input files is a FAILURE, not a quiet pass (the silent-skip law).
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// ── Repo paths ──────────────────────────────────────────────────────────────
const REPO_ROOT = join(fileURLToPath(import.meta.url), "../../..");
const CHECKER = join(REPO_ROOT, "scripts/premise_ledger_check.mjs");
const TEMPLATE = join(REPO_ROOT, "ops/AGENT_SPEC_TEMPLATE.md");

const checkerSource = readFileSync(CHECKER, "utf8");

interface RunResult {
  status: number;
  output: string;
}

/** Invoke the checker exactly as an agent would, and merge both streams. */
function runChecker(args: string[]): RunResult {
  const r = spawnSync(process.execPath, [CHECKER, ...args], {
    encoding: "utf8",
    cwd: REPO_ROOT,
  });
  return { status: r.status ?? -1, output: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

/**
 * A minimal spec that satisfies every structural rule the checker enforces.
 * `sha` and `evidence`/`anchor` are parameterised so one builder serves cases 3 and 3b.
 */
function fixtureSpec(sha: string, evidence: string, anchor: string): string {
  return [
    "# LazyTopper — Agent Task: FIXTURE",
    "",
    "## §0 PREMISE LEDGER",
    "",
    `Base SHA: \`${sha}\``,
    "",
    "| ID | Claim | Evidence | Anchor | How verified | Status |",
    "|----|-------|----------|--------|--------------|--------|",
    `| P1 | a claim the fixture depends on | \`${evidence}\` | \`${anchor}\` | read the lines in a clean extract @ base SHA | VERIFIED |`,
    "",
    "## §0b OPEN PREMISES — YOU MUST ESTABLISH THESE BEFORE WORK",
    "",
    "None.",
    "",
    "## §0c PRE-FLIGHT — BEFORE ANY EDIT",
    "",
    "Run the premise gate first.",
    "",
  ].join("\n");
}

describe("premise_ledger_check.mjs — what counts as an anchored spec", () => {
  test("1. the template passes under --template", () => {
    const r = runChecker([TEMPLATE, "--template", "--strict-anchor"]);
    assert.equal(r.status, 0, `expected exit 0 under --template, got ${r.status}:\n${r.output}`);
  });

  test("2. the template FAILS without --template, naming the zero SHA", () => {
    const r = runChecker([TEMPLATE, "--strict-anchor"]);
    assert.equal(r.status, 1, `expected exit 1 without --template, got ${r.status}:\n${r.output}`);
    assert.match(
      r.output,
      /0{40}/,
      `the refusal must name the all-zero SHA it rejected; got:\n${r.output}`
    );
  });

  test("3. a real spec with a real 40-hex SHA still passes", () => {
    const dir = mkdtempSync(join(tmpdir(), "premise-ledger-"));
    try {
      const spec = join(dir, "REAL.md");
      writeFileSync(
        spec,
        fixtureSpec("97f39197974b2865ead913200c91765e0a75ea0a", "lib/example.ts:10", "example"),
        "utf8"
      );
      const r = runChecker([spec, "--strict-anchor"]);
      assert.equal(r.status, 0, `a real spec must still pass, got ${r.status}:\n${r.output}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("3b. a real spec resolves against a real worktree with --strict-anchor", () => {
    const dir = mkdtempSync(join(tmpdir(), "premise-ledger-"));
    try {
      const spec = join(dir, "REAL_ANCHORED.md");
      writeFileSync(
        spec,
        fixtureSpec(
          "97f39197974b2865ead913200c91765e0a75ea0a",
          ".github/CODEOWNERS:31",
          "/scripts/ops/"
        ),
        "utf8"
      );
      const r = runChecker([spec, `--worktree=${REPO_ROOT}`, "--strict-anchor"]);
      assert.equal(
        r.status,
        0,
        `a spec whose anchor still resolves must pass, got ${r.status}:\n${r.output}`
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("4. the remediation path named in the source resolves on disk", () => {
    // Parsed from the source, NOT hardcoded — a hardcoded copy would rot in lockstep
    // with the string it is supposed to be checking.
    const m = checkerSource.match(/Copy\s+(\S+\.md)\./);
    assert.ok(
      m,
      "could not find the `Copy <path>.md.` remediation string in the checker source — " +
        "if it was reworded, update this parser so the assertion keeps biting"
    );
    const named = m![1];
    assert.ok(
      existsSync(join(REPO_ROOT, named)),
      `the remediation tells the author to copy "${named}", which does not exist in the repo. ` +
        `This string sits in an error branch no passing run reaches, so only this test catches it.`
    );
  });

  test("5. no input files is a FAILURE, not a quiet pass", () => {
    const r = runChecker([]);
    assert.equal(r.status, 1, `the silent-skip law requires exit 1, got ${r.status}:\n${r.output}`);
  });

  // ── Row splitting and coverage (CHECKER-FIX) ──────────────────────────────
  //
  // These four pin the two defects that were actively blocking lanes: a row was split on
  // EVERY pipe, so an anchor containing one shifted every column to its right and the
  // Status column reported an anchor fragment; and a row rejected on SHAPE was never
  // anchor-checked, with nothing in the output saying so.
  //
  // The fixtures cite a file written into the SAME temp dir and resolved with
  // --worktree=<dir>. Deliberate: a fixture citing a repo file would rot the first time
  // that file's lines moved — which is precisely how this lane's own spec rotted.

  /** Build a one-premise spec citing `target.txt:1`, with the anchor cell supplied raw. */
  function specCiting(anchorCell: string, evidence = "target.txt:1"): string {
    return [
      "# LazyTopper — Agent Task: FIXTURE",
      "",
      "## §0 PREMISE LEDGER",
      "",
      "Base SHA: `97f39197974b2865ead913200c91765e0a75ea0a`",
      "",
      "| ID | Claim | Evidence | Anchor | How verified | Status |",
      "|----|-------|----------|--------|--------------|--------|",
      `| P1 | a claim the fixture depends on | \`${evidence}\` | ${anchorCell} | read the lines in a clean extract @ base SHA | VERIFIED |`,
      "",
      "## §0b OPEN PREMISES — YOU MUST ESTABLISH THESE BEFORE WORK",
      "",
      "None.",
      "",
      "## §0c PRE-FLIGHT — BEFORE ANY EDIT",
      "",
      "Run the premise gate first.",
      "",
    ].join("\n");
  }

  /** Write spec + target into a throwaway dir and run the checker against that worktree. */
  function runInFixture(anchorCell: string, targetLine: string, evidence?: string): RunResult {
    const dir = mkdtempSync(join(tmpdir(), "premise-ledger-"));
    try {
      writeFileSync(join(dir, "target.txt"), `${targetLine}\n`, "utf8");
      const spec = join(dir, "SPEC.md");
      writeFileSync(spec, specCiting(anchorCell, evidence), "utf8");
      return runChecker([spec, `--worktree=${dir}`, "--strict-anchor"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  test("6. an anchor containing an ESCAPED pipe keeps the row's cell count and is unescaped", () => {
    // The anchor cell holds `a \| b`; the target file holds the literal `a | b`.
    // Under the old splitter this row split into 8 cells, the Status column read an
    // anchor fragment, and the row was rejected with a bogus status value.
    const r = runInFixture("`a \\| b`", "a | b");
    assert.equal(
      r.status,
      0,
      `a row whose anchor carries an escaped pipe must parse and resolve, got ${r.status}:\n${r.output}`
    );
    assert.match(
      r.output,
      /coverage: 1\/1 claim rows had their anchor RESOLVED/,
      `the escaped pipe must be unescaped to "a | b" and the anchor RESOLVED; got:\n${r.output}`
    );
    // The bogus-status symptom that sent two authors hunting the wrong defect is gone.
    assert.doesNotMatch(
      r.output,
      /Status must be VERIFIED or UNVERIFIED/,
      `the row must not be misread as a bad Status; got:\n${r.output}`
    );
  });

  test("7. a row whose cell count differs from the header's is REJECTED, naming the mismatch", () => {
    // A BARE pipe is still a delimiter — that is the point. The row now splits into more
    // cells than the header has, and must be refused BY NAME rather than silently
    // mis-assigning every column to its right.
    const r = runInFixture("`a | b`", "a | b");
    assert.equal(r.status, 1, `a mis-shaped row must fail, got ${r.status}:\n${r.output}`);
    assert.match(
      r.output,
      /P1: row has \d+ cells, header has 6 — columns cannot be assigned/,
      `the rejection must NAME the cell-count mismatch, not report a bogus Status; got:\n${r.output}`
    );
    // A shape rejection is UNCHECKED, and must say so distinctly from an anchor failure.
    assert.match(
      r.output,
      /unchecked: P1 \(L9: rejected on SHAPE — anchor never resolved\)/,
      `a row rejected on SHAPE must be listed as UNCHECKED by name; got:\n${r.output}`
    );
  });

  test("8. REGRESSION: a row with no pipes behaves exactly as before", () => {
    // The most important case in this block. The fix must be invisible to every ledger
    // that never contained a pipe — which is nearly all of them.
    const r = runInFixture("`plain anchor text`", "plain anchor text");
    assert.equal(r.status, 0, `an ordinary pipe-free row must still pass, got ${r.status}:\n${r.output}`);
    assert.match(
      r.output,
      /✓ ledger complete, evidence well-formed/,
      `a clean pipe-free ledger must still report complete; got:\n${r.output}`
    );
    assert.match(
      r.output,
      /coverage: 1\/1 claim rows had their anchor RESOLVED · 0 UNCHECKED/,
      `a clean spec must report zero UNCHECKED rows; got:\n${r.output}`
    );
  });

  test("9. the coverage line reports resolved vs unchecked, and NAMES the unchecked rows", () => {
    // An instrument must declare what it EXAMINED, not only its verdict. Here the cited
    // file does not exist, so the anchor is never resolved — and the run must SAY so
    // rather than leaving the reader to assume the anchor was checked.
    const r = runInFixture("`never looked at`", "irrelevant", "absent.txt:1");
    assert.equal(r.status, 1, `a missing cited file must fail, got ${r.status}:\n${r.output}`);
    assert.match(
      r.output,
      /coverage: 0\/1 claim rows had their anchor RESOLVED · 1 UNCHECKED/,
      `the coverage line must report 0 resolved and 1 unchecked; got:\n${r.output}`
    );
    assert.match(
      r.output,
      /unchecked: P1 \(L9: cited file missing — anchor never resolved\)/,
      `the unchecked row must be NAMED with its reason; got:\n${r.output}`
    );
  });
});
