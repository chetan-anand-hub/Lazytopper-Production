import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * RAZORPAY-1 — the pricing page's buy area.
 *
 *  Z1  dark by default: with VITE_PAYMENTS_ENABLED unset the component renders nothing,
 *      calls no hook, and PricingPage keeps its manual-activation paragraph unchanged.
 *  Z3  checkout.js is loaded ONLY on the buy click; signed-out -> sign in first, back to
 *      a FIXED internal path.
 *  Z6  the owner's success / failure sentences, word for word — success ONLY from the
 *      server grant's passEnd.
 *  Z10 an active pass is announced first; buying still stacks.
 */

const mockAuth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
const mockSub = vi.hoisted(() => ({
  status: { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null, passEnd: null } as Record<string, unknown>,
  hydrated: true,
}));

vi.mock("../../context/AuthContext", () => ({ useAuth: () => mockAuth }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => mockSub }));
vi.mock("../../services/subscriptionService", () => ({ hydrateSubscriptionFromCloud: vi.fn(async () => ({})) }));
vi.mock("../../services/firebaseClient", () => ({
  authClient: { currentUser: { getIdToken: async () => "id-token" } },
  firestoreDb: null,
  app: null,
}));

import PassCheckout, {
  PassCheckoutView,
  PASS_CHECKOUT_RETURN_PATH,
  TILL_BOARDS_BUTTON_LABEL,
  monthButtonLabel,
} from "./PassCheckout";
import PricingPage from "../../pages/PricingPage";
import {
  buyPass,
  CHECKOUT_SCRIPT_URL,
  PAYMENT_FAILED_COPY,
  resetCheckoutScriptForTests,
  type BuyOutcome,
  type RazorpayConstructor,
} from "../../services/checkout";

const MANUAL_PARAGRAPH =
  '<p class="lt-pricing-plan-desc">Manual activation during beta. Payment checkout coming soon. Premium is not activated automatically.</p>';

function checkoutScripts(): HTMLScriptElement[] {
  return Array.from(document.querySelectorAll("script")).filter((s) => s.src === CHECKOUT_SCRIPT_URL);
}

beforeEach(() => {
  mockAuth.user = null;
  mockSub.status = { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null, passEnd: null };
  mockSub.hydrated = true;
  resetCheckoutScriptForTests();
  checkoutScripts().forEach((s) => s.remove());
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/* ── Z1 · dark ─────────────────────────────────────────────────────────────── */

describe("Z1 · switch OFF (VITE_PAYMENTS_ENABLED unset)", () => {
  it("PassCheckout renders nothing — and needs no AuthProvider, because it calls no hook", () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "");
    const { container } = render(<PassCheckout />);
    expect(container.innerHTML).toBe("");
  });

  it("the pricing page keeps the manual-activation paragraph, unchanged, and shows no buy button", () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "");
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/pricing"]}>
        <PricingPage />
      </MemoryRouter>,
    );
    expect(html).toContain(MANUAL_PARAGRAPH);
    expect(html).not.toContain("pass-checkout");
    expect(html).not.toContain("for a month</button>");
    expect(html).not.toContain(TILL_BOARDS_BUTTON_LABEL);
    expect(html).not.toContain("checkout.razorpay.com");
  });

  it("values other than an explicit on-value keep it dark", () => {
    for (const v of ["0", "false", "off", "no", "enabled"]) {
      vi.stubEnv("VITE_PAYMENTS_ENABLED", v);
      const { container } = render(<PassCheckout />);
      expect(container.innerHTML, v).toBe("");
      cleanup();
    }
  });
});

describe("Z1 · switch ON", () => {
  it("the pricing page swaps the manual paragraph for the buy area — and loads NO script on render", () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
    render(
      <MemoryRouter initialEntries={["/pricing"]}>
        <PricingPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("pass-checkout")).toBeTruthy();
    expect(screen.getByRole("button", { name: monthButtonLabel(true) })).toBeTruthy();
    expect(screen.getByRole("button", { name: TILL_BOARDS_BUTTON_LABEL })).toBeTruthy();
    expect(document.body.innerHTML).not.toContain("Manual activation during beta");
    expect(checkoutScripts()).toHaveLength(0);
  });
});

