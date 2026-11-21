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

  it("the Google Ads ad group names are mapped verbatim", () => {
    expect(Object.keys(AD_GROUP_NAMES)).toHaveLength(25);
    expect(adSourceText({ utm_source: "google", utm_medium: "cpc", utm_campaign: "search_pdf_packs", utm_content: "ag203232893498" })).toBe(
      "Google ad \u00B7 Search \u00B7 PDF Packs \u203A Question bank \u2013 Class 10",
    );
    expect(adGroupName("ag207788120144")).toBe("1b How answers are marked");
  });

  it("an unmapped campaign or ad group falls back to the raw values", () => {
    expect(adSourceText({ ...base, utm_campaign: "brand_new", utm_content: "ag5678" })).toBe("Google ad · brand_new › ad group ag5678");
    expect(adGroupName("AG42")).toBe("ad group ag42");
  });

  it("a utm_content that is not an ad group id is not shown as one", () => {
    expect(adGroupName("cbq_short")).toBeNull();
    expect(adGroupName("ag")).toBeNull();
    expect(adSourceText({ utm_source: "youtube", utm_medium: "paid", utm_content: "cbq_short" })).toBe("YouTube ad \u00B7 content cbq_short");
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

  it("21 Nov 2026: Board Pass and Test Series campaigns and ad groups are named; a Demand Gen click is a YouTube ad", () => {
    expect(adSourceText({ ...base, utm_campaign: "search_board_pass", utm_content: "ag199221652781" })).toBe("Google ad · Search · Board Pass › Board Pass");
    expect(adSourceText({ ...base, utm_campaign: "search_test_series", utm_content: "ag207975397091" })).toBe("Google ad · Search · Test Series › TS - Mock tests");
    expect(adSourceText({ utm_source: "youtube", utm_medium: "demandgen", utm_campaign: "students", utm_content: "cbq_pack", landing: "/cbq-packs" })).toBe(
      "YouTube ad · YouTube · Students · content cbq_pack · landed /cbq-packs",
    );
    expect(adSourceText({ utm_source: "youtube" })).toBe("YouTube (untagged)");
  });
});
