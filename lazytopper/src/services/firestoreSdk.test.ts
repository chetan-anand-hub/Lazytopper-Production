// PERF-3 §2.4 — the REAL on-demand Firestore facade (src/test/setup.ts stands it in for every
// other suite; this one unmocks it). Pins: D32's single `initializeFirestore(app,
// {ignoreUndefinedProperties:true})`; nothing initialised before the first real call; ONE init for
// two concurrent first calls; call order kept while loading; synchronous once loaded; a failed load
// REJECTS to every waiting caller (never swallowed) and the next call retries; not configured ->
// disabled, nothing loaded; and an existing caller's own error path receives the failure.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.unmock("./firestoreSdk");

const H = vi.hoisted(() => {
  const h = {
    app: { __app: true } as object | null,
    initCalls: [] as unknown[][],
    sdk: () => ({
      initializeFirestore: (...args: unknown[]) => {
        h.initCalls.push(args);
        return { __db: h.initCalls.length };
      },
      doc: () => ({}),
    }),
  };
  return h;
});

vi.mock("./firebaseClient", () => ({
  get app() {
    return H.app;
  },
}));
vi.mock("firebase/firestore", () => H.sdk());

/** A load that fails the way an unfetchable chunk does. */
function failNextLoad(error: Error) {
  vi.doMock("firebase/firestore", () => {
    throw error;
  });
}

/** The failure's own text, whether it arrives as-is or wrapped (vitest wraps a throwing mock
 *  factory and keeps the original as `cause`; a real failed chunk arrives as-is). */
function failureText(e: unknown): string {
  const err = e as { message?: unknown; cause?: { message?: unknown } } | null;
  return `${String(err?.message ?? "")} ${String(err?.cause?.message ?? "")}`;
}

async function freshFacade() {
  vi.resetModules();
  return import("./firestoreSdk");
}

beforeEach(() => {
  H.app = { __app: true };
  H.initCalls = [];
});

afterEach(() => {
  // Put the standard SDK stand-in back for the next test (never the real SDK).
  vi.doMock("firebase/firestore", () => H.sdk());
});

