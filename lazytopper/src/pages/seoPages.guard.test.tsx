// @vitest-environment jsdom
import type { ReactElement } from "react";
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import MockTestClass10Page from "./MockTestClass10Page";
import QuestionBankClass10Page from "./QuestionBankClass10Page";
import MarkingSchemeClass10Page from "./MarkingSchemeClass10Page";
import { CBSE_MARKING_SCHEME_URL } from "./CheckYourAnswerPage";
import {
  CBSE_MARKING_SCHEME_SOURCE_URL,
  MARKING_SCHEME_PATH,
  MOCK_TEST_PATH,
  QUESTION_BANK_PATH,
  SEO_PAGES_PATHS,
  SEO_PAGE_DESCRIPTION_CAP,
  SEO_PAGE_SPECS,
  SEO_PAGE_TITLE_CAP,
  chapterLinks,
  seoPageJsonLd,
} from "../components/seoPages/seoPages";
import { MARKING_SCHEME_FAQ, MOCK_TEST_FAQ, QUESTION_BANK_FAQ, faqItemsForPath, faqJsonLdForPath } from "../components/seo/faqContent";
import { canonicalFor, canonicalPathFor } from "../config/canonicalUrl";
import { sitemapPaths, sitemapUrls } from "../config/sitemapUrls";
import { solutionsPaths } from "../config/solutionsPages";
import { PACK_PRICE_INR, packPriceLabel } from "../services/packs";
import { STATIC_PAGE_HEADS, headForPath, pageJsonLd, routeChunkModulesFor } from "../../scripts/seo/writeStaticHeads";
import { allDesktopTopics } from "../lib/desktop/topics";

/**
 * GUARD — SEO-PAGES-1: the three public search-landing pages.
 *   /mock-test-class-10 · /question-bank-class-10 · /cbse-marking-scheme-class-10
 *
 * ★ WHAT THIS PINS. Each page is advertised (sitemap), self-canonical, headed (title <= 60 with "Class 10" and "2027",
 * description <= 155), routed (a lazy chunk name in the route-chunk table and a route in App.tsx), carries exactly one h1, a
 * BreadcrumbList and a FAQPage whose strings are the visible FAQ, has 800-1,500 words, links only to pages that exist (every
 * internal href is advertised or a known live route, none has a query or hash), reads its prices from the pack helpers (no rupee
 * literal in the sources), and uses none of the owner's banned words.
 */

const LAZYTOPPER = process.cwd(); // vitest runs with cwd = lazytopper/
const PAGES: ReadonlyArray<{ path: string; Page: () => ReactElement; faq: typeof MOCK_TEST_FAQ; file: string; testId: string }> = [
  { path: MOCK_TEST_PATH, Page: MockTestClass10Page, faq: MOCK_TEST_FAQ, file: "src/pages/MockTestClass10Page.tsx", testId: "mock-test-page" },
  { path: QUESTION_BANK_PATH, Page: QuestionBankClass10Page, faq: QUESTION_BANK_FAQ, file: "src/pages/QuestionBankClass10Page.tsx", testId: "question-bank-page" },
  { path: MARKING_SCHEME_PATH, Page: MarkingSchemeClass10Page, faq: MARKING_SCHEME_FAQ, file: "src/pages/MarkingSchemeClass10Page.tsx", testId: "marking-scheme-page" },
];

/** Live routes that are not in the sitemap, so a link to them is allowed: the free check and the free full mocks. */
const LIVE_UNADVERTISED = new Set(["/", "/check-improve", "/full-mock/10/Maths", "/full-mock/10/Science"]);

function renderPage(Page: () => ReactElement, path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Page />
    </MemoryRouter>,
  );
}

function bodyText(container: HTMLElement): string {
  const main = container.querySelector("main") as HTMLElement;
  const footer = main.querySelector(".lt-public-legal");
  return (main.textContent || "").replace(footer?.textContent || "", "");
}

afterEach(() => cleanup());

