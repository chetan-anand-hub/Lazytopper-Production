/**
 * SPEED-CI-1 — THE ANSWER CHECKER (`/check-improve`) PAINTS FROM STATIC HTML BEFORE THE APP BOOTS.
 *
 * The second paint shell after `/login` (SPEED-LOGIN-1, `loginPaint.ts`), on the same pipeline: the CI
 * capture records it, `applyPaintShells` writes `check-improve.html` / `check-improve/index.html` /
 * `__desktop/check-improve.html` from the noindex `__shell.html`, `middleware.ts` device-serves it via
 * the manifest's `paintPaths`, and ONE inline script after `#root` decides `door` (the signed-out first
 * frame) or `off` (the root emptied: exactly the shell served today).
 *
 * ★ WHAT IS PAINTED, AND WHY IT IS NOT /login's "first commit". `/check-improve` is a LAZY route
 * (`withRouteSuspense`): on a clean shell React's first commit is the chrome plus the "Loading..."
 * fallback. But when the served HTML carries the route's markup between the two route marks
 * (`<template data-lt-route="start|end">`), `main.tsx` cuts it out and the route's Suspense fallback
 * shows THAT instead (SEO-5 PR-2 D3, App.tsx `PrerenderedRouteBody`). So the static state is:
 *
 *   the chrome of React's first commit (F)   with its "Loading..." fallback replaced by
 *   <start> + the route's first content commit (C, the moment the start mark appears) + <end>
 *
 * and React's first commit, served that page, is the same chrome plus the same route markup — which the
 * capture's parity check verifies byte for byte (templates aside). The chrome is F's, not the settled
 * page's, because React's first commit still has auth loading (the desktop sidebar's MI card says
 * "Looking for your mistake patterns…").
 *
 * ★ BLANK ON ANY DOUBT. `door` only for a signed-out, first-frame-predictable visit: no query parameter
 * other than ad attribution (and not the parent-share pair `cameFromSharedLink` reacts to), an EMPTY
 * sessionStorage (drafts, the ladder marker, the visit source, the sign-in intent all live there),
 * nothing in localStorage but the keys a plain signed-out visit writes (so no sign-in trace: the active
 * uid, Firebase's own keys, a subscription cache, a local session), no router state, the width / pointer
 * the served capture was taken at (useIsDesktop at 1024 px, `useCoarsePointer`), and inside the pricing
 * clock window of the capture. Anything else: `off`.
 *
 * ★ IN-APP BROWSERS GET THE DOOR TOO (SPEED-CI-3). #1635 copied /login's "in-app: off" rule, whose reason
 * is /login's own (its in-app note and "Open in Chrome" handoff are not captured). Nothing in this page's
 * first frame reads the user agent (only Login.tsx and the guest pay sheet do), and the capture's parity
 * matrix runs the YouTube / Instagram / Facebook / iOS web-view user agents to keep it so. What a web view
 * CAN differ in is storage: an Android WebView without DOM storage has `window.localStorage === null`
 * (no throw), which React reads as "not a first visit" (ladderVisit.ts) — so a missing storage object is
 * "unreadable" here, exactly like one that throws, and that is `off`.
 *
 * ⚠ Like loginPaint.ts, the browser-side functions are shipped as source: self-contained, no imports
 * used inside them, no module-scope references.
 */

import { STARTER_ROWS } from "../../src/components/ciDemo/oneMinuteStarterRows";
import { LADDER_CHECKING } from "../../src/components/ciDemo/ladderCopy";
import {
  PAINT_ATTR,
  PAINT_PRESSED_CLASS,
  PAINT_READY_CLASS,
  markTopLevel,
  markTopLevelWith,
  refreshWebFontText,
  withPaintTheme,
  type PaintVariant,
} from "./loginPaint";

export const CHECK_IMPROVE_PATH = "/check-improve";

/** The route's lazy module (App.tsx), whose own CSS the static paint inlines. */
export const CHECK_IMPROVE_ROUTE_MODULE = "DesktopCheckImprovePage";

