/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
// ^ This file is also type-checked under the build scripts' Node tsconfig (islandConfig.ts re-exports a
//   type from it, and scripts/seo/applyPrerendered.ts imports islandConfig.ts), which has no DOM lib.
/**
 * SPEED-ISLANDS-1 — the island for prerendered content pages (notes, NCERT and Exemplar solutions).
 * SPEED-ISLANDS-2 — the same island also serves Important Questions, the CBQ chapter pages and the NCERT Hub: their
 * controls are all upgrade-and-replay (buttons, the dropdowns via `onChange`), links or native `<details>`; a URL that
 * asks for a non-default view boots the app at once (`appViewRequested`).
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

import {
  APP_ENTRY_ATTR,
  APP_PRELOADS_ATTR,
  DESKTOP_QUERY,
  FORCE_APP_PARAM,
  IDLE_UPGRADE_PATHS,
  IDLE_UPGRADE_TIMEOUT_MS,
  ISLAND_SCRIPT_ATTR,
  ISLAND_VARIANT_ATTR,
} from "./islandConfig";
import { packsEntryEnabled } from "./islandFlags";
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

/**
 * Links whose app-side click handler does something before (or instead of) navigating: upgrade-and-replay, never a
 * bare navigation. `/check-improve` and `/pricing` send an event first; the NCERT Hub's "All chapters" rows
 * (`a.lt-nb__allch`, NcertBooksPage.tsx AllChaptersRow) pick the chapter IN PLACE (setParams, scroll kept), which a
 * full navigation would turn into a reload at the top of the page. SPEED-PACKS-3: the pack shop's "Free sample page" links
 * (`a.lt-psl`, PackSampleLink.tsx) send `pack_sample_download` and show the "Liked the sample? Buy" step in their click
 * handler, so a tap before the app is up completes in the app (the click is replayed within the tap's user activation).
 */
export const TRACKED_LINK = 'a[href="/check-improve"], a[href^="/pricing"], a.lt-nb__allch, a.lt-psl';

/**
 * Where the app adds content the island must not render (rule c): pack offers and prices. Phase 2: the CBQ chapter
 * page's pack card (its price is in the served markup, PRERENDER-PRICE-GUARD-1, but the app re-renders it from the
 * live price setting), and the end of the Important Questions list, where the app alone adds the buying block
 * (HighlyProbableQuestions.tsx ImportantQsOffers, never in the served markup).
 */
export const APP_ONLY_REGIONS = ["p.lt-note__footnote", "footer.lt-public-legal", "section.lt-cbqs__cta--pack", "div.lt-show-all"];
/**
 * SPEED-ISLANDS-2 — pages where the public footer is NOT watched. On the NCERT Hub the footer is the page's only
 * app-only region, and the hub is so short (360 px: the footer starts ~190 px below the fold) that watching it loads
 * the app at once. There the footer adds no price and no personalisation: only the quiet "PDF packs" link
 * (PublicLegalFooter.tsx PacksEntry, lazy, never in the served markup, no price), which the island itself shows from
 * first paint for a signed-out visitor (`showSignedOutChrome`, ruling of 8 Nov).
 */
export const FOOTER_UNWATCHED_PATHS: readonly string[] = ["/ncert-class-10"];
/** The desktop header row where the app shows "Log in" (signed out): its presence means "desktop variant". */
export const AUTH_REGION = '[data-testid="pending-bell"]';
/**
 * SPEED-ISLANDS-2 (coordinator/cofounder ruling 8 Nov, owner rulings "packs must stay clearly visible" 25 Oct and
 * "sales first" 30-31 Oct) — the signed-out chrome the app adds is shown by the island from first paint, in the app's
 * exact markup, so nothing changes at the hand-over:
 *   - CBQ chapter pages carry App.tsx's top `.navbar`; its right-hand slot is served EMPTY (captured before auth
 *     resolved). Signed out, App.tsx renders the "Log in" button there (navigate to /login?redirect=<page>).
 *   - PublicLegalFooter's "PDF packs" link (PacksEntry footer-link, behind VITE_PACKS_ENABLED; hidden only for paid
 *     Premium, who always have an auth record) after "For parents" — on the NCERT Hub (FOOTER_UNWATCHED_PATHS) while
 *     its footer is below the fold; every other footer is watched, so the app renders its page-specific href first.
 * This is safe ONLY because the island runs for a visitor with no auth record (rule a): any record, or a slow or
 * unreadable store, loads the app instead, and these are rendered only after that check. No price, no personalisation.
 */
export const NAVBAR_AUTH_SLOT = ".navbar > div:last-child";
/** App.tsx's signed-out "Log in" button, style for style. */
export const LOGIN_BUTTON_STYLE =
  "border: 1px solid var(--bg-card-border); border-radius: 12px; background: var(--bg-card); color: var(--text-muted); " +
  "font-weight: 800; font-size: 0.78rem; padding: 6px 14px; cursor: pointer; text-transform: uppercase; letter-spacing: 0.3px;";
const LOGIN_ATTR = "data-lt-island-login";
/** PublicLegalFooter's default packsHref (the NCERT Hub passes none). */
export const FOOTER_PACKS_HREF = "/pricing#packs";

/** The /login link App.tsx builds for this page (an island path is always a safe internal path). */
export function loginHrefFor(loc: { pathname: string; search: string }): string {
  return `/login?redirect=${encodeURIComponent(`${loc.pathname}${loc.search}`)}`;
}

