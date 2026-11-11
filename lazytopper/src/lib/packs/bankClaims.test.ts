import { describe, expect, it } from "vitest";
import { BANK_CHAPTER_SLUGS, ensureAllBankChapters, getBankRows } from "../../data/bankChapters/loader";
import { isCbq } from "../cbq/cbqClassification";
import { BANK_CBQS_CLAIM, BANK_CBQS_MIN, BANK_QUESTIONS_CLAIM, BANK_QUESTIONS_MIN } from "./packLabels";

/**
 * PRICING-PAGES-1: the /board-pass number tiles ("10,000+ questions with solutions", "2,800+ CBQs") are floors of the REAL served
 * bank. Same pattern as the CBQ pack claim (buildPackFiles.test.ts, CBQ-PACK-1): the copy and this test read one constant.
 */
describe("PRICING-PAGES-1: the Board Pass bank claims hold on the real bank", () => {
  it("served questions >= BANK_QUESTIONS_MIN and CBQs >= BANK_CBQS_MIN", async () => {
    await ensureAllBankChapters();
    const rows = getBankRows(BANK_CHAPTER_SLUGS);
    expect(BANK_CHAPTER_SLUGS).toHaveLength(26);
    expect(new Set(rows.map((q) => q.id)).size, `served (claim: ${BANK_QUESTIONS_CLAIM})`).toBeGreaterThanOrEqual(BANK_QUESTIONS_MIN);
    expect(rows.filter(isCbq).length, `CBQs (claim: ${BANK_CBQS_CLAIM})`).toBeGreaterThanOrEqual(BANK_CBQS_MIN);
  }, 120_000);

  it("the claims are the floors written out, rounded down to a hundred", () => {
    expect(BANK_QUESTIONS_CLAIM).toBe("10,000+");
    expect(BANK_CBQS_CLAIM).toBe("2,800+");
    expect(BANK_QUESTIONS_MIN % 100).toBe(0);
    expect(BANK_CBQS_MIN % 100).toBe(0);
  });
});
