/**
 * reproductionBankGuard.test.ts
 *
 * Regression tests for the reproduction bank cleanup (PR fix/reproduction-bank-cleanup).
 *
 * Coverage goals:
 *   1. syllabusGuard catches all known banned subtopic variants in the
 *      how-do-organisms-reproduce topic — including the original strings
 *      AND the new variants added in this PR.
 *   2. syllabusGuard does NOT false-positive on retained reproduction subtopics
 *      ("Sexual Reproduction", "Asexual Reproduction", "Budding", etc.)
 *   3. Exact-match-only behaviour is preserved — a subtopic that merely
 *      CONTAINS a banned word as a substring does NOT trigger a violation.
 *   4. The reproduction.exemplar.ts, reproduction.ncert.ts, and
 *      reproduction.pack2.ts files currently in the repo are CLEAN
 *      (0 violations) — this acts as a permanent regression lock.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

// Import scanFile directly — same pattern as syllabusGuard.test.ts
import { scanFile } from "./syllabusGuard.js";

// ── Banned subtopic strings for how-do-organisms-reproduce ──────────────────
// These are the exact strings from the Science bannedSubtopics array
// that apply to Ch8 Reproductive Health. Keep in sync with syllabusGuard.ts.
const REPRODUCTION_BANNED = [
  "Reproductive Health",
  "Contraception",
  "Family Planning",
  "Sexually Transmitted Infections",
  "Sexually Transmitted Diseases",
  "STI",
  "STDs",
  // New variants added in this PR:
  "Barrier Contraception",
  "Contraception Methods",
  "Reasons for Contraception",
  "Contraceptive Methods",
  "Birth Control Methods",
];

// ── Retained subtopic strings that must NOT trigger violations ───────────────
const REPRODUCTION_RETAINED = [
  "Sexual Reproduction",
  "Asexual Reproduction",
  "Budding",
  "Fragmentation",
  "Spore Formation",
  "Vegetative Propagation",
  "Pollination",
  "Fertilisation",
  "Seed Dispersal",
  "Binary Fission",
  "Regeneration",
  "Male Reproductive System",
  "Female Reproductive System",
  "Menstrual Cycle",
  "Double Fertilisation",
];

// ── Helper: write a temp .ts file with a single subtopic field ───────────────
const tmp = mkdtempSync(join(tmpdir(), "reproduction-guard-test-"));

function fixture(name: string, content: string): string {
  const file = join(tmp, name);
  writeFileSync(file, content, "utf8");
  return file;
}

function makeQuestion(subtopic: string): string {
  return `export const q = [{
  id: "TEST-001",
  subtopic: "${subtopic}",
  questionText: "Test question text.",
  section: "A",
  marks: 1,
}];`;
}

// ── Tests: banned variants ARE caught ────────────────────────────────────────

describe("syllabusGuard — banned reproduction subtopics are flagged", () => {
  for (const banned of REPRODUCTION_BANNED) {
    test(`flags subtopic: "${banned}"`, () => {
      const file = fixture(
        `banned-${banned.replace(/[^a-zA-Z0-9]/g, "_")}.ts`,
        makeQuestion(banned)
      );
      const violations = scanFile(file, REPRODUCTION_BANNED);
      assert.equal(
        violations.length,
        1,
        `Expected 1 violation for "${banned}" but got ${violations.length}`
      );
      assert.equal(violations[0].subtopic.toLowerCase(), banned.toLowerCase());
    });
  }
});

// ── Tests: retained subtopics are NOT flagged ────────────────────────────────

describe("syllabusGuard — retained reproduction subtopics are clean", () => {
  for (const retained of REPRODUCTION_RETAINED) {
    test(`does not flag subtopic: "${retained}"`, () => {
      const file = fixture(
        `retained-${retained.replace(/[^a-zA-Z0-9]/g, "_")}.ts`,
        makeQuestion(retained)
      );
      const violations = scanFile(file, REPRODUCTION_BANNED);
      assert.equal(
        violations.length,
        0,
        `Expected 0 violations for retained subtopic "${retained}" but got ${violations.length}`
      );
    });
  }
});

// ── Tests: substring match does NOT fire (exact match only) ─────────────────

describe("syllabusGuard — substring of banned term does not trigger violation", () => {
  test(`"Methods of Contraception Overview" does not match "Contraception Methods"`, () => {
    const file = fixture(
      "substring-contraception.ts",
      makeQuestion("Methods of Contraception Overview")
    );
    const violations = scanFile(file, REPRODUCTION_BANNED);
    assert.equal(violations.length, 0);
  });

  test(`"STD Prevention" does not match "STDs"`, () => {
    const file = fixture(
      "substring-stds.ts",
      makeQuestion("STD Prevention")
    );
    const violations = scanFile(file, REPRODUCTION_BANNED);
    assert.equal(violations.length, 0);
  });

  test(`"Reproductive Biology" does not match "Reproductive Health"`, () => {
    const file = fixture(
      "substring-repro-bio.ts",
      makeQuestion("Reproductive Biology")
    );
    const violations = scanFile(file, REPRODUCTION_BANNED);
    assert.equal(violations.length, 0);
  });
});

// ── Tests: multiple banned questions in one file are all caught ──────────────

describe("syllabusGuard — multiple banned subtopics in one file", () => {
  test("counts all 3 original banned strings when present together", () => {
    const content = [
      `{ id: "T1", subtopic: "STDs", questionText: "Q1" }`,
      `{ id: "T2", subtopic: "Contraception", questionText: "Q2" }`,
      `{ id: "T3", subtopic: "Reproductive Health", questionText: "Q3" }`,
    ].join("\n");
    const file = fixture("multi-banned.ts", content);
    const violations = scanFile(file, REPRODUCTION_BANNED);
    assert.equal(violations.length, 3);
  });

  test("counts all new variant strings when present together", () => {
    const content = [
      `{ id: "T1", subtopic: "Barrier Contraception", questionText: "Q1" }`,
      `{ id: "T2", subtopic: "Contraception Methods", questionText: "Q2" }`,
      `{ id: "T3", subtopic: "Reasons for Contraception", questionText: "Q3" }`,
    ].join("\n");
    const file = fixture("multi-banned-variants.ts", content);
    const violations = scanFile(file, REPRODUCTION_BANNED);
    assert.equal(violations.length, 3);
  });
});

// ── Regression lock: actual repo files must be CLEAN ────────────────────────

describe("regression lock — repo reproduction files are clean post-cleanup", () => {
  const REPO_ROOT = join(
    fileURLToPath(import.meta.url),
    "../../.."
  );
  const SCIENCE_BANK = join(
    REPO_ROOT,
    "lazytopper/src/data/questionBanks/class10/science"
  );

  const FILES_TO_LOCK = [
    "reproduction.exemplar.ts",
    "reproduction.ncert.ts",
    "reproduction.pack2.ts",
  ];

  for (const fname of FILES_TO_LOCK) {
    test(`${fname} has 0 banned subtopic violations`, () => {
      const filePath = join(SCIENCE_BANK, fname);
      const violations = scanFile(filePath, REPRODUCTION_BANNED);
      assert.equal(
        violations.length,
        0,
        `${fname} still has violations: ${JSON.stringify(violations)}`
      );
    });
  }
});

// ── Cleanup temp dir ─────────────────────────────────────────────────────────

process.on("exit", () => {
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch {
    // best effort
  }
});
