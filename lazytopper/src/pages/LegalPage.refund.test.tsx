/**
 * PRICING-TB-1 · OR-P4 (owner, 2026-09-26) — the refund page states a NO-REFUND policy.
 *
 * The old page promised "a full refund within 7 days of your first payment", a
 * pro-rata refund after that, and named "Board Season Packs and Annual plans" —
 * products that do not exist. A refund promise the business does not honour is the
 * most expensive sentence a legal page can carry, so the owner's wording is pinned
 * here WORD FOR WORD, and the retired promises are pinned ABSENT — in the rendered
 * page, in every student-facing source/static surface, and in the committed
 * prerendered/legal/refund.html that crawlers and no-JS readers receive.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

import LegalPage from "./LegalPage";

afterEach(cleanup);

const TITLE = "Cancellation & Refund Policy";
const UPDATED = "Last updated: September 2026";

/** The owner's sections, in order, word for word. */
const SECTIONS: Array<[string, string]> = [
  [
    "Payments are non-refundable",
    "All payments to LazyTopper are final and non-refundable, except for the billing errors listed below. Please use the free trial to decide before you pay.",
  ],
  [
    "Free Trial",
    "LazyTopper offers a 7-day free trial of Premium features. No payment is required during the trial.",
  ],
  [
    "Monthly Plan",
    "You can cancel at any time. You keep Premium until the end of the month you have paid for, and you will not be charged again. A month that has been paid for is not refunded.",
  ],
  [
    "Till-Boards Plan",
    "A one-time payment covering Premium until your first board exam. It is not refunded once paid.",
  ],
  [
    "Billing Errors",
    "If you were charged twice, charged after cancelling, or charged the wrong amount, email us and we will refund the amount charged in error. We start the refund within 3 business days; your bank usually credits it within 5–7 business days.",
  ],
];

/** Retired promises and products — none may appear anywhere a student reads. */
const RETIRED = [
  /full refund within 7 days/i,
  /pro-?rata/i,
  /board season pack/i,
  /annual plan/i,
  /refund eligibility/i,
  /non-refundable items/i,
];

function renderRefund() {
  const { container } = render(
    <MemoryRouter initialEntries={["/legal/refund"]}>
      <Routes>
        <Route path="/legal/:slug" element={<LegalPage />} />
      </Routes>
    </MemoryRouter>,
  );
  const card = container.querySelector(".lt-legal-card");
  expect(card).not.toBeNull();
  return card as Element;
}

function flat(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

describe("OR-P4 — the refund page, as rendered", () => {
  it("carries the owner's title and date", () => {
    const card = renderRefund();
    expect(flat(card.querySelector("h1")?.textContent)).toBe(TITLE);
    expect(flat(card.querySelector(".lt-legal-updated")?.textContent)).toBe(UPDATED);
  });

  it("renders exactly the owner's five sections, in order, word for word", () => {
    const card = renderRefund();
    const headings = Array.from(card.querySelectorAll("h2")).map((h) => flat(h.textContent));
    expect(headings).toEqual(SECTIONS.map(([h]) => h));
    for (const [heading, text] of SECTIONS) {
      const h2 = Array.from(card.querySelectorAll("h2")).find((h) => flat(h.textContent) === heading);
      expect(flat(h2?.nextElementSibling?.textContent), heading).toBe(text);
    }
  });

  it("keeps the existing contact email text (How to Contact Us)", () => {
    const card = renderRefund();
    const contact = card.querySelector(".lt-legal-contact");
    expect(flat(contact?.textContent)).toContain(
      "For refund requests or questions, email support@lazytopper.com",
    );
  });

  it("states NONE of the retired refund promises or products", () => {
    const text = flat(renderRefund().textContent);
    for (const retired of RETIRED) {
      expect(text, `retired refund copy still rendered: ${retired}`).not.toMatch(retired);
    }
    // CONTROL — the same text does carry the new policy, so the absences mean something.
    expect(text).toContain("final and non-refundable");
  });

  it("CONTROL — the retired patterns DO match the sentences the old page shipped", () => {
    const old =
      "you may request a full refund within 7 days of your first payment. Refund requests after 7 days will be processed on a pro-rata basis " +
      "Board Season Packs and Annual plans that have been used for more than 30 days are non-refundable Refund Eligibility Non-Refundable Items";
    for (const retired of RETIRED) expect(old).toMatch(retired);
  });
});

const STATIC_TEXT_FILE = /\.(html|json|txt|xml|svg)$/;

function walk(dir: string, keep: (rel: string) => boolean, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, keep, out);
    else if (keep(full)) out.push(full);
  }
  return out;
}

describe("OR-P4 — WHERE ELSE: no retired refund term on any student-facing surface", () => {
  it("'Board Season Pack', 'Annual plan' and 'pro-rata' appear nowhere in src, index.html, public/ or prerendered/", () => {
    const root = process.cwd();
    const rel = (f: string) => relative(root, f).split(sep).join("/");
    const files = [
      ...walk(resolve(root, "src"), (f) => {
        const r = rel(f);
        return /\.(ts|tsx)$/.test(r) && !/\.test\.tsx?$/.test(r) && !r.startsWith("src/data/");
      }),
      resolve(root, "index.html"),
      ...walk(resolve(root, "public"), (f) => STATIC_TEXT_FILE.test(f)),
      ...walk(resolve(root, "prerendered"), (f) => STATIC_TEXT_FILE.test(f)),
    ];
    // The walk is real: it reaches this page's source and its prerendered copy.
    const rels = files.map(rel);
    expect(rels).toContain("src/pages/LegalPage.tsx");
    expect(rels).toContain("prerendered/legal/refund.html");

    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const term of [/board season pack/i, /annual plan/i, /pro-?rata/i]) {
        const m = term.exec(text);
        if (m) hits.push(`${rel(file)}: "${text.slice(Math.max(0, m.index - 30), m.index + 30)}"`);
      }
    }
    expect(hits, `retired refund terms on student-facing surfaces:\n${hits.join("\n")}`).toEqual([]);
  });

  it("the committed prerendered/legal/refund.html carries the new policy and none of the old", () => {
    const html = readFileSync(resolve(process.cwd(), "prerendered/legal/refund.html"), "utf8")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ");
    expect(html).toContain(`<h1>${TITLE}</h1>`);
    expect(html).toContain(UPDATED);
    for (const [heading, text] of SECTIONS) {
      expect(html, heading).toContain(`<h2>${heading}</h2><p>${text}</p>`);
    }
    for (const retired of RETIRED) {
      expect(html, `retired refund copy in prerendered/legal/refund.html: ${retired}`).not.toMatch(retired);
    }
  });
});
