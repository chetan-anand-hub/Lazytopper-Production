// PRERENDER-PRICE-GUARD-1 (owner ruling 29 Oct 2026): prerendered snapshots keep their prices, and
// CI fails when a saved price differs from the live price setting, so a price change forces a
// re-capture instead of relying on memory. See [FU-PRERENDER-FORPARENTS-PRICE-AFTER-30NOV].
//
// HOW IT CANNOT GO VACUOUS: the scan pins each product to the markup that renders it (read from
// ForParentsPage.tsx / ParentPacksSection.tsx / PacksPage.tsx), and the test asserts the scan FOUND
// the known occurrences. A markup change that makes an extractor match nothing fails the "found"
// test; it does not pass silently. Any rupee token in a priced page that no extractor claimed
// also fails.
//
// CLOCK: the expected Board Pass price depends on the date. The real-snapshot test uses the real
// "now" and is skipped under a shifted test clock (LT_TEST_CLOCK, the CI 2030 / IST-midnight jobs),
// where a stale snapshot is expected. The mutation test pins its own clock and always runs.
import { describe, it, expect, afterEach, vi } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { parentPriceModel } from "../pages/ForParentsPage";
import { predictCbseExamDate } from "../services/cbseExamDate";
import { PACK_PRICE_INR, type PackSku } from "../services/packs";
import { PRICE_MONTHLY_FOUNDING_INR, PRICE_MONTHLY_LIST_INR, foundingOfferOpen, formatInr } from "./pricing";

const ROOT = resolve(__dirname, "../../prerendered");

export type Found = { file: string; product: string; shown: string; expected: string };

const PACK_BY_LABEL: Record<string, PackSku> = {
  "Maths CBQ Pack": "pack_cbq",
  "Science CBQ Pack": "pack_cbq",
  "Chapter Pack": "pack_chapter",
  "Mock Pack": "pack_mock",
  "Subject Pack": "pack_subject",
  "Maths + Science Bundle": "pack_bundle",
};
const LABELS = Object.keys(PACK_BY_LABEL).map((l) => l.replace(/[+]/g, "\\+")).join("|");
const AMT = "₹([\\d,]+)";

function listHtml(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...listHtml(p));
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out.sort();
}

/** Pure: scan one snapshot. Returns what it found and any rupee token no extractor claimed. */
export function scanSnapshot(file: string, html: string, now: Date, boardIso: string) {
  const model = parentPriceModel(now, boardIso);
  const found: Found[] = [];
  const claimed = new Set<number>();
  const take = (re: RegExp, product: (m: RegExpExecArray) => string, expected: (m: RegExpExecArray) => string | null) => {
    for (const m of html.matchAll(new RegExp(re.source, "g"))) {
      const amtIdx = m.index! + m[0].lastIndexOf("₹");
      claimed.add(amtIdx);
      const exp = expected(m as RegExpExecArray);
      found.push({ file, product: product(m as RegExpExecArray), shown: `₹${m[m.length - 1]}`, expected: exp ?? "(unquotable)" });
    }
  };
  const packExp = (label: string) => formatInr(PACK_PRICE_INR[PACK_BY_LABEL[label]]);
  // /for-parents Board Pass (ForParentsPage: <span class="lt-fp__price-amt">) and Month pass line.
  take(new RegExp(`class="lt-fp__price-amt">${AMT}`), () => "Board Pass", () => model?.boardPassDisplay ?? null);
  take(new RegExp(`Or the Month pass: ${AMT} for a month`), () => "Month pass", () => model?.monthDisplay ?? null);
  // /for-parents packs (ParentPacksSection): name span, then the price span in the same <li>.
  for (const li of html.matchAll(/<li class="lt-fpk__item">([\s\S]*?)<\/li>/g)) {
    const name = /class="lt-fpk__name">([^<]+)/.exec(li[1])?.[1]?.trim() ?? "";
    const p = new RegExp(`data-testid="fp-packs-price">${AMT}`).exec(li[1]);
    if (!p) continue;
    claimed.add(li.index! + li[0].indexOf(p[0]) + p[0].indexOf("₹"));
    found.push({ file, product: name, shown: `₹${p[1]}`, expected: PACK_BY_LABEL[name] ? packExp(name) : "(unknown pack label)" });
  }
  // /packs (PacksPage): tiles, CBQ cards, CBQ buttons, CBQ sentence + footer.
  take(new RegExp(`class="lt-packs__tname">(${LABELS})</span><span class="lt-packs__tprice">${AMT}`), (m) => m[1], (m) => packExp(m[1]));
  take(new RegExp(`class="lt-cbq__name">(${LABELS})</h3><p class="lt-cbq__price">${AMT}`), (m) => m[1], (m) => packExp(m[1]));
  take(new RegExp(`(?:>|\\. |^)(${LABELS}) · ${AMT}<`), (m) => m[1], (m) => packExp(m[1]));
  take(new RegExp(`(${LABELS}) ${AMT}(?: ·|\\.)`), (m) => m[1], (m) => packExp(m[1]));
  take(new RegExp(`One-time ${AMT} per pack`), () => "CBQ Pack (one-time line)", () => packExp("Maths CBQ Pack"));

  // Unclaimed rupee tokens in a page that carries priced markup: fail rather than ignore.
  // The per-day line is a different, daily-moving figure and is deliberately not guarded.
  const unclaimed: string[] = [];
  if (found.length > 0) {
    for (const m of html.matchAll(/₹[\d,]+/g)) {
      if (claimed.has(m.index!)) continue;
      if (/≈\s*$/.test(html.slice(Math.max(0, m.index! - 3), m.index!))) continue;
      unclaimed.push(`${file}: unclaimed rupee token ${m[0]} near "${html.slice(Math.max(0, m.index! - 60), m.index!).replace(/<[^>]*>/g, " ").trim()}"`);
    }
  }
  return { found, unclaimed };
}

