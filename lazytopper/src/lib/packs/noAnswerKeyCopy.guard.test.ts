// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * SPEED-PACKS-3 (owner 11 Nov 2026): Google disapproved a sitelink to /packs as "enabling dishonest behavior" because the
 * "What you get" pop-up said "Answer keys with worked solutions". The website copy of the pack surfaces says "worked
 * solutions" / "marking guide" instead. Comments, code identifiers (the "answer-key" preview page id) and the PDF files are
 * not copy and are not checked.
 */
const FILES = [
  "src/pages/PacksPage.tsx",
  "src/pages/PackDialog.tsx",
  "src/lib/packs/packManifest.ts",
  "src/components/packs/offersModel.ts",
  "src/components/packs/PackPromoCard.tsx",
  "src/components/packs/saleMomentModel.ts",
  "src/components/pricing/PacksStrip.tsx",
  "src/components/pricing/pricingPlansCopy.ts",
  "src/components/parents/ParentPacksSection.tsx",
  "src/components/limits/packLine.ts",
  "src/components/passOwnerOffers/passOwnerOffersModel.ts",
  "src/services/packs.ts",
];
const BAD = /answer[ -]keys?|\+ keys?\b|with (a )?keys?\b|marking keys?|worked-solution key/i;

describe("pack copy never says 'answer key'", () => {
  for (const file of FILES) {
    it(file, () => {
      const lines = readFileSync(file, "utf8").split("\n");
      const hits = lines
        .map((text, i) => ({ text, n: i + 1 }))
        .filter(({ text }) => !/^\s*(\*|\/\/|\/\*)/.test(text))
        .filter(({ text }) => BAD.test(text.replace(/page: "answer-key"/g, "")));
      expect(hits).toEqual([]);
    });
  }
});
