// SALE-MOMENT-1 - which pack the buying line names, where it links, and that no price is typed in the copy.
import { describe, expect, it } from "vitest";

import { buildDesktopWorksheetPath } from "../../lib/desktop/navigation";
import { readPacksQuery } from "../../lib/packs/packEntry";
import { PACK_PRICE_INR } from "../../services/packs";
import { singleChapterPracticeTarget } from "../results/scorecardVariants";
import { offerIsOwned, pickSaleOffer, saleHintFromTarget, saleOfferText } from "./saleMomentModel";

describe("pickSaleOffer", () => {
  it.each([
    ["a competency question, subject known", { cbq: true, subject: "maths" as const }, "pack_cbq", "maths", "/packs?pack=cbq&subject=maths"],
    ["a competency question, subject from its chapter", { cbq: true, chapterSlug: "light-reflection-and-refraction" }, "pack_cbq", "science", "/packs?pack=cbq&subject=science"],
    ["a competency question, nothing else known", { cbq: true }, "pack_cbq", "", "/packs?pack=cbq"],
    ["a named chapter", { chapterSlug: "trigonometry", subject: "maths" as const }, "pack_chapter", "trigonometry", "/packs?chapter=trigonometry"],
    ["a subject only", { subject: "science" as const }, "pack_subject", "science", "/packs?pack=subject&subject=science"],
  ])("%s", (_name, hint, sku, target, href) => {
    const o = pickSaleOffer(hint);
    expect(o).toMatchObject({ sku, target, href });
    expect(o?.price).toBe(`₹${PACK_PRICE_INR[sku as keyof typeof PACK_PRICE_INR]}`);
  });
  it("names nothing it does not know: an unknown slug or an empty hint gives no specific offer", () => {
    expect(pickSaleOffer({})).toBeNull();
    expect(pickSaleOffer({ chapterSlug: "not-a-chapter" })).toBeNull();
    expect(pickSaleOffer({ chapterSlug: "not-a-chapter", subject: "maths" })?.sku).toBe("pack_subject");
  });
  it("every deep link is one /packs actually reads (PacksShop entry contract)", () => {
    const chapter = pickSaleOffer({ chapterSlug: "triangles" })!;
    expect(readPacksQuery(chapter.href.split("?")[1] ? `?${chapter.href.split("?")[1]}` : "").chapter).toBe("triangles");
    const cbq = pickSaleOffer({ cbq: true, subject: "maths" })!;
    expect(readPacksQuery(`?${cbq.href.split("?")[1]}`)).toMatchObject({ pack: "cbq", subject: "maths" });
    const sub = pickSaleOffer({ subject: "science" })!;
    expect(readPacksQuery(`?${sub.href.split("?")[1]}`)).toMatchObject({ pack: "subject", subject: "science" });
    for (const o of [chapter, cbq, sub]) expect(o.href.startsWith("/packs?")).toBe(true);
  });
});

describe("saleOfferText", () => {
  it("takes every price from the catalogue and never says 599 / 999 / save", () => {
    const texts = [
      saleOfferText(pickSaleOffer({ chapterSlug: "trigonometry" })!, "Trigonometry"),
      saleOfferText(pickSaleOffer({ chapterSlug: "trigonometry" })!, null),
      saleOfferText(pickSaleOffer({ cbq: true, subject: "maths" })!),
      saleOfferText(pickSaleOffer({ subject: "science" })!),
    ];
    expect(texts[0]).toBe(`Trigonometry Chapter Pack ₹${PACK_PRICE_INR.pack_chapter} — printed questions with answer keys →`);
    expect(texts[1]).toContain("This chapter's Chapter Pack");
    expect(texts[2]).toContain(`Board CBQ Pack ₹${PACK_PRICE_INR.pack_cbq}`);
    expect(texts[3]).toContain(`Science Subject Pack ₹${PACK_PRICE_INR.pack_subject}`);
    for (const t of texts) expect(t).not.toMatch(/599|999|save|%|off\b/i);
  });
});

describe("saleHintFromTarget - read from the routes the hosts already build", () => {
  it("Quick Practice / Worksheet / Full Mock single-chapter target", () => {
    const t = singleChapterPracticeTarget("Maths", ["trigonometry"])!;
    expect(saleHintFromTarget(t.to)).toEqual({ chapterSlug: "trigonometry", subject: "maths" });
    const sci = singleChapterPracticeTarget("Science", ["life-processes"]);
    expect(saleHintFromTarget(sci!.to).subject).toBe("science");
  });
  it("the Answer Checker topic worksheet route", () => {
    const to = buildDesktopWorksheetPath({ scope: "topic", subject: "Science", topic: "life-processes", mistakeAware: true });
    expect(saleHintFromTarget(to)).toEqual({ chapterSlug: "life-processes", subject: "science" });
  });
  it("a missing or mixed target names nothing", () => {
    expect(saleHintFromTarget(null)).toEqual({});
    expect(saleHintFromTarget(undefined)).toEqual({});
    expect(singleChapterPracticeTarget("Maths", ["trigonometry", "triangles"])).toBeNull();
    expect(saleHintFromTarget("/practice/worksheets?scope=mixed")).toEqual({ chapterSlug: null, subject: null });
  });
});

describe("offerIsOwned", () => {
  const own = (...ids: string[]) => ids.map((packId) => ({ packId }));
  it.each([
    [{ chapterSlug: "trigonometry" }, own("pack_chapter:trigonometry"), true],
    [{ chapterSlug: "trigonometry" }, own("pack_subject:maths"), true],
    [{ chapterSlug: "trigonometry" }, own("pack_bundle:all"), true],
    [{ chapterSlug: "trigonometry" }, own("pack_chapter:triangles"), false],
    [{ chapterSlug: "trigonometry" }, own("pack_cbq:maths"), false],
    [{ subject: "science" as const }, own("pack_subject:science"), true],
    [{ subject: "science" as const }, own("pack_subject:maths"), false],
    [{ cbq: true, subject: "maths" as const }, own("pack_cbq:maths"), true],
    [{ cbq: true, subject: "maths" as const }, own("pack_subject:maths", "pack_bundle:all"), false], // CBQ is its own product
    [{ cbq: true }, own("pack_cbq:maths"), false],
    [{ cbq: true }, own("pack_cbq:maths", "pack_cbq:science"), true],
  ])("%j with %j -> owned %s", (hint, owned, expected) => {
    expect(offerIsOwned(owned, pickSaleOffer(hint)!)).toBe(expected);
  });
});
