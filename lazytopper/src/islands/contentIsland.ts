/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
// ^ This file is also type-checked under the build scripts' Node tsconfig (islandConfig.ts re-exports a
//   type from it, and scripts/seo/applyPrerendered.ts imports islandConfig.ts), which has no DOM lib.
/**
 * SPEED-ISLANDS-1 — the island for prerendered content pages (notes, NCERT and Exemplar solutions).
 *
 * ★ WHAT IT DOES. The served page already contains the whole rendered body. Today every visitor then
 * downloads the app entry (~270 KB gzip) and React throws that body away and renders it again — the
 * long tasks behind the p75 1,136 ms mobile INP. On an island page the head loads THIS module instead,
 * which wires the controls whose behaviour lives entirely in the markup and loads the full app
 * ("upgrades") only when something needs it. No React, and nothing imported from the app (see
 * islandAnalytics.ts for why).
 *
 * ★ THE SAFETY RULES (spec §2.4) AND WHERE EACH LIVES.
 *   a) Signed in → the full app at once (`hasAuthRecordSync` / `hasAuthRecordInIdb`; an unreadable
 *      store or a slow one counts as signed in, which is today's behaviour).
 *   b) No dead control. Every control is one of: OWNED here (tabs, mind-map branches, hints, print,
 *      in-page anchors), a real link (a full navigation boots the app on the next page), or UPGRADE AND
 *      REPLAY: the tap is held, the app is loaded, and the same control is clicked in the app once the
 *      app's route is live (`replay`). A control is never handled here once React owns it
 *      (`isReactOwned`), so nothing is ever handled twice.
 *   c) Prices, pack offers and the sign-in button are app-only: the island never renders them. The
 *      regions where the app adds them (the pack card before a note's footnote, the pack link in the
 *      solutions footer, the desktop header) upgrade before the visitor reaches them (`watchAppRegions`).
 *   d) Page view, visit source, engaged events and Speed Insights: islandAnalytics.ts.
 *   e) `?app=1` forces the app; the build step's allowlist and LT_ISLANDS=0 turn islands off.
 */

import { APP_ENTRY_ATTR, APP_PRELOADS_ATTR, FORCE_APP_PARAM, ISLAND_SCRIPT_ATTR } from "./islandConfig";
import { sendNamedEvent, sendWhatsAppTap, startIslandAnalytics, stopIslandWatches, suppressAppRepeats } from "./islandAnalytics";

/** The value of `<html data-lt-island>`: the island is live, the app is loading, or the app has taken over. */
export type IslandHtmlState = "island" | "upgrading" | "app";
const setState = (state: IslandHtmlState): void => document.documentElement.setAttribute(ISLAND_SCRIPT_ATTR, state);

/* ------------------------------------------------------------------ selectors (the markup contract) */

/** Mobile bottom bar (App.tsx MobileBottomNav, signed-out items): label → the route its button navigates to. */
export const BOTTOM_NAV_ROUTES: Readonly<Record<string, string>> = {
  Home: "/browse",
  "Exam Trends": "/exam-trends",
  Practice: "/practice-hub",
  Check: "/check-improve",
  // "Pricing" also sends nav_pricing_tap, so it is an upgrade-and-replay (the app sends it, then navigates).
};

/** Links whose app-side click handler sends an event before navigating: upgrade-and-replay, never a bare navigation. */
export const TRACKED_LINK = 'a[href="/check-improve"], a[href^="/pricing"]';

/** Where the app adds content the island must not render (rule c): pack offers and the sign-in button. */
export const APP_ONLY_REGIONS = ["p.lt-note__footnote", "footer.lt-public-legal"];
/** The desktop header row where the app shows "Log in" (signed out): its presence means "desktop variant". */
export const AUTH_REGION = '[data-testid="pending-bell"]';

/**
 * Byte's peek on a notes page (GUIDE-PUBLIC-1, PublicPeek.tsx) is app-rendered: it shows once per tab after
 * 40 % of the article or 20 s of visible time. The island loads the app EARLIER than either, so the app's own
 * rule decides: at 25 % (the app sees the reader past 40 % soon after, as today) or after 8 s visible (the
 * app's 20 s clock then starts at its mount: a dwell-only reader meets Byte ~10 s later than today).
 */
