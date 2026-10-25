import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PACK_CHAPTER_SLUGS,
  PACK_PRICE_INR,
  buyPack,
  chaptersOfSubject,
  fetchMyPacks,
  isAlreadyOwned,
  isPacksClientEnabled,
  ownsChapter,
  ownsMocks,
  packDescription,
  packIdOf,
  subjectOfChapter,
  type PackBuyDeps,
} from "./packs";
import { PayAlreadyOwnedError, PayOrderExpiredError, type RazorpaySuccess } from "./checkout";
import { allDesktopTopics } from "../lib/desktop/topics";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("catalogue", () => {
  it("the 26 chapter slugs and their subjects match the topic registry", () => {
    expect(PACK_CHAPTER_SLUGS).toHaveLength(26);
    for (const t of allDesktopTopics()) {
      expect(subjectOfChapter(t.slug), t.slug).toBe(t.subject === "Maths" ? "maths" : "science");
    }
    expect(chaptersOfSubject("maths")).toHaveLength(13);
    expect(chaptersOfSubject("science")).toHaveLength(13);
  });

  it("display prices are the contract table", () => {
    expect(PACK_PRICE_INR).toEqual({ pack_chapter: 49, pack_mock: 99, pack_subject: 199, pack_bundle: 299 });
  });

  it("packId is <sku>:<target>, the bundle is pack_bundle:all", () => {
    expect(packIdOf("pack_chapter", "triangles")).toBe("pack_chapter:triangles");
    expect(packIdOf("pack_bundle")).toBe("pack_bundle:all");
    expect(packIdOf("pack_bundle", "maths")).toBe("pack_bundle:all");
  });
});

describe("coverage (contract §3 — parity cases)", () => {
  const own = (...ids: string[]) => ids.map((packId) => ({ packId }));
  it("ownsChapter: chapter pack, its subject pack, or the bundle", () => {
    expect(ownsChapter(own(), "triangles")).toBe(false);
    expect(ownsChapter(own("pack_chapter:triangles"), "triangles")).toBe(true);
    expect(ownsChapter(own("pack_chapter:triangles"), "circles")).toBe(false);
    expect(ownsChapter(own("pack_subject:maths"), "triangles")).toBe(true);
    expect(ownsChapter(own("pack_subject:science"), "triangles")).toBe(false);
    expect(ownsChapter(own("pack_subject:science"), "electricity")).toBe(true);
    expect(ownsChapter(own("pack_bundle:all"), "electricity")).toBe(true);
    expect(ownsChapter(own("pack_mock:maths"), "triangles")).toBe(false);
    expect(ownsChapter(own("pack_bundle:all"), "not-a-chapter")).toBe(false);
  });
  it("ownsMocks: mock pack, its subject pack, or the bundle", () => {
    expect(ownsMocks(own(), "maths")).toBe(false);
    expect(ownsMocks(own("pack_mock:maths"), "maths")).toBe(true);
    expect(ownsMocks(own("pack_mock:maths"), "science")).toBe(false);
    expect(ownsMocks(own("pack_subject:science"), "science")).toBe(true);
    expect(ownsMocks(own("pack_bundle:all"), "maths")).toBe(true);
    expect(ownsMocks(own("pack_chapter:triangles"), "maths")).toBe(false);
  });
  it("already_owned only when everything the request would grant is owned", () => {
    expect(isAlreadyOwned(own("pack_chapter:triangles"), "pack_chapter", "triangles")).toBe(true);
    expect(isAlreadyOwned(own("pack_subject:maths"), "pack_chapter", "triangles")).toBe(true);
    expect(isAlreadyOwned(own("pack_subject:maths"), "pack_mock", "maths")).toBe(true);
    expect(isAlreadyOwned(own("pack_subject:maths"), "pack_subject", "maths")).toBe(true);
    expect(isAlreadyOwned(own("pack_subject:maths"), "pack_subject", "science")).toBe(false);
    expect(isAlreadyOwned(own("pack_subject:maths"), "pack_bundle")).toBe(false);
    expect(isAlreadyOwned(own("pack_subject:maths", "pack_subject:science"), "pack_bundle")).toBe(true);
    expect(isAlreadyOwned(own("pack_mock:maths"), "pack_subject", "maths")).toBe(false);
    // 13 chapter packs + the mock pack cover the subject pack
    const all = [...chaptersOfSubject("maths").map((s) => `pack_chapter:${s}`), "pack_mock:maths"];
    expect(isAlreadyOwned(own(...all), "pack_subject", "maths")).toBe(true);
    expect(isAlreadyOwned(own(...all.slice(1)), "pack_subject", "maths")).toBe(false);
    expect(isAlreadyOwned(own("pack_bundle:all"), "pack_chapter", undefined)).toBe(false);
  });
});

