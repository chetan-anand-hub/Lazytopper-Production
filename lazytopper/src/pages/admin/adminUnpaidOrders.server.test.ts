// @vitest-environment node
//
// UNPAID-ORDERS-LIST-1 — the admin "Ordered, not paid" READ API (server/routes/adminUnpaidOrders.cjs).
//
// ★ A VITEST FILE FOR A SERVER MODULE, like adminStudents.server.test.ts: vitest auto-includes src/**, so this
// runs in CI with no package.json edit. The gate under test is the REAL one (adminTelemetry's requireFirebaseAdmin
// over a fake firebase-admin). Every clock is injected.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const requireCjs = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(HERE, "..", "..", "..", "server");
const ROUTE_FILE = path.join(SERVER_DIR, "routes", "adminUnpaidOrders.cjs");

type Data = Record<string, unknown>;
type Doc = { id: string; data: Data };
type Res = { status: number | null; body: Data | null };
type Contact = { kind: string; source: string; masked: string; full?: string };
type Item = { orderId: string; createdAtMs: number; buyerType: string; consent: boolean; contacts: Contact[]; amountInr: number | null; product: { name: string; passType: string; packTarget: string | null } };

const HOUR = 3600000;
const DAY = 24 * HOUR;
// 18:31 UTC = 00:01 IST on 23 Nov: one minute into a new IST day.
const NOW = Date.parse("2026-11-22T18:31:00Z");

const KID_PHONE = "+919876543948";
const KID_EMAIL = "anaya.k@gmail.com";
const WA_PHONE = "+917012345678";

function loadRoute() {
  // The module may not exist on trunk: the suite must FAIL there, not skip.
  expect(existsSync(ROUTE_FILE)).toBe(true);
  return requireCjs(ROUTE_FILE) as {
    createAdminUnpaidOrdersRoutes: (deps: Data) => { list: (req: Data, res: Res) => Promise<void> };
    maskPhone: (s: string) => string;
  };
}

