/**
 * opsAcceptanceGuard.test.ts
 *
 * Regression tests for the CBSE 2026-27 deletion doctrine across the ops/
 * acceptance scripts, topics registry, and prediction engine. Locks in the
 * behaviour established by:
 *   - PRs #117 / #121 — syllabusGuard ban list for deleted CBSE 2025-26 content
 *   - lazytopper/src/prediction/cbseHistoricalArchetypes.ts — SCIENCE_DELETED_CHAPTERS_2026_27
 *   - lazytopper/src/data/syllabus/cbse10Registry_2026_27.json — meta.excluded_chapters
 *
 * Coverage:
 *   1. Deleted Science chapters trigger the prediction-engine deletion guard
 *      (Periodic Classification / Management of Natural Resources). Sources of
 *      Energy is handled as a subtopic-keyword deletion under Our Environment.
 *   2. Retained Science chapters are present in topics.ts and NOT zeroed by
 *      the prediction guard.
 *   3. Deleted Maths chapter slugs (e.g. "constructions") are absent from
 *      topics.ts; retained Maths topics are present.
 *   4. syllabusGuard.ts banned-subtopic list covers all deleted CBSE 2025-26
 *      strings (originals from PR #117 + the 5 compound variants added in PR #121).
 *   5. Regression lock — both existing ops/ acceptance scripts run with exit 0.
 *
 * Doctrinal note about "Our Environment":
 *   The earlier handoff stated Our Environment was fully deleted, but the
 *   registry meta (cbse10Registry_2026_27.json line 12), topics.ts (slug
 *   "our-environment"), and cbseHistoricalArchetypes.SCIENCE_DELETED_CHAPTERS_2026_27
 *   (deletedTopics list) all retain Our Environment with ecology scope
 *   (food chains, trophic levels, pollution, waste management). Only the
 *   energy-related subtopics inside it are zeroed via deletedSubtopicKeywords.
 *   syllabusGuard.ts bans "Our Environment" as a question-bank subtopic string
 *   (a separate concern from chapter scope). This test follows the codebase
 *   truth: chapter retained, subtopic strings like "Sources of Energy" zeroed.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  SCIENCE_DELETED_CHAPTERS_2026_27,
  isScienceDeletedFor2026_27,
  isMathsDeletedFor2026_27,
} from "../../lazytopper/src/prediction/cbseHistoricalArchetypes.js";

// ── Repo paths ──────────────────────────────────────────────────────────────
const REPO_ROOT = join(fileURLToPath(import.meta.url), "../../..");
const TOPICS_FILE = join(REPO_ROOT, "lazytopper/src/lib/desktop/topics.ts");
const SYLLABUS_GUARD_FILE = join(REPO_ROOT, "scripts/src/syllabusGuard.ts");
const OPS_DIR = join(REPO_ROOT, "lazytopper/scripts/ops");

// Read topics.ts and syllabusGuard.ts once; reuse across tests.
const topicsSource = readFileSync(TOPICS_FILE, "utf8");
const syllabusGuardSource = readFileSync(SYLLABUS_GUARD_FILE, "utf8");

function topicsHasSlug(slug: string): boolean {
  const re = new RegExp(`slug:\\s*["']${slug}["']`);
  return re.test(topicsSource);
}

function syllabusGuardHasBannedSubtopic(s: string): boolean {
  // Crude but specific — matches the literal quoted string in the file.
  return syllabusGuardSource.includes(`"${s}"`);
}

// ── Block 1: Deleted Science chapters trigger the prediction deletion guard ─

describe("Deleted Science chapters return 0 (prediction guard)", () => {
  const fullChapterDeletions = [
    "Periodic Classification of Elements",
    "Management of Natural Resources",
  ];

  for (const topic of fullChapterDeletions) {
    test(`isScienceDeletedFor2026_27("${topic}") === true`, () => {
      assert.equal(isScienceDeletedFor2026_27(topic), true);
    });
  }

  test(`"Sources of Energy" content under Our Environment is zeroed via subtopic keyword`, () => {
    // Sources of Energy is treated as a deleted SUBTOPIC keyword under
    // the retained Our Environment chapter (see archetypes lines 803-807).
    assert.equal(
      isScienceDeletedFor2026_27("Our Environment", "sources of energy"),
      true
    );
    assert.equal(
      isScienceDeletedFor2026_27("Our Environment", "conventional sources of energy"),
      true
    );
  });

  test(`SCIENCE_DELETED_CHAPTERS_2026_27.effectiveFromYear === 2026`, () => {
    assert.equal(SCIENCE_DELETED_CHAPTERS_2026_27.effectiveFromYear, 2026);
  });

  test(`reproduction-health and contraception subtopics are zeroed`, () => {
    assert.equal(
      isScienceDeletedFor2026_27("How do Organisms Reproduce?", "reproductive health"),
      true
    );
    assert.equal(
      isScienceDeletedFor2026_27("How do Organisms Reproduce?", "contraception methods"),
      true
    );
  });

  test(`evolution subtopics under Heredity are zeroed`, () => {
    assert.equal(isScienceDeletedFor2026_27("Heredity & Evolution", "evolution"), true);
    assert.equal(
      isScienceDeletedFor2026_27("Heredity & Evolution", "natural selection"),
      true
    );
  });
});

// ── Block 2: Retained Science chapters are in scope ─────────────────────────

describe("Retained Science chapters are in scope", () => {
  const retainedScience = [
    "how-do-organisms-reproduce",
    "heredity",
    "light-reflection-and-refraction",
    "electricity",
    "magnetic-effects-of-electric-current",
  ];

  for (const slug of retainedScience) {
    test(`topics.ts contains slug "${slug}"`, () => {
      assert.equal(
        topicsHasSlug(slug),
        true,
        `Expected slug "${slug}" to be present in topics.ts`
      );
    });
  }

  test(`"how-do-organisms-reproduce" (chapter name) is NOT zeroed by prediction guard`, () => {
    // The chapter as a whole is retained. Only specific subtopics
    // (reproductive health, contraception, family planning) are zeroed.
    assert.equal(
      isScienceDeletedFor2026_27("How do Organisms Reproduce?", "Sexual Reproduction"),
      false
    );
  });

  test(`Mendel's experiments under Heredity is NOT zeroed`, () => {
    assert.equal(
      isScienceDeletedFor2026_27("Heredity & Evolution", "Mendel's experiments"),
      false
    );
  });
});

// ── Block 3: Deleted Maths topics absent / retained present ─────────────────

describe("Deleted Maths topics are not in scope", () => {
  test(`"constructions" slug is absent from topics.ts`, () => {
    assert.equal(topicsHasSlug("constructions"), false);
  });

  const retainedMaths = [
    "circles",
    "areas-related-to-circles",
    "surface-areas-and-volumes",
    "statistics",
    "probability",
  ];

  for (const slug of retainedMaths) {
    test(`topics.ts contains retained Maths slug "${slug}"`, () => {
      assert.equal(
        topicsHasSlug(slug),
        true,
        `Expected slug "${slug}" to be present in topics.ts`
      );
    });
  }

  test(`isMathsDeletedFor2026_27("Constructions") === true`, () => {
    // Per archetypes deletedSubtopicKeywords (line 707), constructions is
    // matched as a subtopic; the function also matches when the topic name
    // alone contains the keyword via normalised substring check.
    assert.equal(isMathsDeletedFor2026_27("Constructions", "constructions"), true);
  });

  test(`isMathsDeletedFor2026_27("Circles", "Tangents") === false`, () => {
    // Circles is retained; Tangents is a retained subtopic.
    assert.equal(isMathsDeletedFor2026_27("Circles", "Tangents"), false);
  });
});

// ── Block 4: syllabusGuard banned list covers all deleted strings ───────────

describe("syllabusGuard banned list covers all deleted chapters", () => {
  const mustBeBanned = [
    "Our Environment",
    "Management of Natural Resources",
    "Sources of Energy",
    "Periodic Classification",
    "Reproductive Health",
    "Contraception",
    "Evolution",
    "Barrier Contraception",
    "Contraception Methods",
    "Reasons for Contraception",
  ];

  for (const s of mustBeBanned) {
    test(`syllabusGuard.ts contains banned subtopic "${s}"`, () => {
      assert.equal(
        syllabusGuardHasBannedSubtopic(s),
        true,
        `Expected "${s}" to appear as a banned subtopic in syllabusGuard.ts`
      );
    });
  }

  const mustNotBeBannedAsExactString = [
    "Sexual Reproduction",
    "Asexual Reproduction",
    "Heredity",
    "Electricity",
  ];

  for (const s of mustNotBeBannedAsExactString) {
    test(`syllabusGuard.ts does NOT ban retained subtopic "${s}"`, () => {
      assert.equal(
        syllabusGuardHasBannedSubtopic(s),
        false,
        `"${s}" must NOT appear in syllabusGuard.ts banned list (it is a retained subtopic)`
      );
    });
  }
});

// ── Block 5: Regression lock — existing ops/ acceptance scripts exit 0 ──────

describe("regression lock — ops/ acceptance scripts run clean", () => {
  test("cbse_registry_2026_27_acceptance.mjs exits 0", () => {
    const r = spawnSync("node", ["scripts/ops/cbse_registry_2026_27_acceptance.mjs"], {
      cwd: join(REPO_ROOT, "lazytopper"),
      encoding: "utf8",
    });
    assert.equal(
      r.status,
      0,
      `Expected exit 0; got ${r.status}. stderr: ${r.stderr}\nstdout: ${r.stdout}`
    );
  });

  test("science_deleted_zeroing_acceptance.ts exits 0", () => {
    const tsxCli = join(REPO_ROOT, "scripts/node_modules/.bin/tsx");
    const r = spawnSync(
      tsxCli,
      [join(OPS_DIR, "science_deleted_zeroing_acceptance.ts")],
      {
        cwd: join(REPO_ROOT, "lazytopper"),
        encoding: "utf8",
        shell: process.platform === "win32",
      }
    );
    assert.equal(
      r.status,
      0,
      `Expected exit 0; got ${r.status}. stderr: ${r.stderr}\nstdout: ${r.stdout?.slice(-500)}`
    );
  });
});
