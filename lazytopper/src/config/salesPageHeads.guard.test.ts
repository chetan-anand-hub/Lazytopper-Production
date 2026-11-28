import { describe, expect, it } from "vitest";
import { HEAD_CBQ_PACK_PRICE_INR, HEAD_NOW, STATIC_PAGE_HEADS, salesPageHeads } from "../../scripts/seo/writeStaticHeads";
import { PACK_PRICE_INR } from "../services/packs";
import { BANK_CBQS_CLAIM, BANK_QUESTIONS_CLAIM, CBQ_CHAPTER_CLAIM, CBQ_SUBJECT_CLAIM } from "../lib/packs/packLabels";
import { BP_MINUTE_TILE } from "../components/salesPages/salesPagesCopy";

/**
 * PRICING-PAGES-2 F5 + R2 - the /board-pass and /cbq-packs heads carry the price and the claims, generated at build from the pinned
 * constants with the page's own date rule. A changed constant changes the head; a mirrored figure that drifts turns this red.
 */
describe("PRICING-PAGES-2 F5 - sales page heads", () => {
  const before = salesPageHeads(Date.parse("2026-11-30T23:59:59+05:30"));
  // PRICE-HOLD-1: the retired 1 Dec switch instant - the head must be IDENTICAL on both sides of it.
  const after = salesPageHeads(Date.parse("2026-12-01T00:00:00+05:30"));

  it("the mirrored CBQ price is the pack config's", () => {
    expect(HEAD_CBQ_PACK_PRICE_INR).toBe(PACK_PRICE_INR.pack_cbq);
  });

  it("/board-pass description: ₹1,917 + GST before AND after 1 Dec IST (PRICE-HOLD-1: no switch); the claims from the constants", () => {
    expect(before["/board-pass"].description).toContain("Board Pass ₹1,917 + GST once");
    expect(after["/board-pass"].description).toContain("Board Pass ₹1,917 + GST once");
    expect(after["/board-pass"]).toEqual(before["/board-pass"]);
    for (const h of [before, after]) {
      const d = h["/board-pass"].description;
      expect(d).toContain(`${BANK_QUESTIONS_CLAIM} questions`);
      expect(d).toContain(`${BANK_CBQS_CLAIM} CBQs`);
      expect(d).toContain(`in ${BP_MINUTE_TILE.toLowerCase()}`);
    }
  });

  it("/cbq-packs description: the claims and the pack price + GST from the constants", () => {
    const d = before["/cbq-packs"].description;
    expect(d).toContain(CBQ_SUBJECT_CLAIM);
    expect(d).toContain(CBQ_CHAPTER_CLAIM);
    expect(d).toContain("₹199 + GST per subject");
  });

  it("fits: titles <= 60, descriptions <= 155 on both sides of the 1 Dec switch", () => {
    for (const h of [before, after]) {
      for (const head of Object.values(h)) {
        expect(head.title.length).toBeLessThanOrEqual(60);
        expect(head.description.length).toBeLessThanOrEqual(155);
      }
    }
  });

  it("the stamped heads are these, for the build instant", () => {
    const now = salesPageHeads(HEAD_NOW);
    expect(STATIC_PAGE_HEADS["/board-pass"]).toEqual(now["/board-pass"]);
    expect(STATIC_PAGE_HEADS["/cbq-packs"]).toEqual(now["/cbq-packs"]);
  });
});
