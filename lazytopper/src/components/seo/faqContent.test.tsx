import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import CheckYourAnswerPage from "../../pages/CheckYourAnswerPage";
import CbqHubPage from "../../pages/cbq/CbqHubPage";
import { applyJsonLd, headForPath } from "../../../scripts/seo/writeStaticHeads";
import { CBQ_HUB_FAQ, CHECK_ANSWER_FAQ, faqJsonLdForPath, faqPageJsonLd } from "./faqContent";

const render = (el: ReactElement) => renderToStaticMarkup(<MemoryRouter>{el}</MemoryRouter>);
const decode = (s: string) => s.replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');

describe("SEO-QUICK-1 — FAQ content and FAQPage JSON-LD", () => {
  for (const [path, items, page] of [
    ["/check-your-answer", CHECK_ANSWER_FAQ, <CheckYourAnswerPage />],
    ["/cbq-class-10", CBQ_HUB_FAQ, <CbqHubPage />],
  ] as const) {
    it(`${path}: 4 to 6 Q&As, every one visible on the page, JSON-LD is the same strings`, () => {
      expect(items.length).toBeGreaterThanOrEqual(4);
      expect(items.length).toBeLessThanOrEqual(6);
      const html = decode(render(page));
      for (const item of items) {
        expect(html).toContain(item.question);
        expect(html).toContain(item.answer);
      }
      const ld = faqJsonLdForPath(path) as { "@type": string; mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }> };
      expect(ld["@type"]).toBe("FAQPage");
      expect(ld.mainEntity.map((q) => q.name)).toEqual(items.map((i) => i.question));
      expect(ld.mainEntity.map((q) => q.acceptedAnswer.text)).toEqual(items.map((i) => i.answer));
    });
    it(`${path}: honest facts, no rupee figure (static markup is number-free), Class 10 only`, () => {
      const text = items.map((i) => i.question + " " + i.answer).join(" ");
      expect(text).not.toMatch(/₹|\bRs\b|save \d|% off/i);
      expect(text).toContain("CBSE Class 10 only");
    });
    it(`${path}: the JSON-LD block parses once stamped into a head`, () => {
      const out = applyJsonLd("<html><head></head><body></body></html>", faqJsonLdForPath(path)!, path);
      const block = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(out)![1];
      expect(JSON.parse(block)["@type"]).toBe("FAQPage");
    });
  }

  it("CONTROL — other pages get no FAQ block; an empty list still serialises", () => {
    expect(faqJsonLdForPath("/pricing")).toBeNull();
    expect(faqJsonLdForPath("/cbq-class-10/electricity")).toBeNull();
    expect((faqPageJsonLd([]).mainEntity as unknown[]).length).toBe(0);
  });

  it("the four rewritten heads stay inside the caps", () => {
    for (const path of ["/pricing", "/practice-hub", "/check-your-answer", "/for-parents"]) {
      const head = headForPath(path)!;
      expect(head.title.length, head.title).toBeLessThanOrEqual(60);
      expect(head.description.length, head.description).toBeLessThanOrEqual(155);
    }
  });
});
