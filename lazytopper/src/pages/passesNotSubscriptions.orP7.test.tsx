/**
 * PRICING-TB-1 · OR-P7 (owner, 2026-09-26) — PASSES, NOT SUBSCRIPTIONS.
 *
 * Billing is one-time passes only (OR-P6): nothing renews, so nothing is ever
 * "subscribed to" or "cancelled". OR-P7 removed the residual wording. This file pins:
 *
 *   1. the owner's new strings, word for word (Terms, the /pricing head, the landing
 *      card period) — the FAQ, Billing Errors and /legal/refund head are pinned in
 *      PricingPage.pricing.test.tsx and LegalPage.refund.test.tsx;
 *   2. REPO-WIDE, that no student- or crawler-facing string says "subscribe",
 *      "subscription", "cancel at any time", "charged after cancelling", "/mo" or
 *      "/month" — EXCEPT the hits listed in KNOWN_REMAINING, each of which sits
 *      outside OR-P7's allowlist and is a tracked follow-up. The pin is scoped to what
 *      OR-P7 fixed: a NEW hit fails it; fixing a known one keeps it green.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

import LegalPage from "./LegalPage";
import { PaidPlanHead } from "./Welcome";
import { STATIC_PAGE_HEADS } from "../../scripts/seo/writeStaticHeads";

afterEach(cleanup);

function flat(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

const TERMS_NEW =
  "Free tier features are available without payment. Premium features require a pass at the listed prices. Passes are one-time payments and do not renew automatically.";
const TERMS_OLD_SENTENCES = [
  "Premium features require a subscription at the listed prices.",
  "You can cancel your subscription at any time.",
];
const PRICING_HEAD_DESCRIPTION =
  "What the free tier includes, what Premium adds, and how passes work. CBSE Class 10 Maths and Science prep.";

function renderTerms(): Element {
  const { container } = render(
    <MemoryRouter initialEntries={["/legal/terms"]}>
      <Routes>
        <Route path="/legal/:slug" element={<LegalPage />} />
      </Routes>
    </MemoryRouter>,
  );
  const card = container.querySelector(".lt-legal-card");
  expect(card).not.toBeNull();
  return card as Element;
}

describe("OR-P7 — the owner's strings, word for word", () => {
  it("Terms: the payment paragraph says a pass, one-time, no auto-renew", () => {
    const text = flat(renderTerms().textContent);
    expect(text).toContain(TERMS_NEW);
    for (const old of TERMS_OLD_SENTENCES) expect(text, old).not.toContain(old);
    expect(text).not.toMatch(/cancel your subscription/i);
  });

  it("the /pricing static head describes how passes work", () => {
    expect(STATIC_PAGE_HEADS["/pricing"]?.description).toBe(PRICING_HEAD_DESCRIPTION);
  });

  it("the landing card reads '… for a month' in both offer states, never '/mo'", () => {
    for (const offerOpen of [true, false]) {
      render(<PaidPlanHead offerOpen={offerOpen} />);
      const price = screen.getByTestId("landing-paid-price");
      const per = price.querySelector(".per");
      expect(flat(per?.textContent), `offerOpen=${offerOpen}`).toBe("for a month");
      // The span's leading space keeps the figure and the period apart ("₹599 for a month").
      expect(price.textContent, `offerOpen=${offerOpen}`).toMatch(/\d for a month/);
      expect(price.textContent, `offerOpen=${offerOpen}`).not.toMatch(SLASH_MONTH);
      cleanup();
    }
  });
});

// ─── Repo-wide scan ────────────────────────────────────────────────────────────

const SLASH_MONTH = /\/\s*mo(?:nth)?\b/i;
const WORD_BANS = [/subscri(?:be|bed|ber|bers|bing|ption|ptions)\b/i, /cancel at any time/i, /charged after cancelling/i];
const ALL_BANS = [...WORD_BANS, SLASH_MONTH];

const LINE_COMMENT = /(^|[^:"'`\\])\/\/[^\n]*/g;
const STRING_LITERAL = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
const JSX_TEXT = /[>}]([^<>{}]+)(?=[<{])/g;
/** A JSX-text candidate that contains code punctuation is code, not text. */
const LOOKS_LIKE_CODE = /[();=|?`"']/;

/**
 * Student-facing strings in a .ts/.tsx source: comments stripped FIRST, import
 * specifiers dropped, then string/template literals and JSX text nodes. A word ban
 * only counts in a string that reads as prose (has whitespace) — a bare key such as
 * "subscriptions" (a Firestore collection) is an identifier, not copy. The "/month"
 * ban counts everywhere, because "/mo" is a whole JSX text node on its own.
 */
function studentFacingHits(source: string): string[] {
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(LINE_COMMENT, "$1")
    .replace(/\bfrom\s+(["'])[^"'\n]*\1/g, " ")
    .replace(/\bimport\s*\(\s*(["'])[^"'\n]*\1\s*\)/g, " ");
  const strings: string[] = [];
  for (const m of code.matchAll(STRING_LITERAL)) strings.push(m[1] ?? m[2] ?? m[3] ?? "");
  for (const m of code.matchAll(JSX_TEXT)) if (!LOOKS_LIKE_CODE.test(m[1])) strings.push(m[1]);
  return strings
    .filter((s) => SLASH_MONTH.test(s) || (/\s/.test(s.trim()) && WORD_BANS.some((b) => b.test(s))))
    .map((s) => flat(s));
}

/**
 * Hits that remain AFTER OR-P7, each outside its allowlist. Keyed "<surface> :: <text>".
 * Listed so the pin can go green without them; remove an entry when it is fixed.
 */
const KNOWN_REMAINING = new Set<string>([
  // Terms heading — the owner ruled the sentence, not the heading. FU-PASSES-TERMS-HEADING.
  "src/pages/LegalPage.tsx :: Subscription &amp; Payment",
  "prerendered/legal/terms.html :: Subscription &amp; Payment",
  // Account menus — DesktopShell.tsx is CLAUDE.md §4-forbidden. FU-PASSES-MANAGE-SUBSCRIPTION-MENU.
  "src/components/desktop/DesktopShell.tsx :: Manage subscription",
  "src/components/mobile/MobileAccountMenu.tsx :: Manage subscription",
  // Internal data-map description; no component renders `.holds`. Classified internal.
  "src/services/studentDataMap.ts :: Subscription/trial state: tier, plan, trialStartDate.",
  // /legal/terms head — outside OR-P7's two head entries. FU-PASSES-TERMS-HEAD.
  "head:/legal/terms :: The terms for using LazyTopper, an educational tool for CBSE Class 10 exam preparation — accounts, subscriptions, and what the predictions are not.",
]);

const STATIC_TEXT_FILE = /\.(html|json|txt|xml|svg|webmanifest)$/;

function walk(dir: string, keep: (file: string) => boolean, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, keep, out);
    else if (keep(full)) out.push(full);
  }
  return out;
}

function staticHits(text: string): string[] {
  const out: string[] = [];
  const body = text.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ");
  for (const chunk of body.split(/<[^>]+>/)) {
    if (ALL_BANS.some((b) => b.test(chunk))) out.push(flat(chunk));
  }
  // Attribute values (meta descriptions, og:description, JSON-LD strings).
  for (const m of body.matchAll(/="([^"]*)"/g)) if (ALL_BANS.some((b) => b.test(m[1]))) out.push(flat(m[1]));
  return out;
}

describe("OR-P7 — REPO-WIDE: no subscription / cancel / '/month' wording a student or crawler reads", () => {
  it("scans src (strings, not comments), the static heads, index.html, public/ and prerendered/", () => {
    const root = process.cwd();
    const rel = (f: string) => relative(root, f).split(sep).join("/");
    const sources = walk(resolve(root, "src"), (f) => {
      const r = rel(f);
      return /\.(ts|tsx)$/.test(r) && !/\.test\.tsx?$/.test(r) && !r.startsWith("src/data/");
    });
    const statics = [
      resolve(root, "index.html"),
      ...walk(resolve(root, "public"), (f) => STATIC_TEXT_FILE.test(f)),
      ...walk(resolve(root, "prerendered"), (f) => STATIC_TEXT_FILE.test(f)),
    ];
    // The walk is real: it reaches every surface OR-P7 changed.
    const rels = [...sources, ...statics].map(rel);
    for (const must of [
      "src/pages/PricingPage.tsx",
      "src/pages/LegalPage.tsx",
      "src/pages/Welcome.tsx",
      "prerendered/pricing.html",
      "prerendered/legal/refund.html",
      "prerendered/legal/terms.html",
    ]) {
      expect(rels, must).toContain(must);
    }

    const hits: string[] = [];
    for (const f of sources) for (const h of studentFacingHits(readFileSync(f, "utf8"))) hits.push(`${rel(f)} :: ${h}`);
    for (const f of statics) for (const h of staticHits(readFileSync(f, "utf8"))) hits.push(`${rel(f)} :: ${h}`);
    for (const [path, head] of Object.entries(STATIC_PAGE_HEADS)) {
      for (const v of [head.title, head.description]) {
        if (ALL_BANS.some((b) => b.test(v))) hits.push(`head:${path} :: ${v}`);
      }
    }

    const unexpected = [...new Set(hits)].filter((h) => !KNOWN_REMAINING.has(h));
    expect(unexpected, `subscription wording on a student/crawler surface:\n${unexpected.join("\n")}`).toEqual([]);
  });

  it("CONTROL — the scanner sees the old sentences, the '/mo' span and a head, and ignores comments and keys", () => {
    const sample = [
      '/** "Once you subscribe as a founding member" — a comment, never a hit. */',
      "// You can cancel your subscription at any time.",
      'import { useSubscription } from "../hooks/useSubscription";',
      'const FIRESTORE_COLLECTION = "subscriptions";',
      "const a = `Once you subscribe as a founding member you keep that rate.`;",
      "<p>Premium features require a subscription at the listed prices. You can cancel your subscription at any time.</p>",
      "<p>If you were charged twice, charged after cancelling, or charged the wrong amount.</p>",
      '<span className="per">/mo</span>',
    ].join("\n");
    const found = studentFacingHits(sample);
    expect(found).toEqual(
      expect.arrayContaining([
        "Once you subscribe as a founding member you keep that rate.",
        "Premium features require a subscription at the listed prices. You can cancel your subscription at any time.",
        "If you were charged twice, charged after cancelling, or charged the wrong amount.",
        "/mo",
      ]),
    );
    expect(found).toHaveLength(4);
    // A static file and an old head description are caught too.
    expect(staticHits('<meta name="description" content="how to cancel a monthly plan and subscribe"><p>x</p>')).toHaveLength(1);
    expect(staticHits("<h2>Billing Errors</h2><p>charged after cancelling</p>")).toEqual(["charged after cancelling"]);
    // ...and the new wording trips nothing.
    expect(studentFacingHits(`<p>${TERMS_NEW}</p>\n<span className="per"> for a month</span>`)).toEqual([]);
  });
});