describe("firestoreSdk — the on-demand Firestore facade (PERF-3)", () => {
  it("is enabled synchronously and initialises NOTHING until the first real call", async () => {
    const sdk = await freshFacade();
    expect(sdk.isFirestoreEnabled()).toBe(true);
    expect(H.initCalls).toHaveLength(0);

    const handle = await sdk.getFirestore();
    // D32 — exactly the old eager call: this app, ignoreUndefinedProperties true.
    expect(H.initCalls).toEqual([[H.app, { ignoreUndefinedProperties: true }]]);
    expect(handle.db).toEqual({ __db: 1 });
    expect(typeof handle.fs.doc).toBe("function");
  });

  it("two CONCURRENT first calls share ONE load and ONE initializeFirestore (the same promise)", async () => {
    const sdk = await freshFacade();
    const a = sdk.getFirestore();
    const b = sdk.getFirestore();
    expect(a).toBe(b);
    const viaWith = sdk.withFirestore((h) => h.db);
    const [ha, hb, db] = await Promise.all([a, b, viaWith]);
    expect(ha.db).toBe(hb.db);
    expect(db).toBe(ha.db);
    expect((await sdk.getFirestore()).db).toBe(ha.db);
    expect(H.initCalls).toHaveLength(1);
  });

  it("calls made WHILE loading run in call order; once loaded, withFirestore runs synchronously", async () => {
    const sdk = await freshFacade();
    const order: string[] = [];
    const a = sdk.withFirestore(() => order.push("A"));
    const b = sdk.withFirestore(() => order.push("B"));
    expect(order).toEqual([]); // nothing runs before the SDK arrives
    await Promise.all([a, b]);
    expect(order).toEqual(["A", "B"]);

    // Loaded: `use` runs inside the call, before the next statement — as the eager SDK did.
    void sdk.withFirestore(() => order.push("C"));
    order.push("after-C");
    expect(order).toEqual(["A", "B", "C", "after-C"]);
  });

  it("a call that finds the SDK ready never overtakes calls still queued from the load", async () => {
    const sdk = await freshFacade();
    const order: string[] = [];
    const first = sdk.withFirestore(() => order.push("first"));
    const second = sdk.withFirestore(() => order.push("second"));
    // Issued from a continuation of the same load: it must still run after "first" and "second".
    const late = sdk.getFirestore().then(() => sdk.withFirestore(() => order.push("late")));
    await Promise.all([first, second, late]);
    expect(order).toEqual(["first", "second", "late"]);
  });

  it("a FAILED load rejects EVERY waiting caller with the error (not swallowed), never initialises, and the next call retries", async () => {
    const boom = new Error("Failed to fetch dynamically imported module");
    failNextLoad(boom);
    const sdk = await freshFacade();
    const a = sdk.getFirestore();
    const b = sdk.withFirestore(() => "never");
    const [ea, eb] = await Promise.all([a.then(() => null, (e) => e), b.then(() => null, (e) => e)]);
    expect(failureText(ea)).toContain(boom.message);
    expect(eb).toBe(ea); // the SAME failure reaches every waiting caller
    expect(H.initCalls).toHaveLength(0);

    // The network comes back: the next call loads again and initialises exactly once.
    vi.doMock("firebase/firestore", () => H.sdk());
    const handle = await sdk.getFirestore();
    expect(handle.db).toEqual({ __db: 1 });
    expect(H.initCalls).toHaveLength(1);
  });

  it("a `use` that throws becomes a rejection, on both paths", async () => {
    const sdk = await freshFacade();
    await expect(sdk.withFirestore(() => { throw new Error("bad path"); })).rejects.toThrow("bad path");
    await sdk.getFirestore();
    await expect(sdk.withFirestore(() => { throw new Error("bad path 2"); })).rejects.toThrow("bad path 2");
  });

  it("not configured: disabled, rejects without initialising anything", async () => {
    H.app = null;
    const sdk = await freshFacade();
    expect(sdk.isFirestoreEnabled()).toBe(false);
    await expect(sdk.getFirestore()).rejects.toThrow(/not configured/);
    await expect(sdk.withFirestore(() => 1)).rejects.toThrow(/not configured/);
    expect(H.initCalls).toHaveLength(0);
  });

  // ── MUST-FIX 2 (review of #1255): Chromium caches a failed import() per URL ─────────────────
  // The loader below behaves like Chromium's module map: once a URL has failed, importing that
  // SAME URL fails again without a request. Only a NEW key (`?retry=<n>`) reaches the network.
  const CHUNK = "https://app.test/assets/index.esm-AAAA.js";
  const chromiumFailure = (url: string) => new Error(`Failed to fetch dynamically imported module: ${url}`);
  function cachedFailureLoader(opts: { networkDownFor: number }) {
    const calls: string[] = [];
    const cachedFailures = new Set<string>([CHUNK]);
    let networkFailuresLeft = opts.networkDownFor;
    return {
      calls,
      loader: {
        primary: () => {
          calls.push("primary");
          return Promise.reject(chromiumFailure(CHUNK)); // the plain specifier: its failure is cached
        },
        importUrl: (url: string) => {
          calls.push(url);
          if (cachedFailures.has(url)) return Promise.reject(chromiumFailure(url)); // replayed, no request
          if (networkFailuresLeft > 0) {
            networkFailuresLeft -= 1;
            cachedFailures.add(url);
            return Promise.reject(chromiumFailure(url));
          }
          return Promise.resolve(H.sdk() as never);
        },
        sleep: async () => {},
      },
    };
  }

  it("CACHED FAILURE: the retry imports the failed chunk URL with ?retry=1 (a new key), succeeds, and initialises once", async () => {
    const sdk = await freshFacade();
    const { calls, loader } = cachedFailureLoader({ networkDownFor: 0 });
    sdk.__setFirestoreSdkLoaderForTests(loader);
    const order: string[] = [];
    const a = sdk.withFirestore(() => order.push("A"));
    const b = sdk.withFirestore(() => order.push("B"));
    await Promise.all([a, b]);
    expect(calls).toEqual(["primary", `${CHUNK}?retry=1`]);
    expect(calls).not.toContain(CHUNK); // never re-tries the cached URL itself
    expect(order).toEqual(["A", "B"]); // order kept across the retry
    expect(H.initCalls).toHaveLength(1);
  });

  it("CACHED FAILURE: when every retry of one call fails, it REJECTS; a LATER call uses fresh ?retry= keys (never the cached ones) and succeeds", async () => {
    const sdk = await freshFacade();
    // primary + 2 retries (retry=1, retry=2) all fail in the first call.
    const { calls, loader } = cachedFailureLoader({ networkDownFor: 2 });
    sdk.__setFirestoreSdkLoaderForTests(loader);
    const first = sdk.getFirestore();
    const firstError = await first.then(() => null, (e: unknown) => e);
    expect(failureText(firstError)).toContain("Failed to fetch dynamically imported module");
    expect(calls).toEqual(["primary", `${CHUNK}?retry=1`, `${CHUNK}?retry=2`]);
    expect(H.initCalls).toHaveLength(0);

    // Network back. The next call must NOT replay the plain import or retry=1/2 (all cached).
    const handle = await sdk.getFirestore();
    expect(handle.db).toEqual({ __db: 1 });
    expect(calls.slice(3)).toEqual([`${CHUNK}?retry=3`]);
    expect(calls.filter((c) => c === "primary")).toHaveLength(1);
    expect(H.initCalls).toHaveLength(1);
    // ...and the instance is kept: no further loads.
    await sdk.getFirestore();
    expect(calls).toHaveLength(4);
  });

  it("an error thrown while the SDK EVALUATES is not a fetch failure: rethrown at once, no retry", async () => {
    const sdk = await freshFacade();
    const calls: string[] = [];
    sdk.__setFirestoreSdkLoaderForTests({
      primary: () => {
        calls.push("primary");
        return Promise.reject(new TypeError("Cannot read properties of undefined (reading 'x')"));
      },
      importUrl: (url) => {
        calls.push(url);
        return Promise.resolve(H.sdk() as never);
      },
      sleep: async () => {},
    });
    await expect(sdk.getFirestore()).rejects.toThrow("Cannot read properties of undefined");
    expect(calls).toEqual(["primary"]);
    expect(H.initCalls).toHaveLength(0);
  });

  it("a failed load reaches an EXISTING caller's own error path (sessionRecords degrades to local, logged)", async () => {
    failNextLoad(new Error("chunk load failed"));
    vi.resetModules();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { getSessionRecordsFromCloud, cloudHasAnySessionRecord } = await import("./sessionRecords");
    await expect(getSessionRecordsFromCloud("u-perf3")).resolves.toEqual([]);
    const call = warn.mock.calls.find((c) => c[0] === "[sessionRecords] cloud read failed");
    expect(call).toBeDefined();
    const logged = call![1] as { uid: string; error: unknown };
    expect(logged.uid).toBe("u-perf3");
    expect(failureText(logged.error)).toContain("chunk load failed");
    // "could not tell" stays null — never folded into "no records".
    await expect(cloudHasAnySessionRecord("u-perf3")).resolves.toBeNull();
    warn.mockRestore();
  });
});