export const PEEK_ARTICLE = ".lt-notes-page";
export const PEEK_TAB_KEY = "lazytopper.guidePublicPeek.notes";
export const PEEK_UPGRADE_FRACTION = 0.25;
export const PEEK_UPGRADE_DWELL_MS = 8_000;

/** Full-page navigation (an object so the tests can observe it). */
export const nav = { go: (url: string): void => window.location.assign(url) };

const ACTIONABLE = 'a[href], button, input, select, textarea, summary, label, [role="button"], [role="tab"]';
const BUSY_CLASS = "lt-island-busy";

/* ------------------------------------------------------------------ helpers */

/** True once React has created this node (React keys its host nodes `__reactFiber$<id>`). */
export function isReactOwned(node: Element | null): boolean {
  if (!node) return false;
  for (const key in node) if (key.startsWith("__reactFiber$") || key.startsWith("__reactProps$")) return true;
  return false;
}

const norm = (text: string | null | undefined): string => String(text ?? "").replace(/\s+/g, " ").trim();

/** Enough to find "the same control" in the app's render of the same markup. */
export interface Descriptor {
  scopeId: string | null;
  tag: string;
  cls: string;
  text: string;
  ordinal: number;
}

function scopeOf(el: Element): Element {
  const scoped = el.closest("[id]:not(#root)");
  return scoped ?? document.body;
}

function candidates(scope: Element, d: Pick<Descriptor, "tag" | "cls" | "text">, strict: boolean, owned: boolean | null): Element[] {
  const all = scope.matches(d.tag) ? [scope] : [...scope.querySelectorAll(d.tag)];
  return all.filter(
    (el) =>
      (owned === null || isReactOwned(el) === owned) &&
      norm(el.textContent) === d.text &&
      (!strict || norm(el.getAttribute("class")) === d.cls),
  );
}

export function describe(el: Element): Descriptor {
  const scope = scopeOf(el);
  const d = { tag: el.tagName.toLowerCase(), cls: norm(el.getAttribute("class")), text: norm(el.textContent) };
  return { scopeId: scope === document.body ? null : scope.id, ...d, ordinal: Math.max(0, candidates(scope, d, true, null).indexOf(el)) };
}

/** The React-owned element matching `d`, or null while the app has not rendered it. */
export function resolve(d: Descriptor): HTMLElement | null {
  const scope = d.scopeId ? document.getElementById(d.scopeId) : document.body;
  // A scope element that React has not rendered yet (or a served copy) is not the app's: wait.
  if (!scope || (d.scopeId !== null && !isReactOwned(scope))) return null;
  const strict = candidates(scope, d, true, true);
  const found = strict[d.ordinal] ?? candidates(scope, d, false, true)[d.ordinal];
  return (found as HTMLElement | undefined) ?? null;
}

/* ------------------------------------------------------------------ owned controls */

/** Per `.lt-note` root (document order): the active tab index the visitor chose here. */
const tabState = new Map<number, number>();
/** Toggles changed here (hints, mind-map branches): descriptor + the state the visitor left them in. */
const toggleState = new Map<string, { d: Descriptor; open: boolean; kind: "hint" | "mm" }>();
/** Typed answers, by input id. */
const typed = new Map<string, string>();

function noteRoots(): Element[] {
  return [...document.querySelectorAll(".lt-note")].filter((el) => !isReactOwned(el));
}

/** Show panel `index` of a note (Note.tsx: panels render unconditionally and hide by class). */
export function activateTab(root: Element, index: number): void {
  const tabs = [...root.querySelectorAll('.lt-note__tabs [role="tab"]')];
  const panels = [...root.children].filter((c) => c.classList.contains("lt-note__panel"));
  if (!tabs[index] || !panels[index]) return;
  tabs.forEach((tab, i) => {
    tab.classList.toggle("lt-note__tab--active", i === index);
    tab.setAttribute("aria-selected", String(i === index));
  });
  panels.forEach((panel, i) => panel.classList.toggle("lt-note__panel--active", i === index));
  const at = noteRoots().indexOf(root);
  if (at >= 0) tabState.set(at, index);
}

