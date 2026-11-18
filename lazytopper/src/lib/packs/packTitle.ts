/**
 * meCardPackTitle - the pack's display name (same wording as PacksShop's `ownedPackTitle`; a test pins the two together).
 * Its own tiny module so the lazy chunks that only need a name (My packs card, the purchase card) share no heavier chunk.
 */
import type { OwnedPack } from "../../services/packs";
import { BUNDLE_NAME, TEST_SERIES_NAME, packChapterLabel } from "./packLabels";

export function meCardPackTitle(p: Pick<OwnedPack, "sku" | "target">): string {
  switch (p.sku) {
    case "pack_chapter":
      return `Chapter Pack \u00b7 ${packChapterLabel(p.target)}`;
    case "pack_mock":
      return `Mock Pack \u00b7 ${p.target === "science" ? "Science" : "Maths"}`;
    case "pack_subject":
      return `Subject Pack \u00b7 ${p.target === "science" ? "Science" : "Maths"}`;
    case "pack_cbq":
      return `${p.target === "science" ? "Science" : "Maths"} CBQ Pack`;
    case "pack_bundle":
      return BUNDLE_NAME;
    case "test_series":
      return TEST_SERIES_NAME;
    default:
      return "PDF pack";
  }
}
