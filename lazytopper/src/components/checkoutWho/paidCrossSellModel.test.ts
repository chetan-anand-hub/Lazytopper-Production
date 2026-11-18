/** PAID-XSELL-1 - the selection matrix: each bought product x owned state x Test Series paused -> the exact items, best first. */
import { describe, expect, it } from "vitest";
import { boardPassPriceDisplay, formatInr } from "../../config/pricing";
import { packPriceLabel } from "../../services/packs";
import { seriesTotals } from "../../lib/testSeries/testSeries";
import {
  BOARD_PASS_XSELL_BENEFIT,
  CBQ_PAGE_HREF,
  PAID_XSELL_MAX,
  PDF_XSELL_HREF,
  boardPassXsellPrice,
  classifyBought,
  pickPaidCrossSell,
  testSeriesXsellBenefit,
  type BoughtKind,
  type CrossSellInput,
} from "./paidCrossSellModel";

const NOW = Date.parse("2026-11-19T06:00:00Z");
const base = (over: Partial<CrossSellInput> = {}): CrossSellInput => ({
  bought: "pdf",
  packs: [],
  paidPremium: false,
  credit: null,
  packsOn: true,
  tsOffered: true,
  paymentsOn: true,
  now: NOW,
  ...over,
});
const ids = (i: CrossSellInput) => pickPaidCrossSell(i).map((x) => x.id);
const P = (...packIds: string[]) => packIds.map((packId) => ({ packId }));
const BUNDLE = "pack_bundle:all";
const TS = "test_series:all";
const CBQ_BOTH = ["pack_cbq:maths", "pack_cbq:science"];

describe("PAID-XSELL-1 matrix - nothing owned", () => {
  const cases: Array<[BoughtKind, string[]]> = [
    ["test_series", ["board_pass", "pdf_packs", "cbq_packs"]],
    ["pdf", ["test_series", "board_pass", "cbq_packs"]],
    ["cbq", ["test_series", "board_pass", "pdf_packs"]],
    ["pass", ["pdf_packs", "cbq_packs"]],
  ];
  for (const [bought, want] of cases) {
    it(`${bought} -> ${want.join(", ")}`, () => {
      expect(ids(base({ bought, paidPremium: bought === "pass" ? true : false }))).toEqual(want);
    });
  }
  it("never more than three", () => {
    expect(PAID_XSELL_MAX).toBe(3);
  });
});

describe("PAID-XSELL-1 matrix - Test Series paused", () => {
  const cases: Array<[BoughtKind, string[]]> = [
    ["test_series", ["board_pass", "pdf_packs", "cbq_packs"]],
    ["pdf", ["board_pass", "cbq_packs"]],
    ["cbq", ["board_pass", "pdf_packs"]],
    ["pass", ["pdf_packs", "cbq_packs"]],
  ];
  for (const [bought, want] of cases) {
    it(`${bought} -> ${want.join(", ")}`, () => {
      expect(ids(base({ bought, tsOffered: false, paidPremium: bought === "pass" }))).toEqual(want);
    });
  }
});

describe("PAID-XSELL-1 - never something already owned", () => {
  it("a paid pass (Board Pass) is never offered the Board Pass or the Test Series", () => {
    for (const bought of ["test_series", "pdf", "cbq", "pass"] as const) {
      const got = ids(base({ bought, paidPremium: true }));
      expect(got).not.toContain("board_pass");
      expect(got).not.toContain("test_series");
    }
  });
  it("a Test Series owner (server list or the server flag) is not offered it", () => {
    expect(ids(base({ bought: "pdf", packs: P(TS) }))).toEqual(["board_pass", "cbq_packs"]);
    expect(ids(base({ bought: "cbq", ownsTestSeriesFlag: true }))).toEqual(["board_pass", "pdf_packs"]);
  });
  it("the Bundle (or full coverage) owned: no PDF card", () => {
    expect(ids(base({ bought: "test_series", packs: P(BUNDLE) }))).toEqual(["board_pass", "cbq_packs"]);
    expect(ids(base({ bought: "pass", paidPremium: true, packs: P(BUNDLE) }))).toEqual(["cbq_packs"]);
    expect(ids(base({ bought: "cbq", packs: P("pack_subject:maths", "pack_subject:science") }))).toEqual(["test_series", "board_pass"]);
  });
  it("a Subject Pack alone does not cover the Bundle: the PDF card stays", () => {
    expect(ids(base({ bought: "cbq", packs: P("pack_subject:maths") }))).toContain("pdf_packs");
  });
  it("both CBQ Packs owned: no CBQ card; one owned: the other subject's one-tap path", () => {
    expect(ids(base({ bought: "pdf", packs: P(...CBQ_BOTH) }))).toEqual(["test_series", "board_pass"]);
    const one = pickPaidCrossSell(base({ bought: "pdf", packs: P("pack_cbq:maths") })).find((x) => x.id === "cbq_packs");
    expect(one?.title).toBe("Science CBQ Pack");
    expect(one?.href).toBe("/packs?buy=pack_cbq&t=science");
    const both = pickPaidCrossSell(base({ bought: "pdf" })).find((x) => x.id === "cbq_packs");
    expect(both?.href).toBe(CBQ_PAGE_HREF);
    expect(both?.price).toBe(`${packPriceLabel("pack_cbq", NOW)} per subject`);
  });
  it("everything owned -> nothing", () => {
    expect(ids(base({ bought: "pass", paidPremium: true, packs: P(BUNDLE, ...CBQ_BOTH) }))).toEqual([]);
    expect(ids(base({ bought: "test_series", paidPremium: true, packs: P(BUNDLE, ...CBQ_BOTH, TS) }))).toEqual([]);
  });
});

