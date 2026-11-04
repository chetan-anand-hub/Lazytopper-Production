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
import { formatInr } from "./pricing";

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
  // /for-parents Board Pass (ForParentsPage: <span class="lt-fp__price-amt">). PRICE-FIXED-1: there is no Month pass line.
  take(new RegExp(`class="lt-fp__price-amt">${AMT}`), () => "Board Pass", () => model?.boardPassDisplay ?? null);
  // PARENTS-PAY-1: the two "Pay for my child · ₹N" buttons (hero + price section) carry the Board Pass price (boardPassPriceDisplay, read after mount).
  take(new RegExp(`data-testid="fp-pay-(?:hero|price)"[^>]*>Pay for my child · ${AMT}<`), () => "Board Pass (Pay button)", () => model?.boardPassDisplay ?? null);
  // /for-parents packs (ParentPacksSection): name span, then the price span in the same <li>.
  for (const li of html.matchAll(/<li class="lt-fpk__item">([\s\S]*?)<\/li>/g)) {
    const name = /class="lt-fpk__name">([^<]+)/.exec(li[1])?.[1]?.trim() ?? "";
    const p = new RegExp(`data-testid="fp-packs-price">${AMT}`).exec(li[1]);
    if (!p) continue;
    claimed.add(li.index! + li[0].indexOf(p[0]) + p[0].indexOf("₹"));
    found.push({ file, product: name, shown: `₹${p[1]}`, expected: PACK_BY_LABEL[name] ? packExp(name) : "(unknown pack label)" });
  }
  // /for-parents hero link ("PDF question banks · from ₹49" = the cheapest pack, the Chapter Pack) and the band (PARENTS-PACKS-2/3).
  take(new RegExp(`PDF question banks · from ${AMT}`), () => "Chapter Pack (hero 'from' price)", () => packExp("Chapter Pack"));
  take(new RegExp(`<li>(${LABELS})(?:<span class="lt-fpk-band__new">NEW</span>)?<span class="lt-fpk-band__price" data-testid="fp-band-price">${AMT}`), (m) => m[1], (m) => packExp(m[1]));
  // /packs (PacksPage): tiles, CBQ cards, CBQ buttons, CBQ sentence + footer.
  take(new RegExp(`class="lt-packs__tname">(${LABELS})</span><span class="lt-packs__tprice">${AMT}`), (m) => m[1], (m) => packExp(m[1]));
  take(new RegExp(`class="lt-cbq__name">(${LABELS})</h3><p class="lt-cbq__price">${AMT}`), (m) => m[1], (m) => packExp(m[1]));
  take(new RegExp(`(?:>|\\. |^)(${LABELS}) · ${AMT}<`), (m) => m[1], (m) => packExp(m[1]));
  take(new RegExp(`(${LABELS}) ${AMT}(?: ·|\\.)`), (m) => m[1], (m) => packExp(m[1]));
  // BYTE-CBQ-1: the one-tap "Buy Maths CBQ · ₹199" buttons (hub hero + every CBQ chapter page) and the hub hero's price line.
  take(new RegExp(`Buy (Maths|Science) CBQ · ${AMT}<`), (m) => `${m[1]} CBQ Pack (one-tap button)`, (m) => packExp(`${m[1]} CBQ Pack`));
  take(new RegExp(`CBQ Pack ${AMT} per subject`), () => "CBQ Pack (hub hero price line)", () => packExp("Maths CBQ Pack"));
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
      expect(fp).toContain("Board Pass (Pay button)");
      expect(fp).not.toContain("Month pass");
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

  // [FU-NIGHTLY-SKIPPED-1] Never skipped: the nightly refuses ANY skipped test, and `it.skipIf(SHIFTED)` made
  // every shifted-clock leg report 1 skipped. Under a shifted clock the date-driven prices (Board Pass, Month
  // pass) legitimately differ from the snapshot (that is what the 2026-11-18 MUTATION PROOF below pins), but
  // pack and bundle prices do not move with the clock, so those are still asserted exactly. At the real clock
  // (every PR run) the assertion is the full, unchanged one.
  it("every saved price equals the live price as of the clock", () => {
    const msgs = mismatchMessages(scan.found);
    expect(SHIFTED ? msgs.filter((m) => /Pack|Bundle/.test(m)) : msgs).toEqual([]);
  });

  it("MUTATION PROOF: a stale Board Pass price in a snapshot is caught (PRICE-FIXED-1: the live price no longer moves with the date)", () => {
    const stale = `<p><span class="lt-fp__price-amt">₹2,396</span></p>`;
    const pinned = new Date("2026-11-18T10:00:00+05:30");
    const r = scanSnapshot("for-parents.html", stale, pinned, predictCbseExamDate("10"));
    expect(mismatchMessages(r.found)).toEqual([
      "for-parents.html: snapshot shows ₹2,396 for Board Pass, live price is ₹1,917 — re-capture the prerender (capture job artifact flow)",
    ]);
    // ...and the live price steps to 2,499 at the founding deadline.
    expect(parentPriceModel(new Date("2026-11-30T23:59:59+05:30"), "2027-02-17")?.boardPassDisplay).toBe("₹1,917");
    expect(parentPriceModel(new Date("2026-12-01T00:00:00+05:30"), "2027-02-17")?.boardPassDisplay).toBe("₹2,499");
  });

  it("MUTATION PROOF: a changed pack price is caught", () => {
    const html = `<li class="lt-fpk__item"><span class="lt-fpk__name">Mock Pack</span><span class="lt-fpk__price" data-testid="fp-packs-price">₹${PACK_PRICE_INR.pack_mock + 1}</span></li>`;
    const r = scanSnapshot("x.html", html, now, predictCbseExamDate("10"));
    expect(mismatchMessages(r.found)).toEqual([
      `x.html: snapshot shows ₹${PACK_PRICE_INR.pack_mock + 1} for Mock Pack, live price is ₹${PACK_PRICE_INR.pack_mock} — re-capture the prerender (capture job artifact flow)`,
    ]);
  });

  it("MUTATION PROOF: a changed band price and a changed hero 'from' price are caught", () => {
    const html = `<a>PDF question banks · from ₹${PACK_PRICE_INR.pack_chapter + 1}</a><li>Mock Pack<span class="lt-fpk-band__price" data-testid="fp-band-price">₹${PACK_PRICE_INR.pack_mock + 1}</span></li>`;
    const r = scanSnapshot("x.html", html, now, predictCbseExamDate("10"));
    expect(r.unclaimed).toEqual([]);
    expect(mismatchMessages(r.found)).toHaveLength(2);
  });

  it("no saved snapshot carries a month-pass line (the month price is hidden: PRICE-FIXED-1)", () => {
    expect(scan.found.filter((f) => f.product === "Month pass")).toEqual([]);
  });
});
