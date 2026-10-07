// @vitest-environment node
//
// STUDENT-ACTIVITY-1 PR-2 — the admin "Students" READ API (server/routes/adminStudents.cjs).
//
// ★ WHY A VITEST FILE FOR A SERVER MODULE. vitest auto-includes src/**, so this suite runs
// in CI (both plain and at both LT_TEST_CLOCK instants) without a lazytopper/package.json
// edit (controller decision D2: the safest wiring). It requires the .cjs exactly as
// src/services/activityClient.test.ts requires studentActivity.cjs.
//
// ★ THE GATE UNDER TEST IS THE REAL ONE. `requireAdmin` is built from
// adminTelemetry.cjs's `createAdminTelemetryRoutes(...).requireFirebaseAdmin` — the same
// function index.cjs hands the route — over a fake firebase-admin. Nothing about the
// allowlist is re-implemented here.
//
// ★ EVERY CLOCK IS INJECTED. Each suite runs at two pinned instants (a plain afternoon and
// one minute before IST midnight), and every fixture is derived from that instant, so the
// results are identical at the real clock and at both CI LT_TEST_CLOCK instants.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const requireCjs = createRequire(import.meta.url);
const mod = requireCjs("../../../server/routes/adminStudents.cjs") as {
  createAdminStudentsRoutes: (deps: Record<string, unknown>) => {
    handle: (req: FakeReq, res: FakeRes) => Promise<void>;
  };
  DATA_SOURCES: Record<string, { since: string }>;
  PAGE_SIZE: number;
  istDayStartMs: (key: string) => number;
  addIstDays: (key: string, n: number) => string;
};
const { createAdminTelemetryRoutes } = requireCjs("../../../server/routes/adminTelemetry.cjs") as {
  createAdminTelemetryRoutes: (deps: Record<string, unknown>) => {
    requireFirebaseAdmin: (req: FakeReq) => Promise<{ ok: boolean; status?: number; error?: string; uid?: string }>;
  };
};
const { istDayKey } = requireCjs("../../../server/services/rateLimiter.cjs") as {
  istDayKey: (ms: number) => string;
};

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(HERE, "..", "..", "..", "server");
const DAY = 24 * 60 * 60 * 1000;

/* ── Fakes ──────────────────────────────────────────────────────────────── */

type Data = Record<string, unknown>;
type FakeReq = { method: string; url: string; headers: Record<string, string> };
type FakeRes = { status: number | null; headers: Record<string, string>; body: string; writeHead: (s: number, h?: Record<string, string>) => void; end: (b?: string) => void };

const WRITE_METHODS_FS = ["set", "update", "delete", "create", "add", "batch", "runTransaction", "bulkWriter", "recursiveDelete"];
const WRITE_METHODS_AUTH = ["createUser", "updateUser", "deleteUser", "deleteUsers", "setCustomUserClaims", "revokeRefreshTokens", "importUsers", "generatePasswordResetLink", "generateEmailVerificationLink"];

/** The Firestore methods the module is ALLOWED to call — the read surface. */
const FS_READ_METHODS = new Set(["collection", "doc", "where", "orderBy", "limit", "select", "get", "getAll", "count", "count.get"]);
const AUTH_READ_METHODS = new Set(["listUsers", "getUser", "verifyIdToken"]);

function getPath(obj: Data, field: string): unknown {
  if (field === "__name__") return undefined;
  let cur: unknown = obj;
  for (const part of field.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Data)[part];
  }
  return cur;
}

function makeFirestore(store: Record<string, Data>) {
  const calls: string[] = [];
  const writes: string[] = [];
  const thrower = (name: string) => () => {
    writes.push(name);
    throw new Error(`WRITE ATTEMPTED: ${name}`);
  };
  const addWriteThrowers = (target: Data) => {
    for (const m of WRITE_METHODS_FS) target[m] = thrower(m);
    return target;
  };

  type Filter = { field: string; op: string; value: unknown };
  function query(collPath: string, filters: Filter[] = [], order: { field: string; dir: string }[] = [], lim: number | null = null): Data {
    const run = () => {
      const prefix = `${collPath}/`;
      let docs = Object.keys(store)
        .filter((p) => p.startsWith(prefix) && !p.slice(prefix.length).includes("/"))
        .map((p) => ({ id: p.slice(prefix.length), data: store[p] }));
      for (const f of filters) {
        docs = docs.filter((d) => {
          const v = f.field === "__name__" ? d.id : getPath(d.data, f.field);
          switch (f.op) {
            case "==": return v === f.value;
            case ">": return typeof v === typeof f.value && (v as number) > (f.value as number);
            case ">=": return typeof v === typeof f.value && (v as number) >= (f.value as number);
            case "<": return typeof v === typeof f.value && (v as number) < (f.value as number);
            case "<=": return typeof v === typeof f.value && (v as number) <= (f.value as number);
            case "in": return Array.isArray(f.value) && (f.value as unknown[]).includes(v);
            default: throw new Error(`unsupported op ${f.op}`);
          }
        });
      }
      for (const o of [...order].reverse()) {
        // Firestore omits documents that lack an orderBy field.
        if (o.field !== "__name__") docs = docs.filter((d) => getPath(d.data, o.field) !== undefined);
        docs.sort((a, b) => {
          const av = (o.field === "__name__" ? a.id : getPath(a.data, o.field)) as number | string;
          const bv = (o.field === "__name__" ? b.id : getPath(b.data, o.field)) as number | string;
          const c = av < bv ? -1 : av > bv ? 1 : 0;
          return o.dir === "desc" ? -c : c;
        });
      }
      if (lim !== null) docs = docs.slice(0, lim);
      return docs;
    };
    return addWriteThrowers({
      where: (field: string, op: string, value: unknown) => {
        calls.push("where");
        return query(collPath, [...filters, { field, op, value }], order, lim);
      },
      orderBy: (field: string, dir = "asc") => {
        calls.push("orderBy");
        return query(collPath, filters, [...order, { field, dir }], lim);
      },
      limit: (n: number) => {
        calls.push("limit");
        return query(collPath, filters, order, n);
      },
      // ★ A NO-OP on purpose: the real select() projects, but the module must not RELY on
      // it — its own field-by-field copy is what keeps text out of a response, and the
      // poisoned fixtures below prove that copy without select's help.
      select: () => {
        calls.push("select");
        return query(collPath, filters, order, lim);
      },
      count: () => {
        calls.push("count");
        return addWriteThrowers({
          get: async () => {
            calls.push("count.get");
            return { data: () => ({ count: run().length }) };
          },
        });
      },
      get: async () => {
        calls.push("get");
        const docs = run().map((d) => ({ id: d.id, exists: true, data: () => JSON.parse(JSON.stringify(d.data)) }));
        return { docs, size: docs.length, empty: docs.length === 0 };
      },
      doc: (id: string) => {
        calls.push("doc");
        return docRef(`${collPath}/${id}`);
      },
    });
  }
  function docRef(p: string): Data {
    const id = p.split("/").pop();
    return addWriteThrowers({
      _path: p,
      id,
      get: async () => {
        calls.push("get");
        const exists = Object.prototype.hasOwnProperty.call(store, p);
        return { id, exists, data: () => (exists ? JSON.parse(JSON.stringify(store[p])) : undefined) };
      },
      collection: (name: string) => {
        calls.push("collection");
        return query(`${p}/${name}`);
      },
    });
  }
  const db = addWriteThrowers({
    collection: (name: string) => {
      calls.push("collection");
      return query(name);
    },
    getAll: async (...refs: Data[]) => {
      calls.push("getAll");
      return Promise.all(refs.map((r) => (r.get as () => Promise<unknown>)()));
    },
  });
  return { db, calls, writes };
}