/** Show the app's signed-out header button and footer pack link. Call only once signed out is established. */
export function showSignedOutChrome(): void {
  const slot = document.querySelector(NAVBAR_AUTH_SLOT);
  if (slot && slot.children.length === 0 && !isReactOwned(slot) && slot.closest("#root")) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("style", LOGIN_BUTTON_STYLE);
    button.setAttribute(LOGIN_ATTR, "");
    button.textContent = "Log in";
    slot.appendChild(button);
  }
  // Only where the footer is NOT watched (the NCERT Hub, whose footer passes no packsHref, so the app's link is exactly
  // FOOTER_PACKS_HREF). Elsewhere the footer is an app-only region: the app loads one screen before it and renders the
  // link with the page's own href (`/pricing?chapter=<bank>#packs`, pricingPacksHref), which the island cannot know.
  if (!packsEntryEnabled() || !FOOTER_UNWATCHED_PATHS.includes(window.location.pathname)) return;
  for (const footer of document.querySelectorAll("#root footer.lt-public-legal")) {
    // #1640 review FU: never reflow a footer row the visitor can see (desktop hub: CLS 0.008). Below the fold it is free;
    // in view, the app adds the link when it takes over (desktop hands over on idle), as today.
    if (footer.getBoundingClientRect().top < window.innerHeight) continue;
    if (isReactOwned(footer) || [...footer.querySelectorAll("a")].some((a) => a.textContent === "PDF packs")) continue;
    const parents = [...footer.querySelectorAll('a[href="/for-parents"]')].pop();
    if (!parents) continue;
    const link = document.createElement("a");
    link.href = FOOTER_PACKS_HREF;
    link.setAttribute("data-discover", "true");
    link.textContent = "PDF packs";
    parents.after(link);
  }
}
export const DESKTOP_MIN_WIDTH_PX = 1024;

/** The app's own layout switch (useIsDesktop.ts: `(min-width: 1024px)`). */
export function desktopWide(): boolean {
  try {
    if (typeof window.matchMedia === "function") return window.matchMedia(DESKTOP_QUERY).matches;
  } catch {
    /* fall through */
  }
  return window.innerWidth >= DESKTOP_MIN_WIDTH_PX;
}

/**
 * SPEED-ISLANDS-2 — the capture the build served (`data-lt-variant`, chosen by device) does not fit this window's
 * layout (chosen by width): a desktop browser narrower than 1024 px, or a tablet in landscape. Today's app re-lays
 * such a page out at boot, so the island hands over at once rather than keep a layout the app would not show.
 */
export function variantMismatch(variant: string, wide: boolean): boolean {
  return (variant === "desktop" && !wide) || (variant === "mobile" && wide);
}

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
  /**
   * PRICING-PAGES-2 F1 - the key of the nearest `[data-lt-twin]` around the control, when there is one. The served page and the app
   * may label the same control differently (the prerender is captured with packs dark, so /cbq-packs' Buy reads "Maths CBQ Pack ·
   * ₹199 + GST" there and "Buy Maths CBQ · ₹235" in the app): a tap is then replayed on the app's first control of the same tag inside
   * the element with the same key. No `data-lt-twin` on the page (every page but /cbq-packs): unused, matching exactly as before.
   */
  twin?: string;
}

export const TWIN_ATTR = "data-lt-twin";

function scopeOf(el: Element): Element {
  // Never the curtain (raiseCurtain): it is the live copy's wrapper, not a scope the app renders.
  const scoped = el.closest("[id]:not(#root):not(#lt-island-curtain)");
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
  const twin = el.closest(`[${TWIN_ATTR}]`)?.getAttribute(TWIN_ATTR) || undefined;
  return { scopeId: scope === document.body ? null : scope.id, ...d, ordinal: Math.max(0, candidates(scope, d, true, null).indexOf(el)), ...(twin ? { twin } : {}) };
}

/** The React-owned element matching `d`, or null while the app has not rendered it. */
export function resolve(d: Descriptor): HTMLElement | null {
  // While the curtain is up the live copy (which comes first) has the same ids: look inside #root first.
  const scope = d.scopeId
    ? (document.getElementById("root")?.querySelector(`[id="${d.scopeId.replace(/["\\]/g, "\\$&")}"]`) ?? document.getElementById(d.scopeId))
    : document.body;
  // A scope element that React has not rendered yet (or a served copy) is not the app's: wait.
  if (!scope || (d.scopeId !== null && !isReactOwned(scope))) return null;
  if (d.twin) {
    // F1: the app's control of the same tag inside the app's twin container (exact text/class are not required).
    const box = [...document.querySelectorAll(`[${TWIN_ATTR}]`)].find((el) => el.getAttribute(TWIN_ATTR) === d.twin && isReactOwned(el));
    const twinEl = box?.querySelector(d.tag);
    if (twinEl && isReactOwned(twinEl)) return twinEl as HTMLElement;
  }
  const strict = candidates(scope, d, true, true);
  const found = strict[d.ordinal] ?? candidates(scope, d, false, true)[d.ordinal];
  return (found as HTMLElement | undefined) ?? null;
}

/* ------------------------------------------------------------------ owned controls */

/** Per `.lt-note` root (document order): the active tab index the visitor chose here. */
const tabState = new Map<number, number>();
type ToggleKind = "hint" | "mm" | "details";
/** Toggles changed here (hints, mind-map branches, `<details>` such as "Sources"): descriptor + the state left. */
const toggleState = new Map<string, { d: Descriptor; open: boolean; kind: ToggleKind }>();
/** Typed answers, by input id. */
const typed = new Map<string, string>();
/** SPEED-ISLANDS-2: dropdown choices (the Important Questions topic filter, the NCERT Hub chapter), by select id. */
const chosen = new Map<string, string>();

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

/**
 * #1621 review D8 — Note.tsx scrolls to the URL's anchor when the app MOUNTS. On trunk that is at load; on an island
 * it is whenever the app arrives, possibly mid-read. So the island remembers where the page stood once it showed
 * the URL's anchor; if the reader has scrolled since, the hash is dropped (history.replaceState) before the app
 * loads, and the app does not pull them back. The tab the anchor opened is replayed as any other tab choice.
 */
