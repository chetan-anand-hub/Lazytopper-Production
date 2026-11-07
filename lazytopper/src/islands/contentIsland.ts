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
  return { scopeId: scope === document.body ? null : scope.id, ...d, ordinal: Math.max(0, candidates(scope, d, true, null).indexOf(el)) };
}

/** The React-owned element matching `d`, or null while the app has not rendered it. */
export function resolve(d: Descriptor): HTMLElement | null {
  // While the curtain is up the live copy (which comes first) has the same ids: look inside #root first.
  const scope = d.scopeId
    ? (document.getElementById("root")?.querySelector(`[id="${d.scopeId.replace(/["\\]/g, "\\$&")}"]`) ?? document.getElementById(d.scopeId))
    : document.body;
  // A scope element that React has not rendered yet (or a served copy) is not the app's: wait.
  if (!scope || (d.scopeId !== null && !isReactOwned(scope))) return null;
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

function refocus(active: Element | null, scope: ParentNode | null): void {
  if (!(active instanceof HTMLElement) || !scope) return;
  const target = active.isConnected ? active : active.id ? scope.querySelector<HTMLElement>(`[id="${cssString(active.id)}"]`) : null;
  if (!target || document.activeElement === target) return;
  const range = active instanceof HTMLInputElement ? [active.selectionStart, active.selectionEnd] : null;
  try {
    target.focus({ preventScroll: true });
    if (range && target instanceof HTMLInputElement && range[0] !== null) target.setSelectionRange(range[0], range[1]);
  } catch {
    /* focus is a nicety */
  }
}

const cssString = (value: string): string => value.replace(/["\\]/g, "\\$&");

export function raiseCurtain(): void {
  const root = appRoot();
  if (curtain || !root || !root.parentNode) return;
  const active = document.activeElement;
  const copy = root.cloneNode(true) as HTMLElement;
  for (const el of copy.querySelectorAll(`.${BUSY_CLASS}`)) {
    el.classList.remove(BUSY_CLASS); // the app's render must not inherit the island's "loading" look
    el.removeAttribute("aria-busy");
  }
  const live = document.createElement("div");
  live.id = CURTAIN_ID;
  live.append(...root.childNodes);
  root.before(live);
  root.replaceChildren(...copy.childNodes);
  root.setAttribute(HIDDEN_ROOT_ATTR, "");
  curtain = live;
  refocus(active, live);
}

/** Back to the plain island (the app failed before it mounted): live nodes into #root, #root shown. */
function unwindCurtain(): void {
  const root = appRoot();
  if (!curtain || !root) return;
  const active = document.activeElement;
  root.replaceChildren(...curtain.childNodes);
  root.removeAttribute(HIDDEN_ROOT_ATTR);
  curtain.remove();
  curtain = null;
  refocus(active, root);
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
    const height = root.scrollHeight;
    seen = !!findAnchor(readingAnchor(curtain), root);
    stable = height === last ? stable + 1 : 0;
    last = height;
    await sleep(SETTLE_POLL_MS);
  }
  await replayState(0); // anything the visitor changed on the curtain while the app settled
  await nextFrame();
  if (!curtain) return;
  const active = document.activeElement;
  const steps = readingAnchor(curtain);
  const scrolledBefore = window.scrollY;
  // D3: a <details> opened or closed on the curtain in the last moments (its toggle event is async) — same order.
  const shown = [...root.querySelectorAll("details")];
  [...curtain.querySelectorAll("details")].forEach((d, i) => {
    if (shown.length === curtain?.querySelectorAll("details").length && shown[i] && shown[i].open !== d.open) shown[i].open = d.open;
  });
  root.removeAttribute(HIDDEN_ROOT_ATTR);
  curtain.remove();
  curtain = null;
  const found = findAnchor(steps, root);
  if (found) {
    const delta = found.el.getBoundingClientRect().top - found.top;
    if (delta !== 0) window.scrollTo(window.scrollX, window.scrollY + delta);
  } else if (window.scrollY !== scrolledBefore) {
    window.scrollTo(window.scrollX, scrolledBefore);
  }
  refocus(active, root);
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

function pollReady(startedAt: number, loadedAt: () => number): void {
  if (failed) return;
  if (routeIsReady()) {
    window.requestAnimationFrame(() => window.setTimeout(() => void complete(), 0));
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
  window.setTimeout(() => pollReady(startedAt, loadedAt), 80);
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
}

/** The app is ready: replay the visitor's state, swap it in without a jump, then complete the held taps. */
async function complete(): Promise<void> {
  if (failed || finished) return;
  try {
    await replayState(FIND_TIMEOUT_MS);
    await lowerCurtain();
    while (queue.length > 0) {
      const { d } = queue.shift() as Held;
      const el = await find(d, (e) => !(e as HTMLButtonElement).disabled);
      el?.click();
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
  while (upgradeCleanups.length > 0) (upgradeCleanups.pop() as () => void)();
  while (cleanups.length > 0) (cleanups.pop() as () => void)();
  config = null;
  warmed = upgraded = finished = failed = islandLive = false;
  curtain = null;
  queue.length = 0;
  tabState.clear();
  toggleState.clear();
  typed.clear();
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
  if (el.matches("summary, .lt-note__tab, .lt-note__mm-node--toggle, .lt-ncs__hintbtn, .lt-note__pdf-btn")) return; // owned
  warm(); // a control that completes in the app (or an answer box): start fetching it now
}

/** D3: a native `<details>` (the notes' "Sources" footnote) the visitor opened or closed is replayed into the app. */
function onToggle(event: Event): void {
  const el = event.target;
  if (!(el instanceof HTMLDetailsElement) || isReactOwned(el)) return;
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
  listen(document, "toggle", onToggle, { capture: true, passive: true });
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
  islandLive = true;
  startIslandAnalytics();
  watchAppRegions();
}

if (typeof document !== "undefined" && document.querySelector(`script[${ISLAND_SCRIPT_ATTR}]`)) void boot();
