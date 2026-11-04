/**
 * ASK-PARENTS-PAY-1 — the browser half: the switch, the link, the honest message, and the
 * parent's purchase. The server half (who is paid for, how much, single use) is pinned by
 * server/routes/parentPay.test.cjs.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAskParentMessage,
  parentProofFrom,
  parentProofLine,
  buyPassAsParent,
  createParentOrder,
  daysLeft,
  verifyParentPayment,
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
import { buildAskParentPackMessage, parentPackName } from "./parentPayPack";

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
    // PRICE-FIXED-1: the message names ONLY the Board Pass; the month price (even if the server sent one) is never quoted.
    expect(text).not.toContain("₹777");
    expect(text).not.toMatch(/for a month|599/);
    expect(text).toContain("₹3,108 once");
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
    const text = buildAskParentMessage({ ...base, lang: "en", prices: { month: null, till_boards: null }, checkedCount: null });
    expect(text).not.toMatch(/₹/);
    expect(text).not.toMatch(/till my boards/);
  });

  it("Hindi carries the same facts: prices, real count, link, validity", () => {
    const text = buildAskParentMessage({ ...base, lang: "hi", checkedCount: 5 });
    expect(text).not.toContain("₹777");
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

describe("TRIAL-SELL-1 - the parent's proof line, from real graded results only", () => {
  const base = { prices: { month: null, till_boards: 1917 }, url: `https://www.lazytopper.com/pricing#pp=${TOKEN}`, days: 3 };

  it("projects the 30-day totals: marks lost to not-attempted work are left out; the group is named only above Me's gate", () => {
    expect(
      parentProofFrom({ totals: { answers: 3, marksLost: 2.5, marksNotAttempted: 1 }, byGroup: { knowledge: 0.5, technique: 0, careless: 1 }, namesWeakness: true }),
    ).toEqual({ answers: 3, marksLost: 1.5, group: "careless" });
    expect(
      parentProofFrom({ totals: { answers: 3, marksLost: 2.5, marksNotAttempted: 1 }, byGroup: { knowledge: 0.5, technique: 0, careless: 1 }, namesWeakness: false }),
    ).toEqual({ answers: 3, marksLost: 1.5, group: null });
  });

  it("'mostly' must be true: a group under half of the typed marks lost is not named (exactly half is)", () => {
    const totals = { answers: 4, marksLost: 3 };
    // careless 1.2 of 3 typed (40%) -> largest, but not "mostly": no parenthesis.
    const under = parentProofFrom({ totals, byGroup: { knowledge: 0.9, technique: 0.9, careless: 1.2 }, namesWeakness: true });
    expect(under).toEqual({ answers: 4, marksLost: 3, group: null });
    expect(buildAskParentMessage({ ...base, lang: "en", checkedCount: 4, proof: under })).toContain("it found 3 marks I was losing.");
    expect(buildAskParentMessage({ ...base, lang: "hi", checkedCount: 4, proof: under })).toContain("3 नंबर पकड़े जो मेरे कट रहे थे।");
    expect(buildAskParentMessage({ ...base, lang: "en", checkedCount: 4, proof: under })).not.toContain("mostly");
    // exactly half -> named.
    expect(parentProofFrom({ totals, byGroup: { knowledge: 1.5, technique: 1, careless: 0.5 }, namesWeakness: true })?.group).toBe("knowledge");
  });

  it("nothing real to say -> null (no totals, no answers, nothing lost, only not-attempted)", () => {
    expect(parentProofFrom(null)).toBeNull();
    expect(parentProofFrom({ totals: null, namesWeakness: true })).toBeNull();
    expect(parentProofFrom({ totals: { answers: 0, marksLost: 0 }, namesWeakness: true })).toBeNull();
    expect(parentProofFrom({ totals: { answers: 4, marksLost: 0 }, namesWeakness: true })).toBeNull();
    expect(parentProofFrom({ totals: { answers: 4, marksLost: 2, marksNotAttempted: 2 }, namesWeakness: true })).toBeNull();
  });

  it("English: ONE proof line replaces the count line; the rest of the message is unchanged", () => {
    const text = buildAskParentMessage({ ...base, lang: "en", checkedCount: 3, proof: { answers: 3, marksLost: 1.5, group: "careless" } });
    expect(text).toContain("In the 3 answers it checked for me in the last 30 days, it found 1.5 marks I was losing (mostly careless slips).");
    expect(text).not.toMatch(/I've had 3 answers checked/);
    expect(text).toContain("₹1,917 once");
    expect(text).toContain(base.url);
    expect(buildAskParentMessage({ ...base, lang: "en", checkedCount: 1, proof: { answers: 1, marksLost: 1, group: null } })).toContain(
      "In the 1 answer it checked for me in the last 30 days, it found 1 mark I was losing.",
    );
  });

  it("no proof (null, absent, or invalid) -> today's text exactly", () => {
    const today = buildAskParentMessage({ ...base, lang: "en", checkedCount: 2 });
    expect(today).toContain("I've had 2 answers checked on it in the last 30 days.");
    for (const proof of [null, undefined, { answers: 0, marksLost: 2, group: null }, { answers: 2, marksLost: 0, group: null }, { answers: 2, marksLost: Number.NaN, group: null }]) {
      expect(buildAskParentMessage({ ...base, lang: "en", checkedCount: 2, proof })).toBe(today);
    }
  });

  it("Hindi carries the same proof", () => {
    const text = buildAskParentMessage({ ...base, lang: "hi", checkedCount: 3, proof: { answers: 3, marksLost: 1.5, group: "careless" } });
    expect(text).toContain("पिछले 30 दिनों में इसने मेरे 3 उत्तर जाँचे और 1.5 नंबर पकड़े जो मेरे कट रहे थे (ज़्यादातर लापरवाही की गलतियाँ)।");
    expect(text).not.toContain("उत्तर जाँचे गए हैं");
    expect(parentProofLine({ answers: 2, marksLost: 3, group: null }, "hi")).toBe("पिछले 30 दिनों में इसने मेरे 2 उत्तर जाँचे और 3 नंबर पकड़े जो मेरे कट रहे थे।");
  });
});


describe("PARENT-PACKS-1 - a link that carries one pack", () => {
  const url = `https://www.lazytopper.com/pricing#pp=${TOKEN}`;

  it("the Board Pass message says 'Board Pass', never 'Premium' (en + hi)", () => {
    for (const lang of ["en", "hi"] as const) {
      const text = buildAskParentMessage({ lang, prices: { month: 599, till_boards: 1917 }, checkedCount: 3, url, days: 3 });
      expect(text).toContain("Board Pass");
      expect(text).toContain("₹1,917");
      expect(text).not.toMatch(/premium/i);
    }
    expect(buildAskParentMessage({ lang: "en", prices: { month: null, till_boards: 1917 }, checkedCount: null, url, days: 3 })).toContain(
      "The Board Pass is ₹1,917 once for everything till my boards.",
    );
  });

  it("the pack message names the pack and the SERVER price, once; no Board Pass line, no proof line (en)", () => {
    const text = buildAskParentPackMessage({ lang: "en", name: "Maths CBQ Pack", priceInr: 199, url, days: 3 });
    expect(text).toContain("can you get me the Maths CBQ Pack on LazyTopper? It's ₹199, one time");
    expect(text).toContain(url);
    expect(text).toContain("(The link works for 3 days.)");
    expect(text).toContain("don't need to sign up or share any password");
    expect(text).not.toMatch(/Board Pass|premium|1,917|checked|marks/i);
  });

  it("the pack message in Hindi carries the same facts", () => {
    const text = buildAskParentPackMessage({ lang: "hi", name: "Polynomials Chapter Pack", priceInr: 49, url, days: 1 });
    expect(text).toContain("Polynomials Chapter Pack");
    expect(text).toContain("₹49");
    expect(text).toContain(url);
    expect(text).toContain("1 दिन");
    expect(text).not.toMatch(/Board Pass|premium|उत्तर जाँचे/i);
  });

  it("pack names", () => {
    expect(parentPackName("pack_cbq", "maths")).toBe("Maths CBQ Pack");
    expect(parentPackName("pack_cbq", "science")).toBe("Science CBQ Pack");
    expect(parentPackName("pack_subject", "science")).toBe("Science Subject Pack");
    expect(parentPackName("pack_mock", "maths")).toBe("Maths Mock Pack");
    expect(parentPackName("pack_chapter", "polynomials", "Polynomials")).toBe("Polynomials Chapter Pack");
    expect(parentPackName("pack_bundle", undefined)).toBe("Maths + Science Bundle");
  });

  it("mint for a pack sends ONLY its sku + target with the child's token, and trusts the server's echoed price", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, token: TOKEN, expiresAt: "2026-11-07T10:00:00.000Z", pack: { sku: "pack_cbq", target: "maths", priceInr: 199 } }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const out = await mintParentLink({ sku: "pack_cbq", target: "maths" });
    expect(out.pack).toEqual({ sku: "pack_cbq", target: "maths", priceInr: 199 });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ pack: { sku: "pack_cbq", target: "maths" } });
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer child-id-token");
  });

  it("a pack mint the server answers WITHOUT the pack (or with another one) is a failure, never a priceless message", async () => {
    // Review L3: a different echoed TARGET is refused too.
    for (const pack of [undefined, { sku: "pack_bundle", target: "all", priceInr: 299 }, { sku: "pack_cbq", target: "maths", priceInr: 0 }, { sku: "pack_cbq", target: "science", priceInr: 199 }]) {
      vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, token: TOKEN, expiresAt: "x", pack }) })));
      await expect(mintParentLink({ sku: "pack_cbq", target: "maths" })).rejects.toBeInstanceOf(ParentLinkError);
    }
  });

  it("the parent's pack order sends the token and `product: pack` only — no sku, target, uid or amount", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, orderId: "order_P1", keyId: "rzp", amountPaise: 19900 }) }));
    vi.stubGlobal("fetch", fetchMock);
    await createParentOrder(TOKEN, "pack");
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ token: TOKEN, product: "pack" });
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    await createParentOrder(TOKEN, "till_boards");
    const [, init2] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init2.body))).toEqual({ token: TOKEN, passType: "till_boards" });
  });

  it("verify: a pack grant is believed only with the server's `kind: pack`; 'owned' is a reason", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, kind: "pack", firstName: "Aarav", pack: {} }) })));
    expect(await verifyParentPayment(TOKEN, { razorpay_order_id: "o", razorpay_payment_id: "p", razorpay_signature: "ab" })).toEqual({ passEnd: "", firstName: "Aarav" });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, kind: "pack", firstName: "Aarav", duplicate: true }) })));
    expect(await verifyParentPayment(TOKEN, { razorpay_order_id: "o", razorpay_payment_id: "p", razorpay_signature: "ab" })).toEqual({ passEnd: "", firstName: "Aarav", duplicate: true });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, firstName: "Aarav" }) })));
    await expect(verifyParentPayment(TOKEN, { razorpay_order_id: "o", razorpay_payment_id: "p", razorpay_signature: "ab" })).rejects.toBeInstanceOf(ParentLinkError);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 410, json: async () => ({ ok: false, reason: "owned" }) })));
    await expect(viewParentLink(TOKEN)).rejects.toMatchObject({ reason: "owned" });
  });
});

describe("PARENT-PACKS-1 review - the Bundle's echoed target", () => {
  it("a Bundle link is accepted with the server's target 'all'", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, token: TOKEN, expiresAt: "x", pack: { sku: "pack_bundle", target: "all", priceInr: 299 } }) })));
    expect((await mintParentLink({ sku: "pack_bundle" })).pack).toEqual({ sku: "pack_bundle", target: "all", priceInr: 299 });
  });
});
