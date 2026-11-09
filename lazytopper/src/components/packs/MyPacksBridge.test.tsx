/**
 * BRIDGE-PANEL-1 - the My packs panel as a student sees it: the Board Pass card only WITHOUT a paid Board Pass (one view + one
 * tap event, no PII); the first-marked card only after a real graded pack paper; "Get marked" on the paper's existing route;
 * "Download" opens that pack's files; "+ N more papers" expands; CBQ rows hidden until the student has CBQ paper codes.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { SessionRecord } from "../../services/sessionRecords";
import type { GradeAllowance } from "./myPacksBridgeModel";

const data = vi.hoisted(() => ({ records: [] as SessionRecord[], allowance: null as GradeAllowance | null, known: true }));
const track = vi.hoisted(() => ({ sale: vi.fn(), pack: vi.fn() }));
vi.mock("../../lib/packs/packAnalytics", async (orig) => ({
  ...(await orig<typeof import("../../lib/packs/packAnalytics")>()),
  trackPackEvent: (...a: unknown[]) => track.pack(...a),
}));
vi.mock("../../analytics/analytics", async (orig) => ({
  ...(await orig<typeof import("../../analytics/analytics")>()),
  trackSaleMoment: (...a: unknown[]) => track.sale(...a),
}));

import MyPacksBridge from "./MyPacksBridge";

const chapter = { packId: "pack_chapter:real-numbers", sku: "pack_chapter", target: "real-numbers", pricePaidInr: 49, paidAt: 5 };
const bundle = { packId: "pack_bundle:all", sku: "pack_bundle", target: "", pricePaidInr: 299, paidAt: 9 };
const cbq = { packId: "pack_cbq:maths", sku: "pack_cbq", target: "maths", pricePaidInr: 99, paidAt: 7 };

function rec(over: Partial<SessionRecord> & Pick<SessionRecord, "id" | "surface">): SessionRecord {
  return {
    worksheetId: "w",
    title: "Paper",
    subject: "maths",
    topicKeys: ["real-numbers"],
    questionIds: [],
    marksAwarded: 0,
    marksTotal: 0,
    status: "pending-upload",
    fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    sectionBreakdown: null,
    gradedAt: 1,
    perQuestionRef: "",
    dedupKey: "",
    ...over,
  } as SessionRecord;
}

const buyPack = vi.fn();
function show(props: { packs: Array<typeof chapter>; paidPass?: boolean; onOpenFiles?: (id: string) => void }) {
  return render(
    <MemoryRouter>
      <div className="lt-packs">
        <MyPacksBridge
          packs={props.packs}
          titleOf={(p) => `T:${p.packId}`}
          data={{ records: data.records, allowance: data.allowance, paidPass: props.paidPass ?? false, entitlementKnown: data.known }}
          onBuyPack={buyPack}
          onOpenFiles={props.onOpenFiles ?? (() => undefined)} />
      </div>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  data.records = [];
  data.allowance = null;
  data.known = true;
  track.sale.mockReset();
  track.pack.mockReset();
  buyPack.mockReset();
  localStorage.clear();
});
afterEach(cleanup);

describe("BRIDGE-PANEL-1 · the Board Pass card (buyers only, never to a pass holder)", () => {
  it("a pack owner without a paid pass sees the approved card, linking to /pricing; ONE view event, ONE tap event", () => {
    show({ packs: [chapter] });
    const card = screen.getByTestId("packs-bridge-pass");
    expect(within(card).getByText("Your pack has the questions. Board Pass marks every answer.")).toBeTruthy();
    expect(within(card).getByText("Keep using your pack either way — it is yours for good.")).toBeTruthy();
    expect(within(card).getByText("CBSE examiner style marking")).toBeTruthy();
    const cta = within(card).getByTestId("packs-bridge-pass-cta");
    expect(cta.getAttribute("href")).toBe("/pricing");
    expect(track.sale).toHaveBeenCalledTimes(1);
    expect(track.sale).toHaveBeenCalledWith("sale_moment_shown", { surface: "my_packs", offer: "board_pass", rank: 1 });
    fireEvent.click(cta);
    expect(track.sale).toHaveBeenLastCalledWith("sale_moment_tap", { surface: "my_packs", offer: "board_pass", rank: 1 });
    expect(track.sale).toHaveBeenCalledTimes(2);
  });

  it("a paid Board Pass holder sees the papers but NO Board Pass card and no Board Pass event", () => {
    show({ packs: [chapter], paidPass: true });
    expect(screen.queryByTestId("packs-bridge-pass")).toBeNull();
    expect(screen.getAllByTestId("packs-bridge-row")).toHaveLength(3);
    expect(track.sale).not.toHaveBeenCalled();
  });

  it("entitlement not known yet (no server tier, no reconciled subscription) -> no Board Pass card and NO view event", () => {
    data.known = false;
    show({ packs: [chapter] });
    expect(screen.getAllByTestId("packs-bridge-row")).toHaveLength(3);
    expect(screen.queryByTestId("packs-bridge-pass")).toBeNull();
    expect(track.sale).not.toHaveBeenCalled();
  });

  it("no packs -> nothing at all", () => {
    show({ packs: [] });
    expect(screen.queryByTestId("packs-bridge")).toBeNull();
  });
});

describe("BRIDGE-PANEL-1 · papers and the first-marked card", () => {
  it("no graded pack paper -> no first-marked card; the approved intro with the truth-fixed free line and the sample link", () => {
    show({ packs: [chapter] });
    expect(screen.queryByTestId("packs-bridge-first")).toBeNull();
    expect(screen.getByText("Get your papers marked")).toBeTruthy();
    expect(screen.getByText(/Every account gets its first paper of each kind marked free\./)).toBeTruthy();
    expect(screen.queryByText(/Your first paper of each kind is free/)).toBeNull();
    expect(screen.getByTestId("packs-bridge-sample").getAttribute("href")).toBe("/media/lazytopper-marked-sample-PK-M-RN-CT1.pdf");
  });

  it("a graded pack paper -> its real score and its own mistake line; View scorecard reopens it", () => {
    data.records = [
      rec({
        id: "PK-M-RN-CT1",
        surface: "chapter-test",
        status: "graded",
        marksAwarded: 25.5,
        marksTotal: 31,
        marksLostByType: { conceptual: 3, calculation: 1, silly: 0.5, presentation: 1, unattempted: 0, untyped: 0 },
        marksLostByTypeVersion: 1,
      }),
    ];
    show({ packs: [chapter] });
    const first = screen.getByTestId("packs-bridge-first");
    expect(within(first).getByText("Your first paper is marked")).toBeTruthy();
    expect(within(first).getByText("25.5")).toBeTruthy();
    expect(within(first).getByText("/ 31")).toBeTruthy();
    expect(within(first).getByTestId("packs-bridge-first-line").textContent).toBe(
      "Most marks lost to a knowledge gap (3 marks). 1.5 marks were careless slips you can stop today.",
    );
    expect(within(first).getByTestId("packs-bridge-scorecard").getAttribute("href")).toBe(
      "/chapter-test/10/Maths/real-numbers?review=PK-M-RN-CT1&source=packs&returnTo=%2Fpacks",
    );
    expect(screen.getByTestId("packs-bridge-marked").textContent).toBe("Marked · 25.5/31");
  });

  it("a graded paper with no stored mistake numbers -> an honest pointer, no invented insight", () => {
    data.records = [rec({ id: "PK-M-RN-WS", surface: "worksheet", status: "graded", marksAwarded: 5, marksTotal: 10 })];
    show({ packs: [chapter] });
    expect(screen.getByTestId("packs-bridge-first-line").textContent).toBe("Open the scorecard to see where each mark went.");
  });

  it("statuses from the server only: free mark left on the first of a kind; downloaded -> Get marked; not downloaded -> Download opens the pack's files", () => {
    data.allowance = { enforced: true, tier: "free", firstFree: { "chapter-test": true, worksheet: false } };
    data.records = [rec({ id: "PK-M-RN-CT2", surface: "chapter-test", status: "pending-upload", topicKeys: ["real-numbers"] })];
    const onOpenFiles = vi.fn();
    show({ packs: [chapter], onOpenFiles });
    const rows = screen.getAllByTestId("packs-bridge-row");
    expect(rows.map((r) => r.getAttribute("data-code"))).toEqual(["PK-M-RN-CT2", "PK-M-RN-CT1", "PK-M-RN-WS"]);
    expect(rows[0].textContent).toContain("PK-M-RN-CT2 · free mark left");
    expect(within(rows[0]).getByTestId("packs-bridge-get").getAttribute("href")).toBe(
      "/chapter-test/10/Maths/real-numbers?review=PK-M-RN-CT2&source=packs&returnTo=%2Fpacks",
    );
    expect(rows[1].textContent).toContain("PK-M-RN-CT1 · with Board Pass");
    expect(rows[2].textContent).toContain("PK-M-RN-WS · with Board Pass");
    fireEvent.click(within(rows[2]).getByTestId("packs-bridge-download"));
    expect(onOpenFiles).toHaveBeenCalledWith("pack_chapter:real-numbers");
  });

  it("server unknown -> no status words at all", () => {
    show({ packs: [chapter] });
    expect(screen.queryAllByTestId("packs-bridge-note")).toHaveLength(0);
  });

  it("a bundle shows 4 papers then '+ 90 more papers', which expands and collapses; a covered paper is listed once", () => {
    show({ packs: [bundle, chapter] });
    expect(screen.getAllByTestId("packs-bridge-pack")).toHaveLength(1);
    expect(screen.getAllByTestId("packs-bridge-row")).toHaveLength(4);
    const more = screen.getByTestId("packs-bridge-more");
    expect(more.textContent).toBe("+ 90 more papers");
    fireEvent.click(more);
    expect(screen.getAllByTestId("packs-bridge-row")).toHaveLength(94);
    expect(more.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(more);
    expect(screen.getAllByTestId("packs-bridge-row")).toHaveLength(4);
  });

  it("a CBQ pack: no rows until the student has CBQ paper codes (never faked); the Board Pass card still shows", () => {
    show({ packs: [cbq] });
    expect(screen.queryByTestId("packs-bridge-row")).toBeNull();
    expect(screen.queryByText("Get your papers marked")).toBeNull();
    expect(screen.getByTestId("packs-bridge-pass")).toBeTruthy();
    cleanup();
    data.records = [rec({ id: "PK-M-RN-CBQ1", surface: "worksheet", title: "Real Numbers · Board CBQs (Part 1 of 3)" })];
    show({ packs: [cbq] });
    expect(screen.getAllByTestId("packs-bridge-row").map((r) => r.getAttribute("data-code"))).toEqual(["PK-M-RN-CBQ1"]);
  });

  it("CBQ-SAMPLE-2: See a marked sample opens the CBQ sample only for a CBQ-only owner; any other pack keeps the Chapter Test sample", () => {
    const href = () => screen.getByTestId("packs-bridge-sample").getAttribute("href");
    data.records = [rec({ id: "PK-M-RN-CBQ1", surface: "worksheet", title: "Real Numbers · Board CBQs (Part 1 of 3)" })];
    show({ packs: [cbq] });
    expect(href()).toBe("/media/lazytopper-marked-sample-PK-M-RN-CBQ1.pdf");
    cleanup();
    show({ packs: [cbq, { ...cbq, packId: "pack_cbq:science", target: "science" }] });
    expect(href()).toBe("/media/lazytopper-marked-sample-PK-M-RN-CBQ1.pdf");
    cleanup();
    show({ packs: [chapter, cbq] }); // a mix: one page-level link, so the Chapter Test sample
    expect(href()).toBe("/media/lazytopper-marked-sample-PK-M-RN-CT1.pdf");
    cleanup();
    data.records = [];
    show({ packs: [chapter] });
    expect(href()).toBe("/media/lazytopper-marked-sample-PK-M-RN-CT1.pdf");
  });

  it("a CBQ-only owner whose entitlement is unknown, with no papers yet -> the panel renders nothing", () => {
    data.known = false;
    show({ packs: [cbq], paidPass: true });
    expect(screen.queryByTestId("packs-bridge")).toBeNull();
  });
});

describe("BRIDGE-PANEL-1 · a confirmed Board Pass holder's ONE quiet packs card (owner 8 Nov 22:11, PASS-OWNER-PACKS-1 rules)", () => {
  const bundle2 = { packId: "pack_bundle:all", sku: "pack_bundle", target: "all", pricePaidInr: 299, paidAt: 9 };
  const cbqS = { packId: "pack_cbq:science", sku: "pack_cbq", target: "science", pricePaidInr: 99, paidAt: 7 };

  it("holder owning no CBQ pack: the CBQ Packs of both subjects, in the Board Pass card's place; pack_view (pass_me) once; Buy -> the shop's buy path", () => {
    show({ packs: [chapter], paidPass: true });
    const card = screen.getByTestId("packs-bridge-holder");
    expect(card.textContent).toContain("Practising on paper too? The CBQ Packs put the case-based questions in print");
    expect(screen.getByTestId("packs-bridge-holder-buy-pack_cbq-maths")).toBeTruthy();
    expect(screen.getByTestId("packs-bridge-holder-buy-pack_cbq-science")).toBeTruthy();
    expect(track.pack).toHaveBeenCalledTimes(1);
    expect(track.pack).toHaveBeenCalledWith("pack_view", "pack_cbq", "pass_me");
    fireEvent.click(screen.getByTestId("packs-bridge-holder-buy-pack_cbq-science"));
    expect(buyPack).toHaveBeenCalledWith("pack_cbq", "science");
  });

  it("never an owned pack: owns one CBQ -> only the other; owns both CBQ -> the Bundle; owns everything -> nothing", () => {
    show({ packs: [chapter, cbqS], paidPass: true });
    expect(screen.queryByTestId("packs-bridge-holder-buy-pack_cbq-science")).toBeNull();
    expect(screen.getByTestId("packs-bridge-holder-buy-pack_cbq-maths")).toBeTruthy();
    cleanup();
    show({ packs: [chapter, cbq, cbqS], paidPass: true });
    expect(screen.getByTestId("packs-bridge-holder-buy-pack_bundle")).toBeTruthy();
    cleanup();
    show({ packs: [bundle2, cbq, cbqS], paidPass: true });
    expect(screen.queryByTestId("packs-bridge-holder")).toBeNull();
  });

  it("not a holder -> the Board Pass card, never the holder card; entitlement unknown -> neither card", () => {
    show({ packs: [chapter] });
    expect(screen.queryByTestId("packs-bridge-holder")).toBeNull();
    expect(screen.getByTestId("packs-bridge-pass")).toBeTruthy();
    cleanup();
    data.known = false;
    show({ packs: [chapter], paidPass: true });
    expect(screen.queryByTestId("packs-bridge-holder")).toBeNull();
    expect(screen.queryByTestId("packs-bridge-pass")).toBeNull();
    expect(track.pack).not.toHaveBeenCalled();
  });

  it("'Not now' hides it (PASS-OWNER-PACKS-1's one-day, all-offers hide) and it stays hidden on the next visit", () => {
    show({ packs: [chapter], paidPass: true });
    fireEvent.click(screen.getByTestId("packs-bridge-holder-not-now"));
    expect(screen.queryByTestId("packs-bridge-holder")).toBeNull();
    cleanup();
    show({ packs: [chapter], paidPass: true });
    expect(screen.queryByTestId("packs-bridge-holder")).toBeNull();
  });

  it("a holder with only CBQ packs (no paper rows yet) still gets the card when something is left to offer", () => {
    show({ packs: [cbq], paidPass: true });
    expect(screen.getByTestId("packs-bridge-holder-buy-pack_cbq-science")).toBeTruthy();
  });
});