export function mismatchMessages(found: Found[]): string[] {
  return found
    .filter((f) => f.shown !== f.expected)
    .map((f) => `${f.file}: snapshot shows ${f.shown} for ${f.product}, live price is ${f.expected} — re-capture the prerender (capture job artifact flow)`);
}

function scanAll(now: Date, boardIso: string) {
  const found: Found[] = [];
  const unclaimed: string[] = [];
  for (const abs of listHtml(ROOT)) {
    const rel = relative(ROOT, abs).replace(/\\/g, "/");
    const r = scanSnapshot(rel, readFileSync(abs, "utf8"), now, boardIso);
    found.push(...r.found);
    unclaimed.push(...r.unclaimed);
  }
  return { found, unclaimed };
}

const SHIFTED = Boolean(process.env.LT_TEST_CLOCK);
afterEach(() => vi.useRealTimers());

describe("PRERENDER-PRICE-GUARD-1 — saved snapshot prices match the live price setting", () => {
  const now = new Date();
  const scan = scanAll(now, predictCbseExamDate("10"));

  it("the scan finds the known occurrences in both variants (cannot pass vacuously)", () => {
    for (const dir of ["", "__desktop/"]) {
      const of = (f: string) => scan.found.filter((x) => x.file === `${dir}${f}`);
      const fp = of("for-parents.html").map((x) => x.product);
      expect(fp).toContain("Board Pass");
      expect(fp).toContain("Month pass");
      for (const l of ["Maths CBQ Pack", "Science CBQ Pack", "Mock Pack", "Chapter Pack", "Maths + Science Bundle"]) expect(fp).toContain(l);
      expect(of("for-parents.html").length).toBeGreaterThanOrEqual(7);
      const pk = of("packs.html").map((x) => x.product);
      for (const l of ["Chapter Pack", "Mock Pack", "Subject Pack", "Maths + Science Bundle", "Maths CBQ Pack", "Science CBQ Pack"]) expect(pk).toContain(l);
      expect(of("packs.html").length).toBeGreaterThanOrEqual(10);
    }
    expect(scan.found.length).toBeGreaterThanOrEqual(34);
  });

  it("no rupee amount on a priced page is left unchecked", () => {
    expect(scan.unclaimed).toEqual([]);
  });

  it.skipIf(SHIFTED)("every saved price equals the live price as of the clock", () => {
    expect(mismatchMessages(scan.found)).toEqual([]);
  });

  it("MUTATION PROOF: on 2026-11-18 the guard fails against today's snapshots (pinned clock)", () => {
    vi.useFakeTimers({ now: new Date("2026-11-18T10:00:00+05:30") });
    const later = new Date();
    const boardIso = predictCbseExamDate("10");
    const r = scanAll(later, boardIso);
    const msgs = mismatchMessages(r.found);
    expect(msgs.some((m) => /for-parents\.html: snapshot shows ₹1,917 for Board Pass, live price is ₹\d/.test(m))).toBe(true);
    expect(msgs.some((m) => m.includes("__desktop/for-parents.html"))).toBe(true);
    // pack prices do not move with the clock, so they stay green
    expect(msgs.some((m) => /Pack|Bundle/.test(m))).toBe(false);
  });

  it("MUTATION PROOF: a changed pack price is caught", () => {
    const html = `<li class="lt-fpk__item"><span class="lt-fpk__name">Mock Pack</span><span class="lt-fpk__price" data-testid="fp-packs-price">₹${PACK_PRICE_INR.pack_mock + 1}</span></li>`;
    const r = scanSnapshot("x.html", html, now, predictCbseExamDate("10"));
    expect(mismatchMessages(r.found)).toEqual([
      `x.html: snapshot shows ₹${PACK_PRICE_INR.pack_mock + 1} for Mock Pack, live price is ₹${PACK_PRICE_INR.pack_mock} — re-capture the prerender (capture job artifact flow)`,
    ]);
  });

  it("founding vs list month constants are what the month line is built from", () => {
    const month = formatInr(foundingOfferOpen(now) ? PRICE_MONTHLY_FOUNDING_INR : PRICE_MONTHLY_LIST_INR);
    expect(parentPriceModel(now, predictCbseExamDate("10"))?.monthDisplay).toBe(month);
  });
});
