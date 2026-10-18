import type { Firestore } from "firebase/firestore";
import { app } from "./firebaseClient";
import { RETRY_DELAYS_MS, failedModuleUrl, isChunkLoadError, retryUrl } from "../lib/lazyWithRetry";

/**
 * PERF-3 — FIRESTORE, ON DEMAND.
 *
 * `firebase/firestore` (with its `re2js` and webchannel dependencies) was ~340 KB gz of the
 * ~410 KB gz entry chunk, downloaded and parsed on every public page — the landing page, the
 * free check, every notes page — although none of them reads or writes Firestore until a
 * signed-in student's data is touched. This module is now the ONLY place that loads the SDK:
 * `import("firebase/firestore")` on the first real call, and the single `initializeFirestore`
 * call (D32) right after it.
 *
 *   isFirestoreEnabled()  — SYNCHRONOUS, and true exactly when the old eager `firestoreDb` was
 *                           non-null (Firebase configured → the app exists). Every caller's
 *                           `if (!firestoreDb)` guard becomes `if (!isFirestoreEnabled())`, so
 *                           "is there a cloud at all?" is decided at the same moment, with the
 *                           same answer, as before.
 *   withFirestore(use)    — runs `use({ fs, db })` and returns its result as a promise. Once the
 *                           SDK has loaded, `use` runs SYNCHRONOUSLY, inside the caller's call —
 *                           so a write starts at exactly the moment it started when the SDK was
 *                           eager. Before that (the page's first Firestore call), `use` runs as
 *                           soon as the SDK arrives, and calls made meanwhile run in CALL ORDER:
 *                           two writes issued A-then-B reach the SDK A-then-B.
 *   getFirestore()        — the SDK module and the ONE Firestore instance; always the same
 *                           promise object.
 *
 * WHY ORDER HOLDS. Every deferred call is a reaction on the one load promise, and reactions run
 * in registration order. `ready` is set by the FIRST reaction (registered before the promise is
 * handed to anyone), so nothing can take the synchronous path until every call that was queued
 * before the SDK arrived has been handed over — each of them earlier, in program order, than
 * any call that finds `ready` set.
 *
 * HONEST FAILURE. A failed load (offline before the chunk was ever cached, a deploy that removed
 * the old chunk) REJECTS — to the caller's own `catch`, the same path a Firestore error took
 * before — and is never swallowed here. The cache is cleared so the next call retries the load;
 * `initializeFirestore` cannot have run on that path, so "exactly once" still holds. Not
 * configured → rejects as well (callers guard with `isFirestoreEnabled()` first). A `use` that
 * throws becomes a rejection of the returned promise.
 *
 * A RETRY MUST USE A NEW URL (review of #1255, MUST-FIX 2). Chromium's module map remembers a
 * failed `import()` for the life of the document, so importing "firebase/firestore" again would
 * replay the cached failure without a request — one dropped 166 KB fetch would switch Firestore
 * off for the tab. So, exactly as CHUNK-RESILIENCE-1 does for route chunks (lib/lazyWithRetry.ts,
 * whose helpers this reuses unchanged): only a module-FETCH failure is retried; the failed chunk's
 * URL is taken from the error and re-imported with `?retry=<n>` — a module-map key no earlier
 * attempt used, so a real request — after 300 ms and then 1 s. Once a URL has failed, later calls
 * never re-try the cached plain specifier: they go straight to fresh `?retry=` keys (the counter
 * only rises). When the engine gives no URL (WebKit), the plain import is tried once more — WebKit
 * re-requests it. An error thrown while the module EVALUATES is rethrown at once. The failed
 * chunk never evaluated, so the retried one is the only instance; its relative imports resolve to
 * the same already-loaded entry chunk, so it shares the one firebase app.
 */

export type FirestoreSdk = typeof import("firebase/firestore");

