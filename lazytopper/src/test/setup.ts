import "@testing-library/jest-dom";
import { afterEach, beforeEach, vi } from "vitest";

/**
 * PERF-3 — THE FIRESTORE FACADE, AS EVERY EXISTING TEST ALREADY DESCRIBES IT.
 *
 * Product code reaches Firestore through `services/firestoreSdk` (`isFirestoreEnabled()` +
 * `getFirestore()`), which loads the SDK on demand. Over a hundred suites were written against
 * the OLD shape: they mock `services/firebaseClient` with a `firestoreDb` (truthy = "cloud on",
 * null/absent = "no cloud") and mock `firebase/firestore` with the functions they assert on.
 *
 * This stand-in keeps every one of those suites meaning exactly what it meant: it reads the
 * suite's own `firebaseClient` mock for `firestoreDb` and hands back the suite's own
 * `firebase/firestore` mock as `fs`, with that `firestoreDb` as `db` — so `doc(db, ...)` paths,
 * `setDoc` payloads and "no cloud" branches are asserted exactly as before.
 *
 * The REAL facade is exercised by `services/firestoreSdk.test.ts` (which unmocks it) and, for
 * the bundle, by `scripts/ops/perf3_entry_chunk_acceptance.mjs`.
 */
vi.mock("../services/firestoreSdk", async () => {
  const client = (await import("../services/firebaseClient")) as Record<string, unknown>;
  // Resolved ONCE, here: concurrent dynamic imports of a mocked package from setup code were
  // measured to hand back the REAL module to some callers. One import, one module.
  const fs = await import("firebase/firestore");
  const readDb = (): unknown => {
    try {
      // A suite whose firebaseClient mock defines no `firestoreDb` gets vitest's "no export"
      // throw here — that suite never had a cloud, so it has none now.
      return client.firestoreDb;
    } catch {
      return undefined;
    }
  };
  const noDb = () => new Error("[test setup] firestoreSdk: no firestoreDb in this suite's firebaseClient mock");
  // Like the real facade: ONE promise object per Firestore instance (a suite that swaps
  // `firestoreDb` between tests gets a new one).
  let cached: { db: unknown; handle: Promise<{ fs: typeof fs; db: unknown }> } | null = null;
  return {
    isFirestoreEnabled: () => Boolean(readDb()),
    getFirestore: () => {
      const db = readDb();
      if (!db) return Promise.reject(noDb());
      if (!cached || cached.db !== db) cached = { db, handle: Promise.resolve({ fs, db }) };
      return cached.handle;
    },
    // Like the real facade once the SDK is loaded: `use` runs synchronously, in the caller's call.
    withFirestore: (use: (h: { fs: typeof fs; db: unknown }) => unknown) => {
      const db = readDb();
      if (!db) return Promise.reject(noDb());
      try {
        return Promise.resolve(use({ fs, db }));
      } catch (error) {
        return Promise.reject(error);
      }
    },
  };
});
// Test clock (TEST-CLOCK-SWEEP): with LT_TEST_CLOCK=<ISO> set, "now" reads that instant and
// ticks from there, in every test. Unset -> nothing is installed. See the module for the design.
import { ensureTestClock, installTestClockFromEnv } from "../../scripts/testClock/testClock.mjs";

// Installs (idempotent: the node preload may already have) and SELF-CHECKS: throws, failing
// every test file loudly, if the switch is set but "now" does not read it.
installTestClockFromEnv();

// vitest captured the NATIVE Date before this file ran, and `vi.useRealTimers()` after a bare
// `vi.setSystemTime()` restores that capture. Put the shifted clock back before each test so
// one test's pin cannot leak the real clock into the next. A test's own fake timers, installed
// in its own beforeEach, run AFTER this hook, so its pin still wins.
beforeEach(() => {
  ensureTestClock();
});

/**
 * Vitest global setup.
 *
 * 1. Registers @testing-library/jest-dom matchers (toBeInTheDocument, etc).
 * 2. Polyfills `window.matchMedia`, which jsdom does NOT implement. Several
 *    hooks (e.g. `useIsDesktop`) call `window.matchMedia(...)` on mount, so
 *    without this polyfill every responsive render test throws at import time.
 *
 * The polyfill is CONFIGURABLE per-test via `setMatchMediaMatches(...)`, so a
 * later PR can render the same component as desktop or mobile. It defaults to
 * `false` (mobile / "does not match"), mirroring the app's SSR-safe default in
 * `useIsDesktop`. Both the modern (`addEventListener`/`removeEventListener`)
 * and legacy (`addListener`/`removeListener`) MediaQueryList event APIs are
 * provided because `useIsDesktop` feature-detects and falls back to the legacy
 * pair.
 */

const DEFAULT_MATCHES = false;

let currentMatches: (query: string) => boolean = () => DEFAULT_MATCHES;

/**
 * Override what `window.matchMedia(query).matches` returns for the duration of
 * a test. Pass a boolean to force every query to that value (the common case —
 * `true` = desktop, `false` = mobile), or a predicate for per-query control.
 * Automatically reset to the default after each test.
 */
export function setMatchMediaMatches(matches: boolean | ((query: string) => boolean)): void {
  currentMatches = typeof matches === "function" ? matches : () => matches;
}

function installMatchMedia(): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string): MediaQueryList => {
      const list: MediaQueryList = {
        get matches() {
          return currentMatches(query);
        },
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        // Deprecated MediaQueryList API — kept for hooks that fall back to it.
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      };
      return list;
    },
  });
}

// Suites that opt into `// @vitest-environment node` have no `window`; the global
// setupFiles still runs for them, so guard the matchMedia polyfill on a real DOM.
if (typeof window !== "undefined") {
  installMatchMedia();
}

afterEach(() => {
  currentMatches = () => DEFAULT_MATCHES;
});
