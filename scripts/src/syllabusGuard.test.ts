import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  scanFile,
  scanSurfaceFile,
  scanContentForPhrases,
  SURFACE_BANNED_PHRASES,
  LABEL_VARIANTS,
  buildSyllabusMatcher,
  collectServedItems,
  countBySurface,
  loadReference,
  loadServedSources,
  matchFreeText,
  matchLabel,
  normaliseLabel,
  referenceItems,
  resolveVariants,
  runRowRules,
  scanServedItems,
  type ServedSources,
} from "./syllabusGuard.js";
import * as G3 from "./syllabusGuard.rows.js";

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
// FU-SYLLABUSGUARD-APOSTROPHE — a banned name that CONTAINS an apostrophe is caught.
// The old value capture `[^"'`]+` stopped at the apostrophe, so "Euclid's Division
// Lemma" was read as "Euclid" and a planted row PASSED. The four names below are
// copied EXACTLY from the bank-level banned lists in syllabusGuard.ts (Maths l.58/60,
// Science l.139/141 at the time of writing).
// ─────────────────────────────────────────────────────────────────────────────

const APOSTROPHE_BANNED = [
  "Euclid's Division Lemma",
  "Euclid's Division Algorithm",
  "Dobereiner's Triads",
  "Mendeleev's Periodic Table",
] as const;