describe("the client flag", () => {
  it("is off unless VITE_PACKS_ENABLED is exactly 1", () => {
    expect(isPacksClientEnabled()).toBe(false);
    vi.stubEnv("VITE_PACKS_ENABLED", "true");
    expect(isPacksClientEnabled()).toBe(false);
    vi.stubEnv("VITE_PACKS_ENABLED", "1");
    expect(isPacksClientEnabled()).toBe(true);
  });
});

describe("packDescription", () => {
  it("words the Razorpay sheet", () => {
    expect(packDescription("pack_chapter", "real-numbers", "Real Numbers")).toBe("Chapter Pack · Real Numbers");
    expect(packDescription("pack_mock", "science")).toBe("Mock Pack · Science");
    expect(packDescription("pack_bundle", undefined)).toMatch(/Bundle/);
  });
});

const SUCCESS: RazorpaySuccess = { razorpay_payment_id: "pay_1", razorpay_order_id: "order_1", razorpay_signature: "sig" };

function deps(over: Partial<PackBuyDeps> & { dismiss?: boolean } = {}): PackBuyDeps & { createOrder: ReturnType<typeof vi.fn> } {
  const opened: Array<Record<string, unknown>> = [];
  class FakeRazorpay {
    o: Record<string, unknown>;
    constructor(o: Record<string, unknown>) {
      this.o = o;
      opened.push(o);
    }
    open() {
      if (over.dismiss) (this.o.modal as { ondismiss: () => void }).ondismiss();
      else (this.o.handler as (r: RazorpaySuccess) => void)(SUCCESS);
    }
  }
  const d = {
    createOrder: vi.fn(async () => ({ orderId: "order_1", keyId: "rzp_x", amountPaise: 4900 })),
    loadScript: async () => FakeRazorpay as never,
    verify: vi.fn(async () => ({ packId: "pack_chapter:triangles", sku: "pack_chapter", target: "triangles" })),
    ...over,
  };
  return Object.assign(d, { opened }) as never;
}

describe("buyPack", () => {
  it("happy path: order -> checkout (server amount, pack description) -> verify -> paid", async () => {
    const d = deps();
    const out = await buyPack("pack_chapter", "triangles", { chapterName: "Triangles", deps: d });
    expect(d.createOrder).toHaveBeenCalledWith("pack_chapter", "triangles");
    expect((d as unknown as { opened: Array<Record<string, unknown>> }).opened[0]).toMatchObject({
      amount: 4900,
      order_id: "order_1",
      description: "Chapter Pack · Triangles",
    });
    expect(out).toEqual({
      status: "paid",
      grant: { packId: "pack_chapter:triangles", sku: "pack_chapter", target: "triangles" },
      paymentId: "pay_1",
      amountInr: 49,
    });
  });

  it("the bundle sends no target", async () => {
    const d = deps();
    await buyPack("pack_bundle", undefined, { deps: d });
    expect(d.createOrder).toHaveBeenCalledWith("pack_bundle", undefined);
  });

  it("an illegal target never reaches the server", async () => {
    const d = deps();
    expect(await buyPack("pack_chapter", "nope", { deps: d })).toEqual({ status: "failed" });
    expect(await buyPack("pack_mock", "history", { deps: d })).toEqual({ status: "failed" });
    expect(d.createOrder).not.toHaveBeenCalled();
  });

  it("409 already_owned is its own outcome, nothing is opened", async () => {
    const d = deps({ createOrder: vi.fn(async () => { throw new PayAlreadyOwnedError(); }) });
    expect(await buyPack("pack_chapter", "triangles", { deps: d })).toEqual({ status: "already_owned" });
  });

  it("dismissing the sheet is not a failure", async () => {
    expect(await buyPack("pack_chapter", "triangles", { deps: deps({ dismiss: true }) })).toEqual({ status: "dismissed" });
  });

  it("a verify error after Razorpay's signed success is pending, never failed", async () => {
    const d = deps({ verify: vi.fn(async () => { throw new Error("network"); }) });
    expect(await buyPack("pack_chapter", "triangles", { deps: d })).toEqual({ status: "pending", orderId: "order_1", paymentId: "pay_1" });
  });

  it("an expired order is expired", async () => {
    const d = deps({ verify: vi.fn(async () => { throw new PayOrderExpiredError(); }) });
    expect(await buyPack("pack_chapter", "triangles", { deps: d })).toEqual({ status: "expired" });
  });

  it("an order-creation failure is failed", async () => {
    const d = deps({ createOrder: vi.fn(async () => { throw new Error("boom"); }) });
    expect(await buyPack("pack_chapter", "triangles", { deps: d })).toEqual({ status: "failed" });
  });
});

