/**
 * GST-INVOICE-1 - the "Your state" step before Pay: the state table's parity with the server, the validators, the flow
 * (off / remembered / IP pre-fill / cancel) and the dialog itself, and that every buy function treats Cancel as "dismissed".
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { createRequire } from "node:module";
import {
  GST_STATES,
  askGstBuyer,
  gstBuyerForOrder,
  gstFormError,
  isValidGstin,
  GstBuyerCancelledError,
  GST_BUYER_KEY,
  type GstBuyerDeps,
} from "./gstBuyer";
import { gstBuyerOrderFields, isGstBuyerCancelled } from "./gstBuyerOrder";
import { buyPass, type BuyDeps } from "./checkout";

const require = createRequire(import.meta.url);
const server = require("../../server/services/gstInvoice.cjs") as {
  GST_STATES: { code: string; name: string }[];
  isValidGstin: (g: string) => boolean;
  gstinCheckChar: (s: string) => string;
};
const withCheck = (first14: string) => `${first14}${server.gstinCheckChar(first14)}`;
const TEST_GSTIN_MH = withCheck("27BBBBB1111B1Z"); // test fixture

afterEach(() => {
  document.body.innerHTML = "";
  try {
    localStorage.clear();
  } catch {
    /* jsdom */
  }
  vi.unstubAllEnvs();
});

describe("state table and validators", () => {
  it("the client's 36 States / UTs are EXACTLY the server's (codes and names, same order)", () => {
    expect(GST_STATES.map((s) => [s.code, s.name])).toEqual(server.GST_STATES.map((s) => [s.code, s.name]));
    expect(GST_STATES).toHaveLength(36);
  });
  it("GSTIN checksum agrees with the server on valid and invalid inputs", () => {
    for (const v of ["27AAPFU0939F1ZV", "29AAGCB7383J1Z4", TEST_GSTIN_MH, "27AAPFU0939F1ZW", "99AAPFU0939F1ZV", "short"]) {
      expect(isValidGstin(v)).toBe(server.isValidGstin(v));
    }
  });
  it("form rules: state required, PIN 6 digits, GSTIN checksum + state match, name and address", () => {
    const biz = { gstin: TEST_GSTIN_MH, legalName: "Test Coaching", address: "12 Test Road, Pune" };
    expect(gstFormError({ stateCode: "", pin: "", business: null })).toMatch(/Choose your state/);
    expect(gstFormError({ stateCode: "29", pin: "", business: null })).toBeNull();
    expect(gstFormError({ stateCode: "29", pin: "5600", business: null })).toMatch(/6 digits/);
    expect(gstFormError({ stateCode: "27", pin: "411001", business: biz })).toBeNull();
    expect(gstFormError({ stateCode: "29", pin: "", business: biz })).toMatch(/must match the state/);
    expect(gstFormError({ stateCode: "27", pin: "", business: { ...biz, gstin: "27AAPFU0939F1ZW" } })).toMatch(/does not look right/);
    expect(gstFormError({ stateCode: "27", pin: "", business: { ...biz, legalName: "" } })).toMatch(/legal name/);
  });
});

function deps(over: Partial<GstBuyerDeps> = {}): GstBuyerDeps & { ask: ReturnType<typeof vi.fn> } {
  const ask = vi.fn(async () => ({ stateCode: "29" }));
  return { enabled: () => true, fetchContext: async () => ({ ipStateCode: null, remembered: null }), ask, ...over } as GstBuyerDeps & { ask: ReturnType<typeof vi.fn> };
}

