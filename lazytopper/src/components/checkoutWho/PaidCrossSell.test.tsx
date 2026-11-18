/** PAID-XSELL-1 - "Goes well with what you just bought" inside the paid pop-up: what shows, unknown ownership, analytics, the tap. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.mock("../signinLink/SigninLinkCard", () => ({ default: () => <div data-testid="signin-link-card-stub" /> }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "u1" } }) }));
const sub = vi.hoisted(() => ({ status: { tier: "trial", plan: "trial", trialStartDate: "2026-11-18T00:00:00.000Z" } as Record<string, unknown> | null }));
vi.mock("../../services/subscriptionService", () => ({
  loadSubscription: () => sub.status,
  onSubscriptionHydrated: () => () => undefined,
  isPaidPremium: (s: { tier?: string } | null) => s?.tier === "premium",
}));
const mine = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock("../../services/packs", async (orig) => {
  const actual = await orig<typeof import("../../services/packs")>();
  return { ...actual, fetchMyPacks: mine.fn };
});
const events = vi.hoisted(() => ({ hits: [] as Array<[string, unknown]> }));
vi.mock("../../analytics/analytics", async (orig) => {
  const actual = await orig<typeof import("../../analytics/analytics")>();
  return { ...actual, sendAnalyticsHit: (_k: string, payload: { name: string; data?: unknown }) => { events.hits.push([payload.name, payload.data]); } };
});

import PaidSheetLazy from "./PaidSheetLazy";
import PaidCrossSell from "./PaidCrossSell";
import { PAID_XSELL_HEADING, type BoughtKind } from "./paidCrossSellModel";
import { GST_EXCLUSIVE_FROM_MS } from "../../config/pricing";
import { ACTIVITY_EVENTS } from "../../services/activityClient";
import { activityEventLabel } from "../../pages/admin/activityDetailModel";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 60)); });
function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search}</div>;
}
/** A fixed clock (no wall-clock read in this file: the CI clock manifest stays untouched). */
const NOW = GST_EXCLUSIVE_FROM_MS + 86_400_000;
const fixed = () => NOW;
/** The cross-sell itself, as PaidSheet mounts it (bought = what PaidSheet classifies). */
function sheet(bought: BoughtKind | null, extra: { hostOffersCbq?: boolean; onClose?: () => void } = {}) {
  return render(
    <MemoryRouter initialEntries={["/packs"]}>
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
      <PaidCrossSell bought={bought} surface="packs" hostOffersCbq={extra.hostOffersCbq ?? false} onLeave={extra.onClose ?? vi.fn()} nowMs={fixed} />
    </MemoryRouter>,
  );
}
const cards = () => screen.queryAllByTestId(/^paid-xsell-(board_pass|test_series|pdf_packs|cbq_packs)$/).map((n) => n.getAttribute("data-testid")!.replace("paid-xsell-", ""));

