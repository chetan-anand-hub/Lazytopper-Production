/**
 * validateQuestionBanks.test.ts — the bank validator never collects test files.
 *
 * Check 2 of validateQuestionBanks.ts dynamically IMPORTS every collected .ts file.
 * A test file under a question-bank root imports `vitest`, which the Railway backend
 * build does not install, so a single *.test.ts there failed every deploy
 * ("Cannot find package 'vitest'"). This pins the skip: remove it and this goes red.
 */
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import { collectTsFiles } from "./validateQuestionBanks.js";

const root = join(tmpdir(), `validate-banks-test-${process.pid}`);
const nested = join(root, "class10", "maths");
mkdirSync(nested, { recursive: true });
for (const name of [
  "pack.ts",
  "pack.test.ts",
  "pack.spec.ts",
  "pack.test.tsx",
  "pack.spec.tsx",
  "notes.md",
]) {
  writeFileSync(join(root, name), "export const X = [];\n");
}
writeFileSync(join(nested, "trigonometry.cbq.ltgen.ts"), "export const X = [];\n");
writeFileSync(join(nested, "c3CbqPacks.test.ts"), 'import { it } from "vitest";\n');
after(() => rmSync(root, { recursive: true, force: true }));

describe("validateQuestionBanks · collectTsFiles", () => {
  test("collects question packs at every depth and skips *.test / *.spec files", () => {
    const names = collectTsFiles(root, true).map((p) => basename(p)).sort();
    assert.deepEqual(names, ["pack.ts", "trigonometry.cbq.ltgen.ts"]);
  });
});