describe("scanFile — banned sub-topics containing an apostrophe (FU-SYLLABUSGUARD-APOSTROPHE)", () => {
  test("the four apostrophe names are real, current banned phrases (not invented for the test)", () => {
    for (const name of APOSTROPHE_BANNED) {
      assert.ok(SURFACE_BANNED_PHRASES.includes(name), `${name} is in SURFACE_BANNED_PHRASES`);
    }
  });

  APOSTROPHE_BANNED.forEach((name, i) => {
    test(`FAIL: planted row with "${name}" in DOUBLE quotes is caught`, () => {
      const file = fixture(
        `apos-dq-${i}.ts`,
        `export const q = { id: "planted-${i}", subtopic: ${JSON.stringify(name)}, question: "Planted." };`
      );
      const violations = scanFile(file, [...APOSTROPHE_BANNED]);
      assert.equal(violations.length, 1);
      assert.equal(violations[0].subtopic, name);
      assert.equal(violations[0].matchCount, 1);
    });

    test(`FAIL: planted row with '${name}' in SINGLE quotes with an escaped apostrophe is caught`, () => {
      const escaped = name.replace(/'/g, "\\'");
      const file = fixture(
        `apos-sq-${i}.ts`,
        `export const q = { id: 'planted-${i}', subtopic: '${escaped}', question: 'Planted.' };`
      );
      assert.ok(file.length > 0 && escaped.includes("\\'"), "fixture really uses an escaped apostrophe");
      const violations = scanFile(file, [...APOSTROPHE_BANNED]);
      assert.equal(violations.length, 1);
      assert.equal(violations[0].subtopic, name, "reported unescaped, as the banned list spells it");
    });
  });

  test("FAIL: a JSON-style quoted key with an apostrophe value is caught", () => {
    const file = fixture(
      "apos-json.ts",
      `export const rows = [{ "subtopic": "Mendeleev's Periodic Table", "marks": 1 }];`
    );
    const violations = scanFile(file, [...APOSTROPHE_BANNED]);
    assert.equal(violations.length, 1);
    assert.equal(violations[0].subtopic, "Mendeleev's Periodic Table");
  });

  test("FAIL: a template-literal value with an apostrophe is caught", () => {
    const file = fixture("apos-tl.ts", "export const q = { subtopic: `Dobereiner's Triads`, question: 'x' };");
    const violations = scanFile(file, [...APOSTROPHE_BANNED]);
    assert.equal(violations.length, 1);
    assert.equal(violations[0].subtopic, "Dobereiner's Triads");
  });

  test("FAIL: an apostrophe row does not hide the next row's banned value (scan resumes correctly)", () => {
    const file = fixture(
      "apos-sequence.ts",
      `export const a = [\n  { subtopic: "Mendel's contribution", q: "ok" },\n  { subtopic: 'Euclid\\'s Division Algorithm', q: "x" },\n  { subtopic: "Euclid's Division Lemma", q: "y" },\n];`
    );
    const violations = scanFile(file, [...APOSTROPHE_BANNED]);
    assert.deepEqual(
      violations.map((v) => v.subtopic).sort(),
      ["Euclid's Division Algorithm", "Euclid's Division Lemma"]
    );
  });

  test("PASS: \"Mendel's contribution\" (RETAINED Heredity, board-assessed 2026-27) is not flagged", () => {
    const file = fixture(
      "apos-mendel.ts",
      `export const a = [\n  { subtopic: "Mendel's contribution" },\n  { subtopic: 'Mendel\\'s contribution' },\n  { subtopic: "Heredity" },\n  { subtopic: "Laws of Inheritance" },\n  { subtopic: "Sex Determination" },\n];`
    );
    const violations = scanFile(file, [...APOSTROPHE_BANNED, ...SURFACE_BANNED_PHRASES]);
    assert.equal(violations.length, 0);
  });

  test("PASS: exact full-string semantics kept: \"Mendel's contribution\" is NOT read as a banned \"Mendel\"", () => {
    // The old capture truncated at the apostrophe, so a list containing a bare "Mendel"
    // would have flagged this RETAINED row. The full value must be compared.
    const file = fixture("apos-mendel-prefix.ts", `export const q = { subtopic: "Mendel's contribution" };`);
    assert.equal(scanFile(file, ["Mendel"]).length, 0);
  });

  test("PASS: an unrelated apostrophe sub-topic (\"Ohm's Law\", \"Pythagoras' theorem\") is not flagged", () => {
    const file = fixture(
      "apos-unrelated.ts",
      `export const a = [{ subtopic: "Ohm's Law" }, { subtopic: 'Pythagoras\\' theorem' }, { subtopic: "Fleming's Left-hand Rule" }];`
    );
    assert.equal(scanFile(file, [...APOSTROPHE_BANNED, ...SURFACE_BANNED_PHRASES]).length, 0);
  });

  test("PASS: a banned name only as a SUBSTRING of a longer apostrophe value is not flagged (exact match)", () => {
    const file = fixture(
      "apos-substring.ts",
      `export const q = { subtopic: "HCF using Euclid's Division Lemma (formative note)" };`
    );
    assert.equal(scanFile(file, [...APOSTROPHE_BANNED]).length, 0);
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

// ═════════════════════════════════════════════════════════════════════════════
// SERVED-SET SCAN (SYLLABUS-FIX-CONTENT PR-3) — Mode 3
// The reference is the ONE module `lazytopper/src/config/syllabus2026-27.ts`; the served
// set is loaded from the real app modules. Plants go in through injected sources, never
// by editing a data file.
// ═════════════════════════════════════════════════════════════════════════════

const REFERENCE = await loadReference();
const MATCHER = buildSyllabusMatcher(REFERENCE);
const SERVED = await loadServedSources();

function scanWith(over: Partial<ServedSources>) {
  return scanServedItems(collectServedItems({ ...SERVED, ...over }), MATCHER);
}

describe("served-set scan — one reference, variants keyed by reference item", () => {
  test("the matcher is built from the reference module and every LABEL_VARIANTS entry resolves to exactly one item", () => {
    const { resolved, errors } = resolveVariants(LABEL_VARIANTS, referenceItems(REFERENCE));
    assert.deepEqual(errors, []);
    assert.equal(resolved.length, LABEL_VARIANTS.length);
    // the reference, not a hand list, supplies the items: OUT + FORMATIVE + whole chapters
    const ids = MATCHER.items.map((i) => i.id);
    for (const id of ["triangles/out[0]", "human-eye-and-colourful-world/out[0]", "magnetic-effects-of-electric-current/formative[0]",
      "heredity/formative[0]", "sources-of-energy/chapter", "management-of-natural-resources/chapter",
      "periodic-classification-of-elements/chapter"]) {
      assert.ok(ids.includes(id), `reference item ${id} missing`);
    }
  });

  test("a variant that points at an item the reference does not have is an ERROR (cannot rot silently)", () => {
    const rotted = [{ key: "triangles", kind: "out" as const, itemStartsWith: "Basic Proportionality Theorem", labels: ["BPT"] }];
    const { errors } = resolveVariants(rotted, referenceItems(REFERENCE));
    assert.equal(errors.length, 1);
    assert.throws(() => buildSyllabusMatcher(REFERENCE, rotted), /resolves to 0 reference items/);
    const missingChapter = [{ key: "sources-of-energy", kind: "out" as const, itemStartsWith: "Solar", labels: ["Solar Cooker"] }];
    assert.throws(() => buildSyllabusMatcher(REFERENCE, missingChapter), /resolves to 0 reference items/);
  });

  test("a free-text phrase must be multi-word", () => {
    const one = [{ key: "statistics", kind: "out" as const, itemStartsWith: "Graphical", labels: [], freeText: ["ogive"] }];
    assert.throws(() => buildSyllabusMatcher(REFERENCE, one), /must be multi-word/);
  });
});

describe("served-set scan — G1 label variants (report §5) are caught, normalised", () => {
  // [label, chapter the label sits in, expected reference item]
  const PINS: [string, string | undefined, string][] = [
    ["Pythagoras Theorem", "triangles", "triangles/out[1]"],
    ["Converse of Pythagoras", "triangles", "triangles/out[1]"],
    ["Areas of Similar Triangles", "triangles", "triangles/out[0]"],
    ["Equations Reducible to a Pair of Linear Equations", "pair-of-linear-equations", "pair-of-linear-equations/out[1]"],
    ["Decimal Expansion(s)", "real-numbers", "real-numbers/out[1]"],
    ["Decimal Expansions", "real-numbers", "real-numbers/out[1]"],
    ["Area of Triangle (from Coordinates)", "coordinate-geometry", "coordinate-geometry/out[0]"],
    ["Complementary Angles", "trigonometry", "trigonometry/out[0]"],
    ["Completing the Square", "quadratic-equations", "quadratic-equations/out[0]"],
    ["Zeroes of Cubic Polynomial", "polynomials", "polynomials/out[0]"],
    ["Electric Motor", "magnetic-effects-of-electric-current", "magnetic-effects-of-electric-current/formative[0]"],
    ["Electromagnetic Induction", "magnetic-effects-of-electric-current", "magnetic-effects-of-electric-current/formative[0]"],
    ["EMI", "magnetic-effects-of-electric-current", "magnetic-effects-of-electric-current/formative[0]"],
    ["Evolution", "heredity", "heredity/formative[0]"],
    ["Sources of Energy", undefined, "sources-of-energy/chapter"],
  ];
  for (const [label, chapter, id] of PINS) {
    test(`"${label}" -> ${id}`, () => {
      assert.equal(matchLabel(label, MATCHER, chapter)?.itemId, id);
    });
  }

  // Spellings no exact-string list contains: case, punctuation, plural, qualifiers.
  const NORMALISED: [string, string | undefined, string][] = [
    ["AREA OF SIMILAR TRIANGLE", "triangles", "triangles/out[0]"],
    ["Areas of similar triangles — problems", "triangles", "triangles/out[0]"],
    ["areas-of-similar-triangles", "triangles", "triangles/out[0]"],
    ["Area of a Triangle (Collinearity Check)", "coordinate-geometry", "coordinate-geometry/out[0]"],
    ["Decimal expansion", "real-numbers", "real-numbers/out[1]"],
    ["Zeros of a cubic polynomial", "polynomials", "polynomials/out[0]"],
    ["Electromagnetic induction (EMI) — Faraday", "magnetic-effects-of-electric-current", "magnetic-effects-of-electric-current/formative[0]"],
    ["Electric motors", "magnetic-effects-of-electric-current", "magnetic-effects-of-electric-current/formative[0]"],
    ["Trigonometric ratios of complementary angles: sin(90° − A)", "trigonometry", "trigonometry/out[0]"],
    ["Colour of the Sun at Sunrise & Sunset", "human-eye-and-colourful-world", "human-eye-and-colourful-world/out[0]"],
  ];
  for (const [label, chapter, id] of NORMALISED) {
    test(`normalised: "${label}" -> ${id}`, () => {
      assert.equal(matchLabel(label, MATCHER, chapter)?.itemId, id);
    });
  }

  test("normaliseLabel folds case, punctuation, plurals, '(s)', possessives and qualifiers", () => {
    assert.equal(normaliseLabel("Decimal Expansion(s)"), normaliseLabel("decimal expansions"));
    assert.equal(normaliseLabel("Area of Triangle (from Coordinates)"), "area of triangle");
    assert.equal(normaliseLabel("Fleming's Right-Hand Rule"), "fleming right hand rule");
    assert.equal(normaliseLabel("Zeroes"), normaliseLabel("zero"));
    assert.equal(normaliseLabel("Döbereiner’s Triads"), "dobereiner triad");
  });
});

describe("served-set scan — IN content is NEVER flagged", () => {
  const IN_LABELS: [string, string | undefined][] = [
    ["Right-Triangle Lengths (a² + b² = c² as a tool)", "triangles"],
    ["Similar Triangles", "triangles"],
    ["Similarity criteria (AA, SAS, SSS)", "triangles"],
    ["SAS Similarity Criterion", "triangles"],
    ["Basic Proportionality Theorem", "triangles"],
    ["Heredity", "heredity"],
    ["Mendel's Contribution", "heredity"],
    ["Laws of Inheritance", "heredity"],
    ["Sex Determination", "heredity"],
    ["Atmospheric Refraction", "human-eye-and-colourful-world"],
    ["Twinkling of Stars", "human-eye-and-colourful-world"],
    ["Advance Sunrise and Delayed Sunset", "human-eye-and-colourful-world"],
    ["Atmospheric refraction (twinkling of stars, advance sunrise, delayed sunset)", "human-eye-and-colourful-world"],
    ["Power of a Lens", "light-reflection-and-refraction"],
    ["Lenses in Contact (P = P1 + P2)", "light-reflection-and-refraction"],
    ["Fleming's Left-Hand Rule (Motor Effect)", "magnetic-effects-of-electric-current"],
    ["Complementary Events", "probability"],
    ["Section Formula", "coordinate-geometry"],
    ["Distance Formula", "coordinate-geometry"],
    ["Area of a Segment", "areas-related-to-circles"],
    ["Area of a segment = (θ/360)×πr² − area of the triangle", "areas-related-to-circles"],
    ["Cubic polynomial", "polynomials"],
    ["Primary Source of Energy in an Ecosystem", "our-environment"],
    ["Pythagorean identities", "trigonometry"],
    ["Pythagoras on radius–tangent right triangle", "circles"],
    // owner ruling 1: the converse used as a TOOL outside Triangles (NCERT Coordinate Geometry Example 1)
    ["converse of Pythagoras", "coordinate-geometry"],
  ];
  for (const [label, chapter] of IN_LABELS) {
    test(`IN label "${label}" passes`, () => {
      assert.equal(matchLabel(label, MATCHER, chapter), null);
    });
  }

  test("a chapterScoped item still fires in its own chapter and where the chapter is unknown", () => {
    assert.equal(matchLabel("converse of Pythagoras", MATCHER, "triangles")?.itemId, "triangles/out[1]");
    assert.equal(matchLabel("converse of Pythagoras", MATCHER, undefined)?.itemId, "triangles/out[1]");
    assert.equal(matchLabel("Area of a triangle", MATCHER, "coordinate-geometry")?.itemId, "coordinate-geometry/out[0]");
  });

  test("OR-LIVE-2 pin: the Triangles notes exclusion statement is NOT teaching — it passes", () => {
    const sentence =
      "The rationalised 2026-27 chapter stops at the SAS criterion - areas of similar triangles and the Pythagoras proofs are no longer in this chapter.";
    assert.deepEqual(matchFreeText(sentence, MATCHER, "triangles"), []);
    // control: the same phrase, teaching, fails
    assert.equal(
      matchFreeText("The ratio of the areas of two similar triangles equals the square of the ratio of their sides.", MATCHER, "triangles")
        .length > 0,
      true,
    );
  });

  test("IN free text passes: atmospheric refraction, twinkling, advance sunrise, blue sky, Mendel", () => {
    for (const t of [
      "Atmospheric refraction explains why stars twinkle and why the Sun is seen about 2 minutes before actual sunrise and 2 minutes after actual sunset.",
      "Advance sunrise, delayed sunset (~2 min)",
      "Scattering explains colour: fine particles scatter shorter (blue) wavelengths more, so the clear sky is blue.",
      "Mendel's experiments with pea plants show how traits are inherited; sex determination in humans is by the father's chromosome.",
      "By Pythagoras, the tangent length is √(d² − r²).",
      "The 'Electric Motor and Generator' interactive is OUT of the trimmed 2026-27 chapter — do not attach it to any concept.",
    ]) {
      assert.deepEqual(matchFreeText(t, MATCHER), [], t);
    }
  });
});

describe("served-set scan — G2/G3 the REAL served set, today", () => {
  test("every surface is loaded and scanned (non-empty)", () => {
    const counts = countBySurface(collectServedItems(SERVED));
    for (const [surface, n] of Object.entries(counts)) assert.ok(n > 0, `${surface} scanned 0 items`);
  });

  test("the bank scanned is the SERVED bank: raw minus WITHHELD_QUESTION_IDS = canonicalQuestionBank", () => {
    const bankRows = new Set(
      collectServedItems(SERVED).filter((s) => s.surface === "bank").map((s) => s.id),
    );
    assert.equal(bankRows.size, SERVED.servedBankLength);
    assert.ok(SERVED.withheldIds.size > 0);
    for (const id of SERVED.withheldIds) assert.ok(!bankRows.has(id), `withheld ${id} was scanned as served`);
  });

  test("TODAY: no OUT / FORMATIVE item is served on any surface", () => {
    const hits = scanServedItems(collectServedItems(SERVED), MATCHER);
    assert.deepEqual(
      hits.map((h) => `${h.surface} ${h.id} ${h.field}: ${h.text.slice(0, 80)} -> ${h.referenceItemId}`),
      [],
    );
  });
});

describe("served-set scan — G4 CONTROLS: a planted OUT row MUST fail", () => {
  const PLANT_BANK = { id: "PLANT-BANK-AREAS-1", topicKey: "triangles", subtopic: "Areas of Similar Triangles" };

  test("CONTROL (i): a planted served bank row with an OUT label variant fails", () => {
    const hits = scanWith({ rawBank: [...SERVED.rawBank, PLANT_BANK] });
    assert.deepEqual(hits.map((h) => [h.surface, h.id, h.referenceItemId]), [["bank", PLANT_BANK.id, "triangles/out[0]"]]);
  });

  test("NEGATIVE CONTROL: the same planted row, withheld, passes", () => {
    const hits = scanWith({
      rawBank: [...SERVED.rawBank, PLANT_BANK],
      withheldIds: new Set([...SERVED.withheldIds, PLANT_BANK.id]),
    });
    assert.deepEqual(hits, []);
  });

  test("CONTROL (ii-a): planted notes text naming the colour of the Sun at sunrise and sunset fails", () => {
    const spec = {
      meta: { topic_key: "human-eye-and-colourful-world" },
      concepts: [{ id: "c-plant", body: "The colour of the Sun at sunrise and sunset is red because blue light is scattered away." }],
    };
    const hits = scanWith({ notes: [...SERVED.notes, { file: "notes/specs/PLANTED.json", spec }] });
    assert.deepEqual(hits.map((h) => [h.surface, h.id, h.field, h.referenceItemId]), [
      ["notes", "notes/specs/PLANTED.json", "concepts[0].body", "human-eye-and-colourful-world/out[0]"],
    ]);
  });

  test("CONTROL (ii-b): planted Topic Hub one-liner naming the colour of the Sun at sunrise fails", () => {
    const base = SERVED.hub.find((h) => h.topic.slug === "human-eye-and-colourful-world")!;
    const planted = {
      ...base,
      boardEssentials: [...base.boardEssentials, { name: "Scattering", oneLineUse: "Explains the colour of the Sun at sunrise." }],
    };
    const hits = scanWith({ hub: SERVED.hub.map((h) => (h === base ? planted : h)) });
    assert.equal(hits.length, 1);
    assert.equal(hits[0].surface, "hub");
    assert.equal(hits[0].referenceItemId, "human-eye-and-colourful-world/out[0]");
  });

  test("CONTROL (iii): a planted tutor-catalogue concept label for an OUT item fails", () => {
    const row = { conceptKey: "plant-emi", topicKey: "magnetic-effects-of-electric-current", conceptLabel: "Electromagnetic Induction" };
    const hits = scanWith({ catalogue: [...SERVED.catalogue, row] });
    assert.deepEqual(hits.map((h) => [h.surface, h.id, h.referenceItemId]), [
      ["catalogue", "plant-emi", "magnetic-effects-of-electric-current/formative[0]"],
    ]);
  });

  test("CONTROL: a planted HPQ row with an OUT label fails", () => {
    const bucket = { topic: "Quadratic Equations", questions: [{ id: "PLANT-HPQ-1", subtopic: "Completing the Square" }] };
    const hits = scanWith({ hpq: [...SERVED.hpq, bucket] });
    assert.deepEqual(hits.map((h) => [h.surface, h.id, h.referenceItemId]), [["hpq", "PLANT-HPQ-1", "quadratic-equations/out[0]"]]);
  });

  test("CONTROL: a planted predicted row and a planted promptD stem fail", () => {
    const pred = { id: "PLANT-PRED-1", topicKey: "Pair of Linear Equations", subtopic: "Equations Reducible to a Pair of Linear Equations" };
    const pack = { topicKey: "statistics", topicName: "Statistics", questions: [{ id: "PLANT-PD-1", text: "Use the cross-multiplication method to solve." }] };
    const hits = scanWith({ predicted: [...SERVED.predicted, pred], promptD: [...SERVED.promptD, pack] });
    assert.deepEqual(hits.map((h) => [h.surface, h.id]).sort(), [["predicted", "PLANT-PRED-1"], ["promptD", "PLANT-PD-1"]]);
  });

  test("CONTROL: a served row in a whole OUT chapter fails on its chapter key", () => {
    const hits = scanWith({ rawBank: [...SERVED.rawBank, { id: "PLANT-SOE-1", topicKey: "sources-of-energy", subtopic: "General" }] });
    assert.deepEqual(hits.map((h) => [h.id, h.referenceItemId]), [["PLANT-SOE-1", "sources-of-energy/chapter"]]);
  });
});

describe("served-set scan — QUICK-FIXES-1 PR-2: the owner's 2026-10-06 rulings (R1–R7 + melting)", () => {
  // One CONTROL per newly-OUT item: a planted SERVED row fails, on the item the ruling encodes.
  const CONTROLS: [string, ServedSources["rawBank"][number], string][] = [
    ["R1 general-prime irrationality", { id: "PLANT-R1", topicKey: "real-numbers", subtopic: "Irrationality of √p" }, "real-numbers/out[2]"],
    ["R2 centroid", { id: "PLANT-R2", topicKey: "coordinate-geometry", subtopic: "Centroid of a Triangle" }, "coordinate-geometry/out[2]"],
    ["R3 combinations of plane figures", { id: "PLANT-R3", topicKey: "areas-related-to-circles", subtopic: "Area of Combinations of Plane Figures" },
      "areas-related-to-circles/out[0]"],
    ["R5 rancidity", { id: "PLANT-R5", topicKey: "chemical-reactions-and-equations", subtopic: "Rancidity" }, "chemical-reactions-and-equations/out[0]"],
    ["R6 naming carboxylic acids", { id: "PLANT-R6", topicKey: "carbon-and-its-compounds", subtopic: "Nomenclature of Carboxylic Acids" },
      "carbon-and-its-compounds/out[0]"],
    ["melting/recasting", { id: "PLANT-MELT", topicKey: "surface-areas-and-volumes", subtopic: "Melting and Recasting" },
      "surface-areas-and-volumes/out[1]"],
  ];
  for (const [name, row, item] of CONTROLS) {
    test(`CONTROL ${name}: a planted served bank row fails`, () => {
      const hits = scanWith({ rawBank: [...SERVED.rawBank, row] });
      assert.deepEqual(hits.map((h) => [h.id, h.referenceItemId]), [[row.id, item]]);
    });
  }

  test("CONTROL: planted promptD stems teaching each newly-OUT item fail (free text)", () => {
    const pack = {
      topicKey: "statistics",
      topicName: "Statistics",
      questions: [
        { id: "PLANT-T1", text: "Show that the square root of every prime number is irrational." },
        { id: "PLANT-T2", text: "Find the centroid of a triangle with vertices (1, 2), (3, 4) and (5, 0)." },
        { id: "PLANT-T3", text: "Find the area of the shaded region using combinations of plane figures: a square with four semicircles." },
        { id: "PLANT-T5", text: "Give two ways to prevent rancidity of food." },
        { id: "PLANT-T6", text: "What does the -oic acid suffix tell you when naming carboxylic acids?" },
      ],
    };
    const sav = {
      topicKey: "surface-areas-and-volumes",
      topicName: "Surface Areas and Volumes",
      questions: [{ id: "PLANT-TM", text: "A metal sphere is melted and recast into a wire." }],
    };
    const hits = scanWith({ promptD: [...SERVED.promptD, pack, sav] });
    assert.deepEqual([...new Set(hits.map((h) => h.id))].sort(), ["PLANT-T1", "PLANT-T2", "PLANT-T3", "PLANT-T5", "PLANT-T6", "PLANT-TM"]);
  });

  test("CONTROL: a planted Topic Hub row naming combinations of plane figures fails", () => {
    const base = SERVED.hub.find((h) => h.topic.slug === "areas-related-to-circles")!;
    const planted = {
      ...base,
      boardEssentials: [...base.boardEssentials, { name: "Area of combinations of plane figures", oneLineUse: "Add or subtract." }],
    };
    const hits = scanWith({ hub: SERVED.hub.map((h) => (h === base ? planted : h)) });
    assert.deepEqual(hits.map((h) => [h.surface, h.referenceItemId]), [["hub", "areas-related-to-circles/out[0]"]]);
  });

  // IN-exception negatives: the rows the rulings keep must pass, planted the same way.
  const IN_ROWS: ServedSources["rawBank"][number][] = [
    // R3: sector/segment with the triangle or square that defines it; vertex sectors; inscribed measures
    { id: "PLANT-IN-R3-1", topicKey: "areas-related-to-circles", subtopic: "Area of a Segment (sector minus its triangle)" },
    { id: "PLANT-IN-R3-2", topicKey: "areas-related-to-circles", subtopic: "Quadrant at the Corner of a Square" },
    { id: "PLANT-IN-R3-3", topicKey: "areas-related-to-circles", subtopic: "Triangle minus Sectors at its Vertices" },
    { id: "PLANT-IN-R3-4", topicKey: "areas-related-to-circles", subtopic: "Circle Inscribed in a Square" },
    // owner Round 2 (Maths Basic counts): rings / annular sectors and a quadrant minus a triangle are IN
    { id: "PLANT-IN-R3-5", topicKey: "areas-related-to-circles", subtopic: "Area of Annulus" },
    { id: "PLANT-IN-R3-6", topicKey: "areas-related-to-circles", subtopic: "Area of a Ring" },
    // R1: √2, √3, √5 and same-method named-prime proofs and expressions
    { id: "PLANT-IN-R1-1", topicKey: "real-numbers", subtopic: "Irrationality of √2, √3, √5" },
    { id: "PLANT-IN-R1-2", topicKey: "real-numbers", subtopic: "Irrationality Proofs" },
    { id: "PLANT-IN-R1-3", topicKey: "real-numbers", subtopic: "Irrationality of 6 − √7" },
    // R6: ethanoic acid's properties, the -COOH group, natural acids
    { id: "PLANT-IN-R6-1", topicKey: "carbon-and-its-compounds", subtopic: "Ethanoic Acid — Properties and Uses" },
    { id: "PLANT-IN-R6-2", topicKey: "carbon-and-its-compounds", subtopic: "Carboxylic Acids" },
    { id: "PLANT-IN-R6-3", topicKey: "acids-bases-and-salts", subtopic: "Natural Acids (methanoic acid in an ant sting)" },
    // R4: the empirical relation, used as a tool
    { id: "PLANT-IN-R4", topicKey: "statistics", subtopic: "Empirical Relation (3 Median = Mode + 2 Mean)" },
    // R5: corrosion stays IN
    { id: "PLANT-IN-R5", topicKey: "metals-and-non-metals", subtopic: "Corrosion and its Prevention" },
  ];
  for (const row of IN_ROWS) {
    test(`IN-exception "${row.subtopic}" passes`, () => {
      assert.deepEqual(scanWith({ rawBank: [...SERVED.rawBank, row] }), []);
    });
  }

  test("IN free text passes: same-method √7 proof, vertex sectors, inscribed measure, ethanoic acid, empirical relation", () => {
    for (const t of [
      "Prove that 6 − √7 is irrational, given that √7 is irrational.",
      "Find the area of the field grazed by three animals tied at the corners of a triangular field.",
      "Find the area of the circle that can be inscribed in a square of side 6 cm.",
      "Ethanoic acid reacts with sodium carbonate to give carbon dioxide.",
      "Use the empirical relation 3 Median = Mode + 2 Mean to find the mode.",
      "Corrosion of iron is prevented by painting or galvanising.",
    ]) {
      assert.deepEqual(matchFreeText(t, MATCHER), [], t);
    }
    // melting is OUT only as Surface Areas and Volumes content: a recast wire in Electricity passes
    assert.deepEqual(matchFreeText("A wire of resistance R is melted and recast to half its length.", MATCHER, "electricity"), []);
    assert.equal(matchFreeText("A sphere is melted and recast into a cone.", MATCHER, "surface-areas-and-volumes").length, 1);
  });
});

describe("served-set scan — legacy Topic Hub datasets are scanned (QUICK-FIXES-1 PR-2, owner Round 2)", () => {
  test("both legacy files are loaded and walked (non-empty)", () => {
    assert.deepEqual(SERVED.legacyHub.map((l) => l.file), [
      "lazytopper/src/data/topicHubContent.ts",
      "lazytopper/src/data/topicHubV2Full.ts",
    ]);
    assert.ok(countBySurface(collectServedItems(SERVED)).legacyHub > 500);
  });

  for (const file of ["lazytopper/src/data/topicHubContent.ts", "lazytopper/src/data/topicHubV2Full.ts"]) {
    test(`CONTROL: planted rancidity teaching in ${file} fails`, () => {
      const planted = SERVED.legacyHub.map((l) =>
        l.file === file
          ? { file, data: [l.data, { topicKey: "chemical-reactions-and-equations", coreIdeas: ["Learn 3–4 points on rusting and rancidity and how to prevent them."] }] }
          : l,
      );
      const hits = scanWith({ legacyHub: planted });
      assert.deepEqual(hits.map((h) => [h.surface, h.id, h.referenceItemId]), [
        ["legacyHub", file, "chemical-reactions-and-equations/out[0]"],
      ]);
    });
  }

  test("CONTROL: a planted legacy definition title for an OUT item fails (label match)", () => {
    const planted = [...SERVED.legacyHub, { file: "PLANTED-LEGACY", data: { definitions: [{ title: "Centroid of a Triangle", description: "x" }] } }];
    const hits = scanWith({ legacyHub: planted });
    assert.deepEqual(hits.map((h) => [h.id, h.referenceItemId]), [["PLANTED-LEGACY", "coordinate-geometry/out[2]"]]);
  });

  test("IN legacy text passes: corrosion and its prevention", () => {
    const planted = [...SERVED.legacyHub, { file: "PLANTED-LEGACY-IN", data: { coreIdeas: ["Effects of oxidation in daily life (rusting / corrosion)."] } }];
    assert.deepEqual(scanWith({ legacyHub: planted }), []);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GUARD-3 (owner order 2026-10-07): row rules over every SERVED row + the ratchet.
// Each rule: a planted CONTROL row that MUST fail and a PASS look-alike. The real
// served set must have no finding outside the baseline / reviewed lists.
// ═════════════════════════════════════════════════════════════════════════════

const TEXT_MATCHER = G3.buildTextMatcher(MATCHER);
const G3_CTX = { textMatcher: TEXT_MATCHER };

/** A planted BANK row, collected through the guard's own served-row path. */
function plantedRow(q: Record<string, unknown>): G3.ServedRow {
  const rows = G3.collectServedRows(
    { rawBank: [{ id: "PLANTED-G3", subject: "maths", marks: 3, format: "Short", ...q }], withheldIds: new Set(), hpq: [], predicted: [] },
    MATCHER.chapterKeys,
  );
  assert.equal(rows.length, 1);
  return rows[0];
}
function findings(q: Record<string, unknown>, rule?: G3.RuleId) {
  const rules = rule ? G3.ROW_RULES.filter((r) => r.id === rule) : G3.ROW_RULES;
  return G3.scanRows([plantedRow(q)], G3_CTX, rules).map((f) => [f.rule, f.verdict, f.matched]);
}

describe("GUARD-3 G2 — served rows: withheld rows are not served, every text field is read", () => {
  test("a withheld row is not collected; a served row is", () => {
    const rows = G3.collectServedRows(
      {
        rawBank: [{ id: "A", topicKey: "statistics", questionText: "x" }, { id: "B", topicKey: "statistics", questionText: "y" }],
        withheldIds: new Set(["A"]),
        hpq: [],
        predicted: [],
      },
      MATCHER.chapterKeys,
    );
    assert.deepEqual(rows.map((r) => r.id), ["B"]);
  });

  test("question text, every option, answer, explanation, solution steps, final answer and hint are read", () => {
    const row = plantedRow({
      questionText: "q", options: ["o1", "o2"], answer: "a", explanation: "e", solutionSteps: ["s1", "s2"], finalAnswer: "f", strategyHint: "h",
    });
    assert.deepEqual(row.fields.map((f) => f.field), [
      "questionText", "options[0]", "options[1]", "answer", "explanation", "solutionSteps[0]", "solutionSteps[1]", "finalAnswer", "strategyHint",
    ]);
  });

  test("an HPQ bucket title maps to its board chapter key", () => {
    assert.equal(G3.chapterKeyForTitle("Arithmetic Progressions", MATCHER.chapterKeys), "arithmetic-progression");
    assert.equal(G3.chapterKeyForTitle("Light – Reflection & Refraction", MATCHER.chapterKeys), "light-reflection-and-refraction");
  });
});

describe("GUARD-3 G3-TEXT — OUT / FORMATIVE phrases in question text, options and solutions", () => {
  test("CONTROL: a planted question teaching the frustum of a cone FAILS", () => {
    assert.deepEqual(
      findings({ topicKey: "surface-areas-and-volumes", questionText: "A bucket is in the form of a frustum of a cone. Find its capacity." }, "G3-TEXT"),
      [["G3-TEXT", "hit", 'surface-areas-and-volumes/out[0]: "frustum of cone"']],
    );
  });
  test("CONTROL: an OUT phrase only in a SOLUTION step FAILS (solutions are scanned)", () => {
    const f = findings(
      { topicKey: "surface-areas-and-volumes", questionText: "Find the radius.", solutionSteps: ["The sphere is melted and recast into a cone, so volumes are equal."] },
      "G3-TEXT",
    );
    assert.deepEqual(f.map((x) => x[1]), ["hit"]);
  });
  test("CONTROL: an OUT phrase that is the KEY option FAILS", () => {
    const f = findings(
      { topicKey: "human-eye-and-colourful-world", marks: 1, format: "MCQ", questionText: "A rainbow is formed by:", options: ["Scattering", "Total internal reflection"], answer: "B" },
      "G3-TEXT",
    );
    assert.deepEqual(f.map((x) => x[1]), ["hit"]);
  });
  test("REVIEW (not a pass): the same phrase only as a WRONG option", () => {
    const f = findings(
      { topicKey: "human-eye-and-colourful-world", marks: 1, format: "MCQ", questionText: "The sky is blue because of:", options: ["Scattering", "Total internal reflection"], answer: "Scattering" },
      "G3-TEXT",
    );
    assert.deepEqual(f.map((x) => x[1]), ["review"]);
  });
  test("CONTROL: a TEXT_SYNONYMS phrase (evolution, FORMATIVE) FAILS", () => {
    const f = findings({ topicKey: "heredity", questionText: "Explain genetic drift with an example." }, "G3-TEXT");
    assert.deepEqual(f, [["G3-TEXT", "hit", 'heredity/formative[0]: "genetic drift"']]);
  });
  test("apostrophe-safe text: curly and straight apostrophes both FAIL for Dobereiner's / Mendeleev's", () => {
    for (const t of ["Dobereiner’s triads group three elements.", "State Mendeleev's periodic law."]) {
      const f = findings({ topicKey: "carbon-and-its-compounds", questionText: t }, "G3-TEXT");
      assert.equal(f.length, 1, t);
      assert.equal(f[0][1], "hit");
    }
  });
  test("PASS: \"Mendel's contribution\" and the RETAINED Heredity content are not flagged (every rule)", () => {
    assert.deepEqual(
      findings({
        topicKey: "heredity",
        questionText: "Describe Mendel's contribution to the laws of inheritance. How is sex determination done in humans?",
        solutionSteps: ["Mendel's contribution: laws of inheritance from pea plants; heredity of traits."],
      }),
      [],
    );
  });
  test("PASS look-alikes fixed on the real served set: solar cooker (Light), biogas plant (Our Environment), section-formula ratio", () => {
    assert.deepEqual(findings({ topicKey: "light-reflection-and-refraction", questionText: "A solar cooker uses a concave mirror." }, "G3-TEXT"), []);
    assert.deepEqual(findings({ topicKey: "our-environment", questionText: "Wet waste can go to compost pits or a biogas plant." }, "G3-TEXT"), []);
    assert.deepEqual(findings({ topicKey: "coordinate-geometry", questionText: "The midpoint divides a line segment in the ratio 1 : 1." }, "G3-TEXT"), []);
  });
  test("a sentence that states the content is excluded is not teaching it", () => {
    assert.deepEqual(
      findings({ topicKey: "surface-areas-and-volumes", questionText: "Note: the frustum of a cone is no longer in this chapter." }, "G3-TEXT"),
      [],
    );
  });
  test("every TEXT_SYNONYMS entry resolves to exactly one reference item; a rotted one is an ERROR", () => {
    assert.deepEqual(G3.synonymTerms(G3.TEXT_SYNONYMS, MATCHER.items).errors, []);
    const bad = G3.synonymTerms([{ key: "real-numbers", kind: "out", itemStartsWith: "No such item", phrases: ["two words"] }], MATCHER.items);
    assert.equal(bad.errors.length, 1);
    assert.throws(
      () => G3.buildTextMatcher(MATCHER, [{ key: "statistics", kind: "out", itemStartsWith: "Graphical", phrases: ["ogive"] }]),
      /multi-word/,
    );
  });
});

describe("GUARD-3 G4 — computable limits", () => {
  test("CONTROL G4-HD-ANGLE: an angle of elevation of 75° FAILS (unicode, LaTeX and 'degrees' forms)", () => {
    for (const a of ["75°", "75^\\circ", "75^{\\circ}", "75 degrees"]) {
      const f = findings(
        { topicKey: "trigonometry", questionText: `The angle of elevation of the top of a tower from a point is ${a}. Find its height.` },
        "G4-HD-ANGLE",
      );
      assert.deepEqual(f, [["G4-HD-ANGLE", "hit", "elevation/depression angle 75°"]], a);
    }
  });
  test("PASS G4-HD-ANGLE: 30°, 45° and 60° (and the 90° of the right angle) pass", () => {
    assert.deepEqual(
      findings({ topicKey: "trigonometry", questionText: "The angles of elevation are 30° and 60°. The tower makes 90° with the ground." }, "G4-HD-ANGLE"),
      [],
    );
  });
  test("REVIEW G4-HD-ANGLE: 'increases by 15°' is a change of angle, not a silent pass", () => {
    const f = findings(
      { topicKey: "trigonometry", questionText: "The angle of elevation is 30°. Moving closer, the angle of elevation increases by 15°." },
      "G4-HD-ANGLE",
    );
    assert.deepEqual(f.map((x) => x[1]), ["review"]);
  });
  test("PASS G4-HD-ANGLE: Trigonometry ratios outside heights and distances are not in scope", () => {
    assert.deepEqual(findings({ topicKey: "trigonometry", questionText: "Evaluate sin 0° + cos 90° + tan 15°." }, "G4-HD-ANGLE"), []);
  });
  test("CONTROL G4-HD-TRIANGLES: three angles of elevation/depression -> REVIEW (never a silent pass)", () => {
    const f = findings(
      {
        topicKey: "trigonometry",
        questionText: "From a point, the angle of depression of the bottom is 60°, and the angles of elevation of the climber and the top are 30° and 45°.",
      },
      "G4-HD-TRIANGLES",
    );
    assert.deepEqual(f, [["G4-HD-TRIANGLES", "review", "3 elevation/depression angles"]]);
  });
  test("PASS G4-HD-TRIANGLES: two right triangles pass", () => {
    assert.deepEqual(
      findings({ topicKey: "trigonometry", questionText: "The angles of elevation of the top of a tower from two points are 30° and 60°." }, "G4-HD-TRIANGLES"),
      [],
    );
  });
  test("CONTROL G4-SEGMENT-ANGLE: a segment with a central angle of 100° FAILS", () => {
    assert.deepEqual(
      findings(
        { topicKey: "areas-related-to-circles", questionText: "A chord subtends 100° at the centre of a circle of radius 7 cm. Find the area of the minor segment." },
        "G4-SEGMENT-ANGLE",
      ),
      [["G4-SEGMENT-ANGLE", "hit", "segment central angle 100°"]],
    );
  });
  test("PASS G4-SEGMENT-ANGLE: 120° segments pass; a 100° SECTOR alone passes (the limit is on segments only)", () => {
    assert.deepEqual(
      findings({ topicKey: "areas-related-to-circles", questionText: "A chord subtends 120° at the centre. Find the area of the minor segment." }, "G4-SEGMENT-ANGLE"),
      [],
    );
    assert.deepEqual(
      findings({ topicKey: "areas-related-to-circles", questionText: "Find the area of a sector of angle 100° of a circle of radius 7 cm." }, "G4-SEGMENT-ANGLE"),
      [],
    );
    assert.deepEqual(
      findings({ topicKey: "coordinate-geometry", questionText: "Find the area of the minor segment cut by the line; the angle is 100°." }, "G4-SEGMENT-ANGLE"),
      [],
    );
  });
  test("REVIEW G4-SEGMENT-ANGLE: a segment-and-sector question with a 100° angle", () => {
    const f = findings(
      { topicKey: "areas-related-to-circles", questionText: "A sector of angle 100° is cut. Find the area of the minor segment of the 90° chord." },
      "G4-SEGMENT-ANGLE",
    );
    assert.deepEqual(f.map((x) => x[1]), ["review"]);
  });
  test("CONTROL G4-BIMODAL: bimodal data in a Statistics question FAILS", () => {
    assert.deepEqual(
      findings({ topicKey: "statistics", questionText: "The following distribution is bimodal. Find both modes." }, "G4-BIMODAL"),
      [["G4-BIMODAL", "hit", "bimodal/multimodal data"]],
    );
  });
  test("PASS G4-BIMODAL: 'two modes of asexual reproduction' (Biology) passes; a solution-only mention is REVIEW", () => {
    assert.deepEqual(
      findings({ topicKey: "how-do-organisms-reproduce", questionText: "Name the two modes of asexual reproduction in hydra." }, "G4-BIMODAL"),
      [],
    );
    const f = findings({ topicKey: "statistics", questionText: "Find the mode.", solutionSteps: ["Bimodal data would have two modes."] }, "G4-BIMODAL");
    assert.deepEqual(f.map((x) => x[1]), ["review"]);
  });
  test("CONTROL G4-R1-IRRATIONAL: 'prove √15 irrational' (composite surd, from scratch) FAILS", () => {
    for (const q of ["Prove that √15 is irrational.", "Prove that \\sqrt{15} is irrational.", "Show that the square root of 15 is irrational."]) {
      assert.deepEqual(findings({ topicKey: "real-numbers", questionText: q }, "G4-R1-IRRATIONAL"), [["G4-R1-IRRATIONAL", "hit", "composite surd √15"]], q);
    }
  });
  test("CONTROL G4-R1-IRRATIONAL: a general prime p FAILS", () => {
    const f = findings({ topicKey: "real-numbers", questionText: "Prove that √p is irrational, where p is a prime." }, "G4-R1-IRRATIONAL");
    assert.deepEqual(f, [["G4-R1-IRRATIONAL", "hit", "general prime p"]]);
  });
  test("PASS G4-R1-IRRATIONAL: named primes and expressions built on them (R1 IN); √6 given; a classification statement", () => {
    for (const q of [
      "Prove that √7 is irrational.",
      "Prove that 6 − √7 is irrational.",
      "Prove that 5 + 6√7 is irrational.",
      "Given that √6 is irrational, prove that (√2 + √3)² is irrational.",
      "Which of the following is irrational: √4, √9, √15, √16?",
    ]) {
      const hits = findings({ topicKey: "real-numbers", questionText: q }, "G4-R1-IRRATIONAL").filter((x) => x[1] === "hit");
      assert.deepEqual(hits, [], q);
    }
  });
  test("REVIEW G4-R1-IRRATIONAL: two named prime surds (√2 + √3) is ambiguous under R1, never a silent pass", () => {
    assert.deepEqual(findings({ topicKey: "real-numbers", questionText: "Prove that √2 + √3 is irrational." }, "G4-R1-IRRATIONAL"), [
      ["G4-R1-IRRATIONAL", "review", "two prime surds √2, √3"],
    ]);
  });
  test("every G4 limit and the R1 OUT item are still in the reference", () => {
    assert.deepEqual(G3.checkLimitsPresent(REFERENCE), []);
  });
  test("every rule's config citation is pinned: the cited line contains its quote", () => {
    const lines = readFileSync(join(import.meta.dirname, "../../", G3.CONFIG_FILE), "utf-8").split("\n");
    for (const r of G3.ROW_RULES) {
      if (!r.cite.startsWith(G3.CONFIG_FILE)) continue;
      const n = Number(r.cite.split(":").pop());
      assert.ok(lines[n - 1]?.includes(r.citeQuote), `${r.id}: ${r.cite} must contain "${r.citeQuote}"`);
    }
  });
});

describe("GUARD-3 G9 — a served 1-mark row must have options (MCQ or assertion-reason)", () => {
  test("CONTROL: a 1-mark row with no options FAILS; an empty options array FAILS", () => {
    assert.deepEqual(findings({ topicKey: "statistics", marks: 1, format: "VSA", questionText: "Define mode." }, "G9-1MARK-OPTIONS"), [
      ["G9-1MARK-OPTIONS", "hit", "1-mark VSA row with no options"],
    ]);
    assert.equal(findings({ topicKey: "statistics", marks: 1, format: "MCQ", questionText: "Define mode.", options: [] }, "G9-1MARK-OPTIONS").length, 1);
  });
  test("PASS: a 1-mark MCQ with options; a 1-mark A-R with options", () => {
    assert.deepEqual(
      findings({ topicKey: "statistics", marks: 1, format: "MCQ", questionText: "Mode is:", options: ["a", "b", "c", "d"] }, "G9-1MARK-OPTIONS"),
      [],
    );
    assert.deepEqual(
      findings(
        {
          topicKey: "statistics",
          marks: 1,
          format: "Assertion-Reasoning",
          questionText: "Assertion (A): x. Reason (R): y.",
          options: ["Both A and R are true, and R is the correct explanation of A.", "b", "c", "d"],
        },
        "G9-1MARK-OPTIONS",
      ),
      [],
    );
  });
  test("A-R is detected by its own format field or by its 'Assertion (A)' stem", () => {
    assert.deepEqual(
      findings({ topicKey: "statistics", marks: 1, format: "MCQ", questionText: "Assertion (A): x.\nReason (R): y." }, "G9-1MARK-OPTIONS"),
      [["G9-1MARK-OPTIONS", "hit", "1-mark A-R row with no options"]],
    );
    assert.ok(G3.isAssertionReason(plantedRow({ format: "Assertion-Reasoning", questionText: "x" })));
  });
  test("PASS: a 2-mark row without options is not in scope", () => {
    assert.deepEqual(findings({ topicKey: "statistics", marks: 2, format: "Short", questionText: "Find the mode." }, "G9-1MARK-OPTIONS"), []);
  });
});

describe("GUARD-3 G1 — the ratchet: baseline + reviewed, both can only shrink", () => {
  const f = (rowId: string, verdict: "hit" | "review" = "hit"): G3.RowFinding => ({
    rule: "G3-TEXT", verdict, surface: "bank", rowId, matched: "m", fields: ["questionText"], text: "t",
  });
  const b = (rowId: string): G3.BaselineEntry => ({ rule: "G3-TEXT", surface: "bank", rowId, matched: "m", file: "f.ts", lane: "C1", fu: "FU-X" });
  const r = (rowId: string, evidence = "e"): G3.ReviewedEntry => ({ rule: "G3-TEXT", surface: "bank", rowId, matched: "m", reason: "r", evidence });

  test("CONTROL: a finding in neither list FAILS (unlisted)", () => {
    assert.deepEqual(G3.applyRatchet([f("NEW")], { baseline: [], reviewed: [] }).unlisted.map((x) => x.rowId), ["NEW"]);
  });
  test("a baselined hit and a reviewed finding pass", () => {
    const res = G3.applyRatchet([f("OLD"), f("AMB", "review")], { baseline: [b("OLD")], reviewed: [r("AMB")] });
    assert.deepEqual([res.unlisted.length, res.baselined.length, res.reviewed.length], [0, 1, 1]);
  });
  test("CONTROL: a stale baseline entry FAILS; a stale reviewed entry FAILS", () => {
    const res = G3.applyRatchet([], { baseline: [b("FIXED")], reviewed: [r("GONE")] });
    assert.deepEqual([res.staleBaseline.map((e) => e.rowId), res.staleReviewed.map((e) => e.rowId)], [["FIXED"], ["GONE"]]);
  });
  test("CONTROL: a reviewed entry without evidence, a duplicate, or an entry in both lists is an ERROR", () => {
    assert.equal(G3.applyRatchet([f("X")], { baseline: [], reviewed: [r("X", "")] }).errors.length, 1);
    assert.equal(G3.applyRatchet([f("X")], { baseline: [b("X"), b("X")], reviewed: [] }).errors.length, 1);
    assert.equal(G3.applyRatchet([f("X")], { baseline: [b("X")], reviewed: [r("X")] }).errors.length, 1);
  });
  test("RATCHET PIN: the lists never grow (baseline <= 212, reviewed <= 31); lower these numbers as rows are fixed", () => {
    const files = G3.loadRatchetFiles();
    assert.ok(files.baseline.length <= 212, `baseline has ${files.baseline.length} entries`);
    assert.ok(files.reviewed.length <= 31, `reviewed has ${files.reviewed.length} entries`);
    for (const e of files.baseline) assert.ok(["C1", "C2", "C3"].includes(e.lane) && e.fu && e.file, JSON.stringify(e));
    for (const e of files.reviewed) assert.ok(e.reason.trim() && e.evidence.trim(), JSON.stringify(e));
  });
});

describe("GUARD-3 — the REAL served set, today", () => {
  test("every finding is baselined or reviewed, and no entry is stale (the guard's own Mode 4 path)", async () => {
    const res = await runRowRules(SERVED);
    assert.ok(res.rowCount > 9000, `rows ${res.rowCount}`);
    assert.deepEqual(res.ratchet.unlisted.map((x) => `${x.rule} ${x.rowId} ${x.matched}`), []);
    assert.deepEqual(res.ratchet.staleBaseline.map((x) => `${x.rule} ${x.rowId}`), []);
    assert.deepEqual(res.ratchet.staleReviewed.map((x) => `${x.rule} ${x.rowId}`), []);
    assert.deepEqual(res.ratchet.errors, []);
  });
  test("CONTROL per rule on the real path: one planted served row per rule makes Mode 4 report it as UNLISTED", async () => {
    const planted = [
      { id: "CTRL-G3", topicKey: "surface-areas-and-volumes", marks: 3, questionText: "A bucket is in the form of a frustum of a cone. Find its capacity." },
      { id: "CTRL-HD", topicKey: "trigonometry", marks: 3, questionText: "The angle of elevation of the top of a tower is 75°. Find its height." },
      {
        id: "CTRL-HD3",
        topicKey: "trigonometry",
        marks: 3,
        questionText: "The angle of depression of the bottom is 60° and the angles of elevation of the climber and the top are 30° and 45°.",
      },
      { id: "CTRL-SEG", topicKey: "areas-related-to-circles", marks: 3, questionText: "A chord subtends 100° at the centre. Find the area of the minor segment." },
      { id: "CTRL-BI", topicKey: "statistics", marks: 3, questionText: "The following data is bimodal. Find both modes." },
      { id: "CTRL-R1", topicKey: "real-numbers", marks: 3, questionText: "Prove that √15 is irrational." },
      { id: "CTRL-G9", topicKey: "statistics", marks: 1, format: "VSA", questionText: "Define the mode." },
    ];
    const res = await runRowRules({ ...SERVED, rawBank: [...SERVED.rawBank, ...planted] as typeof SERVED.rawBank });
    const got = res.ratchet.unlisted.map((x) => `${x.rule} ${x.rowId}`).sort();
    assert.deepEqual(got, [
      "G3-TEXT CTRL-G3",
      "G4-BIMODAL CTRL-BI",
      "G4-HD-ANGLE CTRL-HD",
      "G4-HD-TRIANGLES CTRL-HD3",
      "G4-R1-IRRATIONAL CTRL-R1",
      "G4-SEGMENT-ANGLE CTRL-SEG",
      "G9-1MARK-OPTIONS CTRL-G9",
    ]);
  });
});

process.on("exit", () => {
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch {
  }
});
