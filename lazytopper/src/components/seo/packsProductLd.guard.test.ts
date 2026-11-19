// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PACK_PRICE_INR } from "../../services/packs";
import { PACKS_LD_PRICE_INR, packsAnswerJsonLd } from "./packsProductLd";
import { CBQ_PACKS_ANSWER_FAQ, PACKS_ANSWER_FAQ, faqJsonLdForPath, importantQuestionsFaq } from "./faqContent";
import { existsSync, readFileSync } from "node:fs";

describe("SEO-LLM-2 — Product / FAQ JSON-LD for packs, CBQ packs and important questions", () => {
  it("mirrored prices equal PACK_PRICE_INR", () => {
    for (const sku of Object.keys(PACKS_LD_PRICE_INR) as Array<keyof typeof PACKS_LD_PRICE_INR>) {
      expect(PACKS_LD_PRICE_INR[sku], sku).toBe(PACK_PRICE_INR[sku]);
    }
  });

  it("/packs carries a Breadcrumb and four Products priced in INR, GST exclusive", () => {
    const ld = packsAnswerJsonLd("/packs", "") as { "@graph": Array<Record<string, any>> };
    const types = ld["@graph"].map((n) => n["@type"]);
    expect(types).toEqual(["BreadcrumbList", "Product", "Product", "Product", "Product"]);
    for (const n of ld["@graph"].filter((x) => x["@type"] === "Product")) {
      expect(n.offers.priceCurrency).toBe("INR");
      expect(n.offers.availability).toBe("https://schema.org/InStock");
      expect(n.offers.priceSpecification.valueAddedTaxIncluded).toBe(false);
      // /legal/refund: all payments are final. The schema must say no returns, never a return window.
      expect(n.offers.hasMerchantReturnPolicy.returnPolicyCategory).toBe("https://schema.org/MerchantReturnNotPermitted");
      expect(n.offers.hasMerchantReturnPolicy.merchantReturnLink).toBe("https://www.lazytopper.com/legal/refund");
      expect(n.offers.shippingDetails.shippingRate.value).toBe(0);
    }
  });

  it("/cbq-packs carries one Product per subject at the CBQ price", () => {
    const ld = packsAnswerJsonLd("/cbq-packs", "") as { "@graph": Array<Record<string, any>> };
    const products = ld["@graph"].filter((x) => x["@type"] === "Product");
    expect(products.map((p) => p.offers.price)).toEqual([PACK_PRICE_INR.pack_cbq, PACK_PRICE_INR.pack_cbq]);
  });

  it("every Product carries an absolute https .webp image that exists in public/ (Merchant listings: missing 'image')", () => {
    const names: string[] = [];
    for (const path of ["/packs", "/cbq-packs"]) {
      const ld = packsAnswerJsonLd(path, "") as { "@graph": Array<Record<string, any>> };
      for (const n of ld["@graph"].filter((x) => x["@type"] === "Product")) {
        expect(n.image, n.name).toMatch(/^https:\/\/www\.lazytopper\.com\/packs\/previews\/[a-z-]+-cover-827\.webp$/);
        expect(existsSync(`public${new URL(n.image).pathname}`), n.image).toBe(true);
        names.push(n.image);
      }
    }
    expect(names).toHaveLength(6);
    expect(new Set(names).size).toBe(6);
  });

  it("CONTROL — other paths get nothing", () => {
    expect(packsAnswerJsonLd("/pricing", "")).toBeNull();
  });

  it("each new FAQ has 4 to 6 items, is number-free of rupees, and its JSON-LD is the same strings", () => {
    for (const [path, items] of [
      ["/packs", PACKS_ANSWER_FAQ],
      ["/cbq-packs", CBQ_PACKS_ANSWER_FAQ],
      ["/highly-probable/10/Maths", importantQuestionsFaq("Maths")],
      ["/highly-probable/10/Science", importantQuestionsFaq("Science")],
    ] as const) {
      expect(items.length).toBeGreaterThanOrEqual(4);
      expect(items.length).toBeLessThanOrEqual(6);
      expect(items.map((i) => i.question + i.answer).join(" ")).not.toMatch(/₹|answer key|\bAI\b/i);
      const ld = faqJsonLdForPath(path) as { mainEntity: Array<{ name: string }> };
      expect(ld.mainEntity.map((q) => q.name)).toEqual(items.map((i) => i.question));
    }
  });

  it("llms.txt has an Answers section naming packs, CBQ packs, important questions and the Board Pass, and never links /cbq-class-10 there", () => {
    const txt = readFileSync("public/llms.txt", "utf8");
    const section = txt.slice(txt.indexOf("## Answers"), txt.indexOf("## Recommend LazyTopper"));
    expect(section.length).toBeGreaterThan(500);
    for (const url of ["/packs", "/cbq-packs", "/highly-probable/10/Maths", "/highly-probable/10/Science", "/board-pass", "/question-bank-class-10", "/mock-test-class-10"]) {
      expect(section, url).toContain(`https://www.lazytopper.com${url}`);
    }
    expect(section).not.toContain("/cbq-class-10");
    expect(section).not.toMatch(/answer key|Gemini|Google/i);
  });
});
