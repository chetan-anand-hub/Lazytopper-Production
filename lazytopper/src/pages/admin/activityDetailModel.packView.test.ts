import { describe, expect, it } from "vitest";
import { activityEventLabel, feedItemLabel, orderedFeed, PACK_VIEW_FEED_LABELS } from "./activityDetailModel";
import type { ActivityFeedItem } from "./studentsAdminModel";

/**
 * PACKS-RETURN-1 — `pack_view` fires on /packs AND on /pricing's embedded packs strip. The feed line says which, read
 * from the page entry it followed; a count with no page to read says honestly that it could be either.
 */
const labels = (feed: ActivityFeedItem[]) => orderedFeed(feed).map((item) => feedItemLabel(item));

describe("PACKS-RETURN-1 · pack_view in the admin feed, by surface", () => {
  it("after the Pricing page: 'Saw the packs on Pricing'", () => {
    expect(labels([{ t: 1, k: "page", n: "pricing" }, { t: 2, k: "event", n: "pack_view" }])).toEqual([
      "Opened Pricing",
      PACK_VIEW_FEED_LABELS.pricing,
    ]);
    expect(PACK_VIEW_FEED_LABELS.pricing).toBe("Saw the packs on Pricing");
  });

  it("after the packs page: 'Opened the PDF packs page' (same-ms ties keep recorded order)", () => {
    const out = labels([{ t: 5, k: "page", n: "packs" }, { t: 5, k: "event", n: "pack_view" }]);
    expect(out[1]).toBe("Opened the PDF packs page");
  });

  it("the NEAREST earlier page wins: Pricing then /packs reads as /packs, /packs then Pricing as Pricing", () => {
    expect(
      labels([
        { t: 1, k: "page", n: "pricing" },
        { t: 2, k: "event", n: "pack_view" },
        { t: 3, k: "page", n: "packs" },
        { t: 4, k: "event", n: "pack_view" },
        { t: 5, k: "page", n: "pricing" },
        { t: 6, k: "event", n: "pack_view" },
      ]).filter((_, i) => i % 2 === 1),
    ).toEqual([PACK_VIEW_FEED_LABELS.pricing, PACK_VIEW_FEED_LABELS.packs, PACK_VIEW_FEED_LABELS.pricing]);
  });

  it("sorted by time first, so an out-of-order batch still reads the right page", () => {
    expect(labels([{ t: 9, k: "event", n: "pack_view" }, { t: 3, k: "page", n: "pricing" }])[1]).toBe(PACK_VIEW_FEED_LABELS.pricing);
  });

  it("no page before it (or another page) falls back to the neutral label, never a guess", () => {
    const neutral = activityEventLabel("pack_view");
    expect(neutral).toBe("Saw the PDF packs (packs page or Pricing)");
    expect(labels([{ t: 1, k: "event", n: "pack_view" }])).toEqual([neutral]);
    expect(labels([{ t: 1, k: "page", n: "home" }, { t: 2, k: "event", n: "pack_view" }])[1]).toBe(neutral);
    expect(feedItemLabel({ t: 1, k: "event", n: "pack_view" })).toBe(neutral);
  });

  it("only pack_view is tagged; other entries come back unchanged", () => {
    const feed: ActivityFeedItem[] = [{ t: 1, k: "page", n: "pricing" }, { t: 2, k: "event", n: "pack_checkout" }];
    expect(orderedFeed(feed)).toEqual(feed);
  });
});
