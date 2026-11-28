// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import SamplePaperClass10Page from "./SamplePaperClass10Page";
import MockTestClass10Page from "./MockTestClass10Page";
import facts from "../components/seoPages/samplePaperFacts.json";
import {
  SAMPLE_PAPER_PATH,
  SEO_PAGES_PATHS,
  SEO_PAGE_DESCRIPTION_CAP,
  SEO_PAGE_SPECS,
  SEO_PAGE_TITLE_CAP,
  seoPageJsonLd,
} from "../components/seoPages/seoPages";
import { SAMPLE_PAPER_FAQ, faqItemsForPath, faqJsonLdForPath } from "../components/seo/faqContent";
import { canonicalFor, canonicalPathFor } from "../config/canonicalUrl";
import { sitemapPaths } from "../config/sitemapUrls";
import { MOCKS_PER_SUBJECT } from "../lib/packs/packLabels";
import { packPriceLabel } from "../services/packs";
import { STATIC_PAGE_HEADS, headForPath, pageJsonLd, routeChunkModulesFor } from "../../scripts/seo/writeStaticHeads";

/**
 * GUARD - SEO-SELL-3: the /sample-paper-class-10 landing ("class 10 maths sample paper").
 * Pins: advertised + self-canonical + headed (title <= 60, description <= 155, number-free) + chunk-routed; one h1; 800-1,500 words; the FAQ
 * is the FAQPage JSON-LD; every paper row is the real pinned paper's figures (samplePaperFacts.json, itself guarded against the bank); prices
 * come from the pack helpers; the owner's banned words ("free", "answer key", "solutions", "app") never appear; every internal link exists.
 * NOT asserted here: the `<Route path="/sample-paper-class-10">` in App.tsx (a globally forbidden file for this lane): see the lane report.
 */
const LAZYTOPPER = process.cwd();
const FACTS = facts as Record<string, { marks: number; cbqMarks: number; difficulty: string }>;
const LIVE_ROUTES = new Set(["/", "/check-improve", "/full-mock/10/Maths", "/full-mock/10/Science"]);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[SAMPLE_PAPER_PATH]}>
      <SamplePaperClass10Page />
    </MemoryRouter>,
  );
}
afterEach(() => cleanup());

describe("SEO-SELL-3 - head, canonical, sitemap, chunk", () => {
  it("is advertised and self-canonical on https://www.lazytopper.com, but is not one of the three pages' own cross-link set", () => {
    expect(sitemapPaths()).toContain(SAMPLE_PAPER_PATH);
    expect(canonicalPathFor(SAMPLE_PAPER_PATH)).toBe(SAMPLE_PAPER_PATH);
    expect(canonicalFor(SAMPLE_PAPER_PATH, "")).toBe("https://www.lazytopper.com/sample-paper-class-10");
    expect([...SEO_PAGES_PATHS]).not.toContain(SAMPLE_PAPER_PATH);
  });

  it(`title <= ${SEO_PAGE_TITLE_CAP}, description <= ${SEO_PAGE_DESCRIPTION_CAP}, number-free; the static head is exactly the spec`, () => {
    const spec = SEO_PAGE_SPECS[SAMPLE_PAPER_PATH];
    expect(spec.title.length).toBeLessThanOrEqual(SEO_PAGE_TITLE_CAP);
    expect(spec.title).toContain("Class 10");
    expect(spec.title).toContain("Sample Paper");
    expect(spec.title).toContain("2026-27");
    expect(spec.description.length).toBeLessThanOrEqual(SEO_PAGE_DESCRIPTION_CAP);
    expect(spec.h1).toBe("CBSE Class 10 Sample Paper 2026-27 — Maths & Science (2027 Boards)");
    expect(headForPath(SAMPLE_PAPER_PATH)).toEqual({ title: spec.title, description: spec.description });
    expect(spec.title + spec.description).not.toMatch(/₹/);
    const others = SEO_PAGES_PATHS.map((p) => SEO_PAGE_SPECS[p].title);
    expect(others).not.toContain(spec.title);
    expect(STATIC_PAGE_HEADS[SAMPLE_PAPER_PATH]).toBeUndefined();
  });

  it("has a route-chunk entry naming its lazy module, and vercel.json rewrites it to the shell like its siblings", () => {
    expect(routeChunkModulesFor(SAMPLE_PAPER_PATH)).toEqual(["SamplePaperClass10Page"]);
    const vercel = JSON.parse(readFileSync(resolve(LAZYTOPPER, "../vercel.json"), "utf8")) as { rewrites: Array<{ source: string; destination: string }> };
    const sibling = vercel.rewrites.find((r) => r.source === "/:path(mock-test-class-10/?)");
    const mine = vercel.rewrites.find((r) => r.source === "/:path(sample-paper-class-10/?)");
    expect(sibling).toBeDefined();
    expect(mine).toEqual({ source: "/:path(sample-paper-class-10/?)", destination: sibling!.destination });
  });

  it("BreadcrumbList is Home > Class 10 Sample Paper with canonical URLs, stamped by pageJsonLd", () => {
    const crumb = seoPageJsonLd(SAMPLE_PAPER_PATH, "") as { itemListElement: unknown[] };
    expect(crumb.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.lazytopper.com/" },
      { "@type": "ListItem", position: 2, name: "Class 10 Sample Paper", item: "https://www.lazytopper.com/sample-paper-class-10" },
    ]);
    expect(pageJsonLd(SAMPLE_PAPER_PATH, "", true)).toEqual(crumb);
  });
});