describe("PAID-XSELL-1 - unknown ownership hides the item it decides", () => {
  it("owned packs unknown -> no pack-based item (Test Series, PDF, CBQ)", () => {
    expect(ids(base({ bought: "pdf", packs: null }))).toEqual(["board_pass"]);
    expect(ids(base({ bought: "test_series", packs: null }))).toEqual(["board_pass"]);
    expect(ids(base({ bought: "pass", paidPremium: true, packs: null }))).toEqual([]);
  });
  it("paid status unknown -> no Board Pass and no Test Series", () => {
    expect(ids(base({ bought: "pdf", paidPremium: null }))).toEqual(["cbq_packs"]);
    expect(ids(base({ bought: "test_series", paidPremium: null }))).toEqual(["pdf_packs", "cbq_packs"]);
  });
  it("an unknown purchase suggests nothing", () => {
    expect(ids(base({ bought: null }))).toEqual([]);
  });
  it("switches off: packs off -> only the Board Pass; payments off -> no Board Pass", () => {
    expect(ids(base({ bought: "cbq", packsOn: false }))).toEqual(["board_pass"]);
    expect(ids(base({ bought: "cbq", paymentsOn: false }))).toEqual(["test_series", "pdf_packs"]);
  });
});

describe("PAID-XSELL-1 - prices, copy and links", () => {
  const credit = { creditInr: 999, payInr: 1083, expiresAtMs: NOW + 86_400_000 };
  it("a Test Series buyer sees the SERVER's payInr as the upgrade price", () => {
    const bp = pickPaidCrossSell(base({ bought: "test_series", credit }))[0];
    expect(bp.id).toBe("board_pass");
    expect(bp.price).toBe(`Upgrade for ${formatInr(1083)} incl. GST`);
    expect(bp.benefit).toBe(BOARD_PASS_XSELL_BENEFIT);
    expect(bp.href).toBe("/pricing?buy=board_pass");
  });
  it("a pack buyer sees the normal Board Pass price even if the server still sends a credit", () => {
    for (const bought of ["pdf", "cbq"] as const) {
      const bp = pickPaidCrossSell(base({ bought, credit })).find((x) => x.id === "board_pass");
      expect(bp?.price).toBe(`${boardPassPriceDisplay(NOW)} till your boards`);
    }
  });
  it("no credit / a lapsed credit -> the normal price", () => {
    expect(boardPassXsellPrice(null, NOW)).toBe(`${boardPassPriceDisplay(NOW)} till your boards`);
    expect(boardPassXsellPrice({ ...credit, expiresAtMs: NOW - 1 }, NOW)).toBe(`${boardPassPriceDisplay(NOW)} till your boards`);
  });
  it("Test Series and PDF cards use the pack price tags, the code's own counts, and the existing buy paths", () => {
    const [ts, , cbq] = pickPaidCrossSell(base({ bought: "pdf" }));
    expect(ts.price).toBe(packPriceLabel("test_series", NOW));
    expect(ts.href).toBe("/packs?buy=test_series");
    expect(testSeriesXsellBenefit()).toBe(`Get your written answers checked step by step, 2 checks per paper, ${seriesTotals().total} board-pattern tests`);
    expect(cbq.id).toBe("cbq_packs");
    const pdf = pickPaidCrossSell(base({ bought: "cbq" })).find((x) => x.id === "pdf_packs");
    expect(pdf?.price).toBe(packPriceLabel("pack_bundle", NOW));
    expect(pdf?.href).toBe(PDF_XSELL_HREF);
  });
  it("copy is additive: no overlap / 'already included' / 'don't need' / urgency words, and only internal links", () => {
    const all = (["test_series", "pdf", "cbq", "pass"] as const).flatMap((b) => pickPaidCrossSell(base({ bought: b, paidPremium: b === "pass", credit })));
    for (const x of all) {
      const text = `${x.title} ${x.benefit} ${x.price} ${x.cta}`;
      expect(text).not.toMatch(/same papers|already included|included in|don.?t need|overlap|hurry|last chance|only today|Check & Improve/i);
      expect(x.href.startsWith("/")).toBe(true);
      expect(x.href.startsWith("//")).toBe(false);
    }
  });
});

describe("PAID-XSELL-1 - classifyBought (the hosts' fixed names)", () => {
  it.each([
    ["pass", "the Board Pass", "pass"],
    ["pass", "the monthly pass", "pass"],
    ["pack", "Test Series Pack", "test_series"],
    ["pack", "Maths CBQ Pack", "cbq"],
    ["pack", "Science CBQ Pack", "cbq"],
    ["pack", "Maths + Science Bundle", "pdf"],
    ["pack", "Science Mock Pack", "pdf"],
    ["pack", "Maths Subject Pack", "pdf"],
    ["pack", "Circles Chapter Pack", "pdf"],
    ["pack", "Chapter Pack", "pdf"],
    ["pack", "PDF pack", null],
    ["pack", "", null],
    ["pass", "something else", null],
  ] as const)("%s %s -> %s", (kind, name, want) => {
    expect(classifyBought(kind, name)).toBe(want);
  });
});