/* ── Z3 · buttons, script-on-click, sign in first ──────────────────────────── */

describe("Z3 · the buy buttons", () => {
  it("labels: the monthly price from the pricing module; the till-boards line", () => {
    expect(monthButtonLabel(true)).toBe("Pay ₹599 for a month");
    expect(monthButtonLabel(false)).toBe("Pay ₹999 for a month");
    expect(TILL_BOARDS_BUTTON_LABEL).toBe("Pay once till your boards");
  });

  it("signed OUT: a buy click goes to sign-in with a FIXED internal redirect, and buys nothing", async () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    let seen = "";
    function Probe() {
      const loc = useLocation();
      seen = `${loc.pathname}${loc.search}`;
      return null;
    }
    render(
      <MemoryRouter initialEntries={["/pricing?redirect=https://evil.example"]}>
        <Routes>
          <Route path="/pricing" element={<PassCheckout />} />
          <Route path="/login" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: monthButtonLabel(true) }));
    await waitFor(() => expect(seen).toBe(`/login?redirect=${encodeURIComponent(PASS_CHECKOUT_RETURN_PATH)}`));
    expect(seen).not.toContain("evil");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(checkoutScripts()).toHaveLength(0);
  });

  it("signed IN: checkout.js is injected ON the click (not before), and only the pass TYPE is sent", async () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
    mockAuth.user = { uid: "u1" };
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, orderId: "order_1", keyId: "rzp_test_x", amountPaise: 59900 }),
    }));
    vi.stubGlobal("fetch", fetchSpy);
    render(
      <MemoryRouter initialEntries={["/pricing"]}>
        <PassCheckout />
      </MemoryRouter>,
    );
    expect(checkoutScripts()).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: TILL_BOARDS_BUTTON_LABEL }));
    await waitFor(() => expect(checkoutScripts()).toHaveLength(1));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/pay/order");
    expect(JSON.parse(String(init.body))).toEqual({ passType: "till_boards" });
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer id-token");
  });
});

/* ── Z6 / Z10 · what the student is told ──────────────────────────────────── */

function view(overrides: Partial<Parameters<typeof PassCheckoutView>[0]> = {}) {
  const props = {
    signedIn: true,
    offerOpen: true,
    activePassEnd: null,
    onSignIn: vi.fn(),
    onBuy: vi.fn(async () => ({ status: "dismissed" as const })),
    ...overrides,
  };
  render(<PassCheckoutView {...props} />);
  return props;
}

describe("Z6 · after the purchase", () => {
  it("success shows 'Premium is active until <date>' from the SERVER grant's passEnd", async () => {
    view({ onBuy: vi.fn(async () => ({ status: "paid" as const, passEnd: "2026-10-27T06:30:00.000Z" })) });
    fireEvent.click(screen.getByRole("button", { name: monthButtonLabel(true) }));
    const status = await screen.findByTestId("pass-checkout-paid");
    expect(status.textContent).toBe("Premium is active until 27 October 2026");
  });

  it("failure shows the owner's sentence word for word, and the buttons stay for a retry", async () => {
    view({ onBuy: vi.fn(async () => ({ status: "failed" as const })) });
    fireEvent.click(screen.getByRole("button", { name: monthButtonLabel(true) }));
    const alert = await screen.findByTestId("pass-checkout-failed");
    expect(alert.textContent).toBe("Payment didn't go through. You haven't been charged twice — try again.");
    expect(alert.textContent).toBe(PAYMENT_FAILED_COPY);
    expect(screen.getByRole("button", { name: monthButtonLabel(true) })).toBeTruthy();
  });

  it("closing the checkout says nothing and claims nothing", async () => {
    const props = view();
    fireEvent.click(screen.getByRole("button", { name: monthButtonLabel(true) }));
    await waitFor(() => expect(props.onBuy).toHaveBeenCalledWith("month"));
    expect(screen.queryByTestId("pass-checkout-paid")).toBeNull();
    expect(screen.queryByTestId("pass-checkout-failed")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Premium is active/);
  });

  it("nothing claims Premium before the server says so (no optimistic success while paying)", async () => {
    let finish: (v: BuyOutcome) => void = () => {};
    view({ onBuy: vi.fn(() => new Promise<BuyOutcome>((r) => { finish = r; })) });
    fireEvent.click(screen.getByRole("button", { name: TILL_BOARDS_BUTTON_LABEL }));
    expect(document.body.textContent).not.toMatch(/Premium is active/);
    await act(async () => finish({ status: "paid", passEnd: "2027-02-17T18:29:59.999Z" }));
    expect(screen.getByTestId("pass-checkout-paid").textContent).toBe("Premium is active until 17 February 2027");
  });
});

