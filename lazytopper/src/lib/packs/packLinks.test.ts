import { describe, expect, it } from "vitest";
import { CBQ_BOTH_SUBJECTS_HREF, PACKS_STRIP_HREF, cbqPackHref, pricingPacksHref } from "./packLinks";

describe("LINKS-1 packLinks", () => {
  it("cbqPackHref: the known subject gets its one-tap checkout, the unknown one gets both subjects on /pricing#cbq", () => {
    expect(cbqPackHref("Science")).toBe("/packs?buy=pack_cbq&t=science");
    expect(cbqPackHref("maths")).toBe("/packs?buy=pack_cbq&t=maths");
    expect(cbqPackHref(null)).toBe("/pricing#cbq");
    expect(cbqPackHref("History")).toBe(CBQ_BOTH_SUBJECTS_HREF);
  });
  it("pricingPacksHref: chapter, else subject, else the plain strip; an invalid chapter is dropped, never guessed", () => {
    expect(pricingPacksHref({ chapter: "trigonometry", subject: "Maths" })).toBe("/pricing?chapter=trigonometry#packs");
    expect(pricingPacksHref({ chapter: "not-a-chapter", subject: "Science" })).toBe("/pricing?t=science#packs");
    expect(pricingPacksHref({ subject: "maths" })).toBe("/pricing?t=maths#packs");
    expect(pricingPacksHref({ chapter: "nope" })).toBe(PACKS_STRIP_HREF);
    expect(pricingPacksHref()).toBe("/pricing#packs");
  });
});
