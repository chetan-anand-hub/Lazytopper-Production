// LOW-END-1 PR-1 (L5) — the Google popup's sign-in machinery is not installed at Auth start-up.
//
// `getAuth(app)` = initializeAuth(persistences + browserPopupRedirectResolver). On a phone,
// Safari or iOS that resolver initialises PROACTIVELY: start-up awaited a hidden iframe and
// Google's gapi loader (~134 KB) on every page. firebaseClient now calls initializeAuth with
// the persistences only, and the resolver reaches signInWithPopup alone.
//
//   (a) start-up: initializeAuth once, the three persistences in getAuth's order, and NO
//       popupRedirectResolver; getAuth is never called.
//   (b) the resolver handed to signInWithPopup is ONE shared instance, so the instance the
//       login page warms is the one Firebase's per-class cache later creates.
//   (c) the warm-up calls the resolver's _initialize with the app's Auth, once.
//   (d) AuthContext passes the resolver as signInWithPopup's third argument, and the login
//       door (AuthDoor) warms it on mount — read from source with the TypeScript parser.

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

const H = vi.hoisted(() => {
  const initializeCalls: Array<{ auth: unknown }> = [];
  class FakeResolver {
    _initialize(auth: unknown) {
      initializeCalls.push({ auth });
      return Promise.resolve({});
    }
  }
  return {
    AUTH: { __fake: "auth" },
    IDB: { __p: "indexedDB" },
    LOCAL: { __p: "local" },
    SESSION: { __p: "session" },
    FakeResolver,
    initializeCalls,
    initializeAuth: vi.fn(),
    getAuth: vi.fn(),
  };
});

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({ __fake: "app" })),
  getApps: vi.fn(() => []),
}));
vi.mock("firebase/firestore", () => ({ initializeFirestore: vi.fn(() => ({ __fake: "db" })) }));
vi.mock("firebase/auth", () => ({
  initializeAuth: (...args: unknown[]) => {
    H.initializeAuth(...args);
    return H.AUTH;
  },
  getAuth: (...args: unknown[]) => {
    H.getAuth(...args);
    return H.AUTH;
  },
  indexedDBLocalPersistence: H.IDB,
  browserLocalPersistence: H.LOCAL,
  browserSessionPersistence: H.SESSION,
  browserPopupRedirectResolver: H.FakeResolver,
}));

type FirebaseClient = typeof import("./firebaseClient");
let client: FirebaseClient;

beforeAll(async () => {
  vi.stubEnv("VITE_FIREBASE_API_KEY", "k");
  vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "d.example");
  vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "p");
  vi.stubEnv("VITE_FIREBASE_APP_ID", "a");
  client = await import("./firebaseClient");
});
afterAll(() => vi.unstubAllEnvs());

describe("L5 — Auth start-up carries no popup resolver", () => {
  it("(a) initializeAuth once, persistences only (getAuth's order), no popupRedirectResolver; getAuth never", () => {
    expect(client.firebaseConfigured).toBe(true);
    expect(client.authClient).toBe(H.AUTH);
    expect(H.getAuth).not.toHaveBeenCalled();
    expect(H.initializeAuth).toHaveBeenCalledTimes(1);
    const [, deps] = H.initializeAuth.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(deps.persistence).toEqual([H.IDB, H.LOCAL, H.SESSION]);
    expect(Object.keys(deps)).toEqual(["persistence"]);
    expect(deps).not.toHaveProperty("popupRedirectResolver");
  });

  it("(b) the resolver is a class whose every construction yields ONE shared FakeResolver instance", () => {
    const Resolver = client.getPopupRedirectResolver() as unknown as new () => object;
    expect(client.getPopupRedirectResolver()).toBe(Resolver);
    const first = new Resolver();
    const second = new Resolver();
    expect(first).toBe(second);
    expect(first).toBeInstanceOf(H.FakeResolver);
    expect(first).toBeInstanceOf(Resolver);
  });

  it("(c) the warm-up initialises that shared instance with the app's Auth, and nothing at start-up did", () => {
    expect(H.initializeCalls).toHaveLength(0);
    client.prewarmPopupRedirectResolver();
    expect(H.initializeCalls).toEqual([{ auth: H.AUTH }]);
  });
});

function callsNamed(file: string, name: string): ts.CallExpression[] {
  const path = resolve(__dirname, file);
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
  const out: ts.CallExpression[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name) {
      out.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return out;
}

describe("L5 — the resolver reaches signInWithPopup only, and the login door warms it", () => {
  it("(d) AuthContext: the one signInWithPopup call passes getPopupRedirectResolver() third", () => {
    const calls = callsNamed("../context/AuthContext.tsx", "signInWithPopup");
    expect(calls).toHaveLength(1);
    const third = calls[0].arguments[2];
    expect(third && ts.isCallExpression(third) && ts.isIdentifier(third.expression) && third.expression.text).toBe(
      "getPopupRedirectResolver",
    );
  });

  it("(d) Login's AuthDoor calls prewarmPopupRedirectResolver (inside a mount effect)", () => {
    const calls = callsNamed("../pages/Login.tsx", "prewarmPopupRedirectResolver");
    expect(calls).toHaveLength(1);
    let node: ts.Node | undefined = calls[0];
    let inEffect = false;
    let inAuthDoor = false;
    while (node) {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "useEffect") inEffect = true;
      if (ts.isFunctionDeclaration(node) && node.name?.text === "AuthDoor") inAuthDoor = true;
      node = node.parent;
    }
    expect(inEffect).toBe(true);
    expect(inAuthDoor).toBe(true);
  });

  it("CONTROL — the call finder does find a call that exists (initializeAuth in firebaseClient)", () => {
    expect(callsNamed("./firebaseClient.ts", "initializeAuth")).toHaveLength(1);
    expect(callsNamed("./firebaseClient.ts", "getAuth")).toHaveLength(0);
  });
});