describe("Z10 · buying over an active pass", () => {
  it("announces the running pass first, and still offers both passes", () => {
    view({ activePassEnd: "2026-10-27T06:30:00.000Z" });
    expect(screen.getByTestId("pass-checkout-already-active").textContent).toBe(
      "Premium is already active until 27 October 2026.",
    );
    expect(screen.getByRole("button", { name: monthButtonLabel(true) })).toBeTruthy();
    expect(screen.getByRole("button", { name: TILL_BOARDS_BUTTON_LABEL })).toBeTruthy();
  });

  it("the connected component reads the notice ONLY from a hydrated, unexpired, server-written passEnd", () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
    mockAuth.user = { uid: "u1" };
    const future = new Date(Date.now() + 10 * 86_400_000).toISOString();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const cases: Array<[Record<string, unknown>, boolean, boolean]> = [
      [{ tier: "premium", passEnd: future }, true, true],
      [{ tier: "premium", passEnd: future }, false, false], // not yet hydrated: the cache is not truth
      [{ tier: "premium", passEnd: past }, true, false], // expired
      [{ tier: "trial", passEnd: future }, true, false], // not a pass
      [{ tier: "premium", passEnd: null }, true, false], // legacy premium: no date to state
    ];
    for (const [status, hydrated, shows] of cases) {
      mockSub.status = { plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null, ...status };
      mockSub.hydrated = hydrated;
      render(
        <MemoryRouter>
          <PassCheckout />
        </MemoryRouter>,
      );
      expect(screen.queryByTestId("pass-checkout-already-active") !== null, JSON.stringify([status, hydrated])).toBe(shows);
      cleanup();
    }
  });
});

/* ── buyPass · order -> checkout -> verify ─────────────────────────────────── */