/** Query parameters that are ad attribution only — never read by the page's first frame (pinned by parity). */
export const CI_ALLOWED_PARAMS: readonly string[] = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_id",
  "gclid",
  "gbraid",
  "wbraid",
  "gad_source",
  "gad_campaignid",
  "fbclid",
  "msclkid",
  "lt_clk",
];

/**
 * localStorage keys a plain signed-out visit writes, and the values allowed (null = any). Anything else
 * in localStorage — every sign-in trace included — is `off`. Pinned by the capture's "returning visitor"
 * parity case, which seeds exactly what a real prior visit wrote.
 */
export const CI_LOCAL_ALLOW: Readonly<Record<string, readonly string[] | null>> = {
  "lazytopper.theme": ["light"],
  vibeMode: ["beast"],
  "lazytopper.paceProfile.dailyCheck": null,
  "lazytopper.paceProfile.v1": null,
  "lazytopper.progress.scope.v1:smartLearning:anonymous": ["{}"],
  "lazytopper.smartLearning.stats.v1": ["{}"],
  "lazytopper.ux.telemetry.v1": null,
  // SPEED-CI-2: written once the ladder has shown a question (components/ciDemo/ladderVisit.ts LADDER_SEEN_KEY). A
  // returning visitor still gets the door, with the demo card as its placeholder (see `demo` below).
  "lazytopper.ciLadder.seen.v1": ["1"],
};

/**
 * SPEED-CI-2 — the localStorage key that says this browser has seen a ladder question (ladderVisit.ts). Absent: a
 * FIRST visit, whose demo card opens on the fixed starter (oneMinuteStarters.ts `fixedStarter`), so the static
 * state carries that card. Present: the card's question is picked per visit, so the static keeps the placeholder.
 */
export const CI_LADDER_SEEN_KEY = "lazytopper.ciLadder.seen.v1";

/**
 * What the static demo card is. "first": the first-visit preview the capture recorded (CiDemoCard's fallback, the
 * fixed starter). "placeholder": today's same-box placeholder, put in its place by the script — for a returning
 * visitor (random question) and for a CBQ ad (utm_content / utm_campaign containing "cbq": the intent map then
 * leads with the sample picker, not the ladder, intentMap.ts classify).
 */
export type CiDemoPaint = "first" | "placeholder";

export interface CiPaintEnv {
  search: string;
  sessionKeys: string[];
  local: Array<[string, string | null]>;
  historyUsr: unknown;
  narrow: boolean;
  wide: boolean;
  coarse: boolean;
  now: number;
}

export interface CiPaintConfig {
  variant: PaintVariant;
  clockFrom: number;
  clockUntil: number;
  allowedParams: readonly string[];
  localAllow: Readonly<Record<string, readonly string[] | null>>;
  attr: string;
  readyClass: string;
  pressedClass: string;
  fontLoad: string;
  fontFamily: string;
  /** On <html> once the script has run: "door" or "off" (what the capture's parity check waits for). */
  stateAttr: string;
  /** On the route region's top-level static nodes (and so on main.tsx's prerendered copy of them). */
  staticAttr: string;
  /** SPEED-CI-2: the ladder-seen localStorage key (`CI_LADDER_SEEN_KEY`). */
  ladderSeenKey: string;
  /** SPEED-CI-2 (review of #1639, FU1): the held verdict line an early option tap shows (ladderCopy.ts). */
  checkingText: string;
}

export interface CiPaintDecision {
  kind: "door" | "off";
  reason: string;
  /** SPEED-CI-2: door only — the demo card's static form. */
  demo?: CiDemoPaint;
}

