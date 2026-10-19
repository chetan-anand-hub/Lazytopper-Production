/**
 * ASK-PARENTS-PAY-1 — the browser half: the switch, the link, the honest message, and the
 * parent's purchase. The server half (who is paid for, how much, single use) is pinned by
 * server/routes/parentPay.test.cjs.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAskParentMessage,
  buyPassAsParent,
  daysLeft,
  isParentPayClientEnabled,
  mintParentLink,
  parentPayUrl,
  readParentPayToken,
  viewParentLink,
  ParentLinkError,
  PARENT_LINK_ENDPOINT,
  type ParentBuyDeps,
} from "./parentPay";
import type { RazorpayConstructor, RazorpaySuccess } from "./checkout";

const TOKEN = "A".repeat(20) + "b-_9" + "c".repeat(19);

vi.mock("./firebaseClient", () => ({
  authClient: { currentUser: { getIdToken: async () => "child-id-token" } },
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("the switch", () => {
  it("is on only when BOTH VITE_PAYMENTS_ENABLED and VITE_PARENT_PAY_ENABLED are on", () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
    vi.stubEnv("VITE_PARENT_PAY_ENABLED", "1");
    expect(isParentPayClientEnabled()).toBe(true);
    vi.stubEnv("VITE_PARENT_PAY_ENABLED", "");
    expect(isParentPayClientEnabled()).toBe(false);
    vi.stubEnv("VITE_PARENT_PAY_ENABLED", "1");
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "0");
    expect(isParentPayClientEnabled()).toBe(false);
  });
});

describe("the link", () => {
  it("reads a well-formed token from #pp= only", () => {
    expect(TOKEN).toHaveLength(43);
    expect(readParentPayToken(`#pp=${TOKEN}`)).toBe(TOKEN);
    expect(readParentPayToken(`#x=1&pp=${TOKEN}`)).toBe(TOKEN);
    for (const bad of ["", "#", `#pp=${TOKEN}x`, `#pp=${TOKEN.slice(1)}`, `#pp=${TOKEN.slice(0, 42)}%`, `#token=${TOKEN}`, `?pp=${TOKEN}`, null, undefined]) {
      expect(readParentPayToken(bad as string)).toBeNull();
    }
  });

  it("puts the token in the FRAGMENT of this site's /pricing — never in the path or query", () => {
    const url = parentPayUrl(TOKEN, "https://www.lazytopper.com", "/");
    expect(url).toBe(`https://www.lazytopper.com/pricing#pp=${TOKEN}`);
    const u = new URL(url);
    expect(u.pathname).toBe("/pricing");
    expect(u.search).toBe("");
    expect(u.hash).toBe(`#pp=${TOKEN}`);
    expect(parentPayUrl(TOKEN, "https://x.vercel.app", "/sub")).toBe(`https://x.vercel.app/sub/pricing#pp=${TOKEN}`);
  });

  it("days left rounds to whole days, at least 1", () => {
    const now = Date.parse("2026-10-18T10:00:00Z");
    expect(daysLeft(new Date(now + 72 * 3600e3).toISOString(), now)).toBe(3);
    expect(daysLeft(new Date(now + 3600e3).toISOString(), now)).toBe(1);
    expect(daysLeft("nonsense", now)).toBe(1);
  });

  it("mint sends the child's ID token and an EMPTY body — no uid, no name, no price", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, token: TOKEN, expiresAt: "2026-10-21T10:00:00.000Z", prices: { month: 599, till_boards: 2396 } }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const out = await mintParentLink();
    expect(out).toEqual({ token: TOKEN, expiresAt: "2026-10-21T10:00:00.000Z", prices: { month: 599, till_boards: 2396 } });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(PARENT_LINK_ENDPOINT);
    expect(init.body).toBe("{}");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer child-id-token");
  });

  it("view maps the server's refusals to a reason", async () => {
    for (const [status, reason] of [[404, "invalid"], [410, "expired"], [410, "used"], [410, "covered"]] as const) {
      vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status, json: async () => ({ ok: false, reason }) })));
      await expect(viewParentLink(TOKEN)).rejects.toMatchObject({ reason });
    }
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    await expect(viewParentLink(TOKEN)).rejects.toMatchObject({ reason: "failed" });
  });

  it("the parent's calls carry NO Authorization header (a parent signed in elsewhere changes nothing)", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, firstName: "Aarav", prices: {}, expiresAt: "" }) }));
    vi.stubGlobal("fetch", fetchMock);
    await viewParentLink(TOKEN);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(JSON.parse(String(init.body))).toEqual({ token: TOKEN });
  });
});

describe("the message — honest by construction", () => {
  const base = { prices: { month: 777, till_boards: 3108 }, url: `https://www.lazytopper.com/pricing#pp=${TOKEN}`, days: 3 };

  it("quotes the prices it is GIVEN (the server's), and the link", () => {
    const text = buildAskParentMessage({ ...base, lang: "en", checkedCount: 12 });
    expect(text).toContain("₹777 for a month");
    expect(text).toContain("₹3,108 once");
    expect(text).not.toContain("₹599");
    expect(text).toContain(base.url);
    expect(text).toContain("step by step");
    expect(text).toContain("CBSE examiner");
    expect(text).toContain("works for 3 days");
    expect(text).toMatch(/don't need to sign up or share any password/);
  });

  it("states a REAL count only — 0 or unknown leaves the line out entirely", () => {
    expect(buildAskParentMessage({ ...base, lang: "en", checkedCount: 12 })).toContain("I've had 12 answers checked on it in the last 30 days.");
    expect(buildAskParentMessage({ ...base, lang: "en", checkedCount: 1 })).toContain("I've had 1 answer checked");
    for (const n of [0, null, -3, 2.5, Number.NaN]) {
      const text = buildAskParentMessage({ ...base, lang: "en", checkedCount: n as number | null });
      expect(text).not.toMatch(/checked on it/);
      expect(text).not.toMatch(/\b0 answers\b/);
    }
  });

  it("a price the server could not quote is left out, never guessed", () => {
    const text = buildAskParentMessage({ ...base, lang: "en", prices: { month: 599, till_boards: null }, checkedCount: null });
    expect(text).toContain("Premium is ₹599 for a month.");
    expect(text).not.toMatch(/till my boards/);
  });

  it("Hindi carries the same facts: prices, real count, link, validity", () => {
    const text = buildAskParentMessage({ ...base, lang: "hi", checkedCount: 5 });
    expect(text).toContain("₹777");
    expect(text).toContain("₹3,108");
    expect(text).toContain("5 उत्तर");
    expect(text).toContain(base.url);
    expect(text).toContain("3 दिन");
    expect(buildAskParentMessage({ ...base, lang: "hi", checkedCount: 0 })).not.toContain("उत्तर जाँचे गए");
  });

  it("no pressure language", () => {
    for (const lang of ["en", "hi"] as const) {
      const text = buildAskParentMessage({ ...base, lang, checkedCount: 4 }).toLowerCase();
      for (const w of ["hurry", "only today", "last chance", "guarantee", "urgent", "limited time"]) expect(text).not.toContain(w);
    }
  });
});

describe("the parent's purchase", () => {
  const success: RazorpaySuccess = { razorpay_order_id: "order_1", razorpay_payment_id: "pay_1", razorpay_signature: "ab" };

  function fakeRazorpay(result: RazorpaySuccess | null): { ctor: RazorpayConstructor; opened: Array<Record<string, unknown>> } {
    const opened: Array<Record<string, unknown>> = [];
    const ctor = class {
      o: { handler: (r: RazorpaySuccess) => void; modal: { ondismiss: () => void } } & Record<string, unknown>;
      constructor(o: { handler: (r: RazorpaySuccess) => void; modal: { ondismiss: () => void } } & Record<string, unknown>) {
        this.o = o;
        opened.push(o);
      }
      open() {
        if (result) this.o.handler(result);
        else this.o.modal.ondismiss();
      }
    } as unknown as RazorpayConstructor;
    return { ctor, opened };
  }

  function deps(over: Partial<ParentBuyDeps>, rz = fakeRazorpay(success)): ParentBuyDeps {
    return {
      createOrder: vi.fn(async () => ({ orderId: "order_1", keyId: "rzp_test", amountPaise: 59900 })),
      loadScript: async () => rz.ctor,
      verify: vi.fn(async () => ({ passEnd: "2026-11-18T06:30:00.000Z", firstName: "Aarav" })),
      ...over,
    };
  }

  it("paid: the token + type go to the server; Razorpay charges the SERVER's order", async () => {
    const rz = fakeRazorpay(success);
    const d = deps({}, rz);
    const out = await buyPassAsParent(TOKEN, "month", d);
    expect(out).toEqual({ status: "paid", passEnd: "2026-11-18T06:30:00.000Z", firstName: "Aarav", paymentId: "pay_1", amountInr: 599 });
    expect(d.createOrder).toHaveBeenCalledWith(TOKEN, "month");
    expect(d.verify).toHaveBeenCalledWith(TOKEN, success);
    expect(rz.opened[0]).toMatchObject({ order_id: "order_1", amount: 59900, key: "rzp_test", currency: "INR" });
  });

  it("dismissed: nothing verified", async () => {
    const d = deps({}, fakeRazorpay(null));
    expect(await buyPassAsParent(TOKEN, "month", d)).toEqual({ status: "dismissed" });
    expect(d.verify).not.toHaveBeenCalled();
  });

  it("a link that became used / expired is reported with its reason; anything else is a plain failure", async () => {
    expect(await buyPassAsParent(TOKEN, "month", deps({ createOrder: async () => { throw new ParentLinkError("used"); } }))).toEqual({ status: "failed", reason: "used" });
    // PAY-RECOVER-1 — a verify error AFTER Razorpay's signed success is pending, never failed.
    expect(await buyPassAsParent(TOKEN, "month", deps({ verify: async () => { throw new Error("x"); } }))).toEqual({ status: "pending" });
  });
});