describe("buyPass", () => {
  function fakeRazorpay(behaviour: "pay" | "dismiss") {
    const seen: Array<Record<string, unknown>> = [];
    const Ctor = function (this: unknown, options: Record<string, unknown>) {
      seen.push(options);
      return {
        open() {
          if (behaviour === "pay") {
            (options.handler as (r: unknown) => void)({
              razorpay_payment_id: "pay_1",
              razorpay_order_id: "order_1",
              razorpay_signature: "sig",
            });
          } else {
            (options.modal as { ondismiss: () => void }).ondismiss();
          }
        },
      };
    } as unknown as RazorpayConstructor;
    return { Ctor, seen };
  }
  const order = { orderId: "order_1", keyId: "rzp_test_x", amountPaise: 59900 };

  it("charges the SERVER order and returns the verified passEnd", async () => {
    const rz = fakeRazorpay("pay");
    const verify = vi.fn(async () => ({ passEnd: "2026-10-27T06:30:00.000Z" }));
    const out = await buyPass("month", { createOrder: async () => order, loadScript: async () => rz.Ctor, verify });
    // FOLLOWUPS-1 A4: the paid outcome additionally carries Razorpay's payment id and the
    // SERVER order's amount in rupees (analytics only); passEnd is unchanged.
    expect(out).toEqual({ status: "paid", passEnd: "2026-10-27T06:30:00.000Z", paymentId: "pay_1", amountInr: 599 });
    expect(rz.seen[0]).toMatchObject({ key: "rzp_test_x", amount: 59900, currency: "INR", order_id: "order_1" });
    expect(verify).toHaveBeenCalledWith({ razorpay_payment_id: "pay_1", razorpay_order_id: "order_1", razorpay_signature: "sig" });
  });

  it("FOLLOWUPS-1 A4: what goes to Razorpay and to verify is unchanged; the new fields are read only after verify", async () => {
    const rz = fakeRazorpay("pay");
    const verify = vi.fn(async () => ({ passEnd: "2026-10-27T06:30:00.000Z" }));
    await buyPass("till_boards", { createOrder: async () => order, loadScript: async () => rz.Ctor, verify });
    expect(Object.keys(rz.seen[0]).sort()).toEqual(
      ["amount", "currency", "description", "handler", "key", "modal", "name", "order_id"],
    );
    expect(verify).toHaveBeenCalledTimes(1);
    expect(verify.mock.calls[0]).toEqual([{ razorpay_payment_id: "pay_1", razorpay_order_id: "order_1", razorpay_signature: "sig" }]);
  });

  it("FOLLOWUPS-1 A4: a payment id that is not a non-empty string is left off (never invented)", async () => {
    const Ctor = function (this: unknown, options: Record<string, unknown>) {
      return {
        open() {
          (options.handler as (r: unknown) => void)({ razorpay_payment_id: "", razorpay_order_id: "order_1", razorpay_signature: "sig" });
        },
      };
    } as unknown as RazorpayConstructor;
    const verify = vi.fn(async () => ({ passEnd: "2026-10-27T06:30:00.000Z" }));
    const out = await buyPass("month", { createOrder: async () => order, loadScript: async () => Ctor, verify });
    expect(out).toEqual({ status: "paid", passEnd: "2026-10-27T06:30:00.000Z", amountInr: 599 });
  });

  it("dismissed checkout -> dismissed, no verify", async () => {
    const rz = fakeRazorpay("dismiss");
    const verify = vi.fn();
    const out = await buyPass("month", { createOrder: async () => order, loadScript: async () => rz.Ctor, verify });
    expect(out).toEqual({ status: "dismissed" });
    expect(verify).not.toHaveBeenCalled();
  });

  it("an order or script failure -> failed; a verify failure AFTER the signed success -> pending (PAY-RECOVER-1), never paid", async () => {
    const rz = fakeRazorpay("pay");
    const boom = async () => { throw new Error("x"); };
    expect(await buyPass("month", { createOrder: boom, loadScript: async () => rz.Ctor, verify: vi.fn() })).toEqual({ status: "failed" });
    expect(await buyPass("month", { createOrder: async () => order, loadScript: boom, verify: vi.fn() })).toEqual({ status: "failed" });
    expect(await buyPass("month", { createOrder: async () => order, loadScript: async () => rz.Ctor, verify: boom })).toEqual({
      status: "pending",
      orderId: "order_1",
      paymentId: "pay_1",
    });
  });
});

/* ── PRICING-LIGHT-1 · P23 — every state lands in the two-tile layout ─────────
 * PricingPage lays the buy area out as two pass tiles: `.lt-pricing-checkout` is
 * `display: contents` inside the tile grid, and these class names place each child.
 * The change to PassCheckout is class names only — handleBuy / onBuy / the checkout
 * imports are untouched, and the Z1-Z10 tests above still drive the behaviour.
 */

const PAGE_CSS = (() => {
  const src = readFileSync(resolve(process.cwd(), "src/pages/PricingPage.tsx"), "utf8");
  const m = /const PRICING_CSS = `([\s\S]*?)`;/.exec(src);
  if (!m) throw new Error("PRICING_CSS not found");
  return m[1].replace(/\/\*[\s\S]*?\*\//g, "");
})();

/** The base (outside any @media) declaration block of an exact selector. */
function baseBlock(selector: string): string {
  const base = PAGE_CSS.slice(0, PAGE_CSS.indexOf("@media"));
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`(?:^|[}\\s,])${esc}\\s*(?:,[^{]*)?\\{([^}]*)\\}`).exec(base);
  return m ? m[1] : "";
}

