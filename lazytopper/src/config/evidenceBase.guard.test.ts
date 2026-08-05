import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";

import { EVIDENCE_BASE_YEARS, EVIDENCE_BASE_YEARS_WORD } from "./evidenceBase";

/**
 * [FU-EVIDENCE-BASE-CLAIM-INCONSISTENT] — no student-facing surface may carry a
 * figure that competes with the authoritative evidence base.
 *
 * Trunk shipped THREE different numbers for the SAME corpus:
 *   • ExamTrendsRanked      "Ten years of real CBSE papers"
 *   • HighlyProbableQuestions "drawn from 4 years of papers"
 *   • Intent                "9 years of board data visualised"
 * Owner ruling: TEN is authoritative. Every surface now interpolates the constant.
 *
 * This is a SOURCE scan rather than a render assertion on purpose: the drift can
 * appear on any surface, including ones that are hard to mount or (like Intent)
 * currently unreachable. A render test only guards the surfaces it happens to mount.
 *
 * ★ Two controls, because a scanner that visits nothing passes vacuously:
 *   1. `scan()` is run over a synthetic source containing a competing figure and
 *      MUST flag it — proving the pattern can fire.
 *   2. The real sweep asserts it visited a plausible number of files and found the
 *      known real occurrences — proving the pathspec matched something.
 */

const SRC = resolve(process.cwd(), "src");
const SCANNED_DIRS = [join(SRC, "pages"), join(SRC, "components")];

/**
 * Matches an evidence-base claim and captures the quantifier immediately before
 * "years of <corpus>". Deliberately anchored on the CORPUS nouns so unrelated copy
 * ("at least 13 years old", "months per board year") cannot match.
 */
const CLAIM = /([^\s{}$]+)\s*\}?\s*years?\s+of\s+(?:real\s+CBSE\s+papers|papers|board\s+data|CBSE\s+board\s+exam\s+data)/gi;

/** Quantifiers that are acceptable: the constant by name, or the authoritative literal. */
const ALLOWED = new Set([
  "EVIDENCE_BASE_YEARS",
  "EVIDENCE_BASE_YEARS_WORD",
  String(EVIDENCE_BASE_YEARS), // "10" — LegalPage's owner-authored policy prose
  EVIDENCE_BASE_YEARS_WORD, // "Ten"
]);

type Hit = { file: string; quantifier: string; excerpt: string };

function scan(source: string, file: string): Hit[] {
  const hits: Hit[] = [];
  CLAIM.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CLAIM.exec(source)) !== null) {
    // Strip any interpolation punctuation so `{EVIDENCE_BASE_YEARS}` and
    // `${EVIDENCE_BASE_YEARS}` both reduce to the bare identifier.
    const quantifier = m[1].replace(/[${}`'">]/g, "").trim();
    hits.push({ file, quantifier, excerpt: m[0].trim() });
  }
  return hits;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const files = SCANNED_DIRS.flatMap((d) => walk(d));
const allHits = files.flatMap((f) => scan(readFileSync(f, "utf8"), relative(SRC, f)));

describe("CONTROL — the scanner can actually find a competing figure", () => {
  it("flags a synthetic '4 years of papers' claim", () => {
    const hits = scan(
      "<p>drawn from 4 years of papers, the official blueprint</p>",
      "synthetic.tsx",
    );
    expect(hits).toHaveLength(1);
    expect(hits[0].quantifier).toBe("4");
    expect(ALLOWED.has(hits[0].quantifier)).toBe(false);
  });

  it("flags a synthetic '9 years of board data' claim", () => {
    const hits = scan("sub: `9 years of board data visualised`", "synthetic.tsx");
    expect(hits).toHaveLength(1);
    expect(hits[0].quantifier).toBe("9");
  });

  it("does NOT flag unrelated year copy (no false positives)", () => {
    expect(scan("You must be at least 13 years old to use LazyTopper.", "x.tsx")).toHaveLength(0);
    expect(scan("MONTHS_PER_BOARD_YEAR = 10;", "x.tsx")).toHaveLength(0);
  });
});

describe("CONTROL — the sweep actually visited the source tree", () => {
  it("scanned a plausible number of files", () => {
    // A pathspec that matches nothing yields a vacuous PASS. Pin a floor.
    expect(files.length).toBeGreaterThan(50);
  });

  it("found the real evidence-base claims that exist on trunk", () => {
    expect(allHits.length).toBeGreaterThanOrEqual(3);
  });
});

describe("no student-facing surface carries a competing evidence-base figure", () => {
  it("every claim reads the authoritative constant (or the authoritative literal)", () => {
    const offenders = allHits.filter((h) => !ALLOWED.has(h.quantifier));
    expect(
      offenders.map((o) => `${o.file}: "${o.excerpt}"`),
      "competing evidence-base figures found",
    ).toEqual([]);
  });
});
