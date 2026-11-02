// OFFERS-V2 - which pack rows each surface shows, in what order, with what words, and where each button goes.
import { describe, expect, it } from "vitest";

import { PACK_CHAPTER_SLUGS, PACK_PRICE_INR, isValidPackTarget } from "../../services/packs";
import { BUNDLE_MOCKS, BUNDLE_NAME, MOCKS_PER_SUBJECT } from "../../lib/packs/packLabels";
import { readBuyResume } from "./PacksShop";
import { readPacksQuery } from "../../lib/packs/packEntry";
import { OFFER_LINES, buyHrefFor, insideHrefFor, offerRows, unownedRows, type OfferContext, type OfferKind } from "./offersModel";

const names = (ctx: OfferContext) => offerRows(ctx).map((r) => r.name);

describe("rows by surface (price high to low; Subject before CBQ on a tie)", () => {
  it.each<[string, OfferContext, string[]]>([
    ["Full Mock, Maths", { kind: "full-mock", subject: "maths" }, [BUNDLE_NAME, "Maths CBQ Pack", "Maths Mock Pack"]],
    ["Full Mock, Science", { kind: "full-mock", subject: "science" }, [BUNDLE_NAME, "Science CBQ Pack", "Science Mock Pack"]],
    ["Chapter Test", { kind: "chapter-test", chapterSlug: "triangles", chapterName: "Triangles" }, [BUNDLE_NAME, "Maths CBQ Pack", "Triangles Chapter Pack"]],
    ["Worksheet (one chapter)", { kind: "worksheet", chapterSlug: "electricity" }, [BUNDLE_NAME, "Science CBQ Pack", "Electricity Chapter Pack"]],
    [
      "Answer Checker, subject and chapter known",
      { kind: "check-improve", subject: "science", chapterSlug: "electricity", chapterName: "Electricity" },
      [BUNDLE_NAME, "Science Subject Pack", "Science CBQ Pack", "Science Mock Pack", "Electricity Chapter Pack"],
    ],
    ["Answer Checker, subject only", { kind: "check-improve", subject: "maths" }, [BUNDLE_NAME, "Maths Subject Pack", "Maths CBQ Pack", "Maths Mock Pack"]],
    ["Quick Practice (its own pack card stays below)", { kind: "quick-practice", subject: "science" }, [BUNDLE_NAME, "Science CBQ Pack"]],
    [
      "Important Questions page, subject and filtered chapter",
      { kind: "important-qs", subject: "science", chapterSlug: "electricity", chapterName: "Electricity" },
      [BUNDLE_NAME, "Science Subject Pack", "Science CBQ Pack", "Science Mock Pack", "Electricity Chapter Pack"],
    ],
    ["Important Questions page, no chapter filtered", { kind: "important-qs", subject: "maths" }, [BUNDLE_NAME, "Maths Subject Pack", "Maths CBQ Pack", "Maths Mock Pack"]],
    ["ladder, this chapter", { kind: "ladder", chapterSlug: "triangles" }, [BUNDLE_NAME, "Maths CBQ Pack", "Triangles Chapter Pack"]],
  ])("%s", (_n, ctx, want) => {
    expect(names(ctx)).toEqual(want);
  });

  it("the subject is read from the chapter when none is given, and the order is never ascending in price", () => {
    for (const kind of ["full-mock", "chapter-test", "worksheet", "check-improve", "quick-practice", "ladder", "important-qs"] as OfferKind[]) {
      const rows = offerRows({ kind, subject: "maths", chapterSlug: "triangles" });
      const prices = rows.map((r) => r.priceInr);
      expect(prices, kind).toEqual([...prices].sort((a, b) => b - a));
    }
    expect(names({ kind: "chapter-test", chapterSlug: "life-processes" })).toContain("Science CBQ Pack");
  });

  it("never guesses: an unknown subject or chapter drops the rows that need it", () => {
    expect(names({ kind: "full-mock" })).toEqual([BUNDLE_NAME]);
    expect(names({ kind: "full-mock", subject: null })).toEqual([BUNDLE_NAME]);
    expect(names({ kind: "chapter-test", chapterSlug: "not-a-chapter" })).toEqual([BUNDLE_NAME]);
    expect(names({ kind: "check-improve" })).toEqual([BUNDLE_NAME]);
    expect(names({ kind: "check-improve", chapterSlug: "nope", subject: "maths" })).not.toContain("Chapter Pack");
  });

  it("prices come from the catalogue", () => {
    for (const r of offerRows({ kind: "check-improve", subject: "maths", chapterSlug: "triangles" })) {
      expect(r.priceInr).toBe(PACK_PRICE_INR[r.sku]);
      expect(r.price).toBe(`₹${PACK_PRICE_INR[r.sku]}`);
    }
    expect(offerRows({ kind: "check-improve", subject: "maths", chapterSlug: "triangles" }).map((r) => r.price)).toEqual(["₹299", "₹199", "₹199", "₹99", "₹49"]);
  });

  it("only the Bundle carries BEST VALUE", () => {
    const rows = offerRows({ kind: "check-improve", subject: "maths", chapterSlug: "triangles" });
    expect(rows.filter((r) => r.badge).map((r) => [r.sku, r.badge])).toEqual([["pack_bundle", "BEST VALUE"]]);
  });
});

