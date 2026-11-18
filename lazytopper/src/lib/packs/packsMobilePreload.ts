/**
 * PACKS-MOBILE-1 - make the first Buy tap on a phone reach Razorpay fast. Layout / network warm-up ONLY: it fetches chunks and the
 * checkout.js script and opens connections; it never creates an order, never calls the server, and changes nothing the student sees.
 *
 * Why: until the app has hydrated, a Buy tap is held; once it replays, the sheet chunk -> checkout.js -> order -> Razorpay chain ran
 * cold (~7 s after navigation on a throttled Android). After `load` and an idle moment this module (1) adds preconnect / dns-prefetch
 * hints for Razorpay's origins, (2) fetches the pop-up + sheet chunks, and (3) loads checkout.js - on idle, or earlier on the first
 * touch / pointer press anywhere (a student about to tap Buy). NEVER before `load`, never blocks paint.
 *
 * Kill switch: VITE_PACKS_MOBILE_PRELOAD_DISABLED=1 (build env) makes everything here a no-op.
 */

/** Razorpay origins the pay path talks to, in the order it needs them. */
export const RAZORPAY_PRECONNECT_ORIGINS: readonly string[] = [
  "https://checkout.razorpay.com",
  "https://api.razorpay.com",
  "https://lumberjack.razorpay.com",
];

/** The pages that sell packs and share PacksShop's pay path. */
export function isPacksWarmupPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  return p === "/packs" || p === "/cbq-packs";
}

export function isPacksMobilePreloadDisabled(): boolean {
  return String(import.meta.env.VITE_PACKS_MOBILE_PRELOAD_DISABLED ?? "").trim() === "1";
}

/** Add preconnect (+ dns-prefetch fallback) links once per origin. Returns the links it added. */
export function addRazorpayHints(doc: Document = document): HTMLLinkElement[] {
  const added: HTMLLinkElement[] = [];
  for (const origin of RAZORPAY_PRECONNECT_ORIGINS) {
    for (const rel of ["preconnect", "dns-prefetch"] as const) {
      if (doc.head.querySelector(`link[rel="${rel}"][href="${origin}"]`)) continue;
      const link = doc.createElement("link");
      link.rel = rel;
      link.href = origin;
      if (rel === "preconnect") link.crossOrigin = "anonymous";
      doc.head.appendChild(link);
      added.push(link);
    }
  }
  return added;
}

export interface PacksWarmupDeps {
  /** Fetch the pop-up + checkout sheet chunks (PacksShop's preloadBuyChunks). */
  preloadChunks: () => void;
  /** Inject checkout.js once (services/checkout loadCheckoutScript). */
  loadScript: () => Promise<unknown>;
  win?: Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (h: number) => void };
  doc?: Document;
}

const WARM_EVENTS = ["pointerdown", "touchstart"] as const;
let started = false;

/** Test seam. */
export function resetPacksWarmupForTests(): void {
  started = false;
}

/**
 * Schedule the warm-up once per page load. Returns a cancel function. Safe to call from a module top level and again from an effect
 * (the second call is a no-op).
 */
export function schedulePacksWarmup(deps: PacksWarmupDeps): () => void {
  const win = deps.win ?? (typeof window !== "undefined" ? (window as PacksWarmupDeps["win"]) : undefined);
  const doc = deps.doc ?? (typeof document !== "undefined" ? document : undefined);
  if (!win || !doc || started || isPacksMobilePreloadDisabled()) return () => undefined;
  started = true;

  let cancelled = false;
  let idleHandle: number | null = null;
  let timer: number | null = null;
  let scriptLoaded = false;
  let chunksWarmed = false;
  const loadScriptOnce = () => {
    if (cancelled || scriptLoaded) return;
    scriptLoaded = true;
    detachTouch();
    void deps.loadScript().catch(() => undefined);
  };
  const warmChunks = () => {
    if (cancelled || chunksWarmed) return;
    chunksWarmed = true;
    addRazorpayHints(doc);
    deps.preloadChunks();
  };
  // A touch / press anywhere is the strongest signal of an imminent Buy: do everything now, don't wait for idle.
  const onTouch = () => {
    warmChunks();
    loadScriptOnce();
  };
  const detachTouch = () => WARM_EVENTS.forEach((e) => doc.removeEventListener(e, onTouch, true));
  const onIdle = () => {
    warmChunks();
    loadScriptOnce();
  };
  const afterLoad = () => {
    if (cancelled) return;
    WARM_EVENTS.forEach((e) => doc.addEventListener(e, onTouch, { capture: true, passive: true, once: true }));
    if (typeof win.requestIdleCallback === "function") idleHandle = win.requestIdleCallback(onIdle, { timeout: 1500 });
    else timer = win.setTimeout(onIdle, 300);
  };
  if (doc.readyState === "complete") afterLoad();
  else win.addEventListener("load", afterLoad, { once: true });

  return () => {
    cancelled = true;
    detachTouch();
    win.removeEventListener("load", afterLoad);
    if (idleHandle !== null) win.cancelIdleCallback?.(idleHandle);
    if (timer !== null) win.clearTimeout(timer);
  };
}