describe("SEO-PAGES-1 — advertised, self-canonical, headed and routed", () => {
  it("is exactly the three paths, in SELF_CANONICAL and the sitemap, each canonical to itself on https://www.lazytopper.com", () => {
    expect([...SEO_PAGES_PATHS]).toEqual(["/mock-test-class-10", "/question-bank-class-10", "/cbse-marking-scheme-class-10"]);
    for (const path of SEO_PAGES_PATHS) {
      expect(sitemapPaths(), path).toContain(path);
      expect(canonicalPathFor(path), path).toBe(path);
      expect(canonicalFor(path, ""), path).toBe(`https://www.lazytopper.com${path}`);
      expect(sitemapUrls(""), path).toContain(`https://www.lazytopper.com${path}`);
    }
  });

  for (const { path } of PAGES) {
    it(`${path}: title <= ${SEO_PAGE_TITLE_CAP} with "Class 10" and "2027", description <= ${SEO_PAGE_DESCRIPTION_CAP}, and the static head is exactly this`, () => {
      const spec = SEO_PAGE_SPECS[path];
      expect(spec.title.length).toBeLessThanOrEqual(SEO_PAGE_TITLE_CAP);
      expect(spec.title).toContain("Class 10");
      expect(spec.title).toContain("2027");
      expect(spec.description.length).toBeLessThanOrEqual(SEO_PAGE_DESCRIPTION_CAP);
      expect(spec.h1).toContain("Class 10");
      expect(spec.h1).toContain("2027");
      expect(headForPath(path)).toEqual({ title: spec.title, description: spec.description });
      // Number-free like every other static head: the prices are on the page, never in the head.
      expect(spec.title + spec.description).not.toMatch(/₹/);
      // The three titles are all different (one query each).
      expect(new Set(SEO_PAGES_PATHS.map((p) => SEO_PAGE_SPECS[p].title)).size).toBe(3);
    });

    it(`${path}: has a route-chunk entry naming its lazy page module`, () => {
      const modules = routeChunkModulesFor(path);
      expect(modules).toHaveLength(1);
      const app = readFileSync(resolve(LAZYTOPPER, "src/App.tsx"), "utf8");
      expect(app).toContain(`import("./pages/${modules[0]}")`);
      expect(app).toContain(`path="${path}"`);
      expect(STATIC_PAGE_HEADS[path], "heads come from seoPages.ts, not a second copy").toBeUndefined();
    });
  }
});

