// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/**
 * GUARD — IMPQ-RENAME-1 (owner rulings, 12 Oct 2026; DECISION 116 on #973).
 *
 * The feature at `/highly-probable/...` is called "Important Questions" everywhere a
 * student sees it. "Predicted" reads as a promise about the 2027 paper, and the search
 * titles and ads already say "Important Questions". This file fails if the old NAMES come
 * back as copy.
 *
 * What it scans:
 * - every non-test source file under `src/pages` and `src/components`;
 * - the three other live files that carried the name (`App.tsx`, the command palette
 *   config, the Desktop home destinations).
 *
 * Comments are stripped first, so a comment that records the old name (a dated rationale)
 * is fine. Identifiers are not matched, because every pattern below contains a space or a
 * bracket and no identifier can.
 *
 * Unchanged on purpose: URLs (`/highly-probable`), query keys (`source=hpq`), identifiers,
 * event and storage names.
 */

const SRC = resolve(__dirname, "..");

const OLD_NAMES: readonly RegExp[] = [
  /predicted question/i, // "Predicted Questions", "predicted questions", "predicted-question" excluded below
  /predicted-question/i,
  /Predicted \(HPQs\)/,
  /Predicted Qs/,
  /high-probability question/i,
  /highly probable/i,
];

/**
 * Files deliberately NOT held to the rule, each with its reason (IMPQ-RENAME-1 P16).
 * A new entry needs the same: a reason a student cannot see the copy.
 */
const NOT_STUDENT_VISIBLE: Readonly<Record<string, string>> = {
  // The /mock-paper/:slug route is dead: App.tsx says so where it is declared, so
  // MockPaper is unreachable in the live product.
  "pages/MockPaper.tsx": "unreachable route (dead /mock-paper/:slug)",
};
const NOT_STUDENT_VISIBLE_DIRS: readonly string[] = [
  "pages/admin/", // the admin console: staff only, never a student
];

const EXTRA_FILES = ["App.tsx", "services/commandPaletteConfig.ts", "lib/desktop/homeDestinations.tsx"];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(name) && !/\.test\.|\.spec\./.test(name)) out.push(full);
  }
  return out;
}

/** Source text with block and line comments removed (a `//` inside `https://` is kept). */
function codeOnly(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function offenders(files: readonly string[]): string[] {
  const hits: string[] = [];
  for (const file of files) {
    const rel = relative(SRC, file).replace(/\\/g, "/");
    if (NOT_STUDENT_VISIBLE[rel] || NOT_STUDENT_VISIBLE_DIRS.some((d) => rel.startsWith(d))) continue;
    codeOnly(readFileSync(file, "utf8"))
      .split("\n")
      .forEach((line, i) => {
        // The command palette's search ALIASES (`quickActionKeywords`, one `'id': [...]`
        // array per action) are matched against what a student types and never shown,
        // so "hpq" / "highly probable" stay there on purpose (IMPQ-RENAME-1 P16).
        if (rel === "services/commandPaletteConfig.ts" && /^\s*'[\w-]+':\s*\[/.test(line)) return;
        for (const re of OLD_NAMES) if (re.test(line)) hits.push(`${rel}:${i + 1}: ${line.trim().slice(0, 120)}`);
      });
  }
  return hits;
}

const SCANNED = [
  ...walk(join(SRC, "pages")),
  ...walk(join(SRC, "components")),
  ...EXTRA_FILES.map((f) => join(SRC, f)),
];

describe("★ IMPQ-RENAME-1 — the feature is 'Important Questions' in every student-visible string", () => {
  it("PRECONDITION: the scan covers the files that carried the old name", () => {
    const rels = SCANNED.map((f) => relative(SRC, f).replace(/\\/g, "/"));
    for (const f of [
      "pages/HighlyProbableQuestions.tsx",
      "pages/desktop/DesktopPracticePage.tsx",
      "pages/ExamTrendsRanked.tsx",
      "components/results/scorecardVariants.ts",
      "App.tsx",
    ]) {
      expect(rels, f).toContain(f);
    }
    expect(SCANNED.length).toBeGreaterThan(100);
  });

  it("no student-visible copy says Predicted Questions, Predicted (HPQs), Predicted Qs, High-Probability Question or highly probable", () => {
    expect(offenders(SCANNED)).toEqual([]);
  });

  it("CONTROL: the scan DOES find the old name in copy, and ignores it in a comment", () => {
    const probe = codeOnly(
      [
        '<MobileSelfChrome title="Predicted Questions">',
        "// a comment may say Predicted Questions",
        "const predictedQuestions = 1; // an identifier is not copy",
      ].join("\n"),
    );
    const lines = probe.split("\n");
    expect(OLD_NAMES.some((re) => re.test(lines[0]))).toBe(true);
    expect(OLD_NAMES.some((re) => re.test(lines[1]))).toBe(false);
    expect(OLD_NAMES.some((re) => re.test(lines[2]))).toBe(false);
  });

  it("the new names are in place where the owner named them", () => {
    const read = (f: string) => readFileSync(join(SRC, f), "utf8");
    expect(read("pages/HighlyProbableQuestions.tsx")).toContain("Class {grade} · {subjectKey} · Important Questions");
    expect(read("pages/PricingPage.tsx")).toContain("Full mocks and important-question sets — real board blueprint");
    expect(read("pages/desktop/DesktopPracticePage.tsx")).toContain(
      "Chapter-wise important questions from ${EVIDENCE_BASE_YEARS} years of CBSE papers.",
    );
    // The URL is unchanged: the feature keeps its address.
    expect(read("App.tsx")).toMatch(/path="\/highly-probable\//);
  });
});