/** Note.tsx openAnchor: an anchor on a hidden tab opens that tab, then scrolls to it. */
export function openAnchor(anchor: string): boolean {
  if (!anchor) return false;
  const el = document.getElementById(anchor);
  const panel = el?.closest(".lt-note__panel");
  const root = panel?.parentElement;
  if (!el || !panel || !root || isReactOwned(el)) return false;
  if (!panel.classList.contains("lt-note__panel--active")) {
    const index = [...root.children].filter((c) => c.classList.contains("lt-note__panel")).indexOf(panel);
    activateTab(root, index);
  }
  if (typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "start" });
  return true;
}

function anchorFromHash(hash: string): string {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function recordToggle(kind: "hint" | "mm", el: Element, open: boolean): void {
  const d = describe(el);
  const key = `${kind}:${d.scopeId}:${d.tag}:${d.cls}:${d.text}:${d.ordinal}`;
  const was = toggleState.get(key);
  // Back to where it started: nothing to restore.
  if (was && was.open !== open) toggleState.delete(key);
  else toggleState.set(key, { d, open, kind });
}

/** Handle a click on a control the island owns. Returns true when handled. */
export function handleOwned(el: Element): boolean {
  if (el.matches(".lt-note__tab")) {
    const root = el.closest(".lt-note");
    const index = [...(root?.querySelectorAll('.lt-note__tabs [role="tab"]') ?? [])].indexOf(el);
    if (root && index >= 0) activateTab(root, index);
    return true;
  }
  if (el.matches(".lt-note__mm-node--toggle")) {
    const open = el.getAttribute("aria-expanded") !== "true";
    el.setAttribute("aria-expanded", String(open));
    el.querySelector(".lt-note__mm-caret")?.classList.toggle("lt-note__mm-caret--open", open);
    el.nextElementSibling?.classList.toggle("lt-note__mm-kids--collapsed", !open);
    recordToggle("mm", el, open);
    return true;
  }
  if (el.matches(".lt-note__pdf-btn")) {
    window.print();
    return true;
  }
  if (el.matches(".lt-ncs__hintbtn")) {
    const open = el.getAttribute("aria-expanded") !== "true";
    const panel = document.getElementById(el.getAttribute("aria-controls") ?? "");
    if (!panel) return false;
    el.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
    if (open) sendNamedEvent("sol_hint");
    recordToggle("hint", el, open);
    return true;
  }
  return false;
}

/* ------------------------------------------------------------------ the upgrade */

interface IslandConfig {
  appEntry: string;
  preloads: string[];
}

let config: IslandConfig | null = null;
let warmed = false;
let upgraded = false;
let finished = false;
let addDrops: (name: string, count: number) => void = () => undefined;
const queue: Descriptor[] = [];
const cleanups: Array<() => void> = [];

function addLink(rel: string, href: string): void {
  const link = document.createElement("link");
  link.rel = rel;
  link.crossOrigin = "";
  link.href = href;
  document.head.appendChild(link);
}

/** Fetch and compile the app (modulepreload never executes): makes a later upgrade fast. */
export function warm(): void {
  if (warmed || !config) return;
  warmed = true;
  addLink("modulepreload", config.appEntry);
  for (const href of config.preloads) addLink("modulepreload", href);
}

/** Load and run the full app. Idempotent. */
export function upgrade(): void {
  if (upgraded || !config) return;
  upgraded = true;
  setState("upgrading");
  stopIslandWatches();
  addDrops = suppressAppRepeats();
  warm();
  const script = document.createElement("script");
  script.type = "module";
  script.crossOrigin = "";
  script.src = config.appEntry;
  // A failed load is handled by index.html's ASSET-RELOAD-NET listener (module script under /assets/).
  document.head.appendChild(script);
  pollReady(Date.now());
}

/** The app's route is live: React rendered the route's own start mark (the served one is not React's). */
export function routeIsReady(): boolean {
  return [...document.querySelectorAll('#root template[data-lt-route="start"]')].some(isReactOwned);
}

const READY_TIMEOUT_MS = 30_000;
const FIND_TIMEOUT_MS = 6_000;

function pollReady(startedAt: number): void {
  if (routeIsReady()) {
    window.requestAnimationFrame(() => window.setTimeout(() => void replay(), 0));
    return;
  }
  if (Date.now() - startedAt > READY_TIMEOUT_MS) {
    finish();
    return;
  }
  window.setTimeout(() => pollReady(startedAt), 80);
}

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

async function find(d: Descriptor, until: (el: HTMLElement) => boolean = () => true): Promise<HTMLElement | null> {
  const end = Date.now() + FIND_TIMEOUT_MS;
  for (;;) {
    const el = resolve(d);
    if (el && until(el)) return el;
    if (Date.now() > end) return null;
    await sleep(60);
  }
}

/** Put the visitor's state into the app, then complete the held taps, in order. */
async function replay(): Promise<void> {
  try {
    // 1. Tabs.
    const roots = [...document.querySelectorAll(".lt-note")].filter(isReactOwned);
    for (const [at, index] of tabState) {
      const tab = roots[at]?.querySelectorAll<HTMLElement>('.lt-note__tabs [role="tab"]')[index];
      if (tab && tab.getAttribute("aria-selected") !== "true") tab.click();
    }
    // 2. Hints and mind-map branches the visitor changed. A replayed hint re-sends sol_hint: drop it.
    for (const { d, open, kind } of toggleState.values()) {
      const el = await find(d);
      if (!el || (el.getAttribute("aria-expanded") === "true") === open) continue;
      if (kind === "hint" && open) addDrops("sol_hint", 1);
      el.click();
    }
    // 3. Typed answers (React-controlled inputs: the native setter + an input event reaches onChange).
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    for (const [id, value] of typed) {
      const input = document.getElementById(id);
      if (!(input instanceof HTMLInputElement) || !isReactOwned(input) || input.disabled || input.value === value) continue;
      setter?.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    // 4. The held taps.
    while (queue.length > 0) {
      const d = queue.shift() as Descriptor;
      const el = await find(d, (e) => !(e as HTMLButtonElement).disabled);
      el?.click();
    }
  } finally {
    finish();
  }
}

function finish(): void {
  if (finished) return;
  finished = true;
  setState("app");
  for (const el of document.querySelectorAll(`.${BUSY_CLASS}`)) {
    el.classList.remove(BUSY_CLASS);
    el.removeAttribute("aria-busy");
  }
  while (cleanups.length > 0) (cleanups.pop() as () => void)();
}

function hold(el: Element): void {
  el.classList.add(BUSY_CLASS);
  el.setAttribute("aria-busy", "true");
  const d = describe(el);
  const last = queue[queue.length - 1];
  if (!last || JSON.stringify(last) !== JSON.stringify(d)) queue.push(d);
  upgrade();
}

/* ------------------------------------------------------------------ events */

export function onClick(event: MouseEvent): void {
  if (finished) return;
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const el = (event.target as Element | null)?.closest?.(ACTIONABLE);
  if (!el || isReactOwned(el)) return;

  if (el.matches("a[href]")) {
    const href = el.getAttribute("href") ?? "";
    if (el.matches(TRACKED_LINK)) {
      event.preventDefault();
      event.stopPropagation();
      hold(el);
    } else if (el.matches(".lt-wa-fab")) {
      sendWhatsAppTap("fab"); // a new tab opens; this page stays and its queue delivers
    } else if (href.startsWith("#") && openAnchor(anchorFromHash(href))) {
      event.preventDefault(); // Note.tsx writes no URL either
    }
    return; // every other link: a real navigation
  }
  if (el.matches("summary, label, input, select, textarea")) return; // native
  if (handleOwned(el)) {
    event.preventDefault();
    return;
  }
  const bar = el.closest("[data-lt-bottomnav]");
  const route = bar ? BOTTOM_NAV_ROUTES[norm(el.textContent)] : undefined;
  if (route) {
    event.preventDefault();
    nav.go(route);
    return;
  }
  // Everything else completes in the app.
  event.preventDefault();
  event.stopPropagation();
  hold(el);
}

function onPointerDown(event: Event): void {
  const el = (event.target as Element | null)?.closest?.(ACTIONABLE);
  if (!el || isReactOwned(el)) return;
  if (el.matches("a[href]") && !el.matches(TRACKED_LINK)) return; // a navigation
  if (el.matches("summary, .lt-note__tab, .lt-note__mm-node--toggle, .lt-ncs__hintbtn, .lt-note__pdf-btn")) return; // owned
  warm(); // a control that completes in the app (or an answer box): start fetching it now
}

function onInput(event: Event): void {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || isReactOwned(input) || !input.id) return;
  typed.set(input.id, input.value);
  // SolutionsPage: Check is enabled once the answer is non-blank. Mirror it, so the tap reaches us.
  const submit = input.form?.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (submit && !isReactOwned(submit)) submit.disabled = !input.value.trim();
}

function onSubmit(event: Event): void {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || isReactOwned(form)) return;
  event.preventDefault(); // these forms have no action: a native submit would reload the page
  const submit = form.querySelector('button[type="submit"]');
  if (submit && !(submit as HTMLButtonElement).disabled) hold(submit);
}

