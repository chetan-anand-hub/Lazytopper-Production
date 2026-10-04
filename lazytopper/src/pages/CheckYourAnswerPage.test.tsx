// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import CheckYourAnswerPage, { WORKED_EXAMPLES } from "./CheckYourAnswerPage";
import { canonicalFor } from "../config/canonicalUrl";
import { sitemapPaths, sitemapUrls } from "../config/sitemapUrls";
import { headForPath, routeChunkModulesFor } from "../../scripts/seo/writeStaticHeads";

/**
 * GUARD — the answer-writing guide at `/check-your-answer` (SEO-5 PR-3, ANSWER-GUIDE-1).
 *
 * ★ WHAT THIS PINS, AND WHY EACH IS INVISIBLE TO EVERY OTHER GATE.
 *   1. THE PAGE IS ADVERTISED, ROUTED AND HEADED as one fact: in the sitemap, in llms.txt,
 *      self-canonical, with its own title and description, and with a route in App.tsx. The
 *      generic guards check the SET; this names the PAGE, so a refactor that drops it from
 *      every list at once (all generic guards stay green) still goes red here.
 *   2. `/check-improve` STAYS UNADVERTISED (owner ruling: noindex, thin upload page).
 *   3. THE WORKED EXAMPLES ARE THE BANK'S, VERBATIM. Each question is read from its bank
 *      row by id and must appear in it word for word (an excerpt is allowed: one example
 *      shows only option (a)) — a paraphrase, or a row that changes, goes red.
 *   4. NO SYLLABUS-EXCLUDED PHRASE. The banned list is READ from
 *      `scripts/src/syllabusGuard.ts` at run time, never restated here.
 */

const LAZYTOPPER = process.cwd(); // vitest runs with cwd = lazytopper/
const PATH = "/check-your-answer";
const URL = "https://www.lazytopper.com/check-your-answer";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[PATH]}>
      <CheckYourAnswerPage />
    </MemoryRouter>,
  );
}

afterEach(() => cleanup());

describe("/check-your-answer — the page renders, signed out, with one way into the free check", () => {
  it("names the page in its h1 and sends both CTAs to /check-improve", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "How CBSE examiners mark Class 10 answers",
    );
    for (const id of ["cya-cta-hero", "cya-cta-check"]) {
      expect(screen.getByTestId(id).getAttribute("href"), id).toBe("/check-improve");
    }
  });

  it("renders all three worked examples, Maths and Science, each tagged with its bank row", () => {
    const { container } = renderPage();
    const rendered = [...container.querySelectorAll("[data-bank-id]")].map((n) => n.getAttribute("data-bank-id"));
    expect(rendered).toEqual(WORKED_EXAMPLES.map((e) => e.bankId));
    expect(rendered).toHaveLength(3);
    expect(WORKED_EXAMPLES.some((e) => e.tag.startsWith("Maths"))).toBe(true);
    expect(WORKED_EXAMPLES.some((e) => e.tag.startsWith("Science"))).toBe(true);
  });

  it("is 600-900 words, says it is not affiliated with CBSE, and never says 'official marking scheme'", () => {
    const { container } = renderPage();
    const main = container.querySelector("main") as HTMLElement;
    const footer = main.querySelector(".lt-public-legal");
    const text = (main.textContent || "").replace(footer?.textContent || "", "");
    const words = text.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
    // eslint-disable-next-line no-console
    console.log(`CYA_WORDS: ${words}`);
    expect(words).toBeGreaterThanOrEqual(600);
    expect(words).toBeLessThanOrEqual(900);
    expect(text).toContain("not affiliated with CBSE");
    expect(text.toLowerCase()).not.toContain("official marking scheme");
  });
});

