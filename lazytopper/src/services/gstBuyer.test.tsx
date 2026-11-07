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
  resetGstBuyerSessionForTests,
  setSessionGstBuyer,
  gstStateLineText,
  getSessionGstBuyer,
  isPinForState,
  ownerTag,
  PIN_PREFIXES,
  GUEST_OWNER,
} from "./gstBuyer";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import GstStateLine from "../components/gstInvoice/GstStateLine";
import { gstBuyerOrderFields, isGstBuyerCancelled, armPressCapture, resetPressForTests } from "./gstBuyerOrder";
import { buyPass, type BuyDeps } from "./checkout";

const require = createRequire(import.meta.url);
const server = require("../../server/services/gstInvoice.cjs") as {
  GST_STATES: { code: string; name: string }[];
  PIN_PREFIXES: Record<string, string[]>;
  isPinForState: (pin: string, state: string) => boolean;
  isValidGstin: (g: string) => boolean;
  gstinCheckChar: (s: string) => string;
};
const withCheck = (first14: string) => `${first14}${server.gstinCheckChar(first14)}`;
const TEST_GSTIN_MH = withCheck("27BBBBB1111B1Z"); // test fixture

afterEach(() => {
  cleanup();
  resetGstBuyerSessionForTests();
  resetPressForTests();
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
  it("form rules: state AND PIN required, PIN 6 digits and plausible for the state, GSTIN checksum + state match, name and address", () => {
    const biz = { gstin: TEST_GSTIN_MH, legalName: "Test Coaching", address: "12 Test Road, Pune" };
    expect(gstFormError({ stateCode: "", pin: "", business: null })).toMatch(/Choose your state/);
    expect(gstFormError({ stateCode: "29", pin: "", business: null })).toMatch(/Enter your 6-digit PIN/);
    expect(gstFormError({ stateCode: "29", pin: "560001", business: null })).toBeNull();
    expect(gstFormError({ stateCode: "29", pin: "5600", business: null })).toMatch(/6 digits/);
    expect(gstFormError({ stateCode: "29", pin: "110001", business: null })).toMatch(/not in Karnataka/);
    expect(gstFormError({ stateCode: "27", pin: "411001", business: biz })).toBeNull();
    expect(gstFormError({ stateCode: "29", pin: "560001", business: biz })).toMatch(/must match the state/);
    expect(gstFormError({ stateCode: "27", pin: "411001", business: { ...biz, gstin: "27AAPFU0939F1ZW" } })).toMatch(/does not look right/);
    expect(gstFormError({ stateCode: "27", pin: "411001", business: { ...biz, legalName: "" } })).toMatch(/legal name/);
  });
  it("PIN table: EXACTLY the server's; every state has prefixes; border / enclave / APS PINs pass, a wrong state's fails", () => {
    expect(JSON.parse(JSON.stringify(PIN_PREFIXES))).toEqual(JSON.parse(JSON.stringify(server.PIN_PREFIXES)));
    for (const st of GST_STATES) expect((PIN_PREFIXES[st.code] || []).length, st.name).toBeGreaterThan(0);
    const cases: Array<[string, string, boolean]> = [
      ["560001", "29", true], ["110001", "07", true], ["400001", "27", true], ["403001", "30", true], ["600001", "33", true],
      ["605001", "34", true], ["533464", "34", true], ["673310", "34", true], ["682555", "31", true], ["362520", "26", true],
      ["737101", "11", true], ["744101", "35", true], ["194101", "38", true], ["160017", "04", true], ["248001", "05", true],
      ["500001", "36", true], ["520001", "37", true], ["834001", "20", true], ["799001", "16", true], ["999001", "29", true],
      ["110001", "29", false], ["560001", "07", false], ["400001", "33", false], ["012345", "29", false], ["56001", "29", false],
    ];
    for (const [pin, st, ok] of cases) {
      expect(isPinForState(pin, st), `${pin} ${st}`).toBe(ok);
      expect(server.isPinForState(pin, st), `server ${pin} ${st}`).toBe(ok);
    }
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
    expect(JSON.parse(localStorage.getItem(GST_BUYER_KEY) || "null")).toEqual({ owner: GUEST_OWNER, stateCode: "32", pin: "682001" });
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
    const p = askGstBuyer({ stateCode: "29", pin: "560001" });
    const select = document.querySelector<HTMLSelectElement>('[data-testid="gst-state-select"]')!;
    expect(select.options).toHaveLength(37);
    expect(select.value).toBe("29");
    expect(document.querySelector('label[for="lt-gst-pin"]')!.textContent).toBe("PIN code");
    document.querySelector<HTMLButtonElement>('[data-testid="gst-continue"]')!.click();
    expect(await p).toEqual({ stateCode: "29", pin: "560001" });
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
    expect(document.querySelector('[data-testid="gst-error"]')!.textContent).toMatch(/Enter your 6-digit PIN/);
    const pin = document.querySelector('[data-testid="gst-pin"]') as HTMLInputElement;
    pin.value = "560001";
    go.click();
    expect(document.querySelector('[data-testid="gst-error"]')!.textContent).toMatch(/not in Maharashtra/);
    pin.value = "411001";
    go.click();
    expect(document.querySelector('[data-testid="gst-error"]')!.textContent).toMatch(/does not look right/);
    (document.querySelector('[data-testid="gst-gstin"]') as HTMLInputElement).value = TEST_GSTIN_MH.toLowerCase();
    go.click();
    expect(await p).toEqual({ stateCode: "27", pin: "411001", business: { gstin: TEST_GSTIN_MH, legalName: "Test Coaching", address: "12 Test Road, Pune" } });
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

describe("review round (HOLD of #1619)", () => {
  it("D3: the dialog is modal - the page behind is inert, Tab wraps inside, focus returns to Pay on close", async () => {
    document.body.innerHTML = '<main id="page"><button id="pay">Pay</button></main>';
    const pay = document.getElementById("pay") as HTMLButtonElement;
    pay.focus();
    const p = askGstBuyer({ stateCode: "29" });
    expect(document.getElementById("page")!.hasAttribute("inert")).toBe(true);
    const go = document.querySelector<HTMLButtonElement>('[data-testid="gst-continue"]')!;
    const cancel = document.querySelector<HTMLButtonElement>('[data-testid="gst-cancel"]')!;
    const select = document.querySelector<HTMLSelectElement>('[data-testid="gst-state-select"]')!;
    expect(document.activeElement).toBe(go);
    cancel.focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement).toBe(select);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(cancel);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(await p).toBeNull();
    expect(document.getElementById("page")!.hasAttribute("inert")).toBe(false);
    expect(document.activeElement).toBe(pay);
  });

  it("D4: a state picked with Change wins over the remembered one, with no dialog at Pay", async () => {
    const d = deps({ fetchContext: async () => ({ ipStateCode: null, remembered: { stateCode: "33", pin: "600001" } }), currentUid: async () => "uA" });
    setSessionGstBuyer({ stateCode: "32", pin: "682001" }, ownerTag("uA"));
    expect(await gstBuyerForOrder({ Authorization: "Bearer x" }, d)).toEqual({ stateCode: "32", pin: "682001" });
    expect(d.ask).not.toHaveBeenCalled();
    expect(gstStateLineText({ stateCode: "29" })).toBe("State: Karnataka");
    expect(gstStateLineText({ stateCode: "29", pin: "560001" })).toBe("State: Karnataka · PIN 560001");
    expect(gstStateLineText(null)).toBeNull();
  });

  it("D4/D6: the line renders nothing and calls nothing with the flag off; with it on it shows the remembered state + Change", async () => {
    const fetchSpy = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, ipStateCode: null, remembered: { stateCode: "29", pin: "560001" } }) }));
    vi.stubGlobal("fetch", fetchSpy);
    const { container } = render(<GstStateLine />);
    expect(container.innerHTML).toBe("");
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchSpy).not.toHaveBeenCalled();
    cleanup();
    vi.stubEnv("VITE_GST_STATE_FIELD", "1");
    vi.doMock("./firebaseClient", () => ({
      authClient: { currentUser: { uid: "uA", getIdToken: async () => "tok" }, onAuthStateChanged: () => () => {} },
      firestoreDb: null,
      app: null,
    }));
    render(<GstStateLine />);
    await waitFor(() => expect(screen.getByTestId("gst-state-line").textContent).toMatch(/State: Karnataka · PIN 560001 · Change/));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
    vi.doUnmock("./firebaseClient");
  });
});