function listen(target: EventTarget, type: string, fn: (e: Event) => void, options: AddEventListenerOptions): void {
  target.addEventListener(type, fn, options);
  cleanups.push(() => target.removeEventListener(type, fn, options));
}

/* ------------------------------------------------------------------ app-only regions (rule c) */

function onIdle(fn: () => void, timeout: number): void {
  const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void };
  if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(fn, { timeout });
  else window.setTimeout(fn, timeout);
}

function afterLoad(fn: () => void): void {
  if (document.readyState === "complete") fn();
  else window.addEventListener("load", fn, { once: true });
}

function watchPeek(): void {
  const article = document.querySelector(PEEK_ARTICLE);
  if (!article) return;
  try {
    if (window.sessionStorage.getItem(PEEK_TAB_KEY) === "1") return; // Byte already peeked in this tab
  } catch {
    /* unreadable: watch */
  }
  let visibleMs = 0;
  let since: number | null = document.visibilityState === "visible" ? performance.now() : null;
  let ticking = false;
  const check = () => {
    ticking = false;
    const rect = article.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;
    const fraction = scrollable > 0 ? Math.max(0, Math.min(1, -rect.top / scrollable)) : 0;
    if (fraction >= PEEK_UPGRADE_FRACTION) upgrade();
  };
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(check);
    }
  };
  const timer = window.setInterval(() => {
    const now = performance.now();
    if (since !== null) {
      visibleMs += now - since;
      since = document.visibilityState === "visible" ? now : null;
    } else if (document.visibilityState === "visible") since = now;
    if (visibleMs >= PEEK_UPGRADE_DWELL_MS) upgrade();
  }, 1000);
  window.addEventListener("scroll", onScroll, { passive: true });
  cleanups.push(() => {
    window.clearInterval(timer);
    window.removeEventListener("scroll", onScroll);
  });
}

