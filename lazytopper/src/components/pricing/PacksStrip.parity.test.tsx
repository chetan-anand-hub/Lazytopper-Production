/**
 * PRICING-ONE-1 - /pricing is ONE page for everyone: the CBQ band and every pack tile show for a signed-out visitor, a Basic student,
 * a trial student and a paid-Premium student (owner rulings 29 Oct 2026), and a pack can be bought without leaving /pricing: the
 * signed-out Buy sends the visitor to sign-in with a return path ON /pricing, and ?buy=&t= resumes into checkout there.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
const paid = vi.hoisted(() => ({ value: false }));
vi.mock("../../lib/packs/usePaidPremium", () => ({ usePaidPremium: () => paid.value }));
vi.mock("../../analytics/analytics", () => ({ newCheckoutAttemptId: () => "lt_attempt" }));
vi.mock("../../lib/packs/packAnalytics", () => ({ trackPackCheckout: () => undefined, trackPackPurchase: () => undefined, trackPackEvent: () => undefined }));
const buyPack = vi.hoisted(() => vi.fn(async (..._a: unknown[]) => ({ status: "dismissed" })));
vi.mock("../../services/packs", async (orig) => {
  const actual = await orig<typeof import("../../services/packs")>();
  return {
    ...actual,
    isPacksClientEnabled: () => true,
    fetchMyPacks: vi.fn(async () => ({ packs: [], licensee: { name: "Asha", email: "a@b.in" } })),
    buyPack,
  };
});
vi.mock("../../lib/packs/packContent", () => ({ loadChapter: async () => undefined, countChapterQuestions: () => 100, countCbqPackQuestions: () => 50 }));

import PacksStrip from "./PacksStrip";

Element.prototype.scrollIntoView = vi.fn();

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search + l.hash}</div>;
}
const strip = (url = "/pricing") =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Where />
      <Routes>
        <Route path="/pricing" element={<PacksStrip />} />
        <Route path="/login" element={<div>LOGIN</div>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  auth.user = null;
  paid.value = false;
  buyPack.mockClear();
});
afterEach(() => cleanup());

const STATES: ReadonlyArray<[string, { uid: string } | null, boolean]> = [
  ["signed out", null, false],
  ["Basic / free", { uid: "u1" }, false],
  ["trial", { uid: "u2" }, false],
  ["paid Premium", { uid: "u3" }, true],
];

describe("/pricing packs - the same for every account", () => {
  it.each(STATES)("%s: CBQ band (Maths + Science) and all four pack tiles with their prices", (_n, user, isPaid) => {
    auth.user = user;
    paid.value = isPaid;
    const { container } = strip();
    expect(screen.getByTestId("cbq-band")).toBeTruthy();
    expect(screen.getByTestId("pricing-cbq-maths").textContent).toContain("₹199");
    expect(screen.getByTestId("pricing-cbq-science").textContent).toContain("₹199");
    const tiles = Array.from(container.querySelectorAll("button.lt-packoffer__item"));
    expect(tiles.map((t) => t.getAttribute("data-pack"))).toEqual(["chapter", "mock", "subject", "bundle"]);
    expect(Array.from(container.querySelectorAll(".lt-packoffer__cell")).map((c) => c.getAttribute("data-price"))).toEqual(["49", "99", "199", "299"]);
    expect(container.querySelector("#packs")).not.toBeNull();
    expect(container.querySelector("#cbq")).not.toBeNull();
  });

  it("a signed-out Buy returns to /pricing (not /packs) after sign-in, carrying ?buy=", async () => {
    strip();
    fireEvent.click(screen.getByRole("button", { name: /Maths \+ Science Bundle/ }));
    const buy = await screen.findByTestId("packs-buy-pack_bundle");
    fireEvent.click(buy);
    await waitFor(() => expect(screen.getByText("LOGIN")).toBeTruthy());
    const where = screen.getByTestId("where").textContent ?? "";
    expect(where).toContain("/login");
    expect(decodeURIComponent(where)).toContain("/pricing?buy=pack_bundle");
    expect(decodeURIComponent(where)).not.toContain("/packs");
    expect(buyPack).not.toHaveBeenCalled();
  });

  it("/pricing?buy=pack_bundle resumes into checkout for a signed-in student, once, and strips the params", async () => {
    auth.user = { uid: "u1" };
    strip("/pricing?buy=pack_bundle");
    await waitFor(() => expect(buyPack).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/pricing"));
    expect(buyPack.mock.calls[0][0]).toBe("pack_bundle");
  });
});
