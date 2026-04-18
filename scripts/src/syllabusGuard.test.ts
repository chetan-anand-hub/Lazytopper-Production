import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scanFile } from "./syllabusGuard.js";

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

process.on("exit", () => {
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch {
  }
});