beforeEach(() => {
  vi.stubEnv("VITE_PACKS_ENABLED", "1");
  vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
  events.hits = [];
  sub.status = { tier: "trial", plan: "trial", trialStartDate: "2026-11-18T00:00:00.000Z" };
  mine.fn.mockReset();
  mine.fn.mockImplementation(async () => ({ packs: [], licensee: { name: "A", email: "a@b.in" }, boardPassCredit: null }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  document.body.classList.remove("lt-paid-lock");
});

describe("PaidCrossSell in the paid pop-up", () => {
  it("Test Series bought: Board Pass (server upgrade price), PDF Packs, CBQ Packs under the heading", async () => {
    mine.fn.mockImplementation(async () => ({
      packs: [{ packId: "test_series:all", sku: "test_series", target: "", pricePaidInr: 999, paidAt: 1 }],
      licensee: { name: "A", email: "a@b.in" },
      boardPassCredit: { creditInr: 999, payInr: 1083, expiresAtMs: NOW + 86_400_000 },
      ownsTestSeries: true,
    }));
    sheet("test_series");
    expect(await screen.findByTestId("paid-xsell")).toBeTruthy();
    expect(screen.getByText(PAID_XSELL_HEADING)).toBeTruthy();
    expect(cards()).toEqual(["board_pass", "pdf_packs", "cbq_packs"]);
    expect(screen.queryByTestId("paid-xsell-price-board_pass")).toBeNull(); // all-in server figure: no derived base line
    expect(screen.getByTestId("paid-xsell-tap-board_pass").textContent).toBe("Upgrade — pay ₹1,083");
  });

  it("a PDF pack bought by a Board Pass holder: no Board Pass, no Test Series - only the CBQ Packs", async () => {
    sub.status = { tier: "premium", plan: "pass_till_boards", trialStartDate: null };
    sheet("pdf");
    await screen.findByTestId("paid-xsell");
    expect(cards()).toEqual(["cbq_packs"]);
  });

  it("Test Series paused: a CBQ buyer is offered the Board Pass and the PDF Packs only", async () => {
    vi.stubEnv("VITE_TS_PACK_DISABLED", "1");
    sheet("cbq");
    await screen.findByTestId("paid-xsell");
    expect(cards()).toEqual(["board_pass", "pdf_packs"]);
  });

  it("Board Pass bought: PDF Packs + CBQ Packs; with the host's own CBQ offer below, the CBQ card is not repeated", async () => {
    sheet("pass");
    await screen.findByTestId("paid-xsell");
    expect(cards()).toEqual(["pdf_packs", "cbq_packs"]);
    cleanup();
    sheet("pass", { hostOffersCbq: true });
    await screen.findByTestId("paid-xsell");
    expect(cards()).toEqual(["pdf_packs"]);
  });

  it("the owned-pack read fails -> nothing at all (no flash, no wrong offer), and no view event", async () => {
    mine.fn.mockImplementation(async () => { throw new Error("503"); });
    sheet("test_series");
    await settle();
    expect(screen.queryByTestId("paid-xsell")).toBeNull();
    expect(events.hits.filter(([n]) => n === "paid_xsell_view")).toEqual([]);
  });

  it("an unrecognised purchase suggests nothing and reads nothing", async () => {
    sheet(null);
    await settle();
    expect(screen.queryByTestId("paid-xsell")).toBeNull();
    expect(mine.fn).not.toHaveBeenCalled();
  });

  it("analytics: ONE paid_xsell_view with the items; a tap sends paid_xsell_tap, closes the sheet and goes to the existing buy entry", async () => {
    const onClose = vi.fn();
    sheet("pdf", { onClose });
    await screen.findByTestId("paid-xsell");
    await settle();
    expect(events.hits.filter(([n]) => n === "paid_xsell_view")).toEqual([["paid_xsell_view", { surface: "packs", items: "test_series,board_pass,cbq_packs" }]]);
    fireEvent.click(screen.getByTestId("paid-xsell-tap-test_series"));
    expect(events.hits.filter(([n]) => n === "paid_xsell_tap")).toEqual([["paid_xsell_tap", { surface: "packs", item: "test_series" }]]);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("where").textContent).toBe("/packs?buy=test_series");
  });
});

describe("PaidSheet wiring (the cross-sell chunk stubbed: what PaidSheet passes it)", () => {
  it("classifies the purchase from the host's props, passes hostOffersCbq for a pass with an offer below, and nothing once moved", async () => {
    const seen: unknown[] = [];
    vi.doMock("./PaidCrossSell", () => ({ default: (p: { bought: unknown; hostOffersCbq: boolean; surface: string }) => { seen.push([p.bought, p.hostOffersCbq, p.surface]); return <div data-testid="xsell-stub" />; } }));
    vi.resetModules();
    const { default: Lazy } = await import("./PaidSheetLazy");
    const base = { primaryLabel: "x", onPrimary: vi.fn(), onClose: vi.fn(), onFail: vi.fn() };
    const r1 = render(<MemoryRouter><Lazy {...base} surface="packs" itemKind="pack" itemName="Test Series Pack" /></MemoryRouter>);
    await screen.findByTestId("xsell-stub");
    r1.unmount();
    const r2 = render(<MemoryRouter><Lazy {...base} surface="board_pass" itemKind="pass" itemName="the Board Pass" below={<div data-testid="below" />} /></MemoryRouter>);
    await screen.findByTestId("xsell-stub");
    expect(screen.getByTestId("below")).toBeTruthy();
    r2.unmount();
    const r3 = render(<MemoryRouter><Lazy {...base} surface="packs" itemKind="pack" itemName="PDF pack" /></MemoryRouter>);
    await settle();
    expect(screen.queryByTestId("xsell-stub")).toBeNull(); // unrecognised: the chunk is not even mounted
    r3.unmount();
    render(<MemoryRouter><Lazy {...base} surface="packs" itemKind="pack" itemName="Maths CBQ Pack" moved /></MemoryRouter>);
    await settle();
    expect(screen.queryByTestId("xsell-stub")).toBeNull(); // moved to the child's account: nothing to sell here
    expect(seen).toContainEqual(["test_series", false, "packs"]);
    expect(seen).toContainEqual(["pass", true, "board_pass"]);
    vi.doUnmock("./PaidCrossSell");
  });

  it("kill switch VITE_PAID_XSELL_DISABLED=1: the chunk is never imported and nothing shows", async () => {
    vi.stubEnv("VITE_PAID_XSELL_DISABLED", "1");
    const imported = vi.fn();
    vi.doMock("./PaidCrossSell", () => { imported(); return { default: () => <div data-testid="xsell-stub" /> }; });
    vi.resetModules();
    const { default: Lazy } = await import("./PaidSheetLazy");
    render(<MemoryRouter><Lazy primaryLabel="x" onPrimary={vi.fn()} onClose={vi.fn()} onFail={vi.fn()} surface="packs" itemKind="pack" itemName="Test Series Pack" /></MemoryRouter>);
    await screen.findByTestId("paid-sheet");
    await settle();
    expect(screen.queryByTestId("xsell-stub")).toBeNull();
    expect(imported).not.toHaveBeenCalled();
    expect(mine.fn).not.toHaveBeenCalled();
    vi.doUnmock("./PaidCrossSell");
  });
});

describe("PAID-XSELL-1 event names are on all four lists", () => {
  it("client allow-list, server allow-list, admin labels", () => {
    const server = readFileSync(resolve(__dirname, "../../../server/routes/studentActivity.cjs"), "utf8");
    for (const n of ["paid_xsell_view", "paid_xsell_tap"]) {
      expect(ACTIVITY_EVENTS as readonly string[]).toContain(n);
      expect(server).toContain(`'${n}'`);
      expect(activityEventLabel(n)).not.toBe(n);
    }
  });
});