type FakeUser = { uid: string; email?: string; phoneNumber?: string; providerData: { providerId: string }[]; metadata: { creationTime: string; lastSignInTime?: string } };

function makeAdmin(users: FakeUser[], tokens: Record<string, string>) {
  const calls: string[] = [];
  const writes: string[] = [];
  const auth: Data = {
    verifyIdToken: async (token: string) => {
      calls.push("verifyIdToken");
      if (!Object.prototype.hasOwnProperty.call(tokens, token)) throw new Error("auth/argument-error");
      return { uid: tokens[token] };
    },
    listUsers: async (max: number, pageToken?: string) => {
      calls.push("listUsers");
      const start = pageToken ? Number(pageToken) : 0;
      const slice = users.slice(start, start + max);
      const next = start + max < users.length ? String(start + max) : undefined;
      return { users: slice, pageToken: next };
    },
    getUser: async (uid: string) => {
      calls.push("getUser");
      const u = users.find((x) => x.uid === uid);
      if (!u) {
        const err = new Error("no user") as Error & { code: string };
        err.code = "auth/user-not-found";
        throw err;
      }
      return u;
    },
  };
  for (const m of WRITE_METHODS_AUTH) {
    auth[m] = () => {
      writes.push(m);
      throw new Error(`AUTH WRITE ATTEMPTED: ${m}`);
    };
  }
  const admin = {
    auth: () => auth,
    firestore: { FieldPath: { documentId: () => "__name__" } },
  };
  return { admin, calls, writes };
}

function makeRes(): FakeRes {
  const res: FakeRes = {
    status: null,
    headers: {},
    body: "",
    writeHead(s, h) {
      res.status = s;
      res.headers = { ...(h || {}) };
    },
    end(b) {
      res.body = b || "";
    },
  };
  return res;
}

function sendJsonWithHeaders(res: FakeRes, status: number, body: unknown, extra?: Record<string, string>) {
  res.writeHead(status, { "Content-Type": "application/json", ...(extra || {}) });
  res.end(JSON.stringify(body));
}
function sendJson(res: FakeRes, status: number, body: unknown) {
  sendJsonWithHeaders(res, status, body);
}

const ADMIN_UID = "adminUid0001";
const STUDENT_TOKEN_UID = "studentUid01";

type World = {
  users: FakeUser[];
  store: Record<string, Data>;
  now: number;
};

function buildRoutes(world: World, opts: { gate?: "real" | "none" } = {}) {
  const fs = makeFirestore(world.store);
  const fa = makeAdmin(world.users, { "admin-token": ADMIN_UID, "student-token": STUDENT_TOKEN_UID });
  const telemetry = createAdminTelemetryRoutes({ sendJson, firebaseAdmin: fa.admin, telemetry: { snapshot: () => ({}) }, getTokenTelemetry: () => [] });
  const routes = mod.createAdminStudentsRoutes({
    sendJson,
    sendJsonWithHeaders,
    firebaseAdmin: fa.admin,
    adminFirestore: fs.db,
    requireAdmin: opts.gate === "none" ? undefined : telemetry.requireFirebaseAdmin,
    now: () => world.now,
  });
  async function get(url: string, token?: string) {
    const res = makeRes();
    const req: FakeReq = { method: "GET", url, headers: token ? { authorization: `Bearer ${token}` } : {} };
    await routes.handle(req, res);
    return { status: res.status, body: JSON.parse(res.body || "{}"), raw: res.body, headers: res.headers };
  }
  return { get, fs, fa };
}

function user(uid: string, createdMs: number, extra: Partial<FakeUser> = {}): FakeUser {
  return {
    uid,
    email: `${uid.toLowerCase()}@example.com`,
    providerData: [{ providerId: "password" }],
    metadata: { creationTime: new Date(createdMs).toUTCString(), lastSignInTime: new Date(createdMs + 60_000).toUTCString() },
    ...extra,
  };
}

/** Firestore-Timestamp-shaped value (entitlement.toMillis reads `.seconds`). */
function ts(ms: number) {
  return { seconds: Math.floor(ms / 1000), nanoseconds: 0 };
}

let savedEnv: string | undefined;
beforeEach(() => {
  savedEnv = process.env.ADMIN_FIREBASE_UIDS;
  process.env.ADMIN_FIREBASE_UIDS = ADMIN_UID;
});
afterEach(() => {
  if (savedEnv === undefined) delete process.env.ADMIN_FIREBASE_UIDS;
  else process.env.ADMIN_FIREBASE_UIDS = savedEnv;
});

const ENDPOINTS = ["/api/admin/students", "/api/admin/students/summary", `/api/admin/students/${STUDENT_TOKEN_UID}`];

/** Two pinned instants: an IST afternoon, and one minute before IST midnight. */
const INSTANTS = [Date.parse("2026-11-20T09:30:00.000Z"), Date.parse("2026-12-14T18:29:00.000Z")];

