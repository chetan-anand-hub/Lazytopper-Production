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
 *
 * CHECKOUT-FAST-1: /test-series, /board-pass and /for-parents warm too, but ONLY ON INTENT (`intentOnly`): the first touch / pointer press
 * anywhere, or a buy button in view after the first scroll - never on idle (Razorpay's iframe bundle is a long task on a low-end phone).
 * /packs and /cbq-packs keep the idle warm-up exactly as PACKS-MOBILE-1 had it. Kill switch: VITE_CHECKOUT_WARM_DISABLED=1.
 */

/** Razorpay origins the pay path talks to, in the order it needs them. */
export const RAZORPAY_PRECONNECT_ORIGINS: readonly string[] = [
  "https://checkout.razorpay.com",
  "https://api.razorpay.com",
  "https://lumberjack.razorpay.com",
];

/** CHECKOUT-FAST-1 - the pages that open Razorpay but were not warmed before. */
const CHECKOUT_WARM_EXTRA_PATHS: readonly string[] = ["/test-series", "/board-pass", "/for-parents"];

/** CHECKOUT-FAST-1 kill switch (build env): the intent-only warm-up on the new pages stands down. */
export function isCheckoutWarmDisabled(): boolean {
  return String(import.meta.env.VITE_CHECKOUT_WARM_DISABLED ?? "").trim() === "1";
}

/** The pages that sell packs and share PacksShop's pay path (unchanged by CHECKOUT-FAST-1: PacksShop's own module-level warm-up keys on it). */
export function isPacksWarmupPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  return p === "/packs" || p === "/cbq-packs";
}

/** CHECKOUT-FAST-1 - every page that opens Razorpay and warms it: the packs pages, plus Test Series, Board Pass and For parents (each calls the warm-up itself). */
export function isCheckoutWarmPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (isPacksWarmupPath(p)) return true;
  return !isCheckoutWarmDisabled() && CHECKOUT_WARM_EXTRA_PATHS.includes(p);
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
  /** CHECKOUT-FAST-1: one warm-up per `key` per page load (default "packs"), so a page with no chunks to fetch does not use up PacksShop's. */
  key?: string;
  /** CHECKOUT-FAST-1: warm ONLY on intent (first touch / a buy button in view) - no idle callback, no timer. Default false (PACKS-MOBILE-1). */
  intentOnly?: boolean;
}

const WARM_EVENTS = ["pointerdown", "touchstart"] as const;
const started = new Set<string>();

/** CHECKOUT-FAST-1: a buy button carries this attribute so its first appearance in the viewport can start the warm-up. */
export const CHECKOUT_BUY_ATTR = "data-checkout-buy";

/** Test seam. */
export function resetPacksWarmupForTests(): void {
  started.clear();
}

/**
 * Schedule the warm-up once per page load. Returns a cancel function. Safe to call from a module top level and again from an effect
 * (the second call is a no-op).
 */
export function schedulePacksWarmup(deps: PacksWarmupDeps): () => void {
  const win = deps.win ?? (typeof window !== "undefined" ? (window as PacksWarmupDeps["win"]) : undefined);
  const doc = deps.doc ?? (typeof document !== "undefined" ? document : undefined);
  const key = deps.key ?? "packs";
  if (!win || !doc || started.has(key) || isPacksMobilePreloadDisabled()) return () => undefined;
  started.add(key);

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
  // CHECKOUT-FAST-1: the first buy button to scroll into view is as strong a signal as idle - whichever comes first.
  let observer: IntersectionObserver | null = null;
  let onScroll: (() => void) | null = null;
  const watchBuyButtons = () => {
    const IO = (win as unknown as { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
    if (!deps.intentOnly || isCheckoutWarmDisabled() || typeof IO !== "function") return;
    // A buy button already in view at load does NOT warm (that would be a load-time fetch): the observer is armed by the FIRST SCROLL,
    // so "a buy button scrolled into view" means the student is moving toward it.
    let rearms = 0;
    const handler = () => {
      onScroll = null;
      if (cancelled || scriptLoaded) return;
      const buttons = doc.querySelectorAll(`[${CHECKOUT_BUY_ATTR}]`);
      if (buttons.length === 0) {
        // No buy button existed yet (it renders later): look again on the next scroll, a bounded number of times.
        if (++rearms < 20) {
          onScroll = handler;
          win.addEventListener("scroll", handler, { once: true, passive: true });
        }
        return;
      }
      observer = new IO((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer?.disconnect();
        observer = null;
        onIdle();
      });
      buttons.forEach((b) => observer?.observe(b));
    };
    onScroll = handler;
    win.addEventListener("scroll", handler, { once: true, passive: true });
  };
  const afterLoad = () => {
    if (cancelled) return;
    WARM_EVENTS.forEach((e) => doc.addEventListener(e, onTouch, { capture: true, passive: true, once: true }));
    watchBuyButtons();
    if (deps.intentOnly) return; // intent only: nothing is scheduled on idle
    if (typeof win.requestIdleCallback === "function") idleHandle = win.requestIdleCallback(onIdle, { timeout: 1500 });
    else timer = win.setTimeout(onIdle, 300);
  };
  if (doc.readyState === "complete") afterLoad();
  else win.addEventListener("load", afterLoad, { once: true });

  return () => {
    cancelled = true;
    observer?.disconnect();
    if (onScroll) win.removeEventListener("scroll", onScroll);
    detachTouch();
    win.removeEventListener("load", afterLoad);
    if (idleHandle !== null) win.cancelIdleCallback?.(idleHandle);
    if (timer !== null) win.clearTimeout(timer);
  };
}