describe("checkout.ts pack variants", () => {
  it("createPackOrder posts { passType: sku, packTarget } and maps 409 already_owned; verifyPackPayment needs kind:pack", async () => {
    vi.resetModules();
    vi.doMock("./firebaseClient", () => ({ authClient: { currentUser: { getIdToken: async () => "tok" } } }));
    const checkout = await import("./checkout");
    const calls: Array<{ url: string; body: unknown }> = [];
    const responses: Array<{ status: number; json: unknown }> = [
      { status: 200, json: { ok: true, orderId: "o1", keyId: "k", amountPaise: 4900 } },
      { status: 409, json: { error: "already_owned" } },
      { status: 200, json: { ok: true, kind: "pack", packId: "pack_mock:maths", sku: "pack_mock", target: "maths" } },
      { status: 200, json: { ok: true, passEnd: "pass-end-token" } },
    ];
    vi.stubGlobal("fetch", async (url: string, init: { body: string }) => {
      calls.push({ url, body: JSON.parse(init.body) });
      const r = responses.shift()!;
      return { ok: r.status < 400, status: r.status, json: async () => r.json } as Response;
    });
    expect(await checkout.createPackOrder("pack_chapter", "triangles")).toEqual({ orderId: "o1", keyId: "k", amountPaise: 4900 });
    expect(calls[0]).toEqual({ url: "/api/pay/order", body: { passType: "pack_chapter", packTarget: "triangles" } });
    await expect(checkout.createPackOrder("pack_chapter", "triangles")).rejects.toBeInstanceOf(checkout.PayAlreadyOwnedError);
    expect(await checkout.verifyPackPayment(SUCCESS)).toEqual({ packId: "pack_mock:maths", sku: "pack_mock", target: "maths" });
    // a pass-shaped response is never a pack grant
    await expect(checkout.verifyPackPayment(SUCCESS)).rejects.toThrow();
    vi.doUnmock("./firebaseClient");
  });

  it("checkPackPayStatus: paid needs a pack grant; a pass-shaped paid is unknown", async () => {
    vi.resetModules();
    const checkout = await import("./checkout");
    checkout.resetPayStatusBudgetForTests();
    const ok = await checkout.checkPackPayStatus("o9", { post: async () => ({ ok: true, state: "paid", kind: "pack", packId: "pack_bundle:all", sku: "pack_bundle", target: "all", paymentId: "p", amountInr: 299 }) });
    expect(ok).toEqual({ state: "paid", grant: { packId: "pack_bundle:all", sku: "pack_bundle", target: "all" }, paymentId: "p", amountInr: 299 });
    const pass = await checkout.checkPackPayStatus("o10", { post: async () => ({ ok: true, state: "paid", passEnd: "pass-end-token" }) });
    expect(pass).toEqual({ state: "unknown" });
    expect(await checkout.checkPackPayStatus("o11", { post: async () => ({ ok: true, state: "pending" }) })).toEqual({ state: "pending" });
  });
});

describe("fetchMyPacks — licensee_unavailable", () => {
  it("503 { error: licensee_unavailable } is its own error; hasLicenseeEmail needs a non-empty email", async () => {
    vi.resetModules();
    vi.doMock("./firebaseClient", () => ({ authClient: { currentUser: { getIdToken: async () => "tok" } } }));
    const mod = await import("./packs");
    vi.stubGlobal("fetch", async () => ({ ok: false, status: 503, json: async () => ({ error: "licensee_unavailable" }) }) as Response);
    await expect(mod.fetchMyPacks()).rejects.toBeInstanceOf(mod.PacksLicenseeUnavailableError);
    vi.stubGlobal("fetch", async () => ({ ok: false, status: 500, json: async () => ({}) }) as Response);
    await expect(mod.fetchMyPacks()).rejects.not.toBeInstanceOf(mod.PacksLicenseeUnavailableError);
    expect(mod.hasLicenseeEmail({ name: "A", email: "a@b.in" })).toBe(true);
    expect(mod.hasLicenseeEmail({ name: "A", email: "  " })).toBe(false);
    expect(mod.hasLicenseeEmail(null)).toBe(false);
    vi.doUnmock("./firebaseClient");
  });
});

describe("fetchMyPacks", () => {
  it("reads packs and the licensee, dropping malformed rows", async () => {
    vi.resetModules();
    vi.doMock("./firebaseClient", () => ({ authClient: { currentUser: { getIdToken: async () => "tok" } } }));
    const mod = await import("./packs");
    vi.stubGlobal("fetch", async (_u: string, init: { headers: Record<string, string> }) => {
      expect(init.headers.Authorization).toBe("Bearer tok");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          packs: [{ packId: "pack_chapter:triangles", sku: "pack_chapter", target: "triangles", pricePaidInr: 49, paidAt: 5, orderId: "order_ABC" }, { nope: 1 }],
          licensee: { name: "Asha", email: "a@b.in" },
        }),
      } as Response;
    });
    const mine = await mod.fetchMyPacks();
    expect(mine.packs).toHaveLength(1);
    expect(mine.packs[0].orderId).toBe("order_ABC");
    expect(mine.licensee).toEqual({ name: "Asha", email: "a@b.in" });
    vi.doUnmock("./firebaseClient");
    void fetchMyPacks;
  });
});