describe("/check-your-answer — SEO-5 PR-4 text edits", () => {
  it("Example 3 writes every chemical formula with Unicode subscripts", () => {
    const { container } = renderPage();
    const ex3 = container.querySelector('[data-bank-id="PYQ-S-2025-CHEMRXN-006"]') as HTMLElement;
    // The step text only — the marks column ("1") sits in its own span beside it.
    const steps = [...ex3.querySelectorAll(".lt-cya__step")].map((n) => n.textContent || "").join(" | ");
    expect(steps).toContain("(a) 2HNO₃ + Ca(OH)₂ → Ca(NO₃)₂ + 2H₂O");
    expect(steps).toContain("(b) NaCl + AgNO₃ → AgCl + NaNO₃");
    // No ASCII digit straight after an element symbol or a closing bracket ("HNO3", "(OH)2").
    expect(steps).not.toMatch(/[A-Za-z)][0-9]/);
    // ...and no <sub> markup: the subscripts are characters, so they survive any text copy.
    expect(ex3.querySelector("sub")).toBeNull();
  });

  it("the Diagrams bullet says diagrams are OFTEN marked separately", () => {
    const { container } = renderPage();
    expect(container.textContent).toContain("The drawing and its labels are often marked separately,");
  });
});

describe("/check-your-answer — the worked examples are the bank's rows, verbatim", () => {
  for (const example of WORKED_EXAMPLES) {
    it(`${example.bankId}: question text is the bank row's questionText, verbatim`, () => {
      const file = resolve(LAZYTOPPER, "src/data/questionBanks/class10", example.bankFile);
      const source = readFileSync(file, "utf8");
      const start = source.indexOf(`id: "${example.bankId}"`);
      expect(start, `${example.bankId} not found in ${example.bankFile}`).toBeGreaterThanOrEqual(0);
      const row = source.slice(start, source.indexOf("pyqYear", start));
      const match = row.match(/questionText: "((?:[^"\\]|\\.)*)"/);
      expect(match, `${example.bankId} has no questionText`).not.toBeNull();
      // A verbatim EXCERPT: PYQ-S-LIGHT-004 shows only option (a) of an either/or question.
      // Containment still fails on any paraphrase, and on a row whose wording changes.
      expect(JSON.parse(`"${(match as RegExpMatchArray)[1]}"`)).toContain(example.question);
    });
  }
});

describe("/check-your-answer — no syllabus-excluded phrase (list read from syllabusGuard.ts)", () => {
  it("renders none of SURFACE_BANNED_PHRASES", () => {
    const guard = readFileSync(resolve(LAZYTOPPER, "..", "scripts/src/syllabusGuard.ts"), "utf8");
    const block = guard.slice(guard.indexOf("export const SURFACE_BANNED_PHRASES"));
    const list = block.slice(block.indexOf("["), block.indexOf("];"));
    const phrases = [...list.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    // A list that parsed to nothing would pass vacuously.
    expect(phrases.length).toBeGreaterThan(40);
    expect(phrases).toContain("Natural Selection");

    const { container } = renderPage();
    const text = (container.textContent || "").toLowerCase();
    const hits = phrases.filter((p) => text.includes(p.toLowerCase()));
    expect(hits).toEqual([]);
  });
});

describe("/check-your-answer — advertised, self-canonical, headed and routed (pins)", () => {
  it("is in the sitemap as a self-canonical URL; /check-improve is not", () => {
    expect(sitemapPaths()).toContain(PATH);
    expect(sitemapUrls("")).toContain(URL);
    expect(canonicalFor(PATH, "")).toBe(URL);
    expect(sitemapPaths()).not.toContain("/check-improve");
  });

  it("is listed in llms.txt; /check-improve is not", () => {
    const llms = readFileSync(resolve(LAZYTOPPER, "public", "llms.txt"), "utf8");
    expect(llms).toContain(`(${URL})`);
    expect(llms).not.toContain("https://www.lazytopper.com/check-improve");
  });

  it("has its own title and a description within the 155 cap, and preloads its own chunk", () => {
    const head = headForPath(PATH);
    expect(head?.title).toBe("How CBSE Examiners Mark Class 10 Answers | LazyTopper");
    expect(head?.description.length).toBeGreaterThan(0);
    expect(head?.description.length).toBeLessThanOrEqual(155);
    expect(routeChunkModulesFor(PATH)).toEqual(["CheckYourAnswerPage"]);
  });

  it("is routed in App.tsx through withRouteSuspense, as a lazy page module", () => {
    const app = readFileSync(resolve(LAZYTOPPER, "src", "App.tsx"), "utf8");
    expect(app).toContain('const CheckYourAnswerPage = lazy(() => import("./pages/CheckYourAnswerPage"));');
    expect(app).toContain(
      '<Route path="/check-your-answer" element={withRouteSuspense(<CheckYourAnswerPage />)} />',
    );
  });
});
