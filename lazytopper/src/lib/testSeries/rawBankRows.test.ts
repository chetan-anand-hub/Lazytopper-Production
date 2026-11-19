/**
 * TS-MORE-1 - a series paper that holds retired / withheld rows resolves them from the EMBEDDED rows and does NOT import the raw bank
 * chunk (before: every such paper lazy-loaded canonicalQuestionBank's raw aggregator, ~1 s); an id the file does not hold still falls
 * through to the raw bank, so nothing that resolved before stops resolving.
 */
import { describe, expect, it, vi } from "vitest";

const rawFactory = vi.fn(() => ({ RAW_CANONICAL_QUESTION_BANK: [{ id: "ZZ-ONLY-IN-RAW", questionText: "q" }] }));
vi.mock("../../data/canonicalQuestionBank", () => rawFactory());

import { embeddedRetiredRows, loadRawBankRowsById } from "./rawBankRows";

describe("loadRawBankRowsById", () => {
  it("embedded ids resolve without importing the raw bank", async () => {
    const ids = Object.keys(embeddedRetiredRows());
    expect(ids.length).toBeGreaterThan(0);
    rawFactory.mockClear();
    const out = await loadRawBankRowsById(ids);
    expect([...out.keys()].sort()).toEqual([...ids].sort());
    expect(rawFactory).not.toHaveBeenCalled();
  });
  it("an id the file does not hold falls through to the raw bank (loaded once, lazily)", async () => {
    rawFactory.mockClear();
    const [embeddedId] = Object.keys(embeddedRetiredRows());
    const out = await loadRawBankRowsById([embeddedId, "ZZ-ONLY-IN-RAW", "ZZ-ABSENT"]);
    expect(out.has(embeddedId)).toBe(true);
    expect(out.get("ZZ-ONLY-IN-RAW")?.id).toBe("ZZ-ONLY-IN-RAW");
    expect(out.has("ZZ-ABSENT")).toBe(false);
    expect(rawFactory).toHaveBeenCalledTimes(1);
  });
  it("no ids -> nothing loaded", async () => {
    rawFactory.mockClear();
    expect((await loadRawBankRowsById([])).size).toBe(0);
    expect(rawFactory).not.toHaveBeenCalled();
  });
});
