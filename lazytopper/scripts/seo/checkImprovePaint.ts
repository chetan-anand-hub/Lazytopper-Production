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
 * uid, Firebase's own keys, a subscription cache, a local session), no router state, not an in-app
 * browser, the width / pointer the served capture was taken at (useIsDesktop at 1024 px,
 * `useCoarsePointer`), and inside the pricing clock window of the capture. Anything else: `off`.
 *
 * ⚠ Like loginPaint.ts, the browser-side functions are shipped as source: self-contained, no imports
 * used inside them, no module-scope references.
 */

import { inAppBrowser } from "../../src/utils/inAppBrowser";
import {
  PAINT_ATTR,
  PAINT_PRESSED_CLASS,
  PAINT_READY_CLASS,
  markTopLevel,
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
};

export interface CiPaintEnv {
  search: string;
  sessionKeys: string[];
  local: Array<[string, string | null]>;
  historyUsr: unknown;
  userAgent: string;
  standalone: boolean;
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
}

export interface CiPaintDecision {
  kind: "door" | "off";
  reason: string;
}

export function decideCheckImprovePaint(
  env: CiPaintEnv,
  config: CiPaintConfig,
  helpers: { inApp: (userAgent: string, standalone: boolean) => unknown },
): CiPaintDecision {
  var off = function (reason: string): CiPaintDecision {
    return { kind: "off", reason: reason };
  };
  if (!(env.now >= config.clockFrom && env.now < config.clockUntil)) return off("clock");
  // useIsDesktop (1024 px) and useCoarsePointer must render what the served capture holds.
  if (config.variant === "mobile" ? !(env.narrow && env.coarse) : !(env.wide && !env.coarse)) return off("variant");
  if (helpers.inApp(env.userAgent, env.standalone) !== null) return off("in-app");
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
  return { kind: "door", reason: "door" };
}

/** What the decision reads, read before the app runs. Browser-only; shipped as source. */
export function gatherCheckImprovePaintEnv(): CiPaintEnv {
  var w = window as Window & typeof globalThis;
  var nav = (w.navigator || {}) as Navigator & { standalone?: boolean };
  var matches = function (query: string): boolean {
    try {
      return typeof w.matchMedia === "function" && w.matchMedia(query).matches;
    } catch (e) {
      return false;
    }
  };
  var sessionKeys: string[] = [];
  try {
    var s = w.sessionStorage;
    for (var i = 0; s && i < s.length; i += 1) sessionKeys.push(String(s.key(i)));
  } catch (e) {
    sessionKeys = ["unreadable"];
  }
  var local: Array<[string, string | null]> = [];
  try {
    var l = w.localStorage;
    for (var j = 0; l && j < l.length; j += 1) {
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
    userAgent: String(nav.userAgent || ""),
    standalone: nav.standalone === true,
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
  };
}

export const PAINT_STATE_ATTR = "data-lt-paint-state";

function prelude(config: CiPaintConfig): string {
  return (
    `var __name=function(f){return f};` +
    `var config=${JSON.stringify(config)};` +
    `var helpers={inApp:(${inAppBrowser.toString()})};` +
    `var decide=(${decideCheckImprovePaint.toString()});` +
    `var gather=(${gatherCheckImprovePaintEnv.toString()});` +
    `var apply=(${applyPaintKind.toString()});` +
    `var refresh=(${refreshWebFontText.toString()});`
  );
}

/** An expression: the decision this page's environment yields right now (the capture's init script). */
export function checkImprovePaintDecisionSource(config: CiPaintConfig): string {
  return `(function(){${prelude(config)}return decide(gather(),config,helpers);})()`;
}

/**
 * The inline script right after `#root`. Same contract as /login's: decide, keep or empty, then (door)
 * the inert-with-pressed-feedback tap guard that removes itself once React's nodes are in, and the
 * Fraunces re-insert so React's identical text is never a later, larger LCP. Any exception empties the root.
 */
export function checkImprovePaintScript(config: CiPaintConfig): string {
  const body =
    `(function(){var root=document.getElementById("root");try{${prelude(config)}` +
    `var decision=decide(gather(),config,helpers);` +
    `var shown=apply(root,decision.kind,config.attr);` +
    `document.documentElement.setAttribute(config.stateAttr,shown);` +
    `if(shown==="off")return;` +
    `var guard=function(event){var t=event.target;var hit=t&&t.closest?t.closest("["+config.attr+"]"):null;` +
    `if(!hit)return;event.preventDefault();event.stopPropagation();` +
    `var control=t.closest("button,a,label,input,textarea,select,[role=button]");if(control&&hit.contains(control)){control.classList.add(config.pressedClass);control.setAttribute("aria-busy","true");}};` +
    `document.addEventListener("click",guard,true);` +
    `var gone=function(){return !root.querySelector("["+config.attr+"]");};` +
    `var reactIn=function(){for(var n=root.firstElementChild;n;n=n.nextElementSibling)if(!n.hasAttribute(config.attr))return true;return false;};` +
    `if(typeof MutationObserver==="function"){var watch=new MutationObserver(function(){if(gone()){document.removeEventListener("click",guard,true);watch.disconnect();}});` +
    `watch.observe(root,{childList:true});}` +
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
 * CiDemoCard's Suspense fallback (components/ciDemo/CiDemoCard.tsx), as serialized. The static state keeps
 * it: the card is a lazy chunk and its ladder question is chosen per visit, so its content cannot be
 * painted ahead of React; the placeholder holds the PICK card's box, so the card's arrival moves nothing.
 */
export const CI_DEMO_PLACEHOLDER_HTML = '<div class="ci-demo-ph" data-testid="ci-demo-placeholder" aria-hidden="true"></div>';

/** F with its one RouteFallback replaced by C's route region. */
export function composeRouteShell(firstCommit: string, contentCommit: string): string {
  const count = firstCommit.split(ROUTE_FALLBACK_HTML).length - 1;
  if (count !== 1) throw new Error(`checkImprovePaint: expected exactly one RouteFallback in the first commit, found ${count}`);
  return firstCommit.replace(ROUTE_FALLBACK_HTML, () => routeRegionOf(contentCommit));
}

/** For comparing a static state with React's DOM: drop the route templates (they render nothing) and the paint marks. */
export function withoutRouteTemplates(html: string): string {
  return html.replace(/<template data-lt-route="(?:start|end|prerendered)"><\/template>/g, "").replace(/ data-lt-paint="[a-z-]+"/g, "");
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
    .replace(emptyRoot, () => `<div id="root">${markTopLevel(door, "door")}</div>${checkImprovePaintScript(config)}`);
}