export function decideCheckImprovePaint(env: CiPaintEnv, config: CiPaintConfig): CiPaintDecision {
  var off = function (reason: string): CiPaintDecision {
    return { kind: "off", reason: reason };
  };
  if (!(env.now >= config.clockFrom && env.now < config.clockUntil)) return off("clock");
  // useIsDesktop (1024 px) and useCoarsePointer must render what the served capture holds.
  if (config.variant === "mobile" ? !(env.narrow && env.coarse) : !(env.wide && !env.coarse)) return off("variant");
  // SPEED-CI-3: no user-agent rule. An in-app browser (YouTube, Instagram, Facebook, any web view) renders the same
  // first frame; its one real difference, storage, is caught by gather() as "unreadable" below.
  if (env.historyUsr !== null && env.historyUsr !== undefined) return off("router-state");
  if (env.sessionKeys.length > 0) return off("session-storage");
  for (var i = 0; i < env.local.length; i += 1) {
    var key = env.local[i][0];
    if (!Object.prototype.hasOwnProperty.call(config.localAllow, key)) return off("local-storage");
    var values = config.localAllow[key];
    if (values !== null && values.indexOf(String(env.local[i][1])) < 0) return off("local-storage");
  }
  var params: URLSearchParams;
  try {
    params = new URLSearchParams(env.search || "");
  } catch (e) {
    return off("search");
  }
  var bad = false;
  params.forEach(function (_value, name) {
    if (config.allowedParams.indexOf(name) < 0) bad = true;
  });
  if (bad) return off("search");
  // cameFromSharedLink (guide/moments): a parent's share link renders a different first frame.
  if (String(params.get("utm_source") || "").toLowerCase() === "parent_share") return off("shared-link");
  if (String(params.get("utm_medium") || "").toLowerCase() === "share") return off("shared-link");
  // SPEED-CI-2: the demo card. The first-visit card (fixed starter) only when this browser has never seen a ladder
  // question AND the ad is not a CBQ one (no ladder then); anything else keeps today's placeholder.
  var seen = false;
  for (var s = 0; s < env.local.length; s += 1) if (env.local[s][0] === config.ladderSeenKey) seen = true;
  var cbq =
    String(params.get("utm_content") || "").toLowerCase().indexOf("cbq") >= 0 ||
    String(params.get("utm_campaign") || "").toLowerCase().indexOf("cbq") >= 0;
  return { kind: "door", reason: "door", demo: seen || cbq ? "placeholder" : "first" };
}

/** What the decision reads, read before the app runs. Browser-only; shipped as source. */
export function gatherCheckImprovePaintEnv(): CiPaintEnv {
  var w = window as Window & typeof globalThis;
  var matches = function (query: string): boolean {
    try {
      return typeof w.matchMedia === "function" && w.matchMedia(query).matches;
    } catch (e) {
      return false;
    }
  };
  var sessionKeys: string[] = [];
  // SPEED-CI-3: a web view without DOM storage has NO storage object (null, not a throw): unreadable, like a throw.
  try {
    var s = w.sessionStorage;
    if (!s) throw new Error("no sessionStorage");
    for (var i = 0; i < s.length; i += 1) sessionKeys.push(String(s.key(i)));
  } catch (e) {
    sessionKeys = ["unreadable"];
  }
  var local: Array<[string, string | null]> = [];
  try {
    var l = w.localStorage;
    if (!l) throw new Error("no localStorage");
    for (var j = 0; j < l.length; j += 1) {
      var k = String(l.key(j));
      local.push([k, l.getItem(k)]);
    }
  } catch (e) {
    local = [["unreadable", null]];
  }
  var usr: unknown;
  try {
    var state = w.history.state as { usr?: unknown } | null;
    usr = state && typeof state === "object" ? state.usr : null;
  } catch (e) {
    usr = "unreadable";
  }
  return {
    search: String(w.location.search || ""),
    sessionKeys: sessionKeys,
    local: local,
    historyUsr: usr === undefined ? null : usr,
    narrow: matches("(max-width: 1023px)"),
    wide: matches("(min-width: 1024px)"),
    coarse: matches("(pointer: coarse)"),
    now: Date.now(),
  };
}

/** Keep only the nodes of the chosen state (none for `off`). Browser-only; shipped as source. */
export function applyPaintKind(root: Element, kind: string, attr: string): string {
  var nodes = Array.prototype.slice.call(root.childNodes) as ChildNode[];
  for (var i = 0; i < nodes.length; i += 1) {
    var node = nodes[i] as ChildNode & { getAttribute?: (name: string) => string | null };
    if (kind !== "off" && node.nodeType === 1 && node.getAttribute && node.getAttribute(attr) === kind) continue;
    root.removeChild(node);
  }
  return root.firstChild ? kind : "off";
}