let hashView: { el: Element; top: number } | null = null;
// Where the anchor sits in the viewport (not the scroll offset: content loading above it moves the offset, and
// the browser's scroll anchoring keeps the anchor in place, so the offset would read as "the reader scrolled").
const viewTop = (el: Element): number => el.getBoundingClientRect().top;
function showHashAnchor(): void {
  const anchor = anchorFromHash(window.location.hash);
  if (!openAnchor(anchor)) return;
  const el = document.getElementById(anchor);
  if (!el) return;
  hashView = { el, top: viewTop(el) };
  // The browser may settle its own fragment scroll after this: take the position once layout has.
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    if (hashView?.el === el) hashView.top = viewTop(el);
  }));
}
/** The reader moved away from the URL's anchor: the app must not scroll back to it. */
export function dropStaleHash(): boolean {
  if (!hashView || !hashView.el.isConnected) return false;
  if (Math.abs(viewTop(hashView.el) - hashView.top) <= 4) return false;
  try {
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
  } catch {
    return false;
  }
  guardStaleAnchor(hashView.el.id);
  hashView = null;
  return true;
}

/**
 * The app may have read the hash a moment before it was dropped (React renders, then commits a frame later), and
 * Note.tsx's commit then scrolls to it — by id, which while the curtain is up is the reader's own copy. Until the
 * app has taken over, a scrollIntoView on that anchor is the stale jump the reader scrolled away from: skip it.
 */
let unguard: (() => void) | null = null;
function guardStaleAnchor(id: string): void {
  if (!id || unguard || typeof Element === "undefined") return;
  const original = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function (this: Element, arg?: boolean | ScrollIntoViewOptions) {
    if (this.id === id && !finished) return;
    return original.call(this, arg);
  };
  unguard = () => {
    Element.prototype.scrollIntoView = original;
    unguard = null;
  };
}

