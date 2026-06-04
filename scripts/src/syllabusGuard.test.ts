import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  scanFile,
  scanSurfaceFile,
  scanContentForPhrases,
  SURFACE_BANNED_PHRASES,
} from "./syllabusGuard.js";

const tmp = join(tmpdir(), `syllabus-guard-test-${process.pid}`);
mkdirSync(tmp, { recursive: true });

function fixture(name: string, content: string): string {
  const filePath = join(tmp, name);
  writeFileSync(filePath, content, "utf-8");
  return filePath;
}

describe("scanFile — banned subtopic detection", () => {
  test("detects a single banned subtopic in double-quoted form", () => {
    const file = fixture(
      "evolution-q.ts",
      `export const q = { subtopic: "Evolution", question: "What is natural selection?" };`
    );
    const violations = scanFile(file, ["Evolution"]);
    assert.equal(violations.length, 1);
    assert.equal(violations[0].subtopic, "Evolution");
    assert.equal(violations[0].matchCount, 1);
  });

  test("detects a banned subtopic in single-quoted form", () => {
    const file = fixture(
      "fossil-q.ts",
      `export const q = { subtopic: 'Fossil', question: "Describe fossil formation." };`
    );
    const violations = scanFile(file, ["Fossil"]);
    assert.equal(violations.length, 1);
    assert.equal(violations[0].subtopic, "Fossil");
  });

  test("detects a banned subtopic in template-literal form", () => {
    const file = fixture(
      "solar-q.ts",
      "export const q = { subtopic: `Solar Energy`, question: 'Explain solar panels.' };"
    );
    const violations = scanFile(file, ["Solar Energy"]);
    assert.equal(violations.length, 1);
    assert.equal(violations[0].subtopic, "Solar Energy");
  });

  test("match is case-insensitive", () => {
    const file = fixture(
      "ogive-q.ts",
      `export const q = { subtopic: "ogive", question: "Draw an ogive." };`
    );
    const violations = scanFile(file, ["Ogive"]);
    assert.equal(violations.length, 1);
    assert.equal(violations[0].subtopic, "ogive");
  });

  test("counts multiple occurrences of the same banned subtopic", () => {
    const file = fixture(
      "multi-evolution-q.ts",
      [
        `{ subtopic: "Evolution", question: "Q1" }`,
        `{ subtopic: "Evolution", question: "Q2" }`,
        `{ subtopic: "Evolution", question: "Q3" }`,
      ].join("\n")
    );
    const violations = scanFile(file, ["Evolution"]);
    assert.equal(violations.length, 1);
    assert.equal(violations[0].matchCount, 3);
  });

  test("detects multiple distinct banned subtopics in one file", () => {
    const file = fixture(
      "mixed-banned.ts",
      [
        `{ subtopic: "Evolution", question: "Q1" }`,
        `{ subtopic: "Fossil", question: "Q2" }`,
      ].join("\n")
    );
    const violations = scanFile(file, ["Evolution", "Fossil"]);
    assert.equal(violations.length, 2);
    const subtopics = violations.map((v) => v.subtopic).sort();
    assert.deepEqual(subtopics, ["Evolution", "Fossil"]);
  });

  test("returns no violations for a clean file", () => {
    const file = fixture(
      "clean-q.ts",
      `export const q = { subtopic: "Quadratic Equations", question: "Solve x^2 - 5x + 6 = 0." };`
    );
    const violations = scanFile(file, ["Evolution", "Fossil", "Ogive"]);
    assert.equal(violations.length, 0);
  });

  test("returns no violations for an empty file", () => {
    const file = fixture("empty-q.ts", "");
    const violations = scanFile(file, ["Evolution"]);
    assert.equal(violations.length, 0);
  });

  test("subtopics that contain a banned word as a substring are not flagged (exact match only)", () => {
    const file = fixture(
      "partial-match-q.ts",
      `export const q = { subtopic: "Theory of Evolution by Darwin", question: "Describe Darwin's theory." };`
    );
    const violations = scanFile(file, ["Evolution"]);
    assert.equal(violations.length, 0);
  });

  test("file with only non-subtopic fields produces no violations", () => {
    const file = fixture(
      "no-subtopic.ts",
      `export const q = { topic: "Evolution", chapter: "Fossil", question: "Unrelated question." };`
    );
    const violations = scanFile(file, ["Evolution", "Fossil"]);
    assert.equal(violations.length, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BOARD-PREP SURFACE scan (PART C) — curated word-boundary phrase matcher
// ─────────────────────────────────────────────────────────────────────────────

describe("scanContentForPhrases — word-boundary phrase matcher mechanism", () => {
  test("matches a banned phrase as a whole phrase (case-insensitive)", () => {
    const counts = scanContentForPhrases(
      "Principle of electromagnetic induction in a coil.",
      ["Electromagnetic Induction"]
    );
    assert.equal(counts.get("Electromagnetic Induction"), 1);
  });

  test("does NOT match when the phrase is part of a larger word", () => {
    // "Ogive" must not fire on "Ogives" / "Ogivex"
    const counts = scanContentForPhrases("Draw the Ogives for the data.", ["Ogive"]);
    assert.equal(counts.size, 0);
  });

  test("counts multiple occurrences", () => {
    const counts = scanContentForPhrases(
      "Solar Energy and more Solar Energy and yet more solar energy.",
      ["Solar Energy"]
    );
    assert.equal(counts.get("Solar Energy"), 3);
  });

  test("phrases with apostrophes/hyphens match literally", () => {
    const counts = scanContentForPhrases(
      "Use the Cross-Multiplication Method here; also Euclid's Division Lemma.",
      ["Cross-Multiplication Method", "Euclid's Division Lemma"]
    );
    assert.equal(counts.get("Cross-Multiplication Method"), 1);
    assert.equal(counts.get("Euclid's Division Lemma"), 1);
  });
});

// One planted-term test per surface CATEGORY (HPQ, mock, worksheet, practice,
// trends, tutor). Each uses the REAL SURFACE_BANNED_PHRASES list, so these are
// true integration tests of the shipped configuration. Pattern: plant → fails.
describe("board-prep surface scan — a banned phrase is caught in every surface CATEGORY", () => {
  const cases: Array<{ category: string; content: string; expect: string }> = [
    {
      category: "HPQ / predicted-questions",
      content: `{ topicKey: "Magnetic Effects", subtopic: "Electromagnetic Induction", marks: 3 }`,
      expect: "Electromagnetic Induction",
    },
    {
      category: "mock / blueprint engine",
      content: `const SCIENCE_BLUEPRINT = { "Sources of Energy": { sectionD: 1 } };`,
      expect: "Sources of Energy",
    },
    {
      category: "worksheet generator",
      content: `const WORKSHEET_TOPICS = ["Statistics", "Ogive", "Probability"];`,
      expect: "Ogive",
    },
    {
      category: "practice / daily-mix / filters",
      content: `{ chipLabel: "Frustum of a Cone", section: "C" }`,
      expect: "Frustum of a Cone",
    },
    {
      category: "exam-trends / topic metadata",
      content: `{ name: "Natural Selection", marksWeight: 6, trend: "rising" }`,
      expect: "Natural Selection",
    },
    {
      category: "tutor teach-contracts",
      content: `keyIdeas: ["explain evidence for evolution: homologous organs, analogous organs, fossils."]`,
      expect: "Homologous Organs",
    },
  ];

  for (const c of cases) {
    test(`flags "${c.expect}" in ${c.category}`, () => {
      const counts = scanContentForPhrases(c.content, SURFACE_BANNED_PHRASES);
      assert.ok(
        counts.has(c.expect),
        `expected SURFACE_BANNED_PHRASES to flag "${c.expect}" in ${c.category} content`
      );
    });
  }
});

// TWO-WAY testing — the PRESERVED, board-ASSESSED in-syllabus terms must NEVER
// trip the guard. These are correctness-critical: an over-broad ban here would
// be the same class of bug as the step-deviation / reproduction errors.
describe("board-prep surface scan — PRESERVED in-syllabus terms are NEVER flagged (two-way)", () => {
  const preserved: string[] = [
    "Step Deviation Method",
    "Step Deviation",
    "Mean (Step Deviation)",
    "Heredity",
    "Mendel",
    "Mendel's Laws",
    "Mendel's contribution",
    "Laws of Inheritance",
    "Inheritance of Traits",
    "Inherited Traits", // Mendelian inheritance prose — distinct from evolution's "Acquired and Inherited Traits"
    "Sex Determination",
    "reproductive health",
    "need and methods of family planning",
    "safe sex vs HIV/AIDS",
    "child bearing and women's health",
    "Our Environment",
    "homologous series", // Carbon chemistry — distinct from evolution's "homologous organs"
  ];

  for (const term of preserved) {
    test(`"${term}" does NOT trip the real SURFACE_BANNED_PHRASES list`, () => {
      const counts = scanContentForPhrases(
        `Board content mentioning ${term} in a normal sentence.`,
        SURFACE_BANNED_PHRASES
      );
      assert.equal(
        counts.size,
        0,
        `preserved term "${term}" wrongly matched: ${[...counts.keys()].join(", ")}`
      );
    });
  }

  test("the SURFACE_BANNED_PHRASES list itself contains no preserved term", () => {
    const lowered = new Set(SURFACE_BANNED_PHRASES.map((p) => p.toLowerCase()));
    for (const term of preserved) {
      assert.equal(
        lowered.has(term.toLowerCase()),
        false,
        `preserved term "${term}" must not appear in SURFACE_BANNED_PHRASES`
      );
    }
  });
});

// PRECISION — ambiguous prose and code identifiers must NOT produce false
// positives. These are the exact collisions found in the repo during design
// (gas evolution, evolution of heat, *Generator code identifiers, the
// "Heredity & Evolution" chapter heading).
describe("board-prep surface scan — precision: ambiguous prose / code identifiers do NOT trip", () => {
  const safe: string[] = [
    "Link observations (colour change, gas evolution, precipitate) with reaction type.",
    "POP sets quickly with evolution of heat, so do not apply on skin.",
    "// HEREDITY & EVOLUTION", // chapter-heading comment
    "const worksheetGenerator = makeGenerator(); export const dailyMixGenerator = ...;",
    "An AC generator/dynamo converts mechanical energy.", // bare "generator" must not fire
    `subtopic: "Mean (Step Deviation)"`,
  ];

  for (const content of safe) {
    test(`no false positive on: ${content.slice(0, 48)}…`, () => {
      const counts = scanContentForPhrases(content, SURFACE_BANNED_PHRASES);
      assert.equal(
        counts.size,
        0,
        `unexpected match(es): ${[...counts.keys()].join(", ")}`
      );
    });
  }
});

// Exercise the file-reading path of scanSurfaceFile end-to-end.
describe("scanSurfaceFile — reads a file and reports phrase violations", () => {
  test("flags a planted banned phrase in a fixture file; clean fixture passes", () => {
    const dirty = fixture(
      "surface-dirty.ts",
      `export const trends = [{ name: "Periodic Classification", marks: 4 }];`
    );
    const dirtyV = scanSurfaceFile(dirty, SURFACE_BANNED_PHRASES);
    assert.equal(dirtyV.length, 1);
    assert.equal(dirtyV[0].subtopic, "Periodic Classification");

    const clean = fixture(
      "surface-clean.ts",
      `export const trends = [{ name: "Heredity", marks: 4 }, { name: "Our Environment", marks: 5 }];`
    );
    const cleanV = scanSurfaceFile(clean, SURFACE_BANNED_PHRASES);
    assert.equal(cleanV.length, 0);
  });
});

process.on("exit", () => {
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch {
  }
});