/**
 * SPEED-CI-2 — the desktop chrome's time-of-day greeting (DesktopShell.tsx `greetingFor`, from the DEVICE clock). The
 * capture would freeze the CI machine's hour into the static ("Good morning" all day, while React's first commit says
 * the student's own); the capture stores it as "Good morning" (`withNeutralGreeting`) and this sets the device's own
 * before anything paints, so the static and React's first commit say the same. Same thresholds (pinned by a test).
 * Only an exact signed-out greeting is touched. Browser-only; shipped as source.
 */
export function setPaintGreeting(root: Element, hour: number): void {
  var text = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  var nodes = root.querySelectorAll('[data-testid="shell-greeting"]');
  for (var i = 0; i < nodes.length; i += 1) {
    if (/^Good (morning|afternoon|evening)$/.test(String(nodes[i].textContent || ""))) nodes[i].textContent = text;
  }
}

/** The captured state with the greeting at a fixed value (the script sets the device's own). Pure. */
export function withNeutralGreeting(html: string): string {
  return html.replace(/(data-testid="shell-greeting"[^>]*>)Good (?:morning|afternoon|evening)</g, "$1Good morning<");
}

export function checkImprovePaintConfig(variant: PaintVariant, clock: { from: number; until: number }): CiPaintConfig {
  return {
    variant,
    clockFrom: clock.from,
    clockUntil: clock.until,
    allowedParams: CI_ALLOWED_PARAMS,
    localAllow: CI_LOCAL_ALLOW,
    attr: PAINT_ATTR,
    readyClass: PAINT_READY_CLASS,
    pressedClass: PAINT_PRESSED_CLASS,
    fontLoad: "700 1em Fraunces",
    fontFamily: "Fraunces",
    stateAttr: PAINT_STATE_ATTR,
    staticAttr: STATIC_ATTR,
    ladderSeenKey: CI_LADDER_SEEN_KEY,
    checkingText: LADDER_CHECKING,
  };
}

export const PAINT_STATE_ATTR = "data-lt-paint-state";
/** Marks the route region's top-level nodes as static (see the script). Never on a React-rendered node. */
export const STATIC_ATTR = "data-lt-static";

function prelude(config: CiPaintConfig): string {
  return (
    `var __name=function(f){return f};` +
    `var config=${JSON.stringify(config)};` +
    `var decide=(${decideCheckImprovePaint.toString()});` +
    `var gather=(${gatherCheckImprovePaintEnv.toString()});` +
    `var apply=(${applyPaintKind.toString()});` +
    `var refresh=(${refreshWebFontText.toString()});` +
    `var greet=(${setPaintGreeting.toString()});`
  );
}

/** An expression: the decision this page's environment yields right now (the capture's init script). */
export function checkImprovePaintDecisionSource(config: CiPaintConfig): string {
  return `(function(){${prelude(config)}return decide(gather(),config);})()`;
}

/**
 * The inline script right after `#root`. Same contract as /login's: decide, keep or empty, then (door)
 * the inert-with-pressed-feedback tap guard that removes itself once React's nodes are in, and the
 * Fraunces re-insert so React's identical text is never a later, larger LCP. Any exception empties the root.
 */