describe("SEO-SELL-3 - the page", () => {
  it("renders signed out with exactly one h1 (the spec's) and one non-Buy hero call to action", () => {
    const { container } = renderPage();
    const h1s = container.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toBe(SEO_PAGE_SPECS[SAMPLE_PAPER_PATH].h1);
    expect(container.querySelectorAll(".lt-seol__cta:not(.lt-seol__cta--buy)")).toHaveLength(1);
  });

  it("is 800-1,500 words (FAQ included, the footer not) and says it is not affiliated with CBSE", () => {
    const { container } = renderPage();
    const main = container.querySelector("main") as HTMLElement;
    const footer = main.querySelector(".lt-public-legal");
    const text = (main.textContent || "").replace(footer?.textContent || "", "");
    const words = text.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
    expect(words).toBeGreaterThanOrEqual(800);
    expect(words).toBeLessThanOrEqual(1500);
    expect(text).toContain("not affiliated with CBSE");
  });

  it("the FAQ is visible and the FAQPage JSON-LD carries the same strings", () => {
    const { container } = renderPage();
    expect(faqItemsForPath(SAMPLE_PAPER_PATH)).toBe(SAMPLE_PAPER_FAQ);
    expect(SAMPLE_PAPER_FAQ.length).toBeGreaterThanOrEqual(4);
    const text = container.textContent || "";
    for (const item of SAMPLE_PAPER_FAQ) {
      expect(text).toContain(item.question);
      expect(text).toContain(item.answer);
    }
    const ld = faqJsonLdForPath(SAMPLE_PAPER_PATH) as { "@type": string; mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }> };
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity.map((q) => q.name)).toEqual(SAMPLE_PAPER_FAQ.map((i) => i.question));
    expect(ld.mainEntity.map((q) => q.acceptedAnswer.text)).toEqual(SAMPLE_PAPER_FAQ.map((i) => i.answer));
    expect(SAMPLE_PAPER_FAQ.map((i) => i.question + i.answer).join(" ")).not.toMatch(/₹/);
  });

  it("lists the real papers: MOCKS_PER_SUBJECT rows per subject, each row's figures are the pinned paper's (80 marks, its competency marks, its level)", () => {
    const { getByTestId } = renderPage();
    for (const [subject, letter] of [["maths", "M"], ["science", "S"]] as const) {
      const rows = [...getByTestId(`sample-papers-${subject}`).querySelectorAll("tbody tr")];
      expect(rows).toHaveLength(MOCKS_PER_SUBJECT);
      rows.forEach((tr, i) => {
        const f = FACTS[`FM-${letter}${i + 1}`];
        expect(f, `FM-${letter}${i + 1}`).toBeDefined();
        const cells = [...tr.querySelectorAll("td")].map((td) => td.textContent);
        expect(cells.slice(0, 4)).toEqual([`${subject === "maths" ? "Maths" : "Science"} sample paper ${i + 1}`, String(f.marks), `${f.cbqMarks} of ${f.marks}`, f.difficulty]);
        const link = tr.querySelector("a") as HTMLAnchorElement;
        expect(link.getAttribute("href")).toBe(`/full-mock/10/${subject === "maths" ? "Maths" : "Science"}?paper=${i + 1}`);
      });
    }
  });

  it("the pattern table states Sections A-E as the pinned papers have them: 20x1, 5x2, 6x3, 4x5, 3x4 = 80", () => {
    const { getByTestId } = renderPage();
    const rows = [...getByTestId("sample-pattern-table").querySelectorAll("tbody tr")].map((tr) => [...tr.querySelectorAll("td")].map((td) => td.textContent));
    expect(rows.map((r) => [r[0], r[2], r[3]])).toEqual([["A", "20", "20"], ["B", "5", "10"], ["C", "6", "18"], ["D", "4", "20"], ["E", "3", "12"]]);
    expect(rows.reduce((s, r) => s + Number(r[3]), 0)).toBe(80);
    for (const f of Object.values(facts as Record<string, { sections: Record<string, { count: number; marks: number }> }>)) {
      expect(Object.values(f.sections).map((s) => `${s.count}/${s.marks}`)).toEqual(["20/20", "5/10", "6/18", "4/20", "3/12"]);
    }
  });

  it("prices come from the pack helpers as '₹X + GST', and the hero Buy / Test Series / Bundle hop to the one-tap /packs?buy= links", () => {
    const { container, getByTestId } = render(
      <MemoryRouter initialEntries={[`${SAMPLE_PAPER_PATH}?utm_source=google&gclid=abc&junk=1`]}>
        <SamplePaperClass10Page />
      </MemoryRouter>,
    );
    expect(getByTestId("sample-price-mock").textContent).toBe(`Mock Pack · ${packPriceLabel("pack_mock")}`);
    expect(getByTestId("sample-price-series").textContent).toBe(`Test Series Pack · ${packPriceLabel("test_series")}`);
    expect(getByTestId("sample-price-bundle").textContent).toBe(`Maths + Science Bundle · ${packPriceLabel("pack_bundle")}`);
    expect(container.textContent).toMatch(/Mock Pack · ₹\d+ \+ GST/);
    const href = (id: string) => (getByTestId(id) as HTMLAnchorElement).getAttribute("href") as string;
    expect(href("sample-buy-mock")).toMatch(/^\/packs\?buy=pack_mock&t=maths&utm_source=google&gclid=abc$/);
    expect(href("sample-buy-mock-science")).toContain("buy=pack_mock&t=science");
    expect(href("sample-buy-series")).toMatch(/^\/packs\?buy=test_series&utm_source=google/);
    expect(href("sample-buy-bundle")).toMatch(/^\/packs\?buy=pack_bundle&utm_source=google/);
    expect(href("sample-buy-board-pass")).toBe("/pricing?buy=board_pass");
    expect(href("sample-buy-mock")).not.toContain("junk");
    expect(getByTestId("sample-buy-mock").textContent).toMatch(/^Buy Mock Pack · ₹\d+ \+ GST$/);
  });

  it("no source of the page holds a rupee literal (prices are read, never typed)", () => {
    for (const file of ["src/pages/SamplePaperClass10Page.tsx", "src/components/seoPages/seoPages.ts"]) {
      const code = readFileSync(resolve(LAZYTOPPER, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
      expect(code, file).not.toMatch(/₹|\bRs\.?\s?\d|\bINR\b/);
    }
  });

  it("every internal link goes to a page that exists (advertised, a live route, or a known deep link)", () => {
    const { container } = renderPage();
    const advertised = new Set(sitemapPaths());
    const hrefs = [...container.querySelectorAll("a[href]")].filter((a) => !a.closest(".lt-public-legal")).map((a) => a.getAttribute("href") as string);
    expect(hrefs.length).toBeGreaterThan(20);
    for (const href of hrefs) {
      const path = href.split("?")[0];
      expect(advertised.has(path) || LIVE_ROUTES.has(path), `${href} is neither advertised nor a known live route`).toBe(true);
    }
    for (const p of SEO_PAGES_PATHS) expect(hrefs, `links to ${p}`).toContain(p);
  });

  it("uses none of the owner's banned words: free, answer key, solutions, app, AI; no refund promise, comparison or affiliation claim", () => {
    const { container } = renderPage();
    const spec = SEO_PAGE_SPECS[SAMPLE_PAPER_PATH];
    const all = (container.textContent || "") + " " + spec.title + " " + spec.description + " " + spec.h1;
    const lower = all.toLowerCase();
    expect(lower).not.toMatch(/\bfree\b/);
    expect(lower).not.toContain("answer key");
    expect(lower).not.toMatch(/\bsolutions?\b/);
    expect(lower).not.toMatch(/\bapps?\b/);
    expect(all).not.toMatch(/\bAI\b|\bA\.I\./);
    expect(lower).not.toMatch(/refund|money.back|guarantee|\boptional\b/);
    expect(all).not.toMatch(/Check\s*(?:&|and)\s*Improve|\bC&I\b/i);
    expect(lower).not.toMatch(/tuition|coaching|\bschools?\b|\bteachers?\b|testimonial|rated|stars?\b/);
    expect(lower).not.toMatch(/(?<!not )affiliated with cbse/);
    expect(lower).not.toMatch(/official partner|cbse[- ](?:approved|recognised|recognized|certified)/);
  });

  it("is linked from the three sibling landing pages' 'More for Class 10' list, so it is not an orphan", () => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/mock-test-class-10"]}>
        <MockTestClass10Page />
      </MemoryRouter>,
    );
    const links = [...getByTestId("seol-more").querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(links).toContain(SAMPLE_PAPER_PATH);
    cleanup();
    const mine = renderPage();
    const own = [...mine.getByTestId("seol-more").querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(own).not.toContain(SAMPLE_PAPER_PATH);
  });
});
