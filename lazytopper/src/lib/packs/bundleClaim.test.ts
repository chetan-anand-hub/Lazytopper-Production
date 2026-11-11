import { describe, expect, it } from "vitest";
import { countChapterQuestions, loadChapter } from "./packContent";
import { PACK_CHAPTER_SLUGS } from "../../services/packs";
import { BUNDLE_QUESTIONS_CLAIM, BUNDLE_QUESTIONS_MIN } from "./bundleClaim";
import { BUNDLE_CHAPTERS, BUNDLE_MOCKS } from "./packLabels";

/** PACKS-TIDY-2: the /packs Bundle tiles ("26 chapters", "16 board-pattern mock papers", "10,000+ questions") hold on the real selection. */
describe("PACKS-TIDY-2: the Bundle question claim holds on the real Bundle selection", () => {
  it("the Bundle's chapter sheets carry >= BUNDLE_QUESTIONS_MIN questions", async () => {
    let total = 0;
    for (const slug of PACK_CHAPTER_SLUGS) {
      await loadChapter(slug);
      total += countChapterQuestions(slug);
    }
    expect(PACK_CHAPTER_SLUGS).toHaveLength(BUNDLE_CHAPTERS);
    expect(total, `Bundle questions (claim: ${BUNDLE_QUESTIONS_CLAIM})`).toBeGreaterThanOrEqual(BUNDLE_QUESTIONS_MIN);
  }, 180_000);

  it("the claim is the floor written out, rounded down to a thousand; the tiles' other figures are the pack constants", () => {
    expect(BUNDLE_QUESTIONS_CLAIM).toBe("10,000+");
    expect(BUNDLE_QUESTIONS_MIN % 1000).toBe(0);
    expect(BUNDLE_CHAPTERS).toBe(26);
    expect(BUNDLE_MOCKS).toBe(16);
  });
});
