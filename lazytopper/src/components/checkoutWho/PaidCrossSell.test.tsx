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
import { PAID_XSELL_HEADING } from "./paidCrossSellModel";
import { ACTIVITY_EVENTS } from "../../services/activityClient";
import { activityEventLabel } from "../../pages/admin/activityDetailModel";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 60)); });
function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search}</div>;
}
function sheet(itemKind: "pack" | "pass", itemName: string, extra: { below?: React.ReactNode; onClose?: () => void } = {}) {
  return render(
    <MemoryRouter initialEntries={["/packs"]}>
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
      <PaidSheetLazy surface="packs" itemKind={itemKind} itemName={itemName} primaryLabel="Download files" onPrimary={vi.fn()} onClose={extra.onClose ?? vi.fn()} onFail={vi.fn()} below={extra.below} />
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
      boardPassCredit: { creditInr: 999, payInr: 1083, expiresAtMs: Date.parse("2099-01-01T00:00:00Z") },
      ownsTestSeries: true,
    }));
    sheet("pack", "Test Series Pack");
    expect(await screen.findByTestId("paid-xsell")).toBeTruthy();
    expect(screen.getByText(PAID_XSELL_HEADING)).toBeTruthy();
    expect(cards()).toEqual(["board_pass", "pdf_packs", "cbq_packs"]);
    expect(screen.getByTestId("paid-xsell-price-board_pass").textContent).toMatch(/^Upgrade for ₹1,083/);
  });

  it("a PDF pack bought by a Board Pass holder: no Board Pass, no Test Series - only the CBQ Packs", async () => {
    sub.status = { tier: "premium", plan: "pass_till_boards", trialStartDate: null };
    sheet("pack", "Circles Chapter Pack");
    await screen.findByTestId("paid-xsell");
    expect(cards()).toEqual(["cbq_packs"]);
  });

  it("Test Series paused: a CBQ buyer is offered the Board Pass and the PDF Packs only", async () => {
    vi.stubEnv("VITE_TS_PACK_DISABLED", "1");
    sheet("pack", "Maths CBQ Pack");
    await screen.findByTestId("paid-xsell");
    expect(cards()).toEqual(["board_pass", "pdf_packs"]);
  });

  it("Board Pass bought: the PDF Packs card; the host's own CBQ offer below is not repeated", async () => {
    sheet("pass", "the Board Pass", { below: <div data-testid="pass-owner-offer-stub" /> });
    await screen.findByTestId("paid-xsell");
    expect(cards()).toEqual(["pdf_packs"]);
    expect(screen.getByTestId("pass-owner-offer-stub")).toBeTruthy();
    expect(screen.queryByTestId("paid-xsell-test_series")).toBeNull();
  });

  it("the owned-pack read fails -> nothing at all (no flash, no wrong offer), and no view event", async () => {
    mine.fn.mockImplementation(async () => { throw new Error("503"); });
    sheet("pack", "Test Series Pack");
    await settle();
    expect(screen.queryByTestId("paid-xsell")).toBeNull();
    expect(events.hits.filter(([n]) => n === "paid_xsell_view")).toEqual([]);
  });

  it("an unrecognised purchase name suggests nothing and reads nothing", async () => {
    sheet("pack", "PDF pack");
    await settle();
    expect(screen.queryByTestId("paid-xsell")).toBeNull();
    expect(mine.fn).not.toHaveBeenCalled();
  });

  it("analytics: ONE paid_xsell_view with the items; a tap sends paid_xsell_tap, closes the sheet and goes to the existing buy entry", async () => {
    const onClose = vi.fn();
    sheet("pack", "Science Mock Pack", { onClose });
    await screen.findByTestId("paid-xsell");
    await settle();
    expect(events.hits.filter(([n]) => n === "paid_xsell_view")).toEqual([["paid_xsell_view", { surface: "packs", items: "test_series,board_pass,cbq_packs" }]]);
    fireEvent.click(screen.getByTestId("paid-xsell-tap-test_series"));
    expect(events.hits.filter(([n]) => n === "paid_xsell_tap")).toEqual([["paid_xsell_tap", { surface: "packs", item: "test_series" }]]);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("where").textContent).toBe("/packs?buy=test_series");
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