export function checkImprovePaintScript(config: CiPaintConfig): string {
  const body =
    `(function(){var root=document.getElementById("root");try{${prelude(config)}` +
    `var seen=gather();var decision=decide(seen,config);` +
    `var shown=apply(root,decision.kind,config.attr);` +
    // The hour of the same instant the decision read (env.now), on the device's own clock.
    `if(shown!=="off")greet(root,new Date(seen.now).getHours());` +
    // SPEED-CI-2: a returning visitor / CBQ ad gets today's placeholder in place of the first-visit card.
    `if(shown!=="off"&&decision.demo!=="first"){var card=root.querySelector("[data-ci-first]");if(card&&card.parentNode){var ph=document.createElement("div");` +
    `ph.className="ci-demo-ph";ph.setAttribute("data-testid","ci-demo-placeholder");ph.setAttribute("aria-hidden","true");card.parentNode.replaceChild(ph,card);}}` +
    `document.documentElement.setAttribute(config.stateAttr,shown);` +
    `if(shown==="off")return;` +
    // ★ INERT UNTIL THE STATIC CONTENT IS GONE (review of #1635, B1). "Static" is anything under a
    // [data-lt-paint] node (until React's first commit) OR under a [data-lt-static] node: the route
    // region's top-level nodes carry it, and main.tsx's copy of that region (the prerendered fallback,
    // shown until the route chunk mounts) carries it too. React's own nodes never do, so nothing here
    // ever touches them. Taps: swallowed and shown pressed (no navigation, no file picker). Fields:
    // never focused by a pointer (mousedown), blurred if focused another way, and no key, input,
    // paste or drop reaches them — nothing can be typed that React would then wipe.
    `var sel="["+config.attr+"],["+config.staticAttr+"]";` +
    `var staticOf=function(t){return t&&t.closest?t.closest(sel):null;};` +
    `var field=function(t){return !!(t&&t.closest&&t.closest("input,textarea,select,[contenteditable]"));};` +
    `var click=function(event){var t=event.target;var hit=staticOf(t);if(!hit)return;event.preventDefault();event.stopPropagation();` +
    `var control=t.closest("button,a,label,input,textarea,select,[role=button]");if(control&&hit.contains(control)){control.classList.add(config.pressedClass);control.setAttribute("aria-busy","true");` +
    // SPEED-CI-2: an option of the first-visit card is remembered (not answered): the ladder answers it once it renders.
    `var opt=control.getAttribute("data-testid")||"";var bank=control.closest("[data-ci-bank]");if(/^one-min-opt-[0-3]$/.test(opt)&&bank){window.__ltStaticTap={id:opt,bank:bank.getAttribute("data-ci-bank")};` +
    // FU1 (review of #1639): reserve the verdict's boxes NOW (the tap's own frame), exactly as the preview and the
    // ladder draw them (LadderTapParts.tsx LadderHeldMark / LadderVerdictReserve), so the verdict lands without a shift.
    `var ul=control.closest(".ci-demo__opts");if(ul&&ul.parentNode&&!bank.querySelector(".ci-demo__verdict-mark--held")){var held=document.createElement("p");held.className="ci-demo__verdict-mark ci-demo__verdict-mark--held";` +
    `held.setAttribute("role","status");held.textContent=config.checkingText;ul.parentNode.insertBefore(held,ul);var box=document.createElement("div");box.className="ci-demo__verdict ci-demo__verdict--reserve";ul.parentNode.insertBefore(box,ul.nextSibling);}}}};` +
    `var hold=function(event){if(staticOf(event.target)){event.preventDefault();event.stopPropagation();}};` +
    `var keys=function(event){if(staticOf(event.target)&&field(event.target)){event.preventDefault();event.stopPropagation();}};` +
    `var focus=function(event){var t=event.target;if(staticOf(t)&&field(t)&&t.blur)t.blur();};` +
    `var on=[["click",click],["mousedown",hold],["submit",hold],["drop",hold],["dragstart",hold],["keydown",keys],["keypress",keys],["beforeinput",keys],["input",keys],["paste",keys],["focusin",focus]];` +
    `for(var i=0;i<on.length;i+=1)document.addEventListener(on[i][0],on[i][1],true);` +
    `var gone=function(){return !root.querySelector("["+config.attr+"]");};` +
    `var staticGone=function(){return !root.querySelector(sel);};` +
    `var reactIn=function(){for(var n=root.firstElementChild;n;n=n.nextElementSibling)if(!n.hasAttribute(config.attr))return true;return false;};` +
    `if(typeof MutationObserver==="function"){var watch=new MutationObserver(function(){if(staticGone()){for(var j=0;j<on.length;j+=1)document.removeEventListener(on[j][0],on[j][1],true);watch.disconnect();}});` +
    `watch.observe(root,{childList:true,subtree:true});}` +
    `document.documentElement.classList.add(config.readyClass);` +
    `if(document.fonts&&typeof document.fonts.load==="function"){document.fonts.load(config.fontLoad).then(function(faces){` +
    `if(faces&&faces.length&&!gone()&&!reactIn()){try{refresh(root,config.attr,config.fontFamily);}catch(e){}}},function(){});}` +
    `}catch(error){if(root)while(root.firstChild)root.removeChild(root.firstChild);document.documentElement.setAttribute("data-lt-paint-state","off");}})();`;
  if (/<\/script/i.test(body)) throw new Error("checkImprovePaint: the shipped script contains </script");
  return `<script data-lt-paint-script>${body}</script>`;
}

