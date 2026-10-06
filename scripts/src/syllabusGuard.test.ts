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
  scanServedItems,
  type ServedSources,
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

process.on("exit", () => {
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch {
  }
});
