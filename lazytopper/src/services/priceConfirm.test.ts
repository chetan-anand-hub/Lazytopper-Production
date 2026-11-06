// GST-EXCL-1 (review G2): a price the device did not show is confirmed BEFORE Razorpay opens, on every checkout path.
import { afterEach, describe, expect, it, vi } from "vitest";
import { GST_EXCLUSIVE_FROM_MS } from "../config/pricing";
import { buyPass, type BuyDeps } from "./checkout";
import { confirmServerPrice, priceConfirmNeeded, priceNowLine, razorpayDescription, serverPriceFields } from "./priceConfirm";

const OPENED_2359_30 = Date.parse("2026-11-06T23:59:30+05:30");
const ORDER_0000_30 = Date.parse("2026-11-07T00:00:30+05:30");
const GST_ORDER = { amountPaise: 226200, gst: { baseInr: 1917, gstInr: 345, totalInr: 2262 } };

afterEach(() => {
  Reflect.deleteProperty(performance, "timeOrigin"); // back to the prototype getter
  document.body.innerHTML = "";
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("priceConfirmNeeded (pure)", () => {
  it("page opened at 23:59:30, order created at 00:00:30: the server added GST the page never showed -> confirm", () => {
    expect(priceConfirmNeeded(GST_ORDER, ORDER_0000_30, OPENED_2359_30)).toBe(true);
  });
  it("a device clock still before the cut-off while the server charges GST -> confirm", () => {
    expect(priceConfirmNeeded(GST_ORDER, GST_EXCLUSIVE_FROM_MS - 60_000, GST_EXCLUSIVE_FROM_MS + 3_600_000)).toBe(true);
  });
  it("page opened after the cut-off and the device agrees -> no dialog (the Pay button already said the total)", () => {
    expect(priceConfirmNeeded(GST_ORDER, ORDER_0000_30 + 60_000, ORDER_0000_30)).toBe(false);
  });
  it("an all-in order (before the cut-off) never asks - today's flow is unchanged", () => {
    expect(priceConfirmNeeded({ amountPaise: 191700 }, OPENED_2359_30, OPENED_2359_30)).toBe(false);
  });
  it("the corrected line is the server's own breakup (a credit named)", () => {
    expect(priceNowLine(GST_ORDER)).toBe("Price now ₹1,917 + ₹345 GST (18%) = ₹2,262");
    expect(priceNowLine({ ...GST_ORDER, amountPaise: 221300, packCreditInr: 49 })).toBe(
      "Price now ₹1,917 + ₹345 GST (18%) = ₹2,262, less your pack credit ₹49: ₹2,213",
    );
  });
  it("serverPriceFields keeps only a breakup that adds up", () => {
    expect(serverPriceFields({ gst: { baseInr: 1917, gstInr: 345, totalInr: 2262 } })).toEqual({ gst: { baseInr: 1917, gstInr: 345, totalInr: 2262 } });
    expect(serverPriceFields({ gst: { baseInr: 1917, gstInr: 300, totalInr: 2262 } })).toEqual({});
    expect(serverPriceFields({})).toEqual({});
  });
});

describe("the dialog", () => {
  it("shows the breakup and 'Pay ₹2,262'; Pay resolves true, Cancel false", async () => {
    const p = confirmServerPrice(GST_ORDER, ORDER_0000_30, OPENED_2359_30);
    expect(document.querySelector('[data-testid="price-confirm-line"]')?.textContent).toBe("Price now ₹1,917 + ₹345 GST (18%) = ₹2,262");
    const pay = document.querySelector<HTMLButtonElement>('[data-testid="price-confirm-pay"]')!;
    expect(pay.textContent).toBe("Pay ₹2,262");
    pay.click();
    await expect(p).resolves.toBe(true);
    expect(document.querySelector('[data-testid="price-confirm"]')).toBeNull();
    const q = confirmServerPrice(GST_ORDER, ORDER_0000_30, OPENED_2359_30);
    document.querySelector<HTMLButtonElement>('[data-testid="price-confirm-cancel"]')!.click();
    await expect(q).resolves.toBe(false);
  });
  it("no dialog when nothing differs", async () => {
    await expect(confirmServerPrice({ amountPaise: 191700 }, OPENED_2359_30, OPENED_2359_30)).resolves.toBe(true);
    expect(document.querySelector('[data-testid="price-confirm"]')).toBeNull();
  });
});

describe("a checkout path (buyPass): tab opened 23:59:30, Pay tapped 00:00:30", () => {
  function deps(open: ReturnType<typeof vi.fn>): BuyDeps {
    const Razorpay = vi.fn().mockImplementation(() => ({ open, on: vi.fn() }));
    return {
      createOrder: vi.fn().mockResolvedValue({ orderId: "order_1", keyId: "rzp_test", ...GST_ORDER }),
      loadScript: vi.fn().mockResolvedValue(Razorpay),
      verify: vi.fn(),
    } as unknown as BuyDeps;
  }
  function pinOpenedAt(ms: number) {
    Object.defineProperty(performance, "timeOrigin", { configurable: true, get: () => ms });
  }

  it("Cancel on the corrected price: Razorpay never opens, the outcome is dismissed", async () => {
    vi.useFakeTimers({ now: ORDER_0000_30, toFake: ["Date"] });
    pinOpenedAt(OPENED_2359_30);
    const open = vi.fn();
    const d = deps(open);
    const out = buyPass("till_boards", d);
    await vi.waitFor(() => expect(document.querySelector('[data-testid="price-confirm"]')).not.toBeNull());
    expect(document.querySelector('[data-testid="price-confirm-pay"]')!.textContent).toBe("Pay ₹2,262");
    document.querySelector<HTMLButtonElement>('[data-testid="price-confirm-cancel"]')!.click();
    await expect(out).resolves.toEqual({ status: "dismissed" });
    expect(open).not.toHaveBeenCalled();
  });

  it("Pay ₹2,262: Razorpay opens for exactly the server amount", async () => {
    vi.useFakeTimers({ now: ORDER_0000_30, toFake: ["Date"] });
    pinOpenedAt(OPENED_2359_30);
    const open = vi.fn();
    const d = deps(open);
    void buyPass("till_boards", d);
    await vi.waitFor(() => expect(document.querySelector('[data-testid="price-confirm"]')).not.toBeNull());
    document.querySelector<HTMLButtonElement>('[data-testid="price-confirm-pay"]')!.click();
    const Razorpay = await (d.loadScript as unknown as () => Promise<ReturnType<typeof vi.fn>>)();
    await vi.waitFor(() => expect(open).toHaveBeenCalled());
    expect(Razorpay.mock.calls[0][0].amount).toBe(226200);
  });
});

describe("GST-EXCL-1 · the Razorpay description names the server's breakup", () => {
  it("an all-in order (every order before the cut-off): the description is unchanged, byte for byte", () => {
    expect(razorpayDescription("Board Pass till your boards", { amountPaise: 191700 })).toBe("Board Pass till your boards");
  });
  it("an order that added GST: the breakup is appended; a credit is named and the charge is the order's", () => {
    expect(razorpayDescription("Board Pass till your boards", GST_ORDER)).toBe("Board Pass till your boards \u00b7 ₹1,917 + ₹345 GST (18%) = ₹2,262");
    expect(razorpayDescription("Board Pass till your boards", { amountPaise: 221300, gst: GST_ORDER.gst, packCreditInr: 49 })).toBe(
      "Board Pass till your boards \u00b7 ₹1,917 + ₹345 GST (18%) = ₹2,262, less pack credit ₹49: ₹2,213",
    );
    expect(razorpayDescription("Maths Mock Pack", { amountPaise: 11700, gst: { baseInr: 99, gstInr: 18, totalInr: 117 } })).toBe("Maths Mock Pack \u00b7 ₹99 + ₹18 GST (18%) = ₹117");
  });
});