function anchorFromHash(hash: string): string {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function recordToggle(kind: ToggleKind, el: Element, open: boolean): void {
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
  if (el.matches(`[${LOGIN_ATTR}]`)) {
    nav.go(loginHrefFor(window.location));
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
  /** "mobile" | "desktop" (the build's capture), or "" from an older build. */
  variant: string;
}

/** A tap held for the app, and where it goes if the app never arrives (#1621 review D2). */
interface Held {
  d: Descriptor;
  /** A link's href or a bottom-bar route: navigated to at once if the app fails. Null: nothing to complete. */
  fallback: string | null;
}

let config: IslandConfig | null = null;
let warmed = false;
let upgraded = false;
let finished = false;
/** The app failed to load or threw before it mounted: the island stays, with its handlers. */
let failed = false;
/** The island has been live (page view sent, the visitor may have scrolled): upgrades go behind a curtain. */
let islandLive = false;
let addDrops: (name: string, count: number) => void = () => undefined;
const queue: Held[] = [];
const cleanups: Array<() => void> = [];
const upgradeCleanups: Array<() => void> = [];

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

/* ---------------------------------------------------- the curtain (#1621 review D4: no jump at the switch) */

/**
 * ★ WHY A CURTAIN. `createRoot` (main.tsx, forbidden here) throws away #root's children on its first commit
 * and renders the app with its own default state (first tab, hints closed, details shut), after which this
 * island replays the visitor's state. On trunk that happens at load, before anyone has scrolled; on an island
 * page it happens mid-read, so every height difference moved the text under the reader (CLS 0.16-1.0).
 *
 * So, when the upgrade starts on a live island: the visitor's LIVE nodes move into `#lt-island-curtain`, in
 * #root's place in the flow (nothing about them changes: same boxes, focus and typed text kept), and #root gets
 * a copy of the same markup, for main.tsx's extractPrerenderedRoute, and is hidden (visibility, out of the flow)
 * while React renders into it. Once the app's route is ready, the visitor's state is replayed into it, and its
 * height has settled, the swap happens in ONE frame: the element the reader is looking at is found in the app's
 * render and the page is scrolled so it stays exactly where it was. Elements that appear are not layout shifts.
 * The curtain sits BEFORE #root so the island's getElementById (hints, anchors) finds the live copy.
 */
export const CURTAIN_ID = "lt-island-curtain";
const HIDDEN_ROOT_ATTR = "data-lt-island-hidden";
let curtain: HTMLElement | null = null;

const appRoot = (): HTMLElement | null => document.getElementById("root");

/** True once main.tsx's createRoot has claimed #root (React marks the container `__reactContainer$<id>`). */
export function appMounted(): boolean {
  const root = appRoot();
  if (!root) return false;
  for (const key in root) if (key.startsWith("__reactContainer$")) return true;
  return false;
}

const cssString = (value: string): string => value.replace(/["\\]/g, "\\$&");

/**
 * "The same element" in another copy of the page, for elements without an id (#1621 review D5/D6): tag, role,
 * every data-* attribute and the class list, then the ordinal among the matches. `text` narrows it when given.
 */
export interface Twin {
  key: string;
  text: string | null;
  ordinal: number;
  /** Ordinal among all elements with the same tag+role+data-* (class ignored): the fallback. */
  loose: number;
  looseKey: string;
}

function looseKeyOf(el: Element): string {
  const data = [...el.attributes]
    .filter((a) => a.name.startsWith("data-") && a.name !== HIDDEN_ROOT_ATTR)
    .map((a) => `${a.name}=${a.value}`)
    .sort()
    .join("&");
  return `${el.tagName}|${el.getAttribute("role") ?? ""}|${data}`;
}
const keyOf = (el: Element): string => `${looseKeyOf(el)}|${norm(el.getAttribute("class"))}`;

export function twinOf(el: Element, container: Element, withText: boolean): Twin {
  const all = [...container.getElementsByTagName(el.tagName)];
  const key = keyOf(el);
  const looseKey = looseKeyOf(el);
  const text = withText ? norm(el.textContent).slice(0, 200) : null;
  const same = all.filter((c) => keyOf(c) === key && (text === null || norm(c.textContent).slice(0, 200) === text));
  return { key, text, ordinal: Math.max(0, same.indexOf(el)), looseKey, loose: Math.max(0, all.filter((c) => looseKeyOf(c) === looseKey).indexOf(el)) };
}

export function findTwin(t: Twin, container: Element, tag: string): Element | null {
  const all = [...container.getElementsByTagName(tag)];
  const exact = all.filter((c) => keyOf(c) === t.key && (t.text === null || norm(c.textContent).slice(0, 200) === t.text));
  if (exact[t.ordinal]) return exact[t.ordinal];
  const keyed = all.filter((c) => keyOf(c) === t.key);
  if (keyed[t.ordinal]) return keyed[t.ordinal];
  return all.filter((c) => looseKeyOf(c) === t.looseKey)[t.loose] ?? null;
}

/** The element's nearest ancestor that scrolls vertically (the desktop shell's <main>), or null for the window. */
export function scrollParentOf(el: Element | null): HTMLElement | null {
  for (let node = el?.parentElement ?? null; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
    const overflow = getComputedStyle(node).overflowY;
    if ((overflow === "auto" || overflow === "scroll" || overflow === "overlay") && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

/** Every element inside `container` that is scrolled (desktop: the shell's <main>), with how far. */
function scrolledIn(container: Element): Array<{ el: Element; top: number; left: number }> {
  const out: Array<{ el: Element; top: number; left: number }> = [];
  for (const el of container.querySelectorAll("*")) if (el.scrollTop > 0 || el.scrollLeft > 0) out.push({ el, top: el.scrollTop, left: el.scrollLeft });
  return out;
}

/** Where focus was, recorded on the curtain before it goes, so the app's equivalent can take it (D6). */
function focusTwin(active: Element | null, container: Element): { tag: string; twin: Twin; id: string } | null {
  if (!(active instanceof HTMLElement) || !container.contains(active)) return null;
  return { tag: active.tagName, twin: twinOf(active, container, true), id: active.id };
}

function restoreFocus(was: { tag: string; twin: Twin; id: string } | null, root: Element, range: Array<number | null> | null): void {
  if (!was) return;
  const target = (was.id ? root.querySelector(`[id="${cssString(was.id)}"]`) : null) ?? findTwin(was.twin, root, was.tag);
  if (!(target instanceof HTMLElement) || document.activeElement === target) return;
  const apply = () => {
    if (document.activeElement === target || !target.isConnected) return;
    try {
      target.focus({ preventScroll: true });
      if (range && target instanceof HTMLInputElement && range[0] !== null) target.setSelectionRange(range[0], range[1]);
    } catch {
      /* focus is a nicety */
    }
  };
  apply();
  // The browser's focus fix-up for the removed curtain runs after this task and can undo a same-task focus.
  window.setTimeout(apply, 0);
  window.requestAnimationFrame(() => window.setTimeout(apply, 0));
}

export function raiseCurtain(): void {
  const live = appRoot();
  if (curtain || !live || !live.parentNode) return;
  // D5: NOTHING the visitor sees is moved. Moving a node out of the document resets its scroll and drops a
  // wheel/fling latched to it (desktop pages scroll inside the shell's <main>). Instead the live #root is
  // RENAMED to the curtain and a fresh, hidden #root (a copy, for main.tsx) is inserted after it: main.tsx
  // looks #root up by id when the entry runs, so React renders into the new one.
  const fresh = live.cloneNode(true) as HTMLElement;
  for (const el of fresh.querySelectorAll(`.${BUSY_CLASS}`)) {
    el.classList.remove(BUSY_CLASS); // the app's render must not inherit the island's "loading" look
    el.removeAttribute("aria-busy");
  }
  fresh.setAttribute(HIDDEN_ROOT_ATTR, "");
  live.id = CURTAIN_ID;
  live.after(fresh);
  curtain = live;
}

/** Back to the plain island (the app failed before it mounted): drop the hidden copy, the curtain is #root again. */
function unwindCurtain(): void {
  if (!curtain) return;
  appRoot()?.remove();
  curtain.id = "root";
  curtain = null;
}

const ANCHOR_BLOCKS = "h1,h2,h3,h4,h5,h6,p,li,dt,dd,tr,figure,figcaption,summary,blockquote,pre,img,.katex-display,article,section";
const CHROME = 'header, nav, [data-lt-bottomnav], [role="dialog"], .lt-wa-fab';

interface AnchorStep {
  scopeId: string | null;
  tag: string;
  text: string;
  ordinal: number;
  /** Distance from the viewport top when recorded. */
  top: number;
}

/** The block the reader is looking at (a third of the way down the viewport), and its ancestors, as descriptors. */
export function readingAnchor(container: Element): AnchorStep[] {
  const x = Math.round(window.innerWidth / 2);
  const ys = [0.33, 0.2, 0.5, 0.1, 0.7].map((f) => Math.round(window.innerHeight * f));
  let el: Element | null = null;
  for (const y of ys) {
    const hits = typeof document.elementsFromPoint === "function" ? document.elementsFromPoint(x, y) : [];
    const hit = hits.find((h) => container.contains(h) && !h.closest(CHROME));
    if (hit) {
      el = hit; // the innermost element: its text is the least likely to differ in the app's render
      break;
    }
  }
  if (!el) {
    el = [...container.querySelectorAll(ANCHOR_BLOCKS)].find((c) => !c.closest(CHROME) && c.getBoundingClientRect().bottom > 0) ?? null;
  }
  const steps: AnchorStep[] = [];
  for (let node: Element | null = el; node && node !== container && steps.length < 8; node = node.parentElement) {
    if (norm(node.textContent) === "" && !node.matches("img, svg")) continue; // nothing to recognise it by
    const scope = node.parentElement?.closest("[id]") ?? null;
    const scoped = scope && container.contains(scope) && scope !== container ? scope : container;
    const tag = node.tagName.toLowerCase();
    const text = norm(node.textContent).slice(0, 300);
    const same = [...scoped.querySelectorAll(tag)].filter((c) => norm(c.textContent).slice(0, 300) === text);
    steps.push({
      scopeId: scoped === container ? null : scoped.id,
      tag,
      text,
      ordinal: Math.max(0, same.indexOf(node)),
      top: node.getBoundingClientRect().top,
    });
    if (node.id) break; // an id is as specific as it gets
  }
  return steps;
}

/** The app's twin of the first anchor step it has, with the offset that step was recorded at. */
export function findAnchor(steps: readonly AnchorStep[], root: Element): { el: Element; top: number } | null {
  for (const step of steps) {
    const scope = step.scopeId ? root.querySelector(`[id="${cssString(step.scopeId)}"]`) : root;
    if (!scope) continue;
    const same = [...scope.querySelectorAll(step.tag)].filter((c) => norm(c.textContent).slice(0, 300) === step.text);
    const el = same[step.ordinal] ?? (same.length === 1 ? same[0] : undefined);
    if (el) return { el, top: step.top };
  }
  return null;
}

const SETTLE_POLL_MS = 50;

/** Scroll activity (any container, wheel, touch): the curtain is lowered only between scrolls (D5). */
let lastScrollAt = -Infinity;
const SCROLL_IDLE_MS = 160;
const SCROLL_IDLE_MAX_MS = 2_000;
const markScroll = (): void => {
  lastScrollAt = performance.now();
  // D8: the app may already be loading (desktop loads it on idle) when the reader scrolls away from the URL's
  // anchor: drop the hash then too, before the app's notes route reads it and scrolls back.
  if (upgraded && !finished) dropStaleHash();
};
const scrollingNow = (): boolean => performance.now() - lastScrollAt < SCROLL_IDLE_MS;
async function scrollIdle(): Promise<void> {
  const end = performance.now() + SCROLL_IDLE_MAX_MS;
  while (scrollingNow() && performance.now() < end) await sleep(40);
}
const SETTLE_MAX_MS = 4_000;
const nextFrame = () => new Promise<void>((r) => window.requestAnimationFrame(() => r()));

/** Wait for the hidden app's height to settle, then swap it in, in one frame, the reader's text kept in place. */
async function lowerCurtain(): Promise<void> {
  const root = appRoot();
  if (!curtain || !root) return;
  const end = Date.now() + SETTLE_MAX_MS;
  let last = -1;
  let stable = 0;
  let seen = false;
  // Settled: the height held for 2 polls (100 ms) and the reader's text is in the app (or held ~1 s without it).
  while (Date.now() < end && !(stable >= 2 && (seen || stable >= 20))) {
    // The curtain can go while this waits (finish() from a timeout, a failure): nothing left to lower.
    if (!curtain) return;
    const height = root.scrollHeight;
    seen = !!findAnchor(readingAnchor(curtain), root);
    stable = height === last ? stable + 1 : 0;
    last = height;
    await sleep(SETTLE_POLL_MS);
  }
  await replayState(0); // anything the visitor changed on the curtain while the app settled
  await scrollIdle();
  await nextFrame();
  if (!curtain) return;
  const active = document.activeElement;
  const range = active instanceof HTMLInputElement ? [active.selectionStart, active.selectionEnd] : null;
  const focusWas = focusTwin(active, curtain);
  const steps = readingAnchor(curtain);
  const scrolledBefore = window.scrollY;
  // D5: desktop pages scroll inside the shell's <main>, not the window. Record every scrolled container.
  const scrolled = scrolledIn(curtain).map(({ el, top, left }) => ({ tag: el.tagName, twin: twinOf(el, curtain as Element, false), top, left }));
  // D3: a <details> opened or closed on the curtain in the last moments (its toggle event is async) — same order.
  const shown = [...root.querySelectorAll("details")];
  [...curtain.querySelectorAll("details")].forEach((d, i) => {
    if (shown.length === curtain?.querySelectorAll("details").length && shown[i] && shown[i].open !== d.open) shown[i].open = d.open;
  });
  root.removeAttribute(HIDDEN_ROOT_ATTR);
  curtain.remove();
  curtain = null;
  // The app's twin of each scrolled container takes the same scroll, then the anchor is corrected inside its
  // OWN nearest scroller (the window only when nothing nearer scrolls).
  for (const { tag, twin, top, left } of scrolled) {
    const el = findTwin(twin, root, tag);
    if (el) {
      el.scrollTop = top;
      el.scrollLeft = left;
    }
  }
  if (window.scrollY !== scrolledBefore) window.scrollTo(window.scrollX, scrolledBefore);
  const found = findAnchor(steps, root);
  if (found) {
    const delta = Math.round(found.el.getBoundingClientRect().top - found.top);
    if (delta !== 0) {
      const scroller = scrollParentOf(found.el);
      if (scroller) scroller.scrollTop += delta;
      else window.scrollTo(window.scrollX, window.scrollY + delta);
    }
  }
  restoreFocus(focusWas, root, range);
}

/* ---------------------------------------------------- loading the app */

/** Load and run the full app. Idempotent. */
export function upgrade(): void {
  if (upgraded || !config) return;
  upgraded = true;
  setState("upgrading");
  stopIslandWatches();
  addDrops = suppressAppRepeats();
  warm();
  dropStaleHash(); // D8: before the app reads the URL
  if (islandLive) raiseCurtain();
  const script = document.createElement("script");
  script.type = "module";
  script.crossOrigin = "";
  script.src = config.appEntry;
  // D2: a failed load (index.html's ASSET-RELOAD-NET may also reload once) or an entry that throws before
  // React mounts leaves the island in charge: held links navigate, nothing stays greyed.
  script.addEventListener("error", () => fail(), { once: true });
  const onError = (event: Event) => {
    const file = (event as ErrorEvent).filename ?? "";
    if (!appMounted() && file.startsWith(`${window.location.origin}/assets/`)) fail();
  };
  window.addEventListener("error", onError);
  upgradeCleanups.push(() => window.removeEventListener("error", onError));
  let loadedAt = 0;
  script.addEventListener("load", () => (loadedAt = Date.now()), { once: true });
  document.head.appendChild(script);
  pollReady(Date.now(), () => loadedAt);
}

/** The app's route is live: React rendered the route's own start mark (the served one is not React's). */
export function routeIsReady(): boolean {
  return [...document.querySelectorAll('#root template[data-lt-route="start"]')].some(isReactOwned);
}

const READY_TIMEOUT_MS = 30_000;
/** After the entry ran, React must claim #root within this (main.tsx waits ≤ 3 s for the deferred sheet). */
const MOUNT_TIMEOUT_MS = 6_000;
const FIND_TIMEOUT_MS = 6_000;

/** Bumped by the test seam: a poll from an earlier boot never completes a later one. */
let epoch = 0;

function pollReady(startedAt: number, loadedAt: () => number, at: number = epoch): void {
  if (failed || finished || at !== epoch) return;
  if (routeIsReady()) {
    window.requestAnimationFrame(() => window.setTimeout(() => {
      if (at === epoch) void complete();
    }, 0));
    return;
  }
  const now = Date.now();
  const mounted = appMounted();
  if (!mounted && ((loadedAt() > 0 && now - loadedAt() > MOUNT_TIMEOUT_MS) || now - startedAt > READY_TIMEOUT_MS)) {
    fail();
    return;
  }
  if (now - startedAt > READY_TIMEOUT_MS) {
    void complete(); // the app is up but its route never said so: show it, as before
    return;
  }
  window.setTimeout(() => pollReady(startedAt, loadedAt, at), 80);
}

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

async function find(d: Descriptor, until: (el: HTMLElement) => boolean = () => true, timeoutMs = FIND_TIMEOUT_MS): Promise<HTMLElement | null> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const el = resolve(d);
    if (el && until(el)) return el;
    if (Date.now() >= end) return null;
    await sleep(60);
  }
}

/** Put the visitor's state (tabs, toggles, details, typed answers) into the app. Idempotent. */
async function replayState(findTimeoutMs: number): Promise<void> {
  // 1. Tabs.
  const roots = [...document.querySelectorAll("#root .lt-note")].filter(isReactOwned);
  for (const [at, index] of tabState) {
    const tab = roots[at]?.querySelectorAll<HTMLElement>('.lt-note__tabs [role="tab"]')[index];
    if (tab && tab.getAttribute("aria-selected") !== "true") tab.click();
  }
  // 2. Hints, mind-map branches and <details> the visitor changed. A replayed hint re-sends sol_hint: drop it.
  for (const { d, open, kind } of toggleState.values()) {
    const el = await find(d, () => true, findTimeoutMs);
    if (!el) continue;
    if (kind === "details") {
      if (el instanceof HTMLDetailsElement && el.open !== open) el.open = open;
      continue;
    }
    if ((el.getAttribute("aria-expanded") === "true") === open) continue;
    if (kind === "hint" && open) addDrops("sol_hint", 1);
    el.click();
  }
  // 3. Typed answers (React-controlled inputs: the native setter + an input event reaches onChange).
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  for (const [id, value] of typed) {
    const input = appRoot()?.querySelector(`[id="${cssString(id)}"]`);
    if (!(input instanceof HTMLInputElement) || !isReactOwned(input) || input.disabled || input.value === value) continue;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
  // 4. Dropdown choices (React-controlled selects: the native setter + a change event reaches onChange). The app may
  //    render the select a moment after its route mark (data-driven options): wait for it as for a held tap.
  const pick = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  for (const [id, value] of chosen) {
    const end = Date.now() + findTimeoutMs;
    let select: Element | null | undefined = null;
    for (;;) {
      select = appRoot()?.querySelector(`[id="${cssString(id)}"]`);
      if ((select instanceof HTMLSelectElement && isReactOwned(select)) || Date.now() >= end) break;
      await sleep(60);
    }
    if (!(select instanceof HTMLSelectElement) || !isReactOwned(select) || select.disabled || select.value === value) continue;
    if (![...select.options].some((o) => o.value === value)) continue; // the app offers no such choice: leave its own
    pick?.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

/** The app is ready: replay the visitor's state, swap it in without a jump, then complete the held taps. */
async function complete(): Promise<void> {
  if (failed || finished) return;
  try {
    await replayState(FIND_TIMEOUT_MS);
    await lowerCurtain();
    while (queue.length > 0) {
      const { d, fallback } = queue.shift() as Held;
      const el = await find(d, (e) => !(e as HTMLButtonElement).disabled);
      // #1640 review B1: a held tap is never dropped. If the app has not rendered the control in time (a lazy chunk on a
      // slow network), a link-like control (a link's href, a bottom-bar route) is completed by a full navigation, which
      // boots the app on that page; a control with nowhere to go is released (its busy look cleared by finish()).
      if (el) el.click();
      else if (fallback) nav.go(fallback);
    }
  } finally {
    finish();
  }
}

function clearBusy(): void {
  for (const el of document.querySelectorAll(`.${BUSY_CLASS}`)) {
    el.classList.remove(BUSY_CLASS);
    el.removeAttribute("aria-busy");
  }
}

function finish(): void {
  if (finished) return;
  finished = true;
  if (curtain) {
    // Never leave the app hidden.
    appRoot()?.removeAttribute(HIDDEN_ROOT_ATTR);
    curtain.remove();
    curtain = null;
  }
  setState("app");
  unguard?.();
  clearBusy();
  while (upgradeCleanups.length > 0) (upgradeCleanups.pop() as () => void)();
  while (cleanups.length > 0) (cleanups.pop() as () => void)();
}

/**
 * #1621 review D2 — the app did not arrive (its entry 404'd, or threw before React mounted). The island stays in
 * charge and keeps ALL its handlers (tabs, hints, anchors still work); a held link or bottom-bar route is
 * navigated to at once; nothing stays greyed; later taps on app-only controls behave natively.
 */
export function fail(): void {
  if (failed || finished) return;
  if (appMounted()) return; // React is up: not a boot failure (pollReady completes or times out)
  failed = true;
  unguard?.();
  unwindCurtain();
  setState("island");
  clearBusy();
  while (upgradeCleanups.length > 0) (upgradeCleanups.pop() as () => void)();
  const target = queue.find((h) => h.fallback)?.fallback ?? null;
  queue.length = 0;
  if (target) nav.go(target);
}

/** Where a control goes when there is no app to complete it, or null. */
function fallbackOf(el: Element): string | null {
  if (el.matches("a[href]")) return (el as HTMLAnchorElement).href || el.getAttribute("href");
  if (el.closest("[data-lt-bottomnav]")) return FALLBACK_ROUTES[norm(el.textContent)] ?? null;
  return null;
}

/** Bottom-bar items the app completes (they send an event first): their route if the app never arrives. */
export const FALLBACK_ROUTES: Readonly<Record<string, string>> = { Pricing: "/pricing" };

function hold(el: Element): void {
  el.classList.add(BUSY_CLASS);
  el.setAttribute("aria-busy", "true");
  const d = describe(el);
  const last = queue[queue.length - 1];
  if (!last || JSON.stringify(last.d) !== JSON.stringify(d)) queue.push({ d, fallback: fallbackOf(el) });
  upgrade();
}

/** Test seam: forget every module-level state (each test boots a fresh island). */
export function __resetIslandForTests(): void {
  epoch += 1;
  while (upgradeCleanups.length > 0) (upgradeCleanups.pop() as () => void)();
  while (cleanups.length > 0) (cleanups.pop() as () => void)();
  config = null;
  warmed = upgraded = finished = failed = islandLive = false;
  lastScrollAt = -Infinity;
  hashView = null;
  unguard?.();
  curtain = null;
  queue.length = 0;
  tabState.clear();
  toggleState.clear();
  typed.clear();
  chosen.clear();
}

/* ------------------------------------------------------------------ events */

export function onClick(event: MouseEvent): void {
  if (finished) return;
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const el = (event.target as Element | null)?.closest?.(ACTIONABLE);
  if (!el || isReactOwned(el)) return;

  if (el.matches("a[href]")) {
    const href = el.getAttribute("href") ?? "";
    if (el.matches(TRACKED_LINK) && !failed) {
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
  if (failed) {
    // D2: no app is coming. A bottom-bar item still gets its page; anything else behaves natively.
    const fallback = fallbackOf(el);
    if (fallback) {
      event.preventDefault();
      nav.go(fallback);
    }
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
  if (failed || (el.matches("a[href]") && !el.matches(TRACKED_LINK))) return; // a navigation (or no app to warm)
  if (el.matches(`summary, .lt-note__tab, .lt-note__mm-node--toggle, .lt-ncs__hintbtn, .lt-note__pdf-btn, [${LOGIN_ATTR}]`)) return; // owned
  warm(); // a control that completes in the app (or an answer box): start fetching it now
}

/** D3: a native `<details>` (the notes' "Sources" footnote) the visitor opened or closed is replayed into the app. */
function onToggle(event: Event): void {
  const el = event.target;
  if (!(el instanceof HTMLDetailsElement) || isReactOwned(el)) return;
  // SPEED-ISLANDS-2: the hidden copy raiseCurtain inserts for the app fires `toggle` for every <details> it carries
  // open. That is not the visitor's choice, and its descriptor (counted across both copies) names no app element:
  // replaying it stalled every held tap by FIND_TIMEOUT_MS (6 s) whenever a <details> was open at the upgrade.
  if (el.closest(`[${HIDDEN_ROOT_ATTR}]`)) return;
  recordToggle("details", el, el.open);
}

function onInput(event: Event): void {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || isReactOwned(input) || !input.id) return;
  typed.set(input.id, input.value);
  // SolutionsPage: Check is enabled once the answer is non-blank. Mirror it, so the tap reaches us.
  const submit = input.form?.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (submit && !isReactOwned(submit)) submit.disabled = !input.value.trim();
}

/**
 * SPEED-ISLANDS-2 — a dropdown the app owns (the Important Questions topic filter, the NCERT Hub chapter picker).
 * Its native control already shows the choice; the app applies it (filters the list, opens the chapter card). So
 * the choice is recorded, the app is loaded, and the choice is replayed into it (`replayState` step 4).
 */
function onChange(event: Event): void {
  const select = event.target;
  if (finished || !(select instanceof HTMLSelectElement) || isReactOwned(select) || !select.id) return;
  chosen.set(select.id, select.value);
  if (failed) return; // no app is coming: the native control keeps the choice, as with a dead entry on trunk
  select.classList.add(BUSY_CLASS);
  select.setAttribute("aria-busy", "true");
  upgrade();
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

/** `upgrade` for a timer: a no-op if the test seam has started another boot since (never fires into a later page). */
function upgradeFromThisBoot(): () => void {
  const at = epoch;
  return () => {
    if (at === epoch) upgrade();
  };
}

export function watchAppRegions(): void {
  watchPeek();
  // SPEED-PACKS-3: the app loads shortly after first paint on the pack shop (it owns the pack events and the offer strip).
  // `warm()` at `load` (after the first paint, so nothing is fetched ahead of it) lets a Buy tap in the next second find the
  // app already downloaded.
  if (IDLE_UPGRADE_PATHS.includes(window.location.pathname)) {
    afterLoad(() => {
      warm();
      onIdle(upgradeFromThisBoot(), IDLE_UPGRADE_TIMEOUT_MS);
    });
  }
  // Desktop variant: the header's sign-in button is the app's. Load the app once the page is idle.
  if (document.querySelector(AUTH_REGION)) afterLoad(() => onIdle(upgradeFromThisBoot(), 2000));
  // A window resized (or a tablet rotated) across the app's layout switch: the app re-lays the page out today.
  try {
    if (typeof window.matchMedia === "function") {
      const query = window.matchMedia(DESKTOP_QUERY);
      const onFlip = () => upgrade();
      query.addEventListener("change", onFlip);
      cleanups.push(() => query.removeEventListener("change", onFlip));
    }
  } catch {
    /* no media query support: nothing to watch */
  }
  const unwatched = FOOTER_UNWATCHED_PATHS.includes(window.location.pathname) ? ["footer.lt-public-legal"] : [];
  const regions = APP_ONLY_REGIONS.filter((sel) => !unwatched.includes(sel)).flatMap((sel) => [...document.querySelectorAll(sel)]);
  if (regions.length === 0) return;
  if (typeof IntersectionObserver !== "function") {
    afterLoad(() => onIdle(upgradeFromThisBoot(), 2000));
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

/* ------------------------------------------------------------------ a view only the app can show */

/** NcertBooksPage.tsx NCERT_HUB_SUBJECT_KEY: the subject this browser last picked on the hub (pinned by the guard test). */
export const NCERT_HUB_SUBJECT_KEY = "lazytopper.ncertHub.subject";

/**
 * SPEED-ISLANDS-2 — the served markup is ONE view of a page whose app reads more than the path: the NCERT Hub's
 * `?subject=` / `?ch=` / `?read=` and legacy `#maths` / `#science` (NcertBooksPage.tsx ncertHubState), and the subject
 * this browser last picked there (shown when the URL names none); the Important Questions `?topic=` filter
 * (HighlyProbableQuestions.tsx topicParam, the Exam Trends deep link). A visit that asks for any other view gets the
 * full app at once, exactly as today, instead of the default view followed by a change of content.
 */
export function appViewRequested(loc: { pathname: string; search: string; hash: string }, readStored: () => string | null): boolean {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(loc.search);
  } catch {
    return true;
  }
  const has = (name: string) => String(params.get(name) ?? "").trim() !== "";
  if (loc.pathname === "/ncert-class-10") {
    if (has("subject") || has("ch") || has("read")) return true;
    const hash = loc.hash.replace(/^#/, "").toLowerCase();
    if (hash === "maths" || hash === "science") return true;
    let stored: string | null = null;
    try {
      stored = readStored();
    } catch {
      stored = null;
    }
    return stored === "science"; // "maths" (or nothing) is the served view
  }
  if (loc.pathname === "/packs") {
    // SPEED-PACKS-3: the served view is the plain shop. A one-tap buy link (?buy=&t=), a sample return (?from=) or any
    // hash (#my-packs, #cbq: the app scrolls and shows the signed-out / owned states) is the app's to render at once.
    // utm_* and other tracking params do NOT change the view (the ad landing carries them).
    if (has("buy") || has("t") || has("from")) return true;
    return loc.hash.replace(/^#/, "") !== "";
  }
  if (loc.pathname === "/board-pass") {
    // PRICING-PAGES-1: the served view is the signed-out page. A one-tap pay link (?buy=board_pass), a parents' visit
    // (?from=for_parents: the back link) or any hash is the app's to render at once. utm_* / gclid do not change the view.
    if (has("buy") || has("from")) return true;
    return loc.hash.replace(/^#/, "") !== "";
  }
  if (loc.pathname === "/cbq-packs") {
    // PRICING-PAGES-1: the served view is the Maths switch. ?subject= / ?t= (a subject), a one-tap buy (?buy=), the shop's entry
    // links (?pack= / ?view= / ?chapter= / ?mock=), a sample return or a parents' visit (?from=) or any hash load the app at once.
    for (const name of ["buy", "t", "subject", "from", "pack", "view", "chapter", "mock"]) if (has(name)) return true;
    return loc.hash.replace(/^#/, "") !== "";
  }
  if (loc.pathname.startsWith("/highly-probable/")) {
    const topic = String(params.get("topic") ?? "").trim();
    return topic !== "" && topic !== "all";
  }
  return false;
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
  return { appEntry, preloads, variant: script?.getAttribute(ISLAND_VARIANT_ATTR) ?? "" };
}

function injectBusyStyle(): void {
  const style = document.createElement("style");
  style.textContent =
    `.${BUSY_CLASS}{cursor:progress;opacity:.6;transition:opacity .15s}` +
    // The app renders here unseen while the curtain shows the visitor's page (raiseCurtain).
    `#root[${HIDDEN_ROOT_ATTR}]{position:absolute;top:0;left:0;right:0;visibility:hidden;pointer-events:none}`;
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
  listen(document, "change", onChange, { capture: true, passive: true });
  listen(document, "toggle", onToggle, { capture: true, passive: true });
  listen(document, "scroll", markScroll, { capture: true, passive: true });
  listen(window, "wheel", markScroll, { capture: true, passive: true });
  listen(window, "touchmove", markScroll, { capture: true, passive: true });
  listen(window, "hashchange", showHashAnchor, {});

  let forced = false;
  try {
    forced = new URLSearchParams(window.location.search).get(FORCE_APP_PARAM) === "1";
  } catch {
    forced = false;
  }
  const otherView = appViewRequested(window.location, () => window.localStorage.getItem(NCERT_HUB_SUBJECT_KEY));
  const misfit = variantMismatch(config.variant, desktopWide());
  if (forced || otherView || misfit || hasAuthRecordSync()) {
    upgrade();
    return;
  }
  // The first view the app would show: a hash names an anchor (it wins), else `?tab=questions`.
  showHashAnchor();
  if (!hashView) {
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
  islandLive = true;
  showSignedOutChrome();
  startIslandAnalytics();
  watchAppRegions();
}

if (typeof document !== "undefined" && document.querySelector(`script[${ISLAND_SCRIPT_ATTR}]`)) void boot();