describe("gstBuyerForOrder", () => {
  it("off: undefined, no network, no dialog", async () => {
    const fetchContext = vi.fn();
    const d = deps({ enabled: () => false, fetchContext });
    expect(await gstBuyerForOrder(null, d)).toBeUndefined();
    expect(fetchContext).not.toHaveBeenCalled();
    expect(d.ask).not.toHaveBeenCalled();
  });
  it("signed in with a remembered state: that state, NO dialog (asked once)", async () => {
    const d = deps({ fetchContext: async () => ({ ipStateCode: "07", remembered: { stateCode: "33", pin: "600001" } }) });
    expect(await gstBuyerForOrder({ Authorization: "Bearer x" }, d)).toEqual({ stateCode: "33", pin: "600001" });
    expect(d.ask).not.toHaveBeenCalled();
  });
  it("first time: the dialog, PRE-FILLED from the IP region; NO Karnataka default when the IP says nothing", async () => {
    const d1 = deps({ fetchContext: async () => ({ ipStateCode: "27", remembered: null }) });
    await gstBuyerForOrder(null, d1);
    expect(d1.ask).toHaveBeenCalledWith({ stateCode: "27" });
    localStorage.clear(); // a fresh device: no last choice either
    const d2 = deps();
    await gstBuyerForOrder(null, d2);
    expect(d2.ask).toHaveBeenCalledWith(null);
  });
  it("this device's last choice is the pre-fill when the IP is unknown, and is saved after Continue", async () => {
    const d = deps({ ask: vi.fn(async () => ({ stateCode: "32", pin: "682001" })) });
    await gstBuyerForOrder(null, d);
    expect(JSON.parse(localStorage.getItem(GST_BUYER_KEY) || "null")).toEqual({ stateCode: "32", pin: "682001" });
    const d2 = deps();
    await gstBuyerForOrder(null, d2);
    expect(d2.ask).toHaveBeenCalledWith({ stateCode: "32", pin: "682001" });
  });
  it("Cancel throws GstBuyerCancelledError, which the order door recognises", async () => {
    const d = deps({ ask: vi.fn(async () => null) });
    const err = await gstBuyerForOrder(null, d).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GstBuyerCancelledError);
    expect(isGstBuyerCancelled(err)).toBe(true);
    expect(isGstBuyerCancelled(new Error("x"))).toBe(false);
  });
  it("the order door with the flag off: {} and a lazy auth getter is never called", async () => {
    const getter = vi.fn(async () => ({ Authorization: "Bearer x" }));
    expect(await gstBuyerOrderFields(getter)).toEqual({});
    expect(getter).not.toHaveBeenCalled();
  });
});

describe("the dialog", () => {
  it("renders the 36 states pre-filled; Continue is one tap; Cancel resolves null", async () => {
    const p = askGstBuyer({ stateCode: "29" });
    const select = document.querySelector<HTMLSelectElement>('[data-testid="gst-state-select"]')!;
    expect(select.options).toHaveLength(37);
    expect(select.value).toBe("29");
    document.querySelector<HTMLButtonElement>('[data-testid="gst-continue"]')!.click();
    expect(await p).toEqual({ stateCode: "29" });
    expect(document.querySelector('[data-testid="gst-state-dialog"]')).toBeNull();
    const p2 = askGstBuyer(null);
    document.querySelector<HTMLButtonElement>('[data-testid="gst-cancel"]')!.click();
    expect(await p2).toBeNull();
  });
  it("unselected: Continue shows the error and does not close; the business block validates the GSTIN", async () => {
    const p = askGstBuyer(null);
    const go = document.querySelector<HTMLButtonElement>('[data-testid="gst-continue"]')!;
    go.click();
    expect(document.querySelector('[data-testid="gst-error"]')!.textContent).toMatch(/Choose your state/);
    const select = document.querySelector<HTMLSelectElement>('[data-testid="gst-state-select"]')!;
    select.value = "27";
    document.querySelector<HTMLButtonElement>('[data-testid="gst-business-toggle"]')!.click();
    (document.querySelector('[data-testid="gst-gstin"]') as HTMLInputElement).value = "27AAPFU0939F1ZW";
    (document.querySelector('[data-testid="gst-legal-name"]') as HTMLInputElement).value = "Test Coaching";
    (document.querySelector('[data-testid="gst-address"]') as HTMLTextAreaElement).value = "12 Test Road, Pune";
    go.click();
    expect(document.querySelector('[data-testid="gst-error"]')!.textContent).toMatch(/does not look right/);
    (document.querySelector('[data-testid="gst-gstin"]') as HTMLInputElement).value = TEST_GSTIN_MH.toLowerCase();
    go.click();
    expect(await p).toEqual({ stateCode: "27", business: { gstin: TEST_GSTIN_MH, legalName: "Test Coaching", address: "12 Test Road, Pune" } });
  });
});

describe("every buy function: closing 'Your state' is 'dismissed', never 'failed'", () => {
  it("buyPass", async () => {
    const d: BuyDeps = {
      createOrder: async () => {
        throw new GstBuyerCancelledError();
      },
      loadScript: async () => (function () {}) as never,
      verify: async () => ({ passEnd: "" }),
    };
    expect(await buyPass("till_boards", d)).toEqual({ status: "dismissed" });
  });
});