describe.each(INSTANTS)("adminStudents @ now=%s", (NOW) => {
  function smallWorld(): World {
    return {
      now: NOW,
      users: [user(STUDENT_TOKEN_UID, NOW - 3 * DAY), user("otherUid0002", NOW - 40 * DAY)],
      store: {},
    };
  }

  /* ── S1: access ─────────────────────────────────────────────────────── */

  describe("S1 access — the shared ADMIN_FIREBASE_UIDS gate on EVERY endpoint", () => {
    for (const ep of ENDPOINTS) {
      it(`${ep}: 503 when ADMIN_FIREBASE_UIDS is unset (even with an admin token), and reads nothing`, async () => {
        delete process.env.ADMIN_FIREBASE_UIDS;
        const w = buildRoutes(smallWorld());
        const r = await w.get(ep, "admin-token");
        expect(r.status).toBe(503);
        expect(Object.keys(r.body).sort()).toEqual(["error", "ok"]);
        expect(w.fs.calls).toEqual([]);
        expect(w.fa.calls).toEqual([]);
      });

      it(`${ep}: 401 with no token, and reads nothing`, async () => {
        const w = buildRoutes(smallWorld());
        const r = await w.get(ep);
        expect(r.status).toBe(401);
        expect(Object.keys(r.body).sort()).toEqual(["error", "ok"]);
        expect(w.fs.calls).toEqual([]);
        expect(w.fa.calls).toEqual([]);
      });

      it(`${ep}: 401 with an invalid token, and reads nothing`, async () => {
        const w = buildRoutes(smallWorld());
        const r = await w.get(ep, "forged-token");
        expect(r.status).toBe(401);
        expect(w.fs.calls).toEqual([]);
        expect(w.fa.calls).toEqual(["verifyIdToken"]);
      });

      it(`${ep}: 403 for a signed-in NON-admin — no student data in the body, nothing read`, async () => {
        const w = buildRoutes(smallWorld());
        const r = await w.get(ep, "student-token");
        expect(r.status).toBe(403);
        expect(r.body).toEqual({ ok: false, error: "Forbidden: not an admin uid" });
        expect(r.raw).not.toMatch(/example\.com|otherUid0002/);
        expect(w.fs.calls).toEqual([]);
        expect(w.fa.calls).toEqual(["verifyIdToken"]);
      });

      it(`${ep}: 200 for the allowlisted admin uid (CONTROL — the same world serves data)`, async () => {
        const w = buildRoutes(smallWorld());
        const r = await w.get(ep, "admin-token");
        expect(r.status).toBe(200);
        expect(r.body.ok).toBe(true);
        expect(r.headers["Cache-Control"]).toBe("no-store");
      });

      it(`${ep}: 503 (fail CLOSED) when mounted without a gate`, async () => {
        const w = buildRoutes(smallWorld(), { gate: "none" });
        const r = await w.get(ep, "admin-token");
        expect(r.status).toBe(503);
        expect(w.fs.calls).toEqual([]);
      });
    }

    it("index.cjs mounts the route with THE shared gate (adminTelemetry's requireFirebaseAdmin), GET only", () => {
      const index = readFileSync(path.join(SERVER_DIR, "index.cjs"), "utf8");
      const lines = index.split("\n").filter((l) => l.includes("adminStudents.cjs"));
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatch(/req\.method === 'GET'/);
      expect(lines[0]).toMatch(/requireAdmin: adminTelemetryRoutes\.requireFirebaseAdmin/);
    });
  });

  /* ── S2: list ───────────────────────────────────────────────────────── */

  describe("S2 list — ordering, paging, filters, plan, honest coverage", () => {
    function listWorld(): World {
      const users: FakeUser[] = [];
      // 60 students, one every 6 hours back from NOW: 0.25-day spacing.
      for (let i = 0; i < 60; i++) users.push(user(`stu${String(i).padStart(3, "0")}`, NOW - (i + 1) * 6 * 60 * 60 * 1000));
      // Shuffle so ordering can only come from the module, not the fixture.
      users.reverse();
      users.push(user("veteran0001", Date.parse("2026-06-01T05:00:00Z"), { providerData: [{ providerId: "google.com" }] }));
      const store: Record<string, Data> = {
        // stu000: trial started 2 days ago (server-pinned) -> trial, 5 days left
        "subscriptions/stu000": { tier: "trial", plan: "trial_7day", trialStartDate: ts(NOW - 2 * DAY) },
        // stu001: premium pass until NOW + 30 d
        "subscriptions/stu001": { tier: "premium", plan: "pass_month", passEnd: ts(NOW + 30 * DAY) },
        // stu002: expired trial -> basic
        "subscriptions/stu002": { tier: "trial", plan: "trial_7day", trialStartDate: ts(NOW - 9 * DAY) },
        // stu000 activity: two days, last seen 1 h ago
        [`activityLog/stu000/activityDays/${istDayKey(NOW - DAY)}`]: { firstSeenMs: NOW - DAY, lastSeenMs: NOW - DAY + 1000, sections: { home: 1 }, events: {} },
        [`activityLog/stu000/activityDays/${istDayKey(NOW - 3600_000)}`]: { firstSeenMs: NOW - 3600_000, lastSeenMs: NOW - 3500_000, sections: { practice: 2 }, events: { check_graded: 1 } },
        "sessionRecords/stu000/records/CI-1": { surface: "check-improve", gradedAt: NOW - 3600_000 },
        "sessionRecords/stu000/records/CT-1": { surface: "chapter-test", gradedAt: NOW - 3600_000 },
        "sessionRecords/stu000/records/FM-1": { surface: "full-mock", gradedAt: NOW - 3600_000 },
        "sessionRecords/stu000/records/WS-1": { surface: "worksheet", gradedAt: NOW - 3600_000 },
      };
      return { now: NOW, users, store };
    }

    it("newest sign-ups first, 50 per page, page 2 holds the rest", async () => {
      const w = buildRoutes(listWorld());
      const p1 = await w.get("/api/admin/students", "admin-token");
      expect(p1.status).toBe(200);
      expect(p1.body.total).toBe(61);
      expect(p1.body.totalPages).toBe(2);
      expect(p1.body.rows).toHaveLength(mod.PAGE_SIZE);
      const ms = p1.body.rows.map((r: { createdMs: number }) => r.createdMs);
      expect([...ms].sort((a, b) => b - a)).toEqual(ms);
      expect(p1.body.rows[0].uid).toBe("stu000");
      const p2 = await w.get("/api/admin/students?page=2", "admin-token");
      expect(p2.body.rows).toHaveLength(11);
      expect(p2.body.rows[10].uid).toBe("veteran0001");
    });

    it("period filters are rolling 1 / 7 / 30-day windows on the Auth creation time", async () => {
      const w = buildRoutes(listWorld());
      // users at 6h, 12h, 18h, 24h ago are inside the last 24 h (4); 7 d = 28; 30 d = 60.
      expect((await w.get("/api/admin/students?period=1", "admin-token")).body.total).toBe(4);
      expect((await w.get("/api/admin/students?period=7", "admin-token")).body.total).toBe(28);
      expect((await w.get("/api/admin/students?period=30", "admin-token")).body.total).toBe(60);
      expect((await w.get("/api/admin/students?period=all", "admin-token")).body.total).toBe(61);
    });

    it("plan comes from entitlement.cjs deriveEffectiveTier, and the plan filter uses it", async () => {
      const w = buildRoutes(listWorld());
      const all = await w.get("/api/admin/students", "admin-token");
      const byUid = Object.fromEntries(all.body.rows.map((r: { uid: string }) => [r.uid, r]));
      expect(byUid.stu000.plan).toMatchObject({ kind: "trial", daysLeft: 5 });
      expect(byUid.stu001.plan).toEqual({ kind: "premium", premiumUntilMs: Math.floor((NOW + 30 * DAY) / 1000) * 1000 });
      expect(byUid.stu002.plan).toEqual({ kind: "basic" }); // expired trial is Basic, never "trial"
      expect(byUid.stu003.plan).toEqual({ kind: "basic" }); // no document
      const trial = await w.get("/api/admin/students?plan=trial", "admin-token");
      expect(trial.body.rows.map((r: { uid: string }) => r.uid)).toEqual(["stu000"]);
      const premium = await w.get("/api/admin/students?plan=premium", "admin-token");
      expect(premium.body.rows.map((r: { uid: string }) => r.uid)).toEqual(["stu001"]);
      const basic = await w.get("/api/admin/students?plan=basic&period=1", "admin-token");
      expect(basic.body.rows.map((r: { uid: string }) => r.uid)).toEqual(["stu002", "stu003"]);
    });

    it("rejects an unknown period / plan / page with 400", async () => {
      const w = buildRoutes(listWorld());
      expect((await w.get("/api/admin/students?period=365", "admin-token")).status).toBe(400);
      expect((await w.get("/api/admin/students?plan=gold", "admin-token")).status).toBe(400);
      expect((await w.get("/api/admin/students?page=0", "admin-token")).status).toBe(400);
    });

    it("per-row numbers: days active + last active (activityLog), answer checks + tests (sessionRecords)", async () => {
      const w = buildRoutes(listWorld());
      const r = await w.get("/api/admin/students", "admin-token");
      const row = r.body.rows.find((x: { uid: string }) => x.uid === "stu000");
      const sameDay = istDayKey(NOW - DAY) === istDayKey(NOW - 3600_000);
      expect(row.activity).toEqual({ source: "activityLog", coverage: "full", daysActive: sameDay ? 1 : 2, lastActiveMs: NOW - 3500_000 });
      expect(row.answerChecks).toEqual({ source: "sessionRecords", coverage: "full", count: 1 });
      expect(row.testsTaken).toEqual({ source: "sessionRecords", coverage: "full", count: 2 }); // chapter-test + full-mock, not worksheet
      expect(row.signInMethods).toEqual(["email"]);
      expect(row.email).toBe("stu000@example.com");
    });

    it("★ HONEST DATA: a student who signed up before activityLog existed is 'partial', never a bare 0", async () => {
      const w = buildRoutes(listWorld());
      const r = await w.get("/api/admin/students?page=2", "admin-token");
      const vet = r.body.rows.find((x: { uid: string }) => x.uid === "veteran0001");
      expect(vet.activity.coverage).toBe("partial");
      expect(vet.answerChecks.coverage).toBe("partial"); // sessionRecords began 2026-07-06; signed up 2026-06-01
      expect(vet.signInMethods).toEqual(["google"]);
      expect(r.body.sources.activityLog.since).toBe("2026-10-02");
    });
  });

  /* ── S2: summary cards ──────────────────────────────────────────────── */

  describe("S2 summary — sign-ups, trial starts, active, day 2, within 7 days (coverage-gated)", () => {
    function summaryWorld(): World {
      const today = istDayKey(NOW);
      const signupKey = mod.addIstDays(today, -10);
      const at = (key: string, h: number) => mod.istDayStartMs(key) + h * 3600_000;
      const users = [
        user("ret0000001", at(signupKey, 10)), // returns day 2 and checks
        user("ret0000002", at(signupKey, 11)), // returns on day 5 only
        user("ret0000003", at(signupKey, 12)), // never returns
        user("new0000001", NOW - 3600_000), //   signed up an hour ago: day 2 not yet measurable
        user("old0000001", Date.parse("2026-09-01T06:00:00Z")), // before activityLog coverage
      ];
      const day = (uid: string, key: string, events: Data = {}) => ({
        [`activityLog/${uid}/activityDays/${key}`]: { firstSeenMs: at(key, 9), lastSeenMs: at(key, 10), sections: { home: 1 }, events },
      });
      const store: Record<string, Data> = {
        ...day("ret0000001", mod.addIstDays(signupKey, 1), { check_graded: 2 }),
        ...day("ret0000002", mod.addIstDays(signupKey, 5)),
        ...day("ret0000003", signupKey), // sign-up day itself is NOT a return
        ...day("old0000001", mod.addIstDays(today, -1), { check_graded: 1 }),
        "subscriptions/ret0000001": { tier: "free", plan: "trial_7day", trialStartDate: ts(at(signupKey, 10)) },
        "subscriptions/new0000001": { tier: "trial", plan: "trial_7day", trialStartDate: ts(NOW - 3500_000) },
      };
      return { now: NOW, users, store };
    }

    it("computes every card with its eligible count; pre-coverage students are excluded, not counted as 'did not return'", async () => {
      const w = buildRoutes(summaryWorld());
      const r = await w.get("/api/admin/students/summary?period=all", "admin-token");
      expect(r.status).toBe(200);
      expect(r.body.signUps).toBe(5);
      expect(r.body.trialStarts).toEqual({ count: 2, unknown: 0, source: "subscriptions" });
      expect(r.body.activeStudents).toEqual({ count: 2, unknown: 0, source: "activityLog", since: "2026-10-02" });
      expect(r.body.returnedDay2).toEqual({ returned: 1, eligible: 3, unknown: 0, source: "activityLog", since: "2026-10-02" });
      expect(r.body.returnedWithin7Days).toEqual({ returned: 2, eligible: 3, unknown: 0, source: "activityLog", since: "2026-10-02" });
    });

    it("the period applies to the cards too", async () => {
      const w = buildRoutes(summaryWorld());
      const r = await w.get("/api/admin/students/summary?period=1", "admin-token");
      expect(r.body.signUps).toBe(1);
      expect(r.body.returnedDay2.eligible).toBe(0);
      expect(r.body.trialStarts.count).toBe(1);
    });
  });

  /* ── S3: detail ─────────────────────────────────────────────────────── */

  describe("S3 detail — one timeline merged from every source; names and counts only", () => {
    function detailWorld(): World {
      const created = NOW - 5 * DAY;
      const d1 = istDayKey(created);
      const d2 = mod.addIstDays(d1, 1);
      const d3 = mod.addIstDays(d1, 2);
      const at = (key: string, h: number) => mod.istDayStartMs(key) + h * 3600_000;
      const uid = STUDENT_TOKEN_UID;
      const store: Record<string, Data> = {
        [`subscriptions/${uid}`]: { tier: "trial", plan: "trial_7day", trialStartDate: ts(created + 1000) },
        [`activityLog/${uid}/activityDays/${d2}`]: {
          firstSeenMs: at(d2, 8),
          lastSeenMs: at(d2, 9),
          sections: { "check-improve": 3, practice: 1 },
          events: { check_question_read: 1, check_graded: 1 },
          expireAt: ts(at(d2, 0) + 90 * DAY),
        },
        [`usageLedger/${uid}/days/${d2}`]: { calls: 4, costMicroInr: 1_234_567, trialChecks: 1, hourCostMicroInr: { "08": 1 } },
        // ★ POISON: a session record and an attempt that carry text. None of it may leave.
        [`sessionRecords/${uid}/records/CT-9`]: {
          surface: "chapter-test",
          subject: "science",
          title: "POISON-TITLE What is the SI unit of power?",
          topicKeys: ["electricity", "POISON TOPIC WITH SPACES"],
          questionIds: ["POISON-QID-1"],
          marksAwarded: 7,
          marksTotal: 10,
          status: "graded",
          gradedAt: at(d3, 15),
          perQuestionRef: "POISON-REF",
        },
        [`practiceInsights/${uid}/attempts/a1`]: { timestamp: at(d3, 16), marksScored: 2, marksAvailable: 3, correct: false, questionId: "POISON-QID-2", topicName: "POISON-TOPIC-NAME", answerText: "POISON-ANSWER" },
        [`practiceInsights/${uid}/attempts/a2`]: { timestamp: at(d3, 17), marksScored: 1, marksAvailable: 1, correct: true },
        [`mockScoreHistory/${uid}/entries/m1`]: { subject: "Maths", totalMarks: 52, maxMarks: 80, percent: 65, timestamp: at(d3, 18), topicBreakdown: { "POISON-BREAKDOWN": { scored: 1, maxPossible: 2 } } },
        [`subscriptions/${uid}/payments/pay_POISON`]: { passType: "month", pricePaidInr: 299, grantedAt: ts(at(d3, 19)) },
      };
      return { now: NOW, users: [user(uid, created)], store };
    }

    it("merges activityLog, usageLedger, sessionRecords, practice attempts, mock entries and plan events by IST day", async () => {
      const world = detailWorld();
      const w = buildRoutes(world);
      const r = await w.get(`/api/admin/students/${STUDENT_TOKEN_UID}`, "admin-token");
      expect(r.status).toBe(200);
      const created = NOW - 5 * DAY;
      const d1 = istDayKey(created);
      const d2 = mod.addIstDays(d1, 1);
      const d3 = mod.addIstDays(d1, 2);
      const tl = r.body.timeline as Array<Record<string, unknown> & { day: string; dayNumber: number }>;
      expect(tl.map((d) => d.day)).toEqual([d1, d2, d3]);
      expect(tl.map((d) => d.dayNumber)).toEqual([1, 2, 3]);

      const day1 = tl[0] as unknown as { plan: { kind: string }[] };
      expect(day1.plan.map((p) => p.kind)).toEqual(["signed-up", "trial-started"]);

      const day2 = tl[1] as unknown as { activity: Data; ai: Data };
      expect(day2.activity).toEqual({
        firstSeenMs: mod.istDayStartMs(d2) + 8 * 3600_000,
        lastSeenMs: mod.istDayStartMs(d2) + 9 * 3600_000,
        sections: { "check-improve": 3, practice: 1 },
        events: { check_question_read: 1, check_graded: 1 },
        // ACTIVITY-DETAIL-1: a B-7-shaped day (no pages / feed) is "not recorded" (null), never "none".
        pages: null,
        feed: null,
        feedTruncated: false,
      });
      // HARDEN-1 PR-2: this ledger day has no providerSpendMicroInr (a pre-#957 day) -> null = not recorded.
      expect(day2.ai).toEqual({ calls: 4, costInr: 1.23, providerSpendInr: null, checks: 1, chapterTests: 0, mocks: 0, worksheets: 0 });

      const day3 = tl[2] as unknown as { sessions: Data[]; practice: Data; mocks: Data[]; plan: Data[] };
      expect(day3.sessions).toEqual([
        { surface: "chapter-test", subject: "science", topics: ["electricity"], marksAwarded: 7, marksTotal: 10, status: "graded", atMs: mod.istDayStartMs(d3) + 15 * 3600_000 },
      ]);
      expect(day3.practice).toEqual({ attempts: 2, correct: 1, marksScored: 3, marksAvailable: 4 });
      expect(day3.mocks).toEqual([{ subject: "Maths", totalMarks: 52, maxMarks: 80, percent: 65, atMs: mod.istDayStartMs(d3) + 18 * 3600_000 }]);
      expect(day3.plan).toEqual([{ kind: "payment", atMs: mod.istDayStartMs(d3) + 19 * 3600_000, passType: "month", pricePaidInr: 299 }]);

      expect(r.body.student.plan).toMatchObject({ kind: "trial" });
      expect(r.body.reads.activityLog).toBe("complete");
    });

    it("★ never returns question/answer text, titles, question ids or free text, even when the source holds it", async () => {
      const w = buildRoutes(detailWorld());
      const r = await w.get(`/api/admin/students/${STUDENT_TOKEN_UID}`, "admin-token");
      expect(r.status).toBe(200);
      expect(r.raw).not.toMatch(/POISON/);
      expect(r.raw).not.toMatch(/questionIds|perQuestionRef|title|answerText|expireAt|hourCostMicroInr/);
    });

    it("★ ACTIVITY-DETAIL-1: returns pages + the ordered feed copied field by field — allowlisted names only, nothing else from an entry", async () => {
      const world = detailWorld();
      const uid = STUDENT_TOKEN_UID;
      const created = NOW - 5 * DAY;
      const d4 = mod.addIstDays(istDayKey(created), 3);
      const t0 = mod.istDayStartMs(d4) + 10 * 3600_000;
      world.store[`activityLog/${uid}/activityDays/${d4}`] = {
        firstSeenMs: t0,
        lastSeenMs: t0 + 60_000,
        sections: { notes: 2 },
        events: { check_graded: 1 },
        pages: { "notes~trigonometry": 2, "POISON~raw~path": 7, "/notes/x": 1 },
        feed: [
          { t: t0, k: "page", n: "notes~trigonometry", path: "/notes/trigonometry?POISON-QUERY", uid: "POISON-UID" },
          { t: t0 + 1000, k: "event", n: "check_graded", answer: "POISON-ANSWER" },
          { t: t0 + 2000, k: "page", n: "POISON-PAGE" },
          { t: "not-a-time", k: "page", n: "home" },
          { t: t0 + 3000, k: "question", n: "home" },
        ],
        feedTruncated: true,
        expireAt: ts(mod.istDayStartMs(d4) + 90 * DAY),
      };
      const w = buildRoutes(world);
      const r = await w.get(`/api/admin/students/${uid}`, "admin-token");
      expect(r.status).toBe(200);
      const day = (r.body.timeline as Array<{ day: string; activity: Data }>).find((d) => d.day === d4)!;
      expect(day.activity.pages).toEqual({ "notes~trigonometry": 2 });
      expect(day.activity.feed).toEqual([
        { t: t0, k: "page", n: "notes~trigonometry" },
        { t: t0 + 1000, k: "event", n: "check_graded" },
      ]);
      expect(day.activity.feedTruncated).toBe(true);
      expect(r.raw).not.toMatch(/POISON/);
    });

    it("404 for an unknown uid; 400 for a malformed one", async () => {
      const w = buildRoutes(detailWorld());
      expect((await w.get("/api/admin/students/nobody00001", "admin-token")).status).toBe(404);
      expect((await w.get("/api/admin/students/bad%20uid!", "admin-token")).status).toBe(400);
    });
  });

  /* ── NO WRITES ──────────────────────────────────────────────────────── */

  describe("★★ NO WRITES — every endpoint, against fakes whose writes THROW", () => {
    it("every endpoint and query variant succeeds with ZERO write attempts, calling only read methods", async () => {
      const world: World = {
        now: NOW,
        users: [user(STUDENT_TOKEN_UID, NOW - 3 * DAY), user("otherUid0002", NOW - 40 * DAY)],
        store: {
          [`subscriptions/${STUDENT_TOKEN_UID}`]: { tier: "trial", plan: "trial_7day", trialStartDate: ts(NOW - 2 * DAY) },
          [`activityLog/${STUDENT_TOKEN_UID}/activityDays/${istDayKey(NOW - DAY)}`]: { firstSeenMs: NOW - DAY, lastSeenMs: NOW - DAY, sections: {}, events: { check_graded: 1 } },
        },
      };
      const w = buildRoutes(world);
      const urls = [
        "/api/admin/students",
        "/api/admin/students?period=7&plan=trial",
        "/api/admin/students?plan=basic",
        "/api/admin/students/summary?period=30",
        "/api/admin/students/summary",
        `/api/admin/students/${STUDENT_TOKEN_UID}`,
        "/api/admin/students/otherUid0002",
      ];
      for (const u of urls) {
        const r = await w.get(u, "admin-token");
        expect(r.status, u).toBe(200);
      }
      expect(w.fs.writes).toEqual([]);
      expect(w.fa.writes).toEqual([]);
      const fsUsed = [...new Set(w.fs.calls)].sort();
      const authUsed = [...new Set(w.fa.calls)].sort();
      expect(fsUsed.filter((m) => !FS_READ_METHODS.has(m))).toEqual([]);
      expect(authUsed.filter((m) => !AUTH_READ_METHODS.has(m))).toEqual([]);
      expect(authUsed).toEqual(["getUser", "listUsers", "verifyIdToken"]);
    });

    it("CONTROL: the fakes really do throw on a write (so the test above could fail)", () => {
      const { db } = makeFirestore({});
      expect(() => ((db.collection as (n: string) => { doc: (i: string) => { set: () => void } })("x").doc("y").set())).toThrow(/WRITE ATTEMPTED: set/);
      const fa = makeAdmin([], {});
      expect(() => (fa.admin.auth() as unknown as { deleteUser: () => void }).deleteUser()).toThrow(/AUTH WRITE ATTEMPTED/);
    });

    it("the module source names no Firestore or Auth write method", () => {
      const src = readFileSync(path.join(SERVER_DIR, "routes", "adminStudents.cjs"), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      const writeCall = /(?<!Object)\.(set|update|delete|create|add|batch|runTransaction|bulkWriter|recursiveDelete|createUser|updateUser|deleteUser|deleteUsers|setCustomUserClaims|revokeRefreshTokens|importUsers)\s*\(/g;
      expect([...src.matchAll(writeCall)].map((m) => m[0])).toEqual([]);
      // CONTROL: the same scan DOES see a write when one is present.
      expect([..."db.collection('x').doc('y').set({})".matchAll(writeCall)].map((m) => m[0])).toEqual([".set("]);
    });
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   HARDEN-1 PR-2 — the read-only "Grader health" payload
   (GET /api/admin/token-telemetry?view=grader-health, server/routes/adminTelemetry.cjs)
   and the two spend numbers on the student detail (FU-A17-ADMIN-SPEND-FIELD).
   Same fakes as above: Firestore and Auth writes THROW. The clock is injected.
   ═══════════════════════════════════════════════════════════════════════════ */

const ghMod = requireCjs("../../../server/routes/adminTelemetry.cjs") as {
  createAdminTelemetryRoutes: (deps: Record<string, unknown>) => {
    handleGetTokenTelemetry: (req: FakeReq, res: FakeRes) => Promise<void>;
  };
  NOT_COMPLETED_REASONS: string[];
};

const CONFIGURED = "gemini-3.8-flash";
const FALLBACK = "gemini-2.5-flash";
/** 00:05 IST on 15 Dec 2026 — five minutes after an IST midnight. */
const GH_NOW = Date.parse("2026-12-14T18:35:00.000Z");

function reply(model: string | null, results?: Data[], extra: Data = {}) {
  return JSON.stringify({ ok: true, ...(model ? { model } : {}), ...(results ? { results } : {}), teacherNote: "POISON-NOTE", ...extra });
}
function syncRecord(atMs: number, body: string): Data {
  return { state: "done", status: 200, claimId: "POISON-CLAIM", body, completedAtMs: atMs, expiresAtMs: atMs + DAY };
}

function ghWorld(store: Record<string, Data>): World {
  return { now: GH_NOW, users: [user(STUDENT_TOKEN_UID, GH_NOW - 30 * DAY), user("otherUid0002", GH_NOW - 40 * DAY)], store };
}

function ghRoutes(world: World, counters: Record<string, number> = {}) {
  const fs = makeFirestore(world.store);
  const fa = makeAdmin(world.users, { "admin-token": ADMIN_UID, "student-token": STUDENT_TOKEN_UID });
  const routes = ghMod.createAdminTelemetryRoutes({
    sendJson,
    firebaseAdmin: fa.admin,
    adminFirestore: fs.db,
    telemetry: { snapshot: () => ({ ...counters }) },
    getTokenTelemetry: () => [],
    now: () => world.now,
  });
  async function get(url: string, token?: string) {
    const res = makeRes();
    const req: FakeReq = { method: "GET", url, headers: token ? { authorization: `Bearer ${token}` } : {} };
    await routes.handleGetTokenTelemetry(req, res);
    return { status: res.status, body: JSON.parse(res.body || "{}"), raw: res.body };
  }
  return { get, fs, fa };
}

const GH_URL = "/api/admin/token-telemetry?view=grader-health";
const at = (iso: string) => Date.parse(iso);
const att = (uid: string, id: string) => `gradingResults/${uid}/attempts/${id}`;

describe("HARDEN-1 PR-2 · grader health — access (the existing ADMIN_FIREBASE_UIDS gate)", () => {
  it("★ a non-admin gets 403 and NO payload, and nothing is read", async () => {
    const w = ghRoutes(ghWorld({ [att(STUDENT_TOKEN_UID, "a1")]: syncRecord(GH_NOW - 60_000, reply(CONFIGURED)) }));
    const r = await w.get(GH_URL, "student-token");
    expect(r.status).toBe(403);
    expect(Object.keys(r.body).sort()).toEqual(["error", "ok"]);
    expect(r.raw).not.toMatch(/records|counters|gradesByModel/);
    expect(w.fs.calls).toEqual([]);
    expect(w.fa.calls).toEqual(["verifyIdToken"]);
  });

  it("no token -> 401; a bad token -> 401; both with no payload", async () => {
    const w = ghRoutes(ghWorld({}));
    for (const token of [undefined, "forged-token"]) {
      const r = await w.get(GH_URL, token);
      expect(r.status).toBe(401);
      expect(Object.keys(r.body).sort()).toEqual(["error", "ok"]);
    }
    expect(w.fs.calls).toEqual([]);
  });
});

describe("HARDEN-1 PR-2 · grader health — payload (counts from stored records + existing counters)", () => {
  function fullWorld(): World {
    const u = STUDENT_TOKEN_UID;
    const today1 = GH_NOW - 2 * 60_000; // 00:03 IST, 15 Dec
    const twoDaysAgo = GH_NOW - 2 * DAY;
    return ghWorld({
      // configured model: a graded single check, and a single check whose answer could not be read
      [att(u, "c1")]: syncRecord(today1, reply(CONFIGURED, undefined, { marksAwarded: 2, totalMarks: 3, answerMismatch: false })),
      [att(u, "c2")]: syncRecord(twoDaysAgo, reply(CONFIGURED, undefined, { couldNotRead: true, answerMismatch: null })),
      // fallback model: a worksheet with a timeout, an unreadable, an error, a mismatch and a grade
      [att(u, "w1")]: syncRecord(today1, reply(FALLBACK, [
        { notGraded: "timeout", couldNotRead: true, note: "POISON-ROW" },
        { notGraded: "unreadable", couldNotRead: true },
        { notGraded: "error", couldNotRead: true },
        { notGraded: null, answerMismatch: true },
        { notGraded: null, answerMismatch: false, marksAwarded: 1 },
      ])),
      // a background job that finished on the fallback model
      [att("otherUid0002", "j1")]: {
        state: "done", status: 202, body: JSON.stringify({ ok: true, jobId: "j1" }), completedAtMs: twoDaysAgo,
        job: { state: "done", doneAtMs: twoDaysAgo + 60_000, model: FALLBACK, final: reply(FALLBACK, [{ notGraded: null, answerMismatch: true }]) },
      },
      // an interrupted job (model never recorded)
      [att("otherUid0002", "j2")]: {
        state: "done", status: 202, body: JSON.stringify({ ok: true, jobId: "j2" }), completedAtMs: twoDaysAgo,
        job: { state: "interrupted", interruptedAtMs: twoDaysAgo + 120_000, model: null, results: [JSON.stringify({ notGraded: "interrupted", couldNotRead: true }), JSON.stringify({ notGraded: null })] },
      },
      // a reply the grader could not use ({ ok:false }) -> one "error"
      [att(u, "e1")]: syncRecord(twoDaysAgo, JSON.stringify({ ok: false, error: "POISON-ERROR" })),
      // NOT counted: a pending marker, a job still running, a record older than 7 IST days
      [att(u, "p1")]: { state: "pending", claimedAtMs: GH_NOW - 1000 },
      [att(u, "r1")]: { state: "done", status: 202, body: "{}", completedAtMs: GH_NOW - 5000, job: { state: "running" } },
      [att(u, "old")]: syncRecord(GH_NOW - 9 * DAY, reply(CONFIGURED)),
    });
  }

  it("★ admin gets the card payload shape: IST windows, models, records, counters", async () => {
    const w = ghRoutes(fullWorld(), { "grading.model_fallback": 3, "entitlement.deny.reauth_required": 2, "grading.something_else": 99 });
    const r = await w.get(GH_URL, "admin-token");
    expect(r.status).toBe(200);
    expect(Object.keys(r.body).sort()).toEqual(
      ["counters", "generatedAtMs", "models", "ok", "records", "timeZone", "todayKey", "view", "windowDays", "windowStartKey"].sort()
    );
    expect(r.body).toMatchObject({ ok: true, view: "grader-health", timeZone: "Asia/Kolkata", todayKey: "2026-12-15", windowStartKey: "2026-12-09", windowDays: 7, generatedAtMs: GH_NOW });
    expect(r.body.models).toEqual({ configured: CONFIGURED, fallback: FALLBACK });
    expect(Object.keys(r.body.records.today).sort()).toEqual(["answerMismatches", "gradesByModel", "notCompleted", "questions", "records"]);
    expect(Object.keys(r.body.counters).sort()).toEqual(["gradingModelFallback", "signInRefreshDenials", "uptimeSeconds"]);
    expect(r.body.counters.gradingModelFallback).toBe(3);
    expect(r.body.counters.signInRefreshDenials).toBe(2);
    expect(r.body.records.available).toBe(true);
    expect(r.body.records.studentsScanned).toBe(2);
    // names and counts only: no reply text, no uid, no claim id leaves
    expect(r.raw).not.toMatch(/POISON|studentUid01|otherUid0002/);
  });

  it("★ grades by model: the fallback count is the fallback records ONLY", async () => {
    const w = ghRoutes(fullWorld());
    const r = await w.get(GH_URL, "admin-token");
    const { today, last7Days } = r.body.records;
    expect(last7Days.gradesByModel).toEqual({ [CONFIGURED]: 2, [FALLBACK]: 2, "not-recorded": 2 });
    expect(today.gradesByModel).toEqual({ [CONFIGURED]: 1, [FALLBACK]: 1 });
    expect(last7Days.records).toBe(6); // the pending marker, the running job and the 9-day-old record are not counted
  });

  it("★ grades not completed: timeout / couldn't read / error / interrupted, each with charged 0", async () => {
    const w = ghRoutes(fullWorld());
    const r = await w.get(GH_URL, "admin-token");
    const { today, last7Days } = r.body.records;
    expect(Object.keys(last7Days.notCompleted).sort()).toEqual([...ghMod.NOT_COMPLETED_REASONS].sort());
    expect(last7Days.notCompleted).toEqual({
      timeout: { count: 1, charged: 0 },
      unreadable: { count: 2, charged: 0 },
      error: { count: 2, charged: 0 },
      interrupted: { count: 1, charged: 0 },
    });
    expect(today.notCompleted).toEqual({
      timeout: { count: 1, charged: 0 },
      unreadable: { count: 1, charged: 0 },
      error: { count: 1, charged: 0 },
      interrupted: { count: 0, charged: 0 },
    });
    expect(last7Days.answerMismatches).toBe(2);
    expect(today.answerMismatches).toBe(1);
  });

  it("★ IST day boundary: a record at 18:29Z and one at 18:31Z land on different IST days", async () => {
    const u = STUDENT_TOKEN_UID;
    const w = ghRoutes(ghWorld({
      [att(u, "before")]: syncRecord(at("2026-12-14T18:29:00.000Z"), reply(CONFIGURED)), // 23:59 IST, 14 Dec
      [att(u, "after")]: syncRecord(at("2026-12-14T18:31:00.000Z"), reply(FALLBACK)), // 00:01 IST, 15 Dec
    }));
    const r = await w.get(GH_URL, "admin-token");
    expect(r.body.todayKey).toBe("2026-12-15");
    expect(r.body.records.today.gradesByModel).toEqual({ [FALLBACK]: 1 });
    expect(r.body.records.last7Days.gradesByModel).toEqual({ [CONFIGURED]: 1, [FALLBACK]: 1 });
  });

  it("honest empty state: no stored records -> zero records (the card says no data yet), counters still read", async () => {
    const w = ghRoutes(ghWorld({}), { "grading.model_fallback": 0 });
    const r = await w.get(GH_URL, "admin-token");
    expect(r.status).toBe(200);
    expect(r.body.records.available).toBe(true);
    expect(r.body.records.last7Days.records).toBe(0);
    expect(r.body.records.oldestRecordMs).toBeNull();
  });

  it("Firestore unavailable -> records.available false (never zero-filled numbers)", async () => {
    const world = ghWorld({});
    const fa = makeAdmin(world.users, { "admin-token": ADMIN_UID });
    const routes = ghMod.createAdminTelemetryRoutes({ sendJson, firebaseAdmin: fa.admin, telemetry: { snapshot: () => ({}) }, now: () => GH_NOW });
    const res = makeRes();
    await routes.handleGetTokenTelemetry({ method: "GET", url: GH_URL, headers: { authorization: "Bearer admin-token" } }, res);
    const body = JSON.parse(res.body);
    expect(body.records).toEqual({ available: false });
  });

  it("★★ NO WRITES: the grader-health read calls only read methods", async () => {
    const w = ghRoutes(fullWorld());
    expect((await w.get(GH_URL, "admin-token")).status).toBe(200);
    expect(w.fs.writes).toEqual([]);
    expect(w.fa.writes).toEqual([]);
    expect([...new Set(w.fs.calls)].filter((m) => !FS_READ_METHODS.has(m))).toEqual([]);
    expect([...new Set(w.fa.calls)].sort()).toEqual(["listUsers", "verifyIdToken"]);
  });

  it("the plain token-telemetry payload is unchanged by the view (no records read without ?view=grader-health)", async () => {
    const w = ghRoutes(fullWorld());
    const r = await w.get("/api/admin/token-telemetry", "admin-token");
    expect(r.status).toBe(200);
    expect(r.body.view).toBeUndefined();
    expect(r.body.gradingModelFallback).toBeDefined();
    expect(w.fs.calls).toEqual([]);
  });
});

describe("HARDEN-1 PR-2 · student detail — usage meter vs actual AI spend (FU-A17-ADMIN-SPEND-FIELD)", () => {
  async function dayAi(ledger: Data) {
    const created = GH_NOW - 3 * DAY;
    const d = istDayKey(created + DAY);
    const world: World = {
      now: GH_NOW,
      users: [user(STUDENT_TOKEN_UID, created)],
      store: { [`usageLedger/${STUDENT_TOKEN_UID}/days/${d}`]: ledger },
    };
    const r = await buildRoutes(world).get(`/api/admin/students/${STUDENT_TOKEN_UID}`, "admin-token");
    expect(r.status).toBe(200);
    return (r.body.timeline as Array<{ day: string; ai: Data | null }>).find((x) => x.day === d)!.ai!;
  }

  it("★ meter and spend are two separate numbers, never swapped", async () => {
    const ai = await dayAi({ calls: 3, costMicroInr: 1_234_567, providerSpendMicroInr: 4_560_000 });
    expect(ai.costInr).toBe(1.23); // the usage meter (graded)
    expect(ai.providerSpendInr).toBe(4.56); // what the provider billed
  });

  it("★ a pre-#957 day (no providerSpendMicroInr) -> null = not recorded, never 0 and never the meter", async () => {
    const ai = await dayAi({ calls: 3, costMicroInr: 1_234_567 });
    expect(ai.providerSpendInr).toBeNull();
    expect(ai.costInr).toBe(1.23);
  });

  it("a recorded zero spend stays 0 (a real zero is not not-recorded)", async () => {
    const ai = await dayAi({ calls: 1, costMicroInr: 0, providerSpendMicroInr: 0 });
    expect(ai.providerSpendInr).toBe(0);
  });
});