/**
 * The head CSS: hide the static nodes until the script is done, the pressed state (paint only), and at
 * phone width the page-level RouteNav placeholder. That placeholder (`.lt-routenav--page`, an empty row)
 * sits ABOVE the route while it is a fallback; once the route mounts, its MobileShell header owns the nav
 * row and the placeholder is removed. With the route's markup painted from the start it would be an
 * empty strip above the page header, so it is hidden in the static state AND in React's prerendered
 * fallback (the only time it is directly followed by the `prerendered` route template).
 */
export function checkImprovePaintCss(variant: PaintVariant): string {
  const hideGhost =
    variant === "mobile"
      ? `#root [${PAINT_ATTR}] .lt-routenav--page,#root .lt-routenav--page:has(+ template[data-lt-route="prerendered"]){display:none!important}`
      : "";
  return (
    `<style data-lt-paint-css>html:not(.${PAINT_READY_CLASS}) #root>[${PAINT_ATTR}]{display:none!important}` +
    `#root [${PAINT_ATTR}] .${PAINT_PRESSED_CLASS}{opacity:.6!important;cursor:progress!important}${hideGhost}</style>`
  );
}

/* ------------------------------------------------------------------------------------------------ *
 * COMPOSITION — from the capture's two snapshots to the static state (pure string work, unit-tested).
 * ------------------------------------------------------------------------------------------------ */

export const ROUTE_START = '<template data-lt-route="start"></template>';
export const ROUTE_END = '<template data-lt-route="end"></template>';

/** App.tsx RouteFallback, as serialized ("Loading..." card). The capture asserts it occurs exactly once in F. */
export const ROUTE_FALLBACK_HTML =
  '<div style="min-height: 50vh; display: flex; align-items: center; justify-content: center;">' +
  '<div style="background: var(--bg-card); backdrop-filter: blur(16px); border: 1px solid var(--bg-card-border); border-radius: 16px; padding: 24px;">' +
  '<h3 style="font-family: Fraunces, &quot;Fraunces Fallback&quot;, Georgia, serif; font-weight: 700; font-size: 16px; color: var(--text);">Loading...</h3>' +
  "</div></div>";

/** The route region of C, marks included: from the first start mark to the last end mark. */
export function routeRegionOf(contentCommit: string): string {
  const start = contentCommit.indexOf(ROUTE_START);
  const end = contentCommit.lastIndexOf(ROUTE_END);
  if (start < 0 || end < 0 || end < start) throw new Error("checkImprovePaint: the content commit has no route marks");
  if (contentCommit.indexOf(ROUTE_START, start + 1) >= 0) throw new Error("checkImprovePaint: more than one route start mark");
  return contentCommit.slice(start, end + ROUTE_END.length);
}

/**
 * CiDemoCard's placeholder fallback (components/ciDemo/CiDemoCard.tsx), as serialized. SPEED-CI-2: the CAPTURE now
 * records the first-visit card instead (CiDemoCard's other fallback, the fixed starter: `data-ci-first`); the script
 * swaps this placeholder in for a returning visitor or a CBQ ad, whose card question React cannot know ahead.
 */
export const CI_DEMO_PLACEHOLDER_HTML = '<div class="ci-demo-ph" data-testid="ci-demo-placeholder" aria-hidden="true"></div>';

/**
 * SPEED-CI-2 — what the captured first-visit card must be: CiDemoCard's preview of the fixed starter. The static
 * door is only ever "first" for no hint or a Science hint (a Maths hint is a CBQ ad: placeholder), and both open on
 * the overall top starter, so ONE card serves every first-visit door.
 */
export const CI_FIRST_STARTER = "PYQ-S-2024-LIGHT-003";