describe("the owner's one-liners are the catalogue's own claims", () => {
  it("counts come from the pack catalogue, not typed numbers", () => {
    expect(OFFER_LINES.bundle).toBe(`All ${PACK_CHAPTER_SLUGS.length} chapters + ${BUNDLE_MOCKS} mocks, the whole year`);
    expect(OFFER_LINES.bundle).toBe("All 26 chapters + 16 mocks, the whole year");
    expect(OFFER_LINES.mock).toBe(`${MOCKS_PER_SUBJECT} board-pattern mock papers with step-marking keys`);
    expect(OFFER_LINES.subject("science")).toBe("Every Science chapter, chapter-wise question bank");
    expect(OFFER_LINES.cbq).toBe("Competency questions of every type, chapter-wise");
    expect(OFFER_LINES.chapter).toBe("Important questions with answer keys");
  });
  it("no sale-language the owner banned", () => {
    for (const r of offerRows({ kind: "check-improve", subject: "maths", chapterSlug: "triangles" })) {
      expect(`${r.name} ${r.line}`).not.toMatch(/599|999|save|%|unlimited|off\b/i);
    }
  });
});

describe("links: one tap to payment, and a 'What's inside' that never buys", () => {
  const rows = offerRows({ kind: "check-improve", subject: "maths", chapterSlug: "triangles" });
  it("every buy link round-trips through PacksShop's readBuyResume to exactly that pack", () => {
    for (const r of rows) {
      const search = r.buyHref.slice(r.buyHref.indexOf("?"));
      expect(r.buyHref.startsWith("/packs?buy=")).toBe(true);
      const want = readBuyResume(search);
      expect(want, r.buyHref).toEqual({ sku: r.sku, target: r.sku === "pack_bundle" ? undefined : r.target });
      expect(isValidPackTarget(r.sku, r.target || undefined)).toBe(true);
    }
    expect(buyHrefFor("pack_bundle", "")).toBe("/packs?buy=pack_bundle");
    expect(buyHrefFor("pack_chapter", "triangles")).toBe("/packs?buy=pack_chapter&t=triangles");
    expect(buyHrefFor("pack_cbq", "science")).toBe("/packs?buy=pack_cbq&t=science");
  });
  it("'What's inside' is the existing pop-up link and carries no buy", () => {
    expect(rows.map((r) => r.insideHref)).toEqual([
      "/packs?pack=bundle",
      "/packs?pack=subject&subject=maths",
      "/packs?pack=cbq&subject=maths",
      "/packs?mock=maths",
      "/packs?chapter=triangles",
    ]);
    for (const r of rows) {
      expect(r.insideHref).not.toMatch(/buy=/);
      const q = readPacksQuery(r.insideHref.slice(r.insideHref.indexOf("?")));
      expect(q.chapter ?? q.mock ?? q.pack, r.insideHref).toBeTruthy();
    }
    expect(insideHrefFor("pack_chapter", "triangles")).toBe("/packs?chapter=triangles");
  });
});

describe("ownership (Subject and Bundle cover chapters and mocks; the Bundle does NOT include CBQ)", () => {
  const all = offerRows({ kind: "check-improve", subject: "maths", chapterSlug: "triangles" });
  const skus = (owned: string[]) => unownedRows(all, owned.map((packId) => ({ packId }))).map((r) => r.sku);
  it("nothing owned: every row", () => {
    expect(skus([])).toEqual(["pack_bundle", "pack_subject", "pack_cbq", "pack_mock", "pack_chapter"]);
  });
  it("the Bundle hides the bundle, subject, mock and chapter rows but NOT CBQ", () => {
    expect(skus(["pack_bundle:all"])).toEqual(["pack_cbq"]);
  });
  it("the Maths Subject Pack hides subject, mock and chapter rows; the Bundle row stays (Science is not owned)", () => {
    expect(skus(["pack_subject:maths"])).toEqual(["pack_bundle", "pack_cbq"]);
  });
  it("the CBQ Pack hides only the CBQ row", () => {
    expect(skus(["pack_cbq:maths"])).toEqual(["pack_bundle", "pack_subject", "pack_mock", "pack_chapter"]);
  });
  it("another chapter's / subject's pack hides nothing", () => {
    expect(skus(["pack_chapter:real-numbers", "pack_mock:science", "pack_cbq:science"])).toEqual(["pack_bundle", "pack_subject", "pack_cbq", "pack_mock", "pack_chapter"]);
  });
  it("an owner of everything sees no rows", () => {
    expect(skus(["pack_bundle:all", "pack_cbq:maths"])).toEqual([]);
  });
});
