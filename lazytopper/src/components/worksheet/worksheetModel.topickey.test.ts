// @vitest-environment node
//
// P0 [FU-TOPICKEY-UNIVERSAL] — getTopics() now emits canonical topics.ts slugs,
// the board-excluded menu is UNCHANGED (2A), and the (untouched) matcher that
// powers BOTH the worksheet pool and Quick Practice returns the four formerly-zero
// chapters while a stable topic is unchanged.
import { describe, expect, it } from "vitest";
import { getTopics, MATHS_TOPICS } from "./worksheetModel";
import { PredictionCore } from "../../data/predictionCore";

const TOPICS_TS_SLUGS = new Set([
  "real-numbers", "polynomials", "pair-of-linear-equations", "quadratic-equations",
  "arithmetic-progression", "triangles", "coordinate-geometry", "trigonometry",
  "circles", "areas-related-to-circles", "surface-areas-and-volumes", "statistics",
  "probability", "chemical-reactions-and-equations", "acids-bases-and-salts",
  "metals-and-non-metals", "carbon-and-its-compounds", "light-reflection-and-refraction",
  "human-eye-and-colourful-world", "electricity", "magnetic-effects-of-electric-current",
  "life-processes", "control-and-coordination", "how-do-organisms-reproduce", "heredity",
  "our-environment",
]);

describe("getTopics — emits canonical topics.ts slugs, menu preserved", () => {
  it("every offered topic key (Maths + Science) is a canonical topics.ts slug", () => {
    for (const t of [...MATHS_TOPICS, ...getTopics("Science")]) {
      expect(TOPICS_TS_SLUGS.has(t.key), `${t.key} is not a topics.ts slug`).toBe(true);
    }
  });

  it("offers the four fixed chapters under their canonical slugs", () => {
    const keys = new Set(getTopics("Science").map((t) => t.key));
    for (const slug of [
      "chemical-reactions-and-equations", "acids-bases-and-salts",
      "metals-and-non-metals", "how-do-organisms-reproduce",
    ]) {
      expect(keys.has(slug), `Science menu missing ${slug}`).toBe(true);
    }
  });

  it("keeps the board-excluded topics OFF the menu (2A — no silent surface expansion)", () => {
    const keys = new Set(getTopics("Science").map((t) => t.key));
    expect(keys.has("heredity")).toBe(false);
    expect(keys.has("heredity-and-evolution")).toBe(false);
    expect(keys.has("magnetic-effects-of-electric-current")).toBe(false);
    expect(keys.has("magnetic-effects")).toBe(false);
    // The live Science menu is exactly the 10 board-assessed chapters.
    expect(getTopics("Science").length).toBe(10);
  });
});

describe("worksheet/Quick-Practice matcher — fix + no regression (predictionCore untouched)", () => {
  it("the four formerly-zero chapters now return questions via their canonical slug", () => {
    for (const slug of [
      "chemical-reactions-and-equations", "acids-bases-and-salts",
      "metals-and-non-metals", "how-do-organisms-reproduce",
    ]) {
      const n = PredictionCore.getLikelyQuestionsForConcept(slug).length;
      expect(n, `${slug} returned ${n}`).toBeGreaterThan(0);
    }
  });

  it("a stable topic (trigonometry) still returns a non-empty pool (Quick Practice unchanged)", () => {
    expect(PredictionCore.getLikelyQuestionsForConcept("trigonometry").length).toBeGreaterThan(0);
  });
});