describe("GST-INVOICE-2a", () => {
  it("PIN required: a remembered state WITHOUT a valid PIN opens the dialog pre-filled (no silent order without a PIN)", async () => {
    const d = deps({ fetchContext: async () => ({ ipStateCode: null, remembered: { stateCode: "33" } }), currentUid: async () => "uA", ask: vi.fn(async () => ({ stateCode: "33", pin: "600001" })) });
    expect(await gstBuyerForOrder({ Authorization: "Bearer a" }, d)).toEqual({ stateCode: "33", pin: "600001" });
    expect(d.ask).toHaveBeenCalledWith({ stateCode: "33" });
  });

  it("2b: a Change made by account A is never used for, or offered to, account B signing in on the same page", async () => {
    const a = ownerTag("uA");
    const b = ownerTag("uB");
    expect(a).not.toBe(b);
    expect(a).not.toContain("uA");
    setSessionGstBuyer({ stateCode: "32", pin: "682001" }, a);
    expect(getSessionGstBuyer(a)).toEqual({ stateCode: "32", pin: "682001" });
    expect(getSessionGstBuyer(b)).toBeNull();
    expect(getSessionGstBuyer(null)).toBeNull();
    const dB = deps({ fetchContext: async () => ({ ipStateCode: null, remembered: null }), currentUid: async () => "uB", ask: vi.fn(async () => ({ stateCode: "07", pin: "110001" })) });
    expect(await gstBuyerForOrder({ Authorization: "Bearer b" }, dB)).toEqual({ stateCode: "07", pin: "110001" });
    expect(dB.ask).toHaveBeenCalledWith(null); // neither A's Change nor A's device entry is B's pre-fill
    // A's own next order still uses A's choice; and a signed-out buyer on this device gets nothing of either.
    const dA = deps({ currentUid: async () => "uA" });
    expect(await gstBuyerForOrder({ Authorization: "Bearer a2" }, dA)).toEqual({ stateCode: "32", pin: "682001" });
    const dGuest = deps();
    await gstBuyerForOrder(null, dGuest);
    expect(dGuest.ask).toHaveBeenCalledWith(null);
  });

  it("2b: the device entry is used only by the account that saved it; an entry with no owner (pre-2a) is ignored", async () => {
    localStorage.setItem(GST_BUYER_KEY, JSON.stringify({ stateCode: "32", pin: "682001" }));
    const d1 = deps({ currentUid: async () => "uA" });
    await gstBuyerForOrder({ Authorization: "Bearer a" }, d1);
    expect(d1.ask).toHaveBeenCalledWith(null);
    localStorage.setItem(GST_BUYER_KEY, JSON.stringify({ owner: ownerTag("uA"), stateCode: "32", pin: "682001" }));
    const d2 = deps({ currentUid: async () => "uA" });
    await gstBuyerForOrder({ Authorization: "Bearer a3" }, d2);
    expect(d2.ask).toHaveBeenCalledWith({ stateCode: "32", pin: "682001" });
    localStorage.setItem(GST_BUYER_KEY, JSON.stringify({ owner: ownerTag("uA"), stateCode: "32", pin: "682001" }));
    const d3 = deps({ currentUid: async () => "uB" });
    await gstBuyerForOrder({ Authorization: "Bearer b3" }, d3);
    expect(d3.ask).toHaveBeenCalledWith(null);
    // Signed in but the uid cannot be read: nothing from the device, nothing saved.
    localStorage.clear();
    const d4 = deps({ currentUid: async () => null });
    await gstBuyerForOrder({ Authorization: "Bearer c" }, d4);
    expect(localStorage.getItem(GST_BUYER_KEY)).toBeNull();
  });

  it("2a: focus returns to the PRESSED Pay button even though the surface disabled it while busy (Cancel)", async () => {
    armPressCapture();
    document.body.innerHTML = '<main id="page"><button id="pay">Pay</button><button id="other">Other</button></main>';
    const pay = document.getElementById("pay") as HTMLButtonElement;
    let opened: Promise<unknown> | null = null;
    pay.addEventListener("click", () => {
      pay.disabled = true; // the surface's busy state
      pay.blur();
      opened = askGstBuyer({ stateCode: "29", pin: "560001" }).then((v) => {
        setTimeout(() => {
          pay.disabled = false; // the surface re-enables Pay a render later
        }, 120);
        return v;
      });
    });
    pay.click();
    expect(document.activeElement).not.toBe(pay);
    document.querySelector<HTMLButtonElement>('[data-testid="gst-cancel"]')!.click();
    expect(await opened).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(pay), { timeout: 2000 });
  });

  it("2a: a press inside the dialog is never taken as the opener", async () => {
    armPressCapture();
    document.body.innerHTML = '<button id="pay">Pay</button>';
    const pay = document.getElementById("pay") as HTMLButtonElement;
    pay.click();
    const p = askGstBuyer(null);
    document.querySelector<HTMLButtonElement>('[data-testid="gst-continue"]')!.click(); // shows an error, stays open
    document.querySelector<HTMLButtonElement>('[data-testid="gst-cancel"]')!.click();
    expect(await p).toBeNull();
    expect(document.activeElement).toBe(pay);
  });
});
