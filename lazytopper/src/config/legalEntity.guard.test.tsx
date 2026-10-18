/**
 * LEGAL-ENTITY-1 (owner ruling, 2026-10-14) — the website names the company that
 * operates LazyTopper, exactly as Razorpay KYC'd it.
 *
 * L1 one source · L2 the operator line on every legal page · L3 the Terms' first
 * paragraph and date · L4 both copyright lines · L6 every prerendered page that
 * carries a legal page or the public footer ships the name in its static HTML.
 * Copy is the owner's, word for word.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

import { LEGAL_ENTITY_NAME } from "./legalEntity";
import LegalPage from "../pages/LegalPage";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import { solutionsPaths } from "./solutionsPages";

afterEach(cleanup);

const NAME = "P&CGOLDDUST_TECH PRIVATE LIMITED";
const OPERATOR_LINE = `LazyTopper is operated by ${NAME}.`;
const TERMS_FIRST =
  `By using LazyTopper, you agree to these terms. LazyTopper is a service of ${NAME}, ` +
  "a company registered in India, and is an educational tool for CBSE Class 10 exam preparation.";
const COPYRIGHT = `© 2026 ${NAME}`;

const APP_ROOT = resolve(__dirname, "../..");
const SRC = join(APP_ROOT, "src");
const PRERENDERED = join(APP_ROOT, "prerendered");

/**
 * P8 (answered at trunk 3cdbed4b): every committed prerendered page that carried
 * "&copy; 2026 LazyTopper" — the public footer or a legal page — in both variants.
 */
const P8_PAGES = [
  "check-your-answer.html",
  "for-parents.html",
  "index.html",
  "legal/privacy.html",
  "legal/refund.html",
  "legal/terms.html",
  "ncert-class-10.html",
  "pricing.html",
  // SOLUTIONS-1/2: every published solutions page carries the public footer (derived, not hand-listed).
  ...solutionsPaths().map((p) => `${p.slice(1)}.html`),
];
const P8_FILES = P8_PAGES.flatMap((p) => [p, `__desktop/${p}`]);

const flat = (t: string | null | undefined) => (t ?? "").replace(/\s+/g, " ").trim();

function renderLegal(slug: string) {
  const { container } = render(
    <MemoryRouter initialEntries={[`/legal/${slug}`]}>
      <Routes>
        <Route path="/legal/:slug" element={<LegalPage />} />
      </Routes>
    </MemoryRouter>,
  );
  return container;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const isTestFile = (p: string) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(p);

describe("LEGAL-ENTITY-1 L1 — one source", () => {
  it("the constant is the owner's exact spelling", () => {
    expect(LEGAL_ENTITY_NAME).toBe(NAME);
  });

  it("the name appears exactly once in src/ outside tests (legalEntity.ts)", () => {
    const hits = walk(SRC)
      .filter((p) => /\.[cm]?[jt]sx?$/.test(p) && !isTestFile(p))
      .filter((p) => readFileSync(p, "utf8").includes("CGOLDDUST"))
      .map((p) => relative(SRC, p).split(sep).join("/"));
    expect(hits).toEqual(["config/legalEntity.ts"]);
    expect(readFileSync(join(SRC, "config/legalEntity.ts"), "utf8").split("CGOLDDUST").length - 1).toBe(1);
  });
});

describe("LEGAL-ENTITY-1 L2 — every legal page names the operator in its contact block", () => {
  for (const slug of ["privacy", "terms", "refund"]) {
    it(`/legal/${slug}`, () => {
      const contact = renderLegal(slug).querySelector(".lt-legal-contact");
      expect(contact).not.toBeNull();
      const line = contact!.querySelector('[data-testid="legal-operator"]');
      expect(flat(line?.textContent)).toBe(OPERATOR_LINE);
      // Above the per-page contact line, which still carries the support email.
      const next = line!.nextElementSibling;
      expect(flat(next?.textContent)).toContain("support@lazytopper.com");
    });
  }
});

describe("LEGAL-ENTITY-1 L3 — the Terms", () => {
  it("open with the owner's paragraph and say October 2026", () => {
    const c = renderLegal("terms");
    const first = c.querySelector(".lt-legal-card h2 + p");
    expect(flat(first?.textContent)).toBe(TERMS_FIRST);
    expect(flat(c.querySelector(".lt-legal-updated")?.textContent)).toBe("Last updated: October 2026");
  });

  it("Privacy's and Refund's dates are unchanged", () => {
    expect(flat(renderLegal("privacy").querySelector(".lt-legal-updated")?.textContent)).toBe(
      "Last updated: April 2026",
    );
    cleanup();
    expect(flat(renderLegal("refund").querySelector(".lt-legal-updated")?.textContent)).toBe(
      "Last updated: September 2026",
    );
  });
});

describe("LEGAL-ENTITY-1 L4 — both copyright lines", () => {
  it("the legal pages' foot", () => {
    const foot = renderLegal("terms").querySelector(".lt-legal-foot");
    expect(flat(foot?.querySelector("span")?.textContent)).toBe(COPYRIGHT);
    // L5 — the cross-links that follow are unchanged.
    expect(Array.from(foot!.querySelectorAll("a")).map((a) => a.getAttribute("href"))).toEqual([
      "/legal/privacy",
      "/legal/refund",
    ]);
  });

  it("the public footer", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/pricing"]}>
        <PublicLegalFooter />
      </MemoryRouter>,
    );
    const footer = container.querySelector("footer.lt-public-legal");
    expect(flat(footer?.querySelector("span")?.textContent)).toBe(COPYRIGHT);
    // L5 — the first link after it is still Chapters.
    expect(footer?.querySelector("span + a")?.getAttribute("href")).toBe("/exam-trends");
  });

  it("CONTROL — the old copyright text no longer renders", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/pricing"]}>
        <PublicLegalFooter />
      </MemoryRouter>,
    );
    expect(flat(container.textContent)).not.toContain("© 2026 LazyTopper");
    expect(flat(container.textContent)).toContain(COPYRIGHT);
  });
});

describe("LEGAL-ENTITY-1 L6 — the static HTML carries the name (P8 set)", () => {
  const ESCAPED = "P&amp;CGOLDDUST_TECH PRIVATE LIMITED";
  for (const file of P8_FILES) {
    it(file, () => {
      const html = readFileSync(join(PRERENDERED, file), "utf8");
      expect(html.split(ESCAPED).length - 1).toBeGreaterThanOrEqual(1);
      expect(html).not.toContain("2026 LazyTopper</span>");
    });
  }

  it("CONTROL — the P8 set is every prerendered file that carries a copyright line", () => {
    const withCopyright = walk(PRERENDERED)
      .filter((p) => p.endsWith(".html"))
      .filter((p) => /©|&copy;/.test(readFileSync(p, "utf8")))
      .map((p) => relative(PRERENDERED, p).split(sep).join("/"))
      .sort();
    expect(withCopyright).toEqual([...P8_FILES].sort());
  });
});