describe("PRICING-LIGHT-1 · P23 — the PassCheckout states in the tile layout", () => {
  it("idle and busy: the month button goes to the Month tile, till-boards to the Till tile", async () => {
    let finish: (v: BuyOutcome) => void = () => {};
    view({ onBuy: vi.fn(() => new Promise<BuyOutcome>((r) => { finish = r; })) });
    const month = screen.getByRole("button", { name: monthButtonLabel(true) });
    const boards = screen.getByRole("button", { name: TILL_BOARDS_BUTTON_LABEL });
    expect(month.className).toBe("lt-pricing-cta lt-pricing-pay lt-pricing-pay--month");
    expect(boards.className).toBe("lt-pricing-cta lt-pricing-pay lt-pricing-pay--boards");
    expect(month.parentElement?.className).toBe("lt-pricing-checkout");
    fireEvent.click(month);
    // Busy: both disabled, still in their tiles.
    expect((month as HTMLButtonElement).disabled).toBe(true);
    expect((boards as HTMLButtonElement).disabled).toBe(true);
    await act(async () => finish({ status: "dismissed" }));
    expect((month as HTMLButtonElement).disabled).toBe(false);
  });

  it("already active: the notice spans the row ABOVE the tiles", () => {
    view({ activePassEnd: "2026-10-27T06:30:00.000Z" });
    expect(screen.getByTestId("pass-checkout-already-active").className).toContain("lt-pricing-checkout-note--top");
  });

  it("paid: 'Premium is active until …' spans the row above the tiles, and the buttons go", async () => {
    view({ onBuy: vi.fn(async () => ({ status: "paid" as const, passEnd: "2026-10-27T06:30:00.000Z" })) });
    fireEvent.click(screen.getByRole("button", { name: monthButtonLabel(true) }));
    const paid = await screen.findByTestId("pass-checkout-paid");
    expect(paid.className).toContain("lt-pricing-checkout-note--top");
    expect(paid.textContent).toBe("Premium is active until 27 October 2026");
    expect(screen.queryByRole("button", { name: monthButtonLabel(true) })).toBeNull();
  });

  it("failed: the alert spans the row BELOW the tiles, and both buttons stay for a retry", async () => {
    view({ onBuy: vi.fn(async () => ({ status: "failed" as const })) });
    fireEvent.click(screen.getByRole("button", { name: TILL_BOARDS_BUTTON_LABEL }));
    const alert = await screen.findByTestId("pass-checkout-failed");
    expect(alert.className).toContain("lt-pricing-checkout-note--bottom");
    expect(screen.getByRole("button", { name: TILL_BOARDS_BUTTON_LABEL })).toBeTruthy();
  });

  it("the page's CSS places every one of those classes (and makes the wrapper display: contents)", () => {
    expect(baseBlock(".lt-pricing-checkout")).toMatch(/display:\s*contents/);
    expect(baseBlock(".lt-pricing-pay--month")).toMatch(/grid-column:\s*1;[\s\S]*grid-row:\s*3/);
    expect(baseBlock(".lt-pricing-pay--boards")).toMatch(/grid-column:\s*2;[\s\S]*grid-row:\s*3/);
    expect(baseBlock(".lt-pricing-checkout-note--top")).toMatch(/grid-column:\s*1 \/ -1;[\s\S]*grid-row:\s*1/);
    expect(baseBlock(".lt-pricing-checkout-note--bottom")).toMatch(/grid-column:\s*1 \/ -1;[\s\S]*grid-row:\s*4/);
    // CONTROL — the reader finds nothing for a class the page does not style.
    expect(baseBlock(".lt-pricing-no-such-class")).toBe("");
  });

  it("on the page (payments ON) the buy area sits INSIDE the tile grid, Month tile before Till tile", () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
    render(
      <MemoryRouter initialEntries={["/pricing"]}>
        <PricingPage />
      </MemoryRouter>,
    );
    const grid = document.querySelector('[data-testid="pricing-passes"]');
    expect(grid).not.toBeNull();
    expect(grid!.querySelector(":scope > .lt-pricing-checkout")).not.toBeNull();
    const order = Array.from(grid!.querySelectorAll(".lt-pricing-pass, .lt-pricing-pay")).map((el) =>
      el.classList.contains("lt-pricing-pass--month")
        ? "month-tile"
        : el.classList.contains("lt-pricing-pass--boards")
          ? "boards-tile"
          : el.classList.contains("lt-pricing-pay--month")
            ? "month-pay"
            : "boards-pay",
    );
    expect(order).toEqual(["month-tile", "boards-tile", "month-pay", "boards-pay"]);
    expect(grid!.querySelector(":scope > .lt-pricing-plan-desc")).toBeNull();
  });
});