export function watchAppRegions(): void {
  watchPeek();
  // Desktop variant: the header's sign-in button is the app's. Load the app once the page is idle.
  if (document.querySelector(AUTH_REGION)) afterLoad(() => onIdle(upgrade, 2000));
  const regions = APP_ONLY_REGIONS.flatMap((sel) => [...document.querySelectorAll(sel)]);
  if (regions.length === 0) return;
  if (typeof IntersectionObserver !== "function") {
    afterLoad(() => onIdle(upgrade, 2000));
    return;
  }
  // Load the app about one screen before the visitor reaches a region the app fills.
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        upgrade();
      }
    },
    { rootMargin: "0px 0px 100% 0px" },
  );
  for (const region of regions) observer.observe(region);
  cleanups.push(() => observer.disconnect());
}

/* ------------------------------------------------------------------ signed in? (rule a) */

const LOCAL_AUTH_KEY = "lazytopper.auth.local.v1";
const FIREBASE_USER_PREFIX = "firebase:authUser:";

/** Firebase's localStorage / sessionStorage persistences, and the app's local dev session. */
export function hasAuthRecordSync(): boolean {
  try {
    if (window.localStorage.getItem(LOCAL_AUTH_KEY)) return true;
    for (const store of [window.localStorage, window.sessionStorage]) {
      for (let i = 0; i < store.length; i++) if (String(store.key(i)).startsWith(FIREBASE_USER_PREFIX)) return true;
    }
    return false;
  } catch {
    return true; // unreadable: assume signed in (the full app, as today)
  }
}