export interface FirestoreHandle {
  /** The `firebase/firestore` module: `fs.doc`, `fs.setDoc`, `fs.where`, … */
  readonly fs: FirestoreSdk;
  /** The app's one Firestore instance (D32: `ignoreUndefinedProperties: true`). */
  readonly db: Firestore;
}

let pending: Promise<FirestoreHandle> | null = null;
let ready: FirestoreHandle | null = null;

interface SdkLoader {
  /** The plain dynamic import (the bundler resolves it to the SDK chunk). */
  primary: () => Promise<FirestoreSdk>;
  /** Imports the SDK chunk by absolute URL (a `?retry=<n>` key). */
  importUrl: (url: string) => Promise<FirestoreSdk>;
  sleep: (ms: number) => Promise<void>;
}
const defaultLoader: SdkLoader = {
  primary: () => import("firebase/firestore"),
  importUrl: (url) => import(/* @vite-ignore */ url) as Promise<FirestoreSdk>,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};
let loader: SdkLoader = defaultLoader;
/** The SDK chunk URL whose plain import the module map now remembers as failed (Chromium). */
let failedSdkUrl: string | null = null;
/** Only ever rises: every retry uses a module-map key no earlier attempt used. */
let retryAttempt = 0;

/** TEST SEAM ONLY — inject the loader (a browser module map cannot be simulated in vitest). */
export function __setFirestoreSdkLoaderForTests(next: Partial<SdkLoader> | null): void {
  loader = next ? { ...defaultLoader, ...next } : defaultLoader;
}

async function loadSdk(): Promise<FirestoreSdk> {
  let lastError: unknown;
  const hadFailedBefore = failedSdkUrl !== null;
  if (!hadFailedBefore) {
    try {
      return await loader.primary();
    } catch (error) {
      if (!isChunkLoadError(error)) throw error;
      lastError = error;
      const url = failedModuleUrl(error);
      if (url === null) {
        // URL not recoverable (WebKit, which re-requests the same URL): one more plain import.
        await loader.sleep(RETRY_DELAYS_MS[0]);
        return loader.primary();
      }
      failedSdkUrl = url;
    }
  }
  // A later call (the earlier one already failed and waited) retries at once, then backs off.
  const delays = hadFailedBefore ? [0, ...RETRY_DELAYS_MS] : RETRY_DELAYS_MS;
  for (const delay of delays) {
    if (delay > 0) await loader.sleep(delay);
    retryAttempt += 1;
    try {
      // eslint-disable-next-line no-await-in-loop
      return await loader.importUrl(retryUrl(failedSdkUrl as string, retryAttempt));
    } catch (error) {
      if (!isChunkLoadError(error)) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

export function isFirestoreEnabled(): boolean {
  return app !== null;
}

export function getFirestore(): Promise<FirestoreHandle> {
  if (pending) return pending;
  const firebaseApp = app;
  if (!firebaseApp) return Promise.reject(new Error("[firestoreSdk] Firebase is not configured"));
  const attempt: Promise<FirestoreHandle> = loadSdk().then((fs) => ({
    fs,
    // ignoreUndefinedProperties: the SDK otherwise THROWS on any `undefined` field value,
    // which silently killed every practiceInsights/attempts write (attempt docs carry optional
    // undefined fields like bloomSkill/topicName). Do NOT remove this. (D32)
    db: fs.initializeFirestore(firebaseApp, { ignoreUndefinedProperties: true }),
  }));
  pending = attempt;
  // FIRST reaction — see "WHY ORDER HOLDS".
  attempt.then(
    (handle) => {
      ready = handle;
    },
    () => {
      if (pending === attempt) pending = null;
    },
  );
  return attempt;
}

export function withFirestore<T>(use: (handle: FirestoreHandle) => T | PromiseLike<T>): Promise<T> {
  if (ready) {
    try {
      return Promise.resolve(use(ready));
    } catch (error) {
      return Promise.reject(error);
    }
  }
  return getFirestore().then(use);
}