describe("SEO-PAGES-1 — the pages", () => {
  for (const { path, Page, faq, testId } of PAGES) {
    describe(path, () => {
      it("renders signed out with exactly one h1 (the spec's), a breadcrumb and one hero call to action", () => {
        const { container } = renderPage(Page, path);
        const h1s = container.querySelectorAll("h1");
        expect(h1s).toHaveLength(1);
        expect(h1s[0].textContent).toBe(SEO_PAGE_SPECS[path].h1);
        expect(container.querySelector(`[data-testid="${testId}"]`)).not.toBeNull();
        const crumbs = container.querySelector('nav[aria-label="Breadcrumb"]') as HTMLElement;
        expect(crumbs.textContent).toContain(SEO_PAGE_SPECS[path].crumb);
        // PACKS-LPX-2: the free CTA is the one non-Buy hero call to action (the Buy is the primary beside it).
        expect(container.querySelectorAll(".lt-seol__cta:not(.lt-seol__cta--buy)")).toHaveLength(1);
      });

      it("is 800-1,500 words (FAQ included, the footer not)", () => {
        const { container } = renderPage(Page, path);
        const text = bodyText(container);
        const words = text.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
        // eslint-disable-next-line no-console
        console.log(`SEO_PAGES_WORDS ${path}: ${words}`);
        expect(words).toBeGreaterThanOrEqual(800);
        expect(words).toBeLessThanOrEqual(1500);
        expect(text).toContain("not affiliated with CBSE");
      });

      it("the FAQ is visible and the FAQPage JSON-LD is the same strings; the BreadcrumbList is Home > this page with canonical URLs", () => {
        const { container } = renderPage(Page, path);
        expect(faqItemsForPath(path)).toBe(faq);
        expect(faq.length).toBeGreaterThanOrEqual(4);
        const text = container.textContent || "";
        for (const item of faq) {
          expect(text).toContain(item.question);
          expect(text).toContain(item.answer);
        }
        const ld = faqJsonLdForPath(path) as { "@type": string; mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }> };
        expect(ld["@type"]).toBe("FAQPage");
        expect(ld.mainEntity.map((q) => q.name)).toEqual(faq.map((i) => i.question));
        expect(ld.mainEntity.map((q) => q.acceptedAnswer.text)).toEqual(faq.map((i) => i.answer));
        // number-free, like every other FAQ
        expect(faq.map((i) => i.question + i.answer).join(" ")).not.toMatch(/₹/);

        const crumb = seoPageJsonLd(path, "") as { "@type": string; itemListElement: Array<{ position: number; name: string; item: string }> };
        expect(crumb["@type"]).toBe("BreadcrumbList");
        expect(crumb.itemListElement).toEqual([
          { "@type": "ListItem", position: 1, name: "Home", item: "https://www.lazytopper.com/" },
          { "@type": "ListItem", position: 2, name: SEO_PAGE_SPECS[path].crumb, item: `https://www.lazytopper.com${path}` },
        ]);
        // the build stamps it through pageJsonLd; and no other path gets it
        expect(pageJsonLd(path, "", true)).toEqual(crumb);
        expect(seoPageJsonLd("/pricing", "")).toBeNull();
      });

      it.skipIf(path === MARKING_SCHEME_PATH)("PACKS-LPX-2: the hero Buy reads its price from the pack helpers and hops to the one-tap /packs?buy= link", () => {
        const { container } = render(
          <MemoryRouter initialEntries={[`${path}?utm_source=google&gclid=abc&junk=1`]}>
            <Page />
          </MemoryRouter>,
        );
        const buy = container.querySelector(".lt-seol__cta--buy") as HTMLAnchorElement;
        expect(buy).not.toBeNull();
        const sku = path === MOCK_TEST_PATH ? "pack_mock" : "pack_bundle";
        expect(buy.textContent).toContain(packPriceLabel(sku));
        expect(buy.textContent).toMatch(/^Buy /);
        const href = buy.getAttribute("href") as string;
        expect(href.startsWith(`/packs?buy=${sku}`)).toBe(true);
        expect(href).toContain("utm_source=google");
        expect(href).toContain("gclid=abc");
        expect(href).not.toContain("junk");
      });

      it("every internal link is a plain path to a page that exists, with no query or hash", () => {
        const { container } = renderPage(Page, path);
        // The public footer's own link row is shared by every page and is not this page's content.
        const hrefs = [...container.querySelectorAll("a[href]")]
          .filter((a) => !a.closest(".lt-public-legal") && !a.closest(".lt-seol__buy")) // PACKS-LPX-2: the hero Buy links are checked below
          .map((a) => a.getAttribute("href") as string);
        expect(hrefs.length).toBeGreaterThan(8);
        const advertised = new Set(sitemapPaths());
        for (const href of hrefs) {
          if (/^https?:\/\//.test(href)) continue; // external: only CBSE's own page, asserted below
          expect(href, href).toMatch(/^\//);
          expect(href, `${href} has a query or hash`).not.toMatch(/[?#]/);
          expect(advertised.has(href) || LIVE_UNADVERTISED.has(href), `${href} is neither advertised nor a known live route`).toBe(true);
        }
        for (const other of SEO_PAGES_PATHS.filter((p) => p !== path)) expect(hrefs, `links to ${other}`).toContain(other);
        const external = hrefs.filter((h) => /^https?:\/\//.test(h));
        for (const href of external) expect(href.startsWith("https://www.cbse.gov.in")).toBe(true);
      });

      it("uses none of the owner's banned words, never names the page 'Check & Improve', and claims no affiliation", () => {
        const { container } = renderPage(Page, path);
        const all = (container.textContent || "") + " " + SEO_PAGE_SPECS[path].title + " " + SEO_PAGE_SPECS[path].description;
        expect(all).not.toMatch(/\bAI\b|\bA\.I\./);
        expect(all.toLowerCase()).not.toContain("answer key");
        expect(all.toLowerCase()).not.toMatch(/\boptional\b/);
        expect(all.toLowerCase()).not.toMatch(/refund|money.back|guarantee/);
        expect(all).not.toMatch(/Check\s*(?:&|and)\s*Improve|\bC&I\b/i);
        expect(all.toLowerCase()).not.toMatch(/tuition|coaching|\bschools?\b|\bteachers?\b/);
        expect(all.toLowerCase()).not.toMatch(/testimonial|\d[\d,]*\+? (?:students|learners|users)|rated|stars?\b/);
        expect(all.toLowerCase()).not.toMatch(/(?<!not )affiliated with cbse/);
        expect(all.toLowerCase()).not.toMatch(/official partner|cbse[- ](?:approved|recognised|recognized|certified)/);
      });
    });
  }
});

describe("SEO-PAGES-1 — prices come from the pack helpers, never typed", () => {
  it("the mock page prints the Mock Pack and the Bundle exactly as the helper names them, '₹X + GST'", () => {
    const { container, getByTestId } = renderPage(MockTestClass10Page, MOCK_TEST_PATH);
    expect(getByTestId("mock-price-mock").textContent).toBe(`Mock Pack · ${packPriceLabel("pack_mock")}`);
    expect(getByTestId("mock-price-bundle").textContent).toBe(`Maths + Science Bundle · ${packPriceLabel("pack_bundle")}`);
    expect(getByTestId("mock-price-mock").getAttribute("data-price")).toBe(String(PACK_PRICE_INR.pack_mock));
    expect(container.textContent).toMatch(/Mock Pack · ₹\d+ \+ GST/);
  });

  it("the question-bank page prints the Chapter, Subject and Bundle prices from the helper", () => {
    const { container, getByTestId } = renderPage(QuestionBankClass10Page, QUESTION_BANK_PATH);
    expect(getByTestId("qbank-price-chapter").textContent).toBe(`Chapter Pack · ${packPriceLabel("pack_chapter")}`);
    expect(getByTestId("qbank-price-subject").textContent).toBe(`Subject Pack · ${packPriceLabel("pack_subject")}`);
    expect(getByTestId("qbank-price-bundle").textContent).toBe(`Maths + Science Bundle · ${packPriceLabel("pack_bundle")}`);
    expect(container.textContent).toMatch(/Chapter Pack · ₹\d+ \+ GST/);
  });

  it("the marking-scheme page carries no price at all", () => {
    const { container } = renderPage(MarkingSchemeClass10Page, MARKING_SCHEME_PATH);
    expect(container.textContent).not.toMatch(/₹/);
  });

  it("no source file of the three pages (or their shell, model and price line) holds a rupee literal", () => {
    for (const file of [
      "src/pages/MockTestClass10Page.tsx",
      "src/pages/QuestionBankClass10Page.tsx",
      "src/pages/MarkingSchemeClass10Page.tsx",
      "src/components/seoPages/SeoLandingShell.tsx",
      "src/components/seoPages/SeoPriceLine.tsx",
      "src/components/seoPages/seoPages.ts",
    ]) {
      const source = readFileSync(resolve(LAZYTOPPER, file), "utf8");
      // The doc comments name the shape '₹49 + GST' once in SeoPriceLine; strip comments before looking.
      const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
      expect(code, file).not.toMatch(/₹|\bRs\.?\s?\d|\bINR\b/);
    }
  });
});

describe("SEO-PAGES-1 — the question bank lists every chapter with only pages that exist", () => {
  it("every registry chapter has notes and CBQ links, and every solutions link is a published page", () => {
    const rows = chapterLinks();
    expect(rows.map((r) => r.topic.slug)).toEqual(allDesktopTopics().map((t) => t.slug));
    expect(rows).toHaveLength(26);
    const published = new Set(solutionsPaths());
    const advertised = new Set(sitemapPaths());
    for (const row of rows) {
      expect(advertised.has(row.notes), row.notes).toBe(true);
      expect(advertised.has(row.cbq), row.cbq).toBe(true);
      for (const link of row.solutions) expect(published.has(link.href), link.href).toBe(true);
    }
    // Trigonometry is two NCERT chapters, so two solutions pages per book; Heredity has only the Exemplar page.
    expect(rows.find((r) => r.topic.slug === "trigonometry")!.solutions.map((l) => l.href)).toContain("/ncert-solutions/introduction-to-trigonometry");
    expect(rows.find((r) => r.topic.slug === "heredity")!.solutions.map((l) => l.href)).toEqual(["/ncert-exemplar/heredity"]);
  });

  it("the rendered page links every chapter's notes and CBQ page, Maths and Science", () => {
    const { container } = renderPage(QuestionBankClass10Page, QUESTION_BANK_PATH);
    const hrefs = new Set([...container.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")));
    for (const topic of allDesktopTopics()) {
      expect(hrefs.has(`/notes/${topic.slug}`), topic.slug).toBe(true);
      expect(hrefs.has(`/cbq-class-10/${topic.slug}`), topic.slug).toBe(true);
    }
    expect(container.querySelector('[data-testid="qbank-chapters-maths"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="qbank-chapters-science"]')).not.toBeNull();
    expect(hrefs.has("/packs")).toBe(true);
    expect(hrefs.has("/practice-hub")).toBe(true);
  });
});

describe("SEO-PAGES-1 — the marking-scheme page's facts and source", () => {
  it("cites CBSE's own marking-scheme page (the one /check-your-answer cites) and links the Answer Checker and the guide", () => {
    expect(CBSE_MARKING_SCHEME_SOURCE_URL).toBe(CBSE_MARKING_SCHEME_URL);
    expect(CBSE_MARKING_SCHEME_SOURCE_URL.startsWith("https://www.cbse.gov.in/")).toBe(true);
    const { container, getByTestId } = renderPage(MarkingSchemeClass10Page, MARKING_SCHEME_PATH);
    const source = getByTestId("mscheme-source").querySelector("a") as HTMLAnchorElement;
    expect(source.getAttribute("href")).toBe(CBSE_MARKING_SCHEME_URL);
    expect(source.getAttribute("rel")).toContain("noopener");
    const hrefs = [...container.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/check-improve");
    expect(hrefs).toContain("/check-your-answer");
    const text = container.textContent || "";
    expect(text).toContain("Answer Checker");
    expect(text.toLowerCase()).not.toContain("official marking scheme");
  });

  it("states the CLAUDE.md §13 facts: section marks 1/2/3/5/4, 50/20/30 pattern, half-mark formula, error carried forward, unit, keywords, diagrams", () => {
    const { container, getByTestId } = renderPage(MarkingSchemeClass10Page, MARKING_SCHEME_PATH);
    const rows = [...getByTestId("mscheme-sections-table").querySelectorAll("tbody tr")].map((tr) => [...tr.querySelectorAll("td")].map((td) => td.textContent));
    expect(rows).toEqual([
      ["A", "MCQ and assertion-reason", "1 mark"],
      ["B", "Very short answer", "2 marks"],
      ["C", "Short answer", "3 marks"],
      ["D", "Long answer", "5 marks"],
      ["E", "Case-based, with parts", "4 marks"],
    ]);
    const text = container.textContent || "";
    for (const fragment of [
      "about 50% of the paper as competency-based",
      "about 20% as MCQs",
      "about 30% as short and long answers",
      "half a mark even when the rest of the answer goes wrong",
      "Error carried forward",
      "without its SI unit loses half a mark",
      "oesophagus",
      "marked separately",
      "scores full marks or zero on the answer alone",
    ]) {
      expect(text, fragment).toContain(fragment);
    }
  });
});

describe("SEO-PAGES-1 — no syllabus-excluded phrase (list read from syllabusGuard.ts)", () => {
  it("renders none of SURFACE_BANNED_PHRASES on any of the three pages", () => {
    const guard = readFileSync(resolve(LAZYTOPPER, "..", "scripts/src/syllabusGuard.ts"), "utf8");
    const block = guard.slice(guard.indexOf("export const SURFACE_BANNED_PHRASES"));
    const list = block.slice(block.indexOf("["), block.indexOf("];"));
    const phrases = [...list.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(phrases.length).toBeGreaterThan(40);
    expect(phrases).toContain("Natural Selection");
    for (const { path, Page } of PAGES) {
      const { container } = renderPage(Page, path);
      const text = (container.textContent || "").toLowerCase();
      expect(phrases.filter((p) => text.includes(p.toLowerCase())), path).toEqual([]);
      cleanup();
    }
  });
});