/**
 * Firebase's default persistence: IndexedDB `firebaseLocalStorageDb` / store `firebaseLocalStorage`.
 * Never CREATES the database: if it does not exist, the upgrade transaction is aborted (a new database
 * whose creation is aborted is not kept). Resolves true when unsure or slow (the full app, as today).
 */
export function hasAuthRecordInIdb(timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolveResult) => {
    let settled = false;
    const done = (value: boolean) => {
      if (!settled) {
        settled = true;
        resolveResult(value);
      }
    };
    window.setTimeout(() => done(true), timeoutMs);
    let request: IDBOpenDBRequest;
    try {
      if (typeof indexedDB === "undefined") return done(false); // Firebase then uses localStorage (checked)
      request = indexedDB.open("firebaseLocalStorageDb");
    } catch {
      return done(false);
    }
    request.onupgradeneeded = () => {
      try {
        request.transaction?.abort();
      } catch {
        /* the error handler below settles */
      }
    };
    request.onerror = () => done(false); // no database (aborted creation) or IDB unavailable
    request.onblocked = () => done(true);
    request.onsuccess = () => {
      const db = request.result;
      try {
        if (!db.objectStoreNames.contains("firebaseLocalStorage")) {
          db.close();
          return done(false);
        }
        const keys = db.transaction("firebaseLocalStorage", "readonly").objectStore("firebaseLocalStorage").getAllKeys();
        keys.onsuccess = () => {
          db.close();
          done(keys.result.some((k) => String(k).startsWith(FIREBASE_USER_PREFIX)));
        };
        keys.onerror = () => {
          db.close();
          done(true);
        };
      } catch {
        db.close();
        done(true);
      }
    };
  });
}

/* ------------------------------------------------------------------ boot */

function readConfig(): IslandConfig | null {
  const script = document.querySelector(`script[${ISLAND_SCRIPT_ATTR}]`);
  const appEntry = script?.getAttribute(APP_ENTRY_ATTR) ?? "";
  if (!/^\/assets\/[^/]+\.js$/.test(appEntry)) return null;
  const preloads = (script?.getAttribute(APP_PRELOADS_ATTR) ?? "").split(/\s+/).filter((h) => /^\/assets\/[^/]+\.js$/.test(h));
  return { appEntry, preloads };
}

function injectBusyStyle(): void {
  const style = document.createElement("style");
  style.textContent = `.${BUSY_CLASS}{cursor:progress;opacity:.6;transition:opacity .15s}`;
  document.head.appendChild(style);
}

/** Wire the page, then decide: full app now (signed in / forced) or stay an island. */
export async function boot(): Promise<void> {
  config = readConfig();
  if (!config) return;
  setState("island");
  injectBusyStyle();
  listen(document, "click", onClick as (e: Event) => void, { capture: true });
  listen(document, "pointerdown", onPointerDown, { capture: true, passive: true });
  listen(document, "focusin", onPointerDown, { capture: true, passive: true });
  listen(document, "input", onInput, { capture: true, passive: true });
  listen(document, "submit", onSubmit, { capture: true });
  listen(window, "hashchange", () => void openAnchor(anchorFromHash(window.location.hash)), {});

  let forced = false;
  try {
    forced = new URLSearchParams(window.location.search).get(FORCE_APP_PARAM) === "1";
  } catch {
    forced = false;
  }
  if (forced || hasAuthRecordSync()) {
    upgrade();
    return;
  }
  // The first view the app would show: a hash names an anchor (it wins), else `?tab=questions`.
  if (!openAnchor(anchorFromHash(window.location.hash))) {
    try {
      if (new URLSearchParams(window.location.search).get("tab") === "questions") {
        for (const root of noteRoots()) activateTab(root, 3);
      }
    } catch {
      /* default tab */
    }
  }
  if (await hasAuthRecordInIdb()) {
    upgrade();
    return;
  }
  if (upgraded) return; // a tap during the check already loaded the app (it sends the page view)
  startIslandAnalytics();
  watchAppRegions();
}

if (typeof document !== "undefined" && document.querySelector(`script[${ISLAND_SCRIPT_ATTR}]`)) void boot();
