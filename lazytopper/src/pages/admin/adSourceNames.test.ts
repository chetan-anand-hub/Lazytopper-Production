import { describe, expect, it } from "vitest";
import { AD_GROUP_NAMES, CAMPAIGN_NAMES, adGroupName, adSourceText } from "./adSourceNames";

describe("SOURCE-3 adSourceText", () => {
  const base = { utm_source: "google", utm_medium: "cpc", gclid: true };

  it("a mapped campaign shows its friendly name; the three Search campaigns and the YouTube ones are mapped", () => {
    expect(adSourceText({ ...base, utm_campaign: "search_pdf_packs" })).toBe("Google ad · Search · PDF Packs");
    expect(CAMPAIGN_NAMES.search_signups_v2).toBe("Search · Sign-ups v2 (old, free pages)");
    expect(CAMPAIGN_NAMES.search_signups_v2_sales).toBe("Search · Sign-ups v2 (sales)");
    for (const k of ["students", "yt_students", "ct_electricity_short"]) expect(CAMPAIGN_NAMES[k]).toBe("YouTube · Students");
  });

  it("a mapped ad group, the keyword and the landing page build the full line", () => {
    AD_GROUP_NAMES.ag1234 = "Question bank – Class 10";
    try {
      expect(
        adSourceText({ ...base, utm_campaign: "search_pdf_packs", utm_content: "ag1234", utm_term: "class 10 question bank 2027", landing: "/question-bank-class-10" }),
      ).toBe("Google ad · Search · PDF Packs › Question bank – Class 10 · “class 10 question bank 2027” · landed /question-bank-class-10");
    } finally {
      delete AD_GROUP_NAMES.ag1234;
    }
  });

  it("an unmapped campaign or ad group falls back to the raw values", () => {
    expect(adSourceText({ ...base, utm_campaign: "brand_new", utm_content: "ag5678" })).toBe("Google ad · brand_new › ad group ag5678");
    expect(adGroupName("AG42")).toBe("ad group ag42");
  });

  it("a utm_content that is not an ad group id is not shown as one", () => {
    expect(adGroupName("cbq_short")).toBeNull();
    expect(adGroupName("ag")).toBeNull();
    expect(adSourceText({ utm_source: "youtube", utm_medium: "paid", utm_content: "cbq_short" })).toBe("YouTube ad");
  });

  it("the homepage landing adds nothing; a path does; an inherited key like 'constructor' is not a name", () => {
    expect(adSourceText({ ...base, landing: "/" })).toBe("Google ad");
    expect(adSourceText({ ...base, landing: "/packs" })).toBe("Google ad · landed /packs");
    expect(adSourceText({ ...base, utm_campaign: "constructor" })).toBe("Google ad · constructor");
  });

  it("never shows a click id; a missing source stays 'No source recorded'; no tags is Direct", () => {
    expect(adSourceText({ ...base, gclid: true, landing: "/packs" })).not.toMatch(/gclid|clid/i);
    expect(adSourceText(null)).toBe("No source recorded");
    expect(adSourceText(undefined)).toBe("No source recorded");
    expect(adSourceText({})).toBe("Direct");
  });
});
