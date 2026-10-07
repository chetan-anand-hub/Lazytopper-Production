// @vitest-environment node
/**
 * BANK-FIX-1 PR-2: the withhold-category map names exactly the rows the PR-2 blocks withhold.
 * The map is what code may branch on (e.g. which withheld rows may still be a generated row's template),
 * so a row added to a block without a category — or a category for a row that is served — is a red.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { WITHHELD_QUESTION_IDS, canonicalQuestionBank } from "../canonicalQuestionBank";
import { BANK_FIX_1_PR2_WITHHOLD_CATEGORY } from "./bankFix1Pr2Withholds";

const src = readFileSync(join(__dirname, "..", "canonicalQuestionBank.ts"), "utf8");
const block = src.slice(src.indexOf("// ---- BANK-FIX-1 PR-2"), src.indexOf("\n]);", src.indexOf("// ---- BANK-FIX-1 PR-2")));
const blockIds = [...block.matchAll(/^\s+"([^"]+)",/gm)].map((m) => m[1]);

describe("BANK-FIX-1 PR-2 · withhold categories", () => {
  it("the PR-2 blocks are non-empty and every id in them has a category (and vice versa)", () => {
    expect(blockIds.length).toBeGreaterThan(180);
    expect([...BANK_FIX_1_PR2_WITHHOLD_CATEGORY.keys()].sort()).toEqual([...blockIds].sort());
  });

  it("every categorised row is withheld and not served", () => {
    const served = new Set(canonicalQuestionBank.map((q) => q.id));
    const bad = [...BANK_FIX_1_PR2_WITHHOLD_CATEGORY.keys()].filter((id) => !WITHHELD_QUESTION_IDS.has(id) || served.has(id));
    expect(bad).toEqual([]);
  });

  it("phase B's re-solve withholds are 'ambiguous'", () => {
    for (const id of ["EL2-004", "SCO-S-HERED-002", "CBE-S-CTRL-A-005", "PYQ-M-RN-002"]) {
      expect(BANK_FIX_1_PR2_WITHHOLD_CATEGORY.get(id), id).toBe("ambiguous");
    }
  });
});