/**
 * The fixed starter's id is named here, not computed: oneMinuteStarters.ts reaches the app's React graph, which this
 * node-side file must not import (tsconfig.node). checkImprovePaint.guard.test.ts asserts it equals
 * `fixedStarter(null)` and `fixedStarter("Science")`, so a weightage change fails a test, never a student.
 */
export function ciFirstCardExpectation(): { bank: string; question: string } {
  const row = STARTER_ROWS[CI_FIRST_STARTER];
  if (!row) throw new Error(`checkImprovePaint: ${CI_FIRST_STARTER} has no copied starter row`);
  return { bank: CI_FIRST_STARTER, question: row.question };
}

/** Problems with the demo card of a captured (or built) static state. Empty = good. */
export function firstCardProblems(html: string): string[] {
  const want = ciFirstCardExpectation();
  const out: string[] = [];
  if (html.split('data-ci-first=""').length !== 2) out.push("the first-visit demo card is not there exactly once");
  if (html.split(`data-ci-bank="${want.bank}"`).length !== 2) out.push(`the first-visit card is not the fixed starter ${want.bank}`);
  if (!html.includes(want.question)) out.push("the first-visit card lacks its question");
  if (html.includes('data-testid="ci-demo-placeholder"')) out.push("the demo placeholder is captured (the script supplies it)");
  return out;
}

/** F with its one RouteFallback replaced by C's route region. */
export function composeRouteShell(firstCommit: string, contentCommit: string): string {
  const count = firstCommit.split(ROUTE_FALLBACK_HTML).length - 1;
  if (count !== 1) throw new Error(`checkImprovePaint: expected exactly one RouteFallback in the first commit, found ${count}`);
  return firstCommit.replace(ROUTE_FALLBACK_HTML, () => routeRegionOf(contentCommit));
}

/** For comparing a static state with React's DOM: drop the route templates (they render nothing) and the paint marks. */
export function withoutRouteTemplates(html: string): string {
  return html
    .replace(/<template data-lt-route="(?:start|end|prerendered)"><\/template>/g, "")
    .replace(/ data-lt-paint="[a-z-]+"/g, "")
    .replace(/ data-lt-static=""/g, "");
}

/** Every top-level element of the route region (between the marks) gains `data-lt-static=""`. */
export function withStaticRouteRegion(door: string): string {
  const start = door.indexOf(ROUTE_START);
  const end = door.lastIndexOf(ROUTE_END);
  if (start < 0 || end < start) throw new Error("checkImprovePaint: the static state has no route region to mark");
  const inner = door.slice(start + ROUTE_START.length, end);
  const marked = markTopLevelWith(inner, STATIC_ATTR, "");
  return door.slice(0, start + ROUTE_START.length) + marked + door.slice(end);
}

const VIEWPORT_META = /<meta name="viewport"[^>]*>/g;

/** One paint page from the clean (noindex) shell. `routeStyles` are the route chunk's own CSS, inlined. */
export function buildCheckImprovePaintPage(
  shellHtml: string,
  door: string,
  config: CiPaintConfig,
  routeStyles: ReadonlyArray<{ file: string; css: string }>,
): string {
  const metas = shellHtml.match(VIEWPORT_META) ?? [];
  if (metas.length !== 1) throw new Error(`checkImprovePaint: expected exactly one viewport meta in the shell, found ${metas.length}`);
  const emptyRoot = '<div id="root"></div>';
  if (shellHtml.split(emptyRoot).length - 1 !== 1) throw new Error("checkImprovePaint: the shell has no single empty #root to fill");
  const closes = shellHtml.split("</head>").length - 1;
  if (closes !== 1) throw new Error(`checkImprovePaint: expected exactly one </head>, found ${closes}`);
  const styles = routeStyles.map(({ file, css }) => `<style data-lt-inline="${file}">${css}</style>`).join("");
  return withPaintTheme(shellHtml)
    .replace(metas[0], () => `${metas[0]}${checkImprovePaintCss(config.variant)}`)
    .replace("</head>", () => `${styles}</head>`)
    .replace(emptyRoot, () => `<div id="root">${markTopLevel(withStaticRouteRegion(door), "door")}</div>${checkImprovePaintScript(config)}`);
}