function fakeFirestore(orders: Doc[]) {
  const writes: string[] = [];
  const thrower = (m: string) => () => {
    writes.push(m);
    throw new Error(`WRITE ATTEMPTED: ${m}`);
  };
  const ms = (v: unknown) => (v instanceof Date ? v.getTime() : typeof v === "number" ? v : NaN);
  const db = {
    writes,
    collection(name: string) {
      expect(name).toBe("payOrders");
      return {
        set: thrower("set"),
        add: thrower("add"),
        doc: () => ({ set: thrower("set"), update: thrower("update"), delete: thrower("delete") }),
        where(field: string, op: string, value: Date) {
          expect(field).toBe("createdAt");
          expect(op).toBe(">=");
          return {
            orderBy(f: string, dir: string) {
              expect(f).toBe("createdAt");
              expect(dir).toBe("desc");
              return {
                limit(n: number) {
                  return {
                    async get() {
                      const docs = orders
                        .filter((o) => ms(o.data.createdAt) >= value.getTime())
                        .sort((a, b) => ms(b.data.createdAt) - ms(a.data.createdAt))
                        .slice(0, n);
                      return { size: docs.length, forEach: (fn: (d: { id: string; data: () => Data }) => void) => docs.forEach((o) => fn({ id: o.id, data: () => o.data })) };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
    runTransaction: thrower("runTransaction"),
    batch: thrower("batch"),
  };
  return db;
}

const USERS: Record<string, { email?: string; phoneNumber?: string }> = {
  stu1: { email: "rohan.s@gmail.com", phoneNumber: "+919811122233" },
  stu2: { email: "meera.p@gmail.com" },
  payer1: { email: "parent.d@gmail.com", phoneNumber: "+919900011122" },
  adminU: { email: "owner@lazytopper.com" },
  testU: { email: "tester@x.in" },
};

function fakeAdmin(admins: string[]) {
  return {
    auth: () => ({
      verifyIdToken: async (tok: string) => {
        if (tok === "admin-token") return { uid: admins[0] };
        if (tok === "student-token") return { uid: "stu1" };
        throw new Error("bad token");
      },
      getUsers: async (ids: { uid: string }[]) => ({ users: ids.filter(({ uid }) => USERS[uid]).map(({ uid }) => ({ uid, ...USERS[uid] })) }),
      getUserByEmail: async (email: string) => {
        const hit = Object.entries(USERS).find(([, u]) => u.email === email);
        if (!hit) throw Object.assign(new Error("nf"), { code: "auth/user-not-found" });
        return { uid: hit[0] };
      },
    }),
  };
}

function world(orders: Doc[], opts: { env?: Data } = {}) {
  const env = { ADMIN_FIREBASE_UIDS: "adminU", TEST_ACCOUNT_EMAILS: "tester@x.in", ...(opts.env || {}) };
  const prevAdmins = process.env.ADMIN_FIREBASE_UIDS;
  process.env.ADMIN_FIREBASE_UIDS = env.ADMIN_FIREBASE_UIDS as string;
  const firebaseAdmin = fakeAdmin(["adminU"]);
  const { createAdminTelemetryRoutes } = requireCjs(path.join(SERVER_DIR, "routes", "adminTelemetry.cjs")) as {
    createAdminTelemetryRoutes: (d: Data) => { requireFirebaseAdmin: (req: Data) => Promise<Data> };
  };
  const gate = createAdminTelemetryRoutes({ firebaseAdmin, sendJson: () => undefined }).requireFirebaseAdmin;
  const fs = fakeFirestore(orders);
  const { createAdminUnpaidOrdersRoutes } = loadRoute();
  const route = createAdminUnpaidOrdersRoutes({
    sendJson: (res: Res, status: number, body: Data) => {
      res.status = status;
      res.body = body;
    },
    adminFirestore: fs,
    firebaseAdmin,
    requireAdmin: gate,
    now: () => NOW,
    env,
  });
  const get = async (url = "/api/admin/unpaid-orders", token: string | null = "admin-token") => {
    const res: Res = { status: null, body: null };
    await route.list({ method: "GET", url, headers: token ? { authorization: `Bearer ${token}` } : {} }, res);
    return res;
  };
  return { get, fs, restore: () => { process.env.ADMIN_FIREBASE_UIDS = prevAdmins; } };
}

const created = (id: string, ago: number, extra: Data = {}): Doc => ({
  id,
  data: { uid: "stu1", passType: "till_boards", amountPaise: 191700, status: "created", createdAt: new Date(NOW - ago), ...extra },
});
const paidOrder = (id: string, ago: number, extra: Data = {}): Doc => ({
  id,
  data: { uid: "stu1", passType: "till_boards", amountPaise: 191700, status: "paid", paymentId: `pay_${id}`, paidAt: new Date(NOW - ago), createdAt: new Date(NOW - ago - 60000), ...extra },
});
const wa = (phone = WA_PHONE) => ({ phone, consentText: "Send me updates on WhatsApp", consentVersion: "wa-optin-v1", consentAt: NOW - 3 * HOUR, source: "checkout" });

const items = (r: Res) => (r.body as { items: Item[] }).items;
const row = (r: Res, id: string) => items(r).find((i) => i.orderId === id);

let logs: string[] = [];
let restore: (() => void) | null = null;
beforeEach(() => {
  logs = [];
  for (const m of ["log", "info", "warn", "error", "debug"] as const) {
    vi.spyOn(console, m).mockImplementation((...a: unknown[]) => {
      logs.push(a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "));
    });
  }
});
afterEach(() => {
  vi.restoreAllMocks();
  if (restore) restore();
  restore = null;
});
const use = (w: ReturnType<typeof world>) => {
  restore = w.restore;
  return w;
};

describe("UNPAID-ORDERS-LIST-1 — gate and kill switch", () => {
  it("no token -> 401, a non-admin -> 403, and nothing is read", async () => {
    const w = use(world([created("o1", HOUR)]));
    const none = await w.get(undefined, null);
    expect(none.status).toBe(401);
    expect(none.body).not.toHaveProperty("items");
    const student = await w.get(undefined, "student-token");
    expect(student.status).toBe(403);
    expect(student.body).not.toHaveProperty("items");
  });

  it("admin -> 200, read-only (no write method is ever called), Cache-Control no-store via sendJsonWithHeaders", async () => {
    const w = use(world([created("o1", HOUR)]));
    const r = await w.get();
    expect(r.status).toBe(200);
    expect(items(r).map((i) => i.orderId)).toEqual(["o1"]);
    expect(w.fs.writes).toEqual([]);
    const src = readFileSync(ROUTE_FILE, "utf8");
    expect(src).toMatch(/'Cache-Control': 'no-store'/);
  });

  it("UNPAID_ORDERS_LIST_DISABLED=1 -> 404 even for an admin", async () => {
    const w = use(world([created("o1", HOUR)], { env: { UNPAID_ORDERS_LIST_DISABLED: "1" } }));
    const r = await w.get();
    expect(r.status).toBe(404);
    expect(r.body).not.toHaveProperty("items");
  });

  it("index.cjs mounts the route once, GET only, with THE shared admin gate", () => {
    const index = readFileSync(path.join(SERVER_DIR, "index.cjs"), "utf8");
    const lines = index.split("\n").filter((l) => l.includes("adminUnpaidOrders.cjs"));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/req\.method === 'GET' && reqPath === '\/api\/admin\/unpaid-orders'/);
    expect(lines[0]).toMatch(/requireAdmin: adminTelemetryRoutes\.requireFirebaseAdmin/);
  });
});

describe("UNPAID-ORDERS-LIST-1 — contact masking vs consent", () => {
  const orders = (): Doc[] => [
    created("noConsent", HOUR),
    created("withConsent", 2 * HOUR, { uid: "stu2", waOptIn: wa() }),
    created("guest", 3 * HOUR, { uid: null, payer: "guest", guestPhone: KID_PHONE }),
    created("guestWa", 4 * HOUR, { uid: null, payer: "guest", guestPhone: KID_PHONE, waOptIn: wa(KID_PHONE) }),
    created("who", 5 * HOUR, { uid: null, payer: "guest", checkoutWho: true, payerType: "signed_out", guestPhone: KID_PHONE, guestEmail: KID_EMAIL }),
    created("whoPayer", 6 * HOUR, { uid: null, payer: "guest", checkoutWho: true, payerType: "signed_in_other", payerUid: "payer1", guestEmail: KID_EMAIL }),
    created("parent", 7 * HOUR, { uid: "stu2", payer: "parent", parentLinkId: "l1" }),
    created("badConsent", 8 * HOUR, { uid: "stu2", waOptIn: { phone: WA_PHONE } }),
  ];

  it("no consent: every contact is masked and no full value is in the response at all", async () => {
    const w = use(world(orders()));
    const r = await w.get();
    const it = row(r, "noConsent")!;
    expect(it.consent).toBe(false);
    expect(it.buyerType).toBe("signed_in");
    expect(it.contacts.map((c) => c.masked)).toEqual(["ro••••@gmail.com", "+91 98•••••233"]);
    expect(it.contacts.every((c) => c.full === undefined)).toBe(true);
    // Every row WITHOUT consent, serialised: no raw value anywhere (guestWa legitimately carries KID_PHONE with consent).
    const body = JSON.stringify(items(r).filter((i) => !i.consent));
    expect(items(r).filter((i) => !i.consent).length).toBe(6);
    for (const raw of ["rohan.s@gmail.com", "+919811122233", KID_PHONE, KID_EMAIL, "parent.d@gmail.com", "+919900011122", "9876543948"]) {
      expect(body).not.toContain(raw);
    }
  });

  it("consent ticked on the order: the payer's contacts come in full, with the WhatsApp number", async () => {
    const w = use(world(orders()));
    const it = row(await w.get(), "withConsent")!;
    expect(it.consent).toBe(true);
    expect(it.contacts).toEqual([
      { kind: "email", source: "account", masked: "me••••@gmail.com", full: "meera.p@gmail.com" },
      { kind: "phone", source: "whatsapp", masked: "+91 70•••••678", full: WA_PHONE },
    ]);
  });

  it("guest phone order: masked without consent, full with it (one row for the same number)", async () => {
    const w = use(world(orders()));
    const r = await w.get();
    expect(row(r, "guest")!.contacts).toEqual([{ kind: "phone", source: "checkout", masked: "+91 98•••••948" }]);
    expect(row(r, "guest")!.buyerType).toBe("guest");
    expect(row(r, "guestWa")!.contacts).toEqual([{ kind: "phone", source: "whatsapp", masked: "+91 98•••••948", full: KID_PHONE }]);
  });

  it("for someone: the RECIPIENT's phone / email is never returned; a signed-in payer's account is, masked", async () => {
    const w = use(world(orders()));
    const r = await w.get();
    expect(row(r, "who")!.buyerType).toBe("for_someone");
    expect(row(r, "who")!.contacts).toEqual([]);
    expect(row(r, "whoPayer")!.contacts.map((c) => c.masked)).toEqual(["pa••••@gmail.com", "+91 99•••••122"]);
    const body = JSON.stringify(r.body);
    expect(body).not.toContain("an••••@gmail.com");
  });

  it("parent link: no contact stored, buyer type parent; a waOptIn without a consent record is NOT consent", async () => {
    const w = use(world(orders()));
    const r = await w.get();
    expect(row(r, "parent")!.buyerType).toBe("parent");
    expect(row(r, "parent")!.contacts).toEqual([]);
    expect(row(r, "badConsent")!.consent).toBe(false);
    expect(row(r, "badConsent")!.contacts.every((c) => c.full === undefined)).toBe(true);
  });
});

describe("UNPAID-ORDERS-LIST-1 — what is left out", () => {
  it("paid later by the same buyer for the same product is hidden and counted; a different product or buyer stays", async () => {
    const w = use(
      world([
        created("bp", 5 * HOUR),
        paidOrder("bpPaid", 2 * HOUR),
        created("packA", 4 * HOUR, { passType: "pack_mock", packTarget: "maths", amountPaise: 11700 }),
        paidOrder("packB", HOUR, { passType: "pack_mock", packTarget: "science" }),
        created("other", 6 * HOUR, { uid: "stu2" }),
        created("guestBp", 7 * HOUR, { uid: null, payer: "guest", guestPhone: KID_PHONE }),
        { id: "guestPaid", data: { uid: null, payer: "guest", guestPhone: KID_PHONE, passType: "till_boards", amountPaise: 191700, status: "paid_unclaimed", paymentId: "pay_g", guestPaidAt: new Date(NOW - HOUR), createdAt: new Date(NOW - 90 * 60000) } },
        created("paidBefore", HOUR, { uid: "stu2", passType: "pack_cbq", packTarget: "science" }),
        paidOrder("earlier", 3 * HOUR, { uid: "stu2", passType: "pack_cbq", packTarget: "science" }),
      ]),
    );
    const r = await w.get();
    expect(items(r).map((i) => i.orderId).sort()).toEqual(["other", "packA", "paidBefore"].sort());
    expect((r.body as { hiddenPaidLater: number }).hiddenPaidLater).toBe(2);
  });

  it("admin and TEST_ACCOUNT_EMAILS orders (uid, payerUid, guest email) are excluded; so are top-ups and erased accounts", async () => {
    const w = use(
      world([
        created("real", HOUR),
        created("adminOwn", HOUR, { uid: "adminU" }),
        created("testOwn", HOUR, { uid: "testU" }),
        created("adminPayer", HOUR, { uid: null, payer: "guest", checkoutWho: true, payerUid: "adminU", guestEmail: KID_EMAIL }),
        created("testGuest", HOUR, { uid: null, payer: "guest", checkoutWho: true, guestEmail: "Tester@X.in" }),
        created("topup", HOUR, { passType: "topup_49" }),
        created("erased", HOUR, { uid: "erased" }),
      ]),
    );
    const r = await w.get();
    expect(items(r).map((i) => i.orderId)).toEqual(["real"]);
    expect((r.body as { excludedAdminTest: number }).excludedAdminTest).toBe(4);
  });
});

describe("UNPAID-ORDERS-LIST-1 — the 24 h window (IST display) and the 7-day toggle", () => {
  it("rolling 24 h: 23h59m in, 24h01m out — across the IST midnight (NOW is 00:01 IST)", async () => {
    const w = use(
      world([
        created("justIn", DAY - 60000),
        created("justOut", DAY + 60000),
        created("yesterdayIst", 2 * HOUR), // 22:01 IST the previous IST day — still inside the last 24 h
        created("threeDays", 3 * DAY),
        created("eightDays", 8 * DAY),
      ]),
    );
    const day = await w.get();
    expect(items(day).map((i) => i.orderId)).toEqual(["yesterdayIst", "justIn"]);
    expect((day.body as { days: number }).days).toBe(1);
    const week = await w.get("/api/admin/unpaid-orders?days=7");
    expect(items(week).map((i) => i.orderId)).toEqual(["yesterdayIst", "justIn", "justOut", "threeDays"]);
    const odd = await w.get("/api/admin/unpaid-orders?days=30");
    expect((odd.body as { days: number }).days).toBe(1);
  });

  it("newest first, with product name, sku/target and the amount charged (incl. GST) in rupees", async () => {
    const w = use(world([created("older", 3 * HOUR, { passType: "pack_mock", packTarget: "maths", amountPaise: 11700 }), created("newer", HOUR)]));
    const r = await w.get();
    expect(items(r).map((i) => i.orderId)).toEqual(["newer", "older"]);
    expect(row(r, "older")!.product).toEqual({ name: "Maths Mock Pack", passType: "pack_mock", packTarget: "maths" });
    expect(row(r, "older")!.amountInr).toBe(117);
    expect(row(r, "newer")!.product.name).toBe("Board Pass");
  });
});

describe("UNPAID-ORDERS-LIST-1 — no PII in logs", () => {
  it("failed reads and lookups log codes only: no phone, email or uid", async () => {
    const orders = [
      created("o1", HOUR, { uid: null, payer: "guest", guestPhone: KID_PHONE, guestEmail: KID_EMAIL, waOptIn: wa() }),
      created("o2", HOUR, { uid: "stu1" }),
    ];
    // 1) profile lookup throws with PII in the message
    const w = use(world(orders));
    const fa = fakeAdmin(["adminU"]);
    const { createAdminUnpaidOrdersRoutes } = loadRoute();
    const leakyAuth = {
      auth: () => ({
        ...fa.auth(),
        getUsers: async () => {
          throw Object.assign(new Error(`lookup failed for stu1 rohan.s@gmail.com ${KID_PHONE}`), { code: "auth/internal-error" });
        },
        getUserByEmail: async () => {
          throw Object.assign(new Error("tester@x.in broke"), { code: "auth/internal-error" });
        },
      }),
    };
    const route = createAdminUnpaidOrdersRoutes({
      sendJson: (res: Res, s: number, b: Data) => { res.status = s; res.body = b; },
      adminFirestore: w.fs,
      firebaseAdmin: leakyAuth,
      requireAdmin: async () => ({ ok: true, uid: "adminU" }),
      now: () => NOW,
      env: { ADMIN_FIREBASE_UIDS: "adminU", TEST_ACCOUNT_EMAILS: "tester@x.in" },
    });
    const res: Res = { status: null, body: null };
    await route.list({ method: "GET", url: "/api/admin/unpaid-orders", headers: {} }, res);
    expect(res.status).toBe(200);
    // 2) the Firestore read itself throws with PII in the message
    const broken = createAdminUnpaidOrdersRoutes({
      sendJson: (r2: Res, s: number, b: Data) => { r2.status = s; r2.body = b; },
      adminFirestore: { collection: () => { throw Object.assign(new Error(`boom ${KID_EMAIL} ${KID_PHONE}`), { code: 14 }); } },
      firebaseAdmin: leakyAuth,
      requireAdmin: async () => ({ ok: true, uid: "adminU" }),
      now: () => NOW,
      env: {},
    });
    const res2: Res = { status: null, body: null };
    await broken.list({ method: "GET", url: "/api/admin/unpaid-orders", headers: {} }, res2);
    expect(res2.status).toBe(500);
    expect(JSON.stringify(res2.body)).not.toContain(KID_EMAIL);

    expect(logs.length).toBeGreaterThan(0);
    const all = logs.join("\n");
    for (const pii of [KID_PHONE, KID_EMAIL, WA_PHONE, "rohan.s@gmail.com", "tester@x.in", "stu1", "9876543948", "7012345678"]) {
      expect(all).not.toContain(pii);
    }
  });

  it("the module source has no console.log and logs no order / contact field", () => {
    expect(existsSync(ROUTE_FILE)).toBe(true);
    const src = readFileSync(ROUTE_FILE, "utf8");
    expect(src).not.toMatch(/console\.log/);
    for (const line of src.split("\n").filter((l) => /console\.(error|warn|info)/.test(l))) {
      expect(line).not.toMatch(/guestPhone|guestEmail|waOptIn|\.email|\.phone|uid|e\.message|e && e\.message/);
    }
  });

  it("maskPhone: Indian mobile as +91 98•••••948, anything else keeps two digits", () => {
    const { maskPhone } = loadRoute();
    expect(maskPhone(KID_PHONE)).toBe("+91 98•••••948");
    expect(maskPhone("+447700900123")).toBe("•••••23");
    expect(maskPhone("")).toBe("");
  });
});
