/**
 * reproductionBankGuard.test.ts
 *
 * Regression tests for Ch 8 — How do Organisms Reproduce? — under the CBSE
 * 2026-27 doctrine.
 *
 * Key change from PR #121 → PR fix/syllabus-guard-2026-27-update:
 *   Reproductive health subtopics (Reproductive Health, Contraception, Family
 *   Planning, STDs, Safe Sex / HIV-AIDS, etc.) are RETAINED in the 2026-27
 *   board-assessed scope. The 12 strings PR #121 added to the syllabusGuard
 *   banned list (and the 7 it had inherited from PR #117) are REMOVED from
 *   the ban list. The 18 questions PR #121 deleted from reproduction.exemplar
 *   / reproduction.ncert / reproduction.pack2 are RESTORED.
 *
 * This file's old REPRODUCTION_BANNED array (asserting those strings were
 * banned) is replaced by a REPRODUCTION_RETAINED_2026_27 array asserting they
 * are NOT banned.
 *
 * Coverage:
 *   1. syllabusGuard.ts source does NOT list any 2026-27-retained
 *      reproduction-health subtopic strings as banned.
 *   2. Long-retained reproduction subtopics (Sexual Reproduction, Budding,
 *      Pollination, etc.) also do not appear in the banned list.
 *   3. Regression lock — running syllabusGuard.ts against the actual repo
 *      reproduction.*.ts files exits 0 (no violations).
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// ── Repo paths ──────────────────────────────────────────────────────────────
const SCRIPTS_SRC_DIR = join(fileURLToPath(import.meta.url), "..");
const SYLLABUS_GUARD_FILE = join(SCRIPTS_SRC_DIR, "syllabusGuard.ts");
const SCRIPTS_DIR = join(SCRIPTS_SRC_DIR, "..");
const REPO_ROOT = join(SCRIPTS_DIR, "..");

const syllabusGuardSource = readFileSync(SYLLABUS_GUARD_FILE, "utf8");

// ── Strings restored to scope in 2026-27 — must NOT be banned ────────────────
const REPRODUCTION_RETAINED_2026_27 = [
  "Reproductive Health",
  "Contraception",
  "Family Planning",
  "Sexually Transmitted Infections",
  "Sexually Transmitted Diseases",
  "STI",
  "STDs",
  "Barrier Contraception",
  "Contraception Methods",
  "Reasons for Contraception",
  "Contraceptive Methods",
  "Birth Control Methods",
  // 2026-27 subtopic conventions
  "Safe Sex and HIV/AIDS",
  "HIV/AIDS",
];

// ── Long-retained reproduction subtopics (always in scope) ──────────────────
const REPRODUCTION_LONG_RETAINED = [
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

// Locate the Science rule block in syllabusGuard.ts and search ONLY within it
// (Maths block also contains string literals that we don't want to confuse with
// Science doctrine).
const scienceBlockMatch = syllabusGuardSource.match(
  /subject:\s*"Science"[\s\S]*?bannedSubtopics:\s*\[([\s\S]*?)\]/
);
if (!scienceBlockMatch) {
  throw new Error("Failed to locate Science bannedSubtopics block in syllabusGuard.ts");
}
const scienceBannedBlock = scienceBlockMatch[1];

function scienceBannedListContains(s: string): boolean {
  return scienceBannedBlock.includes(`"${s}"`);
}

// ── Block 1: 2026-27 doctrine — reproduction health subtopics are NOT banned

describe("2026-27 doctrine — reproduction health subtopics are NOT banned", () => {
  for (const s of REPRODUCTION_RETAINED_2026_27) {
    test(`syllabusGuard.ts does NOT list "${s}" as banned`, () => {
      assert.equal(
        scienceBannedListContains(s),
        false,
        `"${s}" must NOT appear in Science bannedSubtopics under 2026-27 doctrine`
      );
    });
  }
});

// ── Block 2: long-retained reproduction subtopics also not banned ──────────

describe("long-retained reproduction subtopics are not banned", () => {
  for (const s of REPRODUCTION_LONG_RETAINED) {
    test(`syllabusGuard.ts does NOT list "${s}" as banned`, () => {
      assert.equal(
        scienceBannedListContains(s),
        false,
        `"${s}" is a long-retained reproduction subtopic and must not appear in banned list`
      );
    });
  }
});

// ── Block 3: Regression lock — running syllabusGuard.ts exits 0 ────────────

describe("regression lock — syllabusGuard against the 3 repo reproduction files", () => {
  test("syllabusGuard.ts exits 0 (all question banks clean, including reproduction.*.ts)", () => {
    const tsxCli = join(SCRIPTS_DIR, "node_modules/.bin/tsx");
    const r = spawnSync(tsxCli, [SYLLABUS_GUARD_FILE], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      shell: process.platform === "win32",
    });
    assert.equal(
      r.status,
      0,
      `Expected syllabusGuard.ts to exit 0; got ${r.status}.\n` +
        `stderr: ${r.stderr}\n` +
        `stdout: ${r.stdout?.slice(-1000)}`
    );
  });
});
