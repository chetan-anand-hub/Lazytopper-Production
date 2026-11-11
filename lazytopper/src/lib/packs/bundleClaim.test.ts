import { describe, expect, it } from "vitest";
import { chapterPackRows, loadChapter } from "./packContent";
import { PACK_CHAPTER_SLUGS } from "../../services/packs";
import { BUNDLE_CHAPTERS, BUNDLE_QUESTIONS_CLAIM, BUNDLE_QUESTIONS_MIN } from "./packLabels";

/**
 * PRICING-HUB-1: the /pricing Question Bank card's "10,000+ questions in the Bundle" is a floor of the REAL Bundle selection: the
 * chapter sheets of all 26 chapters (chapterPackRows, the rows buildPackFiles prints). Same pattern as CBQ_MIN_PER_SUBJECT
 * (buildPackFiles.test.ts): the copy and this test read one constant, so CI goes red if the bank ever drops below the claim.
 */
describe("PRICING-HUB-1: the Bundle question claim holds on the real selection", () => {
  it("the 26 chapter sheets hold >= BUNDLE_QUESTIONS_MIN questions", async () => {
    expect(PACK_CHAPTER_SLUGS).toHaveLength(BUNDLE_CHAPTERS);
    let total = 0;
    for (const slug of PACK_CHAPTER_SLUGS) {
      await loadChapter(slug);
      total += chapterPackRows(slug).length;
    }
    expect(total, `Bundle chapter sheets (claim: ${BUNDLE_QUESTIONS_CLAIM})`).toBeGreaterThanOrEqual(BUNDLE_QUESTIONS_MIN);
  }, 120_000);

  it("the claim is the floor written out, rounded down to a hundred", () => {
    expect(BUNDLE_QUESTIONS_CLAIM).toBe("10,000+");
    expect(BUNDLE_QUESTIONS_MIN % 100).toBe(0);
  });
});
