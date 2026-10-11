// @vitest-environment node
//
// RULE5-BIND-1 (11 Oct, cofounder D68b/c) — pins the lane's decisions row by row:
//   - the 3 official crops it bound (each row is SERVED and no longer needs a missing figure);
//   - the 16 rows it withheld (no allowed figure source, a wrong key, or damaged text);
//   - D68b's reviewed hold for clean-worded figure dependencies, which stays in force after a row is bound.
// The reachability tests carry only the counts; this file carries the ids.
import { describe, expect, it } from "vitest";
import "../test/preloadBankChapters";
import { needsMissingFigure } from "./figureSafe";
import { FIGURE_DEPENDENT_BY_REVIEW, demandsFigureForRow } from "../../scripts/seo/publishability";
import {
  RAW_CANONICAL_QUESTION_BANK,
  WITHHELD_QUESTION_IDS,
  canonicalQuestionBank,
} from "../data/canonicalQuestionBank";
import { getFiguresForQuestion } from "../data/visualConceptRegistry";
import { RULE5_BIND_1_WITHHOLD_CATEGORY } from "../data/bankFix/rule5Bind1Withholds";

const SERVED = new Map(canonicalQuestionBank.map((q) => [q.id, q]));
const RAW = new Map(RAW_CANONICAL_QUESTION_BANK.map((q) => [q.id, q]));

describe("RULE5-BIND-1 — the 3 bound official crops", () => {
  it.each([
    ["APQ-M-CIRC-012", "/figures/apq-maths/circles/APQ-M-CIRC-012.webp"],
    ["SQP-S-HER-003", "/figures/sqp-science/heredity/SQP-S-HER-003.webp"],
    ["APQ-S-ELEC-006", "/figures/other-science/electricity/APQ-S-ELEC-006.webp"],
  ])("%s is served with its official figure %s", (id, filePath) => {
    const q = SERVED.get(id);
    expect(q, `${id} must be served`).toBeDefined();
    expect(getFiguresForQuestion(id).map((f) => f.filePath)).toContain(filePath);
    expect(needsMissingFigure(q!)).toBe(false);
  });
});

describe("RULE5-BIND-1 — the 16 withheld rows", () => {
  it("withholds exactly 16 rows", () => {
    expect(RULE5_BIND_1_WITHHOLD_CATEGORY.size).toBe(16);
  });

  it.each([...RULE5_BIND_1_WITHHOLD_CATEGORY])("%s (%s) is withheld: in the raw bank, absent from every served row", (id) => {
    expect(RAW.has(id), `${id} must exist in the raw bank`).toBe(true);
    expect(WITHHELD_QUESTION_IDS.has(id)).toBe(true);
    expect(SERVED.has(id)).toBe(false);
  });
});

describe("D68b reviewed hold — a clean-worded figure dependency stays held until a figure is bound", () => {
  it("every reviewed id carries a dated reason and exists in the raw bank", () => {
    for (const [id, why] of Object.entries(FIGURE_DEPENDENT_BY_REVIEW)) {
      expect(why, id).toMatch(/^\d{4}-\d{2}-\d{2} B\/D68[bc]: .{20,}/);
      expect(RAW.has(id), `${id} must exist in the raw bank`).toBe(true);
    }
  });

  it("APQ-M-CIRC-012 is held by id, served only because its figure is bound (CONTROL: unbound -> held)", () => {
    const q = RAW.get("APQ-M-CIRC-012")!;
    expect(demandsFigureForRow(q.id, `${q.questionText}\n${q.answer ?? ""}`)).toBe(true);
    expect(needsMissingFigure(q)).toBe(false); // the official crop is bound
    expect(needsMissingFigure(q, () => false)).toBe(true); // were it unbound, the reviewed hold would keep it off every surface
  });
});
